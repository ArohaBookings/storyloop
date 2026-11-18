"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track-event";

/**
 * A ready message to copy (and, for a parent, to email): the one action on the
 * leader and parent pages (lib/buyer-pages.ts).
 *
 * Privacy: the message never leaves this browser except through the visitor's
 * own clipboard or mail app. What is counted is the tap (ui_action with a fixed
 * name and the page path), never the text. The greeting follows the device's
 * time zone ("Kia ora" in New Zealand), worked out after the page loads.
 */
export default function CopyMessage({
  message,
  page,
  action,
  copyLabel,
  editable = false,
  emailSubject,
  hint,
}: {
  /** The message, with {greeting} where the greeting goes. */
  message: string;
  /** This page's path, for the tap count. */
  page: string;
  /** Short code for the tap count: "<action>_copy" and "<action>_email". */
  action: string;
  copyLabel: string;
  editable?: boolean;
  /** Set to offer "Email it" as well. */
  emailSubject?: string;
  hint?: string;
}) {
  const [greeting, setGreeting] = useState("Hi");
  const [text, setText] = useState(() => message.replace("{greeting}", "Hi"));
  const [touched, setTouched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      if (zone === "Pacific/Auckland" || zone === "Pacific/Chatham") setGreeting("Kia ora");
    } catch {
      /* keep "Hi" */
    }
  }, []);
  // Until she edits it, the message follows the greeting.
  useEffect(() => {
    if (!touched) setText(message.replace("{greeting}", greeting));
  }, [greeting, message, touched]);

  const copy = async () => {
    trackEvent("ui_action", { action: `${action}_copy`, page });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setManual(false);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Some in-app browsers block the clipboard: select it so a long-press copies it.
      setManual(true);
      box.current?.focus();
      box.current?.select();
    }
  };

  const mailto = emailSubject ? `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(text)}` : null;

  return (
    <div className="min-w-0">
      <label htmlFor={`message-${action}`} className="sr-only">The message</label>
      <textarea
        ref={box}
        id={`message-${action}`}
        value={text}
        readOnly={!editable}
        onChange={(event) => { setText(event.target.value); setTouched(true); }}
        rows={editable ? 6 : 5}
        className="input resize-none text-[15px] leading-relaxed sm:text-sm"
        data-testid="buyer-message"
      />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={copy} className="btn-primary w-full justify-center py-3.5 text-base sm:w-auto" data-track={`${action}_copy`}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : copyLabel}
        </button>
        {mailto && (
          <a
            href={mailto}
            onClick={() => trackEvent("ui_action", { action: `${action}_email`, page })}
            className="btn-secondary w-full justify-center py-3.5 text-base sm:w-auto"
            data-track={`${action}_email`}
          >
            <Mail className="h-4 w-4" /> Email it to the centre
          </a>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-500" role={manual ? "status" : undefined}>
        {manual ? "Your browser would not copy it. Press and hold the message to copy it." : hint}
      </p>
    </div>
  );
}
