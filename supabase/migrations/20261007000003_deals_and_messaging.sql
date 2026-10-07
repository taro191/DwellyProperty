-- =============================================================================
-- Dwelly — 03 Deals & messaging: inquiries (leads), appointments, offers,
--          conversations, messages, notifications
-- =============================================================================

create type public.inquiry_intent as enum ('buy', 'rent', 'invest', 'info');
create type public.inquiry_status as enum ('new', 'contacted', 'qualified', 'won', 'lost');
create type public.appointment_format as enum ('onsite', 'video');
create type public.appointment_status as enum ('pending', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show');
create type public.offer_kind as enum ('purchase', 'rent');
create type public.offer_status as enum ('pending', 'countered', 'accepted', 'rejected', 'withdrawn', 'expired');

-- ---------------------------------------------------------------------------
-- Notifications (+ internal helper used by triggers)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  entity_type text,
  entity_id   uuid,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create or replace function public.notify(
  p_user_id uuid, p_type text, p_title text, p_body text, p_link text,
  p_entity_type text default null, p_entity_id uuid default null
) returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  select p_user_id, p_type, p_title, p_body, p_link, p_entity_type, p_entity_id
  where p_user_id is not null;
$$;
revoke execute on function public.notify(uuid, text, text, text, text, text, uuid) from public, anon, authenticated;

-- Shared BEFORE INSERT trigger for buyer-created deal rows: fills buyer/seller,
-- blocks self-dealing and requests on listings that are not live.
create or replace function public.deal_row_defaults()
returns trigger language plpgsql as $$
declare
  prop record;
begin
  select id, owner_id, agent_id, status into prop from public.properties where id = new.property_id;
  if prop.id is null then
    raise exception 'Property not found' using errcode = 'foreign_key_violation';
  end if;
  if public.is_privileged_role() then
    new.seller_id := coalesce(new.seller_id, prop.agent_id, prop.owner_id);
    return new;
  end if;
  if prop.status not in ('active', 'reserved') then
    raise exception 'This listing is not accepting requests' using errcode = 'check_violation';
  end if;
  new.buyer_id := auth.uid();
  new.seller_id := coalesce(prop.agent_id, prop.owner_id);
  if new.buyer_id = prop.owner_id or new.buyer_id = prop.agent_id then
    raise exception 'You cannot send a request on your own listing' using errcode = 'check_violation';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Inquiries (seller leads)
-- ---------------------------------------------------------------------------
create table public.inquiries (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties (id) on delete cascade,
  buyer_id      uuid not null references public.profiles (id) on delete cascade,
  seller_id     uuid not null references public.profiles (id) on delete cascade,
  intent        public.inquiry_intent not null,
  status        public.inquiry_status not null default 'new',
  message       text check (char_length(message) <= 2000),
  contact_phone text check (contact_phone ~ '^[0-9+\- ]{6,20}$'),
  budget        numeric(14, 2) check (budget > 0),
  seller_notes  text check (char_length(seller_notes) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index inquiries_seller_idx on public.inquiries (seller_id, created_at desc);
create index inquiries_buyer_idx on public.inquiries (buyer_id, created_at desc);
create index inquiries_property_idx on public.inquiries (property_id);

create trigger inquiries_defaults before insert on public.inquiries
  for each row execute function public.deal_row_defaults();

-- Seller may only move the pipeline and keep notes.
create or replace function public.inquiries_guard()
returns trigger language plpgsql as $$
declare
  r public.inquiries;
begin
  if public.is_privileged_role() then
    new.updated_at := now();
    return new;
  end if;
  r := old;
  r.status := new.status;
  r.seller_notes := new.seller_notes;
  r.updated_at := now();
  return r;
end $$;
create trigger inquiries_guard before update on public.inquiries
  for each row execute function public.inquiries_guard();

create or replace function public.inquiries_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.properties set inquiries_count = inquiries_count + 1 where id = new.property_id;
  perform public.notify(new.seller_id, 'inquiry', 'มีผู้สนใจทรัพย์ของคุณ', left(new.message, 140),
    '/dashboard/leads', 'inquiry', new.id);
  return null;
end $$;
create trigger inquiries_after_insert after insert on public.inquiries
  for each row execute function public.inquiries_after_insert();

-- ---------------------------------------------------------------------------
-- Appointments (on-site viewing or video call)
-- ---------------------------------------------------------------------------
create table public.appointments (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties (id) on delete cascade,
  buyer_id      uuid not null references public.profiles (id) on delete cascade,
  seller_id     uuid not null references public.profiles (id) on delete cascade,
  format        public.appointment_format not null default 'onsite',
  scheduled_at  timestamptz not null,
  duration_min  smallint not null default 45 check (duration_min between 15 and 240),
  status        public.appointment_status not null default 'pending',
  buyer_note    text check (char_length(buyer_note) <= 1000),
  seller_note   text check (char_length(seller_note) <= 1000),
  meeting_url   text,
  cancelled_by  uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index appointments_seller_idx on public.appointments (seller_id, scheduled_at);
create index appointments_buyer_idx on public.appointments (buyer_id, scheduled_at);

create or replace function public.appointments_before_insert()
returns trigger language plpgsql as $$
begin
  if not public.is_privileged_role() then
    if new.scheduled_at < now() + interval '1 hour' then
      raise exception 'Appointment must be at least 1 hour from now' using errcode = 'check_violation';
    end if;
    new.status := 'pending';
    new.seller_note := null;
    new.meeting_url := null;
    new.cancelled_by := null;
  end if;
  return new;
end $$;
create trigger appointments_defaults before insert on public.appointments
  for each row execute function public.deal_row_defaults();
create trigger appointments_before_insert before insert on public.appointments
  for each row execute function public.appointments_before_insert();

create or replace function public.appointments_guard()
returns trigger language plpgsql as $$
declare
  r public.appointments;
  me uuid := auth.uid();
  ok boolean := false;
begin
  if public.is_privileged_role() then
    new.updated_at := now();
    return new;
  end if;
  r := old;
  r.updated_at := now();

  if me = old.seller_id then
    r.seller_note := new.seller_note;
    r.meeting_url := new.meeting_url;
    if new.status is distinct from old.status then
      ok := (old.status = 'pending' and new.status in ('confirmed', 'declined', 'cancelled'))
         or (old.status = 'confirmed' and new.status in ('completed', 'no_show', 'cancelled'));
    else
      ok := true;
    end if;
  elsif me = old.buyer_id then
    r.buyer_note := new.buyer_note;
    if new.status is distinct from old.status then
      ok := old.status in ('pending', 'confirmed') and new.status = 'cancelled';
    elsif old.status = 'pending' then
      -- buyer may reschedule while still pending
      r.scheduled_at := new.scheduled_at;
      r.format := new.format;
      ok := new.scheduled_at >= now() + interval '1 hour';
    else
      ok := true;
    end if;
  end if;

  if not ok then
    raise exception 'Invalid appointment change' using errcode = 'check_violation';
  end if;
  r.status := new.status;
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    r.cancelled_by := me;
  end if;
  return r;
end $$;
create trigger appointments_guard before update on public.appointments
  for each row execute function public.appointments_guard();

create or replace function public.appointments_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.seller_id, 'appointment', 'มีคำขอนัดชมทรัพย์ใหม่',
      to_char(new.scheduled_at at time zone 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI'),
      '/dashboard/appointments', 'appointment', new.id);
  elsif new.status is distinct from old.status then
    perform public.notify(
      case when auth.uid() = new.seller_id then new.buyer_id else new.seller_id end,
      'appointment',
      case new.status
        when 'confirmed' then 'ยืนยันนัดชมแล้ว'
        when 'declined'  then 'นัดชมถูกปฏิเสธ'
        when 'cancelled' then 'นัดชมถูกยกเลิก'
        when 'completed' then 'นัดชมเสร็จสิ้น'
        else 'อัปเดตนัดชม'
      end,
      to_char(new.scheduled_at at time zone 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI'),
      case when auth.uid() = new.seller_id then '/me/appointments' else '/dashboard/appointments' end,
      'appointment', new.id);
  end if;
  return null;
end $$;
create trigger appointments_notify after insert or update on public.appointments
  for each row execute function public.appointments_notify();

-- ---------------------------------------------------------------------------
-- Offers (purchase or rent) with one counter-offer round per row
-- ---------------------------------------------------------------------------
create table public.offers (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties (id) on delete cascade,
  buyer_id       uuid not null references public.profiles (id) on delete cascade,
  seller_id      uuid not null references public.profiles (id) on delete cascade,
  kind           public.offer_kind not null,
  listed_price   numeric(14, 2) not null,
  offer_price    numeric(14, 2) not null check (offer_price > 0),
  counter_price  numeric(14, 2) check (counter_price > 0),
  buyer_note     text check (char_length(buyer_note) <= 2000),
  seller_note    text check (char_length(seller_note) <= 2000),
  valid_until    timestamptz not null default (now() + interval '7 days'),
  status         public.offer_status not null default 'pending',
  responded_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index offers_seller_idx on public.offers (seller_id, created_at desc);
create index offers_buyer_idx on public.offers (buyer_id, created_at desc);
create index offers_property_idx on public.offers (property_id);

create or replace function public.offers_before_insert()
returns trigger language plpgsql as $$
declare
  prop record;
begin
  select sale_price, rent_price into prop from public.properties where id = new.property_id;
  new.listed_price := case new.kind when 'purchase' then prop.sale_price else prop.rent_price end;
  if new.listed_price is null then
    raise exception 'This listing is not offered for %', new.kind using errcode = 'check_violation';
  end if;
  if not public.is_privileged_role() then
    new.status := 'pending';
    new.counter_price := null;
    new.seller_note := null;
    new.responded_at := null;
    if new.valid_until > now() + interval '30 days' or new.valid_until < now() + interval '1 day' then
      raise exception 'Offer validity must be between 1 and 30 days' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger offers_defaults before insert on public.offers
  for each row execute function public.deal_row_defaults();
create trigger offers_before_insert before insert on public.offers
  for each row execute function public.offers_before_insert();

create or replace function public.offers_guard()
returns trigger language plpgsql as $$
declare
  r public.offers;
  me uuid := auth.uid();
  ok boolean := false;
begin
  if public.is_privileged_role() then
    new.updated_at := now();
    return new;
  end if;
  r := old;
  r.updated_at := now();
  if new.status is not distinct from old.status then
    raise exception 'Offer status must change' using errcode = 'check_violation';
  end if;
  if old.valid_until < now() and old.status in ('pending', 'countered') then
    raise exception 'Offer has expired' using errcode = 'check_violation';
  end if;

  if me = old.seller_id then
    ok := old.status = 'pending' and new.status in ('accepted', 'rejected', 'countered');
    r.seller_note := new.seller_note;
    if new.status = 'countered' then
      if new.counter_price is null then
        raise exception 'Counter price is required' using errcode = 'check_violation';
      end if;
      r.counter_price := new.counter_price;
      r.valid_until := greatest(old.valid_until, now() + interval '3 days');
    end if;
  elsif me = old.buyer_id then
    ok := (old.status in ('pending', 'countered') and new.status = 'withdrawn')
       or (old.status = 'countered' and new.status in ('accepted', 'rejected'));
  end if;

  if not ok then
    raise exception 'Invalid offer change' using errcode = 'check_violation';
  end if;
  r.status := new.status;
  r.responded_at := now();
  return r;
end $$;
create trigger offers_guard before update on public.offers
  for each row execute function public.offers_guard();

create or replace function public.offers_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.seller_id, 'offer', 'ได้รับข้อเสนอใหม่',
      'ราคาเสนอ ฿' || to_char(new.offer_price, 'FM999,999,999,990'), '/dashboard/offers', 'offer', new.id);
  elsif new.status is distinct from old.status then
    perform public.notify(
      case when auth.uid() = new.seller_id then new.buyer_id else new.seller_id end,
      'offer',
      case new.status
        when 'accepted'  then 'ข้อเสนอได้รับการตอบรับ'
        when 'rejected'  then 'ข้อเสนอถูกปฏิเสธ'
        when 'countered' then 'ผู้ขายยื่นราคาโต้กลับ'
        when 'withdrawn' then 'ผู้ซื้อถอนข้อเสนอ'
        else 'อัปเดตข้อเสนอ'
      end,
      null,
      case when auth.uid() = new.seller_id then '/me/offers' else '/dashboard/offers' end,
      'offer', new.id);
  end if;
  return null;
end $$;
create trigger offers_notify after insert or update on public.offers
  for each row execute function public.offers_notify();

-- ---------------------------------------------------------------------------
-- Conversations & messages
-- ---------------------------------------------------------------------------
create table public.conversations (
  id                   uuid primary key default gen_random_uuid(),
  property_id          uuid references public.properties (id) on delete set null,
  created_by           uuid references public.profiles (id) on delete set null,
  last_message_at      timestamptz,
  last_message_preview text,
  created_at           timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  last_read_at    timestamptz,
  archived        boolean not null default false,
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_participants_user_idx on public.conversation_participants (user_id);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  body            text check (char_length(body) <= 4000),
  attachment_path text,
  created_at      timestamptz not null default now(),
  constraint messages_not_empty check (coalesce(btrim(body), '') <> '' or attachment_path is not null)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id and user_id = auth.uid()
  );
$$;

-- Find or create the 1:1 thread between the caller and the listing contact (or another user).
create or replace function public.start_conversation(p_property_id uuid default null, p_other_user uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  other uuid := p_other_user;
  conv uuid;
begin
  if me is null or not public.is_active_user() then
    raise exception 'Sign in required' using errcode = 'insufficient_privilege';
  end if;
  if other is null and p_property_id is not null then
    select coalesce(agent_id, owner_id) into other from public.properties
    where id = p_property_id and status in ('active', 'reserved', 'sold', 'rented');
  end if;
  if other is null or other = me then
    raise exception 'No one to message' using errcode = 'check_violation';
  end if;

  select c.id into conv
  from public.conversations c
  join public.conversation_participants a on a.conversation_id = c.id and a.user_id = me
  join public.conversation_participants b on b.conversation_id = c.id and b.user_id = other
  where c.property_id is not distinct from p_property_id
  limit 1;

  if conv is null then
    insert into public.conversations (property_id, created_by) values (p_property_id, me) returning id into conv;
    insert into public.conversation_participants (conversation_id, user_id) values (conv, me), (conv, other);
  else
    update public.conversation_participants set archived = false where conversation_id = conv and user_id = me;
  end if;
  return conv;
end $$;

create or replace function public.messages_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p record;
begin
  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = left(coalesce(nullif(btrim(new.body), ''), '📎 ไฟล์แนบ'), 140)
   where id = new.conversation_id;
  update public.conversation_participants
     set last_read_at = new.created_at, archived = false
   where conversation_id = new.conversation_id and user_id = new.sender_id;

  -- One unread "message" notification per conversation per recipient.
  for p in
    select user_id from public.conversation_participants
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    if not exists (
      select 1 from public.notifications
      where user_id = p.user_id and type = 'message' and entity_id = new.conversation_id and read_at is null
    ) then
      perform public.notify(p.user_id, 'message', 'ข้อความใหม่', left(new.body, 140),
        '/messages/' || new.conversation_id, 'conversation', new.conversation_id);
    end if;
  end loop;
  return null;
end $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.messages_after_insert();

-- Inbox listing with unread counts and the other participant.
create or replace function public.list_conversations()
returns table (
  id uuid, property_id uuid, property_title text, property_code text,
  other_user_id uuid, other_name text, other_avatar text,
  last_message_at timestamptz, last_message_preview text, unread_count bigint
) language sql stable security definer set search_path = public as $$
  select c.id, c.property_id, pr.title, pr.code,
         o.user_id, op.display_name, op.avatar_url,
         c.last_message_at, c.last_message_preview,
         (select count(*) from public.messages m
           where m.conversation_id = c.id and m.sender_id <> auth.uid()
             and m.created_at > coalesce(me.last_read_at, '-infinity'))
  from public.conversation_participants me
  join public.conversations c on c.id = me.conversation_id
  left join public.conversation_participants o on o.conversation_id = c.id and o.user_id <> me.user_id
  left join public.profiles op on op.id = o.user_id
  left join public.properties pr on pr.id = c.property_id
  where me.user_id = auth.uid() and not me.archived
  order by c.last_message_at desc nulls last;
$$;

-- ---------------------------------------------------------------------------
-- Contact reveal (logs an event so sellers see real interest; PDPA-friendly)
-- ---------------------------------------------------------------------------
create or replace function public.reveal_listing_contact(p_property_id uuid)
returns table (display_name text, phone text, line_id text)
language plpgsql security definer set search_path = public as $$
declare
  contact uuid;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Sign in required' using errcode = 'insufficient_privilege';
  end if;
  select coalesce(agent_id, owner_id) into contact from public.properties
  where id = p_property_id and status in ('active', 'reserved');
  if contact is null then
    raise exception 'Listing not available' using errcode = 'no_data_found';
  end if;
  insert into public.property_events (property_id, user_id, kind) values (p_property_id, auth.uid(), 'contact_reveal');
  return query
    select pf.display_name, pp.phone, pp.line_id
    from public.profiles pf join public.profile_private pp on pp.user_id = pf.id
    where pf.id = contact;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.notifications             enable row level security;
alter table public.inquiries                 enable row level security;
alter table public.appointments              enable row level security;
alter table public.offers                    enable row level security;
alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                  enable row level security;

create policy notifications_select on public.notifications for select using (user_id = auth.uid());
create policy notifications_update on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());

-- Deal tables: both parties read; buyer creates; party-specific updates enforced by guards.
create policy inquiries_select on public.inquiries for select
  using (auth.uid() in (buyer_id, seller_id) or public.is_staff(array['support']::public.staff_role[]));
create policy inquiries_insert on public.inquiries for insert
  with check (buyer_id = auth.uid() and public.is_active_user());
create policy inquiries_update on public.inquiries for update
  using (seller_id = auth.uid() and public.is_active_user());

create policy appointments_select on public.appointments for select
  using (auth.uid() in (buyer_id, seller_id) or public.is_staff(array['support']::public.staff_role[]));
create policy appointments_insert on public.appointments for insert
  with check (buyer_id = auth.uid() and public.is_active_user());
create policy appointments_update on public.appointments for update
  using (auth.uid() in (buyer_id, seller_id) and public.is_active_user());

create policy offers_select on public.offers for select
  using (auth.uid() in (buyer_id, seller_id) or public.is_staff(array['support']::public.staff_role[]));
create policy offers_insert on public.offers for insert
  with check (buyer_id = auth.uid() and public.is_active_user());
create policy offers_update on public.offers for update
  using (auth.uid() in (buyer_id, seller_id) and public.is_active_user());

create policy conversations_select on public.conversations for select
  using (public.is_conversation_member(id) or public.is_staff(array['support']::public.staff_role[]));

create policy participants_select on public.conversation_participants for select
  using (public.is_conversation_member(conversation_id));
create policy participants_update_self on public.conversation_participants for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy messages_select on public.messages for select
  using (public.is_conversation_member(conversation_id) or public.is_staff(array['support']::public.staff_role[]));
create policy messages_insert on public.messages for insert
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id) and public.is_active_user());

-- Realtime for chat + notifications (publication exists on Supabase).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages, public.notifications;
  end if;
end $$;
