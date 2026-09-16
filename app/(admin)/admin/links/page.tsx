import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Link2 } from "lucide-react";
import { verifyAdmin } from "@/lib/admin-auth";
import { SITE_URL } from "@/lib/email/config";
import LinkBuilder from "@/components/admin/LinkBuilder";

export const metadata = { title: "Campaign links · StoryLoop Admin" };
export const dynamic = "force-dynamic";

/**
 * Tagged-link builder.
 *
 * The analytics pipeline already records utm_source / utm_medium /
 * utm_campaign and carries them all the way to the acquisition table on
 * /admin/growth, which reports signups, activation and PAID per source. None
 * of that can separate five Facebook groups from each other unless the links
 * carry tags, so this page exists to make tagging the default rather than
 * something to remember.
 */
export default async function LinksPage() {
  const session = await verifyAdmin();
  if (!session) redirect("/admin-login");

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>

        <div className="mt-6 mb-8">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-clay-400">
            <Link2 className="h-3.5 w-3.5" /> Campaign links
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">Tag every link you post.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">
            An untagged link collapses into a single &ldquo;facebook.com&rdquo; row, so posting to five groups looks
            like one channel. Tagged links flow through to the acquisition table on{" "}
            <Link href="/admin/growth" className="text-clay-400 underline underline-offset-2 hover:text-clay-300">
              Growth
            </Link>
            , which reports signups, activation and paying customers per source. Change the campaign each week so
            this week&apos;s post can be told apart from last week&apos;s.
          </p>
        </div>

        <LinkBuilder origin={SITE_URL} />
      </div>
    </div>
  );
}
