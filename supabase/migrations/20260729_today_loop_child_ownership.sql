-- Preserve tenant integrity when authenticated clients write daily captures
-- directly through Supabase. The application route already validates child
-- ownership; this policy makes the database enforce the same rule.

drop policy if exists "own_daily_captures" on public.daily_captures;
create policy "own_daily_captures"
on public.daily_captures
for all
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    child_id is null
    or exists (
      select 1
      from public.child_profiles child
      where child.id = child_id
        and child.user_id = (select auth.uid())
    )
  )
);
