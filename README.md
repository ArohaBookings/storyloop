# StoryLoop 🌀
### AI Learning Stories for Early Childhood Educators

> Turn 3 bullet points into a beautiful, EYLF-aligned learning story in under 30 seconds. Built for educators across Australia and New Zealand.

**A division of Aria Care. Built by Leo Bons, 19, in New Zealand 🇳🇿**

---

## What it does

Educators spend 30+ minutes writing each learning story. StoryLoop does it in 30 seconds. Voice-record or type a few observations, and the AI writes a warm, EYLF-aligned story with learning outcomes and extension suggestions. Educators review, edit, and publish. Hours saved every week.

### Pricing
| Plan | AUD | NZD | Limit |
|------|-----|-----|-------|
| Free | $0 | $0 | 3 stories/month |
| Educator | $19/mo | $21/mo | Unlimited |
| Centre | $49/mo | $55/mo | Up to 10 educators |

All paid plans start with a **7-day free trial**.

---

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** + custom warm editorial theme (Fraunces + Manrope)
- **Supabase** (auth, Postgres with RLS, hosted in Sydney)
- **Stripe** (subscriptions + 7-day trials, AUD + NZD)
- **OpenAI GPT-4o-mini** (primary — cheap + fast) or **Anthropic Claude** (fallback)
- **Vercel** deploy target

---

## 🚀 Deployment Guide

### Step 1 — Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine)
2. Choose region: **Sydney (ap-southeast-2)** for AU/NZ users
3. Go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` → Run
4. **Settings → API** → copy three values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)
5. **Authentication → Providers**:
   - Enable Email (require confirmation: yes)
   - Under **Auth Settings → URL Configuration**, set Site URL to your production URL (e.g. `https://storyloop.app`)

### Step 2 — OpenAI (required for AI)

1. Go to [platform.openai.com](https://platform.openai.com) → API Keys
2. Create a new key → copy it as `OPENAI_API_KEY`
3. Set up billing (GPT-4o-mini costs ~$0.0002 per story — 1000 stories = $0.20)

### Step 3 — Stripe

1. In your existing Stripe account (or create new)
2. **Products** → create one product: **"StoryLoop"**
3. Add **4 prices** under that product:

| Nickname | Currency | Amount | Billing |
|----------|----------|--------|---------|
| Educator AUD | AUD | $19.00 | Monthly |
| Educator NZD | NZD | $21.00 | Monthly |
| Centre AUD | AUD | $49.00 | Monthly |
| Centre NZD | NZD | $55.00 | Monthly |

4. Copy each price ID (starts with `price_`) into env vars
5. **Developers → Webhooks** → Add endpoint:
   - URL: `https://storyloop.app/api/stripe/webhook` (or your Vercel URL)
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`
6. **Settings → Billing → Customer portal** → Activate

### Step 4 — Environment Variables

Copy `.env.example` to `.env.local` and fill in every value:

```bash
cp .env.example .env.local
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Paste it as `ADMIN_JWT_SECRET`.

### Step 5 — Run locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

### Step 6 — Deploy to Vercel

```bash
git init
git add .
git commit -m "StoryLoop v1.0"
git remote add origin https://github.com/YOUR-USERNAME/storyloop.git
git push -u origin main
```

Then at [vercel.com](https://vercel.com):
1. Import project → select the repo
2. Add **every** environment variable from your `.env.local`
3. Deploy

Update your Stripe webhook URL to match your Vercel URL after first deploy.

### Step 7 — Activate admin access

1. Your first login with `ADMIN_PASSWORD_PLAIN=leobons4254` will generate a bcrypt hash
2. Check your Vercel function logs for: `ADMIN_PASSWORD_HASH=$2a$10$...`
3. Copy that hash into the `ADMIN_PASSWORD_HASH` env var
4. **Remove `ADMIN_PASSWORD_PLAIN`** from env vars
5. Redeploy

Now your admin password is properly hashed and not stored in plain text anywhere.

Visit: `https://storyloop.app/admin-login` to log in.

---

## 🎯 Go-to-market playbook

### Week 1: SEO foundation
StoryLoop is built to rank on Google. Key pages target:
- "learning story template"
- "EYLF learning story examples"
- "learning story generator"
- "childcare documentation AI"

Submit sitemap to Google Search Console after deploy.

### Week 2: One Facebook post
Post **once** in 2-3 early childhood educator groups:

> "Built a free tool that writes learning stories from your observations — made it because my friend who works in childcare was spending 2 hours every night on these. Free to try, would love honest feedback from people who do this job."

That's it. No spam, no repeated posts. If it's good, it spreads.

### Month 1+: Let it compound
- Every free user who pays = pure profit
- Every story written improves SEO-able content
- Every Facebook share compounds over time

Target: **200 paid users × $19 = $3,800/month** with zero human sales.

---

## 📂 File Structure

```
storyloop/
├── app/
│   ├── (auth)/login, signup
│   ├── (app)/dashboard, generate, history, billing
│   ├── (admin)/admin, admin-login
│   ├── api/
│   │   ├── generate (main AI route)
│   │   ├── me (current profile)
│   │   ├── stripe/checkout, webhook, portal
│   │   └── admin/login, logout, users
│   ├── auth/callback
│   ├── about, privacy, terms
│   └── page.tsx (landing)
├── components/landing/ (9 sections)
├── components/app/ (DashboardNav)
├── lib/
│   ├── ai/ (generate.ts, prompts.ts)
│   ├── supabase/ (client, server, admin)
│   └── admin-auth.ts (JWT session verification)
├── supabase/schema.sql
├── middleware.ts
└── public/logo.svg, favicon.svg
```

---

## 🔐 Security notes

- Admin password is **bcrypt-hashed** — never stored plaintext in the codebase
- Admin sessions are signed JWTs with 7-day expiry
- All DB access goes through Supabase RLS (row-level security)
- Service role key only used in server-side API routes
- Webhook signature verification on every Stripe event
- Input sanitisation and rate limiting on the AI endpoint

---

## 🛠 Maintenance

**Monthly usage reset** — add this Vercel cron (in `vercel.json`):
```json
{ "crons": [{ "path": "/api/cron/reset-usage", "schedule": "0 0 1 * *" }] }
```

Or manually run this in Supabase SQL editor on the 1st of each month:
```sql
SELECT public.reset_monthly_usage();
```

---

Built with care, for the people who care for the next generation. 🌱

— Leo Bons, Founder · leo@storyloop.app
