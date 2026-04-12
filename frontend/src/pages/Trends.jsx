import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/ui/AppLayout';
import { useChannelProfile } from '../hooks/useChannelProfile';
import { generateTrendingTopics, validateTopic } from '../lib/api';

const ACCENT = '#e03535';

function formatViews(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return n.toString();
}

export default function Trends() {
  const navigate = useNavigate();
  const { channelProfile } = useChannelProfile();
  const [mode, setMode] = useState('browse');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [validation, setValidation] = useState(null);
  const [customTopic, setCustomTopic] = useState('');
  const [error, setError] = useState(null);

  const channelDesc = channelProfile?.description || '';
  const channelName = channelProfile?.channel_name || 'your channel';

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await generateTrendingTopics(null, channelDesc);
      setResults(data.results);
    } catch (e) {
      setError('Failed to generate topics. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!customTopic.trim()) return;
    setLoading(true);
    setError(null);
    setValidation(null);
    try {
      const data = await validateTopic(customTopic, channelDesc);
      setValidation(data);
    } catch (e) {
      setError('Failed to validate topic. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendToPipeline = (topic) => {
    navigate(`/pipeline?topic=${encodeURIComponent(topic)}`);
  };

  const card = {
    background: '#1a1a1a',
    border: '1px solid #222',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '12px',
  };

  return (
    <AppLayout>
      <div style={{ padding: '32px 40px', width: '100%' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
            Trend Research
          </div>
          <div style={{ fontSize: '13px', color: '#555' }}>
            Find what's worth making for {channelName} — backed by real YouTube data.
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', gap: '4px', background: '#1a1a1a', padding: '4px',
          borderRadius: '10px', width: 'fit-content', marginBottom: '28px', border: '1px solid #222',
        }}>
          {[
            { key: 'browse', label: '✦ Find ideas for me' },
            { key: 'validate', label: '⟳ Validate my idea' },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => { setMode(m.key); setResults(null); setValidation(null); setError(null); }}
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

        {/* Browse mode */}
        {mode === 'browse' && (
          <div>
            {!results && !loading && (
              <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>📊</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
                  Find your next video idea
                </div>
                <div style={{ fontSize: '13px', color: '#555', marginBottom: '28px', maxWidth: '400px', margin: '0 auto 28px' }}>
                  Forge will generate 6 topic ideas for {channelName} and cross-reference each one with real YouTube data to find the best opportunities.
                </div>
                <button
                  onClick={handleGenerate}
                  style={{
                    background: ACCENT, color: '#fff', border: 'none',
                    padding: '12px 32px', borderRadius: '8px', fontSize: '14px',
                    fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Find ideas →
                </button>
              </div>
            )}

            {loading && (
              <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
                <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>
                  Generating ideas and checking YouTube data...
                </div>
                <div style={{ fontSize: '11px', color: '#333' }}>This takes about 15 seconds</div>
              </div>
            )}

            {error && (
              <div style={{ ...card, color: ACCENT, fontSize: '13px' }}>{error}</div>
            )}

            {results && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#555' }}>
                    {results.length} ideas — sorted by opportunity
                  </div>
                  <button
                    onClick={handleGenerate}
                    style={{
                      background: 'none', border: '1px solid #333', color: '#888',
                      padding: '6px 16px', borderRadius: '6px', fontSize: '11px',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Regenerate
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {results.map((result, i) => (
                    <div key={i} style={{ ...card, marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', flex: 1, marginRight: '12px', lineHeight: '1.4' }}>
                          {result.topic}
                        </div>
                        <div style={{
                          fontSize: '10px', fontWeight: '700', padding: '3px 10px',
                          borderRadius: '20px', flexShrink: 0,
                          background: `${result.verdictColor}15`,
                          color: result.verdictColor,
                          border: `1px solid ${result.verdictColor}30`,
                        }}>
                          {result.verdict}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        {[
                          { label: 'Avg views', value: formatViews(result.avgViews) },
                          { label: 'Competition', value: result.competition.level, color: result.competition.color },
                          { label: 'Videos found', value: result.videos.length.toString() },
                        ].map((stat, j) => (
                          <div key={j} style={{ background: '#111', borderRadius: '6px', padding: '8px 10px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: stat.color || '#fff', marginBottom: '2px' }}>{stat.value}</div>
                            <div style={{ fontSize: '10px', color: '#444' }}>{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      {result.topVideoTitle && (
                        <div style={{ background: '#111', borderRadius: '6px', padding: '8px 10px', marginBottom: '12px' }}>
                          <div style={{ fontSize: '9px', color: '#444', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top performing video</div>
                          <div style={{ fontSize: '11px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {result.topVideoTitle}
                          </div>
                          <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                            {formatViews(result.topVideoViews)} views
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => sendToPipeline(result.topic)}
                          style={{
                            flex: 1, background: ACCENT, color: '#fff', border: 'none',
                            padding: '9px 16px', borderRadius: '7px', fontSize: '12px',
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
                            padding: '9px 14px', borderRadius: '7px', fontSize: '12px',
                            textDecoration: 'none', display: 'flex', alignItems: 'center',
                          }}
                        >
                          YT ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Validate mode */}
        {mode === 'validate' && (
          <div>
            <div style={{ ...card, marginBottom: '16px' }}>
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
                  disabled={loading || !customTopic.trim()}
                  style={{
                    background: loading || !customTopic.trim() ? '#222' : ACCENT,
                    color: loading || !customTopic.trim() ? '#555' : '#fff',
                    border: 'none', padding: '11px 24px', borderRadius: '8px',
                    fontSize: '13px', fontWeight: '600',
                    cursor: loading || !customTopic.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}
                >
                  {loading ? 'Checking...' : 'Validate →'}
                </button>
              </div>
              {loading && (
                <div style={{ fontSize: '11px', color: '#444', marginTop: '10px' }}>
                  Searching YouTube and analysing data... ~10 seconds
                </div>
              )}
            </div>

            {error && (
              <div style={{ ...card, color: ACCENT, fontSize: '13px' }}>{error}</div>
            )}

            {validation && (() => {
              const rec = validation.analysis.recommendation;
              const isGood = rec === 'Make it';
              const isBad = rec === 'Skip it';
              const borderColor = isGood ? '#14532d' : isBad ? '#3a1515' : '#3a2a00';
              const bgColor = isGood ? '#0a2a1a' : isBad ? '#1a0a0a' : '#1a1500';
              const recColor = isGood ? '#4ade80' : isBad ? '#e03535' : '#d97806';

              return (
                <div>
                  <div style={{ ...card, border: `1px solid ${borderColor}`, background: bgColor, marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', flex: 1, marginRight: '12px' }}>{validation.topic}</div>
                      <div style={{
                        fontSize: '13px', fontWeight: '700', padding: '6px 16px', borderRadius: '8px',
                        background: `${recColor}20`, color: recColor, flexShrink: 0,
                      }}>
                        {rec}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#888', lineHeight: '1.6', marginBottom: validation.analysis.angle ? '12px' : 0 }}>
                      {validation.analysis.reason}
                    </div>
                    {validation.analysis.angle && (
                      <div style={{ background: '#ffffff08', borderRadius: '8px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Suggested angle</div>
                        <div style={{ fontSize: '13px', color: '#ccc' }}>{validation.analysis.angle}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                    {[
                      { label: 'Videos found', value: validation.videos.length },
                      { label: 'Avg views', value: formatViews(validation.avgViews) },
                      { label: 'Competition', value: validation.competition.level, color: validation.competition.color },
                    ].map((stat, i) => (
                      <div key={i} style={{ ...card, marginBottom: 0, textAlign: 'center', padding: '16px' }}>
                        <div style={{ fontSize: '22px', fontWeight: '700', color: stat.color || '#fff', marginBottom: '4px' }}>{stat.value}</div>
                        <div style={{ fontSize: '11px', color: '#555' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {validation.videos.length > 0 && (
                    <div style={{ ...card, marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                        Top videos on this topic
                      </div>
                      {validation.videos.slice(0, 4).map((video, i) => (
                        <a
                          key={i}
                          href={`https://www.youtube.com/watch?v=${video.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', gap: '12px', padding: '10px 0',
                            borderBottom: i < Math.min(validation.videos.length, 4) - 1 ? '1px solid #222' : 'none',
                            textDecoration: 'none',
                          }}
                        >
                          {video.thumbnail && (
                            <img src={video.thumbnail} alt="" style={{ width: '80px', height: '45px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {video.title}
                            </div>
                            <div style={{ fontSize: '11px', color: '#555' }}>
                              {video.channel} · {formatViews(video.views)} views
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => sendToPipeline(validation.topic)}
                      style={{
                        flex: 1, background: ACCENT, color: '#fff', border: 'none',
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
