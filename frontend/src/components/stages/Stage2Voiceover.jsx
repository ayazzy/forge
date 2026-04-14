import { useState } from "react";
import { generateSpeech, claude, uploadAsset } from "../../lib/api";
import { injectV3Tags } from "../../lib/analysis";
import { S, VOICE_PALETTE, COLORS, ACCENT, renderTagged } from "../../styles/theme";
import { extractJSON } from "../../lib/parseJSON";

function Stage2({ data, onApprove, saved, isComplete, onBackToSummary }) {
  const taggedScript = injectV3Tags(data.script);
  const [voices, setVoices] = useState(saved?.voices || [
    { id: "v1", name: "Narrator", voiceId: "", color: VOICE_PALETTE[0], stability: 0.45, similarity: 0.82, style: 0.35 },
  ]);
  const [rosterReady, setRosterReady] = useState(saved?.rosterReady || false);
  const [segments, setSegments] = useState(saved?.segments || null);
  const [detecting, setDetecting] = useState(false);
  const [audioUrls, setAudioUrls] = useState(() => {
    const persisted = data.persistedAssets?.audio || {};
    return Object.keys(persisted).length > 0 ? persisted : {};
  });
  const [persistedAudioUrls, setPersistedAudioUrls] = useState({});
  const [generating, setGenerating] = useState({});
  const [errors, setErrors] = useState({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [activeSegment, setActiveSegment] = useState(0);
  const [showSettings, setShowSettings] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ current: 0, total: 0 });
  const [zipping, setZipping] = useState(false);

  const addVoice = () => {
    if (voices.length >= 6) return;
    const id = `v${Date.now()}`;
    setVoices(prev => [...prev, { id, name: `Voice ${prev.length + 1}`, voiceId: "", color: VOICE_PALETTE[prev.length % VOICE_PALETTE.length], stability: 0.6, similarity: 0.8, style: 0.2 }]);
  };
  const removeVoice = (id) => setVoices(prev => prev.filter(v => v.id !== id));
  const updateVoice = (id, field, value) => setVoices(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));

  const detectSegments = async () => {
    setDetecting(true);
    const voiceNames = voices.map(v => v.name).join(", ");
    const raw = await claude(`You are a script analyst for a narrative history channel.
Split this script into segments, assigning each paragraph to one of these voices: ${voiceNames}
Assign diary entries, letters, or quoted primary sources to secondary voices if available.
Script:
${data.script}
Return ONLY valid JSON:
{"segments":[{"text":"exact paragraph text","voice":"${voices[0].name}"}]}`, 4000);
    const parsedResult = extractJSON(raw);
    try {
      const parsed = parsedResult || (() => { throw new Error('parse failed'); })();
      setSegments(parsed.segments.map((seg, i) => ({
        id: `seg-${i}`,
        text: seg.text,
        voiceId: voices.find(v => v.name === seg.voice)?.id || voices[0].id,
      })));
      setActiveSegment(0);
    } catch {
      const paragraphs = data.script.split(/\n\n+/).filter(p => p.trim().length > 20);
      setSegments(paragraphs.map((text, i) => ({ id: `seg-${i}`, text: text.trim(), voiceId: voices[0].id })));
      setActiveSegment(0);
    }
    setDetecting(false);
  };

  const generateSegment = async (seg) => {
    const voice = voices.find(v => v.id === seg.voiceId);
    if (!voice?.voiceId) { setErrors(prev => ({ ...prev, [seg.id]: `No voice ID set for "${voice?.name}"` })); return; }
    setGenerating(prev => ({ ...prev, [seg.id]: true }));
    setErrors(prev => ({ ...prev, [seg.id]: null }));
    try {
      const url = await generateSpeech(injectV3Tags(seg.text), voice.voiceId, { stability: voice.stability, similarity: voice.similarity, style: voice.style });
      setAudioUrls(prev => ({ ...prev, [seg.id]: url }));
      if (data.currentEpisodeId) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const segIndex = parseInt(seg.id.replace("seg-", ""), 10);
          const fileName = `${data.episode ? `ep${data.episode}_` : ""}seg${String(segIndex + 1).padStart(2, "0")}_${voice.name}.mp3`;
          const asset = await uploadAsset({ episodeId: data.currentEpisodeId, stage: 2, type: "audio", segmentIndex: segIndex, fileBlob: blob, fileName, mimeType: "audio/mpeg" });
          setPersistedAudioUrls(prev => ({ ...prev, [seg.id]: asset.url }));
        } catch (uploadErr) { console.warn("Asset upload failed (non-blocking):", uploadErr); }
      }
    } catch (e) {
      setErrors(prev => ({ ...prev, [seg.id]: e.message }));
    } finally {
      setGenerating(prev => ({ ...prev, [seg.id]: false }));
    }
  };

  const generateAll = async () => {
    setGeneratingAll(true);
    const toGenerate = segments.filter(s => !audioUrls[s.id]);
    setGenerateProgress({ current: 0, total: toGenerate.length });
    for (let i = 0; i < toGenerate.length; i++) {
      setGenerateProgress({ current: i + 1, total: toGenerate.length });
      await generateSegment(toGenerate[i]);
    }
    setGeneratingAll(false);
    setGenerateProgress({ current: 0, total: 0 });
  };

  const downloadSegment = (seg, index) => {
    const url = audioUrls[seg.id]; if (!url) return;
    const voice = voices.find(v => v.id === seg.voiceId);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.episode ? `ep${data.episode}_` : ""}seg${String(index + 1).padStart(2, "0")}_${voice?.name || "voice"}.mp3`;
    a.click();
  };

  const downloadAllZip = async () => {
    setZipping(true);
    try {
      if (!window.JSZip) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
          script.onload = resolve; script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const zip = new window.JSZip();
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const url = audioUrls[seg.id];
        if (!url) continue;
        const voice = voices.find(v => v.id === seg.voiceId);
        const res = await fetch(url);
        const blob = await res.blob();
        const filename = `${data.episode ? `ep${data.episode}_` : ""}seg${String(i + 1).padStart(2, "00")}_${voice?.name || "voice"}.mp3`;
        zip.file(filename, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `${data.episode ? `ep${data.episode}_` : "episode_"}voiceover.zip`;
      a.click();
    } catch (e) { alert("Download failed: " + e.message); }
    setZipping(false);
  };

  const stats = (() => {
    const t = taggedScript;
    return {
      short: (t.match(/\[short pause\]/g) || []).length,
      pause: (t.match(/\[pause\]/g) || []).length,
      long: (t.match(/\[long pause\]/g) || []).length,
      dramatic: (t.match(/\[dramatic tone\]/g) || []).length,
    };
  })();

  const allGenerated = segments && segments.every(s => !!audioUrls[s.id]);
  const anyGenerated = segments && segments.some(s => !!audioUrls[s.id]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0" }}>
        <div>
          <div style={S.sectionTitle}>Narration</div>
          <div style={S.sectionSubtitle}>Set up your voices and generate audio for each segment of your script.</div>
        </div>
        {isComplete && (
          <button onClick={onBackToSummary} style={{ ...S.btnGhost, marginTop: "4px", whiteSpace: "nowrap" }}>
            ← Back to Summary
          </button>
        )}
      </div>

      {/* Step 1: Voice roster */}
      <div style={{ ...S.card, marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: COLORS.text }}>Your Voices</div>
          {voices.length < 6 && (
            <button style={{ ...S.btnSecondary(false), fontSize: "11px", padding: "6px 12px" }} onClick={addVoice}>+ Add Voice</button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {voices.map((v) => (
            <div key={v.id} style={{ background: COLORS.surfaceSecondary, border: `1px solid ${COLORS.border}`, borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", padding: "12px 14px" }}>
                <div style={{ width: "4px", alignSelf: "stretch", background: v.color, borderRadius: "2px", flexShrink: 0 }} />
                <input
                  style={{ ...S.input, width: "130px", flexShrink: 0, fontSize: "13px", background: COLORS.surface }}
                  value={v.name}
                  onChange={e => updateVoice(v.id, "name", e.target.value)}
                  placeholder="Voice name"
                />
                <input
                  style={{ ...S.input, flex: 1, fontFamily: "monospace", fontSize: "12px", background: COLORS.surface }}
                  value={v.voiceId}
                  onChange={e => updateVoice(v.id, "voiceId", e.target.value)}
                  placeholder="Paste Voice ID"
                />
                <button
                  onClick={() => setShowSettings(showSettings === v.id ? null : v.id)}
                  style={{ ...S.btnSecondary(showSettings === v.id), fontSize: "11px", padding: "7px 12px", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  Advanced
                </button>
                {voices.length > 1 && (
                  <button onClick={() => removeVoice(v.id)} style={{ background: "none", border: "none", color: COLORS.textTertiary, cursor: "pointer", fontSize: "18px", padding: "0 4px", lineHeight: "1" }}>×</button>
                )}
              </div>
              <div style={{ fontSize: "11px", color: COLORS.textTertiary, padding: "0 14px 10px 28px" }}>
                Find your Voice ID in your account → Voices → click your voice → ID
              </div>
              {showSettings === v.id && (
                <div style={{ padding: "14px 20px", borderTop: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: "14px", background: COLORS.surface }}>
                  {[
                    { key: "stability", label: "Stability", hint: "Lower = more expressive" },
                    { key: "similarity", label: "Similarity", hint: "Higher = stays closer to voice" },
                    { key: "style", label: "Style", hint: "Higher = more dramatic" },
                  ].map(({ key, label, hint }) => (
                    <div key={key}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={S.label}>{label}</span>
                        <span style={{ fontSize: "11px", color: COLORS.textSecondary }}>
                          {v[key].toFixed(2)} <span style={{ color: COLORS.textTertiary }}>— {hint}</span>
                        </span>
                      </div>
                      <input type="range" min="0" max="1" step="0.01" value={v[key]} onChange={e => updateVoice(v.id, key, parseFloat(e.target.value))} style={S.slider} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {!rosterReady && (
          <button
            style={{ ...S.btnPrimary(voices.some(v => !v.voiceId.trim())), marginTop: "16px" }}
            onClick={() => setRosterReady(true)}
            disabled={voices.some(v => !v.voiceId.trim())}
          >
            Confirm Voices &amp; Continue →
          </button>
        )}
        {rosterReady && (
          <div style={{ marginTop: "12px", fontSize: "12px", color: COLORS.success, fontWeight: "500" }}>
            ✓ {voices.length} voice{voices.length > 1 ? "s" : ""} confirmed
          </div>
        )}
      </div>

      {/* Step 2: Script Segments */}
      {rosterReady && (
        <div style={{ ...S.card, marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: COLORS.text, marginBottom: "14px" }}>Script Segments</div>
          {!segments && (
            <div style={{ display: "flex", gap: "10px" }}>
              {voices.length > 1 && (
                <button style={{ ...S.btnPrimary(detecting), flex: 1 }} onClick={detectSegments} disabled={detecting}>
                  {detecting ? "Detecting…" : "Auto-detect Voice Segments"}
                </button>
              )}
              <button
                style={voices.length > 1 ? { ...S.btnSecondary(false), flexShrink: 0 } : { ...S.btnPrimary(false), flex: 1 }}
                onClick={() => {
                  const paragraphs = data.script.split(/\n\n+/).filter(p => p.trim().length > 20);
                  setSegments(paragraphs.map((text, i) => ({ id: `seg-${i}`, text: text.trim(), voiceId: voices[0].id })));
                }}
              >
                {voices.length > 1 ? "Assign All to Narrator" : "Split into Segments"}
              </button>
            </div>
          )}
          {segments && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: COLORS.textSecondary }}>
                  {segments.length} segments · {segments.filter(s => !!audioUrls[s.id]).length} generated
                </div>
                <button style={{ ...S.btnSecondary(false), fontSize: "11px", padding: "6px 12px" }} onClick={() => setSegments(null)}>Re-detect</button>
              </div>
              {/* Progress grid */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "14px", padding: "12px", background: COLORS.surfaceSecondary, borderRadius: "8px" }}>
                {segments.map((seg, i) => {
                  const voice = voices.find(v => v.id === seg.voiceId) || voices[0];
                  const done = !!audioUrls[seg.id];
                  const running = !!generating[seg.id];
                  return (
                    <div
                      key={seg.id}
                      onClick={() => setActiveSegment(i)}
                      title={`Segment ${i + 1}: ${seg.text.substring(0, 50)}…`}
                      style={{
                        width: "24px", height: "24px", borderRadius: "4px", cursor: "pointer",
                        background: running ? COLORS.warning : done ? COLORS.success : activeSegment === i ? voice.color : COLORS.border,
                        transition: "background 0.2s",
                        border: activeSegment === i && !done && !running ? `2px solid ${voice.color}` : "2px solid transparent",
                      }}
                    />
                  );
                })}
              </div>
              {/* Segment list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "280px", overflowY: "auto" }}>
                {segments.map((seg, i) => {
                  const voice = voices.find(v => v.id === seg.voiceId) || voices[0];
                  return (
                    <div
                      key={seg.id}
                      onClick={() => setActiveSegment(i)}
                      style={{ display: "flex", gap: "10px", padding: "10px 12px", background: activeSegment === i ? COLORS.surfaceSecondary : COLORS.surface, border: `1px solid ${activeSegment === i ? voice.color + "44" : COLORS.border}`, cursor: "pointer", borderRadius: "8px" }}
                    >
                      <div style={{ width: "3px", background: voice.color, alignSelf: "stretch", flexShrink: 0, borderRadius: "2px" }} />
                      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0, background: generating[seg.id] ? COLORS.warning : audioUrls[seg.id] ? COLORS.success : COLORS.border }} />
                        <div style={{ fontSize: "12px", color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{seg.text.substring(0, 90)}…</div>
                      </div>
                      {voices.length > 1 && (
                        <select
                          value={seg.voiceId}
                          onChange={e => { e.stopPropagation(); setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, voiceId: e.target.value } : s)); }}
                          onClick={e => e.stopPropagation()}
                          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary, fontSize: "11px", padding: "4px 8px", fontFamily: "inherit", cursor: "pointer", flexShrink: 0, borderRadius: "6px" }}
                        >
                          {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Generate Audio */}
      {segments && (
        <div style={{ ...S.card, marginBottom: "0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: COLORS.text }}>Generate Audio</div>
            <button
              onClick={() => setShowAdvanced(v => !v)}
              style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 8px" }}
            >
              {showAdvanced ? "Hide tag stats" : "Show tag stats"}
            </button>
          </div>

          {showAdvanced && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "16px" }}>
              {[
                { label: "Short Pause", value: stats.short, color: "#f59e0b" },
                { label: "Pause", value: stats.pause, color: "#d97706" },
                { label: "Long Pause", value: stats.long, color: "#ef4444" },
                { label: "Dramatic", value: stats.dramatic, color: "#8b5cf6" },
              ].map(s => (
                <div key={s.label} style={{ background: COLORS.surfaceSecondary, borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "10px", color: COLORS.textTertiary, marginTop: "2px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {segments[activeSegment] && (() => {
            const seg = segments[activeSegment];
            const voice = voices.find(v => v.id === seg.voiceId) || voices[0];
            return (
              <div style={{ ...S.cardElevated, marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: voice.color, fontWeight: "600", marginBottom: "10px" }}>
                  Segment {activeSegment + 1} of {segments.length} — {voice.name}
                </div>
                <div style={{ fontSize: "12px", color: COLORS.textSecondary, lineHeight: "1.8", maxHeight: "120px", overflowY: "auto", fontFamily: "monospace", marginBottom: "14px" }}>
                  {renderTagged(injectV3Tags(seg.text))}
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <button style={{ ...S.btnPrimary(generating[seg.id]), flex: 1, minWidth: "140px" }} onClick={() => generateSegment(seg)} disabled={generating[seg.id]}>
                    {generating[seg.id] ? "Generating…" : audioUrls[seg.id] ? "Regenerate" : "Generate"}
                  </button>
                  {audioUrls[seg.id] && (
                    <>
                      <audio key={audioUrls[seg.id]} controls src={audioUrls[seg.id]} style={{ flex: 2, minWidth: "180px", height: "34px" }} />
                      <button style={S.btnSecondary(false)} onClick={() => downloadSegment(seg, activeSegment)}>↓</button>
                    </>
                  )}
                </div>
                {errors[seg.id] && (
                  <div style={{ marginTop: "10px", padding: "10px 14px", background: "#fff5f5", border: `1px solid ${COLORS.error}33`, color: COLORS.error, fontSize: "12px", fontFamily: "monospace", borderRadius: "8px" }}>
                    {errors[seg.id]}
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button style={{ ...S.btnSecondary(false), flex: 1 }} onClick={() => setActiveSegment(Math.max(0, activeSegment - 1))}>← Prev</button>
            <button style={{ ...S.btnSecondary(false), flex: 1 }} onClick={() => setActiveSegment(Math.min(segments.length - 1, activeSegment + 1))}>Next →</button>
            <button
              style={{ ...S.btnPrimary(generatingAll || allGenerated), flex: 2 }}
              onClick={() => {
                const remaining = segments.filter(s => !audioUrls[s.id]).length;
                if (remaining > 0 && !window.confirm(`Generate ${remaining} remaining segment${remaining > 1 ? "s" : ""}? This may take ${Math.round(remaining * 1.5)} minutes.`)) return;
                generateAll();
              }}
              disabled={generatingAll || allGenerated}
            >
              {generatingAll
                ? `Generating ${generateProgress.current} of ${generateProgress.total}…`
                : allGenerated
                ? "✓ All Generated"
                : `Generate Remaining ${segments.filter(s => !audioUrls[s.id]).length}`}
            </button>
          </div>

          {anyGenerated && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{ ...S.btnApprove, flex: 1, justifyContent: "center" }} onClick={() => onApprove({ segments, voices, audioUrls })}>
                Approve &amp; Continue →
              </button>
              {allGenerated && (
                <button style={S.btnSecondary(false)} onClick={downloadAllZip} disabled={zipping}>
                  {zipping ? "Zipping…" : "↓ Download ZIP"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Stage2;
