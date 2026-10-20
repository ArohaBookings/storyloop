import EngagementTracker from "@/components/analytics/EngagementTracker";
import SignupForm from "./SignupForm";

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return (
    <>
      {/* Time on the form and which field people stop at (field names only,
          never what was typed), for visitors who allow analytics. Until 19 Oct
          2026 the signup page had no tracker, so nobody could tell how long
          people spent here before leaving. */}
      <EngagementTracker mode="marketing" />
      <SignupForm initialPlan={typeof params.plan === "string" ? params.plan : null} />
    </>
  );
}
