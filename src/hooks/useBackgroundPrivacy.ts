import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { AUTO_LOCK_MINUTES } from '@/constants/config';
import { useAppLockStore } from '@/store/appLockStore';

/**
 * Observa `AppState` mientras `enabled` es `true` (solo dentro de `(app)`):
 * registra cuándo la app pasa a background/inactive y, al volver a active,
 * decide si superó `AUTO_LOCK_MINUTES` (ver `appLockStore`). Devuelve el
 * estado actual para que el layout muestre `PrivacyOverlay` de inmediato al
 * salir de foreground (AGENTS.md V3 sección 45).
 */
export function useBackgroundPrivacy(enabled: boolean): AppStateStatus {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const onBackground = useAppLockStore((state) => state.onBackground);
  const onForeground = useAppLockStore((state) => state.onForeground);

  useEffect(() => {
    if (!enabled) return undefined;

    const subscription = AppState.addEventListener('change', (next) => {
      setAppState(next);
      if (next === 'background' || next === 'inactive') {
        onBackground();
      } else if (next === 'active') {
        onForeground(AUTO_LOCK_MINUTES * 60_000);
      }
    });

    return () => subscription.remove();
  }, [enabled, onBackground, onForeground]);

  return appState;
}
