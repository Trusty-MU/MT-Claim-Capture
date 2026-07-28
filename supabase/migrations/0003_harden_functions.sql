-- Hardening pass on the helper functions, per the Supabase database linter.
--
-- 1. touch_updated_at had a mutable search_path.
-- 2. handle_new_user and current_user_role are SECURITY DEFINER functions that
--    sat in the `public` schema, so PostgREST exposed them at /rest/v1/rpc/.
--    handle_new_user is a trigger function that nothing should call directly.
--    current_user_role is only ever called from RLS policy expressions, so it
--    moves to a `private` schema (not in the exposed API schema list) while
--    keeping EXECUTE for the roles that evaluate policies.

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Pin the search_path on the updated_at trigger function
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Trigger function: nothing calls it directly, so take away EXECUTE.
--    Triggers check EXECUTE at creation time, not at fire time, so the
--    on_auth_user_created trigger keeps working.
-- ---------------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Move the RLS helper out of the API-exposed schema
-- ---------------------------------------------------------------------------
create or replace function private.current_user_role()
returns user_role
language sql
security definer set search_path = public
stable
as $$
  select role from public.users where id = auth.uid();
$$;

revoke execute on function private.current_user_role() from public;
grant execute on function private.current_user_role() to anon, authenticated, service_role;

-- Recreate every policy that referenced the old public.current_user_role().
drop policy if exists users_select_own on users;
drop policy if exists users_update_marketing on users;
create policy users_select_own on users for select using (id = auth.uid() or private.current_user_role() = 'marketing');
create policy users_update_marketing on users for update using (private.current_user_role() = 'marketing');

drop policy if exists personas_write on personas;
drop policy if exists product_tags_write on product_tags;
create policy personas_write on personas for all using (private.current_user_role() = 'marketing');
create policy product_tags_write on product_tags for all using (private.current_user_role() = 'marketing');

drop policy if exists stories_select on stories;
drop policy if exists stories_update on stories;
create policy stories_select on stories for select
  using (contributor_id = auth.uid() or private.current_user_role() in ('marketing', 'sales', 'leadership'));
create policy stories_update on stories for update
  using (
    (contributor_id = auth.uid() and status in ('draft', 'brief_ready'))
    or private.current_user_role() = 'marketing'
  );

drop policy if exists story_inputs_select on story_inputs;
create policy story_inputs_select on story_inputs for select
  using (
    exists (select 1 from stories s where s.id = story_id and s.contributor_id = auth.uid())
    or private.current_user_role() in ('marketing', 'sales', 'leadership')
  );

drop policy if exists briefs_select on briefs;
drop policy if exists briefs_write on briefs;
create policy briefs_select on briefs for select
  using (
    exists (select 1 from stories s where s.id = story_id and s.contributor_id = auth.uid())
    or private.current_user_role() in ('marketing', 'sales', 'leadership')
  );
create policy briefs_write on briefs for all using (private.current_user_role() = 'marketing');

drop policy if exists claims_write on claims;
create policy claims_write on claims for all using (private.current_user_role() = 'marketing');

drop policy if exists proof_points_select on proof_points;
drop policy if exists proof_points_write on proof_points;
create policy proof_points_select on proof_points for select
  using (
    exists (select 1 from stories s where s.id = story_id and s.contributor_id = auth.uid())
    or private.current_user_role() in ('marketing', 'sales', 'leadership')
  );
create policy proof_points_write on proof_points for all using (private.current_user_role() = 'marketing');

drop policy if exists cpp_write on claim_proof_points;
create policy cpp_write on claim_proof_points for all using (private.current_user_role() = 'marketing');

drop policy if exists case_studies_select on case_studies;
drop policy if exists case_studies_write on case_studies;
create policy case_studies_select on case_studies for select
  using (
    status = 'published'
    or private.current_user_role() in ('marketing', 'leadership')
    or exists (select 1 from stories s where s.id = story_id and s.contributor_id = auth.uid())
  );
create policy case_studies_write on case_studies for all using (private.current_user_role() = 'marketing');

drop policy if exists client_quotes_select on client_quotes;
drop policy if exists client_quotes_write on client_quotes;
create policy client_quotes_select on client_quotes for select
  using (
    exists (select 1 from stories s where s.id = story_id and s.contributor_id = auth.uid())
    or private.current_user_role() in ('marketing', 'sales', 'leadership')
  );
create policy client_quotes_write on client_quotes for all using (private.current_user_role() = 'marketing');

drop policy if exists gaps_select on gaps;
drop policy if exists gaps_write on gaps;
create policy gaps_select on gaps for select
  using (private.current_user_role() in ('marketing', 'leadership'));
create policy gaps_write on gaps for all using (private.current_user_role() = 'marketing');

drop policy if exists spin_select on spin_questions;
drop policy if exists spin_write on spin_questions;
create policy spin_select on spin_questions for select
  using (
    (approved and private.current_user_role() in ('sales', 'leadership'))
    or private.current_user_role() = 'marketing'
  );
create policy spin_write on spin_questions for all using (private.current_user_role() = 'marketing');

drop policy if exists social_select on social_posts;
drop policy if exists social_write on social_posts;
create policy social_select on social_posts for select
  using (private.current_user_role() in ('marketing', 'leadership'));
create policy social_write on social_posts for all using (private.current_user_role() = 'marketing');

drop policy if exists value_props_select on value_props;
drop policy if exists value_props_write on value_props;
create policy value_props_select on value_props for select
  using (private.current_user_role() in ('marketing', 'sales', 'leadership'));
create policy value_props_write on value_props for all using (private.current_user_role() = 'marketing');

drop policy if exists capture_requests_insert on capture_requests;
drop policy if exists capture_requests_select on capture_requests;
drop policy if exists capture_requests_update on capture_requests;
create policy capture_requests_insert on capture_requests for insert
  with check (requested_by = auth.uid() and private.current_user_role() in ('sales', 'marketing', 'leadership'));
create policy capture_requests_select on capture_requests for select
  using (private.current_user_role() in ('sales', 'marketing', 'leadership'));
create policy capture_requests_update on capture_requests for update
  using (private.current_user_role() = 'marketing');

drop function if exists public.current_user_role();
