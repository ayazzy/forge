import { useState, useRef, useEffect } from "react";
import { S, COLORS } from "../../styles/theme";
import { generateSRT } from "../../lib/srt";
import { generateProductionBriefPDF } from "../../lib/productionBrief";

const ROW_H = { narration: 56, visuals: 64, sound: 44 };
const LABEL_W = 76;
const MIN_BLOCK_W = 44; // px minimum per segment block

function Stage7({ data, onApprove, isComplete, onBackToSummary }) {
  const {
    segments = [], voices = [], audioUrls = {}, prompts = [],
    images = {}, cues = null, topic, episode, meta, research,
  } = data;

  // ── word-count proportional widths ───────────────────────────────────────
  const segWordCounts = segments.map(seg =>
    seg.text.trim().split(/\s+/).filter(Boolean).length
  );
  const totalWords = segWordCounts.reduce((a, b) => a + b, 0) || 1;

  // ── build timeline items ─────────────────────────────────────────────────
  const timeline = segments.map((seg, i) => {
    const voice =
      voices.find(v => v.id === seg.voiceId) || voices[0] || { name: "Narrator", color: "#c0392b" };
    const imageIndex = Math.round(
      (i / Math.max(segments.length - 1, 1)) * Math.max(prompts.length - 1, 0)
    );
    const matchedPrompt = prompts[imageIndex];
    const imageUrl = matchedPrompt ? images[matchedPrompt.imageNumber] : null;
    const wordCount = segWordCounts[i];
    const widthPct = (wordCount / totalWords) * 100;
    const segStart = Math.round((i / segments.length) * 15);
    const segEnd = Math.round(((i + 1) / segments.length) * 15);
    const segEffects = (cues?.effects || []).filter(c => {
      const mins = parseFloat(c.timestamp?.split(":")?.[0] || 0);
      return mins >= segStart && mins < segEnd;
    });
    return { seg, voice, imageUrl, matchedPrompt, segEffects, index: i, wordCount, widthPct };
  });

  // ── sound-row helpers ────────────────────────────────────────────────────
  const totalSeconds = (totalWords / 150) * 60 || 1;
  const tsToSeconds = (ts = "0:00") => {
    const parts = ts.split(":").map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  // ── state ────────────────────────────────────────────────────────────────
  const [activeItem, setActiveItem] = useState(0);
  const [exported, setExported] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const scriptRef = useRef(null);
  const activeSegRef = useRef(null);

  useEffect(() => {
    activeSegRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeItem]);

  // ── export helpers ───────────────────────────────────────────────────────
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
        ...data,
        segments,
        voices,
        audioUrls,
        imagePrompts: prompts,
        images,
        soundDesign: cues,
        meta,
        research,
        topic,
        episode,
        channelProfile: data.channelProfile,
        analysis: data.analysis,
        thumbnailConcepts: data.thumbnailConcepts,
        selectedConcept: data.selectedConcept,
        voiceSegments: segments,
      });
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setPdfExporting(false);
    }
  };

  const exportPackage = async () => {
    let JSZip;
    try {
      JSZip = (await import("jszip")).default;
    } catch {
      exportLegacy(); return;
    }
    const zip = new JSZip();
    const epNum = episode || "xx";
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

  const active = timeline[activeItem];

  // ── empty state ──────────────────────────────────────────────────────────
  if (timeline.length === 0) {
    return (
      <div>
        <PageHeader isComplete={isComplete} onBackToSummary={onBackToSummary} />
        <div style={{ ...S.card, color: COLORS.textTertiary, fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "60px 24px" }}>
          Complete the Narration and Visuals stages to build the assembly view.
        </div>
      </div>
    );
  }

  // ── sound row computed values ────────────────────────────────────────────
  const musicBed = cues?.musicBed || [];
  const ambientLayer = cues?.ambientLayer || [];
  const sfxMarkers = cues?.effects || [];

  return (
    <div>
      <PageHeader isComplete={isComplete} onBackToSummary={onBackToSummary} />

      {/* ── Main layout: timeline + sidebar ─────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "20px", alignItems: "start" }}>

        {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
        <div>

          {/* ── 3-Row Timeline ─────────────────────────────────────────── */}
          <div style={{
            border: `1px solid ${COLORS.border}`,
            borderRadius: "10px",
            overflow: "hidden",
            marginBottom: "16px",
            background: "#111",
          }}>
            {/* Row header labels + scrollable content — use overflowX: auto on a single wrapper */}
            <div style={{ overflowX: "auto" }}>
              {/* ── Narration row ───────────────────────────────────────── */}
              <TimelineRow
                label="Narration"
                height={ROW_H.narration}
                borderBottom
              >
                {timeline.map((item, i) => (
                  <NarrationBlock
                    key={i}
                    item={item}
                    active={activeItem === i}
                    hasAudio={!!audioUrls[item.seg.id]}
                    onClick={() => setActiveItem(i)}
                  />
                ))}
              </TimelineRow>

              {/* ── Visuals row ─────────────────────────────────────────── */}
              <TimelineRow
                label="Visuals"
                height={ROW_H.visuals}
                borderBottom
                labelColor="#2563eb"
              >
                {timeline.map((item, i) => (
                  <VisualBlock
                    key={i}
                    item={item}
                    active={activeItem === i}
                    onClick={() => setActiveItem(i)}
                  />
                ))}
              </TimelineRow>

              {/* ── Sound row ───────────────────────────────────────────── */}
              <TimelineRow label="Sound" height={ROW_H.sound} labelColor="#059669">
                {/* Sound row is position:relative, markers are absolute */}
                <div style={{ flex: 1, position: "relative", minWidth: `${segments.length * MIN_BLOCK_W}px` }}>
                  {/* Music bed spans */}
                  {musicBed.map((c, i) => {
                    const start = (tsToSeconds(c.timestamp) / totalSeconds) * 100;
                    const end = musicBed[i + 1]
                      ? (tsToSeconds(musicBed[i + 1].timestamp) / totalSeconds) * 100
                      : 100;
                    const width = Math.max(end - start, 0.5);
                    return (
                      <div key={i} title={`${c.timestamp} — ${c.mood}: ${c.description}`} style={{
                        position: "absolute", left: `${start}%`, width: `${width}%`,
                        top: "5px", height: "14px",
                        background: "#1d3a6a", border: "1px solid #2563eb50",
                        borderRadius: "3px", overflow: "hidden",
                        display: "flex", alignItems: "center", padding: "0 4px",
                      }}>
                        <span style={{ fontSize: "8px", color: "#93bbff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.mood}</span>
                      </div>
                    );
                  })}
                  {/* Ambient spans */}
                  {ambientLayer.map((c, i) => {
                    const start = (tsToSeconds(c.timestamp) / totalSeconds) * 100;
                    const end = ambientLayer[i + 1]
                      ? (tsToSeconds(ambientLayer[i + 1].timestamp) / totalSeconds) * 100
                      : 100;
                    const width = Math.max(end - start, 0.5);
                    return (
                      <div key={i} title={`${c.timestamp} — ${c.environment}: ${c.sounds}`} style={{
                        position: "absolute", left: `${start}%`, width: `${width}%`,
                        top: "22px", height: "10px",
                        background: "#0a2a1a", border: "1px solid #05966950",
                        borderRadius: "3px", overflow: "hidden",
                        display: "flex", alignItems: "center", padding: "0 4px",
                      }}>
                        <span style={{ fontSize: "7px", color: "#4ade80", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.environment}</span>
                      </div>
                    );
                  })}
                  {/* SFX dot markers */}
                  {sfxMarkers.map((c, i) => {
                    const left = (tsToSeconds(c.timestamp) / totalSeconds) * 100;
                    return (
                      <div key={i} title={`${c.timestamp}: ${c.sound}`} style={{
                        position: "absolute", left: `${left}%`, top: "35px",
                        width: "3px", height: "8px", background: "#e03535",
                        borderRadius: "1px", transform: "translateX(-1px)",
                      }} />
                    );
                  })}
                  {/* Legend row at bottom-left */}
                  {(musicBed.length > 0 || ambientLayer.length > 0 || sfxMarkers.length > 0) && (
                    <div style={{ position: "absolute", bottom: "2px", left: "4px", display: "flex", gap: "8px", alignItems: "center" }}>
                      {musicBed.length > 0 && <LegendDot color="#2563eb" label="Music" />}
                      {ambientLayer.length > 0 && <LegendDot color="#059669" label="Ambient" />}
                      {sfxMarkers.length > 0 && <LegendDot color="#e03535" label="SFX" />}
                    </div>
                  )}
                </div>
              </TimelineRow>
            </div>
          </div>

          {/* ── Detail pane: script + image/prompt ───────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

            {/* Script panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Audio player */}
              <div style={{ ...S.card, marginBottom: 0, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", color: active?.voice.color, fontWeight: "600" }}>
                    {active?.voice.name} · Seg {activeItem + 1} / {timeline.length}
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => setActiveItem(Math.max(0, activeItem - 1))}
                      disabled={activeItem === 0}
                      style={{ background: "none", border: `1px solid ${COLORS.border}`, color: activeItem === 0 ? COLORS.textTertiary : COLORS.textSecondary, borderRadius: "5px", padding: "3px 8px", fontSize: "11px", cursor: activeItem === 0 ? "default" : "pointer", fontFamily: "inherit" }}
                    >←</button>
                    <button
                      onClick={() => setActiveItem(Math.min(timeline.length - 1, activeItem + 1))}
                      disabled={activeItem === timeline.length - 1}
                      style={{ background: "none", border: `1px solid ${COLORS.border}`, color: activeItem === timeline.length - 1 ? COLORS.textTertiary : COLORS.textSecondary, borderRadius: "5px", padding: "3px 8px", fontSize: "11px", cursor: activeItem === timeline.length - 1 ? "default" : "pointer", fontFamily: "inherit" }}
                    >→</button>
                  </div>
                </div>
                {audioUrls[active?.seg.id] ? (
                  <audio key={audioUrls[active.seg.id]} controls src={audioUrls[active.seg.id]} style={{ width: "100%", height: "32px" }} />
                ) : (
                  <div style={{ fontSize: "11px", color: COLORS.textTertiary, fontStyle: "italic" }}>
                    Audio unavailable — re-generate in Narration or use downloaded ZIP
                  </div>
                )}
              </div>

              {/* Scrollable script panel */}
              <div
                ref={scriptRef}
                style={{
                  background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                  borderRadius: "8px", maxHeight: "280px", overflowY: "auto",
                  padding: "6px",
                }}
              >
                <div style={{ fontSize: "10px", color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600", padding: "6px 8px 8px" }}>Script</div>
                {timeline.map((item, i) => (
                  <div
                    key={i}
                    ref={i === activeItem ? activeSegRef : null}
                    onClick={() => setActiveItem(i)}
                    style={{
                      padding: "8px 10px", borderRadius: "6px", marginBottom: "2px",
                      background: i === activeItem ? `${item.voice.color}18` : "transparent",
                      borderLeft: `3px solid ${i === activeItem ? item.voice.color : "transparent"}`,
                      cursor: "pointer", transition: "background 0.12s ease",
                    }}
                    onMouseEnter={e => { if (i !== activeItem) e.currentTarget.style.background = "#1e1e1e"; }}
                    onMouseLeave={e => { if (i !== activeItem) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ fontSize: "9px", color: item.voice.color, fontWeight: "700", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                      {item.voice.name}
                    </div>
                    <div style={{ fontSize: "12px", color: i === activeItem ? COLORS.text : COLORS.textSecondary, lineHeight: "1.75" }}>
                      {item.seg.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image + prompt + SFX */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Image preview */}
              <div style={{
                background: COLORS.surfaceSecondary, border: `1px solid ${COLORS.border}`,
                borderRadius: "8px", aspectRatio: "16/9",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}>
                {active?.imageUrl ? (
                  <img src={active.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ textAlign: "center", padding: "16px" }}>
                    <div style={{ fontSize: "11px", color: COLORS.textTertiary, fontStyle: "italic" }}>
                      {active?.matchedPrompt ? `Image ${active.matchedPrompt.imageNumber} · ${active.matchedPrompt.mood}` : "No image"}
                    </div>
                  </div>
                )}
              </div>

              {/* Image prompt */}
              {active?.matchedPrompt && (
                <div style={{ ...S.card, marginBottom: 0, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ fontSize: "10px", color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600" }}>
                      Image {active.matchedPrompt.imageNumber} — {active.matchedPrompt.mood}
                    </div>
                    <button
                      style={{ ...S.btnSecondary(copiedPrompt), fontSize: "10px", padding: "3px 8px", flexShrink: 0 }}
                      onClick={() => copyPrompt(active.matchedPrompt.prompt)}
                    >
                      {copiedPrompt ? "✓" : "Copy"}
                    </button>
                  </div>
                  <div style={{ fontSize: "11px", color: COLORS.textSecondary, fontFamily: "monospace", lineHeight: "1.6", wordBreak: "break-word" }}>
                    {active.matchedPrompt.prompt.replace(/\s*--(?:ar|style|v|no|q|s|c|chaos|seed|tile|weird|iw|stop|niji|hd|aspect)\s+\S+/g, "").trim()}
                  </div>
                  {active.matchedPrompt.why && (
                    <div style={{ fontSize: "10px", color: COLORS.success, fontStyle: "italic", marginTop: "5px" }}>↳ {active.matchedPrompt.why}</div>
                  )}
                </div>
              )}

              {/* Sound effects for active segment */}
              {active?.segEffects?.length > 0 && (
                <div style={{ ...S.card, marginBottom: 0, padding: "10px 12px" }}>
                  <div style={{ fontSize: "10px", color: "#059669", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600", marginBottom: "6px" }}>Sound Effects</div>
                  {active.segEffects.map((e, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", padding: "4px 0", borderBottom: i < active.segEffects.length - 1 ? `1px solid ${COLORS.borderLight}` : "none" }}>
                      <span style={{ fontSize: "11px", color: COLORS.textSecondary, fontStyle: "italic", flex: 1 }}>"{e.trigger}"</span>
                      <span style={{ fontSize: "11px", color: "#4ade80" }}>→ {e.sound}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── EXPORT SIDEBAR ──────────────────────────────────────────────── */}
        <div style={{
          position: "sticky", top: "20px",
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: "10px", padding: "16px 14px",
          display: "flex", flexDirection: "column", gap: "8px",
        }}>
          <div style={{ fontSize: "10px", color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: "600", marginBottom: "2px" }}>
            Export
          </div>

          {segments.length > 0 && (
            <button
              onClick={downloadSubtitles}
              style={{ ...sidebarBtn, background: "transparent", color: COLORS.textSecondary, border: `1px solid ${COLORS.border}` }}
            >
              ↓ Subtitles (.srt)
            </button>
          )}
          <button
            onClick={downloadPDF}
            disabled={pdfExporting}
            style={{ ...sidebarBtn, background: "transparent", color: COLORS.textSecondary, border: `1px solid ${COLORS.border}` }}
          >
            {pdfExporting ? "Building…" : "↓ Production Brief (PDF)"}
          </button>
          <button
            onClick={exportPackage}
            style={{ ...sidebarBtn, background: exported ? "#0a2a1a" : "#1e1e1e", color: exported ? "#4ade80" : COLORS.text, border: `1px solid ${exported ? "#14532d" : COLORS.border}` }}
          >
            {exported ? "✓ Downloaded!" : "↓ Complete ZIP"}
          </button>

          {onApprove && (
            <button
              onClick={() => onApprove({})}
              style={{ ...sidebarBtn, background: "#e03535", color: "#fff", border: "none", fontWeight: "700", marginTop: "4px" }}
            >
              Thumbnail →
            </button>
          )}

          {/* Divider */}
          <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "6px 0" }} />

          {/* Stats */}
          {[
            { label: "Segments", value: segments.length, color: "#e03535" },
            { label: "Images", value: prompts.length, color: "#2563eb" },
            { label: "Voices", value: voices.length, color: "#7c3aed" },
            { label: "SFX cues", value: (cues?.effects || []).length, color: "#059669" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: COLORS.textTertiary }}>{s.label}</span>
              <span style={{ fontSize: "13px", fontWeight: "700", color: s.color }}>{s.value}</span>
            </div>
          ))}

          {/* Music bed legend */}
          {cues && (musicBed.length > 0 || ambientLayer.length > 0) && (
            <>
              <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "4px 0" }} />
              <div style={{ fontSize: "10px", color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600" }}>Sound layers</div>
              {musicBed.length > 0 && <div style={{ fontSize: "10px", color: "#93bbff" }}>♫ {musicBed.length} music cues</div>}
              {ambientLayer.length > 0 && <div style={{ fontSize: "10px", color: "#4ade80" }}>~ {ambientLayer.length} ambient shifts</div>}
              {sfxMarkers.length > 0 && <div style={{ fontSize: "10px", color: "#fc8181" }}>⚡ {sfxMarkers.length} sfx markers</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── shared sidebar button style ──────────────────────────────────────────────
const sidebarBtn = {
  width: "100%", padding: "8px 10px", borderRadius: "7px",
  fontSize: "11px", fontWeight: "600", cursor: "pointer",
  fontFamily: "inherit", textAlign: "center", transition: "opacity 0.15s",
};

// ── sub-components ───────────────────────────────────────────────────────────

function PageHeader({ isComplete, onBackToSummary }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0" }}>
      <div>
        <div style={S.sectionTitle}>Assembly</div>
        <div style={S.sectionSubtitle}>Three-layer timeline — narration, visuals, and sound. Click any block to inspect.</div>
      </div>
      {isComplete && (
        <button onClick={onBackToSummary} style={{ ...S.btnGhost, marginTop: "4px", whiteSpace: "nowrap" }}>
          ← Back to Summary
        </button>
      )}
    </div>
  );
}

function TimelineRow({ label, height, children, borderBottom, labelColor = "#888" }) {
  return (
    <div style={{
      display: "flex", height: `${height}px`,
      borderBottom: borderBottom ? "1px solid #1e1e1e" : "none",
    }}>
      {/* Sticky label cell */}
      <div style={{
        width: `${LABEL_W}px`, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        padding: "0 10px 0 8px", borderRight: "1px solid #1e1e1e",
        position: "sticky", left: 0, zIndex: 2, background: "#111",
      }}>
        <span style={{ fontSize: "9px", color: labelColor, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: "right" }}>
          {label}
        </span>
      </div>
      {/* Content — stretches to fill */}
      <div style={{ display: "flex", flex: 1, position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

function NarrationBlock({ item, active, hasAudio, onClick }) {
  return (
    <div
      onClick={onClick}
      title={`${item.voice.name}: ${item.seg.text.substring(0, 80)}…`}
      style={{
        flexShrink: 0,
        width: `max(${item.widthPct}%, ${MIN_BLOCK_W}px)`,
        height: "100%",
        background: active ? `${item.voice.color}28` : `${item.voice.color}0f`,
        borderLeft: `3px solid ${active ? item.voice.color : item.voice.color + "44"}`,
        borderRight: "1px solid #1e1e1e",
        cursor: "pointer",
        padding: "6px 8px",
        display: "flex", flexDirection: "column", justifyContent: "center",
        transition: "background 0.12s ease",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: "9px", color: item.voice.color, fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase", letterSpacing: "0.3px" }}>
        {item.voice.name}
      </div>
      <div style={{ fontSize: "8px", color: "#555", marginTop: "2px" }}>
        {item.wordCount}w {hasAudio ? "· ▶" : ""}
      </div>
    </div>
  );
}

function VisualBlock({ item, active, onClick }) {
  return (
    <div
      onClick={onClick}
      title={item.matchedPrompt ? `Image ${item.matchedPrompt.imageNumber} · ${item.matchedPrompt.mood}` : "No visual"}
      style={{
        flexShrink: 0,
        width: `max(${item.widthPct}%, ${MIN_BLOCK_W}px)`,
        height: "100%",
        borderRight: "1px solid #1e1e1e",
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
        outline: active ? `2px solid ${item.voice.color}` : "none",
        outlineOffset: "-2px",
        boxSizing: "border-box",
      }}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: active ? 1 : 0.55, transition: "opacity 0.15s" }}
        />
      ) : item.matchedPrompt ? (
        <div style={{
          width: "100%", height: "100%",
          background: active ? "#1e1e1e" : "#141414",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "4px",
        }}>
          <span style={{ fontSize: "8px", color: "#555", textAlign: "center", lineHeight: "1.3", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
            {item.matchedPrompt.mood}
          </span>
        </div>
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#0f0f0f" }} />
      )}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
      <div style={{ width: "6px", height: "6px", borderRadius: "1px", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: "8px", color: "#555" }}>{label}</span>
    </div>
  );
}

export default Stage7;
