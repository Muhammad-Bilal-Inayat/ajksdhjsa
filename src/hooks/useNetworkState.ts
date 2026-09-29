import { useState, useEffect } from 'react';
import { networkStateManager, NetworkStateInfo } from '../lib/networkStateManager';

/**
 * React Hook for real-time network connectivity and background sync queue state
 */
export function useNetworkState(): NetworkStateInfo {
  const [networkState, setNetworkState] = useState<NetworkStateInfo>(() =>
    networkStateManager.getState()
  );

  useEffect(() => {
    const unsubscribe = networkStateManager.subscribe((state) => {
      setNetworkState(state);
    });
    return unsubscribe;
  }, []);

  return networkState;
}
