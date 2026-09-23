-- ============================================================================
-- XplainESG — 0002_functions_views
-- ============================================================================

-- Current caller's role, read from profiles.
-- SECURITY DEFINER so it can read profiles even when RLS on profiles would
-- otherwise block the caller. It only returns the caller's own role.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Guard: prevent non-admins from escalating their own role via a profile UPDATE.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if public.current_user_role() is distinct from 'admin' then
      raise exception 'Only administrators may change user roles'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_role_guard on public.profiles;
create trigger trg_profiles_role_guard
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ---------------------------------------------------------------------------
-- company_overview: company row + its most recent analysis.
-- security_invoker => underlying table RLS still applies.
-- ---------------------------------------------------------------------------
create or replace view public.company_overview
with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.ticker,
  c.country,
  c.sector,
  c.industry,
  c.description,
  c.website,
  c.is_demo,
  c.created_at,
  c.updated_at,
  a.id                  as latest_analysis_id,
  a.esg_trust_score,
  a.esg_performance_score,
  a.greenwashing_risk,
  a.confidence_score,
  a.status              as analysis_status,
  a.created_at          as last_analyzed_at
from public.companies c
left join lateral (
  select a2.*
  from public.analyses a2
  where a2.company_id = c.id
  order by a2.created_at desc
  limit 1
) a on true;

-- ---------------------------------------------------------------------------
-- get_dashboard_stats(): single round-trip aggregate for the dashboard.
-- SECURITY DEFINER so it can aggregate across tables without requiring broad
-- SELECT policies; still requires an authenticated caller.
-- ---------------------------------------------------------------------------
create or replace function public.get_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select jsonb_build_object(
    'total_companies',  (select count(*) from public.companies),
    'total_reports',    (select count(*) from public.esg_reports),
    'total_analyses',   (select count(*) from public.analyses),
    'total_claims',     (select count(*) from public.esg_claims),
    'pending_reviews',  (
      select count(*)
      from public.analyses a
      where a.status = 'completed'
        and not exists (select 1 from public.human_reviews r where r.analysis_id = a.id)
    ),
    'avg_trust_score', (
      select round(avg(esg_trust_score)::numeric, 2)
      from public.analyses where esg_trust_score is not null
    ),
    'avg_performance_score', (
      select round(avg(esg_performance_score)::numeric, 2)
      from public.analyses where esg_performance_score is not null
    ),
    'risk_distribution', (
      select coalesce(
        jsonb_object_agg(risk_label, cnt),
        jsonb_build_object('LOW', 0, 'MEDIUM', 0, 'HIGH', 0)
      )
      from (
        select greenwashing_risk::text as risk_label, count(*) as cnt
        from public.analyses
        where greenwashing_risk is not null
        group by greenwashing_risk
      ) r
    ),
    'sector_distribution', (
      select coalesce(
        jsonb_agg(jsonb_build_object('sector', sector, 'count', cnt) order by cnt desc),
        '[]'::jsonb
      )
      from (
        select coalesce(sector, 'Unspecified') as sector, count(*) as cnt
        from public.companies
        group by 1
      ) s
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_dashboard_stats() from public;
grant execute on function public.get_dashboard_stats() to authenticated;