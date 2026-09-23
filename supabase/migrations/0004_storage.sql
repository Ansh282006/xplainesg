-- ============================================================================
-- XplainESG — 0004_storage
-- Bucket for ESG report PDFs. Files are PRIVATE; the backend issues signed URLs.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'esg-reports',
  'esg-reports',
  false,
  52428800, -- 50 MB
  array[
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Storage object policies for the 'esg-reports' bucket.
-- Note: storage.objects already has RLS enabled by Supabase; we just add
-- bucket-specific policies.
-- ---------------------------------------------------------------------------

drop policy if exists "esg_reports_read" on storage.objects;
create policy "esg_reports_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'esg-reports');

drop policy if exists "esg_reports_insert" on storage.objects;
create policy "esg_reports_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'esg-reports'
    and public.current_user_role() in ('admin','analyst')
  );

drop policy if exists "esg_reports_update" on storage.objects;
create policy "esg_reports_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'esg-reports'
    and public.current_user_role() in ('admin','analyst')
  );

drop policy if exists "esg_reports_delete" on storage.objects;
create policy "esg_reports_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'esg-reports'
    and public.current_user_role() in ('admin','analyst')
  );