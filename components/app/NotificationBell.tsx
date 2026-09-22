"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CreditCard,
  Gift,
  Hourglass,
  QrCode,
  Sprout,
  Users,
  X,
} from "lucide-react";
import type { AppNotification, NotificationKind } from "@/lib/notifications";

/**
 * The bell, with a red count of what is new since the educator last looked.
 *
 * Two bells are mounted (the phone bar and the desktop bar, one hidden by CSS),
 * so the data lives in one small module-level store: one request per page load,
 * both bells always agree, and opening either clears both.
 *
 * Opening the panel is what "seen" means. The ids go to the server, and to the
 * browser as well, so the count still clears if the server cannot store them.
 */

type Snapshot = { items: AppNotification[]; seen: string[]; loaded: boolean };

const LOCAL_KEY = "storyloop-notifications-seen";
let snapshot: Snapshot = { items: [], seen: [], loaded: false };
let inflight: Promise<void> | null = null;
let lastLoad = 0;
const listeners = new Set<() => void>();

function emit(next: Snapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function localSeen(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function rememberLocally(ids: string[]) {
  try {
    const merged = [...new Set([...localSeen(), ...ids])].slice(-100);
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
  } catch { /* blocked storage: the server copy is the record */ }
}

function load(force = false) {
  // Refresh at most every ten minutes, and only when asked (mount or focus).
  if (inflight || (!force && snapshot.loaded && Date.now() - lastLoad < 10 * 60_000)) return inflight;
  inflight = fetch("/api/notifications", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data || !Array.isArray(data.items)) return;
      lastLoad = Date.now();
      emit({ items: data.items, seen: [...new Set([...(data.seen ?? []), ...localSeen()])], loaded: true });
    })
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function markAllSeen() {
  const ids = snapshot.items.map((item) => item.id);
  const fresh = ids.filter((id) => !snapshot.seen.includes(id));
  if (fresh.length === 0) return;
  rememberLocally(ids);
  emit({ ...snapshot, seen: [...new Set([...snapshot.seen, ...ids])] });
  void fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "seen", ids }),
    keepalive: true,
  }).catch(() => {});
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: Snapshot = { items: [], seen: [], loaded: false };

const ICONS: Record<NotificationKind, typeof Bell> = {
  billing: CreditCard,
  trial: Hourglass,
  referral: Gift,
  quiet: Sprout,
  wall: QrCode,
  term: CalendarClock,
  allowance: CreditCard,
  invite: Users,
};

function ago(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 0) return "Coming up";
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "Last week" : `${weeks} weeks ago`;
}

export default function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
  const [open, setOpen] = useState(false);
  // What was new at the moment the panel opened, so the dots stay put while
  // it is open even though the count has already cleared.
  const [newWhenOpened, setNewWhenOpened] = useState<string[]>([]);
  const panelId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const unseen = state.items.filter((item) => !state.seen.includes(item.id)).length;

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }, []);

  const toggle = () => {
    if (open) return close();
    setNewWhenOpened(state.items.filter((item) => !state.seen.includes(item.id)).map((item) => item.id));
    setOpen(true);
    markAllSeen();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const onPointer = (event: PointerEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  const label = unseen > 0 ? `Notifications, ${unseen} new` : "Notifications";

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        data-testid="notification-bell"
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
          open ? "border-clay-300 bg-cream-100 text-ink-900" : "border-transparent text-ink-600 hover:bg-cream-100 hover:text-ink-900"
        }`}
      >
        <Bell className="h-5 w-5" strokeWidth={1.9} />
        {unseen > 0 && (
          <span
            aria-hidden="true"
            data-testid="notification-count"
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold leading-none text-white ring-2 ring-white"
          >
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className={`fixed inset-x-3 top-16 z-[80] flex max-h-[min(34rem,calc(100dvh-5rem))] flex-col overflow-hidden rounded-2xl border border-clay-200 bg-white shadow-warm sm:absolute sm:inset-x-auto sm:top-12 sm:w-[24rem] ${
            align === "right" ? "sm:right-0" : "sm:left-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-clay-100 px-5 py-3.5">
            <p className="font-display text-lg font-bold text-ink-900">Notifications</p>
            <button
              type="button"
              onClick={() => close(true)}
              aria-label="Close notifications"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-cream-100 hover:text-ink-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!state.loaded ? (
            <div className="space-y-3 p-5" aria-busy="true">
              {[0, 1].map((row) => (
                <div key={row} className="flex gap-3">
                  <div className="h-9 w-9 flex-none animate-pulse rounded-xl bg-cream-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-cream-100" />
                    <div className="h-3 w-full animate-pulse rounded bg-cream-50" />
                  </div>
                </div>
              ))}
            </div>
          ) : state.items.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Bell className="mx-auto h-8 w-8 text-clay-300" strokeWidth={1.5} />
              <p className="mt-3 text-base font-semibold text-ink-900">Nothing new</p>
              <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-ink-500">
                StoryLoop only writes here when something is worth your time, a couple of times a week at most.
              </p>
            </div>
          ) : (
            <ul className="min-h-0 divide-y divide-clay-100 overflow-y-auto">
              {state.items.map((item) => {
                const Icon = item.urgent ? AlertTriangle : ICONS[item.kind] ?? Bell;
                const isNew = newWhenOpened.includes(item.id);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => close()}
                      className="flex gap-3 px-5 py-4 transition-colors hover:bg-cream-50 focus-visible:bg-cream-50"
                    >
                      <span
                        className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${
                          item.urgent ? "bg-red-50 text-red-700" : "bg-cream-100 text-clay-700"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span className="flex-1 text-sm font-semibold leading-snug text-ink-900">{item.title}</span>
                          {isNew && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-red-600" aria-label="New" />}
                        </span>
                        <span className="mt-1 block text-sm leading-relaxed text-ink-600">{item.body}</span>
                        <span className="mt-1.5 block text-xs text-ink-500">{ago(item.date)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
