-- The leader's page carries the centre offer (13 Nov 2026).
--
-- An educator who sends one story to her leader (story_checks, 20261110) may add
-- her centre's name and tick a box to show the leader a few numbers about her
-- own recent stories. The leader's page then offers the whole team's free month
-- with her already attached. A leader who starts it claims the check's offer
-- reference once: the centre's set-up screen is filled in with the name she
-- typed, and inviting her is one tap.
--
-- Additive and idempotent. Nothing here can read a story or a note: the offer
-- reference is stored only as a hash, is not the link key, and is used only to
-- find which educator to invite. Both tables stay reachable only through the
-- service role (RLS on, no policies, grants revoked), exactly as before.

alter table public.story_checks add column if not exists centre_name text;
alter table public.story_checks add column if not exists share_counts boolean not null default false;
alter table public.story_checks add column if not exists offer_ref_hash text;
alter table public.story_checks add column if not exists offer_claimed_by uuid references auth.users(id) on delete set null;
alter table public.story_checks add column if not exists offer_claimed_at timestamptz;
alter table public.story_checks add column if not exists offer_invited_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'story_checks_centre_name_length') then
    alter table public.story_checks
      add constraint story_checks_centre_name_length check (centre_name is null or char_length(centre_name) <= 80);
  end if;
end $$;

create unique index if not exists story_checks_offer_ref_idx on public.story_checks (offer_ref_hash) where offer_ref_hash is not null;
create index if not exists story_checks_offer_claimed_idx on public.story_checks (offer_claimed_by, created_at desc) where offer_claimed_by is not null;

-- An invitation made with one tap from a leader's offer is addressed to an
-- account the leader never saw, so the invitation list hides its address.
alter table public.centre_invites add column if not exists from_leader_offer boolean not null default false;

alter table public.story_checks enable row level security;
revoke all on table public.story_checks from anon, authenticated;
alter table public.centre_invites enable row level security;
revoke all on table public.centre_invites from anon, authenticated;
