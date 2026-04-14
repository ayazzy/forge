import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getBilling, getUsage, getChannelProfile } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const { user } = useAuth();
  const [channelProfile, setChannelProfile] = useState(null);
  const [billing, setBilling] = useState(null);
  const [usage, setUsage] = useState(null);
  const [hasPlan, setHasPlan] = useState(null);
  const [planLabel, setPlanLabel] = useState(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    try {
      const [profileData, billingData, usageData] = await Promise.all([
        getChannelProfile().catch(() => null),
        getBilling().catch(() => null),
        getUsage().catch(() => null),
      ]);

      if (profileData !== null) setChannelProfile(profileData);

      if (billingData !== null) {
        const active = billingData?.subscription_status === 'active' || billingData?.subscription_status === 'trialing';
        setHasPlan(active);
        if (active) {
          const name = billingData?.plan;
          setPlanLabel(name ? `${name.charAt(0).toUpperCase() + name.slice(1)} plan` : 'Active plan');
        } else {
          setHasPlan(false);
          setPlanLabel(null);
        }
        setBilling(billingData);
      } else {
        setHasPlan(false);
        setPlanLabel(null);
      }

      if (usageData !== null) setUsage(usageData);
    } catch {
      setHasPlan(false);
      setPlanLabel(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setChannelProfile(null);
      setBilling(null);
      setUsage(null);
      setHasPlan(null);
      setPlanLabel(null);
      return;
    }
    loadAll();
  }, [user, loadAll]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const data = await getChannelProfile().catch(() => null);
    if (data !== null) setChannelProfile(data);
  }, [user]);

  const refreshBilling = useCallback(async () => {
    if (!user) return;
    const data = await getBilling().catch(() => null);
    if (data !== null) {
      const active = data?.subscription_status === 'active' || data?.subscription_status === 'trialing';
      setHasPlan(active);
      if (active) {
        const name = data?.plan;
        setPlanLabel(name ? `${name.charAt(0).toUpperCase() + name.slice(1)} plan` : 'Active plan');
      } else {
        setHasPlan(false);
        setPlanLabel(null);
      }
      setBilling(data);
    }
  }, [user]);

  const refreshUsage = useCallback(async () => {
    if (!user) return;
    const data = await getUsage().catch(() => null);
    if (data !== null) setUsage(data);
  }, [user]);

  return (
    <AppDataContext.Provider value={{
      channelProfile, billing, usage, hasPlan, planLabel,
      refreshProfile, refreshBilling, refreshUsage, refreshAll: loadAll,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
