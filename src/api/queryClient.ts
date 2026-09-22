import NetInfo from '@react-native-community/netinfo';
import { onlineManager, QueryClient } from '@tanstack/react-query';

import { setConnectivityProbe } from '@/utils/errors';

// `normalizeError` distingue "sin internet" de "servidor inalcanzable" con el
// mismo estado de red que ya usa React Query (NetInfo → onlineManager).
setConnectivityProbe(() => onlineManager.isOnline());

/**
 * Cliente de @tanstack/react-query. Se adoptó en esta iteración porque la
 * app ya tiene suficientes pantallas dependientes de las mismas fuentes
 * (dashboard/perfil/expediente comparten datos del colaborador,
 * solicitudes/vacaciones/documentos deben refrescarse entre sí) para que
 * el caching + invalidation centralizados valgan la complejidad frente al
 * patrón manual de `useState`/`useEffect` que tenía cada pantalla antes.
 *
 * `staleTime` por defecto 30s sirve para la mayoría (dashboard, expediente,
 * solicitudes, vacaciones); notificaciones usa un valor más corto y perfil
 * uno más largo directamente en su propio hook (ver `usePerfil`/
 * `useNotificaciones`) — V4 sección 68.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      // GET: 1 reintento automático ante error de red — nunca más, para no
      // hacer esperar al usuario frente a un servidor realmente caído.
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // POST/PUT/DELETE: nunca reintento automático — un reintento silencioso
      // podría duplicar una solicitud/documento ya creado (V4 sección 69).
      retry: 0,
    },
  },
});

/**
 * Conecta el estado de conexión real del dispositivo (NetInfo) con React
 * Query: mientras está offline, las queries no reintentan en bucle contra
 * un servidor inalcanzable, y en cuanto vuelve la conexión se refrescan
 * automáticamente las que quedaron "stale" (V4 sección 67, "reconnect:
 * refetch controlado" — lo resuelve la librería, no un listener manual).
 * `isInternetReachable` puede llegar `null` mientras se determina; solo se
 * marca offline cuando el dato es un `false` explícito.
 */
export function bindQueryClientToNetworkStatus(): () => void {
  return NetInfo.addEventListener((state) => {
    const online = state.isConnected !== false && state.isInternetReachable !== false;
    onlineManager.setOnline(online);
  });
}
