-- ============================================================================
-- XplainESG — 0003_rls_policies
--
-- NOTE ON THE SERVICE ROLE KEY:
-- The FastAPI backend connects with the service-role key, which BYPASSES RLS.
-- These policies exist to protect direct frontend → Supabase access made with
-- the anon key + user JWT. They are defence in depth, not the only gate.
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.companies      enable row level security;
alter table public.esg_reports    enable row level security;
alter table public.esg_indicators enable row level security;
alter table public.esg_claims     enable row level security;
alter table public.analyses       enable row level security;
alter table public.explanations   enable row level security;
alter table public.human_reviews  enable row level security;
alter table public.audit_logs     enable row level security;

-- ------------------------------------------------------------- profiles -----
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.current_user_role() = 'admin')
  with check (id = auth.uid() or public.current_user_role() = 'admin');
  -- role changes on one's own row are blocked by trg_profiles_role_guard

-- ------------------------------------------------------------ companies -----
drop policy if exists companies_select_all on public.companies;
create policy companies_select_all on public.companies
  for select to authenticated using (true);

drop policy if exists companies_write_analyst_admin on public.companies;
create policy companies_write_analyst_admin on public.companies
  for insert to authenticated
  with check (public.current_user_role() in ('admin','analyst'));

drop policy if exists companies_update_analyst_admin on public.companies;
create policy companies_update_analyst_admin on public.companies
  for update to authenticated
  using (public.current_user_role() in ('admin','analyst'))
  with check (public.current_user_role() in ('admin','analyst'));

drop policy if exists companies_delete_admin on public.companies;
create policy companies_delete_admin on public.companies
  for delete to authenticated
  using (public.current_user_role() = 'admin');

-- ----------------------------------------------------------- esg_reports ----
drop policy if exists reports_select_all on public.esg_reports;
create policy reports_select_all on public.esg_reports
  for select to authenticated using (true);

drop policy if exists reports_write_analyst_admin on public.esg_reports;
create policy reports_write_analyst_admin on public.esg_reports
  for insert to authenticated
  with check (public.current_user_role() in ('admin','analyst'));

drop policy if exists reports_update_analyst_admin on public.esg_reports;
create policy reports_update_analyst_admin on public.esg_reports
  for update to authenticated
  using (public.current_user_role() in ('admin','analyst'))
  with check (public.current_user_role() in ('admin','analyst'));

-- -------------------------------------------------------- esg_indicators ---
drop policy if exists indicators_select_all on public.esg_indicators;
create policy indicators_select_all on public.esg_indicators
  for select to authenticated using (true);

drop policy if exists indicators_write_analyst_admin on public.esg_indicators;
create policy indicators_write_analyst_admin on public.esg_indicators
  for all to authenticated
  using (public.current_user_role() in ('admin','analyst'))
  with check (public.current_user_role() in ('admin','analyst'));

-- ------------------------------------------------------------ esg_claims ---
drop policy if exists claims_select_all on public.esg_claims;
create policy claims_select_all on public.esg_claims
  for select to authenticated using (true);
-- writes are performed by the backend (service role) only

-- -------------------------------------------------------------- analyses ---
drop policy if exists analyses_select_all on public.analyses;
create policy analyses_select_all on public.analyses
  for select to authenticated using (true);

-- ---------------------------------------------------------- explanations ---
drop policy if exists explanations_select_all on public.explanations;
create policy explanations_select_all on public.explanations
  for select to authenticated using (true);

-- --------------------------------------------------------- human_reviews ---
drop policy if exists reviews_select_all on public.human_reviews;
create policy reviews_select_all on public.human_reviews
  for select to authenticated using (true);

drop policy if exists reviews_insert_reviewer_admin on public.human_reviews;
create policy reviews_insert_reviewer_admin on public.human_reviews
  for insert to authenticated
  with check (
    public.current_user_role() in ('admin','reviewer')
    and reviewer_id = auth.uid()
  );

-- ------------------------------------------------------------ audit_logs ---
-- Readable by admin and reviewer only. Written exclusively by the backend.
drop policy if exists audit_select_admin_reviewer on public.audit_logs;
create policy audit_select_admin_reviewer on public.audit_logs
  for select to authenticated
  using (public.current_user_role() in ('admin','reviewer'));