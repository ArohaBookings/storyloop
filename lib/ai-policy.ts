/**
 * A responsible-AI documentation policy an early childhood service can adopt.
 *
 * Why this exists: in Storypark's own 2025 sector research, 54% of ECE
 * organisations had no AI policy at all, and the most common concern about AI
 * was not ethics or privacy but lack of training and clear guidelines. Over 60%
 * of educators were already using tools like ChatGPT, mostly quietly. A policy
 * a director can adopt in ten minutes turns that quiet use into sanctioned use.
 *
 * DETERMINISTIC ON PURPOSE. Every sentence comes from this file. There is no
 * model call, so it cannot invent a clause, a statute, or a regulator's advice,
 * and it costs nothing however many centres use it. The only regulatory claims
 * made are ones verified on 2026-09-17:
 *
 *   NZ  Privacy Act 2020 and its 13 Information Privacy Principles; the Office
 *       of the Privacy Commissioner's guidance "Artificial Intelligence and the
 *       Information Privacy Principles" (September 2023), which asks for human
 *       review before acting on AI output and transparency about use.
 *   AU  Privacy Act 1988 and the Australian Privacy Principles, "where they apply"
 *       because many small services are exempt; the OAIC's "Guidance on privacy
 *       and the use of commercially available AI products" (October 2024), which
 *       recommends as best practice not entering personal information,
 *       particularly sensitive information, into publicly available generative
 *       AI tools.
 *
 * Tool-neutral in its principles. StoryLoop appears only as an editable entry
 * in the approved-tools list, never inside a rule, because a policy that reads
 * as an advert is a policy no director will sign.
 */

export type PolicyCountry = "NZ" | "AU";
export type ServiceType = "centre" | "kindergarten" | "home_based" | "group";
export type FamilyNoticeApproach = "inform" | "opt_out" | "opt_in";

export type PolicyInput = {
  serviceName: string;
  country: PolicyCountry;
  serviceType: ServiceType;
  /** Who gives final approval before AI-assisted documentation is shared. */
  approverRole: string;
  familyNotice: FamilyNoticeApproach;
  /** Tools the service approves for drafting. Free text, one per entry. */
  approvedTools: string[];
  /** How often the policy is reviewed, in months. */
  reviewMonths: number;
  /** ISO date the policy takes effect. */
  effectiveDate: string;
};

export type PolicySection = { heading: string; paragraphs: string[] };
export type Policy = { title: string; subtitle: string; sections: PolicySection[] };

const SERVICE_NOUN: Record<ServiceType, string> = {
  centre: "centre",
  kindergarten: "kindergarten",
  home_based: "home-based service",
  group: "service",
};

function clean(value: unknown, max: number, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.replace(/\s+/g, " ").trim().slice(0, max);
  return trimmed || fallback;
}

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "the date it is adopted";
  return date.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
}

export function normalizePolicyInput(raw: Partial<PolicyInput>): PolicyInput {
  const country: PolicyCountry = raw.country === "AU" ? "AU" : "NZ";
  const serviceType: ServiceType =
    raw.serviceType === "kindergarten" || raw.serviceType === "home_based" || raw.serviceType === "group"
      ? raw.serviceType
      : "centre";
  const familyNotice: FamilyNoticeApproach =
    raw.familyNotice === "opt_out" || raw.familyNotice === "opt_in" ? raw.familyNotice : "inform";
  const tools = Array.isArray(raw.approvedTools)
    ? raw.approvedTools.map((t) => clean(t, 60, "")).filter(Boolean).slice(0, 8)
    : [];
  const months = Number.isFinite(raw.reviewMonths) ? Math.round(raw.reviewMonths as number) : 12;

  return {
    serviceName: clean(raw.serviceName, 120, "Our service"),
    country,
    serviceType,
    approverRole: clean(raw.approverRole, 60, "the room leader"),
    familyNotice,
    approvedTools: tools,
    reviewMonths: Math.min(24, Math.max(3, months)),
    effectiveDate: typeof raw.effectiveDate === "string" ? raw.effectiveDate : "",
  };
}

export function generateAiPolicy(raw: Partial<PolicyInput>): Policy {
  const input = normalizePolicyInput(raw);
  const noun = SERVICE_NOUN[input.serviceType];
  const nz = input.country === "NZ";
  const curriculum = nz ? "Te Whāriki" : "the Early Years Learning Framework (EYLF)";
  // Singular and plural forms, and the article, chosen once. Inline ternaries
  // produced "a educator" in an earlier draft.
  const children = nz ? "tamariki" : "children";
  const child = nz ? "tamaiti" : "child";
  const families = nz ? "whānau" : "families";
  const family = nz ? "whānau" : "family";
  const educators = nz ? "kaiako" : "educators";
  const educator = nz ? "kaiako" : "educator";
  const anEducator = nz ? "a kaiako" : "an educator";
  const Educators = nz ? "Kaiako" : "Educators";
  const Families = nz ? "Whānau" : "Families";

  const law = nz
    ? "the Privacy Act 2020 and its thirteen Information Privacy Principles"
    : "the Privacy Act 1988 and the Australian Privacy Principles, where they apply to our service";
  const regulatorGuidance = nz
    ? "the Office of the Privacy Commissioner's guidance on artificial intelligence and the Information Privacy Principles"
    : "the Office of the Australian Information Commissioner's guidance on privacy and the use of commercially available AI products";

  const tools = input.approvedTools.length
    ? input.approvedTools
    : ["(List the tools your service approves here)"];

  const familyParagraph: Record<FamilyNoticeApproach, string> = {
    inform: `We tell ${families} that ${educators} may use approved AI tools to help draft documentation, and that ${anEducator} reviews every word before anything is shared. This is included in our enrolment information and on request.`,
    opt_out: `We tell ${families} that ${educators} may use approved AI tools to help draft documentation about their ${child}. Any ${family} can ask us not to, at any time, and we record and honour that choice for their ${child}.`,
    opt_in: `We do not use AI tools to help draft documentation about a ${child} until their ${family} has agreed. That agreement is recorded, can be withdrawn at any time, and is honoured from the moment it is withdrawn.`,
  };

  return {
    title: `${input.serviceName}: Responsible Use of AI in Documentation`,
    subtitle: `Effective ${formatDate(input.effectiveDate)}. Reviewed every ${input.reviewMonths} months.`,
    sections: [
      {
        heading: "1. Purpose",
        paragraphs: [
          `This policy sets out how ${input.serviceName} uses artificial intelligence tools to support, never replace, the professional work of documenting ${children}'s learning.`,
          `Documentation at our ${noun} is assessment for learning, grounded in ${curriculum}. It belongs to the relationship between ${educators}, ${children} and ${families}. AI may help with the drafting. It does not observe, interpret, or decide what a ${child} learned.`,
        ],
      },
      {
        heading: "2. Our principles",
        paragraphs: [
          `The ${educator} has the final word. Every AI-assisted draft is reviewed and edited by the person who saw the moment before it is shared or kept.`,
          `Interpretation, never invention. A draft may only describe what was actually observed. Anything the observation does not support is removed, not smoothed over.`,
          `A ${child}'s own words are kept exactly as they said them. They are not tidied into correct grammar, and no words are put in a ${child}'s mouth that they did not say.`,
          `We document ${children} in their full context, including their relationships, culture and ${family} aspirations, not as a checklist of developmental milestones.`,
        ],
      },
      {
        heading: "3. Approved tools",
        paragraphs: [
          `Only these tools may be used to help draft documentation about ${children} at our ${noun}:`,
          ...tools.map((tool) => `• ${tool}`),
          `A tool is added to this list only after we have checked that it keeps drafts private to the ${educator}, does not use our documentation to train its models, lets us export or delete our records, and supports human review before anything is shared.`,
        ],
      },
      {
        heading: `4. What never goes into a general AI tool`,
        paragraphs: [
          `${Educators} must not enter ${children}'s names, photos, health or developmental information, family circumstances, or any other identifying details into general-purpose or publicly available AI tools that are not on our approved list. This includes free chat assistants used on a personal device.`,
          nz
            ? `This follows ${regulatorGuidance}, which asks organisations to understand how a tool handles personal information before using it, and to be transparent about its use.`
            : `This follows ${regulatorGuidance}, which recommends as best practice that organisations do not enter personal information, and particularly sensitive information, into publicly available generative AI tools.`,
        ],
      },
      {
        heading: "5. Review before sharing",
        paragraphs: [
          `No AI-assisted documentation is shared with ${families}, placed in a ${child}'s record, or used for planning until it has been reviewed by the ${educator} who wrote it. Where our ${noun} requires it, ${input.approverRole} also approves it.`,
          `Reviewers check that the draft matches what happened, that nothing has been added, that curriculum links are genuinely supported, and that no other ${child} can be identified.`,
        ],
      },
      {
        heading: `6. ${Families}`,
        paragraphs: [familyParagraph[input.familyNotice]],
      },
      {
        heading: "7. Privacy",
        paragraphs: [
          `We handle all documentation in line with ${law}. Records created with AI assistance are held, corrected, and destroyed under the same rules as any other record about a ${child}.`,
          `If AI-assisted documentation is ever shared in error, or a tool is found not to meet this policy, we treat it as a privacy incident under our existing procedures.`,
        ],
      },
      {
        heading: "8. Professional practice",
        paragraphs: [
          `Using an approved tool is a legitimate part of professional practice at our ${noun}, not a shortcut to be hidden. ${Educators} are encouraged to talk openly about how they use it, what works, and where a draft got something wrong.`,
          `We support ${educators} to use these tools well, and we never measure or rank ${educators} by how much documentation they produce.`,
        ],
      },
      {
        heading: "9. Review",
        paragraphs: [
          `This policy is reviewed every ${input.reviewMonths} months, or sooner if our tools, the law, or regulator guidance changes. ${Educators} and ${families} are invited to contribute to each review.`,
        ],
      },
    ],
  };
}

/** Plain text, for pasting into a policy manual or an email. */
export function policyToText(policy: Policy) {
  return [
    policy.title,
    policy.subtitle,
    "",
    ...policy.sections.flatMap((section) => [section.heading, ...section.paragraphs, ""]),
    "This policy is a starting point generated by StoryLoop (storyloop.space). Review it against your own service's governance and obtain your own advice where needed.",
  ].join("\n");
}
