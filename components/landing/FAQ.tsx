"use client";

const FAQS = [
  { q: "What is StoryLoop?", a: "StoryLoop is an early childhood documentation tool that turns real educator observations, voice notes, or bullet points into editable learning story drafts." },
  { q: "Does StoryLoop replace educator thinking?", a: "No. StoryLoop supports drafting and structure, while educators remain responsible for observation, interpretation, reflection and final editing." },
  { q: "Can I edit the generated stories?", a: "Yes. You can edit a generated story, save changes, copy it, export it, and regenerate from the original observation using a different tone, depth, or curriculum mode." },
  { q: "Does it support Te Whāriki?", a: "Yes. New Zealand mode supports Te Whāriki strands, learning outcome ideas, dispositions, child voice, responding, and optional Kōwhiti Whakapae or Tapasā lenses when relevant." },
  { q: "Does it support EYLF?", a: "Yes. Australia mode supports EYLF V2.0 learning outcomes and keeps links grounded in what the educator actually observed." },
  { q: "Can I use voice notes?", a: "Yes. Supported browsers can request microphone access for live recording. If live recording is blocked or unavailable, you can still type bullet points or upload an audio file." },
  { q: "How many stories are free?", a: "The free plan includes 3 stories per month. Upgrade prompts are dismissible, and existing story history stays available even if the limit is reached." },
  { q: "Is it suitable for new educators?", a: "Yes. It helps new educators see how observation, learning, curriculum, dispositions, and responding can fit together, while still requiring educator review." },
  { q: "Is it suitable for experienced educators?", a: "Yes. Experienced educators can use it to speed up the first draft and then add their own local context, professional judgement, and final wording." },
  { q: "Does it create generic AI stories?", a: "StoryLoop is designed to avoid generic AI phrasing by grounding every claim in the observation, using plain educator language, and linking curriculum only when evidence supports it." },
  { q: "What about child privacy? Is my data safe?", a: "Your observations are not used to train AI models. Data is stored securely and access-controlled. Educators should still avoid unnecessary identifying details in notes." },
];

export default function FAQ() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="section-title mb-3">Questions</p>
          <h2 className="font-display text-4xl font-bold text-ink-900">Everything educators ask.</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map(faq => (
            <details key={faq.q} className="card p-5 group cursor-pointer transition-all hover:shadow-warm">
              <summary className="font-semibold text-ink-900 text-sm list-none flex items-center justify-between gap-4">
                {faq.q}
                <span className="text-clay-500 text-xl flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-sm text-ink-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
