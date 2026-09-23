import SignupForm from "./SignupForm";

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <SignupForm initialPlan={typeof params.plan === "string" ? params.plan : null} />;
}
