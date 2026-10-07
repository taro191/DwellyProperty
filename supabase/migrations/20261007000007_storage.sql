-- =============================================================================
-- Dwelly — 07 Storage buckets & policies
--   Path convention: {user_id}/... so the first folder identifies the uploader.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',           'avatars',           true,  2097152,  array['image/jpeg', 'image/png', 'image/webp']),
  ('property-media',    'property-media',    true,  10485760, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  ('verification-docs', 'verification-docs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('chat-attachments',  'chat-attachments',  false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- Public buckets: anyone reads; users write only inside their own folder.
create policy "public media read" on storage.objects for select
  using (bucket_id in ('avatars', 'property-media'));

create policy "own folder insert" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'property-media', 'verification-docs', 'chat-attachments')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_user()
  );

create policy "own folder update" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'property-media') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own folder delete" on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'property-media', 'verification-docs', 'chat-attachments')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Verification documents: uploader + verifier staff only.
create policy "verification docs read" on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.is_staff(array['verifier']::public.staff_role[]))
  );

-- Chat attachments: path {sender_id}/{conversation_id}/{file}; readable by conversation members.
create policy "chat attachments read" on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (
      public.is_conversation_member(((storage.foldername(name))[2])::uuid)
      or public.is_staff(array['support']::public.staff_role[])
    )
  );

-- Moderators can remove any listing media.
create policy "moderator media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'property-media' and public.is_staff(array['moderator']::public.staff_role[]));
