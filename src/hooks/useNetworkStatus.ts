import { useNetInfo } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isOffline: boolean;
}

/**
 * `isConnected`/`isInternetReachable` pueden llegar `null` mientras el
 * sistema todavía determina el estado — solo se considera offline cuando
 * alguno es explícitamente `false`, para no mostrar el banner de golpe al
 * abrir la app antes de que NetInfo termine su primera medición.
 */
export function useNetworkStatus(): NetworkStatus {
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  return { isOffline };
}
