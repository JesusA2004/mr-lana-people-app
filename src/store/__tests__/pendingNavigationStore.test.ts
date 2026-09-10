import { clearPendingPushNavigation, setPendingPushNavigation, usePendingNavigationStore } from '../pendingNavigationStore';

describe('usePendingNavigationStore', () => {
  beforeEach(() => {
    usePendingNavigationStore.setState({ pending: null });
  });

  it('encola una navegación pendiente', () => {
    setPendingPushNavigation({ route: '/(app)/rh/solicitudes/9', experience: 'rh' });
    expect(usePendingNavigationStore.getState().pending).toEqual({ route: '/(app)/rh/solicitudes/9', experience: 'rh' });
  });

  it('limpia la navegación pendiente (ej. al cerrar sesión)', () => {
    setPendingPushNavigation({ route: '/notificaciones', experience: null });
    clearPendingPushNavigation();
    expect(usePendingNavigationStore.getState().pending).toBeNull();
  });

  it('una nueva navegación reemplaza cualquier pendiente anterior sin resolver', () => {
    setPendingPushNavigation({ route: '/solicitud/1', experience: 'colaborador' });
    setPendingPushNavigation({ route: '/(app)/rh/(tabs)/pendientes', experience: 'rh' });
    expect(usePendingNavigationStore.getState().pending).toEqual({ route: '/(app)/rh/(tabs)/pendientes', experience: 'rh' });
  });
});
