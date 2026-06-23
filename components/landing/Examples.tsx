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
    input: "Sienna (2yo) watered plants with watering can. Talked about worms. Filled & refilled can 6 times.",
    age: "2 years",
    framework: "EYLF",
    story:
      "Sienna spent a long time in the garden today, carrying the watering can backwards and forwards to the tap and filling it again and again. She noticed the worms in the damp soil and stopped to look closely before going back to watering. Sienna stayed with this job for a long stretch of time and showed real care for the plants and the space around her.",
    learningShows:
      "Sienna is building persistence, curiosity, and a growing sense of responsibility for the environment.",
    curriculum:
      "EYLF Outcome 2 — Children are connected with and contribute to their world, particularly showing care for the environment through repeated watering and close noticing.",
    nextSteps:
      "Offer magnifying glasses for closer worm observation and invite Sienna to help with planting so she can keep following this interest.",
  },
  {
    input: "Marcus (4) building blocks, got frustrated when tower fell. Took deep breath, tried again. Proud when it stood.",
    age: "4 years",
    framework: "EYLF",
    story:
      'Marcus was building a tall block tower today when it fell over. He looked frustrated, paused, took a deep breath, and started again. Marcus stayed with the challenge until the tower stood, then proudly said, "I did it by myself."',
    learningShows:
      "Marcus is strengthening self-regulation, persistence, and confidence when things do not go to plan.",
    curriculum:
      "EYLF Outcome 3 — Children have a strong sense of wellbeing, and Outcome 4 — Children are confident and involved learners, as Marcus used a calming strategy and stayed with the challenge.",
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
      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-ink-700 leading-relaxed">{children}</p>
    </div>
  );
}

export default function Examples() {
  return (
    <section id="examples" className="py-24">
      <div className="wide-shell">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-title mb-3">Real examples</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-900 mb-4">
            Stories educators are actually <span className="italic text-clay-700">proud</span> to publish.
          </h2>
          <p className="text-ink-600">Real inputs, grounded outputs, and language that feels closer to the floor than a content generator.</p>
        </div>

        <div className="space-y-6">
          {EXAMPLES.map((ex, i) => (
            <div key={i} className="grid md:grid-cols-5 gap-5 items-stretch">
              <div className="md:col-span-2 card p-6 bg-cream-50 flex flex-col">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="section-title">Educator note</p>
                  <span className="text-[10px] font-mono bg-clay-100 text-clay-700 px-2 py-0.5 rounded-full whitespace-nowrap">{ex.age}</span>
                </div>
                <p className="text-sm text-ink-700 font-mono leading-relaxed whitespace-pre-wrap">{ex.input}</p>
                <div className="mt-auto pt-4">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-clay-700">
                    {ex.framework === "Te Whāriki" ? "🇳🇿 Te Whāriki" : "🇦🇺 EYLF"}
                  </span>
                </div>
              </div>
              <div className="md:col-span-3 card p-6 border-l-4 border-clay-500">
                <p className="section-title mb-3">StoryLoop draft</p>
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
      </div>
    </section>
  );
}
