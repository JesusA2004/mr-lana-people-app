import { useOnboardingStore } from '../onboardingStore';

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  __esModule: true,
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

describe('useOnboardingStore (onboarding global por instalación)', () => {
  beforeEach(() => {
    mockStore.clear();
    useOnboardingStore.setState({ isLoading: true, completed: false });
  });

  it('instalación nueva: no hay onboarding que mostrar y no queda cargando', async () => {
    await useOnboardingStore.getState().load(null);
    expect(useOnboardingStore.getState()).toMatchObject({ isLoading: false, completed: false });
  });

  it('complete() persiste bajo la llave global (sin usuario)', async () => {
    await useOnboardingStore.getState().load('user-A');
    await useOnboardingStore.getState().complete();

    expect(mockStore.get('mrlana-onboarding-completed')).toBe('true');
    expect(useOnboardingStore.getState().completed).toBe(true);
  });

  it('el onboarding completado por una cuenta NO vuelve a aparecer al cambiar de cuenta en el mismo dispositivo', async () => {
    await useOnboardingStore.getState().load('user-A');
    await useOnboardingStore.getState().complete();
    expect(useOnboardingStore.getState().completed).toBe(true);

    // logout → login de un usuario distinto en el mismo teléfono: la llave es global, sigue completada.
    useOnboardingStore.setState({ isLoading: true, completed: false });
    await useOnboardingStore.getState().load('user-B');
    expect(useOnboardingStore.getState().completed).toBe(true);
  });

  it('migración limpia: adopta la llave antigua por usuario si la global todavía no existe', async () => {
    mockStore.set('mrlana-onboarding-completed:user-A', 'true');

    await useOnboardingStore.getState().load('user-A');

    expect(useOnboardingStore.getState().completed).toBe(true);
    expect(mockStore.get('mrlana-onboarding-completed')).toBe('true');
    expect(mockStore.has('mrlana-onboarding-completed:user-A')).toBe(false);
  });

  it('la migración de una cuenta no aplica la llave antigua de otra cuenta', async () => {
    mockStore.set('mrlana-onboarding-completed:user-A', 'true');

    await useOnboardingStore.getState().load('user-B');

    expect(useOnboardingStore.getState().completed).toBe(false);
    expect(mockStore.has('mrlana-onboarding-completed')).toBe(false);
  });

  it('remockStoreSession recupera el onboarding global ya completado', async () => {
    await useOnboardingStore.getState().load('user-A');
    await useOnboardingStore.getState().complete();

    // Simula reiniciar la app: estado en memoria vuelve a los defaults,
    // solo queda lo persistido en SecureStore.
    useOnboardingStore.setState({ isLoading: true, completed: false });

    await useOnboardingStore.getState().load('user-A');
    expect(useOnboardingStore.getState().completed).toBe(true);
  });

  it('complete() sin usuario resuelto también persiste (la llave es global, no depende del usuario)', async () => {
    await useOnboardingStore.getState().load(null);
    await useOnboardingStore.getState().complete();
    expect(mockStore.get('mrlana-onboarding-completed')).toBe('true');
  });
});
