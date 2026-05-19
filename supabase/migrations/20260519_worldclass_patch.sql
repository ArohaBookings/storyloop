create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

alter table public.profiles add column if not exists monthly_story_limit_override int;
alter table public.profiles add column if not exists applied_access_code text;
alter table public.profiles add column if not exists story_preferences jsonb not null default '{}'::jsonb;

alter table public.stories add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists private.access_codes (
  code text primary key,
  label text,
  description text,
  monthly_story_limit_override int,
  story_preferences jsonb not null default '{}'::jsonb,
  target_email text,
  max_redemptions int default 1,
  redemption_count int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  expires_at timestamptz
);

grant all on table private.access_codes to postgres, service_role;

drop policy if exists "own_profile" on public.profiles;
drop policy if exists "own_profile_update" on public.profiles;
drop policy if exists "own_children" on public.child_profiles;
drop policy if exists "own_stories" on public.stories;

create policy "own_profile" on public.profiles for select using ((select auth.uid()) = id);
create policy "own_profile_update" on public.profiles for update using ((select auth.uid()) = id);
create policy "own_children" on public.child_profiles for all using ((select auth.uid()) = user_id);
create policy "own_stories" on public.stories for all using ((select auth.uid()) = user_id);
drop policy if exists "admin_audit_locked" on public.admin_audit_log;
create policy "admin_audit_locked" on public.admin_audit_log for all using (false) with check (false);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer
set search_path = public;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to postgres, service_role;

create or replace function public.reset_monthly_usage()
returns void as $$
begin
  update public.profiles
  set stories_this_month = 0,
      last_reset_at = now()
  where last_reset_at < date_trunc('month', now());
end;
$$ language plpgsql security definer
set search_path = public;

revoke all on function public.reset_monthly_usage() from public, anon, authenticated;
grant execute on function public.reset_monthly_usage() to postgres, service_role;

create or replace function public.get_access_code_grant(p_code text, p_email text default null)
returns table (
  code text,
  label text,
  monthly_story_limit_override int,
  story_preferences jsonb
) as $$
begin
  return query
  select
    access.code,
    access.label,
    access.monthly_story_limit_override,
    access.story_preferences
  from private.access_codes access
  where access.code = lower(trim(p_code))
    and coalesce(access.is_active, true)
    and (access.expires_at is null or access.expires_at > now())
    and (access.target_email is null or (p_email is not null and lower(access.target_email) = lower(p_email)))
    and (access.max_redemptions is null or coalesce(access.redemption_count, 0) < access.max_redemptions);
end;
$$ language plpgsql security definer
set search_path = public, private;

revoke all on function public.get_access_code_grant(text, text) from public, anon, authenticated;
grant execute on function public.get_access_code_grant(text, text) to postgres, service_role;

create or replace function public.redeem_access_code(p_code text)
returns void as $$
begin
  update private.access_codes
  set redemption_count = coalesce(redemption_count, 0) + 1
  where code = lower(trim(p_code));
end;
$$ language plpgsql security definer
set search_path = public, private;

revoke all on function public.redeem_access_code(text) from public, anon, authenticated;
grant execute on function public.redeem_access_code(text) to postgres, service_role;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
    execute 'grant execute on function public.rls_auto_enable() to postgres, service_role';
  end if;
end $$;

insert into private.access_codes (
  code,
  label,
  description,
  monthly_story_limit_override,
  story_preferences,
  max_redemptions,
  is_active
)
values (
  'nikky',
  'Nikky complimentary access',
  'Ten free stories each month for the Nikky pilot user.',
  10,
  '{
    "defaultFramework": "NZ",
    "preferredTone": "warm",
    "languageStyle": "plain_ece",
    "emphasis": [
      "Te Whariki learning outcomes",
      "learning dispositions",
      "Kowhiti Whakapae social and emotional learning",
      "light te reo Maori",
      "Tapasa-informed cultural responsiveness"
    ]
  }'::jsonb,
  1,
  true
)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    monthly_story_limit_override = excluded.monthly_story_limit_override,
    story_preferences = excluded.story_preferences,
    max_redemptions = excluded.max_redemptions,
    is_active = excluded.is_active;

create index if not exists idx_stories_child on public.stories(child_id);
