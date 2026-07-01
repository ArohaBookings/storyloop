"use client";

import { useEffect, useRef, useState } from "react";
import { Feather, X, Loader2, Check, ArrowUp } from "lucide-react";
import type { StoryFrameworkId } from "@/lib/story-options";

type Edit = { editId: string | null; story: string; summary: string; kept: boolean };
type Message = { role: "user" | "assistant"; content: string; edit?: Edit };

export default function QuillChat({
  story,
  storyId,
  childId,
  framework,
  childName,
  selection,
  onApply,
  onClose,
}: {
  story: string;
  storyId?: string;
  childId?: string;
  framework: StoryFrameworkId;
  childName?: string;
  selection?: string;
  onApply: (newStory: string, editId: string | null) => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: selection
        ? `Hi, I'm Quill. You've highlighted a line, so tell me how to change it, or ask me anything about this story.`
        : `Hi, I'm Quill. Ask me to change anything in this story, or ask for advice. You can also highlight a line first for a precise edit.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const message = input.trim();
    if (message.length < 1 || loading) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/quill/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, storyId, childId, framework, childName, selection, message, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quill couldn't respond.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          edit: data.edit ? { editId: data.editId ?? null, story: data.edit.story, summary: data.edit.summary, kept: false } : undefined,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  const keep = (index: number) => {
    const edit = messages[index]?.edit;
    if (!edit || edit.kept) return;
    onApply(edit.story, edit.editId);
    if (edit.editId) {
      void fetch(`/api/refine/${edit.editId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true }),
      });
    }
    setMessages((prev) => prev.map((m, i) => (i === index && m.edit ? { ...m, edit: { ...m.edit, kept: true } } : m)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink-900/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col bg-paper shadow-2xl sm:h-[85vh] sm:max-w-lg sm:rounded-3xl sm:border sm:border-clay-200"
      >
        <div className="flex items-center justify-between border-b border-clay-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-700 text-paper"><Feather className="h-4 w-4" /></div>
            <div>
              <p className="font-display text-base font-bold text-ink-900">Quill</p>
              <p className="-mt-0.5 text-[11px] text-ink-500">Ask for advice or a change</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-cream-100" aria-label="Close Quill"><X className="h-5 w-5" /></button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[85%] ${m.role === "user" ? "" : "w-full"}`}>
                <div className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-clay-700 text-paper" : "bg-white text-ink-800 shadow-soft"
                }`}>
                  {m.content}
                </div>
                {m.edit && (
                  <div className="mt-2 rounded-2xl border border-sage-200 bg-sage-50 p-3">
                    <p className="mb-2 flex items-start gap-1.5 text-xs font-semibold text-sage-800">
                      <Feather className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {m.edit.summary}
                    </p>
                    {m.edit.kept ? (
                      <p className="flex items-center gap-1.5 text-xs font-bold text-sage-700"><Check className="h-4 w-4" /> Kept, your story is updated.</p>
                    ) : (
                      <button onClick={() => keep(i)} className="btn-primary px-3.5 py-1.5 text-xs"><Check className="h-3.5 w-3.5" /> Keep this change</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-sm text-ink-500 shadow-soft">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Quill is thinking…
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-clay-100 p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-clay-200 bg-white p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              rows={1}
              placeholder="Ask Quill for a change or advice…"
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink-900 outline-none"
            />
            <button onClick={() => void send()} disabled={loading || input.trim().length < 1}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-clay-700 text-paper transition-all hover:bg-clay-800 disabled:opacity-40" aria-label="Send">
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[10px] text-ink-400">Quill can make mistakes. You always review and keep changes yourself.</p>
        </div>
      </div>
    </div>
  );
}
