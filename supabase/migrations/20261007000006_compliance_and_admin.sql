-- =============================================================================
-- Dwelly — 06 Compliance (PDPA) & admin back-office RPCs, scheduled jobs
-- =============================================================================

create type public.consent_kind as enum ('terms', 'privacy', 'marketing');
create type public.deletion_status as enum ('pending', 'processing', 'completed', 'cancelled');

-- ---------------------------------------------------------------------------
-- PDPA: consent history + account deletion requests
-- ---------------------------------------------------------------------------
create table public.consents (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       public.consent_kind not null,
  version    text not null,
  granted    boolean not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id, kind, created_at desc);

create table public.account_deletion_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  reason       text,
  status       public.deletion_status not null default 'pending',
  processed_by uuid references public.profiles (id),
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);
create unique index deletion_one_open on public.account_deletion_requests (user_id)
  where status in ('pending', 'processing');

alter table public.consents                  enable row level security;
alter table public.account_deletion_requests enable row level security;

create policy consents_select on public.consents for select
  using (user_id = auth.uid() or public.is_staff(array['support']::public.staff_role[]));
create policy consents_insert on public.consents for insert with check (user_id = auth.uid());

create policy deletion_select on public.account_deletion_requests for select
  using (user_id = auth.uid() or public.is_staff(array['support']::public.staff_role[]));
create policy deletion_insert on public.account_deletion_requests for insert
  with check (user_id = auth.uid() and status = 'pending');
create policy deletion_cancel on public.account_deletion_requests for update
  using (user_id = auth.uid() and status = 'pending') with check (user_id = auth.uid() and status = 'cancelled');

-- Latest consent per kind for the caller.
create or replace function public.my_consents()
returns table (kind public.consent_kind, version text, granted boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct on (c.kind) c.kind, c.version, c.granted, c.created_at
  from public.consents c where c.user_id = auth.uid()
  order by c.kind, c.created_at desc, c.id desc;
$$;

-- PDPA data export (right of access): everything the platform holds about the caller.
create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'contact', (select to_jsonb(pp) from public.profile_private pp where pp.user_id = auth.uid()),
    'roles', (select coalesce(jsonb_agg(role), '[]') from public.user_roles where user_id = auth.uid()),
    'properties', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.properties x where x.owner_id = auth.uid()),
    'favorites', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.favorites x where x.user_id = auth.uid()),
    'inquiries', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.inquiries x where auth.uid() in (x.buyer_id, x.seller_id)),
    'appointments', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.appointments x where auth.uid() in (x.buyer_id, x.seller_id)),
    'offers', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.offers x where auth.uid() in (x.buyer_id, x.seller_id)),
    'messages_sent', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.messages x where x.sender_id = auth.uid()),
    'consents', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.consents x where x.user_id = auth.uid()),
    'orders', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.orders x where x.user_id = auth.uid())
  )
  where auth.uid() is not null;
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs (every decision is audited and the affected user notified)
-- ---------------------------------------------------------------------------
create or replace function public.require_staff(roles public.staff_role[])
returns void language plpgsql stable as $$
begin
  if not public.is_staff(roles) then
    raise exception 'Staff permission required' using errcode = 'insufficient_privilege';
  end if;
end $$;

create or replace function public.admin_review_listing(p_property_id uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  prop public.properties;
begin
  perform public.require_staff(array['moderator']::public.staff_role[]);
  select * into prop from public.properties where id = p_property_id for update;
  if prop.id is null then raise exception 'Listing not found'; end if;
  if prop.status <> 'pending_review' then
    raise exception 'Listing is not waiting for review (status: %)', prop.status;
  end if;
  if not p_approve and coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required when rejecting';
  end if;

  update public.properties
     set status = case when p_approve then 'active'::public.property_status else 'rejected'::public.property_status end,
         rejection_reason = case when p_approve then null else p_reason end,
         published_at = case when p_approve then coalesce(published_at, now()) else published_at end,
         expires_at = case when p_approve then now() + interval '90 days' else expires_at end
   where id = p_property_id;

  perform public.notify(prop.owner_id, 'listing',
    case when p_approve then 'ประกาศของคุณเผยแพร่แล้ว' else 'ประกาศของคุณไม่ผ่านการตรวจสอบ' end,
    case when p_approve then prop.title else p_reason end,
    '/dashboard/listings/' || prop.id, 'property', prop.id);
  perform public.log_audit(case when p_approve then 'LISTING_APPROVED' else 'LISTING_REJECTED' end,
    'properties', prop.id::text, prop.code || ' ' || prop.title, jsonb_build_object('reason', p_reason));
end $$;

-- Take down a live listing (e.g. after a report).
create or replace function public.admin_takedown_listing(p_property_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  prop public.properties;
begin
  perform public.require_staff(array['moderator']::public.staff_role[]);
  if coalesce(btrim(p_reason), '') = '' then raise exception 'A reason is required'; end if;
  update public.properties set status = 'rejected', rejection_reason = p_reason
   where id = p_property_id returning * into prop;
  if prop.id is null then raise exception 'Listing not found'; end if;
  perform public.notify(prop.owner_id, 'listing', 'ประกาศของคุณถูกระงับ', p_reason,
    '/dashboard/listings/' || prop.id, 'property', prop.id);
  perform public.log_audit('LISTING_TAKEDOWN', 'properties', prop.id::text, prop.code || ' ' || prop.title,
    jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.admin_feature_listing(p_property_id uuid, p_until timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_staff(array['moderator']::public.staff_role[]);
  update public.properties set featured_until = p_until where id = p_property_id;
  perform public.log_audit('LISTING_FEATURED', 'properties', p_property_id::text, null,
    jsonb_build_object('until', p_until));
end $$;

create or replace function public.admin_review_verification(
  p_request_id uuid, p_decision public.verification_status, p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  req public.verification_requests;
begin
  perform public.require_staff(array['verifier']::public.staff_role[]);
  if p_decision not in ('approved', 'rejected', 'needs_info') then
    raise exception 'Invalid decision';
  end if;
  if p_decision <> 'approved' and coalesce(btrim(p_note), '') = '' then
    raise exception 'A note is required for this decision';
  end if;
  select * into req from public.verification_requests where id = p_request_id for update;
  if req.id is null then raise exception 'Request not found'; end if;
  if req.status not in ('pending', 'needs_info') then raise exception 'Request already decided'; end if;

  update public.verification_requests
     set status = p_decision, reviewer_id = auth.uid(), reviewer_note = p_note, reviewed_at = now()
   where id = req.id;

  if p_decision = 'approved' then
    case req.kind
      when 'identity' then
        update public.profiles set is_kyc_verified = true, kyc_verified_at = now() where id = req.user_id;
      when 'agent_license' then
        update public.agent_profiles set license_verified = true,
               license_no = coalesce(req.submitted_data ->> 'license_no', license_no)
         where user_id = req.user_id;
      when 'property_ownership' then
        update public.properties set is_verified = true, verified_at = now() where id = req.property_id;
      else null;
    end case;
  end if;

  perform public.notify(req.user_id, 'verification',
    case p_decision when 'approved' then 'ยืนยันข้อมูลสำเร็จ'
                    when 'rejected' then 'การยืนยันข้อมูลไม่ผ่าน'
                    else 'กรุณาส่งข้อมูลเพิ่มเติม' end,
    p_note, '/me/verification', 'verification_request', req.id);
  perform public.log_audit('VERIFICATION_' || upper(p_decision::text), 'verification_requests', req.id::text,
    req.kind::text, jsonb_build_object('note', p_note, 'user_id', req.user_id, 'property_id', req.property_id));
end $$;

create or replace function public.admin_set_user_status(p_user_id uuid, p_status public.account_status, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_staff(array['support']::public.staff_role[]);
  if p_user_id = auth.uid() then raise exception 'You cannot change your own status'; end if;
  if p_status <> 'active' and coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required';
  end if;
  if exists (select 1 from public.staff_members where user_id = p_user_id and active)
     and not public.is_staff(array['super_admin']::public.staff_role[]) then
    raise exception 'Only a super admin can change a staff account';
  end if;
  update public.profiles set status = p_status, status_reason = p_reason where id = p_user_id;
  -- Hide a banned user's live listings.
  if p_status = 'banned' then
    update public.properties set status = 'archived'
     where owner_id = p_user_id and status in ('active', 'reserved', 'pending_review');
  end if;
  perform public.log_audit('USER_STATUS_' || upper(p_status::text), 'profiles', p_user_id::text, p_reason);
end $$;

create or replace function public.admin_resolve_report(p_report_id uuid, p_status public.report_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  rep public.reports;
begin
  perform public.require_staff(array['moderator', 'support']::public.staff_role[]);
  update public.reports
     set status = p_status, handled_by = auth.uid(), resolution_note = p_note,
         resolved_at = case when p_status in ('resolved', 'dismissed') then now() end
   where id = p_report_id returning * into rep;
  if rep.id is null then raise exception 'Report not found'; end if;
  if p_status in ('resolved', 'dismissed') then
    perform public.notify(rep.reporter_id, 'report', 'เราได้ตรวจสอบรายงานของคุณแล้ว', p_note, null, 'report', rep.id);
  end if;
  perform public.log_audit('REPORT_' || upper(p_status::text), 'reports', rep.id::text, p_note,
    jsonb_build_object('target_type', rep.target_type, 'target_id', rep.target_id));
end $$;

create or replace function public.admin_review_pod(p_pod_id uuid, p_status public.pod_status, p_trust_score smallint default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  pod public.agency_pods;
begin
  perform public.require_staff(array['verifier']::public.staff_role[]);
  update public.agency_pods
     set status = p_status, trust_score = coalesce(p_trust_score, trust_score)
   where id = p_pod_id returning * into pod;
  if pod.id is null then raise exception 'Pod not found'; end if;
  perform public.notify(pod.leader_id, 'pod',
    case p_status when 'verified' then 'Pod ของคุณได้รับการยืนยันแล้ว' else 'สถานะ Pod มีการเปลี่ยนแปลง' end,
    p_note, '/dashboard/pod', 'pod', pod.id);
  perform public.log_audit('POD_' || upper(p_status::text), 'agency_pods', pod.id::text, p_note);
end $$;

create or replace function public.admin_set_staff(p_user_id uuid, p_role public.staff_role, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_staff(array['super_admin']::public.staff_role[]);
  if p_user_id = auth.uid() and not p_active then raise exception 'You cannot deactivate yourself'; end if;
  insert into public.staff_members (user_id, role, active, created_by)
  values (p_user_id, p_role, p_active, auth.uid())
  on conflict (user_id) do update set role = excluded.role, active = excluded.active;
  perform public.log_audit('STAFF_SET', 'staff_members', p_user_id::text, p_role::text,
    jsonb_build_object('active', p_active));
end $$;

create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_staff(null);
  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles where status <> 'deleted'),
    'users_new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'listings_active', (select count(*) from public.properties where status = 'active'),
    'listings_pending', (select count(*) from public.properties where status = 'pending_review'),
    'verifications_pending', (select count(*) from public.verification_requests where status = 'pending'),
    'reports_open', (select count(*) from public.reports where status in ('open', 'investigating')),
    'inquiries_7d', (select count(*) from public.inquiries where created_at > now() - interval '7 days'),
    'appointments_7d', (select count(*) from public.appointments where created_at > now() - interval '7 days'),
    'offers_7d', (select count(*) from public.offers where created_at > now() - interval '7 days'),
    'revenue_30d', (select coalesce(sum(amount_thb), 0) from public.orders where status = 'paid' and paid_at > now() - interval '30 days'),
    'deletion_requests_open', (select count(*) from public.account_deletion_requests where status = 'pending'),
    'listings_by_category', (
      select coalesce(jsonb_object_agg(category, n), '{}')
      from (select category, count(*) n from public.properties where status = 'active' group by category) s),
    'signups_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d), '[]')
      from (select date_trunc('day', created_at at time zone 'Asia/Bangkok')::date d, count(*) n
            from public.profiles where created_at > now() - interval '30 days' group by 1) s)
  );
end $$;

-- ---------------------------------------------------------------------------
-- Scheduled jobs (run hourly via pg_cron or a Supabase scheduled Edge Function)
-- ---------------------------------------------------------------------------
create or replace function public.run_maintenance()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  expired_listings int;
  expired_offers int;
  warned int;
begin
  -- Warn owners 3 days before a listing expires (once).
  with soon as (
    select p.id, p.owner_id, p.title from public.properties p
    where p.status = 'active' and p.expires_at between now() and now() + interval '3 days'
      and not exists (select 1 from public.notifications n
                      where n.entity_id = p.id and n.type = 'listing_expiring')
  )
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  select owner_id, 'listing_expiring', 'ประกาศใกล้หมดอายุ', title, '/dashboard/listings/' || id, 'property', id from soon;
  get diagnostics warned = row_count;

  with x as (
    update public.properties set status = 'expired'
    where status = 'active' and expires_at < now()
    returning id, owner_id, title
  ), n as (
    insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
    select owner_id, 'listing', 'ประกาศหมดอายุแล้ว', title, '/dashboard/listings/' || id, 'property', id from x
    returning 1
  )
  select count(*) into expired_listings from n;

  update public.offers set status = 'expired', updated_at = now()
  where status in ('pending', 'countered') and valid_until < now();
  get diagnostics expired_offers = row_count;

  update public.subscriptions set status = 'expired'
  where status in ('active', 'past_due') and current_period_end < now() - interval '3 days';

  update public.hubs set status = 'live' where status = 'scheduled' and starts_at <= now() and ends_at > now();
  update public.hubs set status = 'ended' where status in ('scheduled', 'live') and ends_at <= now();

  return jsonb_build_object('expired_listings', expired_listings, 'expired_offers', expired_offers, 'expiry_warnings', warned);
end $$;
revoke execute on function public.run_maintenance() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('dwelly-maintenance', '7 * * * *', 'select public.run_maintenance()');
  end if;
end $$;
