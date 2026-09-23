/**
 * Tap de un push (foreground, background o cold start) → `openPushTarget`:
 * encola la navegación, cambia de experiencia cuando corresponde y NUNCA
 * abre el recurso de otra cuenta que usó el teléfono antes.
 */
import { openPushTarget } from '../useNotificationResponseRouting';

import { useAuthStore } from '@/store/authStore';
import { useExperienceStore } from '@/store/experienceStore';
import { usePendingNavigationStore } from '@/store/pendingNavigationStore';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

function loginAs(id: number) {
  useAuthStore.setState({ user: { id, nombre: 'X' } as never, isAuthenticated: true, token: 't', isInitializing: false });
}

beforeEach(() => {
  usePendingNavigationStore.setState({ pending: null });
  useExperienceStore.setState({ experience: 'colaborador', isLoading: false });
});

describe('openPushTarget', () => {
  it('push RH de la cuenta actual: cambia a Gestión RH y encola el detalle', () => {
    loginAs(5);
    openPushTarget({ type: 'rh_solicitud', resource_id: 184, user_id: 5 });
    expect(useExperienceStore.getState().experience).toBe('rh');
    expect(usePendingNavigationStore.getState().pending).toEqual({ route: '/(app)/rh/solicitudes/184', experience: 'rh' });
  });

  it('cuenta A → logout → cuenta B: un push de A no abre su recurso (cae en notificaciones)', () => {
    loginAs(5);
    useAuthStore.setState({ user: null, isAuthenticated: false, token: null });
    loginAs(9);

    openPushTarget({ type: 'solicitud', resource_id: 77, user_id: 5 });
    expect(usePendingNavigationStore.getState().pending).toEqual({ route: '/notificaciones', experience: null });
    // Ni siquiera cambia de experiencia por un push ajeno.
    expect(useExperienceStore.getState().experience).toBe('colaborador');
  });

  it('push sin sesión nunca abre un recurso con user_id', () => {
    useAuthStore.setState({ user: null, isAuthenticated: false, token: null });
    openPushTarget({ type: 'rh_documento', resource_id: 3, user_id: 5 });
    expect(usePendingNavigationStore.getState().pending).toEqual({ route: '/notificaciones', experience: null });
  });

  it('tipo desconocido: centro de notificaciones, nunca una ruta inventada', () => {
    loginAs(5);
    openPushTarget({ type: 'algo_nuevo', resource_id: 1, user_id: 5 });
    expect(usePendingNavigationStore.getState().pending).toEqual({ route: '/notificaciones', experience: null });
  });

  it('muro de cumpleaños: ruta compartida, no cambia de experiencia', () => {
    loginAs(5);
    useExperienceStore.setState({ experience: 'rh' });
    openPushTarget({ type: 'cumpleanos_muro', resource_id: 12, user_id: 5 });
    expect(usePendingNavigationStore.getState().pending).toEqual({ route: '/muro-cumpleanos/12', experience: null });
    expect(useExperienceStore.getState().experience).toBe('rh');
  });
});
