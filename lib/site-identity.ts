/**
 * Who the site says it is, in one place, for every JSON-LD block.
 *
 * 12 Nov 2026: an answer engine named StoryLoop but linked the name to two
 * unrelated companies on other domains. Every Organization, WebSite and
 * SoftwareApplication block now states the same name, address, description
 * and logo, so engines can tie the name to storyloop.space and nothing else.
 *
 * No `sameAs`: it may only list real StoryLoop profile URLs, and none appear
 * anywhere in this repo. Add one here when a real profile is linked from the
 * site itself, never before.
 */

export const SITE_NAME = "StoryLoop";
export const SITE_URL = "https://storyloop.space";
// "StoryLoop by Aria Care" is already how the emails and the share image sign off.
export const SITE_ALTERNATE_NAMES = ["storyloop.space", "StoryLoop by Aria Care"];
export const SITE_DESCRIPTION =
  "StoryLoop (storyloop.space) turns an early childhood educator's own observation note into an editable learning story draft, linked to Te Whāriki or the EYLF, that the educator checks before anything is shared.";
// A raster logo: Google's Organization logo guidance asks for a bitmap of 112px or more.
export const SITE_LOGO = `${SITE_URL}/brand/storyloop-icon.png`;

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const SOFTWARE_ID = `${SITE_URL}/#software`;

/** A reference to the one Organization, for `publisher` fields on other pages. */
export const ORGANIZATION_REF = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: SITE_LOGO },
} as const;
