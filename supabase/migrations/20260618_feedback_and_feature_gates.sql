-- StoryLoop feedback inbox and feature-tier instrumentation.

create table if not exists public.feedback_submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  category text not null default 'general',
  page text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.feedback_submissions enable row level security;

drop policy if exists "own_feedback_insert" on public.feedback_submissions;
create policy "own_feedback_insert" on public.feedback_submissions
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "own_feedback_select" on public.feedback_submissions;
create policy "own_feedback_select" on public.feedback_submissions
  for select
  using ((select auth.uid()) = user_id);

create index if not exists idx_feedback_submissions_user_created
  on public.feedback_submissions(user_id, created_at desc);

create index if not exists idx_feedback_submissions_status_created
  on public.feedback_submissions(status, created_at desc);

create index if not exists idx_feedback_submissions_category_created
  on public.feedback_submissions(category, created_at desc);

grant insert, select on table public.feedback_submissions to authenticated;
