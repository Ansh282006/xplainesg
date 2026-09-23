-- ============================================================================
-- XplainESG — 0001_init_schema
-- Core enums and tables. No policies here (see 0003).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums -----
do $$ begin
  create type public.user_role as enum ('admin','analyst','reviewer','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.processing_status as enum ('uploaded','processing','processed','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.risk_level as enum ('LOW','MEDIUM','HIGH');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.analysis_status as enum ('pending','processing','completed','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.claim_category as enum ('environmental','social','governance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.claim_type as enum (
    'emission_reduction','renewable_energy','waste_reduction','employee_welfare',
    'diversity','governance','sustainability_commitment','net_zero',
    'carbon_neutrality','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.explanation_kind as enum ('SHAP','LIME');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.review_decision as enum ('accepted','rejected','needs_review');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------- updated_at util -----
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------- profiles -----
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text,
  role          public.user_role not null default 'viewer',
  organization  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row on signup (role defaults to 'viewer').
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, organization)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'organization'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------ companies -----
create table if not exists public.companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  ticker       text,
  country      text,
  sector       text,
  industry     text,
  description  text,
  website      text,
  is_demo      boolean not null default false,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_companies_sector  on public.companies (sector);
create index if not exists idx_companies_country on public.companies (country);
create index if not exists idx_companies_name    on public.companies (lower(name));

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------- esg_reports ----
create table if not exists public.esg_reports (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  report_title       text not null,
  report_year        int  not null check (report_year between 1990 and 2100),
  report_type        text,
  file_path          text,
  file_url           text,
  file_size_bytes    bigint,
  mime_type          text,
  checksum_sha256    text,
  processing_status  public.processing_status not null default 'uploaded',
  processing_error   text,
  uploaded_by        uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_reports_company on public.esg_reports (company_id);
create index if not exists idx_reports_status  on public.esg_reports (processing_status);
create index if not exists idx_reports_year    on public.esg_reports (report_year);

drop trigger if exists trg_reports_updated_at on public.esg_reports;
create trigger trg_reports_updated_at
  before update on public.esg_reports
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------- esg_indicators ---
create table if not exists public.esg_indicators (
  id                          uuid primary key default gen_random_uuid(),
  company_id                  uuid not null references public.companies(id) on delete cascade,
  report_id                   uuid references public.esg_reports(id) on delete set null,
  year                        int  not null check (year between 1990 and 2100),

  carbon_emissions            numeric,
  emissions_intensity         numeric,
  energy_consumption          numeric,
  renewable_energy_percentage numeric check (renewable_energy_percentage is null
                                            or renewable_energy_percentage between 0 and 100),
  water_consumption           numeric,
  waste_generated             numeric,
  waste_recycled              numeric,

  employee_count              integer,
  employee_turnover           numeric,
  workplace_incidents         integer,
  diversity_percentage        numeric check (diversity_percentage is null
                                              or diversity_percentage between 0 and 100),
  training_hours              numeric,
  community_investment        numeric,

  board_independence          numeric check (board_independence is null
                                              or board_independence between 0 and 100),
  board_diversity             numeric check (board_diversity is null
                                              or board_diversity between 0 and 100),
  corruption_incidents        integer,
  compliance_incidents        integer,
  governance_score            numeric check (governance_score is null
                                              or governance_score between 0 and 100),

  source                      text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists idx_indicators_company_year on public.esg_indicators (company_id, year);
create index if not exists idx_indicators_report       on public.esg_indicators (report_id);

drop trigger if exists trg_indicators_updated_at on public.esg_indicators;
create trigger trg_indicators_updated_at
  before update on public.esg_indicators
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------- esg_claims ---
create table if not exists public.esg_claims (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  report_id           uuid not null references public.esg_reports(id) on delete cascade,
  page_number         int,
  sentence            text not null,
  claim_type          public.claim_type     not null default 'other',
  category            public.claim_category,
  sentiment           numeric check (sentiment is null or sentiment between -1 and 1),
  claim_strength      numeric check (claim_strength is null or claim_strength between 0 and 1),
  evidence_available  boolean,
  divergence_score    numeric,
  extracted_features  jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists idx_claims_company  on public.esg_claims (company_id);
create index if not exists idx_claims_report   on public.esg_claims (report_id);
create index if not exists idx_claims_category on public.esg_claims (category);

-- -------------------------------------------------------------- analyses ----
create table if not exists public.analyses (
  id                        uuid primary key default gen_random_uuid(),
  company_id                uuid not null references public.companies(id) on delete cascade,
  report_id                 uuid references public.esg_reports(id) on delete set null,
  model_version             text,

  esg_performance_score     numeric check (esg_performance_score is null
                                           or esg_performance_score between 0 and 100),
  esg_trust_score           numeric check (esg_trust_score is null
                                           or esg_trust_score between 0 and 100),
  environmental_score       numeric check (environmental_score is null
                                           or environmental_score between 0 and 100),
  social_score              numeric check (social_score is null
                                           or social_score between 0 and 100),
  governance_score          numeric check (governance_score is null
                                           or governance_score between 0 and 100),
  claim_credibility_score   numeric check (claim_credibility_score is null
                                           or claim_credibility_score between 0 and 100),

  greenwashing_risk         public.risk_level,
  greenwashing_probability  numeric check (greenwashing_probability is null
                                           or greenwashing_probability between 0 and 1),
  confidence_score          numeric check (confidence_score is null
                                           or confidence_score between 0 and 1),

  status                    public.analysis_status not null default 'pending',
  is_demo                   boolean not null default false,
  missing_data              jsonb,
  feature_vector            jsonb,
  created_by                uuid references public.profiles(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_analyses_company on public.analyses (company_id);
create index if not exists idx_analyses_report  on public.analyses (report_id);
create index if not exists idx_analyses_risk    on public.analyses (greenwashing_risk);
create index if not exists idx_analyses_created on public.analyses (created_at desc);

drop trigger if exists trg_analyses_updated_at on public.analyses;
create trigger trg_analyses_updated_at
  before update on public.analyses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------- explanations ----
create table if not exists public.explanations (
  id               uuid primary key default gen_random_uuid(),
  analysis_id      uuid not null references public.analyses(id) on delete cascade,
  explanation_type public.explanation_kind not null,
  feature_name     text not null,
  feature_value    numeric,
  contribution     numeric not null,
  direction        text check (direction in ('positive','negative','neutral')),
  explanation_text text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_explanations_analysis on public.explanations (analysis_id, explanation_type);

-- --------------------------------------------------------- human_reviews ----
create table if not exists public.human_reviews (
  id                 uuid primary key default gen_random_uuid(),
  analysis_id        uuid not null references public.analyses(id) on delete cascade,
  reviewer_id        uuid not null references public.profiles(id) on delete restrict,
  reviewer_decision  public.review_decision not null,
  reviewer_comments  text,
  reviewed_at        timestamptz not null default now()
);

create index if not exists idx_reviews_analysis on public.human_reviews (analysis_id);

-- ------------------------------------------------------------ audit_logs ----
create table if not exists public.audit_logs (
  id             bigserial primary key,
  user_id        uuid references public.profiles(id) on delete set null,
  action         text not null,
  entity_type    text,
  entity_id      uuid,
  previous_value jsonb,
  new_value      jsonb,
  metadata       jsonb,
  timestamp      timestamptz not null default now()
);

create index if not exists idx_audit_user      on public.audit_logs (user_id);
create index if not exists idx_audit_entity    on public.audit_logs (entity_type, entity_id);
create index if not exists idx_audit_timestamp on public.audit_logs (timestamp desc);