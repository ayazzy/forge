# Forge — Product TODO

## High Impact — Core Product Gaps

- [ ] **Existing channel onboarding** — Most signups will be active creators, not beginners. They have channel history, an established style, and existing upload data. Onboarding should let them paste their channel URL and auto-import: niche, tone, average video length, and top-performing topics. Pre-populate the channel template instead of asking them to describe their own channel from scratch.
- [ ] **Connect your channel (YouTube OAuth)** — Let creators link their YouTube account so Forge can track how videos made in Forge perform after publishing. Views, CTR, retention curve, watch time. Closes the loop between production and results. This is the data flywheel that makes the channel template improve over time.
- [ ] **One-shot / auto mode** — Run the full pipeline automatically with no clicks. Every stage has the logic; needs orchestration layer.
- [ ] **YouTube Analytics integration** — Connect via YouTube Data API so creators see actual performance of videos made with Forge. Close the loop.
- [ ] **Stage versioning** — Script edits are destructive. Add simple version history per stage (last 3 outputs) to remove regeneration anxiety.

---

## Medium Impact — UX & Workflow

- [ ] **Non-linear pipeline navigation** — Allow going back to revise earlier stages without losing downstream work (with a warning).
- [ ] **Episode planning / scheduling** — Calendar view with queued topics. Find a topic in Trends, schedule it, start the pipeline.
- [ ] **Configurable weekly goal** — Weekly target is hardcoded to 2 episodes. Make it user-settable in Settings.
- [ ] **Hook score & retention aggregated** — Already calculating hook scores and drop-off points per script. Surface patterns across episodes: "Your hooks average 3.2/5 — specificity is your weakest dimension."
- [ ] **Save topics for later** — Bookmark a trend topic without immediately starting a pipeline. Simple saved ideas list on Trends page.

---

## Lower Effort, High Polish

- [ ] **Fix stage label mismatch** — Thumbnail and Metadata labels are swapped in the pipeline nav.
- [ ] **Wire up usage meter in Settings** — Currently shows hardcoded 0/500. Connect to real data from `/api/usage`.
- [ ] **Trends auto-refresh** — Topics marked stale after 24h should trigger background regeneration, not require a manual button click.
- [ ] **Episode search & filter** — Search box and status filter (draft/complete) in the episode library.
- [ ] **Bulk asset export** — Download all assets for an episode as a ZIP (research brief, script, audio, images, metadata).

---

## Bigger Bets (Post-Payments)

- [ ] **Channel performance dashboard** — After YouTube Analytics integration, surface which niches, tones, and lengths perform best for that channel. Use it to auto-improve the channel template.
- [ ] **A/B title tracking** — Stage 7 already generates 3 title options. Let users mark which they used and track CTR over time.
- [ ] **Collaboration / team seats** — Already on the Studio pricing plan. Agencies and larger channels need this.
- [ ] **Subtitle / caption generation** — Full script + audio already exists. Generate an SRT file at the end of the pipeline.

---

## In Progress

- [ ] Payments (Stripe integration)
- [ ] Landing page polish
- [ ] One-shot mode (fully automated pipeline run)
