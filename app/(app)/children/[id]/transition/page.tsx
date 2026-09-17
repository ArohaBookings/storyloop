import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { localDate } from "@/lib/terms";
import { isMissingTermSettingsColumn, parseTermSettings } from "@/lib/term-settings";
import {
  buildTransitionPack,
  cleanDestination,
  MAX_DESTINATION_LENGTH,
  MAX_PACK_STORIES,
  packStoryFromRow,
  resolvePackSelection,
  type PackAudience,
} from "@/lib/transition-pack";
import PrintButton from "@/components/app/PrintButton";
import TransitionPackView from "@/components/app/TransitionPackView";

export const metadata = { title: "Transition pack" };

// Enough history to cover a child's whole time at a service.
const STORY_LIMIT = 200;

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TransitionPackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Row level security restricts this to the educator's own child.
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name, interests, home_languages, whanau_aspirations")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!child) notFound();

  const profile = await getOrCreateProfile(user);
  const back = (
    <Link href="/children" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 print:hidden">
      <ArrowLeft className="h-4 w-4" /> Child profiles
    </Link>
  );

  if (!hasFeatureAccess(profile.plan, "transitionPack")) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
        {back}
        <div className="card mt-5 p-6">
          <p className="section-title mb-1">Educator</p>
          <h1 className="font-display text-2xl font-bold text-ink-900">A transition pack for {child.name}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            When {child.name} moves on to school or a new service, hand over more than a name. Choose up to{" "}
            {MAX_PACK_STORIES} moments and StoryLoop puts them on one printable page, alongside the child&apos;s voice, what
            they love, languages at home, the family&apos;s own words and the next steps still open. It only uses what your
            stories and {child.name}&apos;s profile already say.
          </p>
          <Link href="/billing?feature=transition-pack" className="btn-primary mt-4 inline-flex text-sm">See Educator</Link>
        </div>
      </div>
    );
  }

  const { data: termRow, error: termError } = await supabase
    .from("profiles").select("term_settings").eq("id", user.id).maybeSingle();
  const defaultFramework = (profile.story_preferences as { defaultFramework?: string } | null)?.defaultFramework ?? null;
  const settings = parseTermSettings(
    termError && isMissingTermSettingsColumn(termError) ? null : termRow?.term_settings,
    defaultFramework,
  );

  const { data: rows } = await supabase
    .from("stories")
    .select("id, created_at, next_steps, metadata")
    .eq("user_id", user.id)
    .eq("child_id", child.id)
    .order("created_at", { ascending: false })
    .limit(STORY_LIMIT);

  const stories = (rows ?? []).map((row) =>
    packStoryFromRow({
      id: row.id as string,
      date: localDate(row.created_at as string, settings.jurisdiction) ?? String(row.created_at).slice(0, 10),
      next_steps: row.next_steps,
      metadata: row.metadata,
    }),
  );

  // "picked" marks a submitted form, so ticking nothing means nothing rather
  // than falling back to the default selection.
  const requested = first(query.picked)
    ? (Array.isArray(query.s) ? query.s : query.s ? [query.s] : [])
    : null;
  const selection = resolvePackSelection(stories, requested);
  const selected = new Set(selection.ids);
  const audience: PackAudience = first(query.for) === "family" ? "family" : "teacher";
  const destination = cleanDestination(first(query.to));

  const pack = buildTransitionPack({
    child: {
      name: child.name,
      interests: child.interests as string[] | null,
      homeLanguages: child.home_languages as string[] | null,
      whanauAspirations: child.whanau_aspirations as string | null,
    },
    stories,
    selectedIds: selection.ids,
    audience,
    destination,
  });

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        {back}
        <PrintButton />
      </div>

      <form method="get" className="card mt-5 p-5 print:hidden">
        <input type="hidden" name="picked" value="1" />
        <div className="flex flex-wrap gap-5">
          <fieldset className="min-w-0">
            <legend className="text-xs font-semibold uppercase tracking-wider text-ink-500">Who is it for?</legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink-700">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="for" value="teacher" defaultChecked={audience === "teacher"} /> The next teacher or school
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="for" value="family" defaultChecked={audience === "family"} /> The family
              </label>
            </div>
          </fieldset>
          <div className="min-w-0 flex-1 basis-56">
            <label htmlFor="transition-destination" className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Where are they going? <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="transition-destination"
              name="to"
              defaultValue={destination ?? ""}
              maxLength={MAX_DESTINATION_LENGTH}
              placeholder="For example, Ponsonby Primary School"
              className="input mt-2 w-full"
            />
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Moments to include (up to {MAX_PACK_STORIES})
          </legend>
          {stories.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">No saved stories about {child.name} yet. The pack will still show their profile.</p>
          ) : (
            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-clay-100 p-2">
              {stories.map((story) => (
                <li key={story.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-cream-50">
                    <input type="checkbox" name="s" value={story.id} defaultChecked={selected.has(story.id)} className="mt-1" />
                    <span className="min-w-0">
                      <span className="font-medium text-ink-900">{story.title ?? "Untitled story"}</span>
                      <span className="text-ink-500"> · {longDate(story.date)}</span>
                      {story.childVoice && <span className="ml-1 text-xs text-sage-700">· child&apos;s voice</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {selection.trimmed && (
            <p className="mt-2 text-xs text-clay-700">
              You ticked more than {MAX_PACK_STORIES}, so the {MAX_PACK_STORIES} most recent are used.
            </p>
          )}
        </fieldset>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-xs leading-relaxed text-ink-500">
            Read it through before you print. Share it with a school or new service only with the family&apos;s agreement.
          </p>
          <button type="submit" className="btn-primary text-sm">Update pack</button>
        </div>
      </form>

      <TransitionPackView pack={pack} childName={child.name} audience={audience} />
    </div>
  );
}
