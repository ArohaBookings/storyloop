import Link from "next/link";
import AnimatedLogo from "@/components/brand/AnimatedLogo";
import { CookiePreferencesButton } from "@/components/consent/CookieBanner";

export default function Footer() {
  return (
    <footer className="bg-ink-900 text-ink-200 py-16">
      <div className="edge-shell">
        <div className="grid grid-cols-1 gap-10 mb-10 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div className="max-w-md sm:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <AnimatedLogo size={36} className="brightness-125" />
              <div>
                <span className="font-display text-xl font-bold text-paper">StoryLoop</span>
                <p className="text-[10px] text-cream-300 -mt-1 font-mono tracking-widest">BY ARIA CARE</p>
              </div>
            </div>
            <p className="text-sm text-ink-300 leading-relaxed mb-4">
              Learning story drafts for early childhood educators across Aotearoa New Zealand and Australia.
              Built to support educator voice, curriculum links, and editable documentation.
            </p>
            <Link href="/about" className="inline-block text-sm text-cream-300 hover:text-cream-100 transition-colors underline underline-offset-2">
              Read our story →
            </Link>
          </div>

          <div>
            <h4 className="font-display font-bold text-paper mb-4 text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-ink-300">
              <li><Link href="/features" className="hover:text-paper transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-paper transition-colors">Pricing</Link></li>
              <li><Link href="/examples" className="hover:text-paper transition-colors">Examples</Link></li>
              <li><Link href="/accuracy" className="hover:text-paper transition-colors">Accuracy report</Link></li>
              <li><Link href="/#live-demo" className="hover:text-paper transition-colors">Try free</Link></li>
              <li><Link href="/documentation-time-calculator" className="hover:text-paper transition-colors">Time calculator for centres</Link></li>
              <li><Link href="/review-readiness-check" className="hover:text-paper transition-colors">Review readiness check</Link></li>
              <li><Link href="/learning-story-data" className="hover:text-paper transition-colors">Learning stories in numbers</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-paper mb-4 text-sm">Who it&apos;s for</h4>
            <ul className="space-y-2 text-sm text-ink-300">
              <li><Link href="/for-educators" className="hover:text-paper transition-colors">For educators</Link></li>
              <li><Link href="/for-centres" className="hover:text-paper transition-colors">For centres</Link></li>
              <li><Link href="/for-families" className="hover:text-paper transition-colors">For families</Link></li>
              <li><Link href="/works-alongside" className="hover:text-paper transition-colors">Works with Storypark</Link></li>
              <li><Link href="/safety" className="hover:text-paper transition-colors">Children&apos;s information and AI</Link></li>
              <li><Link href="/ai-policy" className="hover:text-paper transition-colors">Free AI policy for services</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-paper mb-4 text-sm">Guides</h4>
            <ul className="space-y-2 text-sm text-ink-300">
              <li><Link href="/what-is-a-learning-story" className="hover:text-paper transition-colors">What is a learning story?</Link></li>
              <li><Link href="/learning-story-template" className="hover:text-paper transition-colors">Learning story template</Link></li>
              <li><Link href="/eylf-learning-outcomes" className="hover:text-paper transition-colors">EYLF learning outcomes</Link></li>
              <li><Link href="/te-whariki-learning-outcomes-guide" className="hover:text-paper transition-colors">Te Whāriki learning outcomes</Link></li>
              <li><Link href="/te-whariki-learning-stories" className="hover:text-paper transition-colors">Te Whāriki stories</Link></li>
              <li><Link href="/eylf-learning-stories" className="hover:text-paper transition-colors">EYLF stories</Link></li>
              <li><Link href="/resources" className="hover:text-paper transition-colors">Educator resources</Link></li>
              <li><Link href="/blog" className="hover:text-paper transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Family of products */}
          <div>
            <h4 className="font-display font-bold text-paper mb-4 text-sm">Sister products</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="https://ariacare.app" target="_blank" rel="noopener" className="group block">
                  <span className="text-paper font-semibold group-hover:text-cream-200 transition-colors">Aria Care →</span>
                  <p className="text-xs text-ink-300 mt-0.5">AI operating system for NDIS providers</p>
                </a>
              </li>
              <li>
                <a href="https://arohaai.app" target="_blank" rel="noopener" className="group block">
                  <span className="text-paper font-semibold group-hover:text-cream-200 transition-colors">Aroha AI →</span>
                  <p className="text-xs text-ink-300 mt-0.5">AI voice receptionist for small business</p>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-ink-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-300">© {new Date().getFullYear()} StoryLoop · A division of Aria Care. Proudly built in New Zealand.</p>
          <div className="flex items-center gap-5 text-xs text-ink-300">
            <Link href="/privacy" className="hover:text-paper transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-paper transition-colors">Terms</Link>
            <CookiePreferencesButton className="hover:text-paper transition-colors" />
            <a href="mailto:ariacareapp@gmail.com" className="hover:text-paper transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
