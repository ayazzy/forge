import { useState, useEffect } from 'react';
import { getChannelProfile } from '../lib/api';

export function useChannelProfile() {
  const [channelProfile, setChannelProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getChannelProfile();
      setChannelProfile(data);
      setHasProfile(!!(data?.is_configured));
    } catch (e) {
      console.error('Failed to load channel profile:', e);
    } finally {
      setLoading(false);
    }
  };

  return { channelProfile, hasProfile, loading, reload: loadProfile };
}
