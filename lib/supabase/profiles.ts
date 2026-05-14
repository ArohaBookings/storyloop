import type { User } from "@supabase/supabase-js";
import { createAdminSupabase } from "./admin";

export type AppProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  plan: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stories_this_month: number | null;
  is_active: boolean | null;
};

const PROFILE_SELECT = "id, email, full_name, plan, subscription_status, stripe_customer_id, stories_this_month, is_active";

function deriveFullName(user: Pick<User, "email" | "user_metadata">) {
  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  if (fullName) return fullName;
  return user.email?.split("@")[0] ?? "StoryLoop user";
}

export async function getOrCreateProfile(user: Pick<User, "id" | "email" | "user_metadata">): Promise<AppProfile> {
  const sb = createAdminSupabase();
  const { data: existing, error } = await sb
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  const email = user.email ?? null;
  const fullName = deriveFullName(user);

  if (existing) {
    const updates: Partial<AppProfile> = {};
    if (!existing.email && email) updates.email = email;
    if (!existing.full_name && fullName) updates.full_name = fullName;

    if (Object.keys(updates).length === 0) return existing as AppProfile;

    const { data: updated, error: updateError } = await sb
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select(PROFILE_SELECT)
      .single();

    if (updateError) throw updateError;
    return updated as AppProfile;
  }

  const { data: created, error: createError } = await sb
    .from("profiles")
    .insert({
      id: user.id,
      email,
      full_name: fullName,
    })
    .select(PROFILE_SELECT)
    .single();

  if (createError) throw createError;

  return created as AppProfile;
}
