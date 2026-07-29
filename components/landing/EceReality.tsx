import { ExternalLink, FileCheck2, ShieldCheck, TimerReset } from "lucide-react";

const SOURCES = [
  {
    icon: TimerReset,
    region: "The workload problem",
    title: "More child-facing time, less duplicate documentation.",
    body: "Australian research reported educators spending under 30% of their day in focused interaction with children, alongside substantial unpaid work. StoryLoop is designed to remove blank-page and re-entry work, not create another compulsory daily sheet.",
    href: "https://www.sydney.edu.au/news-opinion/news/2025/07/16/childcare-educators-spend-less-than-30-percent-of-time-in-focused-interaction-with-children-research.html",
    source: "University of Sydney, 2025",
  },
  {
    icon: FileCheck2,
    region: "Aotearoa New Zealand",
    title: "Useful assessment can be documented or undocumented.",
    body: "Te Whāriki guidance describes noticing, recognising, responding, recording and revisiting, with formal and informal assessment and whānau partnership. Today Loop supports that cycle without pretending every moment needs a polished story.",
    href: "https://tewhariki.tahurangi.education.govt.nz/te-whariki-online/assessment-planning-and-evaluation/5637165598.p",
    source: "New Zealand Ministry of Education",
  },
  {
    icon: ShieldCheck,
    region: "Australia",
    title: "Text-first capture helps keep devices and images deliberate.",
    body: "National child-safety changes require clearer policies for taking, using, storing and destroying images, including authorised-device expectations. Today Loop never requires a photo and StoryLoop does not replace your service's incident, consent or records process.",
    href: "https://www.acecqa.gov.au/national-model-code-images-ecec",
    source: "ACECQA National Model Code",
  },
];

export default function EceReality() {
  return (
    <section className="py-20 md:py-28">
      <div className="wide-shell">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-title mb-3">Built around real ECE practice</p>
          <h2 className="font-display text-4xl font-bold leading-tight text-ink-900 md:text-5xl">
            The goal is not more documentation. It is better decisions with less rework.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-600">
            StoryLoop sits beside the system your service already uses. It helps educators capture, draft, review,
            plan and export; it does not claim to replace attendance, incident, consent, or regulatory records.
          </p>
        </div>

        <div className="mt-12 grid min-w-0 gap-5 lg:grid-cols-3">
          {SOURCES.map(({ icon: Icon, region, title, body, href, source }) => (
            <article key={title} className="card flex min-w-0 flex-col p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage-700 text-paper">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-clay-600">{region}</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-ink-900">{title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-600">{body}</p>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-clay-700 hover:text-clay-900"
              >
                {source} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
