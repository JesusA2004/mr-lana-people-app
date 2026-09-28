import { useBiometricStore } from '../biometricStore';

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

describe('useBiometricStore (preferencia biométrica por cuenta)', () => {
  beforeEach(() => {
    mockStore.clear();
    useBiometricStore.setState({ isLoading: true, enabled: false, hasBeenPrompted: false, userId: null });
  });

  it('userId null limpia el estado sin persistir nada', async () => {
    await useBiometricStore.getState().load(null);
    expect(useBiometricStore.getState()).toMatchObject({ enabled: false, hasBeenPrompted: false, isLoading: false, userId: null });
  });

  it('una cuenta nueva (sin nada persistido) empieza deshabilitada y sin prompt', async () => {
    await useBiometricStore.getState().load('user-A');
    expect(useBiometricStore.getState()).toMatchObject({ enabled: false, hasBeenPrompted: false, isLoading: false });
  });

  it('setEnabled/markPrompted persisten bajo llaves namespaced por cuenta', async () => {
    await useBiometricStore.getState().load('user-A');
    await useBiometricStore.getState().setEnabled(true);
    await useBiometricStore.getState().markPrompted();

    expect(mockStore.get('mrlana-biometric-enabled:user-A')).toBe('true');
    expect(mockStore.get('mrlana-biometric-prompted:user-A')).toBe('true');
    expect(useBiometricStore.getState().enabled).toBe(true);
    expect(useBiometricStore.getState().hasBeenPrompted).toBe(true);
  });

  it('la cuenta B en el mismo dispositivo NO hereda la biometría activada por la cuenta A', async () => {
    await useBiometricStore.getState().load('user-A');
    await useBiometricStore.getState().setEnabled(true);
    expect(useBiometricStore.getState().enabled).toBe(true);

    // logout → login de una cuenta distinta en el mismo teléfono.
    await useBiometricStore.getState().load('user-B');
    expect(useBiometricStore.getState().enabled).toBe(false);
    expect(useBiometricStore.getState().hasBeenPrompted).toBe(false);

    // La preferencia de A se conserva intacta (no se borró en logout).
    await useBiometricStore.getState().load('user-A');
    expect(useBiometricStore.getState().enabled).toBe(true);
  });

  it('migración limpia: adopta las llaves globales antiguas para la primera cuenta que las lee, y las borra', async () => {
    mockStore.set('mrlana-biometric-enabled', 'true');
    mockStore.set('mrlana-biometric-prompted', 'true');

    await useBiometricStore.getState().load('user-A');

    expect(useBiometricStore.getState()).toMatchObject({ enabled: true, hasBeenPrompted: true });
    expect(mockStore.get('mrlana-biometric-enabled:user-A')).toBe('true');
    expect(mockStore.has('mrlana-biometric-enabled')).toBe(false);
    expect(mockStore.has('mrlana-biometric-prompted')).toBe(false);
  });

  it('la migración no se repite para una segunda cuenta una vez que las llaves globales ya se borraron', async () => {
    mockStore.set('mrlana-biometric-enabled', 'true');
    await useBiometricStore.getState().load('user-A');
    expect(mockStore.has('mrlana-biometric-enabled')).toBe(false);

    await useBiometricStore.getState().load('user-B');
    expect(useBiometricStore.getState().enabled).toBe(false);
  });
});
