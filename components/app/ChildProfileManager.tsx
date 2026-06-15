"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { ChildProfile } from "@/lib/children";

type FormState = {
  id?: string;
  name: string;
  ageGroup: string;
  interests: string;
  developmentalFocus: string;
  whanauAspirations: string;
  homeLanguages: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  ageGroup: "",
  interests: "",
  developmentalFocus: "",
  whanauAspirations: "",
  homeLanguages: "",
  notes: "",
};

function profileToForm(child: ChildProfile): FormState {
  return {
    id: child.id,
    name: child.name,
    ageGroup: child.age_group ?? "",
    interests: child.interests.join(", "),
    developmentalFocus: child.developmental_focus ?? "",
    whanauAspirations: child.whanau_aspirations ?? "",
    homeLanguages: child.home_languages.join(", "),
    notes: child.notes ?? "",
  };
}

export default function ChildProfileManager({ initialChildren }: { initialChildren: ChildProfile[] }) {
  const [children, setChildren] = useState(initialChildren);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(initialChildren.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
    setError("");
  };

  const editChild = (child: ChildProfile) => {
    setForm(profileToForm(child));
    setShowForm(true);
    setError("");
  };

  const saveChild = async () => {
    if (!form.name.trim()) {
      setError("Add the child's preferred name or label.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(form.id ? `/api/children/${encodeURIComponent(form.id)}` : "/api/children", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save child profile.");

      setChildren((current) => {
        const next = form.id
          ? current.map((child) => (child.id === data.child.id ? data.child : child))
          : [...current, data.child];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      closeForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save child profile.");
    } finally {
      setSaving(false);
    }
  };

  const deleteChild = async (child: ChildProfile) => {
    if (!window.confirm(`Delete ${child.name}'s profile? Saved stories remain in history but become unassigned.`)) {
      return;
    }

    setError("");
    const response = await fetch(`/api/children/${encodeURIComponent(child.id)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not delete child profile.");
      return;
    }
    setChildren((current) => current.filter((item) => item.id !== child.id));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-title mb-2">Continuity memory</p>
          <h1 className="font-display text-3xl font-bold text-ink-900">Child learning profiles</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-600">
            Save only the context that helps educators notice learning over time. Profiles are private to your account
            and are never a developmental score.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" /> Add child profile
        </button>
      </div>

      {showForm && (
        <section className="card p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="section-title mb-1">{form.id ? "Edit profile" : "New profile"}</p>
              <h2 className="font-display text-2xl font-bold text-ink-900">
                Context for more connected stories
              </h2>
            </div>
            <button type="button" onClick={closeForm} className="btn-ghost p-2" aria-label="Close profile form">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Preferred name or label</label>
              <input className="input" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
            </div>
            <div>
              <label className="label">Age group</label>
              <input className="input" value={form.ageGroup} onChange={(event) => updateField("ageGroup", event.target.value)} placeholder="3-4 years" />
            </div>
            <div>
              <label className="label">Current interests</label>
              <input className="input" value={form.interests} onChange={(event) => updateField("interests", event.target.value)} placeholder="water, construction, dramatic play" />
            </div>
            <div>
              <label className="label">Home languages</label>
              <input className="input" value={form.homeLanguages} onChange={(event) => updateField("homeLanguages", event.target.value)} placeholder="English, te reo Māori" />
            </div>
            <div>
              <label className="label">Learning focus or working theory</label>
              <textarea className="input min-h-24 resize-y" value={form.developmentalFocus} onChange={(event) => updateField("developmentalFocus", event.target.value)} />
            </div>
            <div>
              <label className="label">Family or whānau aspirations</label>
              <textarea className="input min-h-24 resize-y" value={form.whanauAspirations} onChange={(event) => updateField("whanauAspirations", event.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Educator context for future drafts</label>
            <textarea
              className="input min-h-24 resize-y"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Used when this profile is selected for a draft. Avoid unnecessary health or identifying details."
            />
          </div>
          {error && <p className="mt-3 text-xs font-semibold text-red-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
            <button type="button" onClick={saveChild} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save profile
            </button>
          </div>
        </section>
      )}

      {error && !showForm && <p className="text-xs font-semibold text-red-700">{error}</p>}

      {!children.length ? (
        <div className="card p-12 text-center">
          <p className="font-display text-xl font-bold text-ink-900">No child profiles yet</p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink-500">
            Add a lightweight profile to connect stories, family aspirations, interests, and follow-up observations.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {children.map((child) => (
            <article key={child.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-bold text-ink-900">{child.name}</h2>
                  <p className="mt-1 text-xs text-ink-500">{child.age_group || "Age group not added"}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => editChild(child)} className="btn-ghost p-2" aria-label={`Edit ${child.name}`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => deleteChild(child)} className="btn-ghost p-2 text-red-600" aria-label={`Delete ${child.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {child.interests.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {child.interests.map((interest) => (
                    <span key={interest} className="rounded-full bg-cream-100 px-2 py-1 text-[10px] font-semibold text-clay-700">
                      {interest}
                    </span>
                  ))}
                </div>
              )}
              {child.whanau_aspirations && (
                <p className="mt-4 text-sm leading-relaxed text-ink-600">
                  <strong className="text-ink-800">Whānau aspiration:</strong> {child.whanau_aspirations}
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/generate?child=${encodeURIComponent(child.id)}`} className="btn-primary px-4 py-2 text-xs">
                  New story <ArrowRight className="h-3 w-3" />
                </Link>
                <Link href={`/insights?child=${encodeURIComponent(child.id)}`} className="btn-secondary px-4 py-2 text-xs">
                  View learning thread
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
