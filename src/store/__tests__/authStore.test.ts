/**
 * `authStore`: login/logout/restauración nunca deben dejar una sesión a
 * medias (Bearer puesto sin usuario, token guardado sin sesión) ni atrapar al
 * usuario dentro de su cuenta por una falla de red o de SecureStore.
 */
import { AxiosError, type AxiosResponse } from 'axios';

import { useAuthStore } from '../authStore';

import { useExperienceStore } from '@/store/experienceStore';
import { usePendingNavigationStore } from '@/store/pendingNavigationStore';

const mockSecure = new Map<string, string>();
const mockSecureFail = { set: false, del: false };
const mockAuthApi = {
  login: jest.fn(),
  me: jest.fn(),
  logout: jest.fn(async () => undefined),
};
const mockRevoke = jest.fn(async () => undefined);

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecure.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    if (mockSecureFail.set) throw new Error('keystore roto');
    mockSecure.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    if (mockSecureFail.del) throw new Error('keystore roto');
    mockSecure.delete(key);
  }),
}));
jest.mock('@/api/auth', () => ({
  get authApi() {
    return mockAuthApi;
  },
}));
// El store registra el handler de 401 al importarse: el estado vive dentro del mock.
jest.mock('@/api/client', () => {
  const state = { token: null as string | null, onUnauthorized: null as null | (() => void) };
  return {
    __state: state,
    setAuthToken: (token: string | null) => {
      state.token = token;
    },
    setUnauthorizedHandler: (handler: () => void) => {
      state.onUnauthorized = handler;
    },
  };
});
const mockClient = (jest.requireMock('@/api/client') as { __state: { token: string | null; onUnauthorized: null | (() => void) } }).__state;
jest.mock('@/api/queryClient', () => ({ queryClient: { clear: jest.fn() } }));
jest.mock('@/services/pushNotifications', () => ({
  revokeCurrentPushToken: () => mockRevoke(),
}));

const TOKEN_KEY = 'mrlana-auth-token';
const USER = { id: 7, nombre: 'Ana', apellidos: 'López', correo: 'ana@example.com' };

function httpError(status: number): AxiosError {
  return new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: {},
    statusText: '',
    headers: {},
    config: {},
  } as AxiosResponse);
}

function resetState() {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false, isInitializing: true, pendingVerification: false, isVerifying: false, isLoggingOut: false });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSecure.clear();
  mockSecureFail.set = false;
  mockSecureFail.del = false;
  mockClient.token = null;
  mockRevoke.mockResolvedValue(undefined);
  mockAuthApi.logout.mockResolvedValue(undefined);
  resetState();
});

describe('logout', () => {
  beforeEach(() => {
    mockSecure.set(TOKEN_KEY, 'tok');
    mockClient.token = 'tok';
    useAuthStore.setState({ token: 'tok', user: USER as never, isAuthenticated: true, isInitializing: false });
    usePendingNavigationStore.setState({ pending: { route: '/solicitud/1', experience: 'colaborador' } });
  });

  function expectLoggedOut() {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isLoggingOut).toBe(false);
    expect(mockClient.token).toBeNull();
    expect(usePendingNavigationStore.getState().pending).toBeNull();
  }

  it('si revocar el push token lanza, el logout local ocurre igual', async () => {
    mockRevoke.mockRejectedValue(new Error('boom'));
    await useAuthStore.getState().logout();
    expectLoggedOut();
    expect(mockSecure.has(TOKEN_KEY)).toBe(false);
  });

  it('si el backend falla al cerrar sesión, el logout local ocurre igual', async () => {
    mockAuthApi.logout.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));
    await useAuthStore.getState().logout();
    expectLoggedOut();
    expect(mockSecure.has(TOKEN_KEY)).toBe(false);
  });

  it('si SecureStore falla al borrar, el estado en memoria se limpia igual', async () => {
    mockSecureFail.del = true;
    await useAuthStore.getState().logout();
    expectLoggedOut();
  });
});

describe('login', () => {
  it('éxito: Bearer + token persistido + autenticado', async () => {
    mockAuthApi.login.mockResolvedValue({ token: 'nuevo', usuario: USER });
    await useAuthStore.getState().login('ana@example.com', 'secreto');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(mockClient.token).toBe('nuevo');
    expect(mockSecure.get(TOKEN_KEY)).toBe('nuevo');
  });

  it('si SecureStore no puede guardar, se revierte todo: Axios sin token y sin sesión', async () => {
    mockAuthApi.login.mockResolvedValue({ token: 'nuevo', usuario: USER });
    mockSecureFail.set = true;

    await expect(useAuthStore.getState().login('ana@example.com', 'secreto')).rejects.toBeTruthy();
    expect(mockClient.token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    // Best-effort: invalida en backend el token que ya no se usará.
    expect(mockAuthApi.logout).toHaveBeenCalled();
  });

  it('loginWithToken (registro por QR) hace el mismo rollback', async () => {
    mockSecureFail.set = true;
    await expect(useAuthStore.getState().loginWithToken('qr-token', USER as never)).rejects.toBeTruthy();
    expect(mockClient.token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('restoreSession', () => {
  beforeEach(() => {
    mockSecure.set(TOKEN_KEY, 'guardado');
  });

  it('401: borra el token guardado y termina en Login', async () => {
    mockAuthApi.me.mockRejectedValue(httpError(401));
    await useAuthStore.getState().restoreSession();
    const state = useAuthStore.getState();
    expect(state.isInitializing).toBe(false);
    expect(state.isAuthenticated).toBe(false);
    expect(state.pendingVerification).toBe(false);
    expect(mockSecure.has(TOKEN_KEY)).toBe(false);
  });

  it('timeout de red: pendiente de verificar y CONSERVA el token guardado', async () => {
    mockAuthApi.me.mockRejectedValue(new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED'));
    await useAuthStore.getState().restoreSession();
    const state = useAuthStore.getState();
    expect(state.isInitializing).toBe(false);
    expect(state.pendingVerification).toBe(true);
    expect(state.isAuthenticated).toBe(false);
    expect(mockSecure.get(TOKEN_KEY)).toBe('guardado');
    // Sin Bearer mientras no se verifique.
    expect(mockClient.token).toBeNull();
  });

  it('500: también queda pendiente de verificar (no es sesión inválida)', async () => {
    mockAuthApi.me.mockRejectedValue(httpError(500));
    await useAuthStore.getState().restoreSession();
    expect(useAuthStore.getState().pendingVerification).toBe(true);
    expect(mockSecure.get(TOKEN_KEY)).toBe('guardado');
  });

  it('al volver la red, reintentar con /me OK autentica', async () => {
    mockAuthApi.me.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK')).mockResolvedValueOnce(USER);
    await useAuthStore.getState().restoreSession();
    expect(useAuthStore.getState().pendingVerification).toBe(true);

    await useAuthStore.getState().retrySessionVerification();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.pendingVerification).toBe(false);
    expect(mockClient.token).toBe('guardado');
  });

  it('sin token guardado: sale del splash directo a Login', async () => {
    mockSecure.clear();
    await useAuthStore.getState().restoreSession();
    expect(useAuthStore.getState().isInitializing).toBe(false);
    expect(mockAuthApi.me).not.toHaveBeenCalled();
  });

  it('un 401 de cualquier endpoint después expulsa la sesión (handler global)', async () => {
    mockAuthApi.me.mockResolvedValue(USER);
    await useAuthStore.getState().restoreSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    mockClient.onUnauthorized?.();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useExperienceStore.getState().experience).toBeNull();
  });
});
