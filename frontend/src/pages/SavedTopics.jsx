import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSavedTopics, deleteSavedTopic } from '../lib/api';
import AppLayout from '../components/ui/AppLayout';

const ACCENT = '#e03535';

const COMPETITION_COLOR = { Low: '#4ade80', Medium: '#facc15', High: '#e03535' };

export default function SavedTopics() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSavedTopics()
      .then(setTopics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteSavedTopic(id);
      setTopics(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppLayout>
      <div style={{ padding: '32px 40px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>Saved Topics</div>
          <Link to="/trends" style={{ fontSize: '12px', color: '#555', textDecoration: 'none', padding: '7px 14px', border: '1px solid #2a2a2a', borderRadius: '6px' }}>
            Browse Trends →
          </Link>
        </div>
        <div style={{ fontSize: '13px', color: '#555', marginBottom: '24px' }}>Topics you've saved from trend research.</div>

        {loading ? (
          <div style={{ fontSize: '13px', color: '#444', padding: '40px 0' }}>Loading...</div>
        ) : topics.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔖</div>
            <div style={{ fontSize: '14px', color: '#fff', fontWeight: '600', marginBottom: '6px' }}>No saved topics yet</div>
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>Browse trending topics and save the ones you want to produce</div>
            <Link to="/trends" style={{ fontSize: '12px', color: ACCENT, textDecoration: 'none', fontWeight: '600' }}>Browse Trends →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topics.map(t => (
              <div key={t.id} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '6px' }}>{t.topic}</div>
                  {t.angle && <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', lineHeight: '1.5' }}>{t.angle}</div>}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {t.competition_level && (
                      <span style={{ fontSize: '10px', fontWeight: '700', color: COMPETITION_COLOR[t.competition_level] || '#555' }}>
                        {t.competition_level} competition
                      </span>
                    )}
                    {t.evidence_ratio && (
                      <span style={{ fontSize: '10px', color: '#444' }}>{t.evidence_ratio}x ratio</span>
                    )}
                    {t.evidence_views && (
                      <span style={{ fontSize: '10px', color: '#444' }}>{Number(t.evidence_views).toLocaleString()} views evidence</span>
                    )}
                    <span style={{ fontSize: '10px', color: '#333' }}>
                      Saved {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                  <Link
                    to="/pipeline"
                    state={{ topic: t.topic }}
                    style={{ fontSize: '11px', color: '#fff', textDecoration: 'none', padding: '6px 14px', background: ACCENT, borderRadius: '6px', fontWeight: '600' }}
                  >
                    Produce
                  </Link>
                  <button
                    onClick={() => handleDelete(t.id)}
                    style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '16px', padding: '4px', fontFamily: 'inherit', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
