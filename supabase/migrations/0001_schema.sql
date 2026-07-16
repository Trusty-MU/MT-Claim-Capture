-- MT Proof Engine: core schema
-- Claims and Proof Points are first-class entities, not text inside documents.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('contributor', 'marketing', 'sales', 'leadership');
create type story_type as enum ('project_delivery', 'equipment_upgrade', 'testwork_study', 'plant_optimisation', 'service_partnership');
create type story_status as enum ('draft', 'submitted', 'processing', 'brief_ready', 'in_review', 'reviewed');
create type input_kind as enum ('voice', 'file', 'text');
create type claim_status as enum ('candidate', 'developing', 'proven', 'retired');
create type confidence_level as enum ('confirmed', 'reported', 'missing');
create type approval_status as enum ('public', 'needs_approval', 'internal_only');
create type review_status as enum ('pending', 'confirmed', 'rejected');
create type case_study_status as enum ('draft', 'in_review', 'client_approval', 'published');
create type spin_type as enum ('situation', 'problem', 'implication', 'need_payoff');
create type gap_status as enum ('open', 'chasing', 'resolved');
create type suggestion_status as enum ('suggested', 'approved', 'dismissed');

-- ---------------------------------------------------------------------------
-- Users (mirrors auth.users; role is assigned by the Marketing Owner)
-- ---------------------------------------------------------------------------
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text,
  role user_role not null default 'contributor',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role of the calling user; used throughout RLS policies.
create or replace function public.current_user_role()
returns user_role
language sql
security definer set search_path = public
stable
as $$
  select role from public.users where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Reference data (seeded, editable by the Marketing Owner)
-- ---------------------------------------------------------------------------
create table personas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table product_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text, -- secondary palette key, e.g. 'ocean'
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Stories: a raw captured win. One client, one narrative arc.
-- ---------------------------------------------------------------------------
create table stories (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid references users (id) on delete set null,
  client_name text,
  commodity text,
  location text,
  story_type story_type,
  status story_status not null default 'draft',
  scope_elements text[] not null default '{}',
  date_start text, -- fuzzy dates ("early 2023") come from voice; keep as text
  date_end text,
  current_status text,
  product_tags text[] not null default '{}',
  -- pipeline progress, shown to the Marketing Owner
  pipeline_stage text,
  pipeline_error text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Everything the contributor gave us: voice notes, files, typed text.
create table story_inputs (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories (id) on delete cascade,
  kind input_kind not null,
  storage_path text,
  file_name text,
  mime_type text,
  transcript_or_text text,
  transcription_status text, -- pending | done | failed | skipped (voice/audio only)
  question_number int, -- which capture question this answers, null for file drops
  created_at timestamptz not null default now()
);

-- Stage 1 output: the structured intake brief.
create table briefs (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories (id) on delete cascade,
  snapshot_json jsonb,
  challenge_draft text,
  approach_draft text,
  pullquote_suggestion text,
  raw_json jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Claims: statements of value MT wants to make in the market.
-- ---------------------------------------------------------------------------
create table claims (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status claim_status not null default 'candidate',
  -- stress-test notes
  so_what text,
  we_do_that_too text,
  prove_it text,
  personas text[] not null default '{}',
  product_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Proof points: single verifiable pieces of evidence extracted from stories.
create table proof_points (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories (id) on delete cascade,
  metric text not null,
  value text, -- '[XX]' when missing
  unit text,
  source_input_id uuid references story_inputs (id) on delete set null,
  source_note text, -- human-readable pointer into the source
  confidence confidence_level not null default 'reported',
  approval approval_status not null default 'needs_approval',
  review review_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create table claim_proof_points (
  claim_id uuid not null references claims (id) on delete cascade,
  proof_point_id uuid not null references proof_points (id) on delete cascade,
  primary key (claim_id, proof_point_id)
);

-- ---------------------------------------------------------------------------
-- Case studies, quotes, gaps
-- ---------------------------------------------------------------------------
create table case_studies (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories (id) on delete cascade,
  status case_study_status not null default 'draft',
  title text,
  meta_strip text, -- client / commodity / location / dates line
  pullquote text,
  challenge text,
  approach text,
  featured_proof_point_ids uuid[] not null default '{}',
  featured_claim_ids uuid[] not null default '{}',
  cta_text text,
  published_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table client_quotes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories (id) on delete cascade,
  quote_text text not null,
  speaker text,
  context text,
  approval approval_status not null default 'needs_approval',
  created_at timestamptz not null default now()
);

-- Missing numbers and unanswered questions, with a person to chase.
create table gaps (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories (id) on delete cascade,
  description text not null,
  owner_name text, -- "don't know, ask [name]"
  status gap_status not null default 'open',
  resolved_note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sales enablement and downstream content
-- ---------------------------------------------------------------------------
create table spin_questions (
  id uuid primary key default gen_random_uuid(),
  type spin_type not null,
  text text not null,
  claim_id uuid references claims (id) on delete cascade,
  story_id uuid references stories (id) on delete set null,
  story_type story_type,
  personas text[] not null default '{}',
  product_tags text[] not null default '{}',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table social_posts (
  id uuid primary key default gen_random_uuid(),
  case_study_id uuid not null references case_studies (id) on delete cascade,
  target_role text not null, -- leadership | engineer | bd_sales | site_tech
  draft_text text not null,
  sources_note text, -- which proof points / quotes were used, for approval checks
  status suggestion_status not null default 'suggested',
  created_at timestamptz not null default now()
);

create table value_props (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  personas text[] not null default '{}',
  product_tags text[] not null default '{}',
  claim_ids uuid[] not null default '{}',
  status suggestion_status not null default 'suggested',
  created_at timestamptz not null default now()
);

-- Sales "capture this" requests
create table capture_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references users (id) on delete set null,
  description text not null,
  suggested_contributor text,
  status text not null default 'open', -- open | captured | dismissed
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stories_touch before update on stories for each row execute function touch_updated_at();
create trigger claims_touch before update on claims for each row execute function touch_updated_at();
create trigger case_studies_touch before update on case_studies for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Roles: contributor (own stories + published case studies), marketing (full),
-- sales (read library, raise capture requests), leadership (read dashboards).
-- The AI pipeline runs server-side with the service role and bypasses RLS.
-- ---------------------------------------------------------------------------
alter table users enable row level security;
alter table personas enable row level security;
alter table product_tags enable row level security;
alter table stories enable row level security;
alter table story_inputs enable row level security;
alter table briefs enable row level security;
alter table claims enable row level security;
alter table proof_points enable row level security;
alter table claim_proof_points enable row level security;
alter table case_studies enable row level security;
alter table client_quotes enable row level security;
alter table gaps enable row level security;
alter table spin_questions enable row level security;
alter table social_posts enable row level security;
alter table value_props enable row level security;
alter table capture_requests enable row level security;

-- users
create policy users_select_own on users for select using (id = auth.uid() or current_user_role() = 'marketing');
create policy users_update_marketing on users for update using (current_user_role() = 'marketing');

-- reference data: everyone reads, marketing writes
create policy personas_read on personas for select using (auth.uid() is not null);
create policy personas_write on personas for all using (current_user_role() = 'marketing');
create policy product_tags_read on product_tags for select using (auth.uid() is not null);
create policy product_tags_write on product_tags for all using (current_user_role() = 'marketing');

-- stories: contributors own theirs; marketing/sales/leadership see all
create policy stories_insert on stories for insert with check (contributor_id = auth.uid());
create policy stories_select on stories for select
  using (contributor_id = auth.uid() or current_user_role() in ('marketing', 'sales', 'leadership'));
create policy stories_update on stories for update
  using (
    (contributor_id = auth.uid() and status in ('draft', 'brief_ready'))
    or current_user_role() = 'marketing'
  );

create policy story_inputs_insert on story_inputs for insert
  with check (exists (select 1 from stories s where s.id = story_id and s.contributor_id = auth.uid()));
create policy story_inputs_select on story_inputs for select
  using (
    exists (select 1 from stories s where s.id = story_id and s.contributor_id = auth.uid())
    or current_user_role() in ('marketing', 'sales', 'leadership')
  );

-- briefs: the contributor sees their own brief (result screen); library roles see all
create policy briefs_select on briefs for select
  using (
    exists (select 1 from stories s where s.id = story_id and s.contributor_id = auth.uid())
    or current_user_role() in ('marketing', 'sales', 'leadership')
  );
create policy briefs_write on briefs for all using (current_user_role() = 'marketing');

-- claims library: all signed-in users can read; marketing manages
create policy claims_read on claims for select using (auth.uid() is not null);
create policy claims_write on claims for all using (current_user_role() = 'marketing');

create policy proof_points_select on proof_points for select
  using (
    exists (select 1 from stories s where s.id = story_id and s.contributor_id = auth.uid())
    or current_user_role() in ('marketing', 'sales', 'leadership')
  );
create policy proof_points_write on proof_points for all using (current_user_role() = 'marketing');

create policy cpp_read on claim_proof_points for select using (auth.uid() is not null);
create policy cpp_write on claim_proof_points for all using (current_user_role() = 'marketing');

-- case studies: published are visible to everyone signed in; drafts to marketing
-- and the contributor who told the story
create policy case_studies_select on case_studies for select
  using (
    status = 'published'
    or current_user_role() in ('marketing', 'leadership')
    or exists (select 1 from stories s where s.id = story_id and s.contributor_id = auth.uid())
  );
create policy case_studies_write on case_studies for all using (current_user_role() = 'marketing');

create policy client_quotes_select on client_quotes for select
  using (
    exists (select 1 from stories s where s.id = story_id and s.contributor_id = auth.uid())
    or current_user_role() in ('marketing', 'sales', 'leadership')
  );
create policy client_quotes_write on client_quotes for all using (current_user_role() = 'marketing');

create policy gaps_select on gaps for select
  using (current_user_role() in ('marketing', 'leadership'));
create policy gaps_write on gaps for all using (current_user_role() = 'marketing');

-- SPIN questions: sales sees approved only; marketing sees and manages all
create policy spin_select on spin_questions for select
  using (
    (approved and current_user_role() in ('sales', 'leadership'))
    or current_user_role() = 'marketing'
  );
create policy spin_write on spin_questions for all using (current_user_role() = 'marketing');

create policy social_select on social_posts for select
  using (current_user_role() in ('marketing', 'leadership'));
create policy social_write on social_posts for all using (current_user_role() = 'marketing');

create policy value_props_select on value_props for select
  using (current_user_role() in ('marketing', 'sales', 'leadership'));
create policy value_props_write on value_props for all using (current_user_role() = 'marketing');

create policy capture_requests_insert on capture_requests for insert
  with check (requested_by = auth.uid() and current_user_role() in ('sales', 'marketing', 'leadership'));
create policy capture_requests_select on capture_requests for select
  using (current_user_role() in ('sales', 'marketing', 'leadership'));
create policy capture_requests_update on capture_requests for update
  using (current_user_role() = 'marketing');

-- ---------------------------------------------------------------------------
-- Indexes for the hot paths
-- ---------------------------------------------------------------------------
create index stories_status_idx on stories (status);
create index stories_contributor_idx on stories (contributor_id);
create index story_inputs_story_idx on story_inputs (story_id);
create index proof_points_story_idx on proof_points (story_id);
create index briefs_story_idx on briefs (story_id);
create index spin_claim_idx on spin_questions (claim_id);
create index gaps_story_idx on gaps (story_id);
