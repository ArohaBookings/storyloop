import { Home, Building2, Clock } from "lucide-react";

/**
 * Helps a visitor self-identify in one glance. Written plainly, one situation
 * each, so a cold reader can see themselves rather than wade through features.
 */
const AUDIENCES = [
  {
    icon: Home,
    who: "Home based educators",
    body: "You are the teacher, the cook, the cleaner and the administrator. Documentation is the thing that slips to the evening. StoryLoop turns the notes you already make into finished stories, so the evening stays yours.",
  },
  {
    icon: Building2,
    who: "Centre teams",
    body: "Everyone documents differently and the quality wanders. StoryLoop gives your team a consistent starting point that still sounds like each educator, and exports cleanly into Storypark, Educa, Kinderloop or Brightwheel.",
  },
  {
    icon: Clock,
    who: "Relievers and part timers",
    body: "You move between rooms and centres and rarely know a child for long. A quick note about one real moment becomes a proper learning story you can hand over with confidence.",
  },
];

export default function WhoItsFor() {
  return (
    <section className="py-20 md:py-24">
      <div className="wide-shell">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="section-title mb-3">Who it is for</p>
          <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">
            Built for the people actually on the floor.
          </h2>
          <p className="mt-4 text-ink-600">
            Not for administrators who never meet the children. For the educators doing the documentation, whoever
            you are.
          </p>
        </div>
        <div className="grid min-w-0 gap-5 md:grid-cols-3">
          {AUDIENCES.map(({ icon: Icon, who, body }) => (
            <div key={who} className="card min-w-0 p-6 md:p-7">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-clay-700 text-paper">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink-900">{who}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
