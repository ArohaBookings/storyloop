-- Quill: the inline story-refinement assistant.
-- One table powers three things: the monthly quota (Educator gets a taste,
-- Educator Pro is unlimited), the accept/reject audit log, and the 👍/👎
-- feedback we use to tune Quill over time.

create table if not exists public.assistant_edits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete set null,
  instruction text not null,
  before_text text,
  after_text text,
  change_summary text,
  accepted boolean not null default false,
  feedback smallint,          -- 1 = helpful, -1 = not helpful
  feedback_note text,
  created_at timestamptz not null default now()
);

alter table public.assistant_edits enable row level security;

-- Owners can read their own edit history; writes go through the service role
-- in the API, but we still scope select/update to the owner for safety.
drop policy if exists "assistant_edits_select_own" on public.assistant_edits;
create policy "assistant_edits_select_own" on public.assistant_edits
  for select using (auth.uid() = user_id);

drop policy if exists "assistant_edits_update_own" on public.assistant_edits;
create policy "assistant_edits_update_own" on public.assistant_edits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists assistant_edits_user_created_idx
  on public.assistant_edits (user_id, created_at desc);
