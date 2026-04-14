import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannelProfile } from "../hooks/useChannelProfile";
import { getEpisodes, createEpisode, updateEpisode, deleteEpisode, getAssets, getBilling, claude, claudeStream } from "../lib/api";
import { extractJSON } from "../lib/parseJSON";
import { invalidateBillingCache } from "../components/ui/ProtectedRoute";
import { analyzeScript } from "../lib/analysis";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import ConfirmModal from "../components/ui/ConfirmModal";
import { S, COLORS, ACCENT } from "../styles/theme";
import Stage0Research from "../components/stages/Stage0Research";
import Stage1Script from "../components/stages/Stage1Script";
import Stage2Voiceover from "../components/stages/Stage2Voiceover";
import Stage3Sound from "../components/stages/Stage3Sound";
import Stage4Images from "../components/stages/Stage4Images";
import Stage5Assembly from "../components/stages/Stage5Assembly";
import Stage6Thumbnail from "../components/stages/Stage6Thumbnail";
import Stage7Metadata from "../components/stages/Stage7Metadata";
import EpisodeLibrary from "../components/ui/EpisodeLibrary";
import AppLayout from "../components/ui/AppLayout";
import StageBar from "../components/ui/StageBar";
import { Link } from "react-router-dom";

const STAGES = [
  { id: 0, label: "Research" },
  { id: 1, label: "Story" },
  { id: 2, label: "Narration" },
  { id: 3, label: "Sound" },
  { id: 4, label: "Visuals" },
  { id: 5, label: "Assembly" },
  { id: 6, label: "Thumbnail" },
  { id: 7, label: "Metadata" },
];

export default function Pipeline() {
  const { user } = useAuth();
  const { channelProfile } = useChannelProfile();
  const [searchParams] = useSearchParams();
  const [activeStage, setActiveStage] = useState(0);
  const [completedStages, setCompletedStages] = useState(new Set());
  const [stageData, setStageData] = useState({});
  const [currentEpisodeId, setCurrentEpisodeId] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [persistedAssets, setPersistedAssets] = useState({ audio: {}, images: {} });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [episodeLimitError, setEpisodeLimitError] = useState(false);
  const [billing, setBilling] = useState(null);

  // One-shot state
  const [stageHistory, setStageHistory] = useState({});
  const [stageVersionKeys, setStageVersionKeys] = useState({});

  // One-shot state
  // 3.1 — localStorage backup for pipeline state (survives refresh before first DB save)
  const BACKUP_KEY = 'forge_pipeline_backup';
  const [backupPrompt, setBackupPrompt] = useState(null); // { stageData, activeStage, completedStages, timestamp }

  // Credit confirmation — shown before first stage runs on a fresh episode
  const [creditConfirmed, setCreditConfirmed] = useState(false);

  // 3.2 — Confirm modals
  const [newEpisodeConfirm, setNewEpisodeConfirm] = useState(false);

  const [showOneShot, setShowOneShot] = useState(false);
  const [oneShotTopic, setOneShotTopic] = useState('');
  const [oneShotCtx, setOneShotCtx] = useState('');
  const [oneShotRunning, setOneShotRunning] = useState(false);
  const [oneShotSteps, setOneShotSteps] = useState({});
  const [oneShotScript, setOneShotScript] = useState('');
  const [oneShotDone, setOneShotDone] = useState(false);

  const isComplete = completedStages.size >= 8;

  const mergedData = {
    ...Object.values(stageData).reduce((acc, d) => ({ ...acc, ...d }), {}),
    currentEpisodeId,
    persistedAssets,
    channelProfile,
  };

  useEffect(() => {
    const topicFromUrl = searchParams.get('topic');
    if (topicFromUrl) {
      setStageData(prev => ({ ...prev, 0: { ...prev[0], topicPrefill: topicFromUrl } }));
    }
    // 3.1 — Check for localStorage backup (unsaved work from before first DB save)
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      if (raw) {
        const backup = JSON.parse(raw);
        const ageMs = Date.now() - (backup.timestamp || 0);
        const is24h = ageMs < 24 * 60 * 60 * 1000;
        if (is24h && backup.stageData && Object.keys(backup.stageData).length > 0) {
          setBackupPrompt(backup);
        } else {
          localStorage.removeItem(BACKUP_KEY);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    loadEpisodes();
    getBilling().then(setBilling).catch(() => {});
  }, [user]);

  // 3.1 — Save to localStorage backup whenever stageData changes (before first DB save)
  useEffect(() => {
    if (currentEpisodeId) return; // Already saved to DB — no backup needed
    if (Object.keys(stageData).length === 0) return;
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify({
        stageData,
        activeStage,
        completedStages: [...completedStages],
        timestamp: Date.now(),
      }));
    } catch {}
  }, [stageData, activeStage, completedStages, currentEpisodeId]);

  useEffect(() => {
    if (!currentEpisodeId) return;
    loadPersistedAssets();
  }, [currentEpisodeId]);

  const loadPersistedAssets = async () => {
    try {
      const assets = await getAssets(currentEpisodeId);
      const audio = {};
      const images = {};
      assets.forEach(asset => {
        if (asset.type === 'audio' && asset.segment_index !== null) {
          audio[`seg-${asset.segment_index}`] = asset.url;
        }
        if (asset.type === 'image' && asset.segment_index !== null) {
          images[asset.segment_index] = asset.url;
        }
      });
      setPersistedAssets({ audio, images });
    } catch (e) {
      console.warn('Failed to load assets:', e);
    }
  };

  const loadEpisodes = async () => {
    try {
      setLoadingEpisodes(true);
      const data = await getEpisodes();
      setEpisodes(data);
    } catch (e) {
      console.error('Failed to load episodes:', e);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const handleApprove = async (stage, data) => {
    // Capture previous version before overwriting
    const prevData = stageData[stage];
    const newHistory = prevData
      ? [{ data: prevData, savedAt: new Date().toISOString() }, ...(stageHistory[stage] || [])].slice(0, 2)
      : (stageHistory[stage] || []);
    const newStageHistory = { ...stageHistory, [stage]: newHistory };

    const newStageData = { ...stageData, [stage]: data };
    const newCompleted = new Set([...completedStages, stage]);
    const newActive = stage + 1;
    const merged = Object.values(newStageData).reduce((acc, d) => ({ ...acc, ...d }), {});

    setStageData(newStageData);
    setStageHistory(newStageHistory);
    setCompletedStages(newCompleted);
    setActiveStage(newActive);

    try {
      if (currentEpisodeId) {
        const allDone = newCompleted.size >= 8;
        await updateEpisode(currentEpisodeId, {
          active_stage: newActive,
          completed_stages: [...newCompleted],
          stage_data: { ...newStageData, _history: newStageHistory },
          title: merged.topic || null,
          episode_number: merged.episode || null,
          ...(allDone ? { status: 'complete' } : {}),
        });
      } else {
        try {
          const episode = await createEpisode({
            active_stage: newActive,
            completed_stages: [...newCompleted],
            stage_data: { ...newStageData, _history: newStageHistory },
            title: merged.topic || null,
            episode_number: merged.episode || null,
            status: 'draft',
          });
          setCurrentEpisodeId(episode.id);
          invalidateBillingCache();
          localStorage.removeItem(BACKUP_KEY); // 3.1 — clear backup once saved to DB
        } catch (e) {
          if (e.message?.includes('Episode limit') || e.message?.includes('free episode')) {
            setEpisodeLimitError(true);
          }
          throw e;
        }
      }
      await loadEpisodes();
    } catch (e) {
      console.error('Failed to save episode:', e);
    }
  };

  const handleReset = () => {
    setActiveStage(0);
    setCompletedStages(new Set());
    setStageData({});
    setStageHistory({});
    setStageVersionKeys({});
    setCurrentEpisodeId(null);
    setPersistedAssets({ audio: {}, images: {} });
    setShowResetConfirm(false);
    setCreditConfirmed(false);
    localStorage.removeItem(BACKUP_KEY); // 3.1 — clear backup on reset
  };

  const handleLoadEpisode = (ep) => {
    const { _history, ...stagesOnly } = ep.stage_data || {};
    setStageData(stagesOnly);
    setStageHistory(_history || {});
    setStageVersionKeys({});
    setCompletedStages(new Set(ep.completed_stages || []));
    setActiveStage(ep.active_stage || 0);
    setCurrentEpisodeId(ep.id);
    setCreditConfirmed(true); // Loading an existing episode — no credit confirm needed
  };

  const handleDeleteEpisode = async (id) => {
    await deleteEpisode(id);
    await loadEpisodes();
  };

  const handleRestoreVersion = async (stage, versionIdx) => {
    const versionItem = stageHistory[stage]?.[versionIdx];
    if (!versionItem) return;

    const currentData = stageData[stage];
    const remainingHistory = (stageHistory[stage] || []).filter((_, i) => i !== versionIdx);
    const newHistory = currentData
      ? [{ data: currentData, savedAt: new Date().toISOString() }, ...remainingHistory].slice(0, 2)
      : remainingHistory.slice(0, 2);

    const newStageHistory = { ...stageHistory, [stage]: newHistory };
    const newStageData = { ...stageData, [stage]: versionItem.data };

    setStageData(newStageData);
    setStageHistory(newStageHistory);
    setStageVersionKeys(prev => ({ ...prev, [stage]: (prev[stage] || 0) + 1 }));

    if (currentEpisodeId) {
      try {
        await updateEpisode(currentEpisodeId, {
          stage_data: { ...newStageData, _history: newStageHistory },
        });
      } catch (e) {
        console.error('Failed to save after restore:', e);
      }
    }
  };

  const ONESHOT_STEPS = {
    research: 'Researching your topic',
    script: 'Writing your script',
    hook: 'Scoring the hook',
    titles: 'Generating titles',
    voices: 'Building voice cast',
    images: 'Creating image prompts',
  };

  const setOsStep = (key, status) => setOneShotSteps(prev => ({ ...prev, [key]: status }));

  const handleOneShotOpen = () => {
    setShowOneShot(true);
    setOneShotDone(false);
    setOneShotTopic('');
    setOneShotCtx('');
    setOneShotSteps({});
    setOneShotScript('');
  };

  const runOneShot = async () => {
    if (!oneShotTopic.trim() || oneShotRunning) return;
    setOneShotRunning(true);
    setCreditConfirmed(true); // One Shot creates an episode — mark as confirmed
    setOneShotScript('');
    setOneShotSteps({});

    const profile = channelProfile;
    try {
      // Research
      setOsStep('research', 'loading');
      const researchRaw = await claude(`You are a researcher for ${profile?.channel_name || 'a YouTube channel'} focused on: ${profile?.description || ''}.
Research this topic thoroughly and return a structured brief.
Topic: ${oneShotTopic}
${oneShotCtx ? `Additional context: ${oneShotCtx}` : ''}
Return ONLY valid JSON:
{"coreConcept":"string","context":"string","mainSubject":{"name":"string","role":"string","angle":"string"},"keyFacts":[{"fact":"string","why":"string"}],"authenticDetails":["string"],"avoidCliches":["string"]}`, 2000);
      let research = null;
      research = extractJSON(researchRaw);
      setOsStep('research', 'done');

      const researchText = research ? `TOPIC: ${oneShotTopic}\nCORE CONCEPT: ${research.coreConcept || ''}\nCONTEXT: ${research.context || ''}\nKEY FACTS:\n${(research.keyFacts || []).map(f => `• ${f.fact} — ${f.why}`).join('\n')}` : '';

      // Script
      setOsStep('script', 'loading');
      const targetWords = profile?.prompt_config?.targetWordCount || 2000;
      const scriptInstruction = profile?.prompt_config?.scriptPrompt || 'Write an engaging narration script.';
      const scriptPrompt = `You are the writer for ${profile?.channel_name || 'a YouTube channel'}.
${scriptInstruction}
Write a full narration script of approximately ${targetWords} words.
Topic: ${oneShotTopic}
${oneShotCtx ? `Additional context: ${oneShotCtx}` : ''}
${researchText ? `Research brief:\n${researchText}` : ''}
CRITICAL — Opening hook: Start mid-action, use concrete details, establish stakes immediately.
Return ONLY the script. No headers, no stage directions, pure narration prose.`;

      let fullScript = '';
      await claudeStream(scriptPrompt, (chunk) => {
        fullScript += chunk;
        setOneShotScript(fullScript);
      }, 4000);
      setOsStep('script', 'done');

      const analysis = analyzeScript(fullScript);

      // Parallel: hook + titles + voices + images
      setOsStep('hook', 'loading');
      setOsStep('titles', 'loading');
      setOsStep('voices', 'loading');
      setOsStep('images', 'loading');

      await Promise.all([
        claude(`Score this hook briefly. Hook: "${(fullScript.split(/\n\n/)[0] || '').substring(0, 300)}" Return JSON: {"overall":7}`, 100)
          .then(() => setOsStep('hook', 'done')).catch(() => setOsStep('hook', 'done')),
        claude(`Generate 3 YouTube titles. Topic: ${oneShotTopic}. Script: "${fullScript.substring(0, 300)}". Return JSON: {"titles":[{"title":"string","angle":"string"}]}`, 400)
          .then(() => setOsStep('titles', 'done')).catch(() => setOsStep('titles', 'done')),
        claude(`Identify 1-3 voices in this script. Script: "${fullScript.substring(0, 1500)}". Return JSON: {"characters":[{"name":"string","role":"string","voiceStyle":"string","sampleLine":"string"}]}`, 400)
          .then(() => setOsStep('voices', 'done')).catch(() => setOsStep('voices', 'done')),
        claude(`Generate 4 Midjourney prompts for key scenes. Topic: ${oneShotTopic}. Script: "${fullScript.substring(0, 1500)}". Return JSON: {"prompts":[{"scene":"string","prompt":"string"}]}`, 600)
          .then(() => setOsStep('images', 'done')).catch(() => setOsStep('images', 'done')),
      ]);

      // Load into pipeline
      const newStageData = {
        0: { topic: oneShotTopic, context: oneShotCtx, research, researchText },
        1: { topic: oneShotTopic, ctx: oneShotCtx, script: fullScript, analysis },
      };
      setStageData(newStageData);
      setCompletedStages(new Set([0, 1]));
      setActiveStage(2);
      setOneShotDone(true);

      // Create episode
      try {
        const ep = await createEpisode({
          active_stage: 2,
          completed_stages: [0, 1],
          stage_data: newStageData,
          title: oneShotTopic,
          status: 'draft',
        });
        setCurrentEpisodeId(ep.id);
        await loadEpisodes();
      } catch (e) {
        if (e.message?.includes('Episode limit') || e.message?.includes('free episode')) setEpisodeLimitError(true);
      }
    } catch (e) {
      console.error('One-shot error:', e);
    } finally {
      setOneShotRunning(false);
    }
  };

  return (
    <AppLayout>
      {/* 3.2 — Confirm modals */}
      <ConfirmModal
        isOpen={newEpisodeConfirm}
        onClose={() => setNewEpisodeConfirm(false)}
        onConfirm={() => { setShowResetConfirm(false); handleReset(); }}
        title="Start a new episode?"
        description="Make sure your current work is saved before starting fresh. Any unsaved stage data will be lost."
        confirmText="Start new"
        variant="warning"
      />

      {/* 3.1 — Restore backup prompt */}
      {backupPrompt && !currentEpisodeId && (
        <div style={{ background: '#0a1a2a', borderBottom: '1px solid #0d3350', padding: '10px 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '12px', color: '#7dd3fc', flex: 1 }}>
            You have unsaved work from {new Date(backupPrompt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Restore it?
          </span>
          <button
            onClick={() => {
              setStageData(backupPrompt.stageData);
              setCompletedStages(new Set(backupPrompt.completedStages || []));
              setActiveStage(backupPrompt.activeStage || 0);
              setCreditConfirmed(true);
              setBackupPrompt(null);
            }}
            style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Restore →
          </button>
          <button
            onClick={() => { localStorage.removeItem(BACKUP_KEY); setBackupPrompt(null); }}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px', padding: '4px', fontFamily: 'inherit' }}
          >
            ×
          </button>
        </div>
      )}

      {showLibrary && (
        <EpisodeLibrary
          episodes={episodes}
          onLoad={(ep) => { handleLoadEpisode(ep); setShowLibrary(false); }}
          onClose={() => setShowLibrary(false)}
          onDelete={handleDeleteEpisode}
        />
      )}

      {/* Pipeline action bar */}
      <div style={{
        background: '#1a1a1a',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        height: '52px',
        gap: '16px',
      }}>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowLibrary(true)}
          style={{ background: 'none', border: '1px solid #333', color: '#888', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Library
        </button>
        {(() => {
          const totalRemaining = billing?.total_remaining ?? null;
          const noEpisodes = totalRemaining !== null && totalRemaining === 0;
          const oneLast = totalRemaining === 1;
          return (
            <>
              {noEpisodes ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#e03535' }}>No episodes remaining —</span>
                  <Link to="/pricing" style={{ fontSize: '11px', color: ACCENT, fontWeight: '700', textDecoration: 'none' }}>Buy more or upgrade</Link>
                </div>
              ) : oneLast ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(217,119,6,0.15)', color: '#d97706', padding: '4px 10px', borderRadius: '6px', fontWeight: '600' }}>1 episode remaining</span>
                  {!showResetConfirm && (
                    <button
                      onClick={() => Object.keys(stageData).length > 0 ? setNewEpisodeConfirm(true) : setShowResetConfirm(true)}
                      style={{ background: ACCENT, border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      + New Episode
                    </button>
                  )}
                </div>
              ) : (
                !showResetConfirm && (
                  <button
                    onClick={() => Object.keys(stageData).length > 0 ? setNewEpisodeConfirm(true) : setShowResetConfirm(true)}
                    style={{ background: ACCENT, border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + New Episode
                  </button>
                )
              )}
            </>
          );
        })()}
        {showResetConfirm && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#555' }}>Clear all progress?</span>
            <button
              onClick={handleReset}
              style={{ background: 'none', border: '1px solid #e03535', color: '#e03535', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Yes
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              style={{ background: 'none', border: '1px solid #333', color: '#888', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Episode limit banner */}
      {episodeLimitError && (
        <div style={{ background: '#2a1515', borderBottom: '1px solid #3a1515', padding: '12px 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: '#e03535', flex: 1 }}>
            You've used all your episodes for this month. Buy more or upgrade your plan to continue.
          </span>
          <Link to="/pricing" style={{ background: ACCENT, color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Buy episodes →
          </Link>
          <button onClick={() => setEpisodeLimitError(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px', padding: '0', fontFamily: 'inherit' }}>×</button>
        </div>
      )}

      {/* One-shot modal */}
      {showOneShot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 32px', overflowY: 'auto' }}>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '14px', width: '100%', maxWidth: '860px' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚡ One Shot Mode
                </div>
                <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>Enter a topic — Forge generates everything automatically</div>
              </div>
              <button
                onClick={() => {
                  if (oneShotRunning) return;
                  setShowOneShot(false);
                  setOneShotDone(false);
                  setOneShotSteps({});
                  setOneShotScript('');
                }}
                style={{ background: 'none', border: 'none', color: oneShotRunning ? '#333' : '#555', cursor: oneShotRunning ? 'not-allowed' : 'pointer', fontSize: '18px', padding: '4px', fontFamily: 'inherit' }}
                title={oneShotRunning ? 'Generation in progress…' : 'Close'}
              >×</button>
            </div>

            <div style={{ padding: '24px' }}>
              {!oneShotRunning && !oneShotDone ? (
                /* Input form */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Topic</label>
                    <input
                      autoFocus
                      style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder="e.g. The fall of Constantinople, 1453"
                      value={oneShotTopic}
                      onChange={e => setOneShotTopic(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && runOneShot()}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                      Additional Context <span style={{ textTransform: 'none', fontWeight: '400', color: '#333' }}>(optional)</span>
                    </label>
                    <input
                      style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder="e.g. Focus on the last Byzantine emperor, avoid battle recaps"
                      value={oneShotCtx}
                      onChange={e => setOneShotCtx(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={runOneShot}
                    disabled={!oneShotTopic.trim()}
                    style={{ background: oneShotTopic.trim() ? ACCENT : '#222', color: oneShotTopic.trim() ? '#fff' : '#444', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '14px', fontWeight: '700', cursor: oneShotTopic.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
                  >
                    Generate everything →
                  </button>
                </div>
              ) : oneShotDone ? (
                /* Done state */
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '24px', color: '#4ade80', marginBottom: '12px' }}>✓</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>Research &amp; script loaded</div>
                  <div style={{ fontSize: '13px', color: '#555', marginBottom: '24px' }}>"{oneShotTopic}" is ready. You're now on Stage 3 — Narration.</div>
                  <button onClick={() => setShowOneShot(false)} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 24px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Continue in pipeline →
                  </button>
                </div>
              ) : (
                /* Running state */
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px' }}>
                  {/* Steps */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{oneShotTopic}</div>
                    <div style={{ fontSize: '11px', color: '#444', marginBottom: '16px' }}>Building your package…</div>
                    {Object.entries(ONESHOT_STEPS).map(([key, label]) => {
                      const status = oneShotSteps[key];
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                          <div style={{ width: '16px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                            {status === 'done' && <span style={{ color: '#4ade80', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                            {status === 'loading' && <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #333', borderTopColor: '#888', animation: 'spin 0.7s linear infinite' }} />}
                            {!status && <span style={{ color: '#2a2a2a', fontSize: '11px' }}>○</span>}
                          </div>
                          <span style={{ fontSize: '12px', color: status === 'done' ? '#888' : status === 'loading' ? '#fff' : '#333', fontWeight: status === 'loading' ? '600' : '400' }}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Live script */}
                  <div>
                    <div style={{ fontSize: '11px', color: '#333', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Script</div>
                    <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.9', whiteSpace: 'pre-wrap', maxHeight: '340px', overflowY: 'auto', fontStyle: oneShotScript ? 'normal' : 'italic' }}>
                      {oneShotScript || (oneShotSteps.research === 'done' ? 'Writing script…' : 'Researching…')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <StageBar
        STAGES={STAGES}
        activeStage={activeStage}
        completedStages={completedStages}
        onStageClick={setActiveStage}
      />

      {/* Version history bar */}
      {stageHistory[activeStage]?.length > 0 && (
        <div style={{ background: '#161616', borderBottom: '1px solid #1e1e1e', padding: '0 32px', display: 'flex', alignItems: 'center', gap: '10px', height: '36px' }}>
          <span style={{ fontSize: '10px', color: '#444', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>History</span>
          <div style={{ width: '1px', height: '14px', background: '#252525', flexShrink: 0 }} />
          {/* Current version */}
          <div style={{ fontSize: '11px', color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '4px', padding: '2px 8px', fontWeight: '600', flexShrink: 0 }}>
            Current
          </div>
          {stageHistory[activeStage].map((item, idx) => {
            const d = new Date(item.savedAt);
            const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const label = `v${stageHistory[activeStage].length - idx}`;
            return (
              <button
                key={idx}
                onClick={() => handleRestoreVersion(activeStage, idx)}
                style={{ fontSize: '11px', color: '#555', background: 'none', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#888'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#555'; }}
                title={`Restore ${label} (saved ${timeStr})`}
              >
                {label} <span style={{ color: '#333' }}>·</span> {timeStr}
              </button>
            );
          })}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '10px', color: '#333' }}>Click a version to restore</span>
        </div>
      )}

      <div style={{ ...S.content, maxWidth: 'none', width: '100%' }}>
        {isComplete && activeStage >= 8 ? (
          /* Episode complete screen */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: COLORS.success, fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "16px" }}>Episode Complete</div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: COLORS.text, marginBottom: "6px" }}>{mergedData.topic || "Your episode"}</div>
            {mergedData.episode && <div style={{ fontSize: "14px", color: COLORS.textSecondary, marginBottom: "40px" }}>Episode {mergedData.episode}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "40px", width: "100%", maxWidth: "600px" }}>
              {[
                { label: "Script", value: mergedData.analysis?.wordCount ? `${mergedData.analysis.wordCount.toLocaleString()} words` : "Done", stage: 1 },
                { label: "Audio", value: mergedData.segments ? `${mergedData.segments.length} segments` : "Done", stage: 2 },
                { label: "Images", value: mergedData.prompts ? `${mergedData.prompts.length} images` : "Done", stage: 4 },
                { label: "Metadata", value: "Ready", stage: 7 },
              ].map(s => (
                <div
                  key={s.label}
                  onClick={() => setActiveStage(s.stage)}
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "20px 14px", textAlign: "center", cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}
                >
                  <div style={{ fontSize: "15px", fontWeight: "600", color: COLORS.text, marginBottom: "4px" }}>{s.value}</div>
                  <div style={{ fontSize: "11px", color: COLORS.textSecondary }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Conversion CTA for free users, or normal next-episode button for paid users */}
            {(() => {
              const isActive = billing?.subscription_status === 'active' || billing?.subscription_status === 'trialing';
              if (isActive) {
                return (
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button style={S.btnSecondary(false)} onClick={() => setActiveStage(5)}>Assembly</button>
                    <button style={{ ...S.btnPrimary(false), padding: "11px 24px" }} onClick={() => setShowResetConfirm(true)}>
                      + Start New Episode
                    </button>
                  </div>
                );
              }
              // Free user — show upgrade section
              const planOptions = [
                { id: 'creator', name: 'Creator', price: '$49', episodes: 5 },
                { id: 'studio', name: 'Studio', price: '$99', episodes: 11, popular: true },
                { id: 'pro', name: 'Pro', price: '$179', episodes: 30 },
              ];
              return (
                <div style={{ width: '100%', maxWidth: '600px', marginTop: '8px' }}>
                  <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', padding: '20px 24px', marginBottom: '28px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: COLORS.text, marginBottom: '6px' }}>Your first episode is complete.</div>
                    <div style={{ fontSize: '14px', color: COLORS.textSecondary }}>Want to make your next one?</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                    {planOptions.map(plan => (
                      <div key={plan.id} style={{ background: COLORS.surface, border: `1px solid ${plan.popular ? ACCENT : COLORS.border}`, borderRadius: '10px', padding: '20px 16px', textAlign: 'center', position: 'relative' }}>
                        {plan.popular && (
                          <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: ACCENT, color: '#fff', fontSize: '9px', fontWeight: '700', padding: '2px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>POPULAR</div>
                        )}
                        <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text, marginBottom: '4px' }}>{plan.name}</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: plan.popular ? ACCENT : COLORS.text, marginBottom: '4px' }}>{plan.price}<span style={{ fontSize: '12px', color: COLORS.textSecondary, fontWeight: '400' }}>/mo</span></div>
                        <div style={{ fontSize: '11px', color: COLORS.textSecondary, marginBottom: '14px' }}>{plan.episodes} episodes/month</div>
                        <button
                          onClick={async () => {
                            const { createCheckoutSession } = await import('../lib/api');
                            try { const { url } = await createCheckoutSession(plan.id); window.location.href = url; } catch {}
                          }}
                          style={{ background: plan.popular ? ACCENT : '#222', color: '#fff', border: 'none', borderRadius: '7px', padding: '9px 0', width: '100%', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Subscribe now →
                        </button>
                      </div>
                    ))}
                  </div>
                  <button style={S.btnSecondary(false)} onClick={() => setActiveStage(5)}>Review assembly</button>
                </div>
              );
            })()}
          </div>
        ) : !creditConfirmed && !currentEpisodeId && Object.keys(stageData).length === 0 ? (
          /* Credit confirmation gate — shown before first stage runs */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", textAlign: "center" }}>
            {(() => {
              const isActive = billing?.subscription_status === 'active' || billing?.subscription_status === 'trialing';
              const freeEpisodeAvailable = !isActive && billing?.free_episode_used === false;
              const totalRemaining = billing?.total_remaining ?? null;

              return (
                <>
                  <div style={{ fontSize: '28px', marginBottom: '16px' }}>{freeEpisodeAvailable ? '🎬' : '◈'}</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: COLORS.text, marginBottom: '8px' }}>
                    {freeEpisodeAvailable ? 'Your free episode' : 'Start a new episode'}
                  </div>
                  <div style={{ fontSize: '14px', color: COLORS.textSecondary, maxWidth: '380px', lineHeight: '1.6', marginBottom: '8px' }}>
                    {freeEpisodeAvailable
                      ? 'This is your free episode. No charge — full pipeline, no limits.'
                      : totalRemaining !== null
                        ? `This will use 1 of your ${totalRemaining} remaining episode credit${totalRemaining !== 1 ? 's' : ''}.`
                        : 'This will use 1 episode credit from your plan.'
                    }
                  </div>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '28px' }}>
                    Unlimited revisions within each episode. Credits cover the episode slot, not individual generations.
                  </div>
                  <button
                    onClick={() => setCreditConfirmed(true)}
                    style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {freeEpisodeAvailable ? 'Start my free episode →' : 'Start Episode →'}
                  </button>
                </>
              );
            })()}
          </div>
        ) : (
          <>
            {activeStage === 0 && <ErrorBoundary stageMode><Stage0Research key={stageVersionKeys[0] || 0} onApprove={d => handleApprove(0, d)} saved={stageData[0]} data={mergedData} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} /></ErrorBoundary>}
            {activeStage === 1 && <ErrorBoundary stageMode><Stage1Script key={stageVersionKeys[1] || 0} onApprove={d => handleApprove(1, d)} saved={stageData[1]} researchData={{ ...stageData[0], channelProfile }} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} billing={billing} onOneShot={handleOneShotOpen} /></ErrorBoundary>}
            {activeStage === 2 && <ErrorBoundary stageMode><Stage2Voiceover key={stageVersionKeys[2] || 0} data={mergedData} onApprove={d => handleApprove(2, d)} saved={stageData[2]} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} /></ErrorBoundary>}
            {activeStage === 3 && <ErrorBoundary stageMode><Stage3Sound key={stageVersionKeys[3] || 0} data={mergedData} onApprove={d => handleApprove(3, d)} saved={stageData[3]} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} /></ErrorBoundary>}
            {activeStage === 4 && <ErrorBoundary stageMode><Stage4Images key={stageVersionKeys[4] || 0} data={mergedData} onApprove={d => handleApprove(4, d)} saved={stageData[4]} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} /></ErrorBoundary>}
            {activeStage === 5 && <ErrorBoundary stageMode><Stage5Assembly key={stageVersionKeys[5] || 0} data={mergedData} onApprove={d => handleApprove(5, d)} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} /></ErrorBoundary>}
            {activeStage === 6 && <ErrorBoundary stageMode><Stage6Thumbnail key={stageVersionKeys[6] || 0} data={mergedData} onApprove={d => handleApprove(6, d)} saved={stageData[6]} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} /></ErrorBoundary>}
            {activeStage === 7 && <ErrorBoundary stageMode><Stage7Metadata key={stageVersionKeys[7] || 0} data={mergedData} saved={stageData[7]} onApprove={d => handleApprove(7, d)} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} /></ErrorBoundary>}
          </>
        )}
      </div>
    </AppLayout>
  );
}
