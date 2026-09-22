import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Example = {
  input: string;
  age: string;
  framework: "EYLF" | "Te Whāriki";
  story: string;
  learningShows: string;
  curriculum: string;
  nextSteps: string;
};

const EXAMPLES: Example[] = [
  {
    input: "Marcus (4) building blocks, got frustrated when tower fell. Took deep breath, tried again. Proud when it stood.",
    age: "4 years",
    framework: "EYLF",
    story:
      'Marcus was building a tall block tower today when it fell over. He looked frustrated, paused, took a deep breath, and started again. Marcus stayed with the challenge until the tower stood, then proudly said, "I did it by myself."',
    learningShows:
      "Marcus is strengthening self-regulation, persistence, and confidence when things do not go to plan.",
    curriculum:
      "EYLF Outcome 3 (children have a strong sense of wellbeing) and Outcome 4 (children are confident and involved learners), as Marcus used a calming strategy and stayed with the challenge.",
    nextSteps:
      "Notice the strategy Marcus used, name it with him, and offer more chances to practise managing frustration in play.",
  },
  {
    input: "Whole group story time in Aotearoa. Emma pointed at duck in book, said 'quack'. Smiled when other tamariki joined in.",
    age: "Toddler",
    framework: "Te Whāriki",
    story:
      'During story time today, Emma pointed to the duck in the book and said "quack" as the other tamariki watched and joined in. She smiled when the group repeated the sound with her and stayed engaged in the shared reading.',
    learningShows:
      "Emma is growing confidence as a communicator and is using shared group moments to connect language with meaning.",
    curriculum:
      "This links with Mana reo | Communication, particularly using gesture, sound, and shared story language to express meaning. It also connects with Mana tangata | Contribution as Emma joined a group moment and saw other tamariki respond.",
    nextSteps:
      "Revisit animal sound books, keep using shared waiata and story prompts, and share this language moment with whānau.",
  },
];

function OutputDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-clay-700">{label}</p>
      <p className="text-sm text-ink-700 leading-relaxed">{children}</p>
    </div>
  );
}

export default function Examples() {
  return (
    <section id="examples" className="py-24">
      <div className="wide-shell">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
            A four-year-old in Australia. A toddler in Aotearoa.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-600 md:text-lg">
            The educator&apos;s note, then the draft StoryLoop wrote from it.
          </p>
        </div>

        <div className="space-y-6">
          {EXAMPLES.map((ex, i) => (
            <div key={i} className="grid md:grid-cols-5 gap-5 items-start">
              <div className="md:col-span-2 card p-6 bg-cream-50 flex flex-col md:sticky md:top-24">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-ink-700">Educator note</p>
                  <span className="text-xs font-medium bg-clay-100 text-clay-800 px-2.5 py-0.5 rounded-full whitespace-nowrap">{ex.age}</span>
                </div>
                <p className="text-sm text-ink-700 font-mono leading-relaxed whitespace-pre-wrap">{ex.input}</p>
                <div className="pt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-clay-700">
                    {ex.framework === "Te Whāriki" ? "Te Whāriki, New Zealand" : "EYLF, Australia"}
                  </span>
                </div>
              </div>
              <div className="md:col-span-3 card p-6 border-l-4 border-clay-500">
                <p className="mb-3 text-sm font-semibold text-ink-700">StoryLoop draft</p>
                <p className="text-base text-ink-800 leading-relaxed font-display font-normal mb-5">{ex.story}</p>
                <div className="space-y-3 border-t border-clay-100 pt-4">
                  <OutputDetail label="What this learning shows">{ex.learningShows}</OutputDetail>
                  <OutputDetail label="Linked curriculum">{ex.curriculum}</OutputDetail>
                  <OutputDetail label="Where to next">{ex.nextSteps}</OutputDetail>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center">
          <Link href="/examples" className="inline-flex items-center gap-1.5 text-base font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900">
            More examples, by age and framework
            <ArrowRight className="h-4 w-4" />
          </Link>
        </p>
      </div>
    </section>
  );
}
