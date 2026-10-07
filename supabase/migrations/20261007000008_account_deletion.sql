-- =============================================================================
-- Dwelly — 08 PDPA account deletion processing
--   Anonymises the profile and removes personal data that is not legally
--   required. Deleting the auth.users row (login) is done afterwards by the
--   server with the service-role key.
-- =============================================================================

create or replace function public.admin_process_deletion(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  req public.account_deletion_requests;
begin
  perform public.require_staff(array['support']::public.staff_role[]);
  select * into req from public.account_deletion_requests where id = p_request_id for update;
  if req.id is null then raise exception 'Request not found'; end if;
  if req.status not in ('pending', 'processing') then raise exception 'Request already handled'; end if;
  if exists (select 1 from public.staff_members where user_id = req.user_id and active) then
    raise exception 'Deactivate the staff account first';
  end if;

  update public.profiles
     set display_name = 'ผู้ใช้ที่ลบบัญชีแล้ว', avatar_url = null, bio = null,
         status = 'deleted', status_reason = 'PDPA deletion request'
   where id = req.user_id;
  update public.profile_private set email = null, phone = null, line_id = null, phone_verified = false
   where user_id = req.user_id;
  update public.properties set status = 'archived'
   where owner_id = req.user_id and status not in ('sold', 'rented', 'archived');
  update public.properties set agent_id = null where agent_id = req.user_id;
  delete from public.favorites where user_id = req.user_id;
  delete from public.saved_searches where user_id = req.user_id;
  delete from public.notifications where user_id = req.user_id;
  delete from public.agent_profiles where user_id = req.user_id;
  update public.inquiries set contact_phone = null, message = null where buyer_id = req.user_id;
  update public.messages set body = '[ข้อความถูกลบตามคำขอของผู้ใช้]', attachment_path = null where sender_id = req.user_id;
  update public.verification_requests set submitted_data = '{}' where user_id = req.user_id;
  -- verification_documents rows are kept until files are purged from storage by the server action.

  update public.account_deletion_requests
     set status = 'completed', processed_by = auth.uid(), processed_at = now()
   where id = req.id;
  perform public.log_audit('ACCOUNT_DELETED', 'profiles', req.user_id::text, 'PDPA deletion processed');
  return req.user_id;
end $$;

-- ---------------------------------------------------------------------------
-- Co-Agent access decisions: audit + tell the agent
-- ---------------------------------------------------------------------------
create or replace function public.commission_access_after_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, summary, data)
    values (auth.uid(), 'COMMISSION_ACCESS_' || upper(new.status::text), 'commission_access_requests', new.id::text, null,
            jsonb_build_object('agent_id', new.agent_id, 'property_id', new.property_id));
    if new.status in ('approved', 'rejected', 'revoked') and auth.uid() is distinct from new.agent_id then
      perform public.notify(new.agent_id, 'commission',
        case new.status when 'approved' then 'ได้รับสิทธิ์ Co-Agent แล้ว'
                        when 'rejected' then 'คำขอสิทธิ์ Co-Agent ไม่ผ่าน'
                        else 'สิทธิ์ Co-Agent ถูกยกเลิก' end,
        null, '/dashboard/agent', 'commission_access', new.id);
    end if;
  end if;
  return null;
end $$;
create trigger commission_access_after_update after update on public.commission_access_requests
  for each row execute function public.commission_access_after_update();
