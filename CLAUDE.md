# Forge — Claude Code Context

## What Forge Is
Forge is a YouTube content production SaaS. Creators enter a topic, and Forge runs an 8-stage pipeline that produces: research brief, script (with hook scoring + retention analysis), voice cast selection, image prompts, thumbnail brief, and metadata. There is also a **One Shot Mode** that runs the full pipeline automatically in one go.

## Tech Stack
- **Frontend**: React 18 + Vite, deployed on Vercel (`/frontend`)
- **Backend**: Express.js, deployed on Railway (`/backend`)
- **Auth + DB**: Supabase (Postgres + Auth)
- **Payments**: Stripe (subscriptions + one-time packs)
- **AI**: Anthropic Claude API via SSE streaming
- **TTS**: Cartesia (Sonic 2024-10-01 model, replaced ElevenLabs)

## Monorepo Structure
```
/frontend/src/
  pages/          # Full-page views
  components/
    stages/       # Stage1Script, Stage2Voice, etc. (8 stages)
    ui/           # AppLayout, Sidebar, ProtectedRoute, etc.
  hooks/          # useAuth, useChannelProfile
  lib/            # api.js (all backend calls), supabase.js
/backend/
  routes/         # claude.js, episodes.js, stripe.js, trends.js, users.js
  index.js        # Express entry, auth middleware
```

## Plans & Pricing
| Plan    | Monthly | Annual | Episodes/mo | One Shot Mode |
|---------|---------|--------|-------------|---------------|
| Creator | $39/mo  | $29/mo | 4           | No            |
| Studio  | $79/mo  | $59/mo | 12          | Yes           |
| Pro     | $149/mo |$119/mo | 30          | Yes           |

Episode packs: 1 ep $8, 3 ep $20, 5 ep $30. Annual billing saves ~25%.
**One free episode** for all signups, no credit card required.

## Route Protection (ProtectedRoute.jsx)
- All app pages require auth + active plan (`requiresPlan`)
- Settings, Dashboard, Pipeline, Trends, Onboarding all use `requiresPlan={true}`
- Users without a plan are redirected to `/pricing`
- Billing is cached at module level (60s TTL) to avoid redundant API calls
- Stripe webhook timing: if `?subscription=success` but plan not active yet, retries billing after 4s

## Key Flows
1. **Try before signup**: `/try` → TryPipeline (guest) → gate page shows real generated output (titles, voice cast, image prompts) → CTA to sign up → `/signup?redirect=/pricing` → `/pricing`
2. **One Shot Mode**: Topic input → parallel Claude calls → research + script + titles + voices + images → populates all pipeline stages at once
3. **Post-Stripe return**: `?subscription=success` → ProtectedRoute retries billing for up to 4s to handle webhook delay

## Sidebar Behavior
- Fetches billing on mount to determine plan status
- Users without a plan: nav links show dimmed + lock icon + "Upgrade to unlock" link, clicking any nav redirects to `/pricing`
- Shows real plan name in bottom status ("Studio plan", "No active plan", etc.)

## Supabase `profiles` Table Key Fields
`user_id, plan, subscription_status, stripe_customer_id, monthly_episodes_used, monthly_reset_at, episode_credits, trial_ends_at`

- `subscription_status`: `'active'` | `'trialing'` | `'canceled'` | null
- `plan`: `'creator'` | `'studio'` | `'pro'` | `'free'`
- Episode credit deduction happens **after** successful episode insert (not before)

## Stripe Integration
- Checkout sessions created at `POST /api/stripe/create-checkout-session`
- Episode pack purchases at `POST /api/stripe/create-pack-checkout-session`
- Webhooks handled at `POST /api/stripe/webhook` — updates `profiles` on `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Billing portal at `POST /api/stripe/portal`
- Cancel URL always goes to `/pricing`
- Success URL: `/dashboard?subscription=success`

## What Was Recently Built (last session)
- **One Shot Mode** in TryPipeline (guest) and Pipeline (authenticated)
- **Gate page** in TryPipeline shows real generated titles, voice cast, image prompts in tabs
- Gate content cached to localStorage to survive page refresh
- **ProtectedRoute** rewritten to fix race condition (was using stale cache, letting users through without valid plan)
- **Sidebar** rewritten to fetch real billing, show plan name, lock nav with icons for users without a plan
- **Settings route** now requires `requiresPlan` — all app pages gated behind active plan
- **Landing page** updated with One Shot Mode: hero callout badge, dedicated comparison section, features card, pricing badges
- Pricing page layout centered (maxWidth + margin auto)
- Signup/Login handle `?redirect=` param, animated progress bar on signup success
- Stage1Script: copy button moved to action bar, retention rewrite box fixed for dark theme

## Stripe Production Status
- Checkout session creates successfully and redirects to Stripe ✓
- `APP_URL` in Railway must be `https://www.tryforge.studio` (with www, with https, no trailing slash, no spaces)
- Railway builder switched from Railpack → Nixpacks (Railpack was failing with `secret APP_URL: not found`)
- Card declines (`generic_decline`) are a Stripe account restriction on new Canadian accounts — not a code issue
- **Contact Stripe support** to lift the restriction before testing live charges
- Stripe business name updated to "Forge" in Stripe Dashboard settings

## Pending / Next Up
- **Test Stripe end-to-end** once Stripe lifts the card decline restriction (contact Stripe support)
- **Switch ElevenLabs → Cartesia TTS** (planned, not started)
- One-shot mode needs real API wiring for Onboarding auto-population from existing channels
- A/B title tracking (stage 7 already generates 3 titles)
- Stage versioning (last 3 outputs per stage)

## Dev Commands
```bash
# Frontend (from /frontend)
npm run dev        # Vite dev server

# Backend (from /backend)
node index.js      # Express server

# Stripe webhook local testing
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

## Environment Variables
Frontend (Vercel): `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
Backend (Railway): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ELEVENLABS_API_KEY`, `APP_URL`
