import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getChannelStats, getChannelSnapshots, getEpisodes } from '../lib/api';
import AppLayout from '../components/ui/AppLayout';

const ACCENT = '#e03535';

const STAGE_NAMES = ['Research', 'Story', 'Narration', 'Sound', 'Visuals', 'Assembly', 'Thumbnail', 'Metadata'];

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n?.toLocaleString() ?? '—';
}

function StatCard({ value, label, sub, subColor }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px', padding: '16px 18px' }}>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: sub ? '4px' : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: subColor || '#444' }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
      {children}
    </div>
  );
}

function ChartCard({ title, children, height = 200 }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px', padding: '20px' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>{title}</div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '8px 12px', fontSize: '12px' }}>
      <div style={{ color: '#555', marginBottom: '4px' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: '600' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
};

export default function Stats() {
  const [snapshots, setSnapshots] = useState([]);
  const [liveStats, setLiveStats] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getChannelStats().catch(() => null),
      getChannelSnapshots().catch(() => []),
      getEpisodes().catch(() => []),
    ]).then(([stats, snaps, eps]) => {
      setLiveStats(stats);
      setSnapshots(snaps.map(s => ({
        ...s,
        date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      })));
      setEpisodes(eps);
    }).finally(() => setLoading(false));
  }, []);

  // Episodes per week (last 8 weeks)
  const episodesByWeek = (() => {
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const start = new Date(d); start.setDate(start.getDate() - start.getDay());
      const end = new Date(start); end.setDate(end.getDate() + 6);
      const count = episodes.filter(ep => {
        const c = new Date(ep.created_at);
        return c >= start && c <= end;
      }).length;
      weeks.push({
        week: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        episodes: count,
      });
    }
    return weeks;
  })();

  // Stage completion counts
  const stageCounts = STAGE_NAMES.map((name, i) => ({
    name,
    completed: episodes.filter(ep => (ep.completed_stages || []).includes(i)).length,
  }));

  // Total words written over time (cumulative by episode creation date)
  const wordsByDate = (() => {
    const sorted = [...episodes]
      .filter(ep => ep.stage_data?.[1]?.analysis?.wordCount && ep.created_at)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    let cumulative = 0;
    return sorted.map(ep => {
      cumulative += ep.stage_data[1].analysis.wordCount;
      return {
        date: new Date(ep.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        words: cumulative,
      };
    });
  })();

  const totalWords = episodes.reduce((acc, ep) => acc + (ep.stage_data?.[1]?.analysis?.wordCount || 0), 0);
  const completedEps = episodes.filter(e => e.status === 'complete').length;
  const completionRate = episodes.length ? Math.round((completedEps / episodes.length) * 100) : 0;

  if (loading) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={{ fontSize: '13px', color: '#444' }}>Loading...</div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div style={{ padding: '32px 40px', width: '100%' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>Stats</div>
        <div style={{ fontSize: '13px', color: '#555', marginBottom: '28px' }}>Channel performance and production analytics.</div>

        {/* Channel overview */}
        {liveStats && (
          <>
            <SectionLabel>YouTube Channel</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <StatCard value={fmt(liveStats.subscribers)} label="Subscribers" />
              <StatCard value={fmt(liveStats.total_views)} label="Total Views" />
              <StatCard value={fmt(liveStats.video_count)} label="Videos Published" />
            </div>

            {snapshots.length >= 2 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <ChartCard title="Subscribers Over Time" height={260}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={snapshots}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="subscribers" name="Subscribers" stroke={ACCENT} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Total Views Over Time" height={260}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={snapshots}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="total_views" name="Views" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            ) : (
              <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px', padding: '32px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>📈</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>Channel growth charts coming soon</div>
                  <div style={{ fontSize: '12px', color: '#444' }}>We're collecting your first snapshot today. Check back tomorrow to see your subscriber and view trends.</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Production stats */}
        <SectionLabel>Production</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <StatCard value={episodes.length} label="Total Episodes" sub={`${completedEps} complete`} />
          <StatCard value={`${completionRate}%`} label="Completion Rate" />
          <StatCard value={fmt(totalWords)} label="Words Written" />
          <StatCard
            value={episodes.length ? Math.round(episodes.reduce((a, ep) => a + (ep.completed_stages?.length || 0), 0) / episodes.length * 10) / 10 : 0}
            label="Avg Stages / Episode"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <ChartCard title="Episodes Per Week" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={episodesByWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="week" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="episodes" name="Episodes" fill={ACCENT} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Stage Completion Breakdown" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageCounts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} width={64} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="completed" name="Completed" fill="#3b82f6" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {wordsByDate.length >= 2 && (
          <ChartCard title="Cumulative Words Written" height={220}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wordsByDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={v => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="words" name="Words" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </AppLayout>
  );
}
