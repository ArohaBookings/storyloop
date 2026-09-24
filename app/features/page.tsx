import type { Metadata } from "next";
import Capabilities from "@/components/landing/Capabilities";
import { GuideCta, GuideHero, GuidePage, RELATED, RelatedGuides } from "@/components/marketing/Guide";

export const metadata: Metadata = {
  title: "StoryLoop features: learning stories, and the rest of the day",
  description:
    "Everything StoryLoop does beyond the learning story draft: children's own words, wall cards families read in their language, pickup briefs, learning passports and more, with the plan each is on.",
  alternates: { canonical: "https://storyloop.space/features" },
  openGraph: { title: "StoryLoop features", description: "The learning story, and the rest of the day.", url: "https://storyloop.space/features", type: "website" },
};

export default function FeaturesPage() {
  return (
    <GuidePage>
      <GuideHero
        kicker="Features"
        title={<>The learning story, <span className="italic text-clay-700">and the rest of the day.</span></>}
        answer={
          <p>
            StoryLoop&apos;s core is the learning story draft: a quick note or voice memo in, a checked draft with curriculum
            links out. Around it are tools for the rest of an educator&apos;s day, from a child speaking for themselves to a
            wall families can read in their own language.
          </p>
        }
        image="/images/scenes/classroom.jpg"
        imageAlt="An educator holds an iPad with a StoryLoop draft while two toddlers, seen from behind, build a block tower"
      />
      <Capabilities />
      <GuideCta />
      <RelatedGuides links={[RELATED.educators, RELATED.centres, RELATED.families, RELATED.alongside, RELATED.safety, RELATED.examples]} />
    </GuidePage>
  );
}
