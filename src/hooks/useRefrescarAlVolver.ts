import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Llama `refrescar` cuando la app vuelve a primer plano (background →
 * active). Para badges que deben sentirse al día al regresar (aprobaciones,
 * correcciones), sin activar `refetchOnWindowFocus` en toda la app.
 */
export function useRefrescarAlVolver(refrescar: () => void, enabled = true): void {
  const ultimo = useRef(refrescar);
  useEffect(() => {
    ultimo.current = refrescar;
  }, [refrescar]);

  useEffect(() => {
    if (!enabled) return undefined;
    let estado: AppStateStatus = AppState.currentState;
    const sub = AppState.addEventListener('change', (siguiente) => {
      if (estado !== 'active' && siguiente === 'active') ultimo.current();
      estado = siguiente;
    });
    return () => sub.remove();
  }, [enabled]);
}
