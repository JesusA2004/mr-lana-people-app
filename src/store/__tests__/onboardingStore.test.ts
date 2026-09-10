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

describe('useOnboardingStore (onboarding por usuario)', () => {
  beforeEach(() => {
    mockStore.clear();
    useOnboardingStore.setState({ isLoading: true, completed: false, userId: null });
  });

  it('sin usuario (userId null) no hay onboarding que mostrar y no queda cargando', async () => {
    await useOnboardingStore.getState().load(null);
    expect(useOnboardingStore.getState()).toMatchObject({ isLoading: false, completed: false, userId: null });
  });

  it('un usuario nuevo (sin nada persistido) empieza con onboarding sin completar', async () => {
    await useOnboardingStore.getState().load('user-nuevo');
    expect(useOnboardingStore.getState().completed).toBe(false);
    expect(useOnboardingStore.getState().isLoading).toBe(false);
  });

  it('complete() persiste bajo una llave namespaced por usuario', async () => {
    await useOnboardingStore.getState().load('user-A');
    await useOnboardingStore.getState().complete();

    expect(mockStore.get('mrlana-onboarding-completed:user-A')).toBe('true');
    expect(useOnboardingStore.getState().completed).toBe(true);
  });

  it('BUG CORREGIDO: el usuario B no hereda el onboarding completado del usuario A en el mismo dispositivo', async () => {
    // Usuario A completa onboarding.
    await useOnboardingStore.getState().load('user-A');
    await useOnboardingStore.getState().complete();
    expect(useOnboardingStore.getState().completed).toBe(true);

    // logout → login de un usuario distinto en el mismo teléfono.
    await useOnboardingStore.getState().load('user-B');
    expect(useOnboardingStore.getState().completed).toBe(false);

    // Un colaborador nuevo registrado por QR (id nunca antes visto en este
    // dispositivo) tampoco hereda nada de A.
    await useOnboardingStore.getState().load('user-nuevo-por-qr');
    expect(useOnboardingStore.getState().completed).toBe(false);

    // La preferencia de A se conserva — no se borró nada al cambiar de cuenta.
    await useOnboardingStore.getState().load('user-A');
    expect(useOnboardingStore.getState().completed).toBe(true);
  });

  it('remockStoreSession del mismo usuario recupera el onboarding ya completado', async () => {
    await useOnboardingStore.getState().load('user-A');
    await useOnboardingStore.getState().complete();

    // Simula reiniciar la app: estado en memoria vuelve a los defaults,
    // solo queda lo persistido en SecureStore.
    useOnboardingStore.setState({ isLoading: true, completed: false, userId: null });

    await useOnboardingStore.getState().load('user-A');
    expect(useOnboardingStore.getState().completed).toBe(true);
  });

  it('complete() sin usuario resuelto (userId null) no revienta ni persiste nada', async () => {
    await useOnboardingStore.getState().load(null);
    await useOnboardingStore.getState().complete();
    expect(mockStore.size).toBe(0);
  });
});
