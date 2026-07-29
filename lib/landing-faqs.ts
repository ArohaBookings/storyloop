// Single source of truth for the landing-page FAQ. Used both to render the
// visible accordion and to emit FAQPage structured data on the homepage, so
// answer engines (Google, ChatGPT, Perplexity, etc.) can cite accurate answers.
export type LandingFaq = { q: string; a: string };

export const LANDING_FAQS: LandingFaq[] = [
  { q: "What is StoryLoop?", a: "StoryLoop is an early childhood documentation tool that turns real educator observations, voice notes, or bullet points into polished, editable learning story drafts — written in a natural educator voice, not generic AI phrasing." },
  { q: "Does StoryLoop replace educator thinking?", a: "No. StoryLoop supports drafting and structure, while educators remain responsible for observation, interpretation, reflection and final editing." },
  { q: "Can I edit the generated stories?", a: "Yes. You can edit a generated story, save changes, copy it, export it, and regenerate from the original observation using a different tone, depth, or curriculum mode." },
  { q: "Does it support Te Whāriki?", a: "Yes. New Zealand mode supports Te Whāriki strands, learning outcome ideas, dispositions, child voice, responding, and optional Kōwhiti Whakapae or Tapasā lenses when relevant." },
  { q: "Does it support EYLF?", a: "Yes. Australia mode supports EYLF V2.0 learning outcomes and keeps links grounded in what the educator actually observed." },
  { q: "Can I use voice notes?", a: "Yes. Supported browsers can request microphone access for live recording. If live recording is blocked or unavailable, you can still type bullet points or upload an audio file." },
  { q: "How many stories are free?", a: "The free plan includes 3 stories per month. Upgrade prompts are dismissible, and existing story history stays available even if the limit is reached." },
  { q: "What is Today Loop?", a: "Today Loop is a lightweight daily observation inbox. It surfaces up to three prompts from your own unfinished moments, next steps, and story history, then lets you capture a real moment and decide later whether it needs a story, planning response, or archive." },
  { q: "Do I need to write a learning story every day?", a: "No. StoryLoop is designed around educator judgement. A captured moment can become a story, be held for planning, or be archived; not every observation needs formal documentation." },
  { q: "Is it suitable for new educators?", a: "Yes. It helps new educators see how observation, learning, curriculum, dispositions, and responding can fit together, while still requiring educator review." },
  { q: "Is it suitable for experienced educators?", a: "Yes. Experienced educators can use it to speed up the first draft and then add their own local context, professional judgement, and final wording." },
  { q: "Does it create generic AI stories?", a: "No. StoryLoop grounds every claim in the observation, cleans rough notes into real prose, keeps each reflection specific to the child, and links curriculum only when the evidence supports it — so drafts read like a thoughtful educator wrote them." },
  { q: "What about child privacy? Is my data safe?", a: "Your observations are not used to train AI models. Data is stored securely and access-controlled. Educators should still avoid unnecessary identifying details in notes." },
  { q: "Does StoryLoop replace Storypark or my centre management system?", a: "Not by default. StoryLoop specialises in observation capture, educator-led drafting, review, planning signals, family-ready versions, and export. It does not claim to replace attendance, incident, consent, billing, or regulatory record systems." },
];
