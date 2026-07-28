import { renderLifecycleEmail } from "./lib/email/templates";
const e = renderLifecycleEmail({ type: "weekly_value", userId:"u", recipient:"a@b.com", name:"Marcelle" });
const h = e.html;
const checks: [string, boolean][] = [
  ["subject is the weekly idea email", /story idea/i.test(e.subject)],
  ["prefers-color-scheme dark block present", /@media \(prefers-color-scheme: dark\)/.test(h)],
  ["Outlook data-ogsc overrides present", /\[data-ogsc\] \.sl-title/.test(h)],
  ["title has sl-title class (so overrides can hit it)", /class="sl-title"/.test(h)],
  ["body has sl-body class", /class="sl-body"/.test(h)],
  ["card carries bgcolor attribute", /bgcolor="#fffdf8"/.test(h)],
  ["outer bg carries bgcolor attribute", /bgcolor="#f8f1e7"/.test(h)],
  ["color-scheme meta present", /name="color-scheme"/.test(h)],
  ["dark title colour defined", /\.sl-title \{ color:#f5ede3/.test(h)],
];
let bad = 0;
for (const [label, ok] of checks) { if (!ok) bad++; console.log(`${ok?"✅":"❌"} ${label}`); }
console.log(`\nSubject line: "${e.subject}"`);
console.log(bad === 0 ? "\n✅ dark-mode scaffolding complete" : `\n❌ ${bad} missing`);
process.exit(bad?1:0);
