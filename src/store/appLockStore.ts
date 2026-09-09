import { create } from 'zustand';

interface AppLockState {
  /** true = se debe mostrar LockScreen (pedir contraseña de nuevo) antes de dejar ver la app. */
  isLocked: boolean;
  backgroundedAt: number | null;
  onBackground: () => void;
  /** @param thresholdMs si el tiempo en background superó este umbral, bloquea. */
  onForeground: (thresholdMs: number) => void;
  unlock: () => void;
  reset: () => void;
}

/**
 * Auto-lock por inactividad (AGENTS.md V3 sección 46): si la app pasó más de
 * `AUTO_LOCK_MINUTES` en background, al volver al foreground se exige
 * contraseña de nuevo — sin cerrar la sesión real (el token sigue siendo
 * válido, `LockScreen` solo la reconfirma). No usa biometría todavía: se
 * deja la arquitectura lista (ver `docs/` recomendación) para agregarla
 * después con `expo-local-authentication` sin tocar este store.
 */
export const useAppLockStore = create<AppLockState>((set, get) => ({
  isLocked: false,
  backgroundedAt: null,

  onBackground: () => set({ backgroundedAt: Date.now() }),

  onForeground: (thresholdMs) => {
    const { backgroundedAt } = get();
    const shouldLock = backgroundedAt !== null && Date.now() - backgroundedAt >= thresholdMs;
    set({ backgroundedAt: null, ...(shouldLock ? { isLocked: true } : null) });
  },

  unlock: () => set({ isLocked: false }),

  /** Al hacer logout: no queda esperando desbloqueo la próxima vez que alguien inicie sesión. */
  reset: () => set({ isLocked: false, backgroundedAt: null }),
}));
