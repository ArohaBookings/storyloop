import { renderMarkdown } from "./lib/blog";
const attacks = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '[click](javascript:alert(1))',
  '<iframe src="https://evil.com"></iframe>',
  '**bold** <svg onload=alert(1)>',
  '[ok](https://good.com) and [bad](data:text/html,<script>x</script>)',
];
let bad = 0;
for (const a of attacks) {
  const out = renderMarkdown(a);
  const dangerous = /<script|onerror=|onload=|<iframe|javascript:|data:text\/html/i.test(out);
  if (dangerous) bad++;
  console.log(`${dangerous ? "❌ LEAK" : "✅ safe"}  ${a.slice(0,44)}`);
  if (dangerous) console.log("        ->", out.slice(0,110));
}
// legit markdown still works
const ok = renderMarkdown("## Head\n\n**bold** and [link](https://x.com)\n\n- one\n- two");
console.log("\nlegit markdown renders:", /<h2>Head<\/h2>/.test(ok) && /<strong>bold<\/strong>/.test(ok) && /<li>one<\/li>/.test(ok) ? "✅" : "❌");
console.log(bad === 0 ? "\n✅ no XSS vectors got through" : `\n❌ ${bad} leaks`);
process.exit(bad ? 1 : 0);
