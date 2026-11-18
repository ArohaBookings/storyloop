-- Tell your centre (19 Nov 2026): one switch on a family link.
--
-- An educator may let the family who holds a link see one line and a button,
-- "Tell your centre", that opens the parent's OWN message or mail app with a
-- short note to the centre that they can change before sending. Off by
-- default and switched on by the educator for each link: an educator using
-- StoryLoop on her own may be outside her centre's AI or device policy, and a
-- parent praising it to the manager must never land her in trouble.
--
-- Nothing is sent from StoryLoop and nothing about the family is collected.
-- This column is the switch and nothing else. Additive and idempotent:
-- family_links keeps RLS on with no policies and no grants for the public
-- roles (20261110_family_links.sql), and lib/family-link.ts and
-- lib/family-link-server.ts do not read it (lib/family-tell-centre-server.ts does).

alter table public.family_links add column if not exists tell_centre boolean not null default false;

comment on column public.family_links.tell_centre is
  'Tell your centre: true when the educator chose to show this family a button that opens their own message app with a note to the centre. Off by default. Written only through app/api/children/[id]/family-links with the service role.';
