import { create } from 'zustand';

interface AppLockState {
  /** true = se debe mostrar LockScreen (pedir contraseña de nuevo) antes de dejar ver la app. */
  isLocked: boolean;
  backgroundedAt: number | null;
  onBackground: () => void;
  /** @param thresholdMs si el tiempo en background superó este umbral, bloquea. */
  onForeground: (thresholdMs: number) => void;
  /** Fuerza el bloqueo (arranque en frío con sesión restaurada — ver `authStore.restoreSession()`). */
  lock: () => void;
  unlock: () => void;
  reset: () => void;
}

/**
 * Auto-lock por inactividad (AGENTS.md V3 sección 46): si la app pasó más de
 * `AUTO_LOCK_MINUTES` en background, al volver al foreground se exige
 * contraseña/biometría de nuevo — sin cerrar la sesión real (el token sigue
 * siendo válido, `LockScreen`/`POST /reautenticar` solo la reconfirman).
 *
 * Este store es puramente en memoria (Zustand sin `persist`), lo cual es
 * intencional para el caso "app en segundo plano dentro del mismo proceso":
 * `useBackgroundPrivacy` compara `backgroundedAt` contra `AUTO_LOCK_MINUTES`
 * con `AppState`. Pero un proceso matado por el SO (o cerrado a mano) pierde
 * TODO el estado en memoria al arrancar de nuevo — por diseño no se intenta
 * reconstruir cuánto tiempo estuvo cerrada la app: `authStore.restoreSession()`
 * llama a `lock()` cada vez que arranca la app y encuentra una sesión ya
 * guardada (arranque en frío), sin importar el tiempo transcurrido. Un login
 * interactivo recién hecho (`authStore.login()`) NUNCA pasa por aquí, así
 * que no se pide desbloquear justo después de escribir la contraseña.
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

  lock: () => set({ isLocked: true, backgroundedAt: null }),

  unlock: () => set({ isLocked: false }),

  /** Al hacer logout: no queda esperando desbloqueo la próxima vez que alguien inicie sesión. */
  reset: () => set({ isLocked: false, backgroundedAt: null }),
}));
