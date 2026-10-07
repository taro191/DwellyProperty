-- =============================================================================
-- Dwelly — 05 Content & billing: Dwelly Hubs (campaigns), activities, plans,
--          subscriptions, boosts, orders, invoices
-- =============================================================================

create type public.hub_status as enum ('draft', 'scheduled', 'live', 'ended');
create type public.activity_type as enum ('live_tour', 'open_house', 'live_qa', 'workshop', 'consultation');
create type public.activity_status as enum ('draft', 'published', 'cancelled', 'completed');
create type public.plan_audience as enum ('owner', 'agent', 'investor');
create type public.billing_period as enum ('month', 'year', 'lifetime');
create type public.subscription_status as enum ('active', 'past_due', 'cancelled', 'expired');
create type public.order_kind as enum ('subscription', 'boost');
create type public.order_status as enum ('pending', 'paid', 'failed', 'refunded', 'cancelled');

-- ---------------------------------------------------------------------------
-- Dwelly Hubs (time-boxed campaigns, formerly "festivals" in the prototype)
-- ---------------------------------------------------------------------------
create table public.hubs (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name         text not null,
  theme        text,
  description  text,
  zone_id      uuid references public.zones (id) on delete set null,
  banner_url   text,
  status       public.hub_status not null default 'draft',
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  created_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at > starts_at)
);
create trigger hubs_updated_at before update on public.hubs
  for each row execute function public.set_updated_at();

create table public.hub_properties (
  hub_id      uuid not null references public.hubs (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (hub_id, property_id)
);

-- ---------------------------------------------------------------------------
-- Activities (live tours, Q&A, workshops)
-- ---------------------------------------------------------------------------
create table public.activities (
  id           uuid primary key default gen_random_uuid(),
  hub_id       uuid references public.hubs (id) on delete set null,
  property_id  uuid references public.properties (id) on delete set null,
  host_id      uuid references public.profiles (id) on delete set null,
  type         public.activity_type not null,
  title        text not null,
  description  text,
  starts_at    timestamptz not null,
  duration_min smallint not null default 60,
  seats        int check (seats > 0),
  location     text,
  meeting_url  text,
  status       public.activity_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index activities_upcoming_idx on public.activities (starts_at) where status = 'published';
create trigger activities_updated_at before update on public.activities
  for each row execute function public.set_updated_at();

create table public.activity_registrations (
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create or replace function public.activity_registration_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  a record;
  taken int;
begin
  select seats, status, starts_at into a from public.activities where id = new.activity_id for update;
  if a.status is distinct from 'published' or a.starts_at < now() then
    raise exception 'Registration closed' using errcode = 'check_violation';
  end if;
  if a.seats is not null then
    select count(*) into taken from public.activity_registrations where activity_id = new.activity_id;
    if taken >= a.seats then
      raise exception 'Activity is full' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger activity_registration_guard before insert on public.activity_registrations
  for each row execute function public.activity_registration_guard();

-- ---------------------------------------------------------------------------
-- Plans & subscriptions
-- ---------------------------------------------------------------------------
create table public.plans (
  id          text primary key,  -- e.g. owner-pro
  audience    public.plan_audience not null,
  name        text not null,
  badge       text,
  description text,
  price_thb   numeric(10, 2) not null check (price_thb >= 0),
  period      public.billing_period not null,
  features    jsonb not null default '[]',
  quotas      jsonb not null default '{}',  -- {active_listings: 1, free_boosts_per_month: 0, ...}
  active      boolean not null default true,
  sort_order  int not null default 0
);

create table public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  plan_id              text not null references public.plans (id),
  status               public.subscription_status not null default 'active',
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index subscriptions_one_active_per_audience
  on public.subscriptions (user_id, plan_id) where status in ('active', 'past_due');
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.boost_products (
  id            text primary key,  -- e.g. spotlight-14d
  name          text not null,
  description   text,
  price_thb     numeric(10, 2) not null check (price_thb > 0),
  duration_days int not null check (duration_days > 0),
  placement     text not null default 'featured',  -- featured | spotlight_banner | map_pin
  active        boolean not null default true,
  sort_order    int not null default 0
);

-- ---------------------------------------------------------------------------
-- Orders, payments, invoices (written by server / payment webhook only)
-- ---------------------------------------------------------------------------
create sequence public.invoice_no_seq;

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete restrict,
  kind             public.order_kind not null,
  plan_id          text references public.plans (id),
  boost_product_id text references public.boost_products (id),
  property_id      uuid references public.properties (id) on delete set null,
  amount_thb       numeric(12, 2) not null check (amount_thb >= 0),
  vat_thb          numeric(12, 2) not null default 0,
  status           public.order_status not null default 'pending',
  provider         text,      -- omise | 2c2p | promptpay | manual
  provider_ref     text,
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((kind = 'subscription' and plan_id is not null) or (kind = 'boost' and boost_product_id is not null and property_id is not null))
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create unique index orders_provider_ref_idx on public.orders (provider, provider_ref) where provider_ref is not null;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.boosts (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  product_id  text not null references public.boost_products (id),
  order_id    uuid references public.orders (id),
  placement   text not null,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  created_at  timestamptz not null default now()
);
create index boosts_active_idx on public.boosts (placement, ends_at);

create table public.invoices (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique references public.orders (id) on delete restrict,
  invoice_no    text not null unique default ('INV' || to_char(now(), 'YYYYMM') || lpad(nextval('public.invoice_no_seq')::text, 6, '0')),
  bill_to_name  text not null,
  bill_to_tax_id text,
  bill_to_address text,
  subtotal_thb  numeric(12, 2) not null,
  vat_thb       numeric(12, 2) not null default 0,
  total_thb     numeric(12, 2) not null,
  pdf_path      text,
  issued_at     timestamptz not null default now()
);

-- Price is always taken from the catalogue server-side.
create or replace function public.create_order(
  p_kind public.order_kind, p_plan_id text default null,
  p_boost_product_id text default null, p_property_id uuid default null
) returns public.orders language plpgsql security definer set search_path = public as $$
declare
  price numeric;
  o public.orders;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Sign in required' using errcode = 'insufficient_privilege';
  end if;
  if p_kind = 'subscription' then
    select price_thb into price from public.plans where id = p_plan_id and active;
  else
    if not exists (select 1 from public.properties where id = p_property_id and owner_id = auth.uid() and status = 'active') then
      raise exception 'You can only boost your own active listing' using errcode = 'insufficient_privilege';
    end if;
    select price_thb into price from public.boost_products where id = p_boost_product_id and active;
  end if;
  if price is null then
    raise exception 'Unknown product' using errcode = 'no_data_found';
  end if;
  insert into public.orders (user_id, kind, plan_id, boost_product_id, property_id, amount_thb, vat_thb)
  values (auth.uid(), p_kind,
          case when p_kind = 'subscription' then p_plan_id end,
          case when p_kind = 'boost' then p_boost_product_id end,
          case when p_kind = 'boost' then p_property_id end,
          price, round(price * 7 / 107, 2))  -- prices are VAT-inclusive
  returning * into o;
  return o;
end $$;

-- Called by the payment webhook (service role) once the provider confirms payment.
create or replace function public.fulfill_order(p_order_id uuid, p_provider text, p_provider_ref text)
returns void language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  pl public.plans;
  bp public.boost_products;
  start_at timestamptz;
begin
  select * into o from public.orders where id = p_order_id for update;
  if o.id is null then raise exception 'Order not found'; end if;
  if o.status = 'paid' then return; end if;  -- idempotent

  update public.orders set status = 'paid', provider = p_provider, provider_ref = p_provider_ref, paid_at = now()
  where id = o.id;

  if o.kind = 'subscription' then
    select * into pl from public.plans where id = o.plan_id;
    update public.subscriptions s set status = 'cancelled'
    from public.plans p
    where s.plan_id = p.id and s.user_id = o.user_id and p.audience = pl.audience and s.status = 'active';
    insert into public.subscriptions (user_id, plan_id, current_period_end)
    values (o.user_id, o.plan_id,
            case pl.period when 'month' then now() + interval '1 month'
                           when 'year' then now() + interval '1 year' end);
  else
    select * into bp from public.boost_products where id = o.boost_product_id;
    select greatest(now(), coalesce(max(ends_at), now())) into start_at
    from public.boosts where property_id = o.property_id and placement = bp.placement;
    insert into public.boosts (property_id, product_id, order_id, placement, starts_at, ends_at)
    values (o.property_id, bp.id, o.id, bp.placement, start_at, start_at + make_interval(days => bp.duration_days));
    update public.properties
       set featured_until = greatest(coalesce(featured_until, now()), start_at + make_interval(days => bp.duration_days))
     where id = o.property_id;
  end if;

  perform public.notify(o.user_id, 'billing', 'ชำระเงินสำเร็จ',
    'ยอดชำระ ฿' || to_char(o.amount_thb, 'FM999,999,990.00'), '/me/billing', 'order', o.id);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, summary, data)
  values (o.user_id, 'ORDER_PAID', 'orders', o.id::text, 'Payment confirmed',
          jsonb_build_object('provider', p_provider, 'ref', p_provider_ref, 'amount', o.amount_thb));
end $$;
revoke execute on function public.fulfill_order(uuid, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.hubs                   enable row level security;
alter table public.hub_properties         enable row level security;
alter table public.activities             enable row level security;
alter table public.activity_registrations enable row level security;
alter table public.plans                  enable row level security;
alter table public.subscriptions          enable row level security;
alter table public.boost_products         enable row level security;
alter table public.orders                 enable row level security;
alter table public.boosts                 enable row level security;
alter table public.invoices               enable row level security;

create policy hubs_select on public.hubs for select
  using (status in ('scheduled', 'live', 'ended') or public.is_staff());
create policy hubs_manage on public.hubs for all
  using (public.is_staff(array['moderator']::public.staff_role[]))
  with check (public.is_staff(array['moderator']::public.staff_role[]));

create policy hub_properties_select on public.hub_properties for select using (true);
create policy hub_properties_manage on public.hub_properties for all
  using (public.is_staff(array['moderator']::public.staff_role[]))
  with check (public.is_staff(array['moderator']::public.staff_role[]));

create policy activities_select on public.activities for select
  using (status in ('published', 'completed', 'cancelled') or host_id = auth.uid() or public.is_staff());
create policy activities_manage on public.activities for all
  using (public.is_staff(array['moderator']::public.staff_role[]))
  with check (public.is_staff(array['moderator']::public.staff_role[]));

create policy activity_reg_select on public.activity_registrations for select using (
  user_id = auth.uid()
  or exists (select 1 from public.activities a where a.id = activity_id and a.host_id = auth.uid())
  or public.is_staff()
);
create policy activity_reg_insert on public.activity_registrations for insert
  with check (user_id = auth.uid() and public.is_active_user());
create policy activity_reg_delete on public.activity_registrations for delete using (user_id = auth.uid());

create policy plans_select on public.plans for select using (active or public.is_staff());
create policy plans_manage on public.plans for all
  using (public.is_staff(array['finance']::public.staff_role[]))
  with check (public.is_staff(array['finance']::public.staff_role[]));

create policy boost_products_select on public.boost_products for select using (active or public.is_staff());
create policy boost_products_manage on public.boost_products for all
  using (public.is_staff(array['finance']::public.staff_role[]))
  with check (public.is_staff(array['finance']::public.staff_role[]));

create policy subscriptions_select on public.subscriptions for select
  using (user_id = auth.uid() or public.is_staff(array['finance', 'support']::public.staff_role[]));
create policy orders_select on public.orders for select
  using (user_id = auth.uid() or public.is_staff(array['finance', 'support']::public.staff_role[]));
create policy boosts_select on public.boosts for select using (true);
create policy invoices_select on public.invoices for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  or public.is_staff(array['finance']::public.staff_role[])
);
