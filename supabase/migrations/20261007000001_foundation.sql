-- =============================================================================
-- Dwelly — 01 Foundation: extensions, enums, helper functions, users, staff, audit
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('buyer', 'tenant', 'owner', 'investor', 'agent');
create type public.staff_role as enum ('super_admin', 'moderator', 'verifier', 'support', 'finance');
create type public.account_status as enum ('active', 'suspended', 'banned', 'deleted');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- True when the current database role bypasses app rules (migrations, seed, service-role API calls).
create or replace function public.is_privileged_role()
returns boolean language sql stable as $$
  select current_user in ('postgres', 'service_role', 'supabase_admin');
$$;

-- ---------------------------------------------------------------------------
-- Profiles (public-facing identity, 1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  display_name     text not null default '' check (char_length(display_name) <= 80),
  avatar_url       text,
  bio              text check (char_length(bio) <= 2000),
  primary_role     public.app_role not null default 'buyer',
  status           public.account_status not null default 'active',
  status_reason    text,
  is_kyc_verified  boolean not null default false,
  kyc_verified_at  timestamptz,
  locale           text not null default 'th' check (locale in ('th', 'en')),
  onboarded_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.profiles is 'Public profile for every account. Contact details live in profile_private.';

-- Contact details are PDPA-sensitive: visible only to the owner and staff.
create table public.profile_private (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  email          text,
  phone          text check (phone ~ '^[0-9+\- ]{6,20}$'),
  phone_verified boolean not null default false,
  line_id        text check (char_length(line_id) <= 50),
  updated_at     timestamptz not null default now()
);

create table public.user_roles (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.staff_members (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  role       public.staff_role not null,
  active     boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger profile_private_updated_at before update on public.profile_private
  for each row execute function public.set_updated_at();
create trigger staff_members_updated_at before update on public.staff_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth helpers (security definer so policies can call them without recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_staff(roles public.staff_role[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff_members s
    where s.user_id = auth.uid()
      and s.active
      and (roles is null or s.role = 'super_admin' or s.role = any (roles))
  );
$$;

-- Signed-in and not suspended/banned. Required for every write a user makes.
create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active');
$$;

create or replace function public.has_app_role(r public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = r);
$$;

-- ---------------------------------------------------------------------------
-- Audit log (append-only, written by security-definer functions and triggers)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  summary     text,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create or replace function public.log_audit(
  p_action text, p_entity_type text, p_entity_id text, p_summary text, p_data jsonb default '{}'
) returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, summary, data)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_summary, coalesce(p_data, '{}'));
$$;
revoke execute on function public.log_audit(text, text, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- App settings (key/value, staff-managed)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);
create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New auth user -> profile + private contact + default role
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}');
  role_in text := meta ->> 'primary_role';
  role_val public.app_role := 'buyer';
begin
  if role_in in ('buyer', 'tenant', 'owner', 'investor', 'agent') then
    role_val := role_in::public.app_role;
  end if;

  insert into public.profiles (id, display_name, avatar_url, primary_role)
  values (
    new.id,
    left(coalesce(nullif(meta ->> 'full_name', ''), nullif(meta ->> 'name', ''), split_part(coalesce(new.email, ''), '@', 1), ''), 80),
    coalesce(meta ->> 'avatar_url', meta ->> 'picture'),
    role_val
  );
  insert into public.profile_private (user_id, email) values (new.id, new.email);
  insert into public.user_roles (user_id, role) values (new.id, role_val);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may not change their own moderation / verification fields.
create or replace function public.profiles_guard()
returns trigger language plpgsql as $$
begin
  if public.is_privileged_role() or public.is_staff(array['support', 'verifier']::public.staff_role[]) then
    return new;
  end if;
  new.id := old.id;
  new.status := old.status;
  new.status_reason := old.status_reason;
  new.is_kyc_verified := old.is_kyc_verified;
  new.kyc_verified_at := old.kyc_verified_at;
  new.created_at := old.created_at;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.profile_private enable row level security;
alter table public.user_roles      enable row level security;
alter table public.staff_members   enable row level security;
alter table public.audit_logs      enable row level security;
alter table public.app_settings    enable row level security;

create policy profiles_select on public.profiles for select
  using (status in ('active', 'suspended') or id = auth.uid() or public.is_staff());
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_staff on public.profiles for update
  using (public.is_staff(array['support', 'verifier']::public.staff_role[]));

create policy profile_private_select on public.profile_private for select
  using (user_id = auth.uid() or public.is_staff());
create policy profile_private_update on public.profile_private for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_roles_select on public.user_roles for select using (true);
create policy user_roles_insert on public.user_roles for insert
  with check (user_id = auth.uid() and public.is_active_user());
create policy user_roles_delete on public.user_roles for delete using (user_id = auth.uid());

create policy staff_select on public.staff_members for select
  using (user_id = auth.uid() or public.is_staff());
create policy staff_manage on public.staff_members for all
  using (public.is_staff(array['super_admin']::public.staff_role[]))
  with check (public.is_staff(array['super_admin']::public.staff_role[]));

create policy audit_select on public.audit_logs for select using (public.is_staff());

create policy settings_select on public.app_settings for select using (true);
create policy settings_manage on public.app_settings for all
  using (public.is_staff(array['super_admin']::public.staff_role[]))
  with check (public.is_staff(array['super_admin']::public.staff_role[]));
