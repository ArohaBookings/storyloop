import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-ink-900 text-ink-200 px-6 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="md:col-span-2 max-w-md">
            <div className="flex items-center gap-2.5 mb-3">
              <img src="/logo.svg" alt="StoryLoop" className="w-9 h-9 brightness-150" />
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

          {/* Product */}
          <div>
            <h4 className="font-display font-bold text-paper mb-4 text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-ink-300">
              <li><a href="#features" className="hover:text-paper transition-colors">Features</a></li>
              <li><Link href="/pricing" className="hover:text-paper transition-colors">Pricing</Link></li>
              <li><Link href="/examples" className="hover:text-paper transition-colors">Examples</Link></li>
              <li><Link href="/te-whariki-learning-stories" className="hover:text-paper transition-colors">Te Whāriki</Link></li>
              <li><Link href="/eylf-learning-stories" className="hover:text-paper transition-colors">EYLF</Link></li>
              <li><a href="#live-demo" className="hover:text-paper transition-colors">Try free</a></li>
            </ul>
          </div>

          {/* Family of products */}
          <div>
            <h4 className="font-display font-bold text-paper mb-4 text-sm">Sister products</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="https://ariacare.app" target="_blank" rel="noopener" className="group block">
                  <span className="text-paper font-semibold group-hover:text-cream-200 transition-colors">Aria Care →</span>
                  <p className="text-xs text-ink-400 mt-0.5">AI operating system for NDIS providers</p>
                </a>
              </li>
              <li>
                <a href="https://arohaai.app" target="_blank" rel="noopener" className="group block">
                  <span className="text-paper font-semibold group-hover:text-cream-200 transition-colors">Aroha AI →</span>
                  <p className="text-xs text-ink-400 mt-0.5">AI voice receptionist for small business</p>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-ink-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-500">© {new Date().getFullYear()} StoryLoop · A division of Aria Care. Proudly built in New Zealand.</p>
          <div className="flex items-center gap-5 text-xs text-ink-400">
            <Link href="/privacy" className="hover:text-paper transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-paper transition-colors">Terms</Link>
            <a href="mailto:hello@storyloop.space" className="hover:text-paper transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
