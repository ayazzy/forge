import { useState, useEffect } from "react";
import { claude, claudeStream } from "../../lib/api";
import { analyzeScript } from "../../lib/analysis";
import { S, COLORS, ACCENT } from "../../styles/theme";
import { extractJSON } from "../../lib/parseJSON";

// ─── Mode selector cards ────────────────────────────────────────────────────

function ModeSelector({ onSelect, researchData, billing, onOneShot }) {
  const hasResearch = !!researchData?.research;
  const [showUpgrade, setShowUpgrade] = useState(false);

  const plan = billing?.plan;
  const isActive = billing?.subscription_status === 'active' || billing?.subscription_status === 'trialing';
  const canOneShot = isActive && (plan === 'studio' || plan === 'pro');

  const modes = [
    {
      id: "write",
      icon: "✍",
      title: "Write my own",
      desc: "Start with a blank page. Research panel stays open as a reference while you write.",
    },
    {
      id: "assisted",
      icon: "◈",
      title: "AI draft, I'll edit",
      desc: "Enter your topic and Forge writes a full script. Edit it after generation.",
    },
  ];

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", paddingTop: "24px" }}>
      <div style={{ fontSize: "13px", color: COLORS.textTertiary, marginBottom: "20px", textAlign: "center" }}>
        How do you want to approach this script?
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "10px",
              padding: "18px 20px",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}
          >
            <span style={{ fontSize: "20px", lineHeight: 1, marginTop: "2px", flexShrink: 0 }}>{m.icon}</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: COLORS.text, marginBottom: "4px" }}>{m.title}</div>
              <div style={{ fontSize: "12px", color: COLORS.textSecondary, lineHeight: "1.6" }}>{m.desc}</div>
              {m.id === "write" && !hasResearch && (
                <div style={{ fontSize: "11px", color: COLORS.textTertiary, marginTop: "6px" }}>
                  No research brief found — you can still write without one.
                </div>
              )}
            </div>
          </button>
        ))}

        {/* One Shot card */}
        <button
          onClick={() => {
            if (canOneShot) {
              onOneShot?.();
            } else {
              setShowUpgrade(v => !v);
            }
          }}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "16px",
            background: canOneShot ? "rgba(224,53,53,0.04)" : COLORS.surface,
            border: `1px solid ${canOneShot ? "rgba(224,53,53,0.3)" : COLORS.border}`,
            borderRadius: "10px",
            padding: "18px 20px",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit",
            opacity: canOneShot ? 1 : 0.6,
            transition: "border-color 0.15s, opacity 0.15s",
            position: "relative",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = canOneShot ? ACCENT : COLORS.border; e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = canOneShot ? "rgba(224,53,53,0.3)" : COLORS.border; e.currentTarget.style.opacity = canOneShot ? "1" : "0.6"; }}
        >
          <span style={{ fontSize: "20px", lineHeight: 1, marginTop: "2px", flexShrink: 0 }}>⚡</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "14px", fontWeight: "700", color: canOneShot ? ACCENT : COLORS.text }}>One Shot Mode</span>
              {!canOneShot && (
                <span style={{ fontSize: "10px", fontWeight: "700", background: "rgba(255,255,255,0.08)", border: `1px solid ${COLORS.border}`, borderRadius: "4px", padding: "2px 7px", color: COLORS.textTertiary, display: "flex", alignItems: "center", gap: "4px" }}>
                  🔒 Studio plan
                </span>
              )}
            </div>
            <div style={{ fontSize: "12px", color: COLORS.textSecondary, lineHeight: "1.6" }}>
              Type a topic — Forge runs research, script, titles, voice cast, and image prompts in one go.
            </div>
          </div>
        </button>

        {/* Inline upgrade prompt */}
        {showUpgrade && (
          <div style={{ background: "rgba(224,53,53,0.06)", border: `1px solid rgba(224,53,53,0.2)`, borderRadius: "10px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: COLORS.text, marginBottom: "4px" }}>One Shot is available on Studio and Pro</div>
              <div style={{ fontSize: "12px", color: COLORS.textSecondary }}>Upgrade to run research, script, titles, voice cast, and image prompts in a single click.</div>
            </div>
            <a
              href="/pricing"
              style={{ background: ACCENT, color: "#fff", padding: "8px 16px", borderRadius: "7px", fontSize: "12px", fontWeight: "700", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
            >
              Upgrade →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reference panel ────────────────────────────────────────────────────────

function ResearchTab({ researchData }) {
  const r = researchData?.research;
  if (!r) {
    return (
      <div style={{ fontSize: "12px", color: COLORS.textTertiary, lineHeight: "1.7", padding: "8px 0" }}>
        No research brief yet. Go back to the Research stage to generate one, or write without it.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {r.coreConcept && (
        <div>
          <div style={{ fontSize: "10px", fontWeight: "700", color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "5px" }}>Core Concept</div>
          <div style={{ fontSize: "12px", color: COLORS.textSecondary, lineHeight: "1.65" }}>{r.coreConcept}</div>
        </div>
      )}
      {r.mainSubject && (
        <div>
          <div style={{ fontSize: "10px", fontWeight: "700", color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "5px" }}>Main Subject</div>
          <div style={{ fontSize: "12px", color: COLORS.text, fontWeight: "600", marginBottom: "2px" }}>{r.mainSubject.name}</div>
          {r.mainSubject.role && <div style={{ fontSize: "11px", color: COLORS.textSecondary }}>{r.mainSubject.role}</div>}
          {r.mainSubject.angle && <div style={{ fontSize: "11px", color: COLORS.textTertiary, fontStyle: "italic", marginTop: "2px" }}>{r.mainSubject.angle}</div>}
        </div>
      )}
      {(r.keyFacts || []).length > 0 && (
        <div>
          <div style={{ fontSize: "10px", fontWeight: "700", color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Key Facts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {r.keyFacts.map((f, i) => (
              <div key={i} style={{ background: COLORS.surfaceSecondary, borderRadius: "6px", padding: "8px 10px" }}>
                <div style={{ fontSize: "11px", color: COLORS.text, fontWeight: "600", marginBottom: "2px" }}>{f.fact}</div>
                {f.why && <div style={{ fontSize: "10px", color: COLORS.textTertiary, fontStyle: "italic" }}>{f.why}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {(r.authenticDetails || []).length > 0 && (
        <div>
          <div style={{ fontSize: "10px", fontWeight: "700", color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Authentic Details</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {r.authenticDetails.map((d, i) => (
              <div key={i} style={{ fontSize: "11px", color: COLORS.textSecondary, paddingLeft: "8px", borderLeft: `2px solid ${COLORS.border}` }}>{d}</div>
            ))}
          </div>
        </div>
      )}
      {(r.avoidCliches || []).length > 0 && (
        <div>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#d97706", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Avoid These Clichés</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {r.avoidCliches.map((c, i) => (
              <span key={i} style={{ fontSize: "10px", background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: "4px", padding: "2px 7px", color: "#d97706" }}>{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelTab({ researchData }) {
  const ch = researchData?.channelProfile;
  if (!ch?.channel_name) {
    return (
      <div style={{ fontSize: "12px", color: COLORS.textTertiary, lineHeight: "1.7", padding: "8px 0" }}>
        No channel profile found. Complete onboarding to see your channel context here.
      </div>
    );
  }
  const rows = [
    { label: "Channel", value: ch.channel_name },
    { label: "Niche", value: ch.niche },
    { label: "Tone", value: ch.tone },
    { label: "Target length", value: ch.video_length ? `${ch.video_length} min` : null },
    { label: "Description", value: ch.description },
  ].filter(r => r.value);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {rows.map(r => (
        <div key={r.label}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>{r.label}</div>
          <div style={{ fontSize: "12px", color: COLORS.textSecondary, lineHeight: "1.6" }}>{r.value}</div>
        </div>
      ))}
    </div>
  );
}

function ScoreTab({ feedback, onApplyRetentionFix, onApplyCoachFix }) {
  const [appliedFix, setAppliedFix] = useState(null);

  if (!feedback) {
    return (
      <div style={{ fontSize: "12px", color: COLORS.textTertiary, lineHeight: "1.7", padding: "8px 0" }}>
        Click "Get Feedback" below the editor to analyze your script.
      </div>
    );
  }

  const { hook, retention, coach } = feedback;
  const scoreColor = (s) => s >= 4 ? COLORS.success : s >= 3 ? "#d97706" : COLORS.error;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Hook */}
      {hook && (
        <div>
          <div style={{ fontSize: "10px", fontWeight: "700", color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Hook Score</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "10px" }}>
            <span style={{ fontSize: "28px", fontWeight: "800", color: scoreColor(hook.score) }}>{hook.score}</span>
            <span style={{ fontSize: "13px", color: COLORS.textTertiary }}>/5</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {Object.entries(hook.dimensions || {}).map(([key, val]) => (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span style={{ fontSize: "10px", color: COLORS.textSecondary, textTransform: "capitalize" }}>{key}</span>
                  <span style={{ fontSize: "10px", fontWeight: "700", color: scoreColor(val.score) }}>{val.score}/5</span>
                </div>
                <div style={{ height: "3px", background: COLORS.surfaceSecondary, borderRadius: "2px", marginBottom: "3px" }}>
                  <div style={{ height: "100%", width: `${(val.score / 5) * 100}%`, background: scoreColor(val.score), borderRadius: "2px", transition: "width 0.4s ease" }} />
                </div>
                {val.verdict && <div style={{ fontSize: "10px", color: COLORS.textTertiary, fontStyle: "italic" }}>{val.verdict}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retention risks */}
      {retention?.risks?.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", fontWeight: "700", color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Drop-off Risks</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {retention.risks.map((r, i) => (
              <div key={i} style={{ background: COLORS.surfaceSecondary, borderRadius: "7px", padding: "10px 12px", border: `1px solid ${COLORS.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "700", color: COLORS.error }}>Risk {i + 1}</span>
                  <span style={{ fontSize: "10px", color: COLORS.textTertiary, fontFamily: "monospace" }}>~{r.timestamp}</span>
                </div>
                <div style={{ fontSize: "11px", color: COLORS.textSecondary, marginBottom: "6px", lineHeight: "1.5" }}>{r.risk}</div>
                {r.originalLine && (
                  <div style={{ fontSize: "10px", color: COLORS.textTertiary, fontStyle: "italic", marginBottom: "4px", borderLeft: `2px solid rgba(239,68,68,0.4)`, paddingLeft: "6px" }}>
                    "{r.originalLine.substring(0, 80)}{r.originalLine.length > 80 ? '…' : ''}"
                  </div>
                )}
                {r.rewrite && (
                  <div style={{ fontSize: "10px", color: COLORS.textSecondary, borderLeft: `2px solid rgba(74,222,128,0.5)`, paddingLeft: "6px", marginBottom: "6px" }}>
                    "{r.rewrite.substring(0, 80)}{r.rewrite.length > 80 ? '…' : ''}"
                  </div>
                )}
                <button
                  onClick={() => { onApplyRetentionFix(r, i); setAppliedFix(`r${i}`); setTimeout(() => setAppliedFix(null), 2000); }}
                  style={{ fontSize: "10px", background: appliedFix === `r${i}` ? COLORS.success : "transparent", color: appliedFix === `r${i}` ? "#fff" : ACCENT, border: `1px solid ${appliedFix === `r${i}` ? COLORS.success : ACCENT}`, borderRadius: "4px", padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" }}
                >
                  {appliedFix === `r${i}` ? "✓ Applied" : "Apply fix →"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coach */}
      {coach && (
        <div>
          <div style={{ fontSize: "10px", fontWeight: "700", color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Script Coach</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
            {["narrative_tension", "pacing", "specificity", "emotional_arc"].map(key => {
              const val = coach[key];
              if (!val) return null;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ fontSize: "10px", color: COLORS.textSecondary, textTransform: "capitalize" }}>{key.replace("_", " ")}</span>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: scoreColor(val.score) }}>{val.score}/5</span>
                  </div>
                  <div style={{ height: "3px", background: COLORS.surfaceSecondary, borderRadius: "2px", marginBottom: "3px" }}>
                    <div style={{ height: "100%", width: `${(val.score / 5) * 100}%`, background: scoreColor(val.score), borderRadius: "2px", transition: "width 0.4s ease" }} />
                  </div>
                  {val.verdict && <div style={{ fontSize: "10px", color: COLORS.textTertiary, fontStyle: "italic" }}>{val.verdict}</div>}
                </div>
              );
            })}
          </div>
          {coach.weakest_moment && (
            <div style={{ background: COLORS.surfaceSecondary, borderRadius: "7px", padding: "10px 12px", border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#d97706", marginBottom: "5px" }}>Weakest Moment</div>
              {coach.weakest_moment.issue && (
                <div style={{ fontSize: "11px", color: COLORS.textSecondary, marginBottom: "6px", lineHeight: "1.5" }}>{coach.weakest_moment.issue}</div>
              )}
              {coach.weakest_moment.paragraph && (
                <div style={{ fontSize: "10px", color: COLORS.textTertiary, fontStyle: "italic", borderLeft: `2px solid rgba(217,119,6,0.4)`, paddingLeft: "6px", marginBottom: "6px" }}>
                  "{coach.weakest_moment.paragraph.substring(0, 100)}{coach.weakest_moment.paragraph.length > 100 ? '…' : ''}"
                </div>
              )}
              {coach.weakest_moment.rewrite && (
                <div style={{ fontSize: "10px", color: COLORS.textSecondary, borderLeft: `2px solid rgba(74,222,128,0.5)`, paddingLeft: "6px", marginBottom: "8px" }}>
                  "{coach.weakest_moment.rewrite.substring(0, 100)}{coach.weakest_moment.rewrite.length > 100 ? '…' : ''}"
                </div>
              )}
              <button
                onClick={() => { onApplyCoachFix(coach.weakest_moment); setAppliedFix('coach'); setTimeout(() => setAppliedFix(null), 2000); }}
                style={{ fontSize: "10px", background: appliedFix === 'coach' ? COLORS.success : "transparent", color: appliedFix === 'coach' ? "#fff" : ACCENT, border: `1px solid ${appliedFix === 'coach' ? COLORS.success : ACCENT}`, borderRadius: "4px", padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" }}
              >
                {appliedFix === 'coach' ? "✓ Applied" : "Apply rewrite →"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Stage1 component ──────────────────────────────────────────────────

function Stage1({ onApprove, saved, researchData, isComplete, onBackToSummary, billing, onOneShot }) {
  const hasScript = !!saved?.script;
  const [scriptMode, setScriptMode] = useState(hasScript ? 'editing' : 'choose');

  const [script, setScript] = useState(saved?.script || '');
  const [topic, setTopic] = useState(saved?.topic || researchData?.topic || '');
  const [episode, setEpisode] = useState(saved?.episode || '');
  const [ctx, setCtx] = useState(saved?.ctx || '');
  const [analysis, setAnalysis] = useState(saved?.analysis || null);

  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const [copied, setCopied] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [revising, setRevising] = useState(false);
  const [showRevision, setShowRevision] = useState(false);

  const [feedback, setFeedback] = useState(null);
  const [gettingFeedback, setGettingFeedback] = useState(false);

  // Panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState('Research');

  useEffect(() => {
    if (script) setAnalysis(analyzeScript(script));
  }, [script]);

  const enterMode = (mode) => {
    setScriptMode(mode);
    if (mode === 'write') {
      setPanelOpen(true);
      setPanelTab('Research');
    }
  };

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setGenError(null);
    setScript('');
    setAnalysis(null);
    setFeedback(null);

    const scriptInstruction = researchData?.channelProfile?.prompt_config?.scriptPrompt ||
      'Write an engaging script appropriate for the topic and channel style.';
    const targetWords = researchData?.channelProfile?.prompt_config?.targetWordCount || 2000;

    const prompt = `You are the writer for ${researchData?.channelProfile?.channel_name || 'a YouTube channel'}.

${scriptInstruction}

Write a full narration script of approximately ${targetWords} words.
Topic: ${topic}
${episode ? `Episode: ${episode}` : ''}
${ctx ? `Additional context: ${ctx}` : ''}
${researchData?.researchText ? `Research brief:\n${researchData.researchText}` : ''}

CRITICAL — Opening hook requirements (your hook must nail all of these):
- Specificity: Use concrete names, dates, numbers — no vague generalities
- Curiosity: Start mid-action or with a statement that demands the viewer continue
- Stakes: Establish immediately that something important hangs in the balance
- Originality: An unusual angle on the topic, not the default entry point
- Pacing: Short punchy sentences that pull the reader forward

Return ONLY the script. No headers, no stage directions, pure narration prose.`;

    let fullText = '';
    try {
      await claudeStream(prompt, (chunk) => {
        fullText += chunk;
        setScript(fullText);
      }, 4000);
      if (!fullText.trim()) throw new Error('Empty response received.');
    } catch (e) {
      console.error('Stream error:', e);
      setGenError(e.message || 'Generation failed. Please try again.');
      setRetryCount(c => c + 1);
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  const revise = async () => {
    if (!revisionFeedback.trim() || !script) return;
    setRevising(true);
    const targetWords = researchData?.channelProfile?.prompt_config?.targetWordCount || 2000;
    const revised = await claude(`You are the writer for ${researchData?.channelProfile?.channel_name || 'a YouTube channel'}.
Here is the current script:
${script}
The editor has the following feedback:
"${revisionFeedback}"
Rewrite the script incorporating this feedback. Keep everything that works. Fix only what's noted.
Maintain the same register and style. Same word count target (~${targetWords} words).
Return ONLY the revised script, no explanation.`, 4000);
    setScript(revised);
    setRevisionFeedback('');
    setShowRevision(false);
    setRevising(false);
  };

  const getFeedback = async () => {
    if (!script.trim()) return;
    setGettingFeedback(true);
    setFeedback(null);
    setPanelOpen(true);
    setPanelTab('Score');

    const firstPara = script.trim().split(/\n\n/)[0] || '';
    const prompt = `You are a YouTube script expert. Analyze this script and return ONLY valid JSON with this exact structure — no other text.

Hook text (opening paragraph):
"${firstPara.substring(0, 400)}"

Full script (first 4000 chars):
${script.substring(0, 4000)}

Return this JSON:
{
  "hook": {
    "score": 4,
    "dimensions": {
      "specificity": { "score": 3, "verdict": "One sentence feedback" },
      "curiosity": { "score": 5, "verdict": "One sentence feedback" },
      "stakes": { "score": 4, "verdict": "One sentence feedback" },
      "originality": { "score": 4, "verdict": "One sentence feedback" },
      "pacing": { "score": 3, "verdict": "One sentence feedback" }
    }
  },
  "retention": {
    "risks": [
      {
        "timestamp": "~4:30",
        "risk": "Why viewers drop here",
        "originalLine": "The exact line causing the problem",
        "rewrite": "Improved version of that line",
        "fix": "One sentence on what changed"
      }
    ]
  },
  "coach": {
    "narrative_tension": { "score": 4, "verdict": "One sentence" },
    "pacing": { "score": 3, "verdict": "One sentence" },
    "specificity": { "score": 4, "verdict": "One sentence" },
    "emotional_arc": { "score": 3, "verdict": "One sentence" },
    "weakest_moment": {
      "paragraph": "The exact weakest paragraph from the script",
      "issue": "Why this is the weakest point",
      "rewrite": "A concrete rewrite suggestion"
    }
  }
}

Rules: hook scores are 1-5. Identify exactly 3 retention risks. Be specific — quote actual lines from the script.`;

    try {
      const raw = await claude(prompt, 3000);
      const parsed = extractJSON(raw);
      setFeedback(parsed || { error: 'Could not parse feedback. Try again.' });
    } catch (e) {
      setFeedback({ error: 'Feedback failed. Try again.' });
    }
    setGettingFeedback(false);
  };

  const applyRetentionFix = (risk) => {
    if (risk.originalLine && risk.rewrite) {
      setScript(prev => prev.replace(risk.originalLine, risk.rewrite));
    }
  };

  const applyCoachFix = (weakest) => {
    if (weakest.paragraph && weakest.rewrite) {
      setScript(prev => prev.replace(weakest.paragraph, weakest.rewrite));
    }
  };

  const targetVideoLength = researchData?.channelProfile?.video_length || 15;
  const targetMin = Math.max(1, targetVideoLength - 3);
  const targetMax = targetVideoLength + 2;
  const withinTarget = analysis && analysis.minutes >= targetMin && analysis.minutes <= targetMax;

  const inEditor = scriptMode === 'write' || scriptMode === 'assisted' || scriptMode === 'editing';
  const showGenerateUI = scriptMode === 'assisted' && !script;

  const PANEL_TABS = ['Research', 'Channel', 'Score'];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={S.sectionTitle}>Your Story</div>
          <div style={S.sectionSubtitle}>Write, generate, or refine your script before moving to narration.</div>
        </div>
        {isComplete && (
          <button onClick={onBackToSummary} style={{ ...S.btnGhost, marginTop: '4px', whiteSpace: 'nowrap' }}>
            ← Back to Summary
          </button>
        )}
      </div>

      {/* Mode selection */}
      {scriptMode === 'choose' && (
        <ModeSelector onSelect={enterMode} researchData={researchData} billing={billing} onOneShot={onOneShot} />
      )}

      {/* Editor + panel split */}
      {inEditor && (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

          {/* ── Left: Script editor ────────────────────────────── */}
          <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Assisted pre-gen inputs */}
            {showGenerateUI && (
              <div style={{ ...S.card, display: 'grid', gridTemplateColumns: '2fr 1.5fr auto', gap: '14px', alignItems: 'start' }}>
                {researchData?.research ? (
                  <div style={{ background: COLORS.surfaceSecondary, borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Research Brief</div>
                    <div style={{ fontSize: '13px', color: COLORS.text, fontWeight: '600', marginBottom: '4px' }}>{researchData.topic}</div>
                    {researchData.research?.coreConcept && (
                      <div style={{ fontSize: '12px', color: COLORS.textSecondary, lineHeight: '1.5' }}>{researchData.research.coreConcept}</div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label style={S.label}>Topic</label>
                    <textarea style={S.textarea(80)} value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. The last merchant on the Silk Road" />
                  </div>
                )}
                <div>
                  <label style={S.label}>Additional Context <span style={{ color: COLORS.textTertiary, fontWeight: '400', textTransform: 'none' }}>(optional)</span></label>
                  <textarea style={S.textarea(80)} value={ctx} onChange={e => setCtx(e.target.value)} placeholder="Tone notes, specific events, angles…" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
                  <div>
                    <label style={S.label}>Episode #</label>
                    <input style={S.input} value={episode} onChange={e => setEpisode(e.target.value)} placeholder="e.g. 02" />
                  </div>
                  <button style={S.btnPrimary(loading || !topic.trim())} onClick={generate} disabled={loading || !topic.trim()}>
                    {loading ? 'Writing…' : 'Generate Script'}
                  </button>
                  {genError && (
                    <div style={{ background: '#2a1515', border: '1px solid #3a1515', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: '#e03535' }}>
                      {genError}
                      {retryCount >= 3 && <div style={{ marginTop: '4px', color: '#d97706' }}>Still failing? Try simplifying your topic or refreshing.</div>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Script textarea (shown when writing or after generation) */}
            {(script || scriptMode === 'write') && (
              <>
                {scriptMode === 'write' && !script && (
                  <div style={{ fontSize: '11px', color: COLORS.textTertiary, marginBottom: '2px' }}>
                    Write your script below — the research panel is open on the right for reference.
                  </div>
                )}
                {loading && (
                  <div style={{ fontSize: '11px', color: COLORS.textTertiary, marginBottom: '2px' }}>
                    Streaming your script — edit as it arrives…
                  </div>
                )}
                {!loading && script && (
                  <div style={{ fontSize: '11px', color: COLORS.textTertiary, marginBottom: '2px' }}>
                    Edit directly — word count updates live
                  </div>
                )}
                <textarea
                  style={{ ...S.textarea(480), fontFamily: 'inherit', fontSize: '13px', lineHeight: '1.9', resize: 'vertical' }}
                  value={script}
                  onChange={e => setScript(e.target.value)}
                  placeholder={scriptMode === 'write' ? 'Start writing your script here…' : ''}
                />

                {/* Stats bar */}
                {analysis && (
                  <div style={{ display: 'flex', gap: '20px', padding: '10px 14px', background: COLORS.surfaceSecondary, borderRadius: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Words', value: analysis.wordCount.toLocaleString() },
                      { label: 'Read time', value: `${analysis.minutes}m ${analysis.seconds}s` },
                      { label: 'Paragraphs', value: analysis.paragraphCount },
                    ].map(s => (
                      <div key={s.label} style={{ display: 'flex', gap: '5px', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: COLORS.text }}>{s.value}</span>
                        <span style={{ fontSize: '11px', color: COLORS.textSecondary }}>{s.label}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: '12px', color: withinTarget ? COLORS.success : COLORS.error, fontWeight: '500' }}>
                      {withinTarget
                        ? `✓ Within ${targetMin}–${targetMax} min target`
                        : analysis.minutes < targetMin
                          ? `${targetMin - analysis.minutes}m short of target`
                          : `${analysis.minutes - targetMax}m over target`}
                    </div>
                  </div>
                )}

                {/* Action bar */}
                <div style={{ display: 'flex', alignItems: 'center', background: COLORS.surfaceSecondary, borderRadius: '8px', overflow: 'hidden', border: `1px solid rgba(255,255,255,0.04)` }}>
                  <button
                    style={{ ...S.btnSecondary(gettingFeedback || !script.trim()), flex: 1, border: 'none', background: 'transparent', borderRadius: '0' }}
                    onClick={getFeedback}
                    disabled={gettingFeedback || !script.trim()}
                  >
                    {gettingFeedback ? 'Analyzing…' : feedback ? 'Re-analyze' : 'Get Feedback'}
                  </button>
                  <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                  <button
                    style={{ ...S.btnSecondary(false), flexShrink: 0, border: 'none', background: 'transparent', borderRadius: '0' }}
                    onClick={() => setShowRevision(v => !v)}
                  >
                    Revise
                  </button>
                  <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                  <button
                    style={{ ...S.btnSecondary(copied), flexShrink: 0, border: 'none', background: 'transparent', borderRadius: '0' }}
                    onClick={() => { navigator.clipboard.writeText(script); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* Revision box */}
                {showRevision && (
                  <div style={{ background: COLORS.surfaceSecondary, borderRadius: '8px', padding: '14px', border: `1px solid ${COLORS.border}` }}>
                    <label style={{ ...S.label, marginBottom: '6px', display: 'block' }}>Revision notes</label>
                    <textarea
                      style={{ ...S.textarea(72), fontSize: '13px', marginBottom: '10px' }}
                      value={revisionFeedback}
                      onChange={e => setRevisionFeedback(e.target.value)}
                      placeholder="e.g. The opening is too slow. The collapse section needs more weight."
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={S.btnPrimary(revising || !revisionFeedback.trim())} onClick={revise} disabled={revising || !revisionFeedback.trim()}>
                        {revising ? 'Revising…' : 'Apply Revision'}
                      </button>
                      <button style={{ ...S.btnSecondary(false), flexShrink: 0 }} onClick={() => { setShowRevision(false); setRevisionFeedback(''); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Rewrite button for assisted mode */}
                {scriptMode === 'assisted' && script && (
                  <button style={{ ...S.btnSecondary(loading), fontSize: '12px' }} onClick={() => { setScript(''); setFeedback(null); setAnalysis(null); }} disabled={loading}>
                    ↺ Start over with new generation
                  </button>
                )}
              </>
            )}

            {/* Approve */}
            {script && (
              <button style={{ ...S.btnApprove, justifyContent: 'center', marginTop: '4px' }} onClick={() => onApprove({ script, analysis, episode, topic, ctx })}>
                Looks good, continue →
              </button>
            )}
          </div>

          {/* ── Right: Reference panel ─────────────────────────── */}
          <div style={{ flex: panelOpen ? 1 : '0 0 auto', minWidth: panelOpen ? '280px' : 'auto', maxWidth: '340px' }}>
            {/* Panel toggle */}
            <button
              onClick={() => setPanelOpen(v => !v)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: panelOpen ? '8px 8px 0 0' : '8px',
                padding: '10px 14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: COLORS.textSecondary,
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              <span>Reference</span>
              <span style={{ fontSize: '10px', color: COLORS.textTertiary }}>{panelOpen ? '▲ Collapse' : '▼ Expand'}</span>
            </button>

            {panelOpen && (
              <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '0' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.border}` }}>
                  {PANEL_TABS.map(t => (
                    <button
                      key={t}
                      onClick={() => setPanelTab(t)}
                      style={{
                        flex: 1,
                        padding: '9px 8px',
                        border: 'none',
                        background: panelTab === t ? COLORS.surfaceSecondary : 'transparent',
                        color: panelTab === t ? COLORS.text : COLORS.textSecondary,
                        fontSize: '11px',
                        fontWeight: panelTab === t ? '700' : '400',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        borderBottom: panelTab === t ? `2px solid ${ACCENT}` : '2px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      {t}
                      {t === 'Score' && feedback && !feedback.error && (
                        <span style={{ marginLeft: '4px', width: '6px', height: '6px', borderRadius: '50%', background: ACCENT, display: 'inline-block', verticalAlign: 'middle' }} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ padding: '14px', maxHeight: '520px', overflowY: 'auto' }}>
                  {panelTab === 'Research' && <ResearchTab researchData={researchData} />}
                  {panelTab === 'Channel' && <ChannelTab researchData={researchData} />}
                  {panelTab === 'Score' && (
                    <ScoreTab
                      feedback={feedback}
                      onApplyRetentionFix={applyRetentionFix}
                      onApplyCoachFix={applyCoachFix}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Stage1;
