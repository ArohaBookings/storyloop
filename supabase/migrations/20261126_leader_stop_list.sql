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
