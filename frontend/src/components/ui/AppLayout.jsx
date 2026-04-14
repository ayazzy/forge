import { useState } from 'react';
import Sidebar from './Sidebar';
import { useAppData } from '../../context/AppDataContext';
import { createPortalSession } from '../../lib/api';

export default function AppLayout({ children }) {
  const { billing } = useAppData();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // 2.6 — Trial expiration banner (within 24 hours)
  const showTrialBanner = (() => {
    if (bannerDismissed) return false;
    const status = billing?.subscription_status;
    const trialEnd = billing?.trial_ends_at;
    if (status !== 'trialing' || !trialEnd) return false;
    const hoursLeft = (new Date(trialEnd) - new Date()) / (1000 * 60 * 60);
    return hoursLeft <= 24 && hoursLeft > -1;
  })();

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (e) {
      console.error(e);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#111' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', width: 'calc(100vw - 220px)', overflowX: 'hidden' }}>
        {showTrialBanner && (
          <div style={{
            background: '#e03535',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            color: '#fff',
          }}>
            <span style={{ flex: 1 }}>
              <strong>Your trial ends today.</strong> Add a payment method to keep your access.
            </span>
            <button
              onClick={handleOpenPortal}
              disabled={portalLoading}
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {portalLoading ? 'Loading…' : 'Manage billing →'}
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '18px', padding: '0', lineHeight: '1', fontFamily: 'inherit' }}
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
