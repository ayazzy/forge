import { useState, useEffect, useRef } from "react";
import { generateCartesiaSpeech, getCartesiaVoices, claude, uploadAsset } from "../../lib/api";
import { injectV3Tags } from "../../lib/analysis";
import { S, VOICE_PALETTE, COLORS, ACCENT, renderTagged } from "../../styles/theme";
import { extractJSON } from "../../lib/parseJSON";

// ─── Voice tag inference ──────────────────────────────────────────────────────
const QUALITY_TAG_RULES = [
  { tag: 'Deep',      terms: ['deep', 'bass', 'low', 'gravelly', 'resonant', 'booming', 'baritone'] },
  { tag: 'Warm',      terms: ['warm', 'smooth', 'rich', 'friendly', 'mellow', 'soothing', 'gentle'] },
  { tag: 'Energetic', terms: ['energetic', 'upbeat', 'lively', 'dynamic', 'enthusiastic', 'bright', 'animated', 'exciting'] },
  { tag: 'Calm',      terms: ['calm', 'soothing', 'soft', 'peaceful', 'relaxed', 'composed', 'measured', 'steady', 'quiet'] },
];
const FILTER_TAGS = ['All', 'Male', 'Female', 'Deep', 'Warm', 'Energetic', 'Calm'];

// Accent inference — checks API fields first, then description text
const ACCENT_OPTIONS = ['Any Accent', 'American', 'British', 'Australian', 'Indian'];
const ACCENT_RULES = [
  { accent: 'British',    terms: ['british', 'uk', 'english accent', 'london', 'oxford', 'received pronunciation', 'rp accent', 'transatlantic'] },
  { accent: 'Australian', terms: ['australian', 'aussie', 'sydney', 'melbourne'] },
  { accent: 'Indian',     terms: ['indian', 'hindi', 'south asian'] },
  { accent: 'American',   terms: ['american', 'us accent', 'neutral american', 'midwest', 'southern american', 'new york', 'california'] },
];

function inferAccent(voice) {
  // Prefer structured API fields
  const apiAccent = voice.accent || voice.language_accent || voice.locale;
  if (apiAccent) {
    const a = apiAccent.toLowerCase();
    if (a.includes('british') || a.includes('gb') || a === 'en-gb') return 'British';
    if (a.includes('australian') || a === 'en-au') return 'Australian';
    if (a.includes('indian') || a === 'en-in') return 'Indian';
    if (a.includes('american') || a === 'en-us' || a === 'en') return 'American';
  }
  // Fall back to description text
  const haystack = `${voice.name} ${voice.description || ''}`.toLowerCase();
  for (const { accent, terms } of ACCENT_RULES) {
    if (terms.some(t => haystack.includes(t))) return accent;
  }
  return null; // unknown
}

// Gender detection: check female first so 'female' doesn't match the 'male' substring
function inferGender(voice) {
  const haystack = `${voice.name} ${voice.description || ''}`.toLowerCase();
  const femaleTerms = ['female', 'woman', 'girl', 'feminine', 'she ', 'she,', 'she.', " her ", 'soprano'];
  const maleTerms   = ['male', 'man', 'guy', 'masculine', 'baritone', 'tenor', 'he ', 'he,', 'he.', ' his '];
  if (femaleTerms.some(t => haystack.includes(t))) return 'Female';
  if (maleTerms.some(t => haystack.includes(t))) return 'Male';
  return null;
}

function inferTags(voice) {
  const haystack = `${voice.name} ${voice.description || ''}`.toLowerCase();
  const tags = [];
  const gender = inferGender(voice);
  if (gender) tags.push(gender);
  for (const { tag, terms } of QUALITY_TAG_RULES) {
    if (terms.some(t => haystack.includes(t))) tags.push(tag);
  }
  return tags;
}

// Split Cartesia name like "Damon - Commanding Narrator" into parts
function parseName(raw = '') {
  const [name, ...rest] = raw.split(/\s*[-–]\s*/);
  return { name: name.trim(), descriptor: rest.join(' ').trim() };
}

// ─── Voice browser ────────────────────────────────────────────────────────────
function VoiceBrowser({ voices, onSelect, selected, previewText }) {
  const [loading, setLoading]       = useState(null);
  const [playing, setPlaying]       = useState(null);
  const [hovering, setHovering]     = useState(null);
  const [previewUrls, setPreviewUrls]   = useState({});
  const [previewErrors, setPreviewErrors] = useState({});
  const [search, setSearch]         = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [accentFilter, setAccentFilter]  = useState('Any Accent');
  const currentAudio = useRef(null);

  // Pre-compute tags + accent for every voice once
  const voicesWithTags = voices.map(v => ({ ...v, _tags: inferTags(v), _accent: inferAccent(v) }));

  const toggleFilter = (tag) => {
    if (tag === 'All') { setActiveFilters([]); return; }
    setActiveFilters(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const visible = voicesWithTags.filter(v => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      v.name?.toLowerCase().includes(q) ||
      v.description?.toLowerCase().includes(q);
    const matchesFilters = activeFilters.length === 0 ||
      activeFilters.every(f => v._tags.includes(f));
    const matchesAccent = accentFilter === 'Any Accent' || v._accent === accentFilter;
    return matchesSearch && matchesFilters && matchesAccent;
  });

  const stopCurrent = () => {
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.onended = null;
      currentAudio.current = null;
    }
    setPlaying(null);
  };

  const playUrl = (url, voiceId) => {
    stopCurrent();
    const audio = new Audio(url);
    currentAudio.current = audio;
    setPlaying(voiceId);
    audio.onended = () => {
      if (currentAudio.current === audio) { currentAudio.current = null; setPlaying(null); }
    };
    audio.play().catch(() => setPlaying(null));
  };

  const handlePreview = async (e, voice) => {
    e.stopPropagation();
    if (playing === voice.id) { stopCurrent(); return; }
    if (previewUrls[voice.id]) { playUrl(previewUrls[voice.id], voice.id); return; }
    setLoading(voice.id);
    setPreviewErrors(prev => ({ ...prev, [voice.id]: null }));
    try {
      const text = previewText?.slice(0, 150) || 'Hello, this is a preview of how this voice sounds.';
      const url = await generateCartesiaSpeech(text, voice.id, 1.0);
      setPreviewUrls(prev => ({ ...prev, [voice.id]: url }));
      playUrl(url, voice.id);
    } catch (err) {
      setPreviewErrors(prev => ({ ...prev, [voice.id]: err.message || 'Preview failed' }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      {/* Search + accent + filter row */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input
          style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '13px',
            padding: '6px 12px',
            outline: 'none',
            width: '150px',
            flexShrink: 0,
            fontFamily: 'inherit',
          }}
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          value={accentFilter}
          onChange={e => setAccentFilter(e.target.value)}
          style={{
            background: accentFilter !== 'Any Accent' ? '#1e1010' : '#1a1a1a',
            border: `1px solid ${accentFilter !== 'Any Accent' ? '#e03535' : '#333'}`,
            borderRadius: '8px',
            color: accentFilter !== 'Any Accent' ? '#e03535' : '#aaa',
            fontSize: '12px',
            padding: '5px 10px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            flexShrink: 0,
            outline: 'none',
          }}
        >
          {ACCENT_OPTIONS.map(a => (
            <option key={a} value={a} style={{ background: '#1a1a1a', color: '#fff' }}>{a}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {FILTER_TAGS.map(tag => {
            const active = tag === 'All' ? activeFilters.length === 0 : activeFilters.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleFilter(tag)}
                style={{
                  background: active ? '#e03535' : '#1a1a1a',
                  border: `1px solid ${active ? '#e03535' : '#444'}`,
                  borderRadius: '20px',
                  color: active ? '#fff' : '#aaa',
                  fontSize: '11px',
                  padding: '3px 10px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Voice grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        maxHeight: '400px',
        overflowY: 'auto',
        paddingRight: '4px',
      }}>
        {visible.map(v => {
          const isSelected = selected?.includes(v.id);
          const isPlaying  = playing === v.id;
          const isLoading  = loading === v.id;
          const isHovered  = hovering === v.id;
          const { name, descriptor } = parseName(v.name);

          return (
            <div
              key={v.id}
              onClick={() => onSelect(v)}
              onMouseEnter={() => setHovering(v.id)}
              onMouseLeave={() => setHovering(null)}
              style={{
                background: isSelected ? 'rgba(224,53,53,0.07)' : '#181818',
                border: `1px solid ${isSelected ? '#e03535' : isHovered ? '#444' : '#222'}`,
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {/* Name + descriptor */}
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isSelected && <span style={{ color: '#e03535', marginRight: '5px' }}>✓</span>}
                {name}
              </div>
              {descriptor && (
                <div style={{ fontSize: '12px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {descriptor}
                </div>
              )}
              {v.description && (
                <div style={{
                  fontSize: '11px',
                  color: '#666',
                  lineHeight: '1.45',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {v.description}
                </div>
              )}

              {/* Action row */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                {/* Preview pill */}
                <button
                  onClick={e => handlePreview(e, v)}
                  disabled={isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'transparent',
                    border: '1px solid #444',
                    borderRadius: '20px',
                    color: isPlaying ? '#e03535' : '#aaa',
                    fontSize: '11px',
                    padding: '3px 10px',
                    cursor: isLoading ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'color 0.12s, border-color 0.12s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isPlaying && (
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: '#e03535',
                      display: 'inline-block',
                      animation: 'vb-pulse 0.8s ease-in-out infinite',
                      flexShrink: 0,
                    }} />
                  )}
                  {isLoading ? '…' : isPlaying ? '■ Stop' : previewUrls[v.id] ? '▶ Replay' : '▶ Preview'}
                </button>

                {/* Select — visible on hover or when selected */}
                {(isHovered || isSelected) && (
                  <button
                    onClick={e => { e.stopPropagation(); onSelect(v); }}
                    style={{
                      background: isSelected ? 'transparent' : '#e03535',
                      border: `1px solid ${isSelected ? '#e03535' : '#e03535'}`,
                      borderRadius: '20px',
                      color: isSelected ? '#e03535' : '#fff',
                      fontSize: '11px',
                      padding: '3px 10px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.12s',
                    }}
                  >
                    {isSelected ? '✓ Selected' : 'Select'}
                  </button>
                )}
              </div>

              {previewErrors[v.id] && (
                <div style={{ fontSize: '9px', color: '#e03535', marginTop: '2px', wordBreak: 'break-word' }}>
                  {previewErrors[v.id]}
                </div>
              )}
            </div>
          );
        })}

        {visible.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#555', fontSize: '12px', padding: '32px 0' }}>
            No voices match your filters.
          </div>
        )}
      </div>

      {/* Pulse keyframe — injected once */}
      <style>{`@keyframes vb-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}

function Stage2({ data, onApprove, saved, isComplete, onBackToSummary }) {
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voicesError, setVoicesError] = useState(null);
  const [showBrowser, setShowBrowser] = useState(null); // voice id or null

  const [voices, setVoices] = useState(saved?.voices || [
    { id: "v1", name: "Narrator", voiceId: "", speed: 1.0, color: VOICE_PALETTE[0] },
  ]);
  const [rosterReady, setRosterReady] = useState(saved?.rosterReady || false);
  const [segments, setSegments] = useState(saved?.segments || null);
  const [detecting, setDetecting] = useState(false);
  const [audioUrls, setAudioUrls] = useState(() => {
    const persisted = data.persistedAssets?.audio || {};
    return Object.keys(persisted).length > 0 ? persisted : {};
  });
  const [generating, setGenerating] = useState({});
  const [errors, setErrors] = useState({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [activeSegment, setActiveSegment] = useState(0);
  const [generateProgress, setGenerateProgress] = useState({ current: 0, total: 0 });
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    getCartesiaVoices()
      .then(setAvailableVoices)
      .catch(e => setVoicesError(e.message))
      .finally(() => setVoicesLoading(false));
  }, []);

  const addVoice = () => {
    if (voices.length >= 6) return;
    const id = `v${Date.now()}`;
    setVoices(prev => [...prev, { id, name: `Voice ${prev.length + 1}`, voiceId: "", speed: 1.0, color: VOICE_PALETTE[prev.length % VOICE_PALETTE.length] }]);
  };
  const removeVoice = (id) => setVoices(prev => prev.filter(v => v.id !== id));
  const updateVoice = (id, field, value) => setVoices(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));

  const assignVoiceFromBrowser = (voiceRow, cartesiaVoice) => {
    updateVoice(voiceRow.id, 'voiceId', cartesiaVoice.id);
    updateVoice(voiceRow.id, 'name', voiceRow.name === 'Narrator' || voiceRow.name.startsWith('Voice ') ? cartesiaVoice.name : voiceRow.name);
    setShowBrowser(null);
  };

  const detectSegments = async () => {
    setDetecting(true);
    const voiceNames = voices.map(v => v.name).join(", ");
    const raw = await claude(`You are a script analyst for a narrative history channel.
Split this script into segments, assigning each paragraph to one of these voices: ${voiceNames}
Assign diary entries, letters, or quoted primary sources to secondary voices if available.
Script:
${data.script}
Return ONLY valid JSON:
{"segments":[{"text":"exact paragraph text","voice":"${voices[0].name}"}]}`, 4000, 'haiku');
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

  const generateSegment = async (seg, force = false) => {
    const voice = voices.find(v => v.id === seg.voiceId);
    if (!voice?.voiceId) { setErrors(prev => ({ ...prev, [seg.id]: `No voice selected for "${voice?.name}"` })); return; }
    // Audio caching: require explicit force flag to re-generate
    if (audioUrls[seg.id] && !force) return;
    setGenerating(prev => ({ ...prev, [seg.id]: true }));
    setErrors(prev => ({ ...prev, [seg.id]: null }));
    try {
      const url = await generateCartesiaSpeech(injectV3Tags(seg.text), voice.voiceId, voice.speed || 1.0);
      setAudioUrls(prev => ({ ...prev, [seg.id]: url }));
      if (data.currentEpisodeId) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const segIndex = parseInt(seg.id.replace("seg-", ""), 10);
          const fileName = `${data.episode ? `ep${data.episode}_` : ""}seg${String(segIndex + 1).padStart(2, "0")}_${voice.name}.mp3`;
          await uploadAsset({ episodeId: data.currentEpisodeId, stage: 2, type: "audio", segmentIndex: segIndex, fileBlob: blob, fileName, mimeType: "audio/mpeg" });
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
      await generateSegment(toGenerate[i], false);
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
        const filename = `${data.episode ? `ep${data.episode}_` : "episode_"}seg${String(i + 1).padStart(2, "00")}_${voice?.name || "voice"}.mp3`;
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

  const downloadFullNarration = async () => {
    if (!segments || !allGenerated) return;
    try {
      const GAP_SECONDS = 0.5;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) { alert("Web Audio API not supported in this browser."); return; }
      const ctx = new AudioCtx();

      // Fetch and decode all segments in order
      const buffers = [];
      for (const seg of segments) {
        const url = audioUrls[seg.id];
        if (!url) continue;
        const res = await fetch(url);
        const arrayBuf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        buffers.push(decoded);
      }
      if (!buffers.length) return;

      const sampleRate = buffers[0].sampleRate;
      const channels = buffers[0].numberOfChannels;
      const gapSamples = Math.floor(GAP_SECONDS * sampleRate);
      const totalSamples = buffers.reduce((acc, b) => acc + b.length, 0) + gapSamples * (buffers.length - 1);

      const combined = ctx.createBuffer(channels, totalSamples, sampleRate);
      let offset = 0;
      for (let bi = 0; bi < buffers.length; bi++) {
        const buf = buffers[bi];
        for (let ch = 0; ch < channels; ch++) {
          combined.getChannelData(ch).set(buf.getChannelData(ch), offset);
        }
        offset += buf.length;
        if (bi < buffers.length - 1) offset += gapSamples;
      }

      // Encode as WAV
      const numSamples = combined.length * channels;
      const wavBuf = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(wavBuf);
      const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, channels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * channels * 2, true);
      view.setUint16(32, channels * 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, numSamples * 2, true);
      let sampleOffset = 44;
      for (let i = 0; i < combined.length; i++) {
        for (let ch = 0; ch < channels; ch++) {
          const s = Math.max(-1, Math.min(1, combined.getChannelData(ch)[i]));
          view.setInt16(sampleOffset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
          sampleOffset += 2;
        }
      }

      const blob = new Blob([wavBuf], { type: 'audio/wav' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${data.episode ? `ep${data.episode}_` : 'episode_'}narration_full.wav`;
      a.click();
      ctx.close();
    } catch (e) {
      alert("Could not combine audio: " + e.message);
    }
  };

  const allGenerated = segments && segments.every(s => !!audioUrls[s.id]);
  const anyGenerated = segments && segments.some(s => !!audioUrls[s.id]);
  const selectedVoiceIds = voices.map(v => v.voiceId).filter(Boolean);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0" }}>
        <div>
          <div style={S.sectionTitle}>Narration</div>
          <div style={S.sectionSubtitle}>Pick voices from the browser, set speed, and generate audio for each segment.</div>
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
          <div style={{ fontSize: "13px", fontWeight: "600", color: COLORS.text }}>Your Cast</div>
          {voices.length < 6 && (
            <button style={{ ...S.btnSecondary(false), fontSize: "11px", padding: "6px 12px" }} onClick={addVoice}>+ Add Voice</button>
          )}
        </div>

        {voicesError && (
          <div style={{ padding: "10px 14px", background: "#2a1515", border: "1px solid #3a1515", borderRadius: "8px", color: "#e03535", fontSize: "12px", marginBottom: "12px" }}>
            Could not load voices: {voicesError}
          </div>
        )}

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
                <button
                  onClick={() => setShowBrowser(showBrowser === v.id ? null : v.id)}
                  style={{ ...S.btnSecondary(showBrowser === v.id), fontSize: "11px", padding: "7px 12px", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {v.voiceId ? (
                    <span>✓ {availableVoices.find(av => av.id === v.voiceId)?.name || 'Voice selected'}</span>
                  ) : (
                    voicesLoading ? 'Loading…' : 'Browse Voices'
                  )}
                </button>
                {voices.length > 1 && (
                  <button onClick={() => removeVoice(v.id)} style={{ background: "none", border: "none", color: COLORS.textTertiary, cursor: "pointer", fontSize: "18px", padding: "0 4px", lineHeight: "1" }}>×</button>
                )}
              </div>

              {/* Speed slider */}
              <div style={{ padding: "0 14px 12px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={S.label}>Speed</span>
                  <span style={{ fontSize: "11px", color: COLORS.textSecondary }}>{(v.speed || 1.0).toFixed(1)}×</span>
                </div>
                <input
                  type="range" min="0.5" max="2.0" step="0.1"
                  value={v.speed || 1.0}
                  onChange={e => updateVoice(v.id, "speed", parseFloat(e.target.value))}
                  style={S.slider}
                />
              </div>

              {/* Voice browser panel */}
              {showBrowser === v.id && (
                <div style={{ padding: "14px 16px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
                  {voicesLoading ? (
                    <div style={{ textAlign: "center", color: COLORS.textTertiary, fontSize: "12px", padding: "20px 0" }}>Loading voices…</div>
                  ) : (
                    <VoiceBrowser
                      voices={availableVoices}
                      onSelect={cartesiaVoice => assignVoiceFromBrowser(v, cartesiaVoice)}
                      selected={selectedVoiceIds}
                      previewText={data.script}
                    />
                  )}
                  {/* TODO: Pro plan — voice cloning upload will appear here */}
                </div>
              )}
            </div>
          ))}
        </div>

        {!rosterReady && (
          <button
            style={{ ...S.btnPrimary(voices.some(v => !v.voiceId)), marginTop: "16px" }}
            onClick={() => setRosterReady(true)}
            disabled={voices.some(v => !v.voiceId)}
          >
            Confirm Cast &amp; Continue →
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
          <div style={{ fontSize: "13px", fontWeight: "600", color: COLORS.text, marginBottom: "14px" }}>Generate Audio</div>

          {segments[activeSegment] && (() => {
            const seg = segments[activeSegment];
            const voice = voices.find(v => v.id === seg.voiceId) || voices[0];
            const hasAudio = !!audioUrls[seg.id];
            return (
              <div style={{ ...S.cardElevated, marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: voice.color, fontWeight: "600", marginBottom: "10px" }}>
                  Segment {activeSegment + 1} of {segments.length} — {voice.name}
                  <span style={{ color: COLORS.textTertiary, fontWeight: "400", marginLeft: "8px" }}>{voice.speed?.toFixed(1) || '1.0'}× speed</span>
                </div>
                <div style={{ fontSize: "12px", color: COLORS.textSecondary, lineHeight: "1.8", maxHeight: "120px", overflowY: "auto", fontFamily: "monospace", marginBottom: "14px" }}>
                  {renderTagged(injectV3Tags(seg.text))}
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    style={{ ...S.btnPrimary(generating[seg.id]), flex: 1, minWidth: "140px" }}
                    onClick={() => {
                      if (hasAudio && !window.confirm('Regenerate this segment? The existing audio will be replaced.')) return;
                      generateSegment(seg, true);
                    }}
                    disabled={generating[seg.id]}
                  >
                    {generating[seg.id] ? "Generating…" : hasAudio ? "Regenerate" : "Generate"}
                  </button>
                  {hasAudio && (
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
                if (remaining > 0 && !window.confirm(`Generate ${remaining} remaining segment${remaining > 1 ? "s" : ""}? This may take a moment.`)) return;
                generateAll();
              }}
              disabled={generatingAll || allGenerated}
            >
              {generatingAll
                ? `Generating ${generateProgress.current} of ${generateProgress.total}…`
                : allGenerated
                ? "✓ All Generated"
                : `Generate Remaining (${segments.filter(s => !audioUrls[s.id]).length})`}
            </button>
          </div>

          {anyGenerated && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                style={{
                  ...S.btnApprove,
                  flex: 1,
                  justifyContent: "center",
                  ...(!allGenerated || generatingAll ? {
                    opacity: 0.4,
                    cursor: 'not-allowed',
                    filter: 'grayscale(0.4)',
                  } : {}),
                }}
                disabled={!allGenerated || generatingAll}
                onClick={() => onApprove({ segments, voices, audioUrls })}
              >
                {generatingAll || !allGenerated
                  ? `Generate all segments first (${segments.filter(s => !audioUrls[s.id]).length} remaining)`
                  : 'Approve & Continue →'}
              </button>
              {allGenerated && (
                <>
                  <button style={S.btnSecondary(false)} onClick={downloadFullNarration} title="Concatenated WAV with 0.5s gaps between segments">
                    ↓ WAV
                  </button>
                  <button style={S.btnSecondary(false)} onClick={downloadAllZip} disabled={zipping}>
                    {zipping ? "Zipping…" : "↓ ZIP"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Stage2;
