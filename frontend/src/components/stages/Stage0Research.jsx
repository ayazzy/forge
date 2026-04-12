import { useState, useEffect } from "react";
import { claude } from "../../lib/api";
import { S, COLORS } from "../../styles/theme";

function Stage0({ onApprove, saved, data, isComplete, onBackToSummary }) {
  const [topic, setTopic] = useState(saved?.topic || "");
  const [context, setContext] = useState(saved?.context || "");

  useEffect(() => {
    if (data?.topicPrefill && !saved?.topic) {
      setTopic(data.topicPrefill);
    }
  }, [data?.topicPrefill]);
  const [research, setResearch] = useState(saved?.research || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setResearch(null);
    const researchInstruction = data?.channelProfile?.prompt_config?.researchPrompt ||
      "Research this topic thoroughly and return a structured brief a content creator can use.";

    const raw = await claude(`You are a researcher for ${data?.channelProfile?.channel_name || "a YouTube channel"}.

${researchInstruction}

Topic: ${topic}
${context ? `Additional context: ${context}` : ""}

Return ONLY valid JSON:
{
  "coreConcept": "The central idea or angle for this video (1-2 sentences)",
  "context": "Key background information the viewer needs to understand this topic",
  "mainSubject": {
    "name": "The main subject, person, concept, or focus of the video",
    "role": "Why this subject matters to the topic",
    "angle": "The specific angle or perspective to take"
  },
  "keyFacts": [
    {"fact": "important fact or detail", "why": "why this matters for the video"}
  ],
  "authenticDetails": ["specific detail 1", "specific detail 2", "specific detail 3"],
  "avoidCliches": ["cliche or generic take to avoid 1", "cliche to avoid 2"]
}`, 2000);
    try { setResearch(JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, "").trim())); }
    catch { setResearch({ error: "Could not parse. Try regenerating." }); }
    setLoading(false);
  };

  const toText = research ? `TOPIC: ${topic}\n${context ? `ADDITIONAL CONTEXT: ${context}\n` : ""}\nCORE CONCEPT: ${research.coreConcept || ""}\n\nCONTEXT: ${research.context || ""}\n\nMAIN SUBJECT: ${research.mainSubject?.name}\nROLE: ${research.mainSubject?.role}\nANGLE: ${research.mainSubject?.angle}\n\nKEY FACTS:\n${(research.keyFacts || []).map(f => `• ${f.fact} — ${f.why}`).join("\n")}\n\nAUTHENTIC DETAILS:\n${(research.authenticDetails || []).map(d => "• " + d).join("\n")}\n\nAVOID: ${(research.avoidCliches || []).join("; ")}` : "";

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0" }}>
        <div>
          <div style={S.sectionTitle}>Research Your Topic</div>
          <div style={S.sectionSubtitle}>
            Tell Forge what your next video is about. The more specific the topic, the better the research brief.
          </div>
        </div>
        {isComplete && (
          <button onClick={onBackToSummary} style={{ ...S.btnGhost, marginTop: "4px", whiteSpace: "nowrap" }}>
            ← Back to Summary
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Left: inputs */}
        <div style={{ ...S.card, marginBottom: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={S.label}>Topic</label>
            <textarea
              style={S.textarea(120)}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. What topic is your next video about?"
            />
          </div>
          <div>
            <label style={S.label}>
              Additional Context <span style={{ color: COLORS.textTertiary, fontWeight: "400", textTransform: "none" }}>(optional)</span>
            </label>
            <input
              style={S.input}
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="e.g. focus on Gen Z, budget-friendly angle, US market"
            />
          </div>
          <button
            style={S.btnPrimary(loading || !topic.trim())}
            onClick={generate}
            disabled={loading || !topic.trim()}
          >
            {loading ? "Researching…" : research ? "Re-research" : "Research This Topic"}
          </button>
          {research && !research.error && (
            <div style={{ fontSize: "12px", color: COLORS.success, fontWeight: "500" }}>
              ✓ Research complete — approve to carry into script
            </div>
          )}
        </div>

        {/* Right: results */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {!research && !loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: COLORS.textTertiary, fontSize: "13px" }}>
              Enter a topic to begin research
            </div>
          )}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: COLORS.textSecondary, fontSize: "13px" }}>
              Researching…
            </div>
          )}
          {research?.error && (
            <div style={{ ...S.card, color: COLORS.error, fontSize: "13px" }}>{research.error}</div>
          )}
          {research && !research.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "560px", overflowY: "auto" }}>

              <div style={S.card}>
                <div style={S.label}>Core Concept</div>
                <div style={{ fontSize: "14px", color: COLORS.text, lineHeight: "1.6" }}>{research.coreConcept}</div>
              </div>

              <div style={S.card}>
                <div style={S.label}>Context</div>
                <div style={{ fontSize: "13px", color: COLORS.textSecondary, lineHeight: "1.6" }}>{research.context}</div>
              </div>

              <div style={S.card}>
                <div style={S.label}>Main Subject</div>
                {[
                  { label: "Subject", val: research.mainSubject?.name },
                  { label: "Role", val: research.mainSubject?.role },
                  { label: "Angle", val: research.mainSubject?.angle },
                ].map(r => (
                  <div key={r.label} style={S.statRow}>
                    <span style={S.statLabel}>{r.label}</span>
                    <span style={{ fontSize: "12px", color: COLORS.textSecondary, textAlign: "right", maxWidth: "65%" }}>{r.val}</span>
                  </div>
                ))}
              </div>

              <div style={S.card}>
                <div style={S.label}>Key Facts</div>
                {(research.keyFacts || []).map((f, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <div style={{ fontSize: "13px", color: COLORS.text, lineHeight: "1.4", marginBottom: "2px" }}>• {f.fact}</div>
                    <div style={{ fontSize: "12px", color: COLORS.textTertiary, paddingLeft: "12px" }}>{f.why}</div>
                  </div>
                ))}
              </div>

              <div style={S.card}>
                <div style={S.label}>Authentic Details</div>
                {(research.authenticDetails || []).map((d, i) => (
                  <div key={i} style={{ fontSize: "13px", color: COLORS.textSecondary, padding: "5px 0", borderBottom: `1px solid ${COLORS.borderLight}`, lineHeight: "1.5" }}>• {d}</div>
                ))}
              </div>

              <div style={S.card}>
                <div style={S.label}>Avoid</div>
                {(research.avoidCliches || []).map((c, i) => (
                  <div key={i} style={{ fontSize: "12px", color: COLORS.textTertiary, padding: "3px 0" }}>✕ {c}</div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  style={{ ...S.btnSecondary(copied), flexShrink: 0 }}
                  onClick={() => { navigator.clipboard.writeText(toText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                >
                  {copied ? "Copied!" : "Copy Brief"}
                </button>
                <button
                  style={{ ...S.btnApprove, flex: 1, justifyContent: "center" }}
                  onClick={() => onApprove({ topic, context, research, researchText: toText })}
                >
                  Approve &amp; Write Script →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Stage0;
