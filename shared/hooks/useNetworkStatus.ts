import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export type NetworkStatus = {
  isConnected: boolean;
  isInternetReachable: boolean;
  // True once NetInfo has reported real connectivity at least once; false on
  // the optimistic initial render so consumers can distinguish "unknown yet"
  // from "confirmed disconnected".
  isReady: boolean;
};

const toNetworkStatus = (state: NetInfoState): NetworkStatus => ({
  isConnected: state.isConnected ?? false,
  isInternetReachable: state.isInternetReachable ?? false,
  isReady: true
});

export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    isReady: false
  });

  useEffect(() => {
    let isMounted = true;

    const setFromState = (state: NetInfoState) => {
      if (!isMounted) {
        return;
      }

      setNetworkStatus(toNetworkStatus(state));
    };

    NetInfo.fetch().then(setFromState);

    const unsubscribe = NetInfo.addEventListener(setFromState);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return networkStatus;
};
