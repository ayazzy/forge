import { useState } from "react";
import { claude } from "../../lib/api";
import { S, COLORS, ACCENT } from "../../styles/theme";
import { extractJSON } from "../../lib/parseJSON";

function Stage6({ data, saved, onApprove, isComplete, onBackToSummary }) {
  const [meta, setMeta] = useState(saved?.meta || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const generate = async () => {
    setLoading(true); setMeta(null);
    const totalMins = data.analysis ? `${data.analysis.minutes}:${String(data.analysis.seconds).padStart(2, "0")}` : "15:00";
    const raw = await claude(`You are a YouTube SEO strategist for ${data.channelProfile?.channel_name || "a YouTube channel"}.
Generate complete upload metadata for this video.
Topic: ${data.topic}
Episode: ${data.episode || ""}
Video duration: ${totalMins}
Script excerpt (first 600 words):
${data.script?.substring(0, 2400) || ""}
Return ONLY valid JSON:
{
  "titles": [
    {"option": "A", "text": "title option 1", "angle": "why this works"},
    {"option": "B", "text": "title option 2", "angle": "why this works"},
    {"option": "C", "text": "title option 3", "angle": "why this works"}
  ],
  "description": "full YouTube description, 3-4 paragraphs, ends with channel tagline and 'New episodes monthly.'",
  "tags": ["tag1","tag2"],
  "category": "Education",
  "chapters": [{"time":"0:00","title":"chapter title"}]
}
CRITICAL: All chapter timestamps must fall within the ${totalMins} video duration. Space chapters evenly across the actual runtime.`, 2000, 'haiku');
    const parsed = extractJSON(raw);
    if (parsed) setMeta(parsed);
    setLoading(false);
  };

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0" }}>
        <div>
          <div style={S.sectionTitle}>Ready to Publish</div>
          <div style={S.sectionSubtitle}>Everything you need to upload your video to YouTube.</div>
        </div>
        {isComplete && (
          <button onClick={onBackToSummary} style={{ ...S.btnGhost, marginTop: "4px", whiteSpace: "nowrap" }}>
            ← Back to Summary
          </button>
        )}
      </div>

      {!meta && !loading && (
        <div style={{ ...S.card, textAlign: "center", padding: "48px 24px" }}>
          <div style={{ color: COLORS.textSecondary, fontSize: "14px", marginBottom: "20px" }}>
            Generate titles, description, tags, and chapter markers
          </div>
          <button style={{ ...S.btnPrimary(false), width: "auto", padding: "12px 40px" }} onClick={generate}>
            Generate Metadata
          </button>
        </div>
      )}
      {loading && (
        <div style={{ ...S.card, color: COLORS.textSecondary, fontSize: "13px", padding: "48px 24px", textAlign: "center" }}>
          Generating metadata…
        </div>
      )}

      {meta && (
        <>
          {/* Titles */}
          <div style={{ ...S.card, marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: COLORS.text }}>Title Options</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {meta.titles?.map((t, i) => (
                <div key={i} style={{ background: COLORS.surfaceSecondary, border: `1px solid ${COLORS.border}`, borderRadius: "8px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", color: COLORS.text, fontWeight: "500", marginBottom: "6px" }}>{t.text}</div>
                    <span style={{ display: "inline-flex", padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "500", background: `${ACCENT}10`, color: ACCENT }}>
                      {t.angle}
                    </span>
                  </div>
                  <button style={{ ...S.btnSecondary(copied === `title-${i}`), flexShrink: 0 }} onClick={() => copy(t.text, `title-${i}`)}>
                    {copied === `title-${i}` ? "✓" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ ...S.card, marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: COLORS.text }}>Description</div>
              <button style={S.btnSecondary(copied === "desc")} onClick={() => copy(meta.description, "desc")}>
                {copied === "desc" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div style={{ fontSize: "13px", color: COLORS.textSecondary, lineHeight: "1.8", whiteSpace: "pre-wrap" }}>{meta.description}</div>
          </div>

          {/* Tags */}
          <div style={{ ...S.card, marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: COLORS.text }}>Tags</div>
              <button style={S.btnSecondary(copied === "tags")} onClick={() => copy(meta.tags?.join(", "), "tags")}>
                {copied === "tags" ? "Copied!" : "Copy All"}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {meta.tags?.map((tag, i) => (
                <span key={i} style={{ background: COLORS.surfaceSecondary, border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary, fontSize: "12px", padding: "5px 14px", borderRadius: "6px" }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Chapters */}
          {meta.chapters?.length > 0 && (
            <div style={{ ...S.card, marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: COLORS.text }}>Chapter Markers</div>
                <button style={S.btnSecondary(copied === "chapters")} onClick={() => copy(meta.chapters.map(c => `${c.time} ${c.title}`).join("\n"), "chapters")}>
                  {copied === "chapters" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {meta.chapters.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: "16px", padding: "9px 12px", borderBottom: i < meta.chapters.length - 1 ? `1px solid ${COLORS.borderLight}` : "none", alignItems: "center", background: i % 2 === 1 ? COLORS.surfaceSecondary : "transparent", borderRadius: i % 2 === 1 ? "4px" : "0" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: "600", color: ACCENT, minWidth: "44px" }}>{c.time}</span>
                    <span style={{ fontSize: "13px", color: COLORS.textSecondary }}>{c.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button style={S.btnSecondary(false)} onClick={generate}>Regenerate</button>
            <button style={{ ...S.btnApprove, flex: 1, justifyContent: "center" }} onClick={() => { if (meta) onApprove({ meta }); }}>
              Looks good, continue →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Stage6;
