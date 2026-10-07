-- =============================================================================
-- Dwelly — 04 Trust: agent profiles, agency pods, verification (KYC / licence /
--          ownership), reviews, reports, Dwelly Commission (Co-Agent)
-- =============================================================================

create type public.pod_status as enum ('pending', 'verified', 'suspended');
create type public.pod_member_role as enum ('leader', 'member');
create type public.verification_kind as enum ('identity', 'agent_license', 'property_ownership', 'company');
create type public.verification_status as enum ('pending', 'needs_info', 'approved', 'rejected');
create type public.review_target as enum ('agent', 'seller', 'pod');
create type public.review_status as enum ('published', 'hidden');
create type public.report_target as enum ('property', 'user', 'message', 'review');
create type public.report_reason as enum ('scam', 'fake_listing', 'wrong_info', 'duplicate', 'already_sold', 'harassment', 'spam', 'other');
create type public.report_status as enum ('open', 'investigating', 'resolved', 'dismissed');
create type public.access_status as enum ('pending', 'approved', 'rejected', 'revoked');

-- ---------------------------------------------------------------------------
-- Agent profiles (1:1 with profiles for users holding the 'agent' role)
-- ---------------------------------------------------------------------------
create table public.agent_profiles (
  user_id            uuid primary key references public.profiles (id) on delete cascade,
  agent_code         text not null unique default ('AG' || upper(substr(md5(gen_random_uuid()::text), 1, 6))),
  english_name       text,
  title              text,
  company_name       text,
  license_no         text,
  license_verified   boolean not null default false,
  experience_years   smallint check (experience_years between 0 and 70),
  specialized_zones  uuid[] not null default '{}',
  specialized_categories public.property_category[] not null default '{}',
  certificates       jsonb not null default '[]',
  rating_avg         numeric(3, 2) not null default 0,
  rating_count       int not null default 0,
  closed_deals       int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger agent_profiles_updated_at before update on public.agent_profiles
  for each row execute function public.set_updated_at();

create or replace function public.agent_profiles_guard()
returns trigger language plpgsql as $$
begin
  if public.is_privileged_role() or public.is_staff(array['verifier']::public.staff_role[]) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.license_verified := false;
    new.rating_avg := 0;
    new.rating_count := 0;
    new.closed_deals := 0;
  else
    new.user_id := old.user_id;
    new.agent_code := old.agent_code;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.closed_deals := old.closed_deals;
    -- Changing licence number drops verification until re-checked.
    if new.license_no is distinct from old.license_no then
      new.license_verified := false;
    else
      new.license_verified := old.license_verified;
    end if;
  end if;
  return new;
end $$;
create trigger agent_profiles_guard before insert or update on public.agent_profiles
  for each row execute function public.agent_profiles_guard();

-- ---------------------------------------------------------------------------
-- Agency pods (verified agent teams)
-- ---------------------------------------------------------------------------
create table public.agency_pods (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique default ('POD-' || upper(substr(md5(gen_random_uuid()::text), 1, 5))),
  name               text not null check (char_length(name) between 3 and 80),
  description        text,
  zone_id            uuid references public.zones (id) on delete set null,
  leader_id          uuid not null references public.profiles (id) on delete restrict,
  status             public.pod_status not null default 'pending',
  trust_score        smallint not null default 0 check (trust_score between 0 and 100),
  insurance_coverage numeric(14, 2) not null default 0,
  verifications      jsonb not null default '{}',  -- {license, identity, escrow_ready, background_checked, ...}
  rating_avg         numeric(3, 2) not null default 0,
  rating_count       int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger agency_pods_updated_at before update on public.agency_pods
  for each row execute function public.set_updated_at();

alter table public.properties
  add constraint properties_pod_fk foreign key (pod_id) references public.agency_pods (id) on delete set null;

create table public.pod_members (
  pod_id    uuid not null references public.agency_pods (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      public.pod_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (pod_id, user_id)
);
create index pod_members_user_idx on public.pod_members (user_id);

create or replace function public.agency_pods_guard()
returns trigger language plpgsql as $$
begin
  if public.is_privileged_role() or public.is_staff(array['verifier']::public.staff_role[]) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.leader_id := auth.uid();
    new.status := 'pending';
    new.trust_score := 0;
    new.insurance_coverage := 0;
    new.verifications := '{}';
    new.rating_avg := 0;
    new.rating_count := 0;
  else
    new.id := old.id;
    new.code := old.code;
    new.leader_id := old.leader_id;
    new.status := old.status;
    new.trust_score := old.trust_score;
    new.insurance_coverage := old.insurance_coverage;
    new.verifications := old.verifications;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
  end if;
  return new;
end $$;
create trigger agency_pods_guard before insert or update on public.agency_pods
  for each row execute function public.agency_pods_guard();

create or replace function public.agency_pods_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.pod_members (pod_id, user_id, role) values (new.id, new.leader_id, 'leader')
  on conflict do nothing;
  return null;
end $$;
create trigger agency_pods_after_insert after insert on public.agency_pods
  for each row execute function public.agency_pods_after_insert();

create or replace function public.is_pod_leader(p_pod_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.agency_pods where id = p_pod_id and leader_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Verification requests + documents (files in private "verification-docs" bucket
-- at {user_id}/{request_id}/{file})
-- ---------------------------------------------------------------------------
create table public.verification_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  kind          public.verification_kind not null,
  property_id   uuid references public.properties (id) on delete cascade,
  status        public.verification_status not null default 'pending',
  submitted_data jsonb not null default '{}',  -- e.g. {full_name, id_last4, deed_no, license_no}
  reviewer_id   uuid references public.profiles (id),
  reviewer_note text,
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz,
  constraint verification_property_kind check ((kind = 'property_ownership') = (property_id is not null))
);
create index verification_requests_queue_idx on public.verification_requests (status, submitted_at);
create index verification_requests_user_idx on public.verification_requests (user_id);
create unique index verification_requests_one_open
  on public.verification_requests (user_id, kind, coalesce(property_id, '00000000-0000-0000-0000-000000000000'))
  where status in ('pending', 'needs_info');

create table public.verification_documents (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.verification_requests (id) on delete cascade,
  doc_type     text not null,  -- id_card, selfie, deed, license, company_cert, other
  storage_path text not null,
  created_at   timestamptz not null default now()
);
create index verification_documents_request_idx on public.verification_documents (request_id);

create or replace function public.verification_requests_guard()
returns trigger language plpgsql as $$
begin
  if public.is_privileged_role() or public.is_staff(array['verifier']::public.staff_role[]) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.status := 'pending';
    new.reviewer_id := null;
    new.reviewer_note := null;
    new.reviewed_at := null;
    if new.property_id is not null and not exists (
      select 1 from public.properties where id = new.property_id and owner_id = auth.uid()
    ) then
      raise exception 'You can only verify your own listing' using errcode = 'insufficient_privilege';
    end if;
  else
    -- Applicant may only resubmit data after "needs_info".
    if old.status <> 'needs_info' then
      raise exception 'Request is locked while under review' using errcode = 'check_violation';
    end if;
    new.id := old.id;
    new.user_id := old.user_id;
    new.kind := old.kind;
    new.property_id := old.property_id;
    new.status := 'pending';
    new.reviewer_id := old.reviewer_id;
    new.reviewer_note := old.reviewer_note;
    new.reviewed_at := old.reviewed_at;
    new.submitted_at := now();
  end if;
  return new;
end $$;
create trigger verification_requests_guard before insert or update on public.verification_requests
  for each row execute function public.verification_requests_guard();

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.review_target not null,
  target_id   uuid not null,  -- profiles.id for agent/seller, agency_pods.id for pod
  rating      smallint not null check (rating between 1 and 5),
  body        text check (char_length(body) <= 2000),
  status      public.review_status not null default 'published',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (reviewer_id, target_type, target_id)
);
create index reviews_target_idx on public.reviews (target_type, target_id) where status = 'published';
create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- Only people who actually dealt with the target (completed viewing or answered offer) may review.
create or replace function public.reviews_guard()
returns trigger language plpgsql as $$
begin
  if public.is_privileged_role() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if not public.is_staff(array['moderator']::public.staff_role[]) then
      new.status := old.status;
    end if;
    new.reviewer_id := old.reviewer_id;
    new.target_type := old.target_type;
    new.target_id := old.target_id;
    return new;
  end if;

  new.reviewer_id := auth.uid();
  new.status := 'published';
  if new.target_id = auth.uid() then
    raise exception 'You cannot review yourself' using errcode = 'check_violation';
  end if;
  if new.target_type in ('agent', 'seller') and not exists (
       select 1 from public.appointments a
       where a.buyer_id = auth.uid() and a.seller_id = new.target_id and a.status = 'completed'
       union all
       select 1 from public.offers o
       where o.buyer_id = auth.uid() and o.seller_id = new.target_id and o.status in ('accepted', 'rejected')
     ) then
    raise exception 'You can review only after a completed viewing or offer' using errcode = 'check_violation';
  end if;
  if new.target_type = 'pod' and not exists (
       select 1 from public.appointments a
       join public.pod_members pm on pm.user_id = a.seller_id and pm.pod_id = new.target_id
       where a.buyer_id = auth.uid() and a.status = 'completed'
     ) then
    raise exception 'You can review only after a completed viewing' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger reviews_guard before insert or update on public.reviews
  for each row execute function public.reviews_guard();

create or replace function public.reviews_rollup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t_type public.review_target := coalesce(new.target_type, old.target_type);
  t_id uuid := coalesce(new.target_id, old.target_id);
  avg_r numeric;
  cnt int;
begin
  select coalesce(avg(rating), 0), count(*) into avg_r, cnt
  from public.reviews where target_type = t_type and target_id = t_id and status = 'published';
  if t_type = 'pod' then
    update public.agency_pods set rating_avg = round(avg_r, 2), rating_count = cnt where id = t_id;
  else
    update public.agent_profiles set rating_avg = round(avg_r, 2), rating_count = cnt where user_id = t_id;
  end if;
  return null;
end $$;
create trigger reviews_rollup after insert or update or delete on public.reviews
  for each row execute function public.reviews_rollup();

-- ---------------------------------------------------------------------------
-- Reports (user flags -> moderation queue)
-- ---------------------------------------------------------------------------
create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid references public.profiles (id) on delete set null,
  target_type     public.report_target not null,
  target_id       uuid not null,
  reason          public.report_reason not null,
  details         text check (char_length(details) <= 2000),
  status          public.report_status not null default 'open',
  handled_by      uuid references public.profiles (id),
  resolution_note text,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);
create index reports_queue_idx on public.reports (status, created_at);
create index reports_target_idx on public.reports (target_type, target_id);

create or replace function public.reports_guard()
returns trigger language plpgsql as $$
begin
  if public.is_privileged_role() or public.is_staff(array['moderator', 'support']::public.staff_role[]) then
    return new;
  end if;
  new.reporter_id := auth.uid();
  new.status := 'open';
  new.handled_by := null;
  new.resolution_note := null;
  new.resolved_at := null;
  return new;
end $$;
create trigger reports_guard before insert on public.reports
  for each row execute function public.reports_guard();

-- ---------------------------------------------------------------------------
-- Dwelly Commission (Co-Agent programme)
--   commission_programs:        owner-defined payout for agents who close a deal
--   commission_access_requests: agents ask for access; owner (listing scope) or
--                               staff (platform-wide partner) approves
-- ---------------------------------------------------------------------------
create table public.commission_programs (
  property_id           uuid primary key references public.properties (id) on delete cascade,
  enabled               boolean not null default true,
  sale_rate_pct         numeric(5, 2) check (sale_rate_pct between 0 and 10),
  rent_month1_rate_pct  numeric(6, 2) check (rent_month1_rate_pct between 0 and 300),
  rent_month2_rate_pct  numeric(6, 2) check (rent_month2_rate_pct between 0 and 300),
  rent_month3_plus_rate_pct numeric(6, 2) check (rent_month3_plus_rate_pct between 0 and 300),
  renewal_rate_pct      numeric(6, 2) check (renewal_rate_pct between 0 and 300),
  terms                 text check (char_length(terms) <= 4000),
  starts_on             date not null default current_date,
  ends_on               date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger commission_programs_updated_at before update on public.commission_programs
  for each row execute function public.set_updated_at();

create table public.commission_access_requests (
  id           uuid primary key default gen_random_uuid(),
  agent_id     uuid not null references public.profiles (id) on delete cascade,
  property_id  uuid references public.properties (id) on delete cascade,  -- null = platform-wide partner
  status       public.access_status not null default 'pending',
  message      text check (char_length(message) <= 1000),
  reviewed_by  uuid references public.profiles (id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create unique index commission_access_unique
  on public.commission_access_requests (agent_id, coalesce(property_id, '00000000-0000-0000-0000-000000000000'))
  where status in ('pending', 'approved');

create or replace function public.has_commission_access(p_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.commission_access_requests r
    where r.agent_id = auth.uid() and r.status = 'approved'
      and (r.property_id is null or r.property_id = p_property_id)
  );
$$;

create or replace function public.commission_access_guard()
returns trigger language plpgsql as $$
declare
  owner uuid;
begin
  if public.is_privileged_role() then return new; end if;
  if tg_op = 'INSERT' then
    if not public.has_app_role('agent') then
      raise exception 'Only agents can request commission access' using errcode = 'insufficient_privilege';
    end if;
    new.agent_id := auth.uid();
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    return new;
  end if;

  -- UPDATE: decision by listing owner (listing scope) or staff; agent may withdraw (revoke) own.
  select owner_id into owner from public.properties where id = old.property_id;
  if public.is_staff(array['moderator']::public.staff_role[])
     or (old.property_id is not null and owner = auth.uid()) then
    if new.status not in ('approved', 'rejected', 'revoked') then
      raise exception 'Invalid decision' using errcode = 'check_violation';
    end if;
  elsif old.agent_id = auth.uid() and new.status = 'revoked' then
    null;
  else
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  new.agent_id := old.agent_id;
  new.property_id := old.property_id;
  new.message := old.message;
  new.reviewed_by := auth.uid();
  new.reviewed_at := now();
  return new;
end $$;
create trigger commission_access_guard before insert or update on public.commission_access_requests
  for each row execute function public.commission_access_guard();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.agent_profiles             enable row level security;
alter table public.agency_pods                enable row level security;
alter table public.pod_members                enable row level security;
alter table public.verification_requests      enable row level security;
alter table public.verification_documents     enable row level security;
alter table public.reviews                    enable row level security;
alter table public.reports                    enable row level security;
alter table public.commission_programs        enable row level security;
alter table public.commission_access_requests enable row level security;

create policy agent_profiles_select on public.agent_profiles for select using (true);
create policy agent_profiles_insert on public.agent_profiles for insert
  with check (user_id = auth.uid() and public.has_app_role('agent') and public.is_active_user());
create policy agent_profiles_update on public.agent_profiles for update
  using (user_id = auth.uid() or public.is_staff(array['verifier']::public.staff_role[]));

create policy pods_select on public.agency_pods for select
  using (status = 'verified' or leader_id = auth.uid() or public.is_staff());
create policy pods_insert on public.agency_pods for insert
  with check (leader_id = auth.uid() and public.has_app_role('agent') and public.is_active_user());
create policy pods_update on public.agency_pods for update
  using (leader_id = auth.uid() or public.is_staff(array['verifier']::public.staff_role[]));

create policy pod_members_select on public.pod_members for select using (true);
create policy pod_members_manage on public.pod_members for all
  using (public.is_pod_leader(pod_id) or public.is_staff(array['verifier']::public.staff_role[]))
  with check (public.is_pod_leader(pod_id) or public.is_staff(array['verifier']::public.staff_role[]));
create policy pod_members_leave on public.pod_members for delete using (user_id = auth.uid() and role = 'member');

create policy verification_select on public.verification_requests for select
  using (user_id = auth.uid() or public.is_staff(array['verifier']::public.staff_role[]));
create policy verification_insert on public.verification_requests for insert
  with check (user_id = auth.uid() and public.is_active_user());
create policy verification_update on public.verification_requests for update
  using (user_id = auth.uid() or public.is_staff(array['verifier']::public.staff_role[]));

create policy verification_docs_select on public.verification_documents for select using (
  exists (select 1 from public.verification_requests r where r.id = request_id and r.user_id = auth.uid())
  or public.is_staff(array['verifier']::public.staff_role[])
);
create policy verification_docs_insert on public.verification_documents for insert with check (
  exists (select 1 from public.verification_requests r
          where r.id = request_id and r.user_id = auth.uid() and r.status in ('pending', 'needs_info'))
  and storage_path like auth.uid()::text || '/%'
);

create policy reviews_select on public.reviews for select
  using (status = 'published' or reviewer_id = auth.uid() or public.is_staff());
create policy reviews_insert on public.reviews for insert
  with check (reviewer_id = auth.uid() and public.is_active_user());
create policy reviews_update on public.reviews for update
  using (reviewer_id = auth.uid() or public.is_staff(array['moderator']::public.staff_role[]));
create policy reviews_delete on public.reviews for delete
  using (reviewer_id = auth.uid() or public.is_staff(array['moderator']::public.staff_role[]));

create policy reports_select on public.reports for select
  using (reporter_id = auth.uid() or public.is_staff(array['moderator', 'support']::public.staff_role[]));
create policy reports_insert on public.reports for insert
  with check (auth.uid() is not null and public.is_active_user());
create policy reports_update on public.reports for update
  using (public.is_staff(array['moderator', 'support']::public.staff_role[]));

-- Commission terms are visible only to the owner, approved agents and staff
-- (buyers/tenants must never see them).
create policy commission_programs_select on public.commission_programs for select using (
  public.can_manage_property(property_id) or public.has_commission_access(property_id) or public.is_staff()
);
create policy commission_programs_manage on public.commission_programs for all
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

create policy commission_access_select on public.commission_access_requests for select using (
  agent_id = auth.uid()
  or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  or public.is_staff()
);
create policy commission_access_insert on public.commission_access_requests for insert
  with check (agent_id = auth.uid() and public.is_active_user());
create policy commission_access_update on public.commission_access_requests for update using (
  agent_id = auth.uid()
  or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  or public.is_staff(array['moderator']::public.staff_role[])
);
