-- What the Supabase advisor flagged after the September migrations, fixed.
-- Nothing here changes what any query returns or who can see which row.

-- 1. Pin search_path on trigger functions. They only use NEW/OLD, now() and
--    schema-qualified tables, so an empty path is enough and nothing can be
--    shadowed by an object in a schema the caller controls.
alter function public.touch_blog_updated_at() set search_path = '';
alter function public.touch_centres_updated_at() set search_path = '';
alter function public.touch_wall_card() set search_path = '';
alter function public.require_child_voice_consent() set search_path = '';
alter function public.clear_voice_notes_on_consent_withdrawn() set search_path = '';
alter function private.guard_profile_self_update() set search_path = '';

-- 2. The wall-card scan counter is called by the server with the service key
--    (app/w/[code]/page.tsx). Anyone holding the public key could otherwise
--    call it directly and inflate a card's scan count.
revoke all on function public.count_wall_card_scan(text) from public, anon, authenticated;
grant execute on function public.count_wall_card_scan(text) to service_role;

-- 3. Evaluate auth.uid() once per query instead of once per row. Same rule,
--    written the way Postgres can plan as a constant.
alter policy assistant_edits_select_own on public.assistant_edits
  using ((select auth.uid()) = user_id);
alter policy assistant_edits_update_own on public.assistant_edits
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy referrals_select_own on public.referrals
  using ((select auth.uid()) = referrer_id);
alter policy child_media_select_own on public.child_media
  using ((select auth.uid()) = user_id);
alter policy child_media_write_own on public.child_media
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy reviews_insert_own on public.reviews
  with check ((select auth.uid()) = user_id);
alter policy "wall cards are private to their owner" on public.wall_cards
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "voice notes are private to their educator" on public.child_voice_notes
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 4. Cover foreign keys that are joined on or cascaded through.
create index if not exists centre_invites_accepted_by_idx on public.centre_invites (accepted_by);
create index if not exists centre_invites_invited_by_idx on public.centre_invites (invited_by);
create index if not exists centres_created_by_idx on public.centres (created_by);
create index if not exists page_events_user_idx on public.page_events (user_id);
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);
create index if not exists assistant_edits_story_idx on public.assistant_edits (story_id);
create index if not exists child_voice_notes_story_idx on public.child_voice_notes (story_id);
create index if not exists reviews_user_idx on public.reviews (user_id);
create index if not exists wall_cards_source_story_idx on public.wall_cards (source_story_id);
