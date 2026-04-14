import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getBilling, getChannelProfile } from '../../lib/api';

// Module-level cache so billing isn't re-fetched on every route change
let _billingCache = null;
let _billingCacheAt = 0;
const BILLING_CACHE_TTL = 60_000;

// Module-level cache for channel profile check (2.4 — onboarding redirect)
let _profileHasChannel = null; // null = unchecked, true = has profile, false = missing

export function invalidateBillingCache() {
  _billingCache = null;
  _billingCacheAt = 0;
}

export function invalidateProfileCache() {
  _profileHasChannel = null;
}

export default function ProtectedRoute({ children, requiresPlan = false }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(requiresPlan);
  const [activating, setActivating] = useState(false);
  const [profileChecked, setProfileChecked] = useState(_profileHasChannel !== null);
  const [hasProfile, setHasProfile] = useState(_profileHasChannel);

  const isStripeReturn = new URLSearchParams(location.search).get('subscription') === 'success';

  // Paths that should NOT redirect to onboarding even if profile is missing
  const onboardingExemptPaths = ['/onboarding', '/settings'];
  const isOnboardingExempt = onboardingExemptPaths.some(p => location.pathname.startsWith(p));

  const fetchBilling = () =>
    getBilling()
      .then(data => { _billingCache = data; _billingCacheAt = Date.now(); setBilling(data); return data; })
      .catch(() => { setBilling(null); return null; });

  useEffect(() => {
    if (!requiresPlan) {
      setBillingLoading(false);
      return;
    }
    if (!user) return;

    // Use fresh cache synchronously to avoid flicker
    if (_billingCache && Date.now() - _billingCacheAt < BILLING_CACHE_TTL) {
      setBilling(_billingCache);
      setBillingLoading(false);
      return;
    }
    fetchBilling().then(data => {
      const isActive = data?.subscription_status === 'active' || data?.subscription_status === 'trialing';
      if (!isActive && isStripeReturn) {
        setActivating(true);
        setTimeout(() => {
          fetchBilling().finally(() => { setActivating(false); setBillingLoading(false); });
        }, 4000);
      } else {
        setBillingLoading(false);
      }
    });
  }, [user, requiresPlan]);

  // 2.4 — Check channel profile once per session to redirect new users to onboarding
  useEffect(() => {
    if (!requiresPlan || !user || isOnboardingExempt) {
      if (!profileChecked) setProfileChecked(true);
      return;
    }
    if (_profileHasChannel !== null) {
      setHasProfile(_profileHasChannel);
      setProfileChecked(true);
      return;
    }
    getChannelProfile()
      .then(data => {
        const exists = !!(data?.channel_name);
        _profileHasChannel = exists;
        setHasProfile(exists);
        setProfileChecked(true);
      })
      .catch(() => {
        // On error, don't block — assume profile exists to avoid redirect loop
        _profileHasChannel = true;
        setHasProfile(true);
        setProfileChecked(true);
      });
  }, [user, requiresPlan, isOnboardingExempt]);

  if (authLoading || billingLoading || activating || (requiresPlan && !isOnboardingExempt && !profileChecked)) {
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
    if (!isActive) {
      // Free users who haven't used their free episode yet get access
      if (billing?.free_episode_used === false) {
        // fall through to allow access
      } else {
        let reason = 'no_plan';
        if (billing?.subscription_status === 'canceled') {
          reason = 'canceled';
        } else if (billing?.free_episode_used === true) {
          reason = 'free_used';
        }
        return <Navigate to={`/pricing?reason=${reason}`} replace />;
      }
    }

    // 2.4 — Redirect to onboarding if no channel profile (and not on exempt paths)
    if (!isOnboardingExempt && hasProfile === false) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return children;
}
