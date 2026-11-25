-- "Stop these emails" from a leader email, kept for ever without the address
-- (25 Nov 2026, MERGE2 2a).
--
-- The stop link carries no address any more: it names the send and is signed.
-- When a leader presses Stop, the one-way hash of her lower-cased address
-- (the same recipient_hash leader_emails keeps, lib/leader-email.ts
-- recipientHash) goes on this list. Every leader email checks it before it
-- goes. The hash is not keyed, so changing a secret can never re-open an
-- address that asked to stop. Reached only through the service role.

create table if not exists public.leader_stop_list (
  recipient_hash text primary key,
  created_at timestamptz not null default now()
);

alter table public.leader_stop_list enable row level security;
revoke all on table public.leader_stop_list from anon, authenticated;

-- Joined by the tick (MERGE2 2c). An educator added to a centre by her own
-- tick, with no invitation to accept, is told once in her bell the next time
-- she opens StoryLoop. This says how the row was made; nothing else reads it.
alter table public.centre_members add column if not exists joined_via text;
