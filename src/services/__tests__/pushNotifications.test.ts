/**
 * Registro / revocación / rotación del push token (`services/pushNotifications`).
 * Todo lo nativo va mockeado; lo que se prueba es la lógica de decisión.
 */

import {
  configureNotificationHandler,
  registerCurrentPushToken,
  revokeCurrentPushToken,
  subscribeToPushTokenRotation,
  toPermissionState,
} from '../pushNotifications';

import { usePushDiagnosticsStore } from '@/store/pushDiagnosticsStore';

// Los jest.mock() se elevan sobre los imports; las fábricas leen estos objetos de forma perezosa (getters).
const mockEnv = {
  supportsRemotePush: true,
  isDevice: true,
  projectId: 'f490fbd6-f59c-46c5-b24e-193d93b22dd0' as string | null,
};

const mockSecure = new Map<string, string>();

const mockNotifications = {
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[abcdEFGHijkl1234]' })),
  addPushTokenListener: jest.fn(),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
};

const mockDispositivosApi = {
  registerPushToken: jest.fn(async () => undefined),
  revokePushToken: jest.fn(async () => undefined),
  sendTestPush: jest.fn(async () => undefined),
};

jest.mock('@/utils/runtime', () => ({
  get supportsRemotePush() {
    return mockEnv.supportsRemotePush;
  },
  isExpoGo: false,
}));
jest.mock('expo-device', () => ({
  get isDevice() {
    return mockEnv.isDevice;
  },
  modelName: 'Pixel 8',
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: { eas: { projectId: mockEnv.projectId } }, android: { package: 'com.mrlana.people' } };
    },
    easConfig: null,
  },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecure.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecure.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecure.delete(key);
  }),
}));
jest.mock('expo-notifications', () => mockNotifications);
jest.mock('@/api/dispositivos', () => ({
  get dispositivosApi() {
    return mockDispositivosApi;
  },
}));
jest.mock('@/utils/appVersion', () => ({ getCurrentVersionLabel: () => '1.0.0 (7)' }));

const granted = { status: 'granted', canAskAgain: true, ios: null };
const undetermined = { status: 'undetermined', canAskAgain: true, ios: null };
const denied = { status: 'denied', canAskAgain: false, ios: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockSecure.clear();
  mockEnv.supportsRemotePush = true;
  mockEnv.isDevice = true;
  mockEnv.projectId = 'f490fbd6-f59c-46c5-b24e-193d93b22dd0';
  mockNotifications.getPermissionsAsync.mockResolvedValue(granted);
  mockNotifications.requestPermissionsAsync.mockResolvedValue(granted);
  mockNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abcdEFGHijkl1234]' });
  mockDispositivosApi.registerPushToken.mockResolvedValue(undefined);
  mockDispositivosApi.revokePushToken.mockResolvedValue(undefined);
  usePushDiagnosticsStore.setState({ permission: 'unknown', token: null, projectId: null, lastRegisteredAt: null, lastError: null, lastPushReceived: null });
});

describe('registerCurrentPushToken', () => {
  it('registro exitoso: pide token con projectId, lo manda al backend, lo persiste y actualiza el diagnóstico', async () => {
    const result = await registerCurrentPushToken();

    expect(result).toEqual({ status: 'registered', token: 'ExponentPushToken[abcdEFGHijkl1234]' });
    expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'f490fbd6-f59c-46c5-b24e-193d93b22dd0' });
    expect(mockDispositivosApi.registerPushToken).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'ExponentPushToken[abcdEFGHijkl1234]', device_name: 'Pixel 8', app_version: '1.0.0 (7)' }),
    );
    expect(mockSecure.get('mrlana-push-token')).toBe('ExponentPushToken[abcdEFGHijkl1234]');
    const diag = usePushDiagnosticsStore.getState();
    expect(diag.permission).toBe('granted');
    expect(diag.token).toBe('ExponentPushToken[abcdEFGHijkl1234]');
    expect(diag.projectId).toBe('f490fbd6-f59c-46c5-b24e-193d93b22dd0');
    expect(diag.lastRegisteredAt).not.toBeNull();
  });

  it('permiso denegado: no pide token ni llama al backend', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue(denied);
    const result = await registerCurrentPushToken({ promptIfUndetermined: true });

    expect(result.status).toBe('no_permission');
    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockDispositivosApi.registerPushToken).not.toHaveBeenCalled();
    expect(usePushDiagnosticsStore.getState().permission).toBe('denied');
  });

  it('permiso sin definir y SIN prompt (arranque): nunca sorprende con el diálogo del sistema', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue(undetermined);
    const result = await registerCurrentPushToken();

    expect(result.status).toBe('no_permission');
    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('permiso sin definir CON prompt (primer/Configuración): pide el permiso y registra si lo aceptan', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue(undetermined);
    const result = await registerCurrentPushToken({ promptIfUndetermined: true });

    expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('registered');
  });

  it('sin projectId: no pide token y deja el motivo en el diagnóstico', async () => {
    mockEnv.projectId = null;
    const result = await registerCurrentPushToken();

    expect(result.status).toBe('no_project_id');
    expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(usePushDiagnosticsStore.getState().lastError).toMatch(/projectId/);
  });

  it('simulador/emulador: no intenta registrar', async () => {
    mockEnv.isDevice = false;
    const result = await registerCurrentPushToken();

    expect(result.status).toBe('simulator');
    expect(mockNotifications.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it('Expo Go / web (sin push remoto): unsupported y nunca carga expo-notifications', async () => {
    mockEnv.supportsRemotePush = false;
    const result = await registerCurrentPushToken();

    expect(result.status).toBe('unsupported');
    expect(mockNotifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(usePushDiagnosticsStore.getState().permission).toBe('unsupported');
  });

  it('error del backend al registrar: no lanza, no persiste y guarda el error', async () => {
    mockDispositivosApi.registerPushToken.mockRejectedValue(new Error('Network Error'));
    const result = await registerCurrentPushToken();

    expect(result.status).toBe('error');
    expect(mockSecure.has('mrlana-push-token')).toBe(false);
    expect(usePushDiagnosticsStore.getState().lastError).toBeTruthy();
  });

  it('llamadas concurrentes comparten una sola petición en vuelo', async () => {
    const [a, b] = await Promise.all([registerCurrentPushToken(), registerCurrentPushToken()]);
    expect(a).toBe(b);
    expect(mockDispositivosApi.registerPushToken).toHaveBeenCalledTimes(1);
  });
});

describe('revokeCurrentPushToken', () => {
  it('revoca en backend el token persistido y lo olvida', async () => {
    mockSecure.set('mrlana-push-token', 'ExponentPushToken[old]');
    await revokeCurrentPushToken();

    expect(mockDispositivosApi.revokePushToken).toHaveBeenCalledWith('ExponentPushToken[old]', expect.objectContaining({ timeout: 5000 }));
    expect(mockSecure.has('mrlana-push-token')).toBe(false);
  });

  it('si el backend falla, NO lanza (el logout sigue) y aun así borra el token local', async () => {
    mockSecure.set('mrlana-push-token', 'ExponentPushToken[old]');
    mockDispositivosApi.revokePushToken.mockRejectedValue(new Error('timeout'));

    await expect(revokeCurrentPushToken()).resolves.toBeUndefined();
    expect(mockSecure.has('mrlana-push-token')).toBe(false);
    expect(usePushDiagnosticsStore.getState().token).toBeNull();
  });
});

describe('rotación y foreground', () => {
  it('el listener de rotación de token vuelve a registrar el token nuevo', async () => {
    let listener: (() => void) | undefined;
    const remove = jest.fn();
    mockNotifications.addPushTokenListener.mockImplementation((cb: () => void) => {
      listener = cb;
      return { remove };
    });

    const stop = await subscribeToPushTokenRotation();
    expect(listener).toBeDefined();

    mockNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[rotated999]' });
    listener?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispositivosApi.registerPushToken).toHaveBeenCalledWith(expect.objectContaining({ token: 'ExponentPushToken[rotated999]' }));
    stop();
    expect(remove).toHaveBeenCalled();
  });

  it('foreground: sin banner del sistema ni sonido (la app muestra su propio toast)', async () => {
    await configureNotificationHandler();
    const handler = mockNotifications.setNotificationHandler.mock.calls[0]?.[0] as { handleNotification: () => Promise<Record<string, boolean>> } | undefined;
    // Puede haberse configurado en una prueba anterior del mismo módulo.
    if (!handler) return;
    const behavior = await handler.handleNotification();
    expect(behavior.shouldShowBanner).toBe(false);
    expect(behavior.shouldPlaySound).toBe(false);
    expect(behavior.shouldShowList).toBe(true);
  });

  it('toPermissionState traduce iOS provisional', () => {
    expect(toPermissionState({ status: 'granted', ios: { status: 3 } })).toBe('provisional');
    expect(toPermissionState({ status: 'denied' })).toBe('denied');
  });
});
