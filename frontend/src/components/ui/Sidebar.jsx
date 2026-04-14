import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAppData } from '../../context/AppDataContext';

const ACCENT = '#e03535';

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: '⬡' },
  { label: 'Pipeline', href: '/pipeline', icon: '◈' },
  { label: 'Episodes', href: '/episodes', icon: '▤' },
  { label: 'Trends', href: '/trends', icon: '↗' },
  { label: 'Saved Topics', href: '/saved-topics', icon: '🔖' },
  { label: 'Stats', href: '/stats', icon: '↯' },
  { label: 'Calendar', href: '/calendar', icon: '▦' },
  { label: 'Settings', href: '/settings', icon: '◎' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { channelProfile, billing, usage, hasPlan, planLabel } = useAppData();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={{
      width: '220px',
      background: '#171717',
      borderRight: '1px solid #222',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 50,
      flexShrink: 0,
    }}>

      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '3px', color: ACCENT }}>FORGE</div>
        {channelProfile?.channel_name && (
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {channelProfile.channel_name}
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ padding: '12px 0', flex: 1 }}>
        {NAV.map(item => {
          const active = location.pathname === item.href;
          const locked = hasPlan === false;
          return (
            <Link
              key={item.href}
              to={locked ? '/pricing' : item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                textDecoration: 'none',
                color: locked ? '#555' : active ? '#ffffff' : '#aaa',
                background: active && !locked ? 'rgba(224,53,53,0.06)' : 'transparent',
                borderLeft: active && !locked ? `3px solid ${ACCENT}` : '3px solid transparent',
                fontSize: '14px',
                fontWeight: active && !locked ? '600' : '400',
                transition: 'all 0.15s ease',
                cursor: locked ? 'default' : 'pointer',
              }}
            >
              <span style={{ fontSize: '14px', opacity: locked ? 0.3 : active ? 1 : 0.6 }}>{item.icon}</span>
              {item.label}
              {locked && <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#666' }}>🔒</span>}
            </Link>
          );
        })}

        {hasPlan === false && (
          <Link
            to="/pricing"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 16px',
              textDecoration: 'none',
              color: ACCENT,
              fontSize: '12px',
              fontWeight: '600',
              marginTop: '8px',
            }}
          >
            <span style={{ fontSize: '14px' }}>⚡</span>
            Upgrade to unlock
          </Link>
        )}
      </div>

      {/* Episode usage indicator — only for plan holders */}
      {hasPlan && billing && (
        <div style={{ padding: '0 20px 14px' }}>
          {(() => {
            const used = billing.monthly_used ?? 0;
            const limit = billing.monthly_limit ?? 0;
            const purchased = billing.purchased_credits ?? 0;
            const remaining = billing.monthly_remaining ?? 0;
            const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
            const barColor = pct > 90 ? '#e03535' : pct > 70 ? '#d97706' : '#444';
            const outOfEpisodes = remaining === 0 && purchased === 0;
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#666' }}>Episodes</span>
                  <span style={{ fontSize: '10px', color: outOfEpisodes ? '#e03535' : '#555', fontWeight: outOfEpisodes ? '600' : '400' }}>
                    {used} / {limit}
                  </span>
                </div>
                <div style={{ height: '3px', background: '#252525', borderRadius: '2px', marginBottom: '5px' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                </div>
                {purchased > 0 && (
                  <div style={{ fontSize: '10px', color: '#555' }}>+ {purchased} purchased</div>
                )}
                {outOfEpisodes && (
                  <Link to="/pricing" style={{ fontSize: '10px', color: '#e03535', textDecoration: 'none', display: 'block', marginTop: '2px' }}>
                    Buy more →
                  </Link>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Bottom — channel avatar + sign out */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: ACCENT, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '12px', fontWeight: '700',
            color: '#fff', flexShrink: 0,
          }}>
            {channelProfile?.channel_name?.[0]?.toUpperCase() || 'F'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', color: '#fff', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {channelProfile?.channel_name || 'My Channel'}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '3px',
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px', padding: '2px 8px',
            }}>
              {hasPlan && planLabel && (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: '11px', color: hasPlan ? '#aaa' : '#777' }}>
                {hasPlan === null ? '…' : planLabel || 'No plan active'}
              </span>
              {!hasPlan && hasPlan !== null && (
                <Link to="/pricing" style={{ fontSize: '10px', color: ACCENT, textDecoration: 'none', fontWeight: '600' }}>Upgrade →</Link>
              )}
            </div>
            {/* 2.6 — Trial expiration warning */}
            {(() => {
              const status = billing?.subscription_status;
              const trialEnd = billing?.trial_ends_at;
              if (status !== 'trialing' || !trialEnd) return null;
              const daysLeft = Math.max(0, Math.ceil((new Date(trialEnd) - new Date()) / (1000 * 60 * 60 * 24)));
              if (daysLeft > 3) return null;
              const isUrgent = daysLeft <= 1;
              const bg = isUrgent ? 'rgba(224,53,53,0.15)' : 'rgba(217,119,6,0.15)';
              const color = isUrgent ? '#e03535' : '#d97706';
              const text = daysLeft === 0 ? 'Trial ends today' : `Trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
              return (
                <Link to="/pricing" style={{ textDecoration: 'none' }}>
                  <div style={{ marginTop: '4px', background: bg, borderRadius: '6px', padding: '3px 8px', fontSize: '10px', color, fontWeight: '600' }}>
                    ⚠ {text}
                  </div>
                </Link>
              );
            })()}
          </div>
        </div>
        {/* Mini usage meters */}
        {usage && (
          <div style={{ marginBottom: '14px' }}>
            {[
              { key: 'claude_calls',          limitKey: 'claude_calls',          label: 'AI' },
              { key: 'elevenlabs_characters',  limitKey: 'elevenlabs_characters', label: 'Voice' },
              { key: 'ideogram_generations',   limitKey: 'ideogram_generations',  label: 'Images' },
            ].map(m => {
              const FALLBACK = { claude_calls: 300, elevenlabs_characters: 75000, ideogram_generations: 50 };
              const used = usage[m.key] || 0;
              const limit = usage?.limits?.[m.limitKey] || FALLBACK[m.limitKey];
              const pct = Math.min((used / limit) * 100, 100);
              const color = pct > 90 ? '#e03535' : pct > 70 ? '#d97706' : '#444';
              return (
                <div key={m.key} style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '10px', color: '#666' }}>{m.label}</span>
                    <span style={{ fontSize: '10px', color: pct > 90 ? '#e03535' : '#555' }}>
                      {pct > 90 ? 'Almost full' : `${Math.round(pct)}%`}
                    </span>
                  </div>
                  <div style={{ height: '2px', background: '#252525', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              );
            })}
            <Link to="/settings#plan-usage" style={{ fontSize: '10px', color: '#555', textDecoration: 'none', marginTop: '4px', display: 'block' }}>
              View usage →
            </Link>
          </div>
        )}

        <button
          onClick={handleSignOut}
          style={{
            background: 'none', border: 'none', color: '#888',
            fontSize: '12px', cursor: 'pointer', padding: 0,
            fontFamily: 'inherit',
          }}
        >
          Sign out
        </button>
      </div>

    </div>
  );
}
