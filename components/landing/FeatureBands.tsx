import { Check } from "lucide-react";
import SiteImage from "./SiteImage";

/**
 * Alternating photo-and-text bands. Each photo is chosen to match the words
 * beside it, which is the thing that makes a page read as human rather than as
 * a feature list. This is deliberately spacious: one idea per band, room to
 * breathe, no wall of text.
 */

type Band = {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  image: { src: string; alt: string; emoji: string; caption?: string };
};

const BANDS: Band[] = [
  {
    eyebrow: "From note to story",
    title: "The blank page is the part we take away.",
    body: "You are not handed a finished story to rubber stamp. You are handed a solid first draft, grounded in exactly what you wrote, with the curriculum links already mapped, so your job becomes editing rather than inventing.",
    points: ["Te Whāriki or EYLF links, with the reasoning", "Your rough note tidied into real prose", "Every word yours to change"],
    image: {
      src: "/images/writing.jpg",
      alt: "A teacher smiling at their desk in a classroom",
      emoji: "✍️",
      caption: "Evenings back, without losing your voice",
    },
  },
  {
    eyebrow: "Grounded in what you saw",
    title: "It never invents a child you were not watching.",
    body: "A child's quoted words are kept exactly as you wrote them. Nothing is added that your note did not support, and anything uncertain is raised for you to confirm rather than written in as fact. Documentation that makes things up is worse than none.",
    points: ["Quotes kept word for word", "No invented detail, ever", "Privacy and safety checked on every draft"],
    image: {
      src: "/images/children-learning.jpg",
      alt: "Children engaged in a learning activity with letter cards",
      emoji: "🔤",
      caption: "About the real child in front of you",
    },
  },
];

function Band({ band, flip }: { band: Band; flip: boolean }) {
  return (
    <div className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${flip ? "" : ""}`}>
      <div className={flip ? "lg:order-2" : ""}>
        <SiteImage
          src={band.image.src}
          alt={band.image.alt}
          emoji={band.image.emoji}
          caption={band.image.caption}
          className="aspect-[4/3] w-full shadow-warm"
        />
      </div>
      <div className={flip ? "lg:order-1" : ""}>
        <p className="section-title mb-3">{band.eyebrow}</p>
        <h3 className="font-display text-3xl font-bold leading-snug text-ink-900 md:text-4xl">{band.title}</h3>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-600">{band.body}</p>
        <ul className="mt-6 space-y-2.5">
          {band.points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-[15px] text-ink-700">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-sage-600" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function FeatureBands() {
  return (
    <section className="py-20 md:py-28">
      <div className="wide-shell space-y-20 md:space-y-28">
        {BANDS.map((band, index) => (
          <Band key={band.title} band={band} flip={index % 2 === 1} />
        ))}
      </div>
    </section>
  );
}
