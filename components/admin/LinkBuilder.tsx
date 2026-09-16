"use client";
import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import {
  CHANNELS,
  CHANNEL_GROUP_LABELS,
  LINK_TARGETS,
  buildTaggedUrl,
  type Channel,
  type ChannelGroup,
} from "@/lib/channels";

const GROUP_ORDER: ChannelGroup[] = ["community", "publication", "partner", "education", "directory", "local"];

export default function LinkBuilder({ origin }: { origin: string }) {
  const [channelKey, setChannelKey] = useState(CHANNELS[0].key);
  const [target, setTarget] = useState(LINK_TARGETS[0].path);
  const [campaign, setCampaign] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const channel = useMemo(
    () => CHANNELS.find((c) => c.key === channelKey) ?? CHANNELS[0],
    [channelKey],
  );
  const url = useMemo(
    () => buildTaggedUrl(origin, target, channel, campaign),
    [origin, target, channel, campaign],
  );

  const copy = async (value: string, id: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    } catch {
      /* clipboard can be blocked; the field is selectable either way */
    }
  };

  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    items: CHANNELS.filter((c) => c.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------ builder */}
      <div className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-300">Channel</span>
            <select
              id="link-channel"
              value={channelKey}
              onChange={(e) => setChannelKey(e.target.value)}
              className="w-full rounded-xl border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-white"
            >
              {grouped.map((g) => (
                <optgroup key={g.group} label={CHANNEL_GROUP_LABELS[g.group]}>
                  {g.items.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-300">Lands on</span>
            <select
              id="link-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-xl border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-white"
            >
              {LINK_TARGETS.map((t) => (
                <option key={t.path} value={t.path}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-300">
              Campaign <span className="font-normal normal-case text-ink-400">(e.g. sep-week-3)</span>
            </span>
            <input
              id="link-campaign"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="sep-week-3"
              className="w-full rounded-xl border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-white placeholder:text-ink-500"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl border border-clay-500/40 bg-ink-950 px-3 py-2.5 font-mono text-xs text-clay-200">
            {url}
          </code>
          <button
            type="button"
            onClick={() => copy(url, "main")}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-clay-500 bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay-500"
          >
            {copied === "main" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === "main" ? "Copied" : "Copy link"}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-ink-700 bg-ink-950/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-300">Before you post here</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-200">{channel.rules}</p>
          {(channel.reach || channel.url) && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
              {channel.reach && <span>{channel.reach}</span>}
              {channel.url && (
                <a
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-clay-400 hover:text-clay-300"
                >
                  {channel.url.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------- the whole playbook */}
      {grouped.map((g) => (
        <div key={g.group}>
          <h2 className="mb-3 font-display text-lg font-bold text-white">{CHANNEL_GROUP_LABELS[g.group]}</h2>
          <div className="space-y-2">
            {g.items.map((c: Channel) => {
              const rowUrl = buildTaggedUrl(origin, target, c, campaign);
              return (
                <div key={c.key} className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{c.label}</p>
                      {c.reach && <p className="mt-0.5 text-xs text-ink-400">{c.reach}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => copy(rowUrl, c.key)}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-200 hover:border-clay-500 hover:text-white"
                    >
                      {copied === c.key ? <Check className="h-3.5 w-3.5 text-sage-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === c.key ? "Copied" : "Copy tagged link"}
                    </button>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">{c.rules}</p>
                  <p className="mt-2 font-mono text-[11px] text-ink-500">
                    utm_source={c.source} · utm_medium={c.medium}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
