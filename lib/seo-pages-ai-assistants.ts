/**
 * AI assistant guides, 27 Oct 2026 (Leo: "do more AI assistant pages… more work
 * on Bing"). Educators now ask Copilot, Gemini and ChatGPT directly, and those
 * answers cite pages that answer the exact question. The ChatGPT guide already
 * existed; these add Microsoft Copilot (built into Bing and Microsoft 365, which
 * many centres use), Google Gemini, and a copy-and-paste prompt library that is
 * useful on its own whatever tool a teacher uses.
 *
 * Facts checked on 27 Oct 2026 against the sources on each page: Microsoft's
 * consumer data-use announcement and controls, Google's Workspace admin help on
 * the Gemini app, and the OAIC and NZ Privacy Commissioner guidance already
 * cited on the ChatGPT guide. Wording is hedged where the providers' terms
 * depend on the account type, and every page tells readers to check current
 * terms. No em dashes, no invented statistics.
 */
import type { SeoPage } from "./seo-pages";

type Block = { heading: string; paragraphs: string[] };

const PRIVACY_SOURCES = [
  { label: "OAIC: Guidance on privacy and the use of commercially available AI products (21 October 2024)", url: "https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products" },
  { label: "Office of the Privacy Commissioner (NZ): Generative artificial intelligence", url: "https://www.privacy.org.nz/resources-and-learning/a-z-topics/ai/generative-artificial-intelligence/" },
];

export const AI_ASSISTANT_PAGES: Record<string, SeoPage> = {
  "copilot-for-learning-stories": {
    slug: "copilot-for-learning-stories",
    title: "Can You Use Microsoft Copilot to Write Learning Stories?",
    description:
      "What happens to a child's details in Microsoft Copilot on a personal or work account, what the NZ and Australian privacy regulators recommend, and a safer way to use it.",
    kicker: "AI guide · Microsoft Copilot",
    heading: "Copilot can draft a learning story. Which account you use matters more than the prompt.",
    intro:
      "Copilot is already on many centre laptops, built into Windows, Edge, Bing and Microsoft 365. Paste a note in and you will get a learning story back in seconds. Before you do, it is worth knowing that Copilot on a personal Microsoft account and Copilot on a centre's work account handle what you type differently, and that both privacy regulators on our side of the Tasman recommend keeping children's personal information out of public AI tools.",
    reviewedAt: "2026-10-27",
    sections: [
      {
        title: "Personal account or work account",
        body:
          "Microsoft says it may use conversations from consumer Copilot, when you are signed in with a personal Microsoft account, to train its AI models unless you opt out in your privacy settings. Copilot through a centre's work or school account (Microsoft 365 Copilot or Copilot Chat with enterprise data protection) is covered by your organisation's agreement instead. Check which one you are signed in to.",
      },
      {
        title: "The privacy line",
        body:
          "Australia's OAIC recommends not entering personal information, particularly sensitive information, into publicly available generative AI tools. New Zealand's Privacy Commissioner recommends not uploading personal or confidential information unless the provider confirms it is not kept or disclosed. A child's name, age, family details and photos are personal information.",
      },
      {
        title: "The accuracy line",
        body:
          "Like any general chatbot, Copilot fills gaps with things nobody saw: feelings, intentions, and curriculum links the note does not support. Every sentence has to be checked against what you actually observed.",
      },
    ],
    faqs: [
      {
        question: "Does Microsoft Copilot use what I type to train its models?",
        answer:
          "On a personal Microsoft account, Microsoft says consumer Copilot conversations may be used for training unless you opt out in Copilot's privacy settings. On a work or school account with enterprise data protection, Microsoft says prompts are not used to train its foundation models. Settings and terms change, so check the current ones for the account you use.",
      },
      {
        question: "Is Copilot through our centre's Microsoft 365 safe for children's information?",
        answer:
          "It is a much better starting point than a personal account, because your organisation's agreement applies. It still does nothing for accuracy, and your service's own policy decides what may be entered. Many services allow notes without names and keep identifying details out entirely.",
      },
      {
        question: "Can Copilot use Te Whāriki or EYLF V2.0 correctly?",
        answer:
          "Sometimes. It often mixes frameworks, uses outcome wording that is not in EYLF V2.0, or links a moment to every strand that sounds plausible. Name the framework in your prompt and check each link against the moment yourself.",
      },
      {
        question: "How is StoryLoop different from Copilot?",
        answer:
          "StoryLoop is built only for learning stories. It uses the right curriculum for your country, checks every quote against your note, shows what each claim is built on, keeps notes in Sydney, and its AI providers' business terms do not allow your notes to be used for training. You still edit and sign off every word.",
      },
    ],
    sources: [
      { label: "Microsoft: Transparency and control in consumer data use (16 August 2024)", url: "https://www.microsoft.com/en-us/microsoft-copilot/blog/2024/08/16/transparency-and-control-in-consumer-data-use/" },
      { label: "Microsoft: Take charge of your Copilot experience (28 January 2025)", url: "https://www.microsoft.com/en-us/microsoft-copilot/for-individuals/do-more-with-ai/general-ai/take-charge-of-your-copilot-experience" },
      ...PRIVACY_SOURCES,
    ],
  },

  "gemini-for-learning-stories": {
    slug: "gemini-for-learning-stories",
    title: "Can You Use Google Gemini to Write Learning Stories?",
    description:
      "How Google Gemini treats what you type on a personal account versus a school or centre Workspace account, what the privacy regulators recommend, and a safer way to use it.",
    kicker: "AI guide · Google Gemini",
    heading: "Gemini will write a learning story. Read where your note goes first.",
    intro:
      "If your centre runs on Google, Gemini is one click away in Gmail, Docs and the Gemini app. It writes quickly and it writes confidently, which is exactly why it needs care. What happens to a note depends on whether you are signed in with a personal Google account or a qualifying Google Workspace account, and the privacy regulators in New Zealand and Australia both recommend keeping children's personal information out of public AI tools.",
    reviewedAt: "2026-10-27",
    sections: [
      {
        title: "Personal Google account",
        body:
          "Google's own Workspace help says that people using the Gemini app without a qualifying Workspace edition are covered by Google's consumer terms and the Gemini Apps Privacy Notice, and that their chats may be reviewed by human reviewers and used to improve Google's products and machine-learning technologies.",
      },
      {
        title: "Qualifying Workspace account",
        body:
          "For qualifying Google Workspace editions, including Workspace for Education, Google says Gemini comes with enterprise-grade data protections: content is not reviewed by humans or used to train generative AI models outside your organisation without permission. Your administrator can confirm which terms apply to your account.",
      },
      {
        title: "The accuracy line",
        body:
          "Gemini, like every general chatbot, adds what it thinks is likely: the child \"beamed with pride\", or links to four outcomes because they all sound right. A learning story should only claim what an educator saw.",
      },
    ],
    faqs: [
      {
        question: "Does Google Gemini keep and read my notes?",
        answer:
          "On a personal account, Google says Gemini chats may be reviewed by human reviewers and used to improve its products. On a qualifying Workspace account, Google says content is not human reviewed or used for generative AI training outside your organisation without permission. Check your account type and Google's current terms.",
      },
      {
        question: "Is it OK to use Gemini if I take the child's name out?",
        answer:
          "Removing names, ages, family details and anything distinctive lowers the risk a lot, and it is what the regulators' guidance points towards. In a small community a detailed observation can still identify a child, so keep it general, and follow your service's own policy.",
      },
      {
        question: "Can Gemini write to Te Whāriki or EYLF V2.0?",
        answer:
          "It knows both frameworks, but it regularly overclaims links and mixes EYLF versions. Tell it which framework to use, ask it to link only what the note shows, and check every link yourself.",
      },
      {
        question: "Why use StoryLoop instead of Gemini?",
        answer:
          "StoryLoop does one job. It checks the child's words against your note, uses the right framework for your country, shows what each claim is built on and what it had to assume, flags privacy risks, and keeps your notes out of AI training. Three stories a month are free, so you can compare it with Gemini on your own notes.",
      },
    ],
    sources: [
      { label: "Google Workspace Admin Help: Turn the Gemini app on or off", url: "https://knowledge.workspace.google.com/admin/generative-ai/gemini-app/turn-the-gemini-app-on-or-off" },
      ...PRIVACY_SOURCES,
    ],
  },

  "ai-prompts-for-learning-stories": {
    slug: "ai-prompts-for-learning-stories",
    title: "AI Prompts for Learning Stories: Copy and Paste (Te Whāriki and EYLF)",
    description:
      "Seven copy-and-paste AI prompts for learning stories, next steps, family-friendly versions and curriculum links, for Te Whāriki and EYLF V2.0, plus the checks every draft needs.",
    kicker: "Prompts · Any AI tool",
    heading: "Seven prompts that make any AI write a better learning story.",
    intro:
      "Whether you use ChatGPT, Copilot, Gemini or StoryLoop, the same rules make a draft worth keeping: use only what was observed, keep the child's words exactly, link the curriculum only where the moment shows it, and leave the judgement to the educator. These prompts build those rules in. Copy them, replace the parts in square brackets, and keep names and identifying details out of any public AI tool.",
    reviewedAt: "2026-10-27",
    sections: [
      {
        title: "Write the note first",
        body:
          "No prompt rescues a vague note. Two or three sentences about one moment, what the child did and said (in their exact words), and what happened next, is enough for any good draft.",
      },
      {
        title: "Ask for structure, not judgement",
        body:
          "\"Organise this note into a learning story\" is safer than \"Tell me what this child is learning\". You were there. The AI was not.",
      },
      {
        title: "Check every line",
        body:
          "Delete anything you did not see, any feeling you cannot back up, and any curriculum link the moment does not show. The finished story is yours.",
      },
    ],
    faqs: [
      {
        question: "What is the best AI prompt for a learning story?",
        answer:
          "One that tells the AI to use only what is in your note, to quote the child exactly, to name the framework (Te Whāriki or EYLF V2.0) and link only what the note shows, to avoid praise words and diagnosis language, and to end with a next step a teacher could do tomorrow. Prompt 1 on this page does all of that.",
      },
      {
        question: "Should I put the child's name in an AI prompt?",
        answer:
          "Not in a public AI tool. Use a placeholder such as [child] and add the name when you paste the story into your centre's platform. Both the OAIC and New Zealand's Privacy Commissioner recommend keeping personal information out of public generative AI tools.",
      },
      {
        question: "Do these prompts work in StoryLoop?",
        answer:
          "StoryLoop already works this way, so you only need the note. It checks quotes against the note, links the right framework, writes the next step and a family version, and lists what to check before you sign it off.",
      },
    ],
    sources: [
      ...PRIVACY_SOURCES,
      { label: "Ministry of Education (NZ): Te Whāriki", url: "https://tewhariki.tahurangi.education.govt.nz/" },
      { label: "ACECQA: Approved learning frameworks (EYLF V2.0)", url: "https://www.acecqa.gov.au/nqf/national-law-regulations/approved-learning-frameworks" },
    ],
  },
};

const SAFER_WAY: Block = {
  heading: "A safer way to use a general AI assistant",
  paragraphs: [
    "Check your service's policy first. Some services do not allow general AI tools for anything about children, and that decision is theirs to make.",
    "If it is allowed: describe what happened, not who it happened to. Use [child] instead of the name, leave out ages, family details, health information and anything distinctive, and never paste photos.",
    "Ask for structure, not judgement, and name your framework: \"Organise this note into a learning story with the moment, the learning, one Te Whāriki link the note supports, and a next step.\"",
    "Then read every sentence against your note. Delete anything you did not see, anything about the child's feelings you cannot back up, and any link the moment does not show.",
  ],
};

const PURPOSE_BUILT: Block = {
  heading: "When a purpose-built tool is worth it",
  paragraphs: [
    "If you write one learning story a month, a careful prompt and a careful read may be all you need. If you write ten a week, the checking adds up, and so does the risk of a child's details sitting in a chat history.",
    "StoryLoop was built for that: your note goes in, the draft comes back with what every claim is built on, the child's words checked against your note, the right curriculum for your country, and a list of what to check. Notes stay in Sydney and are never used for training. Three stories a month are free.",
  ],
};

export const AI_ASSISTANT_DEEP_DIVES: Record<string, Block[]> = {
  "copilot-for-learning-stories": [
    {
      heading: "How to check which Copilot you are using",
      paragraphs: [
        "Look at the account in the top corner of Copilot or Edge. A centre email address usually means a work account covered by your organisation's agreement; a personal Outlook, Hotmail or Live address means consumer Copilot.",
        "On a personal account, Copilot's settings include a privacy section where you can turn off the use of your conversations for model training. Microsoft says it can take time for that change to apply.",
        "Not sure? Ask whoever manages your centre's Microsoft 365. They can tell you whether Copilot is covered by enterprise data protection.",
      ],
    },
    SAFER_WAY,
    {
      heading: "A prompt that works well in Copilot",
      paragraphs: [
        "\"You are helping an early childhood teacher in [New Zealand / Australia]. Using only the note below, write a learning story with: what happened, the learning we noticed, one or two links to [Te Whāriki / EYLF V2.0] that the note clearly shows, a next step a teacher could do tomorrow, and a short family link. Quote the child's words exactly as written. Do not add feelings, intentions or details that are not in the note, and do not use diagnosis language. Use [NZ / Australian] spelling. Note: [your note, with [child] instead of the name]\"",
        "More prompts for next steps, family versions and curriculum checks are on our prompt page.",
      ],
    },
    PURPOSE_BUILT,
  ],
  "gemini-for-learning-stories": [
    {
      heading: "How to tell which Gemini terms apply",
      paragraphs: [
        "If you open Gemini from a centre or school Google Workspace account, your organisation's agreement may give you Workspace data protections; your administrator can confirm. If you use a personal Gmail account, the consumer terms apply.",
        "On a personal account, the Gemini Apps activity setting controls whether your chats are kept in your Google account. Check Google's current Gemini Apps Privacy Hub for exactly what it covers before relying on it.",
      ],
    },
    SAFER_WAY,
    {
      heading: "A prompt that works well in Gemini",
      paragraphs: [
        "\"Write a learning story for an early childhood teacher in [New Zealand / Australia] from the note below. Sections: the moment, the learning we noticed, [Te Whāriki / EYLF V2.0] links (only the ones the note clearly shows, at most two), where to next, and a family link. Keep the child's words exactly as written in quotation marks. Do not invent feelings, intentions or events. Avoid words like amazing, wonderful and journey. Note: [your note, with [child] instead of the name]\"",
      ],
    },
    PURPOSE_BUILT,
  ],
  "ai-prompts-for-learning-stories": [
    {
      heading: "Prompt 1: the learning story",
      paragraphs: [
        "\"You are helping an early childhood teacher in [New Zealand / Australia]. Using only the note below, write a learning story with these sections: the moment (what happened), the learning we noticed, curriculum links ([Te Whāriki strands / EYLF V2.0 outcomes], at most two, and only ones the note clearly shows, each with one sentence saying why), where to next (something a teacher can do tomorrow), and a short family link. Quote the child's words exactly as written. Do not add feelings, intentions, events or details that are not in the note. No diagnosis language. No praise words like amazing, wonderful or journey. Use [NZ / Australian] spelling. Note: [note with [child] instead of the name]\"",
      ],
    },
    {
      heading: "Prompt 2: a next step that is actually a next step",
      paragraphs: [
        "\"From this note, suggest three next steps for [child]. Each must name an action a teacher could take tomorrow (offer, set out, sit nearby, ask, give time), a material or space, and what to watch for. No generic lines such as 'we will continue to support their interest'. Note: [note]\"",
      ],
    },
    {
      heading: "Prompt 3: check my curriculum links",
      paragraphs: [
        "\"Here is a learning story and the links I chose to [Te Whāriki / EYLF V2.0]. For each link, quote the sentence in the story that shows it. If no sentence shows it, say so plainly. Do not suggest extra links. Story: [story] Links: [links]\"",
      ],
    },
    {
      heading: "Prompt 4: a family-friendly version",
      paragraphs: [
        "\"Rewrite this learning story for the child's family in warm, plain English, under 120 words, with no curriculum jargon. Keep the child's words exactly. End with one simple idea the family could try at home. Story: [story]\"",
      ],
    },
    {
      heading: "Prompt 5: spot anything I did not see",
      paragraphs: [
        "\"Compare this learning story with my original note. List every sentence in the story that is not supported by the note, including any feelings, intentions or events I did not record. Story: [story] Note: [note]\"",
      ],
    },
    {
      heading: "Prompt 6: turn a voice note into a clean observation",
      paragraphs: [
        "\"Tidy this voice-note transcript into a short factual observation of 2 to 4 sentences. Keep what the child did and said in order, keep the child's words exactly, remove filler words, and add nothing. Transcript: [transcript]\"",
      ],
    },
    {
      heading: "Prompt 7: a group learning story",
      paragraphs: [
        "\"Write a group learning story from the note below for [number] children, using placeholders [child 1], [child 2]. Describe what the group did together, one thing each child contributed (only from the note), one curriculum link the note shows, and a next step for the group. Quote children exactly. Note: [note]\"",
      ],
    },
    {
      heading: "Before you sign it off",
      paragraphs: [
        "Every quote matches what the child said. Every link points to a sentence that shows it. Nothing describes a feeling you did not see. Nothing identifies the child beyond what your service allows. The next step is something someone could do tomorrow.",
        "StoryLoop runs these checks on every draft and shows you the result, so you can see in one place what the story is built on and what to check.",
      ],
    },
  ],
};
