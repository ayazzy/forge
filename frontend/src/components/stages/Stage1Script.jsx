import { useState, useEffect } from "react";
import { claude, claudeStream } from "../../lib/api";
import { analyzeScript, formatTime, MOOD_COLORS } from "../../lib/analysis";
import { S, COLORS, ACCENT } from "../../styles/theme";

function Stage1({ onApprove, saved, researchData, isComplete, onBackToSummary }) {
  const [topic, setTopic] = useState(saved?.topic || researchData?.topic || "");
  const [episode, setEpisode] = useState(saved?.episode || "");
  const [ctx, setCtx] = useState(saved?.ctx || "");
  const [script, setScript] = useState(saved?.script || "");
  const [analysis, setAnalysis] = useState(saved?.analysis || null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("script");
  const [copied, setCopied] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [revising, setRevising] = useState(false);
  const [showRevision, setShowRevision] = useState(false);
  const [hookScore, setHookScore] = useState(null);
  const [scoringHook, setScoringHook] = useState(false);
  const [retention, setRetention] = useState(null);
  const [analyzingRetention, setAnalyzingRetention] = useState(false);
  const [appliedFix, setAppliedFix] = useState(null);

  const revise = async () => {
    if (!revisionFeedback.trim() || !script) return;
    setRevising(true);
    const targetWords = researchData?.channelProfile?.prompt_config?.targetWordCount || 2000;
    const revised = await claude(`You are the writer for ${researchData?.channelProfile?.channel_name || "a YouTube channel"}.
Here is the current script:
${script}
The editor has the following feedback:
"${revisionFeedback}"
Rewrite the script incorporating this feedback. Keep everything that works. Fix only what's noted.
Maintain the same register and style. Same word count target (~${targetWords} words).
Return ONLY the revised script, no explanation.`, 4000);
    setScript(revised);
    setRevisionFeedback("");
    setShowRevision(false);
    setRevising(false);
  };

  const scoreHookAuto = async (text) => {
    setScoringHook(true);
    const firstPara = text.trim().split(/\n\n/)[0] || "";
    const raw = await claude(`You are a YouTube retention expert. Score this opening hook for a narrative history video.
Hook:
"${firstPara}"
Score it on these dimensions, each 1-10:
- Intrigue: does it make you need to know what happens?
- Specificity: concrete details vs vague generalities?
- Stakes: do we feel something matters?
- Voice: is the register distinctive and confident?
- Pacing: does the rhythm pull you forward?
Return ONLY valid JSON:
{"overall":7,"dimensions":{"intrigue":{"score":8,"note":"one sentence feedback"},"specificity":{"score":7,"note":"..."},"stakes":{"score":6,"note":"..."},"voice":{"score":8,"note":"..."},"pacing":{"score":7,"note":"..."}},"rewrite":"An improved version of the hook in the same voice","whyBetter":"One sentence explaining what the rewrite fixes"}`, 1000);
    try { setHookScore(JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, "").trim())); }
    catch { setHookScore({ error: "Could not parse." }); }
    setScoringHook(false);
  };

  const analyzeRetentionAuto = async (text) => {
    setAnalyzingRetention(true);
    const raw = await claude(`You are a YouTube retention expert analyzing a narrative history script.
Identify the 3 moments most likely to cause viewers to drop off, and provide a specific line rewrite for each.
Script:
${text.substring(0, 3000)}
Return ONLY valid JSON:
{"risks":[{"timestamp":"approx minute mark e.g. 3:00","risk":"why viewers drop here","originalLine":"the exact line or passage causing the problem","rewrite":"improved version","fix":"one sentence on what changed"}]}
Identify exactly 3 risks. Be specific about which lines are the problem.`, 1500);
    try { setRetention(JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, "").trim())); }
    catch { setRetention({ error: "Could not parse." }); }
    setAnalyzingRetention(false);
  };

  const scoreHook = async () => {
    if (!script) return;
    setScoringHook(true);
    setHookScore(null);
    const firstPara = script.trim().split(/\n\n/)[0] || "";
    const raw = await claude(`You are a YouTube retention expert. Score this opening hook for a narrative history video.
Hook:
"${firstPara}"
Score it on these dimensions, each 1-10:
- Intrigue: does it make you need to know what happens?
- Specificity: concrete details vs vague generalities?
- Stakes: do we feel something matters?
- Voice: is the register distinctive and confident?
- Pacing: does the rhythm pull you forward?
Return ONLY valid JSON:
{"overall":7,"dimensions":{"intrigue":{"score":8,"note":"one sentence feedback"},"specificity":{"score":7,"note":"..."},"stakes":{"score":6,"note":"..."},"voice":{"score":8,"note":"..."},"pacing":{"score":7,"note":"..."}},"rewrite":"An improved version of the hook in the same voice","whyBetter":"One sentence explaining what the rewrite fixes"}`, 1000);
    try { setHookScore(JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, "").trim())); }
    catch { setHookScore({ error: "Could not parse. Try again." }); }
    setScoringHook(false);
  };

  const analyzeRetention = async () => {
    if (!script) return;
    setAnalyzingRetention(true);
    setRetention(null);
    const raw = await claude(`You are a YouTube retention expert analyzing a narrative history script.
Identify the 3 moments most likely to cause viewers to drop off, and provide a specific line rewrite for each.
Script:
${script.substring(0, 3000)}
Return ONLY valid JSON:
{"risks":[{"timestamp":"approx minute mark e.g. 3:00","risk":"why viewers drop here","originalLine":"the exact line or passage causing the problem","rewrite":"improved version","fix":"one sentence on what changed"}]}
Identify exactly 3 risks. Be specific about which lines are the problem.`, 1500);
    try { setRetention(JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, "").trim())); }
    catch { setRetention({ error: "Could not parse. Try again." }); }
    setAnalyzingRetention(false);
  };

  useEffect(() => {
    if (script) setAnalysis(analyzeScript(script));
  }, [script]);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setScript("");
    setAnalysis(null);
    setHookScore(null);
    setRetention(null);

    const scriptInstruction = researchData?.channelProfile?.prompt_config?.scriptPrompt ||
      "Write an engaging script appropriate for the topic and channel style.";
    const targetWords = researchData?.channelProfile?.prompt_config?.targetWordCount || 2000;

    const prompt = `You are the writer for ${researchData?.channelProfile?.channel_name || "a YouTube channel"}.

${scriptInstruction}

Write a full narration script of approximately ${targetWords} words.
Topic: ${topic}
${episode ? `Episode: ${episode}` : ""}
${ctx ? `Additional context: ${ctx}` : ""}
${researchData ? `Research brief:\n${researchData.researchText}` : ""}

CRITICAL — Opening hook requirements (your hook must nail all of these):
- Intrigue: Start mid-action or with a statement that demands the viewer continue
- Specificity: Use concrete names, dates, numbers — no vague generalities
- Stakes: Establish immediately that something important hangs in the balance
- Voice: Be distinctive and confident, not generic
- Pacing: Short punchy sentences that pull the reader forward

Return ONLY the script. No headers, no stage directions, pure narration prose.`;

    let fullText = '';
    try {
      await claudeStream(prompt, (chunk) => {
        fullText += chunk;
        setScript(fullText);
      }, 4000);
    } catch (e) {
      console.error('Stream error:', e);
    }

    setLoading(false);

    // Auto-trigger hook score and retention in background
    if (fullText.trim()) {
      scoreHookAuto(fullText);
      analyzeRetentionAuto(fullText);
    }
  };

  const targetVideoLength = researchData?.channelProfile?.video_length || 15;
  const targetMin = Math.max(1, targetVideoLength - 3);
  const targetMax = targetVideoLength + 2;
  const withinTarget = analysis && analysis.minutes >= targetMin && analysis.minutes <= targetMax;

  const TABS = [
    { key: "script", label: "Script" },
    { key: "moods", label: "Moods" },
    { key: "hook", label: "Hook Score" },
    { key: "retention", label: "Retention" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0" }}>
        <div>
          <div style={S.sectionTitle}>Your Story</div>
          <div style={S.sectionSubtitle}>Edit, score, and refine your script before moving to narration.</div>
        </div>
        {isComplete && (
          <button onClick={onBackToSummary} style={{ ...S.btnGhost, marginTop: "4px", whiteSpace: "nowrap" }}>
            ← Back to Summary
          </button>
        )}
      </div>

      {/* Top control bar */}
      <div style={{ ...S.card, marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr auto", gap: "16px", alignItems: "start" }}>

          {/* Research brief or topic input */}
          {researchData?.research ? (
            <div style={{ background: COLORS.surfaceSecondary, borderRadius: "8px", padding: "12px 14px", height: "100%", boxSizing: "border-box" }}>
              <div style={{ fontSize: "11px", color: COLORS.textTertiary, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Research Brief</div>
              <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: "600", marginBottom: "4px" }}>{researchData.topic}</div>
              {researchData.research?.coreConcept && (
                <div style={{ fontSize: "12px", color: COLORS.textSecondary, lineHeight: "1.5" }}>{researchData.research.coreConcept}</div>
              )}
            </div>
          ) : (
            <div>
              <label style={S.label}>Topic</label>
              <textarea style={S.textarea(80)} value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. The last merchant on the Silk Road" />
            </div>
          )}

          {/* Additional context */}
          <div>
            <label style={S.label}>Additional Context <span style={{ color: COLORS.textTertiary, fontWeight: "400", textTransform: "none" }}>(optional)</span></label>
            <textarea style={S.textarea(80)} value={ctx} onChange={e => setCtx(e.target.value)} placeholder="Tone notes, specific events, angles…" />
          </div>

          {/* Episode + buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "160px" }}>
            <div>
              <label style={S.label}>Episode #</label>
              <input style={S.input} value={episode} onChange={e => setEpisode(e.target.value)} placeholder="e.g. 02" />
            </div>
            <button style={S.btnPrimary(loading || !topic.trim())} onClick={generate} disabled={loading || !topic.trim()}>
              {loading ? "Writing…" : script ? "Regenerate" : "Generate Script"}
            </button>
            {script && (
              <button style={{ ...S.btnApprove, justifyContent: "center" }} onClick={() => onApprove({ script, analysis, episode, topic, ctx })}>
                Approve &amp; Continue →
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        {analysis && (
          <div style={{ display: "flex", gap: "24px", marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${COLORS.borderLight}`, alignItems: "center" }}>
            {[
              { label: "Words", value: analysis.wordCount.toLocaleString() },
              { label: "Read Time", value: `${analysis.minutes}m ${analysis.seconds}s` },
              { label: "Paragraphs", value: analysis.paragraphCount },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
                <span style={{ fontSize: "16px", fontWeight: "700", color: COLORS.text }}>{s.value}</span>
                <span style={{ fontSize: "11px", color: COLORS.textSecondary }}>{s.label}</span>
              </div>
            ))}
            <div style={{ fontSize: "12px", color: withinTarget ? COLORS.success : COLORS.error, fontWeight: "500" }}>
              {withinTarget ? `✓ Within ${targetMin}–${targetMax} min target` : analysis.minutes < targetMin ? `${targetMin - analysis.minutes}m short of target` : `${analysis.minutes - targetMax}m over target`}
            </div>
          </div>
        )}
      </div>

      {/* Full-width script area */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {script ? (
            <>
              {/* Pill tabs */}
              <div style={{ display: "flex", gap: "4px", background: COLORS.surfaceSecondary, padding: "4px", borderRadius: "10px", marginBottom: "16px" }}>
                {TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{
                      flex: 1,
                      padding: "7px 12px",
                      borderRadius: "7px",
                      border: "none",
                      background: tab === t.key ? COLORS.surface : "transparent",
                      color: tab === t.key ? COLORS.text : COLORS.textSecondary,
                      fontSize: "12px",
                      fontWeight: tab === t.key ? "600" : "400",
                      cursor: "pointer",
                      boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      transition: "all 0.15s ease",
                      fontFamily: "inherit",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "script" && (
                <>
                  <div style={{ fontSize: "11px", color: COLORS.textTertiary, marginBottom: "6px" }}>Edit directly — word count updates live</div>
                  <textarea
                    style={{ ...S.textarea(420), fontFamily: "inherit", fontSize: "13px", lineHeight: "1.9" }}
                    value={script}
                    onChange={e => setScript(e.target.value)}
                  />
                </>
              )}

              {tab === "moods" && analysis && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "480px", overflowY: "auto" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px", padding: "10px 12px", background: COLORS.surfaceSecondary, borderRadius: "8px" }}>
                    {Object.entries(MOOD_COLORS).map(([mood, color]) => (
                      <div key={mood} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: "11px", color: COLORS.textSecondary }}>{mood}</span>
                      </div>
                    ))}
                  </div>
                  {analysis.sections.map((s, i) => (
                    <div key={i} title={s.mood} style={{ display: "flex", gap: "10px", padding: "8px 12px", background: COLORS.surface, border: `1px solid ${COLORS.borderLight}`, borderRadius: "8px" }}>
                      <div style={{ width: "3px", background: MOOD_COLORS[s.mood], alignSelf: "stretch", borderRadius: "2px", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "11px", color: COLORS.textSecondary, lineHeight: "1.5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.text.substring(0, 80)}…</div>
                      </div>
                      <div style={{ fontSize: "11px", color: COLORS.textTertiary, minWidth: "40px", textAlign: "right", flexShrink: 0 }}>{formatTime(s.cumulativeTime)}</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "hook" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "480px", overflowY: "auto" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "12px", color: COLORS.textTertiary, fontStyle: "italic" }}>
                      Opening hook scored on intrigue, specificity, stakes, voice, and pacing.
                    </div>
                    <button style={{ ...S.btnSecondary(scoringHook), fontSize: "11px" }} onClick={scoreHook} disabled={scoringHook || !script}>
                      {scoringHook ? "Scoring…" : "Re-score"}
                    </button>
                  </div>
                  {scoringHook && <div style={{ fontSize: "12px", color: COLORS.textTertiary }}>Scoring your hook…</div>}
                  {hookScore?.error && <div style={{ color: COLORS.error, fontSize: "12px" }}>{hookScore.error}</div>}
                  {hookScore && !hookScore.error && (
                    <>
                      <div style={{ ...S.card, display: "flex", alignItems: "center", gap: "16px", marginBottom: 0 }}>
                        <div style={{ fontSize: "36px", color: hookScore.overall >= 7 ? COLORS.success : hookScore.overall >= 5 ? COLORS.warning : COLORS.error, fontWeight: "700", minWidth: "56px" }}>
                          {hookScore.overall}<span style={{ fontSize: "16px", color: COLORS.textTertiary }}>/10</span>
                        </div>
                        <div style={{ fontSize: "12px", color: COLORS.textSecondary }}>Overall hook score</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {Object.entries(hookScore.dimensions || {}).map(([key, val]) => (
                          <div key={key} style={S.card}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={S.label}>{key}</span>
                              <span style={{ fontSize: "12px", fontWeight: "600", color: val.score >= 7 ? COLORS.success : val.score >= 5 ? COLORS.warning : COLORS.error }}>{val.score}/10</span>
                            </div>
                            <div style={{ fontSize: "11px", color: COLORS.textSecondary, lineHeight: "1.4" }}>{val.note}</div>
                          </div>
                        ))}
                      </div>
                      {hookScore.rewrite && (
                        <div style={S.card}>
                          <div style={S.label}>Suggested Rewrite</div>
                          <div style={{ fontSize: "13px", color: COLORS.text, lineHeight: "1.8", fontStyle: "italic", marginBottom: "8px" }}>{hookScore.rewrite}</div>
                          <div style={{ fontSize: "11px", color: COLORS.textSecondary, marginBottom: "12px" }}>{hookScore.whyBetter}</div>
                          <button style={S.btnSecondary(false)} onClick={() => {
                            const paras = script.split(/\n\n/);
                            paras[0] = hookScore.rewrite;
                            setScript(paras.join("\n\n"));
                            setHookScore(null);
                            setTab("script");
                          }}>Apply Rewrite to Script</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {tab === "retention" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "480px", overflowY: "auto" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "12px", color: COLORS.textTertiary, fontStyle: "italic" }}>
                      The 3 highest drop-off risk moments with rewrites to keep viewers watching.
                    </div>
                    <button style={{ ...S.btnSecondary(analyzingRetention), fontSize: "11px" }} onClick={analyzeRetention} disabled={analyzingRetention || !script}>
                      {analyzingRetention ? "Analyzing…" : "Re-analyze"}
                    </button>
                  </div>
                  {analyzingRetention && <div style={{ fontSize: "12px", color: COLORS.textTertiary }}>Analyzing retention risks…</div>}
                  {retention?.error && <div style={{ color: COLORS.error, fontSize: "12px" }}>{retention.error}</div>}
                  {retention && !retention.error && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {(retention.risks || []).map((r, i) => (
                        <div key={i} style={S.card}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <div style={{ fontSize: "12px", fontWeight: "600", color: COLORS.error }}>Risk {i + 1}</div>
                            <div style={{ fontSize: "11px", color: COLORS.textTertiary, fontFamily: "monospace" }}>~{r.timestamp}</div>
                          </div>
                          <div style={{ fontSize: "12px", color: COLORS.error, marginBottom: "10px" }}>{r.risk}</div>
                          <div style={{ background: COLORS.surfaceSecondary, padding: "10px 12px", marginBottom: "8px", borderLeft: "3px solid #fca5a5", borderRadius: "4px" }}>
                            <div style={S.label}>Original</div>
                            <div style={{ fontSize: "12px", color: COLORS.textSecondary, fontStyle: "italic", lineHeight: "1.6" }}>"{r.originalLine}"</div>
                          </div>
                          <div style={{ background: COLORS.surfaceSecondary, padding: "10px 12px", marginBottom: "10px", borderLeft: "3px solid #4ade80", borderRadius: "4px" }}>
                            <div style={S.label}>Rewrite</div>
                            <div style={{ fontSize: "12px", color: COLORS.text, lineHeight: "1.6" }}>"{r.rewrite}"</div>
                          </div>
                          <div style={{ fontSize: "11px", color: COLORS.textSecondary, fontStyle: "italic", marginBottom: "10px" }}>{r.fix}</div>
                          <button style={S.btnSecondary(appliedFix === i)} onClick={() => {
                            if (r.originalLine && r.rewrite) {
                              setScript(prev => prev.replace(r.originalLine, r.rewrite));
                              setAppliedFix(i);
                              setTimeout(() => setAppliedFix(null), 2000);
                            }
                          }}>{appliedFix === i ? "✓ Applied!" : "Apply Fix to Script"}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: "16px" }}>
                {showRevision ? (
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ ...S.label, marginBottom: "6px" }}>Revision notes</label>
                    <textarea
                      style={{ ...S.textarea(80), fontSize: "13px", marginBottom: "10px" }}
                      value={revisionFeedback}
                      onChange={e => setRevisionFeedback(e.target.value)}
                      placeholder="e.g. The opening is too slow. The collapse section needs more weight."
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button style={S.btnPrimary(revising || !revisionFeedback.trim())} onClick={revise} disabled={revising || !revisionFeedback.trim()}>
                        {revising ? "Revising…" : "Apply Revision"}
                      </button>
                      <button style={{ ...S.btnSecondary(false), flexShrink: 0 }} onClick={() => setShowRevision(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <button style={{ ...S.btnSecondary(false), flex: 1 }} onClick={() => setShowRevision(true)}>
                      Give Feedback &amp; Revise
                    </button>
                    <button
                      style={{ ...S.btnSecondary(copied), flexShrink: 0 }}
                      onClick={() => { navigator.clipboard.writeText(script); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    >
                      {copied ? "Copied!" : "Copy Script"}
                    </button>
                  </div>
                )}
              </div>

            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: COLORS.textTertiary, fontSize: "13px" }}>
              Click Generate Script above to begin
            </div>
          )}
      </div>
    </div>
  );
}

export default Stage1;
