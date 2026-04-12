import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannelProfile } from "../hooks/useChannelProfile";
import { getEpisodes, createEpisode, updateEpisode, deleteEpisode, getAssets } from "../lib/api";
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

const STAGES = [
  { id: 0, label: "Research" },
  { id: 1, label: "Story" },
  { id: 2, label: "Narration" },
  { id: 3, label: "Sound" },
  { id: 4, label: "Visuals" },
  { id: 5, label: "Assembly" },
  { id: 6, label: "Thumbnail" },
  { id: 7, label: "Publish" },
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
  }, []);

  useEffect(() => {
    if (!user) return;
    loadEpisodes();
  }, [user]);

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
    const newStageData = { ...stageData, [stage]: data };
    const newCompleted = new Set([...completedStages, stage]);
    const newActive = stage + 1;
    const merged = Object.values(newStageData).reduce((acc, d) => ({ ...acc, ...d }), {});

    setStageData(newStageData);
    setCompletedStages(newCompleted);
    setActiveStage(newActive);

    try {
      if (currentEpisodeId) {
        await updateEpisode(currentEpisodeId, {
          active_stage: newActive,
          completed_stages: [...newCompleted],
          stage_data: newStageData,
          title: merged.topic || null,
          episode_number: merged.episode || null,
        });
      } else {
        const episode = await createEpisode({
          active_stage: newActive,
          completed_stages: [...newCompleted],
          stage_data: newStageData,
          title: merged.topic || null,
          episode_number: merged.episode || null,
          status: 'draft',
        });
        setCurrentEpisodeId(episode.id);
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
    setCurrentEpisodeId(null);
    setPersistedAssets({ audio: {}, images: {} });
    setShowResetConfirm(false);
  };

  const handleLoadEpisode = (ep) => {
    setStageData(ep.stage_data || {});
    setCompletedStages(new Set(ep.completed_stages || []));
    setActiveStage(ep.active_stage || 0);
    setCurrentEpisodeId(ep.id);
  };

  const handleDeleteEpisode = async (id) => {
    await deleteEpisode(id);
    await loadEpisodes();
  };

  return (
    <AppLayout>
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
        borderBottom: '1px solid #222',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        height: '52px',
        gap: '16px',
      }}>
        <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.5px' }}>
          {currentEpisodeId ? (stageData[0]?.topic || 'Production Pipeline') : 'Production Pipeline'}
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowLibrary(true)}
          style={{ background: 'none', border: '1px solid #333', color: '#888', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Library
        </button>
        {!showResetConfirm && (
          <button
            onClick={() => setShowResetConfirm(true)}
            style={{ background: ACCENT, border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + New Episode
          </button>
        )}
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

      <StageBar
        STAGES={STAGES}
        activeStage={activeStage}
        completedStages={completedStages}
        onStageClick={setActiveStage}
      />
      <div style={{ ...S.content, maxWidth: 'none', width: '100%' }}>
        {isComplete && activeStage >= 8 ? (
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
            <div style={{ display: "flex", gap: "12px" }}>
              <button style={S.btnSecondary(false)} onClick={() => setActiveStage(5)}>Assembly</button>
              <button style={{ ...S.btnPrimary(false), padding: "11px 24px" }} onClick={() => setShowResetConfirm(true)}>
                + Start New Episode
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeStage === 0 && <Stage0Research onApprove={d => handleApprove(0, d)} saved={stageData[0]} data={mergedData} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} />}
            {activeStage === 1 && <Stage1Script onApprove={d => handleApprove(1, d)} saved={stageData[1]} researchData={stageData[0]} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} />}
            {activeStage === 2 && <Stage2Voiceover data={mergedData} onApprove={d => handleApprove(2, d)} saved={stageData[2]} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} />}
            {activeStage === 3 && <Stage3Sound data={mergedData} onApprove={d => handleApprove(3, d)} saved={stageData[3]} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} />}
            {activeStage === 4 && <Stage4Images data={mergedData} onApprove={d => handleApprove(4, d)} saved={stageData[4]} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} />}
            {activeStage === 5 && <Stage5Assembly data={mergedData} onApprove={d => handleApprove(5, d)} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} />}
            {activeStage === 6 && <Stage6Thumbnail data={mergedData} onApprove={d => handleApprove(6, d)} saved={stageData[6]} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} />}
            {activeStage === 7 && <Stage7Metadata data={mergedData} saved={stageData[7]} onApprove={d => handleApprove(7, d)} isComplete={isComplete} onBackToSummary={() => setActiveStage(8)} />}
          </>
        )}
      </div>
    </AppLayout>
  );
}
