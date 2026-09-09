import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const BIOMETRIC_ENABLED_KEY = 'mrlana-biometric-enabled';
const BIOMETRIC_PROMPTED_KEY = 'mrlana-biometric-prompted';

interface BiometricState {
  isLoading: boolean;
  /** El colaborador activó desbloqueo biométrico (Configuración → Seguridad, o el primer post-login). */
  enabled: boolean;
  /** Ya le ofrecimos activarla una vez — no se vuelve a insistir después del primer login (V4 sección 31). */
  hasBeenPrompted: boolean;
  load: () => Promise<void>;
  setEnabled: (value: boolean) => Promise<void>;
  markPrompted: () => Promise<void>;
}

/**
 * Preferencia de desbloqueo biométrico — nunca guarda la contraseña (V4
 * sección 32): la biometría solo decide si `LockScreen` puede saltarse el
 * formulario de contraseña, la sesión sigue siendo el token de Sanctum ya
 * persistido en SecureStore por `authStore`.
 */
export const useBiometricStore = create<BiometricState>((set) => ({
  isLoading: true,
  enabled: false,
  hasBeenPrompted: false,

  async load() {
    try {
      const [enabled, prompted] = await Promise.all([
        SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY),
        SecureStore.getItemAsync(BIOMETRIC_PROMPTED_KEY),
      ]);
      set({ enabled: enabled === 'true', hasBeenPrompted: prompted === 'true', isLoading: false });
    } catch {
      set({ enabled: false, hasBeenPrompted: false, isLoading: false });
    }
  },

  async setEnabled(value) {
    set({ enabled: value });
    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, value ? 'true' : 'false');
    } catch {
      // No crítico: en el peor caso vuelve a false la próxima sesión.
    }
  },

  async markPrompted() {
    set({ hasBeenPrompted: true });
    try {
      await SecureStore.setItemAsync(BIOMETRIC_PROMPTED_KEY, 'true');
    } catch {
      // No crítico.
    }
  },
}));
