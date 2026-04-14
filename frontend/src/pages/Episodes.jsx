import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEpisodes, deleteEpisode } from '../lib/api';
import AppLayout from '../components/ui/AppLayout';

const ACCENT = '#e03535';
const STAGE_NAMES = ['Research', 'Story', 'Narration', 'Sound', 'Visuals', 'Assembly', 'Thumbnail', 'Metadata'];

export default function Episodes() {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | draft | complete
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    getEpisodes()
      .then(setEpisodes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = episodes.filter(ep => {
    if (filter === 'all') return true;
    return ep.status === filter;
  });

  const handleDelete = async (id) => {
    if (!confirm('Delete this episode? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteEpisode(id);
      setEpisodes(prev => prev.filter(ep => ep.id !== id));
    } catch (e) {
      alert('Failed to delete episode.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AppLayout>
      <div style={{ padding: '32px 40px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>Episodes</div>
          <Link to="/pipeline" style={{ background: ACCENT, color: '#fff', padding: '8px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}>
            + New Episode
          </Link>
        </div>
        <div style={{ fontSize: '13px', color: '#555', marginBottom: '24px' }}>All episodes across your production pipeline.</div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
          {[
            { key: 'all', label: `All (${episodes.length})` },
            { key: 'draft', label: `In Progress (${episodes.filter(e => e.status === 'draft').length})` },
            { key: 'complete', label: `Complete (${episodes.filter(e => e.status === 'complete').length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              style={{
                background: filter === t.key ? '#2a2a2a' : 'none',
                border: filter === t.key ? '1px solid #333' : '1px solid transparent',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                color: filter === t.key ? '#fff' : '#555',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: filter === t.key ? '600' : '400',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ fontSize: '13px', color: '#444', padding: '40px 0' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎬</div>
            <div style={{ fontSize: '14px', color: '#fff', fontWeight: '600', marginBottom: '6px' }}>No episodes yet</div>
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>Start your first video in the pipeline</div>
            <Link to="/pipeline" style={{ fontSize: '12px', color: ACCENT, textDecoration: 'none', fontWeight: '600' }}>Start now →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(ep => {
              const words = ep.stage_data?.[1]?.analysis?.wordCount;
              const completed = ep.completed_stages || [];
              const progress = Math.round((completed.length / 8) * 100);
              return (
                <div key={ep.id} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ep.title || 'Untitled'}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: '#444' }}>{new Date(ep.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      {words > 0 && <span style={{ fontSize: '11px', color: '#444' }}>{words.toLocaleString()} words</span>}
                      <span style={{ fontSize: '11px', color: '#444' }}>Stage {ep.active_stage}/8</span>
                    </div>
                    {/* Stage progress dots */}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                      {STAGE_NAMES.map((name, i) => (
                        <div
                          key={i}
                          title={name}
                          style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: completed.includes(i) ? ACCENT : ep.active_stage === i ? '#555' : '#2a2a2a',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{progress}%</div>
                      <div style={{ fontSize: '10px', color: '#444' }}>complete</div>
                    </div>
                    <div style={{
                      fontSize: '9px', fontWeight: '700', letterSpacing: '0.5px',
                      padding: '3px 8px', borderRadius: '20px',
                      background: ep.status === 'complete' ? '#0a2a1a' : '#1e1e1e',
                      color: ep.status === 'complete' ? '#4ade80' : '#555',
                      border: `1px solid ${ep.status === 'complete' ? '#14532d' : '#2a2a2a'}`,
                      textTransform: 'uppercase',
                    }}>
                      {ep.status}
                    </div>
                    <Link
                      to="/pipeline"
                      state={{ episodeId: ep.id }}
                      style={{ fontSize: '11px', color: '#555', textDecoration: 'none', padding: '4px 10px', border: '1px solid #2a2a2a', borderRadius: '6px' }}
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => handleDelete(ep.id)}
                      disabled={deleting === ep.id}
                      style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '14px', padding: '4px', fontFamily: 'inherit' }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
