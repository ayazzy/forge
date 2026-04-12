import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getEpisodes } from '../lib/api';
import { useChannelProfile } from '../hooks/useChannelProfile';
import AppLayout from '../components/ui/AppLayout';

const ACCENT = '#e03535';
const STAGE_NAMES = ['Research', 'Story', 'Narration', 'Sound', 'Visuals', 'Assembly', 'Thumbnail', 'Publish'];
const STAGE_ICONS = ['🔍', '✍️', '🎙️', '🎵', '🖼️', '🎬', '🎨', '📋'];

const trendingTopics = [
  { topic: 'The collapse of the Ottoman Empire', niche: 'History', heat: 'Trending' },
  { topic: 'How fast fashion is destroying the environment', niche: 'Fashion', heat: 'Rising' },
  { topic: 'Why the middle class is disappearing', niche: 'Finance', heat: 'Hot' },
  { topic: 'The psychology of true crime addiction', niche: 'True Crime', heat: 'Trending' },
];

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
  const { channelProfile, hasProfile, loading: profileLoading } = useChannelProfile();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileLoading && !hasProfile) navigate('/onboarding');
  }, [profileLoading, hasProfile]);

  useEffect(() => {
    getEpisodes()
      .then(setEpisodes)
      .catch(console.error)
      .finally(() => setLoading(false));
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
    border: '1px solid #222',
    borderRadius: '12px',
    padding: '20px',
  };

  if (loading || profileLoading) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={{ fontSize: '13px', color: '#444' }}>Loading...</div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div style={{ padding: '32px 40px', width: '100%' }}>

        {/* Hero */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
            {getGreeting()}, {channelName} 👋
          </div>
          <div style={{ fontSize: '13px', color: '#555', marginBottom: '20px' }}>
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
              subColor: monthChange > 0 ? '#4ade80' : monthChange < 0 ? '#e03535' : '#444',
            },
            {
              value: episodes.length === 0 ? '0%' : `${Math.round((episodes.filter(e => e.status === 'complete').length / episodes.length) * 100)}%`,
              label: 'Completion Rate',
              sub: 'episodes finished',
            },
          ].map(s => (
            <div key={s.label} style={{
              background: '#1a1a1a',
              border: '1px solid #222',
              borderRadius: '10px',
              padding: '16px 18px',
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '11px', color: s.subColor || '#444' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

          {/* Recent Episodes */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Episodes</div>
              <Link to="/pipeline" style={{ fontSize: '11px', color: ACCENT, textDecoration: 'none', fontWeight: '600' }}>+ New</Link>
            </div>

            {episodes.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎬</div>
                <div style={{ fontSize: '14px', color: '#fff', fontWeight: '600', marginBottom: '6px' }}>No episodes yet</div>
                <div style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>Start your first video and see it here</div>
                <Link to="/pipeline" style={{ fontSize: '12px', color: ACCENT, textDecoration: 'none', fontWeight: '600' }}>
                  Start now →
                </Link>
              </div>
            ) : (
              episodes.slice(0, 6).map((ep, i) => (
                <div key={ep.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: i < Math.min(episodes.length, 6) - 1 ? '1px solid #222' : 'none',
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#fff', fontWeight: '500', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ep.title || 'Untitled'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#444' }}>
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
                    color: ep.status === 'complete' ? '#4ade80' : '#555',
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
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
              Recent Activity
            </div>

            {activityItems.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
                <div style={{ fontSize: '14px', color: '#fff', fontWeight: '600', marginBottom: '6px' }}>No activity yet</div>
                <div style={{ fontSize: '12px', color: '#555' }}>Your production activity will appear here</div>
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
                    <div style={{ fontSize: '11px', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.sub}
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#333', flexShrink: 0 }}>
                    {timeAgo(item.time)}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Weekly Goal */}
        {(() => {
          const weeklyTarget = 2;
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const episodesThisWeek = episodes.filter(ep => new Date(ep.created_at) >= weekStart);
          const pct = Math.min((episodesThisWeek.length / weeklyTarget) * 100, 100);
          const remaining = Math.max(weeklyTarget - episodesThisWeek.length, 0);

          return (
            <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Weekly Goal</div>
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
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trending Topics</div>
            <Link to="/trends" style={{ fontSize: '11px', color: ACCENT, textDecoration: 'none', fontWeight: '600' }}>See all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {trendingTopics.map((t, i) => (
              <Link
                key={i}
                to={`/pipeline?topic=${encodeURIComponent(t.topic)}`}
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #222',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textDecoration: 'none',
                  display: 'block',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.niche}</div>
                  <div style={{
                    fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                    background: t.heat === 'Hot' ? '#2a1515' : t.heat === 'Rising' ? '#1a1a2a' : '#1a2a1a',
                    color: t.heat === 'Hot' ? '#e03535' : t.heat === 'Rising' ? '#818cf8' : '#4ade80',
                  }}>
                    {t.heat}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#ccc', lineHeight: '1.4', fontWeight: '500' }}>{t.topic}</div>
                <div style={{ fontSize: '10px', color: '#444', marginTop: '8px' }}>Use in pipeline →</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Tips + Channel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

          {/* Tips */}
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Tips</div>
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
                  <div style={{ fontSize: '11px', color: '#555', lineHeight: '1.5' }}>{t.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Channel profile */}
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Channel</div>
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
                <div style={{ fontSize: '11px', color: '#444' }}>
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
                <span style={{ fontSize: '12px', color: '#555' }}>{row.label}</span>
                <span style={{ fontSize: '12px', color: '#ccc', fontWeight: '500', textTransform: 'capitalize' }}>{row.value}</span>
              </div>
            ))}
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
