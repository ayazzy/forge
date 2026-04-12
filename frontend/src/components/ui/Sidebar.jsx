import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useChannelProfile } from '../../hooks/useChannelProfile';

const ACCENT = '#e03535';

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: '⬡' },
  { label: 'Pipeline', href: '/pipeline', icon: '◈' },
  { label: 'Trends', href: '/trends', icon: '↗' },
  { label: 'Settings', href: '/settings', icon: '◎' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { channelProfile } = useChannelProfile();

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
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #222' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '2px', color: ACCENT }}>FORGE</div>
        {channelProfile?.channel_name && (
          <div style={{ fontSize: '11px', color: '#444', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {channelProfile.channel_name}
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ padding: '12px 0', flex: 1 }}>
        {NAV.map(item => {
          const active = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 20px',
                textDecoration: 'none',
                color: active ? '#ffffff' : '#555',
                background: active ? '#222' : 'transparent',
                borderLeft: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                fontSize: '13px',
                fontWeight: active ? '600' : '400',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '14px', opacity: active ? 1 : 0.6 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Bottom — channel avatar + sign out */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #222' }}>
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
            <div style={{ fontSize: '10px', color: '#444' }}>Free plan</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none', border: 'none', color: '#444',
            fontSize: '11px', cursor: 'pointer', padding: 0,
            fontFamily: 'inherit',
          }}
        >
          Sign out
        </button>
      </div>

    </div>
  );
}
