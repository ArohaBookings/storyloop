const EXAMPLES = [
  {
    input: "Sienna (2yo) watered plants with watering can. Talked about worms. Filled & refilled can 6 times.",
    output: `Sienna spent a long time in the garden today, carrying the watering can backwards and forwards to the tap and filling it again and again. She noticed the worms in the damp soil and stopped to look closely before going back to watering. Sienna stayed with this job for a long stretch of time and showed real care for the plants and the space around her.

**What this learning shows:** Sienna is building persistence, curiosity, and a growing sense of responsibility for the environment.

**Linked learning outcomes:** EYLF Outcome 2.4 — Children become socially responsible and show respect for the environment.

**Next steps:** Offer magnifying glasses for closer worm observation and invite Sienna to help with planting so she can keep following this interest.`,
    age: "2 years",
  },
  {
    input: "Marcus (4) building blocks, got frustrated when tower fell. Took deep breath, tried again. Proud when it stood.",
    output: `Marcus was building a tall block tower today when it fell over. He looked frustrated, paused, took a deep breath, and started again. Marcus stayed with the challenge until the tower stood, then proudly said, "I did it by myself."

**What this learning shows:** Marcus is strengthening self-regulation, persistence, and confidence when things do not go to plan.

**Linked learning outcomes:** EYLF Outcome 3.2 — Children take increasing responsibility for their own wellbeing. Outcome 4.1 — Children develop dispositions for learning such as persistence.

**Next steps:** Notice the strategy Marcus used, name it with him, and offer more chances to practise managing frustration in play.`,
    age: "4 years",
  },
  {
    input: "Whole group story time in Aotearoa. Emma pointed at duck in book, said 'quack'. Smiled when other tamariki joined in.",
    output: `During story time today, Emma pointed to the duck in the book and said "quack" as the other tamariki watched and joined in. She smiled when the group repeated the sound with her and stayed engaged in the shared reading.

**What this learning shows:** Emma is growing confidence as a communicator and is using shared group moments to connect language with meaning.

**Linked learning outcomes:** Mana reo | Communication. Mana tangata | Contribution.

**Next steps:** Revisit animal sound books, keep using shared waiata and story prompts, and share this language moment with whanau.`,
    age: "Toddler",
  },
];

export default function Examples() {
  return (
    <section id="examples" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-title mb-3">Real examples</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-900 mb-4">
            Stories educators are actually <span className="italic text-clay-700">proud</span> to publish.
          </h2>
          <p className="text-ink-600">Real inputs, grounded outputs, and language that feels closer to the floor than a content generator.</p>
        </div>

        <div className="space-y-6">
          {EXAMPLES.map((ex, i) => (
            <div key={i} className="grid md:grid-cols-5 gap-5 items-start">
              <div className="md:col-span-2 card p-6 bg-cream-50">
                <div className="flex items-center justify-between mb-3">
                  <p className="section-title">Input</p>
                  <span className="text-[10px] font-mono bg-clay-100 text-clay-700 px-2 py-0.5 rounded-full">{ex.age}</span>
                </div>
                <p className="text-sm text-ink-700 font-mono leading-relaxed whitespace-pre-wrap">{ex.input}</p>
              </div>
              <div className="md:col-span-3 card p-6 border-l-4 border-clay-500">
                <p className="section-title mb-3">StoryLoop output</p>
                <div className="text-sm text-ink-700 leading-relaxed font-display font-normal whitespace-pre-wrap">{ex.output}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
