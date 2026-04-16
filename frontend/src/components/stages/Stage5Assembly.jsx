import { useState, useRef, useEffect } from "react";
import { S, COLORS } from "../../styles/theme";
import { generateSRT } from "../../lib/srt";
import { generateProductionBriefPDF } from "../../lib/productionBrief";

// ── DAW constants ─────────────────────────────────────────────────────────────
const TRACK_H   = 48;
const LABEL_W   = 80;
const BLOCK_MIN = 60;
const BLOCK_MAX = 200;
const PLAYHEAD  = "#e03535";
const TRACK_ROWS = [
  { key: "narration", label: "NARRATION", bg: "#0d0d0d" },
  { key: "music",     label: "MUSIC BED", bg: "#111"    },
  { key: "ambient",   label: "AMBIENT",   bg: "#0d0d0d" },
  { key: "sfx",       label: "SFX",       bg: "#111"    },
  { key: "visuals",   label: "VISUALS",   bg: "#0d0d0d" },
];

function blockW(textLen) {
  return Math.min(Math.max(Math.round(textLen / 8), BLOCK_MIN), BLOCK_MAX);
}

// ── Shared button styles ──────────────────────────────────────────────────────
const dlBtn = {
  padding: "6px 12px", borderRadius: "7px", fontSize: "12px",
  fontWeight: "500", cursor: "pointer", fontFamily: "inherit",
  background: "#1a1a1a", color: "#999", border: "1px solid #2a2a2a",
  whiteSpace: "nowrap",
};

const navBtn = (disabled) => ({
  background: "none",
  border: `1px solid ${disabled ? "#222" : "#333"}`,
  color: disabled ? "#333" : "#aaa",
  borderRadius: "5px", padding: "5px 14px",
  fontSize: "15px", cursor: disabled ? "default" : "pointer",
  fontFamily: "inherit", lineHeight: 1,
});

// ── Main component ────────────────────────────────────────────────────────────
function Stage7({ data, onApprove, isComplete, onBackToSummary }) {
  const {
    segments = [], voices = [], audioUrls = {}, prompts = [],
    images = {}, cues = null, topic, episode, meta, research,
  } = data;

  // ── Segment word counts ───────────────────────────────────────────────────
  const segWordCounts = segments.map(seg =>
    seg.text.trim().split(/\s+/).filter(Boolean).length
  );
  const totalWords = segWordCounts.reduce((a, b) => a + b, 0) || 1;

  // ── Sound helpers (must precede timeline so SFX can use tsToSeconds) ──────
  const totalSeconds = (totalWords / 150) * 60 || 1;
  const tsToSeconds  = (ts = "0:00") => {
    const p = ts.split(":").map(Number);
    return (p[0] || 0) * 60 + (p[1] || 0);
  };

  // ── Pre-assign each SFX to a segment via trigger text matching ───────────
  // SFX timestamps from Claude are estimates and don't align with our
  // calculated segment boundaries. The `trigger` field contains the actual
  // script text that cues the sound — use that to find the right segment.
  const SFX_STOP = new Set(['the','a','an','is','are','was','were','be','been','have','has','had',
    'do','does','did','will','would','could','should','may','might','can','to','of','in','on',
    'at','by','for','with','from','that','this','it','its','and','or','but','not','no','they',
    'their','there','them','we','our','he','she','his','her','as','so','if','then','when','where']);

  const sfxSegmentIndex = (cues?.effects || []).map((c, sfxIdx) => {
    // ── Primary: trigger text overlap ──────────────────────────────────────
    if (c.trigger && c.trigger.trim()) {
      const trigWords = c.trigger.toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 3 && !SFX_STOP.has(w));
      if (trigWords.length > 0) {
        let bestIdx = 0, bestScore = -1;
        segments.forEach((seg, si) => {
          const txt = seg.text.toLowerCase();
          const score = trigWords.filter(w => txt.includes(w)).length / trigWords.length;
          if (score > bestScore) { bestScore = score; bestIdx = si; }
        });
        if (bestScore >= 0.25) return bestIdx;
      }
    }
    // ── Fallback: proportional timestamp across segments ───────────────────
    const sec = tsToSeconds(c.timestamp);
    const frac = sec / totalSeconds;
    return Math.min(Math.floor(frac * segments.length), segments.length - 1);
  });

  // ── Build timeline items ──────────────────────────────────────────────────
  const timeline = segments.map((seg, i) => {
    const voice = voices.find(v => v.id === seg.voiceId) || voices[0] || { name: "Narrator", color: "#c0392b" };
    const imageIndex = Math.round(
      (i / Math.max(segments.length - 1, 1)) * Math.max(prompts.length - 1, 0)
    );
    const matchedPrompt = prompts[imageIndex];
    const imageUrl = matchedPrompt ? images[matchedPrompt.imageNumber] : null;
    const wordCount = segWordCounts[i];
    const widthPct = (wordCount / totalWords) * 100;
    const segEffects = (cues?.effects || []).filter((_, sfxIdx) => sfxSegmentIndex[sfxIdx] === i);
    return { seg, voice, imageUrl, matchedPrompt, segEffects, index: i, wordCount, widthPct };
  });

  // ── DAW layout ────────────────────────────────────────────────────────────
  const bWidths = timeline.map(item => blockW(item.seg.text.length));
  const totalCW  = bWidths.reduce((s, w) => s + w, 0);
  const xOffsets = bWidths.reduce((acc, w, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + bWidths[i - 1]);
    return acc;
  }, []);
  const tsToX = (ts) => (tsToSeconds(ts) / totalSeconds) * totalCW;

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeItem, setActiveItem]         = useState(0);
  const [activeSoundDetail, setActiveSoundDetail] = useState(null);
  const [exported, setExported]             = useState(false);
  const [pdfExporting, setPdfExporting]     = useState(false);
  const [copiedPrompt, setCopiedPrompt]     = useState(false);

  const activeSegRef     = useRef(null);
  const timelineScrollRef = useRef(null);
  const [minimap, setMinimap] = useState({ leftFrac: 0, widthFrac: 1, hasScroll: false });

  // Playhead x (depends on activeItem state)
  const playheadX = LABEL_W + (xOffsets[activeItem] || 0) + (bWidths[activeItem] || 0) / 2;

  // ── Scroll active block into view ─────────────────────────────────────────
  useEffect(() => {
    activeSegRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeItem]);

  // ── Minimap scroll tracking ───────────────────────────────────────────────
  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) return;
    const update = () => {
      const { scrollLeft, clientWidth, scrollWidth } = el;
      const hasScroll = scrollWidth > clientWidth + 4;
      setMinimap({
        leftFrac: hasScroll ? scrollLeft / scrollWidth : 0,
        widthFrac: hasScroll ? clientWidth / scrollWidth : 1,
        hasScroll,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [timeline.length]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "AUDIO") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveItem(prev => Math.max(0, prev - 1));
        setActiveSoundDetail(null);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveItem(prev => Math.min(timeline.length - 1, prev + 1));
        setActiveSoundDetail(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [timeline.length]);

  // ── Minimap click ─────────────────────────────────────────────────────────
  const handleMinimapClick = (e) => {
    const el = timelineScrollRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const contentW = rect.width - LABEL_W;
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left - LABEL_W) / contentW));
    el.scrollLeft = frac * el.scrollWidth - el.clientWidth / 2;
  };

  // ── Export helpers (unchanged) ────────────────────────────────────────────
  const copyPrompt = text => {
    const flags = "--ar 16:9 --style raw --v 6.1";
    navigator.clipboard.writeText(text.includes("--ar") ? text : `${text} ${flags}`);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const downloadSubtitles = () => {
    if (!segments.length) return;
    const blob = new Blob([generateSRT(segments)], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ep${episode || "xx"}_subtitles.srt`;
    a.click();
  };

  const downloadPDF = async () => {
    setPdfExporting(true);
    try {
      await generateProductionBriefPDF({
        ...data, segments, voices, audioUrls, imagePrompts: prompts, images,
        soundDesign: cues, meta, research, topic, episode,
        channelProfile: data.channelProfile, analysis: data.analysis,
        thumbnailConcepts: data.thumbnailConcepts, selectedConcept: data.selectedConcept,
        voiceSegments: segments,
      });
    } catch (e) { console.error("PDF export failed:", e); }
    finally { setPdfExporting(false); }
  };

  const exportPackage = async () => {
    let JSZip;
    try { JSZip = (await import("jszip")).default; } catch { exportLegacy(); return; }
    const zip    = new JSZip();
    const epNum  = episode || "xx";
    const epTitle = topic || "Untitled";
    zip.file("script.md", `# ${epTitle}\n\n${segments.map((s, i) => `## Segment ${i + 1}\n${s.text}`).join("\n\n")}`);
    zip.file("research_brief.json", JSON.stringify({ topic: epTitle, episode: epNum, research: research || null }, null, 2));
    if (meta) zip.file("metadata.json", JSON.stringify({ titles: meta.titles, description: meta.description, tags: meta.tags, chapters: meta.chapters, category: meta.category }, null, 2));
    if (prompts.length) zip.file("image_prompts.txt", prompts.map(p => `Image ${p.imageNumber} — ${p.mood}\n${p.why ? `Why: ${p.why}\n` : ""}${p.prompt}`).join("\n\n"));
    if (segments.length) zip.file("subtitles.srt", generateSRT(segments));
    const guideLines = [
      `DAVINCI RESOLVE ASSEMBLY GUIDE`, `Episode ${epNum} — ${epTitle}`,
      `Generated: ${new Date().toLocaleDateString()}`, `${"═".repeat(60)}`, ``,
      `IMPORT ORDER`, `─────────────`,
      ...timeline.map((item, i) => [
        `[${String(i + 1).padStart(2, "0")}] ${item.voice.name.toUpperCase()}`,
        `    Audio: ep${epNum}_seg${String(i + 1).padStart(2, "0")}_${item.voice.name}.mp3`,
        item.imageUrl ? `    Image: ep${epNum}_img${String(item.matchedPrompt?.imageNumber || i + 1).padStart(2, "0")}.png` : `    Image: (none assigned)`,
        item.segEffects.length ? `    SFX:   ${item.segEffects.map(e => e.sound).join(", ")}` : "",
        `    Text:  "${item.seg.text.substring(0, 80)}..."`, ``,
      ].filter(Boolean).join("\n")),
      `${"═".repeat(60)}`, ``,
      `MUSIC BED CUES`, `─────────────`,
      ...(cues?.musicBed || []).map(c => `[${c.timestamp}] ${c.mood} — ${c.description}`),
      ``, `AMBIENT LAYER`, `─────────────`,
      ...(cues?.ambientLayer || []).map(c => `[${c.timestamp}] ${c.environment} — ${c.sounds}`),
    ];
    zip.file("assembly_guide.txt", guideLines.join("\n"));
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ep${epNum}_${epTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_package.zip`;
    a.click();
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const exportLegacy = () => {
    const epNum = episode || "xx";
    const blob = new Blob([JSON.stringify({ episode: epNum, topic: topic || "Untitled", generatedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `ep${epNum}_manifest.json`; a.click();
    setExported(true); setTimeout(() => setExported(false), 3000);
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (timeline.length === 0) {
    return (
      <div>
        <div style={S.sectionTitle}>Assembly</div>
        <div style={{ ...S.card, color: COLORS.textTertiary, fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "60px 24px", marginTop: "16px" }}>
          Complete the Narration and Visuals stages to build the assembly view.
        </div>
      </div>
    );
  }

  const musicBed    = cues?.musicBed    || [];
  const ambientLayer = cues?.ambientLayer || [];
  const sfxMarkers  = cues?.effects     || [];
  const active      = timeline[activeItem];

  // Approximate time of the active segment (used to find active music/ambient cue)
  const activeTimeSec = totalCW > 0 ? ((xOffsets[activeItem] || 0) / totalCW) * totalSeconds : 0;
  const activeMusicCue = musicBed.reduce((found, cue, i) => {
    const t = tsToSeconds(cue.timestamp);
    const next = musicBed[i + 1] ? tsToSeconds(musicBed[i + 1].timestamp) : Infinity;
    return t <= activeTimeSec && activeTimeSec < next ? cue : found;
  }, musicBed[0] || null);
  const activeAmbientCue = ambientLayer.reduce((found, cue, i) => {
    const t = tsToSeconds(cue.timestamp);
    const next = ambientLayer[i + 1] ? tsToSeconds(ambientLayer[i + 1].timestamp) : Infinity;
    return t <= activeTimeSec && activeTimeSec < next ? cue : found;
  }, ambientLayer[0] || null);

  // Time markers for ruler
  const totalMins  = Math.ceil(totalSeconds / 60);
  const markerStep = totalMins <= 8 ? 1 : totalMins <= 20 ? 2 : 5;
  const timeMarkers = [];
  for (let m = 0; m <= totalMins; m += markerStep) timeMarkers.push(m);

  return (
    <div style={{ minHeight: "calc(100vh - 120px)" }}>

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <div style={S.sectionTitle}>Assembly</div>
          <div style={S.sectionSubtitle}>DAW timeline — narration, sound, and visuals. Click any block to inspect. Use ← → to navigate.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", flexShrink: 0 }}>
          {[
            { label: "Segs", value: segments.length,    color: "#e03535" },
            { label: "Imgs", value: prompts.length,     color: "#2563eb" },
            { label: "SFX",  value: sfxMarkers.length,  color: "#d97706" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "5px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "6px", padding: "4px 10px" }}>
              <span style={{ fontSize: "11px", color: COLORS.textTertiary }}>{s.label}</span>
              <span style={{ fontSize: "13px", fontWeight: "700", color: s.color }}>{s.value}</span>
            </div>
          ))}
          <div style={{ width: "1px", height: "20px", background: COLORS.border }} />
          {segments.length > 0 && <button onClick={downloadSubtitles} style={dlBtn}>↓ Subtitles</button>}
          <button onClick={downloadPDF} disabled={pdfExporting} style={dlBtn}>{pdfExporting ? "Building…" : "↓ Production Brief"}</button>
          <button onClick={exportPackage} style={{ ...dlBtn, background: exported ? "#0a2a1a" : "#1a1a1a", color: exported ? "#4ade80" : "#999", border: `1px solid ${exported ? "#14532d" : "#2a2a2a"}` }}>
            {exported ? "✓ Done!" : "↓ ZIP"}
          </button>
          {onApprove && (
            <>
              <div style={{ width: "1px", height: "20px", background: COLORS.border }} />
              <button onClick={() => onApprove({})} style={{ ...dlBtn, background: PLAYHEAD, color: "#fff", border: "none", fontWeight: "700", padding: "6px 16px" }}>
                Thumbnail →
              </button>
            </>
          )}
          {isComplete && (
            <button onClick={onBackToSummary} style={{ ...S.btnGhost, whiteSpace: "nowrap" }}>← Summary</button>
          )}
        </div>
      </div>

      {/* ── DAW TIMELINE ────────────────────────────────────────────────────── */}
      <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: "10px", overflow: "hidden", marginBottom: "20px", background: "#0a0a0a" }}>

        {/* Minimap */}
        <div onClick={handleMinimapClick} title="Click to jump to position"
          style={{ height: "18px", background: "#060606", borderBottom: "1px solid #1a1a1a", position: "relative", cursor: minimap.hasScroll ? "crosshair" : "default", userSelect: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: LABEL_W, height: "100%", background: "#0a0a0a", zIndex: 2, borderRight: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "6px" }}>
            <span style={{ fontSize: "7px", color: "#2a2a2a", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>MAP</span>
          </div>
          <div style={{ position: "absolute", left: LABEL_W, right: 0, top: "5px", height: "7px", display: "flex" }}>
            {timeline.map((item, i) => (
              <div key={i} style={{ flexGrow: item.wordCount, flexShrink: 0, flexBasis: 0, minWidth: "2px", background: i === activeItem ? item.voice.color : item.voice.color + "44", borderRight: "1px solid #060606" }} />
            ))}
          </div>
          {/* SFX ticks */}
          {timeline.map((item, segIdx) =>
            item.segEffects.length > 0 ? (
              <div key={segIdx} style={{ position: "absolute", left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${(timeline.slice(0, segIdx).reduce((s, t) => s + t.wordCount, 0) / totalWords)})`, top: "11px", display: "flex", gap: "2px" }}>
                {item.segEffects.map((_, j) => <div key={j} style={{ width: "1px", height: "5px", background: "#d97706" }} />)}
              </div>
            ) : null
          )}
          <div style={{ position: "absolute", left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${minimap.leftFrac})`, width: `calc((100% - ${LABEL_W}px) * ${minimap.widthFrac})`, top: 0, bottom: 0, background: "rgba(255,255,255,0.04)", border: `1px solid ${minimap.hasScroll ? "rgba(255,255,255,0.18)" : "transparent"}`, borderTop: "none", borderBottom: "none", pointerEvents: "none", boxSizing: "border-box", transition: "left 0.05s, width 0.05s" }} />
        </div>

        {/* Scrollable track area */}
        <div ref={timelineScrollRef} style={{ overflowX: "auto", position: "relative" }}>
          <div style={{ minWidth: LABEL_W + totalCW, position: "relative" }}>

            {/* Time ruler */}
            <div style={{ display: "flex", height: "22px", background: "#080808", borderBottom: "1px solid #1e1e1e", position: "sticky", top: 0, zIndex: 5 }}>
              <div style={{ width: LABEL_W, flexShrink: 0, borderRight: "1px solid #1e1e1e", background: "#080808" }} />
              <div style={{ flex: 1, position: "relative" }}>
                {timeMarkers.map(m => {
                  const frac = Math.min((m * 60) / totalSeconds, 1);
                  return (
                    <div key={m} style={{ position: "absolute", left: `${frac * 100}%`, top: 0, bottom: 0, transform: frac >= 0.98 ? "translateX(-100%)" : frac > 0 ? "translateX(-50%)" : "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: "2px", pointerEvents: "none" }}>
                      <div style={{ width: "1px", height: "4px", background: "#2a2a2a", marginBottom: "1px" }} />
                      <span style={{ fontSize: "9px", color: "#444", fontFamily: "monospace", whiteSpace: "nowrap" }}>{m}:00</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Track rows ──────────────────────────────────────────────── */}

            {/* NARRATION */}
            <div style={{ display: "flex", height: TRACK_H, background: "#0d0d0d", borderBottom: "1px solid #1a1a1a" }}>
              <TrackLabel color="#888">NARRATION</TrackLabel>
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {timeline.map((item, i) => (
                  <div
                    key={i}
                    ref={i === activeItem ? activeSegRef : null}
                    onClick={() => { setActiveItem(i); setActiveSoundDetail(null); }}
                    title={`${item.voice.name} · ${item.wordCount}w\n${item.seg.text.substring(0, 100)}…`}
                    style={{
                      position: "absolute",
                      left: xOffsets[i] + 1, width: bWidths[i] - 2,
                      top: 5, height: TRACK_H - 10,
                      background: i === activeItem ? item.voice.color : item.voice.color + "3a",
                      border: i === activeItem ? "1.5px solid #fff" : `1px solid ${item.voice.color}66`,
                      boxShadow: i === activeItem ? `0 0 10px ${item.voice.color}55` : "none",
                      borderRadius: "6px", cursor: "pointer", overflow: "hidden",
                      display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 7px",
                      transition: "box-shadow 0.15s",
                    }}>
                    <span style={{ fontSize: "9px", fontWeight: "700", color: i === activeItem ? "#fff" : item.voice.color + "cc", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: "8px", color: i === activeItem ? "rgba(255,255,255,0.7)" : item.voice.color + "66", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.seg.text.substring(0, 18)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* MUSIC BED */}
            <div style={{ display: "flex", height: TRACK_H, background: "#111", borderBottom: "1px solid #1a1a1a" }}>
              <TrackLabel color="#2563eb">MUSIC BED</TrackLabel>
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {musicBed.map((c, i) => {
                  const x  = tsToX(c.timestamp);
                  const x2 = musicBed[i + 1] ? tsToX(musicBed[i + 1].timestamp) : totalCW;
                  const w  = Math.max(x2 - x - 2, 32);
                  const sel = activeSoundDetail?.type === "music" && activeSoundDetail?.index === i;
                  return (
                    <div key={i} onClick={() => setActiveSoundDetail({ type: "music", index: i, data: c, endTs: musicBed[i + 1]?.timestamp || null })}
                      title={`${c.timestamp} — ${c.mood}`}
                      style={{ position: "absolute", left: x + 1, width: w, top: 5, height: TRACK_H - 10, background: sel ? "#1e40af" : "#172554", border: `1px solid ${sel ? "#60a5fa" : "#2563eb"}`, borderRadius: "6px", cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", padding: "0 8px" }}>
                      <span style={{ fontSize: "9px", color: "#93c5fd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500" }}>{c.mood}</span>
                    </div>
                  );
                })}
                {musicBed.length === 0 && <EmptyTrack />}
              </div>
            </div>

            {/* AMBIENT */}
            <div style={{ display: "flex", height: TRACK_H, background: "#0d0d0d", borderBottom: "1px solid #1a1a1a" }}>
              <TrackLabel color="#059669">AMBIENT</TrackLabel>
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {ambientLayer.map((c, i) => {
                  const x  = tsToX(c.timestamp);
                  const x2 = ambientLayer[i + 1] ? tsToX(ambientLayer[i + 1].timestamp) : totalCW;
                  const w  = Math.max(x2 - x - 2, 32);
                  const sel = activeSoundDetail?.type === "ambient" && activeSoundDetail?.index === i;
                  return (
                    <div key={i} onClick={() => setActiveSoundDetail({ type: "ambient", index: i, data: c, endTs: ambientLayer[i + 1]?.timestamp || null })}
                      title={`${c.timestamp} — ${c.environment}`}
                      style={{ position: "absolute", left: x + 1, width: w, top: 5, height: TRACK_H - 10, background: sel ? "#065f46" : "#052e16", border: `1px solid ${sel ? "#34d399" : "#16a34a"}`, borderRadius: "6px", cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", padding: "0 8px" }}>
                      <span style={{ fontSize: "9px", color: "#86efac", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.environment}</span>
                    </div>
                  );
                })}
                {ambientLayer.length === 0 && <EmptyTrack />}
              </div>
            </div>

            {/* SFX */}
            <div style={{ display: "flex", height: TRACK_H, background: "#111", borderBottom: "1px solid #1a1a1a" }}>
              <TrackLabel color="#d97706">SFX</TrackLabel>
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {timeline.map((item, segIdx) =>
                  item.segEffects.map((e, j) => {
                    const globalIdx = sfxMarkers.findIndex(sfx => sfx.timestamp === e.timestamp && sfx.sound === e.sound);
                    const sel = activeSoundDetail?.type === "sfx" && activeSoundDetail?.index === globalIdx;
                    // Distribute multiple SFX within segment
                    const segX = xOffsets[segIdx];
                    const segBW = bWidths[segIdx];
                    const xPos = item.segEffects.length > 1
                      ? segX + ((j + 1) / (item.segEffects.length + 1)) * segBW
                      : segX + segBW / 2;
                    return (
                      <div key={`${segIdx}-${j}`}
                        onClick={() => setActiveSoundDetail({ type: "sfx", index: globalIdx, data: e })}
                        title={`${e.timestamp} — ${e.sound}`}
                        style={{ position: "absolute", left: xPos - 5, width: 10, top: 4, height: TRACK_H - 8, background: sel ? "#fbbf24" : "#d97706", border: `1px solid ${sel ? "#fde68a" : "#f59e0b"}`, borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: "7px", color: "#0a0a0a", fontWeight: "900", lineHeight: 1 }}>●</span>
                      </div>
                    );
                  })
                )}
                {sfxMarkers.length === 0 && <EmptyTrack />}
              </div>
            </div>

            {/* VISUALS */}
            <div style={{ display: "flex", height: TRACK_H, background: "#0d0d0d" }}>
              <TrackLabel color="#7c3aed">VISUALS</TrackLabel>
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {timeline.map((item, i) => (
                  <div key={i}
                    onClick={() => { setActiveItem(i); setActiveSoundDetail({ type: "visual" }); }}
                    style={{ position: "absolute", left: xOffsets[i] + 1, width: bWidths[i] - 2, top: 4, height: TRACK_H - 8, borderRadius: "6px", overflow: "hidden", cursor: "pointer", border: i === activeItem ? "1.5px solid rgba(255,255,255,0.6)" : "1px solid #252525", background: "#1a1a1a" }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: i === activeItem ? 1 : 0.55, transition: "opacity 0.15s" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: "9px", color: i === activeItem ? "#7c3aed" : "#333", fontWeight: "700" }}>{item.matchedPrompt?.imageNumber || ""}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Playhead — vertical red line over all tracks */}
            <div style={{
              position: "absolute",
              left: playheadX,
              top: 0, bottom: 0,
              width: "2px",
              background: PLAYHEAD,
              pointerEvents: "none",
              zIndex: 20,
              transition: "left 0.2s ease",
              boxShadow: `0 0 6px ${PLAYHEAD}88`,
            }}>
              {/* Playhead head triangle */}
              <div style={{ position: "absolute", top: "22px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `7px solid ${PLAYHEAD}` }} />
            </div>

          </div>
        </div>
      </div>

      {/* ── DETAIL PANEL ────────────────────────────────────────────────────── */}
      {/* ── DETAIL PANEL ──────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "12px", marginBottom: "20px", alignItems: "flex-start" }}>

        {/* Left: image */}
        <div style={{ ...S.card, padding: "10px", background: "#0e0d14", border: "1px solid #7c3aed44" }}>
          {active?.imageUrl ? (
            <img src={active.imageUrl} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block", borderRadius: "5px" }} />
          ) : (
            <div style={{ aspectRatio: "16/9", background: "#1a1530", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "10px", color: "#7c3aed66", fontStyle: "italic", textAlign: "center", padding: "0 10px" }}>No image</span>
            </div>
          )}
          {active?.matchedPrompt && (
            <div style={{ marginTop: "8px" }}>
              <span style={{ fontSize: "10px", color: "#a78bfa", fontWeight: "700" }}>Img {active.matchedPrompt.imageNumber}</span>
              <span style={{ fontSize: "10px", color: "#7c3aed88", marginLeft: "6px" }}>{active.matchedPrompt.mood}</span>
            </div>
          )}
        </div>

        {/* Right: narration + chip strip */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

          {/* Narration */}
          <div style={{ ...S.card, padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px", background: `${active?.voice.color}0a`, border: `1px solid ${active?.voice.color}44` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "14px", color: active?.voice.color, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {active?.voice.name.split(/\s*[-–]\s*/)[0].trim()}
                </span>
                <span style={{ fontSize: "12px", color: COLORS.textTertiary, marginLeft: "10px" }}>
                  Seg {activeItem + 1} / {timeline.length} · {active?.wordCount}w
                </span>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <button onClick={() => { setActiveItem(Math.max(0, activeItem - 1)); setActiveSoundDetail(null); }} disabled={activeItem === 0} style={navBtn(activeItem === 0)} title="← arrow key">←</button>
                <button onClick={() => { setActiveItem(Math.min(timeline.length - 1, activeItem + 1)); setActiveSoundDetail(null); }} disabled={activeItem === timeline.length - 1} style={navBtn(activeItem === timeline.length - 1)} title="→ arrow key">→</button>
              </div>
            </div>
            {audioUrls[active?.seg.id] ? (
              <audio key={audioUrls[active.seg.id]} controls src={audioUrls[active.seg.id]} style={{ width: "100%", height: "36px" }} />
            ) : (
              <div style={{ fontSize: "12px", color: COLORS.textTertiary, fontStyle: "italic", padding: "2px 0" }}>No audio — generate in Narration stage</div>
            )}
            <div style={{ overflowY: "auto", maxHeight: "200px", overflowX: "hidden" }}>
              <div style={{ fontSize: "14px", color: COLORS.text, lineHeight: "1.8", wordBreak: "break-word", overflowWrap: "break-word", borderLeft: `3px solid ${active?.voice.color}`, paddingLeft: "12px" }}>
                {active?.seg.text}
              </div>
            </div>
          </div>

          {/* Chip strip — image prompt + all sound layers in one row */}
          {activeSoundDetail && activeSoundDetail.type !== "visual" ? (
            <SoundDetailCard detail={activeSoundDetail} onClose={() => setActiveSoundDetail(null)} />
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>

              {/* Image prompt chip */}
              {active?.matchedPrompt && (
                <div style={{ flex: "1 1 200px", background: "#0e0d14", border: "1px solid #7c3aed44", borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "9px", color: "#a78bfa", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.7px" }}>◆ Image Prompt</span>
                    <button style={{ ...S.btnSecondary(copiedPrompt), fontSize: "9px", padding: "2px 6px" }} onClick={() => copyPrompt(active.matchedPrompt.prompt)}>
                      {copiedPrompt ? "✓" : "Copy"}
                    </button>
                  </div>
                  <div style={{ fontSize: "10px", color: "#c4b5fd99", fontFamily: "monospace", lineHeight: "1.5", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                    {active.matchedPrompt.prompt.replace(/\s*--(?:ar|style|v|no|q|s|c|chaos|seed|tile|weird|iw|stop|niji|hd|aspect)\s+\S+/g, "").trim()}
                  </div>
                </div>
              )}

              {/* SFX chips — one chip per effect */}
              {active?.segEffects?.length > 0
                ? active.segEffects.map((e, i) => (
                  <div key={i} style={{ flex: "1 1 160px", background: "#1a1200", border: "1px solid #d9770644", borderRadius: "8px", padding: "8px 10px" }}>
                    <div style={{ fontSize: "9px", color: "#f59e0b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "4px" }}>◆ SFX</div>
                    <div style={{ fontSize: "12px", color: "#fcd34d", fontWeight: "600", marginBottom: "3px" }}>{e.sound}</div>
                    <div style={{ fontSize: "10px", color: "#a38a3a", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.trigger}>
                      "{e.trigger.length > 36 ? e.trigger.substring(0, 36) + "…" : e.trigger}"
                    </div>
                  </div>
                ))
                : (
                  <div style={{ flex: "0 0 auto", background: "#111", border: "1px solid #d9770622", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "9px", color: "#d97706", fontWeight: "700", textTransform: "uppercase" }}>◆ SFX</span>
                    <span style={{ fontSize: "10px", color: "#444", fontStyle: "italic" }}>None</span>
                  </div>
                )
              }

              {/* Music bed chip */}
              {activeMusicCue ? (
                <div style={{ flex: "1 1 160px", background: "#0a0f1f", border: "1px solid #2563eb44", borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ fontSize: "9px", color: "#60a5fa", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "4px" }}>◆ Music Bed</div>
                  <div style={{ fontSize: "12px", color: "#93c5fd", fontWeight: "600", marginBottom: "3px" }}>{activeMusicCue.mood}</div>
                  {activeMusicCue.description && <div style={{ fontSize: "10px", color: "#3b82f666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeMusicCue.description}</div>}
                </div>
              ) : (
                <div style={{ flex: "0 0 auto", background: "#111", border: "1px solid #2563eb22", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "9px", color: "#2563eb", fontWeight: "700", textTransform: "uppercase" }}>◆ Music</span>
                  <span style={{ fontSize: "10px", color: "#444", fontStyle: "italic" }}>No cue</span>
                </div>
              )}

              {/* Ambient chip */}
              {activeAmbientCue ? (
                <div style={{ flex: "1 1 160px", background: "#071a10", border: "1px solid #05966944", borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ fontSize: "9px", color: "#34d399", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "4px" }}>◆ Ambient</div>
                  <div style={{ fontSize: "12px", color: "#6ee7b7", fontWeight: "600", marginBottom: "3px" }}>{activeAmbientCue.environment}</div>
                  {activeAmbientCue.sounds && <div style={{ fontSize: "10px", color: "#05966966", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeAmbientCue.sounds}</div>}
                </div>
              ) : (
                <div style={{ flex: "0 0 auto", background: "#111", border: "1px solid #05966922", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "9px", color: "#059669", fontWeight: "700", textTransform: "uppercase" }}>◆ Ambient</span>
                  <span style={{ fontSize: "10px", color: "#444", fontStyle: "italic" }}>No cue</span>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TrackLabel({ children, color = "#555" }) {
  return (
    <div style={{
      width: LABEL_W, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "flex-end",
      paddingRight: "10px", borderRight: "1px solid #1a1a1a",
      position: "sticky", left: 0, zIndex: 3, background: "inherit",
    }}>
      <span style={{ fontSize: "9px", color, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.7px" }}>{children}</span>
    </div>
  );
}

function EmptyTrack() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: "12px" }}>
      <span style={{ fontSize: "10px", color: "#252525", fontStyle: "italic" }}>No data</span>
    </div>
  );
}

function SoundDetailCard({ detail, onClose }) {
  const { type, data, endTs } = detail;
  const isMusic   = type === "music";
  const isAmbient = type === "ambient";
  const color = isMusic ? "#2563eb" : isAmbient ? "#16a34a" : "#d97706";
  const label = isMusic ? "Music Cue" : isAmbient ? "Ambient Layer" : "Sound Effect";

  return (
    <div style={{ ...S.card, padding: "14px 16px", border: `1px solid ${color}44` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color, flexShrink: 0 }} />
          <span style={{ fontSize: "10px", color, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "14px", padding: "0 2px", lineHeight: 1, fontFamily: "inherit" }}>✕</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {data.timestamp && <SoundRow label="Time" value={endTs ? `${data.timestamp} → ${endTs}` : data.timestamp} color={color} mono />}
        {isMusic && <>
          <SoundRow label="Mood"  value={data.mood} />
          {data.description && <SoundRow label="Feel"  value={data.description} />}
          {data.notes       && <SoundRow label="Notes" value={data.notes} />}
        </>}
        {isAmbient && <>
          <SoundRow label="Environment" value={data.environment} />
          {data.sounds && <SoundRow label="Sounds" value={data.sounds} />}
          {data.notes  && <SoundRow label="Notes"  value={data.notes} />}
        </>}
        {type === "sfx" && <>
          {data.trigger && (
            <div style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: "8px", alignItems: "start" }}>
              <span style={{ fontSize: "10px", color: "#555", fontWeight: "600", paddingTop: "1px" }}>On line</span>
              <span style={{ fontSize: "11px", color: COLORS.textSecondary, fontStyle: "italic", lineHeight: "1.5", wordBreak: "break-word", cursor: "default" }} title={`"${data.trigger}"`}>
                "{data.trigger.length > 80 ? data.trigger.substring(0, 80) + "…" : data.trigger}"
              </span>
            </div>
          )}
          <SoundRow label="Effect" value={data.sound} />
          {data.purpose && <SoundRow label="Why" value={data.purpose} />}
        </>}
        {data.source && <SoundRow label="Source" value={data.source} dim />}
      </div>
    </div>
  );
}

function SoundRow({ label, value, color, italic, dim, mono }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: "8px", alignItems: "start" }}>
      <span style={{ fontSize: "10px", color: "#555", fontWeight: "600", paddingTop: "1px" }}>{label}</span>
      <span style={{ fontSize: "11px", color: dim ? "#555" : color || COLORS.textSecondary, fontStyle: italic ? "italic" : "normal", fontFamily: mono ? "monospace" : "inherit", lineHeight: "1.5", wordBreak: "break-word" }}>
        {value}
      </span>
    </div>
  );
}

export default Stage7;
