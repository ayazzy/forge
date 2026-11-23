# Forge

**An AI production pipeline for YouTube creators.** Forge turns an episode idea into a ready-to-edit package (researched script, narration, sound cues, image prompts, thumbnail concepts and upload metadata) through eight reviewable stages, each one editable before the next runs.

Built as a full SaaS (auth, subscriptions, usage quotas, Stripe billing) but never launched publicly. It is no longer in development and is shared here as a reference implementation.

---

## The pipeline

| # | Stage | What happens | Model |
|---|---|---|---|
| 0 | **Research** | Builds a research brief for the topic, shaped by the channel's niche template | Claude Sonnet |
| 1 | **Script** | Writes the script in the channel's voice, scores the hook and runs a retention analysis with targeted rewrite suggestions | Claude Sonnet (streamed) |
| 2 | **Voiceover** | Splits the script into segments and generates narration with a browsable voice library, speed control and caching | Claude Haiku + Cartesia TTS |
| 3 | **Sound** | Produces a sound-design cue sheet per segment | Claude Haiku |
| 4 | **Images** | Writes one coherent set of image prompts for the whole script (one call that sees the full script, not N separate calls) | Claude Haiku |
| 5 | **Assembly** | Timeline view plus exports: broadcast-standard SRT, 7-section production brief PDF, full-narration WAV, ZIP bundle | Client-side |
| 6 | **Thumbnail** | Thumbnail concepts rendered as live 16:9 canvas mockups in the channel's palette | Claude Haiku |
| 7 | **Metadata** | Titles, description with chapters and tags, ready to paste into YouTube | Claude Haiku |

**One Shot Mode** runs research and script, then fans out titles, voices and images in parallel to fill every stage in one go.

Other features: **Trends** finds topics for a niche and hands the angle and evidence into Stage 0. **Channel import** takes a YouTube URL and infers tone, typical length and top videos to generate a per-channel prompt template.

## Architecture

```
React 18 + Vite (Vercel)
   │  Supabase Auth (JWT)          ┌──────────────────────────┐
   ▼                               │  Anthropic (SSE stream)  │
Express API (Railway) ─────────────┤  Cartesia TTS            │
   │  requireAuth → rateLimiter    │  Ideogram                │
   │  → plan/usage gate → route    └──────────────────────────┘
   ▼
Supabase Postgres ── profiles · episodes · assets · usage · saved_topics · processed_events
   ▲
Stripe webhooks (subscriptions, packs, billing portal)
```

**Engineering decisions worth looking at**

- **Model tiering:** Sonnet only for the creative stages (research, script). Haiku for the structured-JSON stages. This cut AI cost by roughly 30–40% with no visible quality loss.
- **Prompt caching:** the system prompt is cached (`cache_control: ephemeral`) in both the streaming and non-streaming Claude routes.
- **Streaming:** script generation streams over SSE so users see writing in real time (`backend/routes/claudeStream.js`).
- **Two layers of cost control:** per-user hourly rate limits by plan and API (`middleware/rateLimiter.js`), plus monthly usage metering against plan quotas through an atomic Postgres RPC (`lib/usage.js`).
- **Billing correctness:** Stripe webhook idempotency through a `processed_events` table. Episode credits are deducted only *after* a successful episode insert. The frontend retries billing for up to 4s after checkout to cover webhook lag.
- **Feature gating:** a single `PLAN_FEATURES` map is shared by the UI (lock states, upgrade prompts) and enforced again on the backend.
- **Client-side media work:** SRT building (42 chars/line, sentence boundaries, 200 ms gaps), WAV concatenation through the Web Audio API, PDF via jsPDF, and ZIP via JSZip, which keeps the server stateless.

Known gaps are listed honestly in [`TODO.md`](TODO.md). The main one: the backend uses the Supabase service-role key, and per-request RLS with user JWTs is the planned migration.

## What I built

Solo project: product, architecture, design and code, from first commit to a production-ready build (~16k lines of JS/JSX across 57 commits). I used Claude Code and Cursor as pair programmers. The pipeline design, prompt and model strategy, billing and quota model, and the cost optimisations above were my decisions. [`CLAUDE.md`](CLAUDE.md) is the living context file I kept for that workflow.

## Stack

React 18 · Vite · React Router · Recharts · Node/Express · Supabase (Postgres + Auth) · Stripe · Anthropic Claude · Cartesia · Ideogram · Resend · Vercel · Railway

## Run locally

Requires Node 20.6+ (for `--env-file`) and keys for Supabase, Anthropic, Cartesia, Ideogram, YouTube Data API and Stripe.

```bash
cp .env.example .env              # backend keys (repo root; backend reads ../.env)
cd backend && npm install && npm run dev      # http://localhost:3001

cd ../frontend && npm install
cp .env.example .env              # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm run dev                       # http://localhost:5173

# Stripe webhooks (optional)
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

## Repo layout

```
backend/
  index.js            Express entry, CORS, route mounting
  middleware/         auth (Supabase JWT), per-plan rate limiting
  lib/                supabase client, usage metering, email, errors
  routes/             claude, claudeStream, cartesia, ideogram, episodes, assets,
                      channel, trends, savedTopics, profile, usage, stripe, account
frontend/src/
  components/stages/  Stage0Research … Stage7Metadata
  pages/              Dashboard, Pipeline, Trends, Stats, Pricing, Onboarding, …
  lib/                api client, feature gating, analysis, SRT/PDF/ZIP export
```
