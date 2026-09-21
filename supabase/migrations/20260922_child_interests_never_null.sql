-- A child profile with a NULL interests array crashed the whole Child profiles
-- page: the UI calls interests.length on it. The column has been nullable with
-- no default since it was added, so any row created before the app started
-- sending an array (or by any direct insert) breaks that educator's page.
--
-- Safe and additive: it only fills in empty arrays where the value is missing.
-- The UI is also defensive now, so this is the second line of defence.
update public.child_profiles set interests = '{}'::text[] where interests is null;
alter table public.child_profiles alter column interests set default '{}'::text[];
alter table public.child_profiles alter column interests set not null;

-- Stories have the same shape of hazard in less visible places.
update public.stories set outcomes = '{}'::text[] where outcomes is null;
update public.stories set next_steps = '{}'::text[] where next_steps is null;
alter table public.stories alter column outcomes set default '{}'::text[];
alter table public.stories alter column next_steps set default '{}'::text[];
