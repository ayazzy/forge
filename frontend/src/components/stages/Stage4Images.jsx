import { useState, useCallback } from "react";
import { claude, generateIdeogramImage, uploadAsset } from "../../lib/api";
import { selectImagePoints, MOOD_COLORS } from "../../lib/analysis";
import { S, COLORS, REASON_COLORS } from "../../styles/theme";
import { extractJSON } from "../../lib/parseJSON";

const STYLE_BASE_DEFAULT = "--ar 16:9 --style raw --v 6.1";

function Stage4({ data, onApprove, saved, isComplete, onBackToSummary }) {
  const [prompts, setPrompts] = useState(saved?.prompts || []);
  const [mode, setMode] = useState(saved?.mode || "manual");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [copied, setCopied] = useState(null);
  const [images, setImages] = useState(() => {
    const persisted = data.persistedAssets?.images || {};
    return Object.keys(persisted).length > 0 ? persisted : (saved?.images || {});
  });
  const [persistedImages, setPersistedImages] = useState({});
  const [generating, setGenerating] = useState({});
  const [imgErrors, setImgErrors] = useState({});
  const [generatingAll, setGeneratingAll] = useState(false);

  const generatePrompts = useCallback(async () => {
    setLoading(true);
    setPrompts([]);
    setImages({});
    const imagePoints = selectImagePoints(data.analysis.sections);
    setProgress({ current: 0, total: imagePoints.length });
    const results = [];
    const channelName = data.channelProfile?.channel_name || "a YouTube channel";
    const imageStyle = data.channelProfile?.prompt_config?.imageStyle || `oil painting texture, no text, ${STYLE_BASE_DEFAULT}`;
    for (let i = 0; i < imagePoints.length; i++) {
      const pt = imagePoints[i];
      const era = data.era || "unspecified";
      const raw = await claude(`You are an image prompt expert for ${channelName}.
Write ONE image prompt for this paragraph:
"${pt.text.substring(0, 400)}"
Mood: ${pt.mood}
Era/Region: ${era}
Visual style for this channel: ${imageStyle}

Also write ONE sentence (max 15 words) explaining why a new image is needed here.
Return ONLY valid JSON:
{"prompt":"...","why":"...","segmentIndex":${i}}`, 600, 'haiku');
      let prompt = raw, why = "";
      const p = extractJSON(raw);
      if (p?.prompt) { prompt = `${p.prompt}, ${imageStyle}`; why = p.why || ""; }
      else { prompt = `${raw}, ${imageStyle}`; }
      results.push({ ...pt, prompt, why, imageNumber: i + 1, segmentIndex: i });
      setPrompts([...results]);
      setProgress({ current: i + 1, total: imagePoints.length });
    }
    setLoading(false);
  }, [data]);

  const generateImage = async (p) => {
    setGenerating(prev => ({ ...prev, [p.imageNumber]: true }));
    setImgErrors(prev => ({ ...prev, [p.imageNumber]: null }));
    try {
      const url = await generateIdeogramImage(p.prompt);
      setImages(prev => ({ ...prev, [p.imageNumber]: url }));
      if (data.currentEpisodeId) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const fileName = `ep${data.episode || "xx"}_img${String(p.imageNumber).padStart(2, "0")}.png`;
          const asset = await uploadAsset({ episodeId: data.currentEpisodeId, stage: 4, type: "image", segmentIndex: p.imageNumber, fileBlob: blob, fileName, mimeType: "image/png" });
          setPersistedImages(prev => ({ ...prev, [p.imageNumber]: asset.url }));
        } catch (uploadErr) { console.warn("Asset upload failed (non-blocking):", uploadErr); }
      }
    } catch (e) {
      setImgErrors(prev => ({ ...prev, [p.imageNumber]: e.message }));
    } finally {
      setGenerating(prev => ({ ...prev, [p.imageNumber]: false }));
    }
  };

  const generateAllImages = async () => {
    setGeneratingAll(true);
    for (const p of prompts) {
      if (!images[p.imageNumber]) await generateImage(p);
    }
    setGeneratingAll(false);
  };

  const downloadImage = async (url, num) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ep${data.episode || "xx"}_img${String(num).padStart(2, "0")}.png`;
    a.click();
  };

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };
  const copyAll = () => copy(prompts.map(p => p.prompt).join("\n\n"), "all");
  const exportAll = () => {
    const blob = new Blob([prompts.map((p, i) => `Image ${i + 1} — ${p.mood}\n${p.why ? `Why: ${p.why}\n` : ""}${p.prompt}`).join("\n\n")], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `image_prompts_ep${data.episode || "xx"}.txt`; a.click();
  };

  const anyImages = Object.keys(images).length > 0;
  const allImages = prompts.length > 0 && prompts.every(p => !!images[p.imageNumber]);

  const MODES = [
    { key: "manual", label: "Manual (Copy prompt)" },
    { key: "auto", label: "Auto (Generate)" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0" }}>
        <div>
          <div style={S.sectionTitle}>Visuals</div>
          <div style={S.sectionSubtitle}>Image prompts generated for key moments in your script. Copy the prompt or generate automatically.</div>
        </div>
        {isComplete && (
          <button onClick={onBackToSummary} style={{ ...S.btnGhost, marginTop: "4px", whiteSpace: "nowrap" }}>
            ← Back to Summary
          </button>
        )}
      </div>

      {/* Mode toggle — pill tabs */}
      <div style={{ display: "flex", gap: "4px", background: COLORS.surfaceSecondary, padding: "4px", borderRadius: "10px", marginBottom: "24px", width: "fit-content" }}>
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            style={{
              padding: "7px 20px",
              borderRadius: "7px",
              border: "none",
              background: mode === m.key ? COLORS.surface : "transparent",
              color: mode === m.key ? COLORS.text : COLORS.textSecondary,
              fontSize: "12px",
              fontWeight: mode === m.key ? "600" : "400",
              cursor: "pointer",
              boxShadow: mode === m.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
              fontFamily: "inherit",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {prompts.length === 0 && !loading && (
        <div style={{ ...S.card, textAlign: "center", padding: "48px 24px" }}>
          <div style={{ color: COLORS.textSecondary, fontSize: "14px", marginBottom: "20px" }}>
            {mode === "auto" ? "Generate prompts and images automatically" : "Generate prompts to copy and use externally"}
          </div>
          <button style={{ ...S.btnPrimary(false), width: "auto", padding: "12px 40px" }} onClick={generatePrompts}>
            Generate Image Prompts
          </button>
        </div>
      )}

      {loading && (
        <div style={{ ...S.card, marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", color: COLORS.textSecondary, marginBottom: "10px" }}>
            Building prompts {progress.current} / {progress.total}
          </div>
          <div style={{ background: COLORS.border, height: "3px", borderRadius: "2px" }}>
            <div style={{ height: "100%", background: "#2563eb", width: progress.total ? `${(progress.current / progress.total) * 100}%` : "0%", transition: "width 0.3s", borderRadius: "2px" }} />
          </div>
        </div>
      )}

      {prompts.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "13px", color: COLORS.textSecondary, fontWeight: "500" }}>{prompts.length} images</div>
            <div style={{ display: "flex", gap: "8px" }}>
              {!loading && <button style={S.btnSecondary(false)} onClick={generatePrompts}>Regenerate</button>}
              {mode === "manual" && <button style={S.btnSecondary(copied === "all")} onClick={copyAll}>{copied === "all" ? "Copied!" : "Copy All"}</button>}
              {mode === "manual" && <button style={S.btnSecondary(false)} onClick={exportAll}>↓ Export</button>}
              {mode === "auto" && !generatingAll && !allImages && (
                <button style={S.btnPrimary(false)} onClick={generateAllImages}>Generate All Images</button>
              )}
              {mode === "auto" && generatingAll && (
                <button style={S.btnPrimary(true)} disabled>Generating…</button>
              )}
            </div>
          </div>

          {prompts.map((p, i) => (
            <div key={i} style={{ ...S.promptCard, marginBottom: "16px" }}>
              <div style={S.promptHeader}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={S.badge("#6b7280")}>Image {p.imageNumber}</span>
                  {p.reasons.map(r => (
                    <span key={r} style={S.tag(REASON_COLORS[r] || "#6b7280")}>{r}</span>
                  ))}
                  <span style={{ fontSize: "11px", color: MOOD_COLORS[p.mood], fontWeight: "500" }}>{p.mood}</span>
                  {mode === "auto" && images[p.imageNumber] && (
                    <span style={{ fontSize: "11px", color: COLORS.success, fontWeight: "500" }}>✓ generated</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {mode === "manual" && (
                    <button style={S.btnSecondary(copied === i)} onClick={() => copy(p.prompt, i)}>
                      {copied === i ? "Copied!" : "Copy"}
                    </button>
                  )}
                  {mode === "auto" && !images[p.imageNumber] && (
                    <button style={S.btnSecondary(generating[p.imageNumber])} onClick={() => generateImage(p)} disabled={generating[p.imageNumber]}>
                      {generating[p.imageNumber] ? "…" : "Generate"}
                    </button>
                  )}
                  {mode === "auto" && images[p.imageNumber] && (
                    <>
                      <button style={S.btnSecondary(false)} onClick={() => generateImage(p)}>Retry</button>
                      <button style={S.btnSecondary(false)} onClick={() => downloadImage(images[p.imageNumber], p.imageNumber)}>↓</button>
                    </>
                  )}
                </div>
              </div>

              <div style={S.promptBody}>
                {p.prompt.replace(/\s*--(?:ar|style|v|no|q|s|c|chaos|seed|tile|weird|iw|stop|niji|hd|aspect)\s+\S+/g, "").trim()}
              </div>
              {p.why && (
                <div style={{ padding: "8px 16px", borderTop: `1px solid ${COLORS.borderLight}`, fontSize: "12px", color: COLORS.success, fontStyle: "italic" }}>
                  ↳ {p.why}
                </div>
              )}

              {mode === "auto" && images[p.imageNumber] && (
                <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}` }}>
                  <img src={images[p.imageNumber]} alt={`Image ${p.imageNumber}`} style={{ width: "100%", display: "block", borderRadius: "6px" }} />
                </div>
              )}
              {mode === "auto" && imgErrors[p.imageNumber] && (
                <div style={{ padding: "8px 16px", borderTop: `1px solid ${COLORS.borderLight}`, fontSize: "12px", color: COLORS.error, fontFamily: "monospace" }}>
                  {imgErrors[p.imageNumber]}
                </div>
              )}
            </div>
          ))}

          {!loading && (
            <button style={{ ...S.btnApprove, width: "100%", justifyContent: "center", marginTop: "8px" }} onClick={() => onApprove({ prompts, images, mode })}>
              Approve &amp; Continue →
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default Stage4;
