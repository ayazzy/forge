# Forge — Claude Code Context

## What Forge Is
Forge is a YouTube content production SaaS. Creators enter a topic, and Forge runs an 8-stage pipeline that produces: research brief, script (with hook scoring + retention analysis), voice cast selection, image prompts, thumbnail brief, and metadata. There is also a **One Shot Mode** that runs the full pipeline automatically in one go.

## Tech Stack
- **Frontend**: React 18 + Vite, deployed on Vercel (`/frontend`)
- **Backend**: Express.js, deployed on Railway (`/backend`)
- **Auth + DB**: Supabase (Postgres + Auth)
- **Payments**: Stripe (subscriptions + one-time packs)
- **AI**: Anthropic Claude API via SSE streaming
- **TTS**: Cartesia (Sonic 2024-10-01 model)

## Monorepo Structure
```
/frontend/src/
  pages/          # Full-page views
  components/
    stages/       # Stage0Research through Stage7Metadata (8 stages)
    ui/           # AppLayout, Sidebar, ProtectedRoute, etc.
  hooks/          # useAuth, useChannelProfile
  lib/            # api.js (all backend calls), supabase.js, srt.js, productionBrief.js
/backend/
  routes/         # claude.js, episodes.js, stripe.js, trends.js, users.js, channel.js, cartesia.js
  index.js        # Express entry, auth middleware
```

## Plans & Pricing
| Plan    | Monthly | Annual | Episodes/mo | One Shot Mode |
|---------|---------|--------|-------------|---------------|
| Creator | $39/mo  | $29/mo | 4           | No            |
| Studio  | $79/mo  | $59/mo | 12          | Yes           |
| Pro     | $149/mo |$119/mo | 30          | Yes           |

Episode packs: 1 ep $8, 3 ep $20, 5 ep $30. Annual billing saves ~25%.
**No free trial.** All new signups get **one free episode credit** — no credit card required. After that, they must subscribe or buy a pack.

## Route Protection (ProtectedRoute.jsx)
- All app pages require auth + active plan (`requiresPlan`)
- Settings, Dashboard, Pipeline, Trends, Onboarding all use `requiresPlan={true}`
- **Exception**: users with `episode_credits > 0` (free episode) can access Pipeline without a paid plan
- Users without a plan or credits are redirected to `/pricing`
- Billing is cached at module level (60s TTL) to avoid redundant API calls
- Stripe webhook timing: if `?subscription=success` but plan not active yet, retries billing after 4s

## Key Flows
1. **Free episode**: New signup → onboarding → `/pipeline` with 1 free credit → credit confirmation dialog shows "This is your free episode" → complete episode → redirect to `/pricing` to subscribe
2. **Paid episode**: Subscribed user starts pipeline → credit confirmation shows "This will use 1 of X remaining credits" → credit deducted after successful episode DB insert
3. **One Shot Mode**: Topic input → parallel Claude calls → research + script + titles + voices + images → populates all pipeline stages at once → lands on Sound stage
4. **Post-Stripe return**: `?subscription=success` → ProtectedRoute retries billing for up to 4s to handle webhook delay
5. **Channel import**: Onboarding → paste YouTube channel URL → auto-imports name, description, tone, avg video length, top videos → feeds into richer channel template generation

## Sidebar Behavior
- Reduced to 5 nav items: Dashboard, Pipeline, Trends, Stats, Settings
- Episodes list accessible from Dashboard. Saved Topics is a tab on Trends page. Calendar is visible in Stats.
- Users without a plan: nav links show dimmed + lock icon + "Upgrade to unlock" link, clicking any nav redirects to `/pricing`
- Shows real plan name in bottom status ("Studio plan", "No active plan", etc.)

## Supabase `profiles` Table Key Fields
`user_id, plan, subscription_status, stripe_customer_id, monthly_episodes_used, monthly_reset_at, episode_credits, prompt_config, mood_config, is_configured`

- `subscription_status`: `'active'` | `'canceled'` | null (no `'trialing'` — no trial period)
- `plan`: `'creator'` | `'studio'` | `'pro'` | `'free'`
- `prompt_config` JSON: `{ researchPrompt, scriptPrompt, imageStyle, exampleParagraph, titleStyle, audienceProfile, targetWordCount, wordsPerMinute }`
- Episode credit deduction happens **after** successful episode insert (not before)

## Stripe Integration
- Checkout sessions created at `POST /api/stripe/create-checkout-session` — **no trial period**
- Episode pack purchases at `POST /api/stripe/create-pack-checkout-session`
- Webhooks handled at `POST /api/stripe/webhook` — updates `profiles` on `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Billing portal at `POST /api/stripe/portal`
- Cancel URL always goes to `/pricing`
- Success URL: `/dashboard?subscription=success`
- `APP_URL` in Railway must be `https://www.tryforge.studio` (with www, with https, no trailing slash, no spaces)

## Claude Model Tiering
- **Sonnet** (`claude-sonnet-4-20250514`): Stage 0 research, Stage 1 script generation + feedback
- **Haiku** (`claude-haiku-4-5-20251001`): Stage 2 segment detection, Stage 3 sound design, Stage 4 image prompts, Stage 6 thumbnail concepts, Stage 7 metadata
- Prompt caching enabled: `anthropic-beta: prompt-caching-2024-07-31` with `cache_control: { type: 'ephemeral' }` on system messages in claude.js and claudeStream.js

## Channel Template (`prompt_config`)
Generated by `POST /api/channel/generate-template`. Stored in `profiles.prompt_config`. Fields:
- `researchPrompt` — 8-12 sentence niche-specific research instruction
- `scriptPrompt` — 8-12 sentence writing style + narrative structure guide
- `imageStyle` — Midjourney-format visual aesthetic string
- `exampleParagraph` — 2-3 sentence sample in the channel's voice (used as style reference in script generation)
- `titleStyle` — 2-3 sentence title pattern guide (used in metadata generation)
- `audienceProfile` — 2-3 sentence viewer profile (used to calibrate script complexity)
- `targetWordCount`, `wordsPerMinute`

## Stage Output Files
Assembly (Stage 5) export sidebar produces:
- `subtitles.srt` — Broadcast-standard: 42 chars/line, sentence boundaries, 200ms gaps
- `production_brief.pdf` — 7-section PDF: cover, script with M:SS timestamps, storyboard table, sound cue sheet, YouTube metadata, thumbnail concepts
- `episode_voiceover.zip` — Complete ZIP: script.md, research_brief.json, metadata.json, image_prompts.txt, subtitles.srt, davinci_guide.txt

Stage 2 (Narration) also provides:
- `↓ WAV` — Full narration concatenated via Web Audio API (0.5s gaps between segments)
- `↓ ZIP` — Individual MP3 segments

## What Was Recently Built
- **Phase 4**: Sidebar reduced to 5 nav items, Dashboard empty state CTA, Trends→Pipeline sessionStorage handoff, Stage5Assembly horizontal timeline, SRT generation, ZIP export, image+thumbnail combined Haiku call, Generate All confirmation, One Shot captures voice/image/metadata
- **Phase 5**: Broadcast-standard SRT rewrite, YouTube-ready copy buttons in Stage 7, single Haiku image prompt call, Canvas thumbnail mockups, enriched channel template (exampleParagraph/titleStyle/audienceProfile), full narration WAV download (Web Audio API), Production Brief PDF (jsPDF, 7 sections)

## Pending / Next Up
- Voice cloning (Pro): Cartesia upload → save cloned voice ID to profile
- Aggregated hook & retention insights on Dashboard
- YouTube OAuth + Analytics integration
- A/B title tracking

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
Backend (Railway): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CARTESIA_API_KEY`, `APP_URL`
