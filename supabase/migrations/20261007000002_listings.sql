-- =============================================================================
-- Dwelly — 02 Listings: zones, properties, media, favorites, saved searches, events
-- =============================================================================

create type public.listing_type as enum ('sale', 'rent', 'sale_or_rent');
create type public.property_category as enum ('condo', 'house', 'townhome', 'land', 'apartment', 'commercial');
create type public.property_status as enum (
  'draft', 'pending_review', 'active', 'reserved', 'sold', 'rented', 'expired', 'rejected', 'archived'
);
create type public.furnishing as enum ('unfurnished', 'partial', 'full');
create type public.media_kind as enum ('image', 'video', 'floorplan');

-- ---------------------------------------------------------------------------
-- Zones (curated themed areas, e.g. "ใกล้ ม.มหิดล")
-- ---------------------------------------------------------------------------
create table public.zones (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_th     text not null,
  name_en     text,
  icon        text,
  description text,
  center_lat  double precision check (center_lat between -90 and 90),
  center_lng  double precision check (center_lng between -180 and 180),
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Properties
-- ---------------------------------------------------------------------------
create sequence public.property_code_seq start 1001;

create table public.properties (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique default ('DW' || lpad(nextval('public.property_code_seq')::text, 6, '0')),
  owner_id          uuid not null references public.profiles (id) on delete cascade,
  agent_id          uuid references public.profiles (id) on delete set null,
  pod_id            uuid, -- FK added in 04_trust once agency_pods exists
  zone_id           uuid references public.zones (id) on delete set null,

  listing_type      public.listing_type not null,
  category          public.property_category not null,
  status            public.property_status not null default 'draft',
  rejection_reason  text,

  title             text not null check (char_length(title) between 5 and 150),
  description       text check (char_length(description) <= 10000),
  project_name      text,

  sale_price        numeric(14, 2) check (sale_price > 0),
  rent_price        numeric(12, 2) check (rent_price > 0),
  price_negotiable  boolean not null default true,

  usable_area_sqm   numeric(10, 2) check (usable_area_sqm > 0),
  land_area_sqwa    numeric(10, 2) check (land_area_sqwa > 0),
  bedrooms          smallint check (bedrooms between 0 and 50),
  bathrooms         smallint check (bathrooms between 0 and 50),
  floor             smallint,
  total_floors      smallint,
  direction         text check (direction in ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW')),
  furnishing        public.furnishing,
  maintenance_fee   numeric(10, 2) check (maintenance_fee >= 0),
  year_built        smallint check (year_built between 1900 and 2100),
  available_from    date,

  -- Rental terms
  deposit_months    numeric(4, 1) check (deposit_months >= 0),
  advance_months    numeric(4, 1) check (advance_months >= 0),
  min_lease_months  smallint check (min_lease_months > 0),
  pets_allowed      boolean,

  -- Land specifics: deed type (chanote / nor-sor-3-gor ...), zoning colour, road frontage ...
  land_details      jsonb not null default '{}',

  tags              text[] not null default '{}',
  amenities         text[] not null default '{}',

  -- Location
  province          text not null,
  district          text,
  subdistrict       text,
  postal_code       text check (postal_code ~ '^[0-9]{5}$'),
  address_line      text,
  lat               double precision check (lat between -90 and 90),
  lng               double precision check (lng between -180 and 180),
  show_exact_location boolean not null default false,

  -- Trust & promotion (staff / system only)
  is_verified       boolean not null default false,
  verified_at       timestamptz,
  featured_until    timestamptz,

  -- Counters (maintained by triggers / RPCs)
  views_count       int not null default 0,
  saves_count       int not null default 0,
  inquiries_count   int not null default 0,

  published_at      timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint properties_price_matches_type check (
    (listing_type = 'sale' and sale_price is not null)
    or (listing_type = 'rent' and rent_price is not null)
    or (listing_type = 'sale_or_rent' and sale_price is not null and rent_price is not null)
  ),
  constraint properties_latlng_pair check ((lat is null) = (lng is null))
);

create index properties_status_idx    on public.properties (status, published_at desc);
create index properties_owner_idx     on public.properties (owner_id);
create index properties_agent_idx     on public.properties (agent_id) where agent_id is not null;
create index properties_zone_idx      on public.properties (zone_id) where zone_id is not null;
create index properties_search_idx    on public.properties (category, listing_type, province) where status = 'active';
create index properties_sale_idx      on public.properties (sale_price) where status = 'active';
create index properties_rent_idx      on public.properties (rent_price) where status = 'active';
create index properties_geo_idx       on public.properties (lat, lng) where status = 'active' and lat is not null;
create index properties_featured_idx  on public.properties (featured_until) where featured_until is not null;
create index properties_title_trgm    on public.properties using gin (title extensions.gin_trgm_ops);
create index properties_tags_idx      on public.properties using gin (tags);

create trigger properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

-- Owners control content; staff control verification, moderation, promotion and counters.
create or replace function public.properties_guard()
returns trigger language plpgsql as $$
declare
  allowed boolean;
begin
  if public.is_privileged_role() or public.is_staff(array['moderator']::public.staff_role[]) then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      if new.status = 'active' and new.published_at is null then
        new.published_at := now();
      end if;
      if new.status = 'active' and new.expires_at is null then
        new.expires_at := now() + interval '90 days';
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.owner_id := auth.uid();
    if new.status not in ('draft', 'pending_review') then
      new.status := 'draft';
    end if;
    new.rejection_reason := null;
    new.is_verified := false;
    new.verified_at := null;
    new.featured_until := null;
    new.views_count := 0;
    new.saves_count := 0;
    new.inquiries_count := 0;
    new.published_at := null;
    new.expires_at := null;
    return new;
  end if;

  -- UPDATE by owner / assigned agent
  new.id := old.id;
  new.code := old.code;
  new.owner_id := old.owner_id;
  if auth.uid() is distinct from old.owner_id then
    new.agent_id := old.agent_id;  -- only the owner assigns / removes the agent
  end if;
  new.is_verified := old.is_verified;
  new.verified_at := old.verified_at;
  new.featured_until := old.featured_until;
  new.views_count := old.views_count;
  new.saves_count := old.saves_count;
  new.inquiries_count := old.inquiries_count;
  new.published_at := old.published_at;
  new.expires_at := old.expires_at;
  new.created_at := old.created_at;
  if new.status is not distinct from old.status then
    new.rejection_reason := old.rejection_reason;
  end if;

  if new.status is distinct from old.status then
    allowed :=
         (old.status in ('draft', 'rejected') and new.status = 'pending_review')
      or (old.status = 'pending_review' and new.status = 'draft')
      or (old.status = 'active' and new.status in ('reserved', 'sold', 'rented'))
      or (old.status = 'reserved' and new.status in ('active', 'sold', 'rented'))
      or (old.status in ('expired', 'sold', 'rented', 'archived') and new.status = 'pending_review')
      or (new.status = 'archived');
    if not allowed then
      raise exception 'Invalid listing status change: % -> %', old.status, new.status
        using errcode = 'check_violation';
    end if;
    if new.status = 'pending_review' then
      new.rejection_reason := null;
    end if;
  end if;
  return new;
end $$;

create trigger properties_guard before insert or update on public.properties
  for each row execute function public.properties_guard();

-- ---------------------------------------------------------------------------
-- Media (stored in the "property-media" bucket at {owner_id}/{property_id}/...,
-- or an external URL for imported/demo data)
-- ---------------------------------------------------------------------------
create table public.property_media (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties (id) on delete cascade,
  kind          public.media_kind not null default 'image',
  storage_path  text,
  external_url  text,
  caption       text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  constraint property_media_source check ((storage_path is null) <> (external_url is null))
);
create index property_media_property_idx on public.property_media (property_id, sort_order);

-- ---------------------------------------------------------------------------
-- Favorites, saved searches, analytics events
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, property_id)
);
create index favorites_property_idx on public.favorites (property_id);

create table public.saved_searches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) <= 80),
  filters     jsonb not null default '{}',
  notify      boolean not null default true,
  last_notified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index saved_searches_user_idx on public.saved_searches (user_id);

create type public.property_event_kind as enum ('view', 'contact_reveal', 'share');

create table public.property_events (
  id          bigint generated always as identity primary key,
  property_id uuid not null references public.properties (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete set null,
  kind        public.property_event_kind not null,
  created_at  timestamptz not null default now()
);
create index property_events_property_idx on public.property_events (property_id, created_at desc);

-- Keep saves_count in sync.
create or replace function public.favorites_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.properties set saves_count = saves_count + 1 where id = new.property_id;
  else
    update public.properties set saves_count = greatest(saves_count - 1, 0) where id = old.property_id;
  end if;
  return null;
end $$;
create trigger favorites_counter after insert or delete on public.favorites
  for each row execute function public.favorites_counter();

-- Record a view (one per user/anon call); safe to call from the public page.
create or replace function public.track_property_view(p_property_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.properties where id = p_property_id and status = 'active') then
    return;
  end if;
  -- Signed-in users count once per hour per listing.
  if auth.uid() is not null and exists (
    select 1 from public.property_events
    where property_id = p_property_id and user_id = auth.uid() and kind = 'view'
      and created_at > now() - interval '1 hour'
  ) then
    return;
  end if;
  insert into public.property_events (property_id, user_id, kind) values (p_property_id, auth.uid(), 'view');
  update public.properties set views_count = views_count + 1 where id = p_property_id;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.zones           enable row level security;
alter table public.properties      enable row level security;
alter table public.property_media  enable row level security;
alter table public.favorites       enable row level security;
alter table public.saved_searches  enable row level security;
alter table public.property_events enable row level security;

create policy zones_select on public.zones for select using (active or public.is_staff());
create policy zones_manage on public.zones for all
  using (public.is_staff(array['moderator']::public.staff_role[]))
  with check (public.is_staff(array['moderator']::public.staff_role[]));

-- Public sees active/reserved/sold/rented listings; owners and assigned agents see their own.
create policy properties_select on public.properties for select using (
  status in ('active', 'reserved', 'sold', 'rented')
  or owner_id = auth.uid()
  or agent_id = auth.uid()
  or public.is_staff()
);
create policy properties_insert on public.properties for insert
  with check (owner_id = auth.uid() and public.is_active_user());
create policy properties_update_owner on public.properties for update
  using ((owner_id = auth.uid() or agent_id = auth.uid()) and public.is_active_user())
  with check (owner_id = auth.uid() or agent_id = auth.uid());
create policy properties_update_staff on public.properties for update
  using (public.is_staff(array['moderator', 'verifier']::public.staff_role[]));
create policy properties_delete on public.properties for delete
  using ((owner_id = auth.uid() and status in ('draft', 'rejected')) or public.is_staff(array['moderator']::public.staff_role[]));

create or replace function public.can_manage_property(p_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.properties p
    where p.id = p_property_id and (p.owner_id = auth.uid() or p.agent_id = auth.uid())
  ) and public.is_active_user();
$$;

create policy media_select on public.property_media for select
  using (exists (select 1 from public.properties p where p.id = property_id));  -- inherits properties RLS
create policy media_manage on public.property_media for all
  using (public.can_manage_property(property_id) or public.is_staff(array['moderator']::public.staff_role[]))
  with check (public.can_manage_property(property_id) or public.is_staff(array['moderator']::public.staff_role[]));

create policy favorites_own on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy saved_searches_own on public.saved_searches for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy property_events_select on public.property_events for select
  using (public.can_manage_property(property_id) or public.is_staff());
