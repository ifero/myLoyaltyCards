import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export type NetworkStatus = {
  isConnected: boolean;
  isInternetReachable: boolean;
};

const toNetworkStatus = (state: NetInfoState): NetworkStatus => ({
  isConnected: state.isConnected ?? false,
  isInternetReachable: state.isInternetReachable ?? false
});

export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true
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
