import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const ENABLED_KEY_PREFIX = 'mrlana-biometric-enabled';
const PROMPTED_KEY_PREFIX = 'mrlana-biometric-prompted';
/** Llaves del esquema anterior (globales, sin cuenta). */
const LEGACY_ENABLED_KEY = 'mrlana-biometric-enabled';
const LEGACY_PROMPTED_KEY = 'mrlana-biometric-prompted';

function enabledKeyFor(userId: string | number): string {
  return `${ENABLED_KEY_PREFIX}:${userId}`;
}

function promptedKeyFor(userId: string | number): string {
  return `${PROMPTED_KEY_PREFIX}:${userId}`;
}

interface BiometricState {
  isLoading: boolean;
  /** El colaborador activó desbloqueo biométrico (Configuración → Seguridad, o el primer post-login). */
  enabled: boolean;
  /** Ya le ofrecimos activarla una vez — no se vuelve a insistir después del primer login (V4 sección 31). */
  hasBeenPrompted: boolean;
  /** Cuenta para la que `enabled`/`hasBeenPrompted` son válidos. */
  userId: string | number | null;
  load: (userId: string | number | null) => Promise<void>;
  setEnabled: (value: boolean) => Promise<void>;
  markPrompted: () => Promise<void>;
}

/**
 * Preferencia de desbloqueo biométrico — nunca guarda la contraseña (V4
 * sección 32): la biometría solo decide si `LockScreen` puede saltarse el
 * formulario de contraseña, la sesión sigue siendo el token de Sanctum ya
 * persistido en SecureStore por `authStore`.
 *
 * Persistida POR CUENTA (`mrlana-biometric-enabled:{userId}` /
 * `mrlana-biometric-prompted:{userId}`): antes las llaves eran globales para
 * todo el dispositivo y NUNCA se borraban en logout, así que si la cuenta A
 * activaba biometría en un teléfono compartido, la cuenta B heredaba esa
 * preferencia al iniciar sesión después — cualquier huella/rostro inscrito
 * en el sistema operativo podía desbloquear la sesión de B sin que B lo
 * hubiera pedido. Con la llave por cuenta esto ya no puede pasar, y sigue
 * sin borrarse en logout (no hace falta: cada cuenta tiene su propio
 * espacio). `load()` migra en limpio: la primera cuenta que lee sus llaves
 * y no encuentra nada adopta el valor de las llaves globales antiguas (si
 * existían) y esas llaves globales se borran, así no se reaplican después a
 * ninguna otra cuenta.
 */
export const useBiometricStore = create<BiometricState>((set, get) => ({
  isLoading: true,
  enabled: false,
  hasBeenPrompted: false,
  userId: null,

  async load(userId) {
    if (userId === null) {
      set({ enabled: false, hasBeenPrompted: false, isLoading: false, userId: null });
      return;
    }

    set({ isLoading: true, userId });
    try {
      let [enabled, prompted] = await Promise.all([
        SecureStore.getItemAsync(enabledKeyFor(userId)),
        SecureStore.getItemAsync(promptedKeyFor(userId)),
      ]);

      if (enabled === null && prompted === null) {
        const [legacyEnabled, legacyPrompted] = await Promise.all([
          SecureStore.getItemAsync(LEGACY_ENABLED_KEY),
          SecureStore.getItemAsync(LEGACY_PROMPTED_KEY),
        ]);
        if (legacyEnabled !== null || legacyPrompted !== null) {
          enabled = legacyEnabled;
          prompted = legacyPrompted;
          await Promise.all([
            legacyEnabled !== null ? SecureStore.setItemAsync(enabledKeyFor(userId), legacyEnabled) : Promise.resolve(),
            legacyPrompted !== null ? SecureStore.setItemAsync(promptedKeyFor(userId), legacyPrompted) : Promise.resolve(),
            SecureStore.deleteItemAsync(LEGACY_ENABLED_KEY),
            SecureStore.deleteItemAsync(LEGACY_PROMPTED_KEY),
          ]);
        }
      }

      if (get().userId !== userId) return;
      set({ enabled: enabled === 'true', hasBeenPrompted: prompted === 'true', isLoading: false });
    } catch {
      if (get().userId !== userId) return;
      set({ enabled: false, hasBeenPrompted: false, isLoading: false });
    }
  },

  async setEnabled(value) {
    const { userId } = get();
    set({ enabled: value });
    if (userId === null) return;
    try {
      await SecureStore.setItemAsync(enabledKeyFor(userId), value ? 'true' : 'false');
    } catch {
      // No crítico: en el peor caso vuelve a false la próxima sesión.
    }
  },

  async markPrompted() {
    const { userId } = get();
    set({ hasBeenPrompted: true });
    if (userId === null) return;
    try {
      await SecureStore.setItemAsync(promptedKeyFor(userId), 'true');
    } catch {
      // No crítico.
    }
  },
}));
