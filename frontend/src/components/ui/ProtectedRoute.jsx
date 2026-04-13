import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getBilling } from '../../lib/api';

// Module-level cache so billing isn't re-fetched on every route change
let _billingCache = null;
let _billingCacheAt = 0;
const CACHE_TTL = 60_000;

export function invalidateBillingCache() {
  _billingCache = null;
  _billingCacheAt = 0;
}

export default function ProtectedRoute({ children, requiresPlan = false }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  // Always start loading when requiresPlan — never render children before billing is confirmed
  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(requiresPlan);
  const [activating, setActivating] = useState(false);

  const isStripeReturn = new URLSearchParams(location.search).get('subscription') === 'success';

  const fetchBilling = () =>
    getBilling()
      .then(data => { _billingCache = data; _billingCacheAt = Date.now(); setBilling(data); return data; })
      .catch(() => { setBilling(null); return null; });

  useEffect(() => {
    if (!requiresPlan || !user) {
      setBillingLoading(false);
      return;
    }
    // Use fresh cache synchronously to avoid a flicker
    if (_billingCache && Date.now() - _billingCacheAt < CACHE_TTL) {
      setBilling(_billingCache);
      setBillingLoading(false);
      return;
    }
    // Fetch fresh billing
    fetchBilling().then(data => {
      const isActive = data?.subscription_status === 'active' || data?.subscription_status === 'trialing';
      if (!isActive && isStripeReturn) {
        // Stripe webhook may not have fired yet — retry once after 4 seconds
        setActivating(true);
        setTimeout(() => {
          fetchBilling().finally(() => { setActivating(false); setBillingLoading(false); });
        }, 4000);
      } else {
        setBillingLoading(false);
      }
    });
  }, [user, requiresPlan]);

  if (authLoading || billingLoading || activating) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #333', borderTopColor: '#e03535', animation: 'spin 0.7s linear infinite' }} />
        {activating && <div style={{ fontSize: '12px', color: '#555' }}>Activating your plan…</div>}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requiresPlan) {
    const isActive = billing?.subscription_status === 'active' || billing?.subscription_status === 'trialing';
    if (!isActive) return <Navigate to="/pricing" replace />;
  }

  return children;
}
