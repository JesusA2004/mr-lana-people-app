import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente de @tanstack/react-query. Se adoptó en esta iteración porque la
 * app ya tiene suficientes pantallas dependientes de las mismas fuentes
 * (dashboard/perfil/expediente comparten datos del colaborador,
 * solicitudes/vacaciones/documentos deben refrescarse entre sí) para que
 * el caching + invalidation centralizados valgan la complejidad frente al
 * patrón manual de `useState`/`useEffect` que tenía cada pantalla antes.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
