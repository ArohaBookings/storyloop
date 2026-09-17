"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Printer, ShieldCheck } from "lucide-react";
import {
  generateAiPolicy,
  policyToText,
  type FamilyNoticeApproach,
  type PolicyCountry,
  type ServiceType,
} from "@/lib/ai-policy";
import { track } from "@/lib/analytics/client";

export default function PolicyGenerator() {
  const [serviceName, setServiceName] = useState("");
  const [country, setCountry] = useState<PolicyCountry>("NZ");
  const [serviceType, setServiceType] = useState<ServiceType>("centre");
  const [approverRole, setApproverRole] = useState("the centre manager");
  const [familyNotice, setFamilyNotice] = useState<FamilyNoticeApproach>("inform");
  const [toolsText, setToolsText] = useState("StoryLoop");
  const [reviewMonths, setReviewMonths] = useState(12);
  // Set after mount, not during render: the server and the browser can disagree
  // on the date near midnight UTC, which would be a hydration mismatch.
  const [effectiveDate, setEffectiveDate] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setEffectiveDate(local.toISOString().slice(0, 10));
  }, []);

  const policy = useMemo(
    () =>
      generateAiPolicy({
        serviceName, country, serviceType, approverRole, familyNotice,
        approvedTools: toolsText.split("\n"), reviewMonths, effectiveDate,
      }),
    [serviceName, country, serviceType, approverRole, familyNotice, toolsText, reviewMonths, effectiveDate],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(policyToText(policy));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
      track("cta_click", { cta: "ai_policy_copy", country });
    } catch {
      /* clipboard blocked; the policy is still selectable on the page */
    }
  };

  const print = () => {
    track("cta_click", { cta: "ai_policy_print", country });
    window.print();
  };

  const field = "input w-full";
  const label = "label";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
      {/* --------------------------------------------------------------- form */}
      <div className="card space-y-4 p-5 sm:p-6 print:hidden">
        <div>
          <label htmlFor="policy-service" className={label}>Service name</label>
          <input id="policy-service" value={serviceName} onChange={(e) => setServiceName(e.target.value)}
            placeholder="Sunnyside Early Learning" className={field} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="policy-country" className={label}>Country</label>
            <select id="policy-country" value={country} onChange={(e) => setCountry(e.target.value as PolicyCountry)} className={field}>
              <option value="NZ">Aotearoa New Zealand</option>
              <option value="AU">Australia</option>
            </select>
          </div>
          <div>
            <label htmlFor="policy-type" className={label}>Service type</label>
            <select id="policy-type" value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)} className={field}>
              <option value="centre">Education and care centre</option>
              <option value="kindergarten">Kindergarten</option>
              <option value="home_based">Home-based service</option>
              <option value="group">Group of services</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="policy-approver" className={label}>Who approves documentation, if anyone besides its author</label>
          <input id="policy-approver" value={approverRole} onChange={(e) => setApproverRole(e.target.value)} className={field} />
        </div>

        <fieldset>
          <legend className={label}>How families are told</legend>
          <div className="mt-1 space-y-2">
            {([
              ["inform", "Inform families", "Families are told AI may help draft, and that an educator reviews everything."],
              ["opt_out", "Families can opt out", "AI may be used unless a family asks you not to."],
              ["opt_in", "Families opt in", "No AI help with a child's documentation until their family agrees."],
            ] as const).map(([value, title, body]) => (
              <label key={value} htmlFor={`notice-${value}`}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${familyNotice === value ? "border-clay-400 bg-cream-50" : "border-clay-100 bg-white hover:border-clay-200"}`}>
                <input id={`notice-${value}`} type="radio" name="family-notice" value={value}
                  checked={familyNotice === value} onChange={() => setFamilyNotice(value)} className="mt-1" />
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{title}</span>
                  <span className="block text-xs leading-relaxed text-ink-500">{body}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="policy-tools" className={label}>Approved tools, one per line</label>
          <textarea id="policy-tools" rows={3} value={toolsText} onChange={(e) => setToolsText(e.target.value)} className={`${field} resize-none`} />
          <p className="mt-1 text-xs text-ink-500">Only list tools you have checked keep drafts private and do not train on your records.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="policy-review" className={label}>Review every</label>
            <select id="policy-review" value={reviewMonths} onChange={(e) => setReviewMonths(Number(e.target.value))} className={field}>
              {[6, 12, 24].map((m) => <option key={m} value={m}>{m} months</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="policy-date" className={label}>Takes effect</label>
            <input id="policy-date" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={field} />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ policy */}
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={copy} className="btn-primary text-sm">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy policy"}
          </button>
          <button type="button" onClick={print} className="btn-secondary text-sm">
            <Printer className="h-4 w-4" /> Print or save as PDF
          </button>
        </div>

        <article className="card story-safe p-6 sm:p-8 print:border-0 print:p-0 print:shadow-none">
          <h2 className="font-display text-2xl font-bold leading-tight text-ink-900 text-balance">{policy.title}</h2>
          <p className="mt-1 text-sm text-ink-500">{policy.subtitle}</p>
          <div className="mt-6 space-y-6">
            {policy.sections.map((section) => (
              <section key={section.heading} className="break-inside-avoid">
                <h3 className="font-display text-lg font-bold text-ink-900">{section.heading}</h3>
                <div className="mt-2 space-y-2">
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index} className="text-[15px] leading-relaxed text-ink-700">{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <p className="mt-8 border-t border-clay-100 pt-4 text-xs leading-relaxed text-ink-500">
            This policy is a starting point generated by StoryLoop. Review it against your own service&apos;s governance and
            obtain your own advice where needed.
          </p>
        </article>

        <div className="mt-5 rounded-2xl border border-sage-200 bg-sage-50/70 p-5 print:hidden">
          <p className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
            <ShieldCheck className="h-4 w-4 text-sage-600" /> Need a tool that meets it?
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
            StoryLoop was built around these principles: drafts stay private to the educator, nothing is invented, a
            child&apos;s words are kept exactly, and nothing is shared without review. Centre plans let leadership see who is
            documenting without reading anyone&apos;s drafts unless they choose to share.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/signup" className="btn-primary text-sm" onClick={() => track("cta_click", { cta: "ai_policy_signup", country })}>
              Start free
            </Link>
            <Link href="/responsible-ai-ece-documentation" className="btn-secondary text-sm">Read the practice guide</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
