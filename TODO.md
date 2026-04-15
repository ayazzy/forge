# Forge — Product TODO

## Post-Launch

- [ ] **Voice cloning (Pro feature)** — Let Pro users upload 30s of audio to clone their voice via Cartesia. Save cloned voice ID to profile. Show as "My Voice" in voice browser.
- [ ] **Aggregated hook & retention insights** — Surface patterns across all episodes on the Dashboard: "Your hooks average 3.4/5 — specificity is your weakest dimension."
- [ ] **YouTube OAuth + Analytics** — Connect via OAuth so creators can track how Forge-made videos perform. Views, CTR, retention curve. This is the data flywheel.
- [ ] **A/B title tracking** — Stage 7 generates 3 titles. Let users mark which they used. Track CTR after YouTube Analytics integration.

---

## Medium Impact — UX & Workflow

- [ ] **Non-linear pipeline navigation** — Allow going back to revise earlier stages without losing downstream work (with a warning).
- [ ] **Episode planning / scheduling** — Calendar view with queued topics. Find a topic in Trends, schedule it, start the pipeline.

---

## Lower Effort, High Polish

- [ ] **Trends auto-refresh** — Topics marked stale after 24h should trigger background regeneration, not require a manual button click.

---

## Bigger Bets

- [ ] **Channel performance dashboard** — After YouTube Analytics integration, surface which niches, tones, and lengths perform best for that channel.
- [ ] **Collaboration / team seats** — Already on the Studio pricing plan. Agencies and larger channels need this.

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

- [x] **Existing channel onboarding** — Paste channel URL → auto-import niche, tone, avg length, top videos. Pre-populates channel template.
- [x] **Payments (Stripe)** — Subscriptions (Creator/Studio/Pro) + episode packs. No trial period — free users get one episode credit on signup. Webhooks, billing portal, plan gating.
- [x] **One Shot Mode** — Automated pipeline run (research → script → titles/voices/images in parallel). Gated to Studio/Pro plans.
- [x] **Plan gating** — All app pages require auth + active plan. Sidebar shows lock icons + "Upgrade to unlock" for users without a plan. Sidebar shows real plan name.
- [x] **ProtectedRoute race condition fix** — Billing always fetched fresh before rendering children. 4s retry for Stripe webhook timing.
- [x] **Signup/Login redirect flow** — ?redirect= param support. Animated progress bar on signup.
- [x] **Fix stage label mismatch** — Thumbnail and Metadata labels corrected in pipeline nav.
- [x] **Configurable weekly goal** — User-settable in Settings.
- [x] **Episode search & filter** — Search box and status filter in episode library.
- [x] **Save topics for later** — Bookmark trend topics; saved topics tab on Trends page.
- [x] **Stage1Script copy button** — Moved to action bar alongside feedback/revise.
- [x] **Retention rewrite box dark theme fix** — Was white-on-white; fixed to dark surface.
- [x] **Episode credit deduction order** — Deduction now happens after successful DB insert.
- [x] **Cartesia TTS migration** — `backend/routes/cartesia.js` with chunked generation, 1-hr voice cache. Stage 2 rebuilt with voice browser (3-col grid), speed slider, audio caching, preview button.
- [x] **Claude model tiering** — Sonnet for Stage 0, 1 (creative). Haiku for Stage 2, 3, 4, 7 (structured JSON). 30-40% cost reduction.
- [x] **Prompt caching** — `anthropic-beta: prompt-caching-2024-07-31` with cached system prompt in claude.js and claudeStream.js.
- [x] **Pricing update** — Creator $39/$29, Studio $79/$59, Pro $149/$119. Annual/monthly toggle on Pricing page. Pack prices: 1ep $8, 3ep $20, 5ep $30. Plan limits: Creator 4, Studio 12, Pro 30.
- [x] **Feature gating utility** — `frontend/src/lib/features.js` with PLAN_FEATURES map, hasFeature(), getUpgradePlan(). `UpgradePrompt.jsx` reusable component. Backend feature gating for one_shot in claude.js + claudeStream.js.
- [x] **Bulk asset export** — ZIP download (script, research brief, audio segments, image prompts, metadata, SRT) from Assembly stage.
- [x] **Broadcast-standard SRT** — 42 chars/line, sentence boundaries, 200ms gaps, tag stripping.
- [x] **Production Brief PDF** — 7-section jsPDF export (cover, script with timestamps, storyboard, sound cues, metadata, thumbnail concepts) from Assembly.
- [x] **Canvas thumbnail mockups** — HTML Canvas 16:9 previews with palette colors in Stage 6.
- [x] **Full narration WAV download** — Web Audio API concat with 0.5s gaps; WAV download from Stage 2.
- [x] **YouTube-ready copy buttons** — Stage 7 copies description+chapters together, "Copy All Metadata" block.
- [x] **Single image prompt call** — Stage 4 replaced N sequential Haiku calls with one call seeing full script for visual coherence.
- [x] **Richer channel template** — exampleParagraph, titleStyle, audienceProfile added to prompt_config; top_videos fed in from import flow.
- [x] **Sidebar streamlined** — Reduced to 5 nav items (Dashboard, Pipeline, Trends, Stats, Settings). Episodes accessible from Dashboard. Saved Topics is a tab in Trends. Calendar visible in Stats.
- [x] **Trends → Pipeline handoff** — sessionStorage carries competition level, suggested angle, evidence ratio, and whyItWorks into Stage 0 research context.
- [x] **Test Stripe end-to-end** — Full checkout flow tested with real card.
- [x] **Subtitle / caption generation** — SRT file generated from script segments at end of pipeline.
