import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { getEpisodes, getCachedTrends, getChannelStats } from '../lib/api';
import { useChannelProfile } from '../hooks/useChannelProfile';
import AppLayout from '../components/ui/AppLayout';

const ACCENT = '#e03535';
const STAGE_NAMES = ['Research', 'Story', 'Narration', 'Sound', 'Visuals', 'Assembly', 'Thumbnail', 'Metadata'];
const STAGE_ICONS = ['🔍', '✍️', '🎙️', '🎵', '🖼️', '🎬', '🎨', '📋'];


function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subscriptionSuccess = searchParams.get('subscription') === 'success';
  const { channelProfile, hasProfile, loading: profileLoading } = useChannelProfile();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [channelStats, setChannelStats] = useState(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(subscriptionSuccess);

  useEffect(() => {
    if (!profileLoading && !hasProfile) navigate('/onboarding', { replace: true });
  }, [profileLoading, hasProfile]);

  useEffect(() => {
    getEpisodes()
      .then(setEpisodes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getCachedTrends()
      .then(data => setTrendingTopics((data.topics || []).slice(0, 4)))
      .catch(console.error)
      .finally(() => setLoadingTrends(false));
  }, []);

  useEffect(() => {
    getChannelStats().then(setChannelStats).catch(() => {});
  }, []);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const episodesThisMonth = episodes.filter(e => e.created_at?.startsWith(thisMonth));
  const episodesLastMonth = episodes.filter(e => e.created_at?.startsWith(lastMonth));
  const monthChange = episodesThisMonth.length - episodesLastMonth.length;
  const latestInProgress = episodes.find(ep => ep.status === 'draft' && ep.active_stage > 0);
  const channelName = channelProfile?.channel_name || 'your channel';

  const activityItems = episodes.slice(0, 5).flatMap(ep => {
    const stages = ep.completed_stages || [];
    return stages.slice(-2).map(stage => ({
      icon: STAGE_ICONS[stage] || '✓',
      label: `${STAGE_NAMES[stage] || 'Stage'} completed`,
      sub: ep.title || 'Untitled episode',
      time: ep.updated_at,
    }));
  }).slice(0, 8);

  const card = {
    background: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '20px',
  };

  if (loading || profileLoading) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={{ fontSize: '14px', color: '#888' }}>Loading...</div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      {showSuccessBanner && (
        <div style={{ background: '#0a2a1a', borderBottom: '1px solid #14532d', padding: '12px 40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: '#4ade80', flex: 1 }}>
            🎉 <strong>Welcome to Forge Pro!</strong> Your 14-day free trial has started. No charge until your trial ends.
          </span>
          <button
            onClick={() => setShowSuccessBanner(false)}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '16px', padding: '0', fontFamily: 'inherit' }}
          >
            ×
          </button>
        </div>
      )}
      <div style={{ padding: '32px 40px', width: '100%' }}>

        {/* Hero */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
            {getGreeting()}, {channelName} 👋
          </div>
          <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '20px' }}>
            {episodesThisMonth.length === 0
              ? "You haven't created any episodes this month. Your next video is waiting."
              : episodesThisMonth.length === 1
              ? "You've created 1 episode this month. Keep the momentum going."
              : `You've created ${episodesThisMonth.length} episodes this month. You're on a roll.`}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {latestInProgress && (
              <Link to="/pipeline" style={{
                background: '#222', color: '#ccc', padding: '10px 20px',
                borderRadius: '8px', textDecoration: 'none', fontSize: '13px',
                fontWeight: '500', border: '1px solid #333',
              }}>
                Resume {latestInProgress.title || 'episode'} →
              </Link>
            )}
            <Link to="/pipeline" style={{
              background: ACCENT, color: '#fff', padding: '10px 24px',
              borderRadius: '8px', textDecoration: 'none', fontSize: '13px',
              fontWeight: '600',
            }}>
              + New Episode
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          {[
            {
              value: episodes.length,
              label: 'Total Episodes',
              sub: `${episodes.filter(e => e.status === 'complete').length} complete`,
            },
            {
              value: episodes.reduce((acc, ep) => acc + (ep.stage_data?.[1]?.analysis?.wordCount || 0), 0).toLocaleString(),
              label: 'Words Written',
              sub: 'across all episodes',
            },
            {
              value: episodesThisMonth.length,
              label: 'This Month',
              sub: monthChange > 0 ? `↑ ${monthChange} vs last month` : monthChange < 0 ? `↓ ${Math.abs(monthChange)} vs last month` : 'same as last month',
              subColor: monthChange > 0 ? '#4ade80' : monthChange < 0 ? '#e03535' : '#777',
            },
            {
              value: episodes.length === 0 ? '0%' : `${Math.round((episodes.filter(e => e.status === 'complete').length / episodes.length) * 100)}%`,
              label: 'Completion Rate',
              sub: 'episodes finished',
            },
          ].map(s => (
            <div key={s.label} style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              padding: '16px 18px',
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '12px', color: s.subColor || '#777' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Channel stats */}
        {channelStats && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>YouTube Channel</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { value: channelStats.subscribers.toLocaleString(), label: 'Subscribers' },
                { value: channelStats.total_views.toLocaleString(), label: 'Total Views' },
                { value: channelStats.video_count.toLocaleString(), label: 'Videos Published' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px 18px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

          {/* Recent Episodes */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Episodes</div>
              <Link to="/pipeline" style={{ fontSize: '11px', color: ACCENT, textDecoration: 'none', fontWeight: '600' }}>+ New</Link>
            </div>

            {episodes.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.4 }}>🎬</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '8px' }}>No episodes yet</div>
                <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '20px' }}>Start your first production →</div>
                <Link to="/pipeline" style={{ display: 'inline-block', background: ACCENT, color: '#fff', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                  Start now
                </Link>
              </div>
            ) : (
              episodes.slice(0, 6).map((ep, i) => (
                <div key={ep.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 8px',
                    borderBottom: i < Math.min(episodes.length, 6) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    borderRadius: '6px',
                    transition: 'background 0.15s ease, transform 0.1s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#fff', fontWeight: '500', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ep.title || 'Untitled'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#777' }}>
                      {new Date(ep.created_at).toLocaleDateString()} · Stage {ep.active_stage}/8
                      {ep.stage_data?.[1]?.analysis?.wordCount
                        ? ` · ${ep.stage_data[1].analysis.wordCount.toLocaleString()} words`
                        : ''}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '9px', fontWeight: '700', letterSpacing: '0.5px',
                    padding: '3px 8px', borderRadius: '20px', marginLeft: '10px',
                    background: ep.status === 'complete' ? '#0a2a1a' : '#1e1e1e',
                    color: ep.status === 'complete' ? '#4ade80' : '#888',
                    border: `1px solid ${ep.status === 'complete' ? '#14532d' : '#2a2a2a'}`,
                    textTransform: 'uppercase', flexShrink: 0,
                  }}>
                    {ep.status}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Recent Activity */}
          <div style={card}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
              Recent Activity
            </div>

            {activityItems.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
                <div style={{ fontSize: '14px', color: '#fff', fontWeight: '600', marginBottom: '6px' }}>No activity yet</div>
                <div style={{ fontSize: '13px', color: '#aaa' }}>Your production activity will appear here</div>
              </div>
            ) : (
              activityItems.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                  padding: '10px 0',
                  borderBottom: i < activityItems.length - 1 ? '1px solid #222' : 'none',
                }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    background: '#222', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '13px', flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#ccc', marginBottom: '2px' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '12px', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.sub}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', flexShrink: 0 }}>
                    {timeAgo(item.time)}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Weekly Goal */}
        {(() => {
          const weeklyTarget = channelProfile?.weekly_goal ?? 2;
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const episodesThisWeek = episodes.filter(ep => new Date(ep.created_at) >= weekStart);
          const pct = Math.min((episodesThisWeek.length / weeklyTarget) * 100, 100);
          const remaining = Math.max(weeklyTarget - episodesThisWeek.length, 0);

          return (
            <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Weekly Goal</div>
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: '500' }}>
                    {episodesThisWeek.length === 0
                      ? "No episodes this week yet. Let's make one."
                      : episodesThisWeek.length >= weeklyTarget
                      ? `Goal reached — ${episodesThisWeek.length} episodes this week 🎉`
                      : `${episodesThisWeek.length} of ${weeklyTarget} episodes this week. ${remaining} to go.`}
                  </div>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: pct >= 100 ? '#4ade80' : ACCENT, flexShrink: 0 }}>
                  {episodesThisWeek.length}/{weeklyTarget}
                </div>
              </div>
              <div style={{ height: '4px', background: '#222', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: pct >= 100 ? '#4ade80' : ACCENT,
                  borderRadius: '2px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          );
        })()}

        {/* Trending Topics */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trending Topics</div>
            <Link to="/trends" style={{ fontSize: '11px', color: ACCENT, textDecoration: 'none', fontWeight: '600' }}>See all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {loadingTrends ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: '#1a1a1a', border: '1px solid #222', borderLeft: '3px solid #333', borderRadius: '10px', padding: '14px 16px', height: '90px', opacity: 0.5 }} />
              ))
            ) : trendingTopics.length > 0 ? (
              trendingTopics.map((t, i) => (
                <Link
                  key={i}
                  to="/trends"
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <div style={{
                    background: '#1a1a1a',
                    border: '1px solid #222',
                    borderLeft: `3px solid ${t.competitionColor || '#444'}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    height: '100%',
                    transition: 'border-color 0.15s ease',
                  }}>
                    <div style={{
                      fontSize: '10px', fontWeight: '600', color: t.competitionColor || '#888',
                      textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
                    }}>
                      {t.competitionLevel || 'Unknown'} competition
                    </div>
                    <div style={{
                      fontSize: '12px', color: '#ccc', lineHeight: '1.4', marginBottom: '8px',
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {t.topic}
                    </div>
                    <div style={{ fontSize: '12px', color: '#777' }}>
                      {t.evidenceRatio ? `${t.evidenceRatio}x ratio · ` : ''}View on Trends →
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', fontSize: '13px', color: '#888', padding: '16px 0' }}>
                No topics yet — <Link to="/trends" style={{ color: ACCENT, textDecoration: 'none' }}>generate some →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Tips + Channel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

          {/* Tips */}
          <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Tips</div>
            {[
              { tip: 'Score your hook', detail: 'Use the Hook Score tool in the Story stage. A strong hook doubles retention on faceless channels.' },
              { tip: 'Be specific with topics', detail: 'Broad topics produce generic scripts. Narrow the topic down before hitting research.' },
              { tip: 'Use additional context', detail: 'The context field in Research shapes the angle. Use it to define your audience or format.' },
              { tip: 'Check retention risks', detail: 'The Retention Analyzer in Story stage finds the 3 moments most likely to lose viewers.' },
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: i < 3 ? '14px' : 0 }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: '#2a1515', border: '1px solid #3a1515',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: '700', color: ACCENT,
                  flexShrink: 0, marginTop: '1px',
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#ccc', marginBottom: '2px' }}>{t.tip}</div>
                  <div style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.5' }}>{t.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Channel profile */}
          <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Channel</div>
              <Link to="/settings" style={{ fontSize: '11px', color: ACCENT, textDecoration: 'none', fontWeight: '600' }}>Edit →</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: ACCENT, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#fff',
              }}>
                {channelProfile?.channel_name?.[0]?.toUpperCase() || 'F'}
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#fff', fontWeight: '600' }}>{channelProfile?.channel_name || 'My Channel'}</div>
                <div style={{ fontSize: '12px', color: '#777' }}>
                  {channelProfile?.tone?.replace(/_/g, ' ') || 'No tone set'}
                </div>
              </div>
            </div>
            {[
              { label: 'Video Length', value: channelProfile?.video_length ? `${channelProfile.video_length} minutes` : '—' },
              { label: 'Tone', value: channelProfile?.tone?.replace(/_/g, ' ') || '—' },
              { label: 'Plan', value: 'Free' },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: i < 2 ? '1px solid #222' : 'none',
              }}>
                <span style={{ fontSize: '13px', color: '#888' }}>{row.label}</span>
                <span style={{ fontSize: '13px', color: '#ccc', fontWeight: '500', textTransform: 'capitalize' }}>{row.value}</span>
              </div>
            ))}
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
