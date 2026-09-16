/**
 * The organic channels StoryLoop can actually use, and the tags that let the
 * growth dashboard tell them apart.
 *
 * The analytics pipeline already captures utm_source / utm_medium /
 * utm_campaign (lib/analytics/client.ts) and carries them through to
 * page_events and profiles.signup_source. The missing half was the other end:
 * every untagged link collapses into one "facebook.com" referrer row, so a
 * weekly post to five different groups is indistinguishable from one post to
 * one group. Tagging is what makes the acquisition table on /admin/growth
 * answer "which channel produced a payer".
 *
 * Every entry below was verified on 2026-09-16. `rules` is not decoration:
 * most large ECE groups ban self-promotion outright, and posting a bare
 * product link into one is a fast way to lose access to the best audience in
 * the country. Read it before you post.
 */

export type ChannelGroup = "community" | "publication" | "partner" | "directory" | "education" | "local";

export type Channel = {
  key: string;
  label: string;
  group: ChannelGroup;
  /** utm_source value. Stable: changing it splits historical reporting. */
  source: string;
  /** utm_medium value. Broad bucket, so several sources roll up sensibly. */
  medium: string;
  /** Where it lives, when there is a single obvious URL. */
  url?: string;
  /** Reach, where it was verifiable. Deliberately absent when it was not. */
  reach?: string;
  /** What is allowed. Read before posting. */
  rules: string;
};

export const CHANNELS: Channel[] = [
  // ---------------------------------------------------------------- community
  {
    key: "fb-nz-ece-teachers",
    label: "NZ ECE Teachers Discussion Group (Facebook)",
    group: "community",
    source: "fb_nz_ece_teachers",
    medium: "community",
    reach: "29.7k members",
    rules:
      "Self-promotion and advertising are BANNED, with one stated exception: professional development relevant to the sector. Never post a product link. The way in is running something genuinely useful and free, and letting people find StoryLoop themselves.",
  },
  {
    key: "fb-elp-learning-story",
    label: "ELP Learning Story Assessment (Facebook)",
    group: "community",
    source: "fb_elp_learning_story",
    medium: "community",
    reach: "4.5k members, near dormant",
    rules:
      "Run by Educational Leadership Project, created specifically for teachers to share learning stories. Perfect audience fit, almost no traffic (roughly one post last month). Worth reviving with weekly useful exemplars rather than promotion.",
  },
  {
    key: "fb-nsw-ece-teachers",
    label: "NSW Early Childhood Teachers (Facebook)",
    group: "community",
    source: "fb_nsw_ece_teachers",
    medium: "community",
    reach: "43.8k members, public group",
    rules:
      "Largest AU group found, and public so posts are indexable. No anti-promotion rule was visible on the public preview, but absence of a visible rule is not permission. Check the About and pinned post after joining. They write against the EYLF, not Te Whariki.",
  },
  {
    key: "aussie-childcare-forum",
    label: "Aussie Childcare Network forum",
    group: "community",
    source: "aussie_childcare_forum",
    medium: "community",
    url: "https://aussiechildcarenetwork.com.au/forum",
    reach: "39,859 posts, active Sept 2026",
    rules:
      "The one genuinely active AU forum with an explicit Advertising Forum whose only stated rule is that ads must be relevant to the niche. Free registration. The Cert III student sections are large and on-topic.",
  },

  // ------------------------------------------------------------- publications
  {
    key: "ecc-newsletter",
    label: "Early Childhood Council newsletters (NZ)",
    group: "publication",
    source: "ecc_newsletter",
    medium: "newsletter",
    reach: "8,000+ stated readers",
    rules:
      "NZ's largest ECE membership body. Two free monthly e-newsletters (Swings & Roundabouts, Teachers' Chatterbox). Free to subscribe without membership, and they welcome contributed articles from centres, academics and sector experts. Contribute expertise, not a pitch.",
  },
  {
    key: "education-gazette",
    label: "Education Gazette / Tukutuku Korero (NZ MoE)",
    group: "publication",
    source: "education_gazette",
    medium: "editorial",
    url: "https://gazette.education.govt.nz",
    rules:
      "Government-published, reaches NZ educators from early learning up. Pitches go to reporter@edgazette.govt.nz. They will NOT run a product pitch. The angle that works is a centre's story with, in their words, a beating heart. Find a centre willing to be the subject.",
  },
  {
    key: "eca-the-spoke",
    label: "The Spoke, Early Childhood Australia",
    group: "publication",
    source: "eca_the_spoke",
    medium: "editorial",
    url: "https://thespoke.earlychildhoodaustralia.org.au",
    rules:
      "AU peak body blog, open to practitioners. 500-800 words, needs an image and a 50-100 word bio. Explicitly bans promotional content, so this is a credibility play only.",
  },
  {
    key: "the-sector",
    label: "The Sector (AU ECEC trade news)",
    group: "publication",
    source: "the_sector",
    medium: "editorial",
    url: "https://thesector.com.au",
    rules:
      "Daily AU ECEC business news, covers products and has a Marketplace section carrying partner content. Whether Marketplace placement is paid was not verified. Free newsletter signup.",
  },
  {
    key: "nz-entrepreneur",
    label: "NZ Entrepreneur, Startup Watch",
    group: "publication",
    source: "nz_entrepreneur",
    medium: "editorial",
    url: "https://nzentrepreneur.co.nz",
    rules:
      "Free NZ digital magazine that profiles startups it is watching. Submission terms are not published, so treat as a cold pitch. A 20-year-old solo founder building for ECE is a real story.",
  },

  // ------------------------------------------------------------------ partner
  {
    key: "edutribe",
    label: "EduTribe (AU)",
    group: "partner",
    source: "edutribe",
    medium: "partner",
    url: "https://edutribe.com.au",
    reach: "24k+ educators claimed",
    rules:
      "Best partner fit found. Their entire model is free resources for early childhood educators, which is exactly what a free learning-story resource is. Contact edutribe@onetree.org.au.",
  },
  {
    key: "education-hub-nz",
    label: "The Education Hub (NZ)",
    group: "partner",
    source: "education_hub_nz",
    medium: "partner",
    url: "https://theeducationhub.org.nz",
    rules:
      "NZ registered charity bridging research and practice, trusted in ECE, already publishes on learning stories. No public write-for-us page, so a cold pitch. Research-first, so an honest piece on the limits of AI in assessment lands better than a product pitch.",
  },

  // ---------------------------------------------------------------- education
  {
    key: "open-polytechnic",
    label: "Open Polytechnic ECE students",
    group: "education",
    source: "open_polytechnic",
    medium: "education",
    rules:
      "Largest NZ distance cohort for ECE teaching quals. Students write practice learning stories, have no budget, and enter centres within 1-3 years. Highest-leverage unused channel, but approach the programme, never spam students.",
  },
  {
    key: "nz-tertiary-college",
    label: "NZ Tertiary College ECE students",
    group: "education",
    source: "nz_tertiary_college",
    medium: "education",
    url: "https://nztertiarycollege.ac.nz",
    rules: "ECE teaching quals from undergraduate through Master's. Same logic as Open Polytechnic.",
  },

  // ---------------------------------------------------------------- directory
  {
    key: "alternativeto",
    label: "AlternativeTo",
    group: "directory",
    source: "alternativeto",
    medium: "directory",
    url: "https://alternativeto.net",
    rules:
      "Free, and genuinely worth it because \"Storypark alternative\" and \"Educa alternative\" are high-intent searches. StoryLoop's honest position there is companion, not replacement.",
  },
  {
    key: "capterra",
    label: "Capterra",
    group: "directory",
    source: "capterra",
    medium: "directory",
    rules:
      "Free listing is real, but visibility is pay-to-play (PPC from roughly $2/click with a ~$500/month floor). Treat the free listing as a backlink and a place to point reviews, not a traffic source.",
  },
  {
    key: "g2",
    label: "G2",
    group: "directory",
    source: "g2",
    medium: "directory",
    rules: "Free basic profile is real; paid tiers start around $299/mo. Same verdict as Capterra: a review container, not traffic.",
  },

  // -------------------------------------------------------------------- local
  {
    key: "ministry-of-awesome",
    label: "Ministry of Awesome, Coffee & Jam (Christchurch)",
    group: "local",
    source: "ministry_of_awesome",
    medium: "local",
    url: "https://ministryofawesome.com",
    rules:
      "Christchurch's longest-running founder meetup, free to attend, monthly at EPIC on Manchester Street. They also run free 1:1 founder coaching through Startup Aotearoa. Not an ECE audience, but it is free and on the doorstep.",
  },

  // ------------------------------------------------------------------- direct
  {
    key: "email-outreach",
    label: "Direct email outreach",
    group: "partner",
    source: "email_outreach",
    medium: "email",
    rules: "Tag every link in a personal outreach email so replies and signups can be told apart from cold traffic.",
  },
];

/**
 * Landing targets worth pointing a campaign at.
 *
 * Every path here was checked to return 200 on 2026-09-16. Do not add one
 * without checking: a tagged link to a 404 spends the post AND the channel.
 * Note there is no /guides route; the nav item labelled Guides points at /blog.
 */
export const LINK_TARGETS: { path: string; label: string }[] = [
  { path: "/", label: "Home (demo in hero)" },
  { path: "/storypark-alternative", label: "Storypark alternative" },
  { path: "/learning-story-generator", label: "Learning story generator" },
  { path: "/signup", label: "Signup" },
  { path: "/about", label: "About Leo" },
  { path: "/blog", label: "Guides (blog)" },
  { path: "/examples", label: "Examples" },
  { path: "/resources", label: "Resources" },
  { path: "/pricing", label: "Pricing" },
];

export const CHANNEL_GROUP_LABELS: Record<ChannelGroup, string> = {
  community: "Communities and forums",
  publication: "Publications and editorial",
  partner: "Partners and outreach",
  education: "Training providers",
  directory: "Directories",
  local: "Local and founder",
};

/**
 * Build a tagged URL. Campaign is optional but strongly recommended: it is what
 * separates this week's post from last week's within the same source.
 */
export function buildTaggedUrl(origin: string, path: string, channel: Channel, campaign?: string) {
  const url = new URL(path, origin);
  url.searchParams.set("utm_source", channel.source);
  url.searchParams.set("utm_medium", channel.medium);
  if (campaign && campaign.trim()) {
    url.searchParams.set("utm_campaign", campaign.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }
  return url.toString();
}
