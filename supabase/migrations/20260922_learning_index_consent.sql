-- ============================================================
-- STORYLOOP — Early Learning Index consent
-- ============================================================
-- Whether a service has agreed that counts drawn from its documentation may be
-- aggregated into a published picture of what young children are exploring.
--
-- THIS EXISTS BEFORE THE INDEX DOES, ON PURPOSE. Consent cannot be
-- retrofitted. Asking thousands of accounts, later, whether last year's
-- documentation may be counted is a question with one honest answer, and it is
-- no. Building the flag now means the first quarter that is large enough to
-- publish is built entirely from services that said yes beforehand.
--
-- Off by default and always. An index built by assuming agreement is not
-- anonymised data, it is data taken.
--
-- What would ever leave a service is counts: how often a curriculum link or a
-- disposition appeared, in which age band, in which region, in which quarter.
-- Never a child, an educator, a service, a story or any free text. The
-- suppression rules that make that true live in lib/learning-index.ts and are
-- unit tested; this column is only the permission.

alter table public.profiles
  add column if not exists learning_index_consent_at timestamptz;

comment on column public.profiles.learning_index_consent_at is
  'When this service agreed that aggregated counts may contribute to the Early Learning Index. Null means no, which is the default.';
