import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { PushNotificationData } from '@/types/pushNotification';

const LAST_REGISTERED_AT_KEY = 'mrlana-push-last-registered-at';

export type PushPermissionState = 'granted' | 'provisional' | 'denied' | 'undetermined' | 'unsupported' | 'unknown';

export interface LastPushReceived {
  type: string | null;
  resourceId: string | null;
  relatedType: string | null;
  accion: string | null;
  at: string;
  /** `foreground` (llegó con la app abierta) o `response` (la persona la tocó). */
  via: 'foreground' | 'response';
}

interface PushDiagnosticsState {
  permission: PushPermissionState;
  /** Token Expo COMPLETO solo en memoria (para "Copiar token" en __DEV__). Nunca se loggea. */
  token: string | null;
  projectId: string | null;
  lastRegisteredAt: string | null;
  lastError: string | null;
  lastPushReceived: LastPushReceived | null;
  setPermission: (permission: PushPermissionState) => void;
  setProjectId: (projectId: string | null) => void;
  setRegistered: (token: string, projectId: string) => void;
  setError: (message: string | null) => void;
  recordPush: (data: PushNotificationData | undefined, via: LastPushReceived['via']) => void;
  loadPersisted: () => Promise<void>;
  /** "Limpiar diagnóstico local": borra historial (error, último push, fecha) SIN olvidar el token (se necesita para revocarlo al cerrar sesión). */
  clearDiagnostics: () => void;
  reset: () => void;
}

/**
 * Diagnóstico local de push (AGENTS: "analytics técnicos sin tracking
 * invasivo"): nada sale del dispositivo, no guarda PII ni el Bearer — solo
 * estado del permiso, cuándo se registró el token por última vez y el tipo
 * del último push. Alimenta la pantalla `__DEV__` "Diagnóstico Push" y la
 * fila de Notificaciones en Configuración.
 */
export const usePushDiagnosticsStore = create<PushDiagnosticsState>((set) => ({
  permission: 'unknown',
  token: null,
  projectId: null,
  lastRegisteredAt: null,
  lastError: null,
  lastPushReceived: null,

  setPermission: (permission) => set({ permission }),

  setProjectId: (projectId) => set({ projectId }),

  setRegistered: (token, projectId) => {
    const at = new Date().toISOString();
    set({ token, projectId, lastRegisteredAt: at, lastError: null });
    void SecureStore.setItemAsync(LAST_REGISTERED_AT_KEY, at).catch(() => {});
  },

  setError: (message) => set({ lastError: message }),

  recordPush: (data, via) =>
    set({
      lastPushReceived: {
        type: typeof data?.type === 'string' ? data.type : null,
        resourceId: data?.resource_id !== undefined && data?.resource_id !== null ? String(data.resource_id) : null,
        relatedType: typeof data?.related_type === 'string' ? data.related_type : null,
        accion: typeof data?.accion === 'string' ? data.accion : null,
        at: new Date().toISOString(),
        via,
      },
    }),

  async loadPersisted() {
    try {
      const at = await SecureStore.getItemAsync(LAST_REGISTERED_AT_KEY);
      if (at) set({ lastRegisteredAt: at });
    } catch {
      // Diagnóstico no crítico.
    }
  },

  clearDiagnostics: () => {
    set({ lastRegisteredAt: null, lastError: null, lastPushReceived: null });
    void SecureStore.deleteItemAsync(LAST_REGISTERED_AT_KEY).catch(() => {});
  },

  reset: () => {
    set({ token: null, lastRegisteredAt: null, lastError: null, lastPushReceived: null });
    void SecureStore.deleteItemAsync(LAST_REGISTERED_AT_KEY).catch(() => {});
  },
}));

/** "ExponentPushToken[abcd…wxyz]" → nunca se muestra el token completo en pantalla. */
export function maskPushToken(token: string | null | undefined): string {
  if (!token) return '—';
  const match = /^(ExponentPushToken|ExpoPushToken)\[(.+)\]$/.exec(token);
  const prefix = match ? match[1] : '';
  const body = match ? match[2] : token;
  if (body.length <= 8) return match ? `${prefix}[••••]` : '••••';
  const masked = `${body.slice(0, 4)}…${body.slice(-4)}`;
  return match ? `${prefix}[${masked}]` : masked;
}
