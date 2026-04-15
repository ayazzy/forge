import { useState, useRef, useEffect } from "react";
import { claude } from "../../lib/api";
import { S, COLORS, APPROACH_COLORS } from "../../styles/theme";
import { extractJSON } from "../../lib/parseJSON";

// ─── Canvas thumbnail mockup ─────────────────────────────────────────────────
function ThumbnailCanvas({ concept }) {
  const canvasRef = useRef(null);
  const W = 640, H = 360; // 16:9

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bg = concept.colorPalette?.bg || '#0f0f0f';
    const textPrimary = concept.colorPalette?.textPrimary || '#ffffff';
    const textAccent = concept.colorPalette?.textAccent || '#ff3333';

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle gradient overlay for depth
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Accent bar at bottom
    ctx.fillStyle = textAccent;
    ctx.fillRect(0, H - 6, W, 6);

    // Helper: measure & wrap text
    const wrapText = (text, maxWidth, font) => {
      ctx.font = font;
      const words = text.split(' ');
      const lines = [];
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    };

    // Headline
    const headlineFont = 'bold 52px Impact, Arial Black, sans-serif';
    const headlineLines = wrapText(concept.headline || '', W - 80, headlineFont);
    ctx.font = headlineFont;
    ctx.fillStyle = textPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lineH = 60;
    const totalH = headlineLines.length * lineH + (concept.subtext ? 36 : 0);
    let y = (H - totalH) / 2 + lineH / 2;

    // Text shadow
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;

    for (const ln of headlineLines) {
      ctx.fillText(ln, W / 2, y);
      y += lineH;
    }

    // Subtext
    if (concept.subtext) {
      ctx.shadowBlur = 6;
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillStyle = textAccent;
      ctx.fillText(concept.subtext, W / 2, y + 4);
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }, [concept]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: '100%', display: 'block', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
    />
  );
}

function Stage5({ data, onApprove, saved, isComplete, onBackToSummary }) {
  const research = data.research;
  // Use pre-generated thumbnail concepts from Stage4 if available
  const prefilled = data.thumbnailConcepts || null;
  const [form, setForm] = useState({
    title: saved?.title || (data.topic && !data.topic.startsWith("TOPIC:") ? data.topic : research?.characterProfile?.name ? `The ${research.characterProfile.role}: ${research.characterProfile.name}` : data.topic?.split("\n")[0]?.replace(/^TOPIC:\s*/i, "") || ""),
    subject: saved?.subject || (research ? `${research.characterProfile?.name}, ${research.characterProfile?.role}` : ""),
    moment: saved?.moment || research?.characterProfile?.arc?.split(".")[0] || "",
    period: saved?.period || data.era || "",
  });
  const [concepts, setConcepts] = useState(saved?.concepts || prefilled || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const generate = async () => {
    setLoading(true); setConcepts(null);
    const raw = await claude(`You are a YouTube thumbnail strategist for ${data.channelProfile?.channel_name || "a YouTube channel"}.
Generate 3 thumbnail concepts. One image-led, one text-led, one emotion-led.
Title: ${form.title}
Episode: ${data.episode || ""}
Subject: ${form.subject}
Key emotional moment: ${form.moment}
Period: ${form.period}
Return ONLY valid JSON:
{"concepts":[{"approach":"Image-led","headline":"Max 5 words","subtext":"Max 3 words or null","imagePrompt":"Midjourney prompt","typography":"font description","colorPalette":{"bg":"hex","textPrimary":"hex","textAccent":"hex"},"notes":"1 sentence on why this works"}]}`);
    const parsed = extractJSON(raw);
    setConcepts(parsed?.concepts || null);
    setLoading(false);
  };

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

  const FIELDS = [
    { key: "title", label: "Video Title", placeholder: "Auto-filled from topic" },
    { key: "subject", label: "Main Subject", placeholder: "e.g. Last Silk Road merchant" },
    { key: "moment", label: "Key Emotional Moment", placeholder: "The moment everything changed" },
    { key: "period", label: "Historical Period", placeholder: "e.g. 15th century Central Asia" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0" }}>
        <div>
          <div style={S.sectionTitle}>Thumbnail</div>
          <div style={S.sectionSubtitle}>Three thumbnail concepts designed to stop the scroll.</div>
        </div>
        {isComplete && (
          <button onClick={onBackToSummary} style={{ ...S.btnGhost, marginTop: "4px", whiteSpace: "nowrap" }}>
            ← Back to Summary
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px" }}>
        {/* Left: form card */}
        <div style={{ ...S.card, height: "fit-content", display: "flex", flexDirection: "column", gap: "16px" }}>
          {FIELDS.map(f => (
            <div key={f.key}>
              <label style={S.label}>{f.label}</label>
              <input style={S.input} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} />
            </div>
          ))}
          <button style={S.btnPrimary(loading || !form.subject)} onClick={generate} disabled={loading || !form.subject}>
            {loading ? "Generating…" : concepts ? "Regenerate" : "Generate Concepts"}
          </button>
          {prefilled && concepts === prefilled && (
            <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', marginTop: '4px' }}>
              Pre-generated from Visuals stage
            </div>
          )}
        </div>

        {/* Right: concepts */}
        <div style={{ overflowY: "auto" }}>
          {!concepts && !loading && (
            <div style={{ ...S.card, textAlign: "center", padding: "48px 24px" }}>
              <div style={{ color: COLORS.textSecondary, fontSize: "13px" }}>Fill in the details to generate thumbnail concepts</div>
            </div>
          )}
          {loading && (
            <div style={{ ...S.card, textAlign: "center", padding: "48px 24px" }}>
              <div style={{ color: COLORS.textSecondary, fontSize: "13px" }}>Generating concepts…</div>
            </div>
          )}
          {concepts && concepts.map((c, i) => {
            const approachColor = APPROACH_COLORS[c.approach] || "#6b7280";
            return (
              <div key={i} style={{ ...S.cardElevated, marginBottom: "20px" }}>
                {/* Approach badge */}
                <div style={{ marginBottom: "16px" }}>
                  <span style={{ display: "inline-flex", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: `${approachColor}15`, color: approachColor }}>
                    {c.approach}
                  </span>
                </div>

                {/* Canvas thumbnail mockup */}
                <div style={{ marginBottom: "16px" }}>
                  <ThumbnailCanvas concept={c} />
                </div>

                {/* Image prompt */}
                <div style={{ marginBottom: "12px" }}>
                  <div style={S.label}>Image Prompt</div>
                  <div style={{ ...S.chunk, fontSize: "11px", lineHeight: "1.6" }}>
                    {c.imagePrompt}
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button
                      style={S.btnSecondary(copied === `img-${i}`)}
                      onClick={() => copy(`/imagine prompt: ${c.imagePrompt} --ar 16:9 --style raw --v 6.1`, `img-${i}`)}
                    >
                      {copied === `img-${i}` ? "✓ Copied!" : "Copy Prompt"}
                    </button>
                    <button
                      style={{ ...S.btnApprove, flex: 1, justifyContent: "center" }}
                      onClick={() => onApprove({ thumbnailForm: form, concepts, selectedConcept: c, selectedIndex: i })}
                    >
                      Select This Concept →
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: "12px", color: COLORS.textSecondary, fontStyle: "italic", paddingTop: "10px", borderTop: `1px solid ${COLORS.borderLight}` }}>
                  {c.notes}
                </div>
              </div>
            );
          })}
          {concepts && (
            <div style={{ fontSize: "12px", color: COLORS.textSecondary, fontStyle: "italic", marginTop: "4px" }}>
              Select a concept above to continue to Assembly
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Stage5;
