const EXAMPLES = [
  {
    input: "Sienna (2yo) watered plants with watering can. Talked about worms. Filled & refilled can 6 times.",
    output: `Sienna's fascination with the garden continued today as she took charge of watering our vegetable patch. With focused determination, she carried the watering can back and forth to the tap, refilling it six times across the morning. Each journey became a small expedition — Sienna pausing to crouch and peer at the soil, whispering about the worms she could see wriggling in the damp earth. Her persistence and genuine investment in caring for our living space demonstrates a deepening sense of agency and connection with nature.

**Linked learning outcomes:** EYLF Outcome 2.4 — Children become socially responsible and show respect for the environment.

**Next steps:** Extend Sienna's interest by introducing magnifying glasses for closer worm observation, and invite her to help plant new seedlings.`,
    age: "2 years",
  },
  {
    input: "Marcus (4) building blocks, got frustrated when tower fell. Took deep breath, tried again. Proud when it stood.",
    output: `Marcus demonstrated remarkable emotional growth during block play today. Working to construct a tall tower, he experienced the familiar frustration of his structure collapsing — but rather than giving up, something wonderful happened. Marcus paused, took a deliberate deep breath, and set to rebuilding with renewed focus. When his tower finally stood tall, his face lit up with quiet pride. He stepped back, hands on hips, and declared "I did it by myself."

This moment reflects Marcus's developing self-regulation skills and his growing confidence as a persistent learner.

**Linked learning outcomes:** EYLF Outcome 3.2 — Children take increasing responsibility for their own wellbeing. Outcome 4.1 — Children develop dispositions for learning such as persistence.

**Next steps:** Celebrate Marcus's self-regulation strategy openly with the group, and offer more challenging construction materials.`,
    age: "4 years",
  },
  {
    input: "Whole group story time, toddlers sitting in circle. Emma pointed at duck in book, said 'quack'. First word today.",
    output: `A beautiful moment of shared learning unfolded during group story time today. As we read 'Hello Ducky' together, the toddlers gathered in our circle, entirely captivated. When we turned to a page featuring a bright yellow duck, Emma's eyes widened. She extended her small finger toward the image and said, clear and deliberate: "quack." The room paused — this was Emma's first spoken word in our setting, and the connection between a picture, a sound, and her growing understanding was unmistakable.

**Linked learning outcomes:** EYLF Outcome 5.1 — Children interact verbally and non-verbally with others for a range of purposes. Outcome 5.2 — Children engage with a range of texts.

**Next steps:** Celebrate Emma's emerging communication with her family, and introduce more animal sound books during quiet time.`,
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
          <p className="text-ink-600">Real inputs, real outputs. No generic templates, no AI slop.</p>
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
