alter table public.stories
  add column if not exists updated_at timestamptz default now();

update public.stories
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update private.access_codes
set story_preferences = story_preferences
  || jsonb_build_object(
    'defaultFramework', 'NZ',
    'preferredTone', 'natural',
    'depthPreference', 'balanced',
    'includeTeReoLevel', 'medium',
    'includeKowhitiWhakapae', true,
    'includeTapasa', true,
    'languageStyle', 'plain_ece'
  )
where code = 'nikky';
