// Single source of truth for the homepage FAQ. Used both to render the visible
// accordion and to emit FAQPage structured data on the homepage, so the two can
// never disagree (answer engines extract the visible text, and a schema that
// claims questions the page does not show is worse than no schema).
//
// Seven questions, chosen from the fourteen this used to hold: the ones a
// visitor is actually deciding on (is it right for me, what does it cost, is it
// safe, will I have to switch). The rest live on /faq, which needed them.
export type LandingFaq = { q: string; a: string };

export const LANDING_FAQS: LandingFaq[] = [
  { q: "What is StoryLoop?", a: "StoryLoop turns a quick educator note, typed or spoken, into an editable learning story draft with Te Whāriki or EYLF links. It is written in a natural educator voice, and you check and edit every word before anything is shared." },
  { q: "Do I have to stop using Storypark or Educa?", a: "No. StoryLoop writes the draft, then you copy or export it into Storypark, Educa, Kinderloop, Brightwheel or whatever your centre already uses. Nothing migrates and nothing is replaced." },
  { q: "Does it support Te Whāriki and EYLF?", a: "Yes. New Zealand mode supports Te Whāriki strands, learning outcomes and dispositions, with optional Kōwhiti Whakapae or Tapasā lenses. Australia mode supports EYLF V2.0 outcomes. Links are only made where the observation supports them." },
  { q: "How much does it cost?", a: "Three stories a month are free with no card. Educator is NZ$21 or A$19 a month for unlimited stories. Centre Starter covers up to 10 educators and unlimited children for NZ$109 or A$99 a month. Individual plans start with a 7-day free trial, centres get 30 days free with no card, and you can cancel any time." },
  { q: "Does it write generic AI stories?", a: "No. Every claim is grounded in what you wrote, children's words are kept exactly as they said them, and curriculum links are only made when the evidence supports them. Drafts are checked for invented details before you see them." },
  { q: "How do I know it will not make things up?", a: "Every draft shows what it rests on from your note and lists what it assumed, so you can check both before sharing. And every change to how stories are written is tested first on the same 24 notes: in the latest test, none of 48 drafts put words in a child's mouth. The full results, including what is still being improved, are in the accuracy report at storyloop.space/accuracy." },
  { q: "What about children's privacy?", a: "Stories and child profiles are stored in Sydney, Australia, and are never used to train AI models. StoryLoop never keeps children's voice recordings, and anything shared with families outside StoryLoop carries no names, photographs or dates. Nothing is shared until you choose to." },
  { q: "Can I edit the stories?", a: "Yes. Edit anything, save it to your history, copy it, export it, or redraft from the original note in a different tone or depth. Redrafting a story you already wrote never uses up a free story." },
];
