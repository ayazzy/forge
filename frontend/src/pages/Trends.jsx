import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/ui/AppLayout';
import { useChannelProfile } from '../hooks/useChannelProfile';
import { getCachedTrends, refreshTrends, validateTopic } from '../lib/api';

const fmtViews = (v) =>
  v > 1000000 ? `${(v / 1000000).toFixed(1)}M` : v > 1000 ? `${Math.round(v / 1000)}K` : (v || 0).toString();

export default function Trends() {
  const navigate = useNavigate();
  const { channelProfile } = useChannelProfile();
  const [mode, setMode] = useState('browse');
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const data = await getCachedTrends();
      if (data.topics?.length > 0) {
        setTopics(data.topics);
        setGeneratedAt(data.generated_at);
        setIsStale(data.is_stale);
      } else {
        await handleRefresh(true);
      }
    } catch (e) {
      setError('Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const data = await refreshTrends();
      console.log('Refreshed topics sample:', JSON.stringify(data.topics?.[0], null, 2));
      setTopics(data.topics);
      setGeneratedAt(data.generated_at);
      setIsStale(false);
    } catch (e) {
      setError('Failed to refresh topics');
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  const handleValidate = async () => {
    if (!customTopic.trim()) return;
    setValidating(true);
    setValidation(null);
    setError(null);
    try {
      const data = await validateTopic(customTopic, channelProfile?.description || '');
      setValidation(data);
    } catch (e) {
      setError('Failed to validate topic');
    } finally {
      setValidating(false);
    }
  };

  const sendToPipeline = (topic) => navigate(`/pipeline?topic=${encodeURIComponent(topic)}`);
  const channelName = channelProfile?.channel_name || 'your channel';

  return (
    <AppLayout>
      <div style={{ padding: '32px 40px', width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>Trend Research</div>
            <div style={{ fontSize: '13px', color: '#555' }}>
              Real YouTube data for {channelName} — sorted by views-to-subscriber ratio.
            </div>
          </div>
          {mode === 'browse' && topics.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {generatedAt && (
                <div style={{ fontSize: '11px', color: '#444' }}>
                  {isStale ? '⚠ May be outdated' : `Updated ${new Date(generatedAt).toLocaleDateString()}`}
                </div>
              )}
              <button
                onClick={() => handleRefresh(false)}
                disabled={refreshing}
                style={{
                  background: 'none', border: '1px solid #333', color: '#888',
                  padding: '8px 16px', borderRadius: '8px', fontSize: '12px',
                  cursor: refreshing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}
              >
                {refreshing ? 'Refreshing...' : '↻ Refresh'}
              </button>
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '4px', background: '#1a1a1a', padding: '4px', borderRadius: '10px', width: 'fit-content', marginBottom: '28px', border: '1px solid #222' }}>
          {[
            { key: 'browse', label: '✦ Ideas for me' },
            { key: 'validate', label: '⟳ Validate my idea' },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => { setMode(m.key); setValidation(null); setError(null); }}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: mode === m.key ? '#111' : 'transparent',
                color: mode === m.key ? '#fff' : '#555',
                fontSize: '13px', fontWeight: mode === m.key ? '600' : '400',
                cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'inherit',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: '#1a0a0a', border: '1px solid #3a1515', borderRadius: '8px', padding: '12px 16px', color: '#e03535', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Browse mode */}
        {mode === 'browse' && (
          <>
            {(loading || refreshing) && (
              <>
                <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }`}</style>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} style={{
                      background: '#1a1a1a', border: '1px solid #222',
                      borderLeft: '3px solid #333', borderRadius: '12px', padding: '20px',
                    }}>
                      <div style={{ height: '16px', background: '#222', borderRadius: '4px', marginBottom: '8px', animation: 'pulse 1.5s ease infinite' }} />
                      <div style={{ height: '12px', background: '#222', borderRadius: '4px', width: '70%', marginBottom: '20px', animation: 'pulse 1.5s ease infinite' }} />
                      <div style={{ height: '60px', background: '#222', borderRadius: '8px', marginBottom: '16px', animation: 'pulse 1.5s ease infinite' }} />
                      <div style={{ height: '36px', background: '#222', borderRadius: '8px', animation: 'pulse 1.5s ease infinite' }} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {!loading && !refreshing && topics.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {topics.map((result, i) => (
                  <div key={i} style={{
                    background: '#1a1a1a',
                    border: '1px solid #222',
                    borderLeft: `3px solid ${result.competitionColor}`,
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', lineHeight: '1.4', marginBottom: '6px' }}>
                          {result.topic}
                        </div>
                        <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.5' }}>
                          {result.angle}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '10px', fontWeight: '700', padding: '4px 10px',
                        borderRadius: '20px', flexShrink: 0,
                        background: `${result.competitionColor}15`,
                        color: result.competitionColor,
                        border: `1px solid ${result.competitionColor}30`,
                        whiteSpace: 'nowrap',
                      }}>
                        {result.competitionLevel} competition
                      </div>
                    </div>

                    {/* Why it works */}
                    <div style={{ background: '#111', borderRadius: '8px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: '600' }}>
                        Why this works
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.6' }}>
                        {result.whyItWorks || result.why || result.why_it_works || result.reasoning || result.reason || ''}
                      </div>
                    </div>

                    {/* Evidence */}
                    {result.evidenceVideo && (
                      <div style={{ borderTop: '1px solid #222', paddingTop: '12px' }}>
                        <div style={{ fontSize: '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: '600' }}>
                          Evidence
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{result.evidenceVideo}"
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {[
                            { label: 'views', value: fmtViews(result.evidenceViews) },
                            { label: 'subscribers', value: result.evidenceSubscribers > 1000 ? `${Math.round(result.evidenceSubscribers / 1000)}K` : (result.evidenceSubscribers || 0).toString() },
                            { label: 'ratio', value: `${result.evidenceRatio}x`, highlight: true },
                          ].map((stat, j) => (
                            <div key={j} style={{
                              flex: 1, background: stat.highlight ? '#1a1a2a' : '#111',
                              border: stat.highlight ? '1px solid #333' : 'none',
                              borderRadius: '6px', padding: '7px', textAlign: 'center',
                            }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: stat.highlight ? '#818cf8' : '#fff' }}>
                                {stat.value}
                              </div>
                              <div style={{ fontSize: '10px', color: '#444' }}>{stat.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      <button
                        onClick={() => sendToPipeline(result.topic)}
                        style={{
                          flex: 1, background: '#e03535', color: '#fff', border: 'none',
                          padding: '10px 16px', borderRadius: '8px', fontSize: '12px',
                          fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Use in pipeline →
                      </button>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(result.topic)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#222', color: '#888', border: '1px solid #333',
                          padding: '10px 14px', borderRadius: '8px', fontSize: '12px',
                          textDecoration: 'none', display: 'flex', alignItems: 'center',
                        }}
                      >
                        YT ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Validate mode */}
        {mode === 'validate' && (
          <div>
            <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Your topic idea
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  style={{
                    flex: 1, background: '#111', border: '1px solid #333',
                    color: '#fff', padding: '11px 14px', borderRadius: '8px',
                    fontSize: '14px', outline: 'none', fontFamily: 'inherit',
                  }}
                  placeholder="e.g. The rise and fall of Blockbuster"
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleValidate()}
                />
                <button
                  onClick={handleValidate}
                  disabled={validating || !customTopic.trim()}
                  style={{
                    background: validating || !customTopic.trim() ? '#222' : '#e03535',
                    color: validating || !customTopic.trim() ? '#555' : '#fff',
                    border: 'none', padding: '11px 24px', borderRadius: '8px',
                    fontSize: '13px', fontWeight: '600',
                    cursor: validating || !customTopic.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}
                >
                  {validating ? 'Checking...' : 'Validate →'}
                </button>
              </div>
              {validating && (
                <div style={{ fontSize: '11px', color: '#444', marginTop: '10px' }}>
                  Searching YouTube and analysing... ~10 seconds
                </div>
              )}
            </div>

            {validation && (() => {
              const rec = validation.analysis.recommendation;
              const isGood = rec === 'Make it';
              const isBad = rec === 'Skip it';
              const bg = isGood ? '#0a2a1a' : isBad ? '#1a0a0a' : '#1a1500';
              const border = isGood ? '#14532d' : isBad ? '#3a1515' : '#3a2a00';
              const tagBg = isGood ? '#4ade8020' : isBad ? '#e0353520' : '#d9780620';
              const tagColor = isGood ? '#4ade80' : isBad ? '#e03535' : '#d97806';
              return (
                <div>
                  <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>{validation.topic}</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', padding: '6px 16px', borderRadius: '8px', background: tagBg, color: tagColor }}>
                        {rec}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#888', lineHeight: '1.6', marginBottom: '12px' }}>
                      {validation.analysis.reason}
                    </div>
                    {validation.avgRatio > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        {[
                          { label: 'avg ratio', value: `${validation.avgRatio.toFixed(1)}x`, highlight: true },
                          { label: 'avg views', value: fmtViews(validation.avgViews) },
                          { label: 'videos found', value: (validation.videos?.length || 0).toString() },
                        ].map((stat, j) => (
                          <div key={j} style={{
                            flex: 1, background: stat.highlight ? '#1a1a2a' : '#ffffff08',
                            border: stat.highlight ? '1px solid #333' : '1px solid #ffffff10',
                            borderRadius: '8px', padding: '10px', textAlign: 'center',
                          }}>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: stat.highlight ? '#818cf8' : '#fff', marginBottom: '2px' }}>
                              {stat.value}
                            </div>
                            <div style={{ fontSize: '10px', color: '#555' }}>{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {validation.analysis.angle && (
                      <div style={{ background: '#ffffff08', borderRadius: '8px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Suggested angle</div>
                        <div style={{ fontSize: '13px', color: '#ccc' }}>{validation.analysis.angle}</div>
                      </div>
                    )}
                  </div>

                  {validation.videos?.length > 0 && (
                    <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                        Top videos on this topic
                      </div>
                      {validation.videos.slice(0, 5).map((video, i) => (
                        <a
                          key={i}
                          href={`https://www.youtube.com/watch?v=${video.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', gap: '12px', padding: '10px 0', alignItems: 'center',
                            borderBottom: i < validation.videos.length - 1 ? '1px solid #222' : 'none',
                            textDecoration: 'none',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {video.title}
                            </div>
                            <div style={{ fontSize: '11px', color: '#555' }}>
                              {video.channelName} · {fmtViews(video.views)} views · {video.subscribers > 1000 ? `${Math.round(video.subscribers / 1000)}K` : video.subscribers} subs
                            </div>
                          </div>
                          <div style={{
                            fontSize: '12px', fontWeight: '700', color: '#818cf8',
                            background: '#1a1a2a', border: '1px solid #333',
                            padding: '4px 10px', borderRadius: '6px', flexShrink: 0,
                          }}>
                            {video.ratio}x
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => sendToPipeline(validation.topic)}
                      style={{
                        flex: 1, background: '#e03535', color: '#fff', border: 'none',
                        padding: '12px 24px', borderRadius: '8px', fontSize: '13px',
                        fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Use in pipeline →
                    </button>
                    <button
                      onClick={() => { setValidation(null); setCustomTopic(''); }}
                      style={{
                        background: '#222', color: '#888', border: '1px solid #333',
                        padding: '12px 20px', borderRadius: '8px', fontSize: '13px',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Try another
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
