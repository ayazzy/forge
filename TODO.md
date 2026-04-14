# Forge — Product TODO

## High Impact — Core Product Gaps

- [x] **Existing channel onboarding** — Most signups will be active creators, not beginners. Onboarding should let them paste their channel URL and auto-import: niche, tone, average video length, and top-performing topics. Pre-populate the channel template instead of asking them to describe their own channel from scratch.
- [ ] **Connect your channel (YouTube OAuth)** — Let creators link their YouTube account so Forge can track how videos made in Forge perform after publishing. Views, CTR, retention curve, watch time. This is the data flywheel that makes the channel template improve over time.
- [ ] **YouTube Analytics integration** — Connect via YouTube Data API so creators see actual performance of videos made with Forge. Close the loop.
- [ ] **Stage versioning** — Script edits are destructive. Add simple version history per stage (last 3 outputs) to remove regeneration anxiety.

---

## Medium Impact — UX & Workflow

- [ ] **Non-linear pipeline navigation** — Allow going back to revise earlier stages without losing downstream work (with a warning).
- [ ] **Episode planning / scheduling** — Calendar view with queued topics. Find a topic in Trends, schedule it, start the pipeline.
- [ ] **Hook score & retention aggregated** — Already calculating hook scores and drop-off points per script. Surface patterns across episodes: "Your hooks average 3.2/5 — specificity is your weakest dimension."

---

## Lower Effort, High Polish

- [x] **Switch ElevenLabs → Cartesia TTS** — Cartesia backend route + voice browser in Stage2. Speed slider, audio caching, 1-hr voice cache.
- [ ] **Trends auto-refresh** — Topics marked stale after 24h should trigger background regeneration, not require a manual button click.
- [ ] **Bulk asset export** — Download all assets for an episode as a ZIP (research brief, script, audio, images, metadata).
- [x] **Test Stripe end-to-end** — Full checkout flow with a real card. Currently running in live mode.

---

## Bigger Bets

- [ ] **Channel performance dashboard** — After YouTube Analytics integration, surface which niches, tones, and lengths perform best for that channel.
- [ ] **A/B title tracking** — Stage 7 already generates 3 title options. Let users mark which they used and track CTR over time.
- [ ] **Collaboration / team seats** — Already on the Studio pricing plan. Agencies and larger channels need this.
- [ ] **Subtitle / caption generation** — Full script + audio already exists. Generate an SRT file at the end of the pipeline.

---

## Security & Infrastructure

- [ ] **Supabase RLS policies** — Backend currently uses service role key (bypasses RLS). Long-term, set up proper Row Level Security policies on all tables (profiles, episodes, assets, usage, saved_topics) and use user JWTs for per-request Supabase clients. This is the correct architecture but requires careful migration.
- [ ] **Email verification enforcement** — Supabase sends confirmation emails but the app doesn't check verification status. Add check to ProtectedRoute or auth middleware to require verified email before accessing paid features.
- [ ] **Mobile responsiveness** — AppLayout uses fixed 220px sidebar and hardcoded grid layouts. Needs: collapsible sidebar (hamburger menu), single-column pipeline on mobile, touch-friendly inputs. Not a launch blocker for desktop-first creator tool, but needed before any mobile marketing.
- [ ] **CSRF protection** — Currently using Bearer token auth (not auto-attached like cookies), so CSRF risk is lower. If cookie-based auth is ever added, implement CSRF tokens immediately.
- [ ] **Error reporting service** — ErrorBoundary currently logs to console. Integrate Sentry or similar for production error tracking.
- [ ] **Processed events cleanup** — The processed_events table (Stripe idempotency) needs a periodic cleanup job. Delete events older than 30 days. Can be a Supabase cron or a scheduled Railway job.

---

## Completed

- [x] **Payments (Stripe)** — Subscriptions (Creator/Studio/Pro) + episode packs. 7-day free trial. Webhooks, billing portal, plan gating.
- [x] **One Shot Mode** — Automated pipeline run (research → script → titles/voices/images in parallel). Gated to Studio/Pro plans. Available in both guest try flow and authenticated pipeline.
- [x] **Try-before-signup funnel** — /try guest flow with real generated output (titles, voice cast, image prompts) on gate page. Cached to localStorage.
- [x] **Plan gating** — All app pages require an active plan. Sidebar shows lock icons + "Upgrade to unlock" for users without a plan. Sidebar shows real plan name.
- [x] **ProtectedRoute race condition fix** — Billing always fetched fresh before rendering children. 4s retry for Stripe webhook timing.
- [x] **Signup/Login redirect flow** — ?redirect= param support. Animated progress bar on signup.
- [x] **Fix stage label mismatch** — Thumbnail and Metadata labels corrected in pipeline nav.
- [x] **Wire up usage meter in Settings** — Connected to real data from /api/stripe/billing.
- [x] **Configurable weekly goal** — User-settable in Settings.
- [x] **Episode search & filter** — Search box and status filter in episode library.
- [x] **Save topics for later** — Bookmark trend topics; saved ideas list on Trends page.
- [x] **Stage1Script copy button** — Moved to action bar alongside feedback/revise.
- [x] **Retention rewrite box dark theme fix** — Was white-on-white; fixed to dark surface.
- [x] **Episode credit deduction order** — Deduction now happens after successful DB insert.
- [x] **Cartesia TTS migration** — `backend/routes/cartesia.js` with chunked generation, 1-hr voice cache. Stage2 rebuilt with voice browser (3-col grid), speed slider, audio caching, preview button.
- [x] **Claude model tiering** — Sonnet for Stage 0, 1 (creative). Haiku for Stage 2, 3, 4, 7 (structured JSON). 30-40% cost reduction.
- [x] **Prompt caching** — `anthropic-beta: prompt-caching-2024-07-31` with cached system prompt in both claude.js and claudeStream.js.
- [x] **Pricing update** — Creator $39/$29, Studio $79/$59, Pro $149/$119. Annual/monthly toggle on Pricing page. Pack prices: 1ep $8, 3ep $20, 5ep $30. Plan limits: Creator 4, Studio 12, Pro 30.
- [x] **Feature gating utility** — `frontend/src/lib/features.js` with PLAN_FEATURES map, hasFeature(), getUpgradePlan(). `UpgradePrompt.jsx` reusable component. Backend feature gating for one_shot in claude.js + claudeStream.js.
