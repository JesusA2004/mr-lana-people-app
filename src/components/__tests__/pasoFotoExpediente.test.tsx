import { AxiosError, AxiosHeaders } from 'axios';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { PasoFotoExpediente } from '../registro/PasoFotoExpediente';

import type { FotoRegistro } from '@/types/registro';
import { conReintentos, esErrorReintentable } from '@/utils/reintentos';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- el mock oficial se carga con require dentro de jest.mock.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- idem.
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }));

const mockPicker = {
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  getMediaLibraryPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
};
// Delegan en mockPicker en tiempo de llamada (el factory se evalúa antes de inicializar la constante).
jest.mock('expo-image-picker', () => ({
  getCameraPermissionsAsync: (...a: unknown[]) => mockPicker.getCameraPermissionsAsync(...a),
  requestCameraPermissionsAsync: (...a: unknown[]) => mockPicker.requestCameraPermissionsAsync(...a),
  getMediaLibraryPermissionsAsync: (...a: unknown[]) => mockPicker.getMediaLibraryPermissionsAsync(...a),
  requestMediaLibraryPermissionsAsync: (...a: unknown[]) => mockPicker.requestMediaLibraryPermissionsAsync(...a),
  launchCameraAsync: (...a: unknown[]) => mockPicker.launchCameraAsync(...a),
  launchImageLibraryAsync: (...a: unknown[]) => mockPicker.launchImageLibraryAsync(...a),
  CameraType: { front: 'front', back: 'back' },
}));

const mockOpenSettings = jest.fn();
jest.mock('expo-linking', () => ({ openSettings: () => mockOpenSettings() }));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => {
      interface MockContexto { renderAsync: () => Promise<{ width: number; height: number; saveAsync: () => Promise<{ uri: string }> }>; resize: () => MockContexto }
      const ctx: MockContexto = {
        renderAsync: async () => ({ width: 3000, height: 3000, saveAsync: async () => ({ uri: 'file:///chica.jpg' }) }),
        resize: () => ctx,
      };
      return ctx;
    },
  },
}));

const mockMutateAsync = jest.fn();
jest.mock('@/hooks/queries/useFotoPerfil', () => ({ useSubirFotoPerfil: () => ({ mutateAsync: mockMutateAsync, isPending: false }) }));

const FOTO_PENDIENTE: FotoRegistro = {
  obligatoria: true,
  completo: false,
  url: null,
  pendiente_revision: false,
  puede_reemplazar: true,
  cubre_documento: { id: 12, nombre: '2 fotografías tamaño infantil' },
};

function render(element: React.ReactElement): ReactTestRenderer {
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = renderer.create(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>{element}</SafeAreaProvider>,
    );
  });
  return arbol;
}

function textos(arbol: ReactTestRenderer): string {
  return arbol.root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children)))
    .join(' | ');
}

/** Toca el elemento presionable que contiene el texto (o la etiqueta accesible) indicado. */
async function tocar(arbol: ReactTestRenderer, etiqueta: string) {
  const nodo =
    arbol.root.findAll((n) => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0] ??
    arbol.root.findAllByType(Text).find((t) => t.props.children === etiqueta);
  if (!nodo) throw new Error(`No encontré «${etiqueta}» en: ${textos(arbol)}`);
  let actual: ReactTestInstance | null = nodo;
  while (actual && typeof actual.props.onPress !== 'function') actual = actual.parent;
  if (!actual) throw new Error(`«${etiqueta}» no es presionable`);
  const presionable = actual;
  await act(async () => {
    presionable.props.onPress();
  });
}

function errorDeRed(): AxiosError {
  return new AxiosError('Network Error', 'ERR_NETWORK', { headers: new AxiosHeaders() });
}

function errorConStatus(status: number, data: unknown = {}): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('fail', 'ERR_BAD_RESPONSE', config, null, { status, statusText: '', headers: {}, config, data });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMutateAsync.mockReset();
  Object.values(mockPicker).forEach((m) => m.mockReset());
  mockPicker.getCameraPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted', canAskAgain: true });
  mockPicker.getMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted', canAskAgain: true });
  mockPicker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///grande.jpg', mimeType: 'image/jpeg', fileSize: 2_000_000 }] });
});

describe('PasoFotoExpediente', () => {
  it('explica cómo tomarla, ofrece cámara y galería y la nota del documento cubierto', () => {
    const arbol = render(<PasoFotoExpediente foto={FOTO_PENDIENTE} onSubida={jest.fn()} />);
    const t = textos(arbol);
    expect(t).toContain('Tomar foto');
    expect(t).toContain('Elegir de galería');
    expect(t).toMatch(/fondo claro/i);
    expect(t).toContain('2 fotografías tamaño infantil');
  });

  it('permiso de cámara denegado: explica, ofrece Ajustes y la galería sigue disponible', async () => {
    mockPicker.getCameraPermissionsAsync.mockResolvedValue({ granted: false, status: 'undetermined', canAskAgain: true });
    mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied', canAskAgain: true });
    const arbol = render(<PasoFotoExpediente foto={FOTO_PENDIENTE} onSubida={jest.fn()} />);

    await tocar(arbol, 'Tomar foto');
    expect(textos(arbol)).toMatch(/fotografía para expediente/);
    await tocar(arbol, 'Permitir acceso');

    expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(textos(arbol)).toContain('No diste permiso para usar la cámara');
    expect(textos(arbol)).toContain('Elegir de galería');
    await tocar(arbol, 'Abrir Ajustes');
    expect(mockOpenSettings).toHaveBeenCalled();
  });

  it('toma con cámara frontal, recorte 1:1, previsualiza y sube; si falla la red ofrece «Reintentar»', async () => {
    mockMutateAsync.mockRejectedValueOnce(errorDeRed()).mockResolvedValueOnce({ resultado: 'oficial', message: 'ok' });
    const onSubida = jest.fn();
    const arbol = render(<PasoFotoExpediente foto={FOTO_PENDIENTE} onSubida={onSubida} />);

    await tocar(arbol, 'Tomar foto');
    expect(mockPicker.launchCameraAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: true, aspect: [1, 1], cameraType: 'front' }));
    expect(textos(arbol)).toContain('Usar esta foto');
    expect(textos(arbol)).toContain('Repetir');
    expect(textos(arbol)).toContain('Cambiar');

    await tocar(arbol, 'Usar esta foto');
    // Sube la versión redimensionada (no la original de 12 MP).
    expect(mockMutateAsync.mock.calls[0][0].file).toEqual({ uri: 'file:///chica.jpg', name: 'foto-expediente.jpg', mimeType: 'image/jpeg' });
    expect(onSubida).not.toHaveBeenCalled();
    expect(textos(arbol)).toMatch(/Toca «Reintentar»/);

    await tocar(arbol, 'Reintentar');
    expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    expect(onSubida).toHaveBeenCalledTimes(1);
  });

  it('422 errors.foto: muestra el mensaje del backend', async () => {
    mockMutateAsync.mockRejectedValueOnce(errorConStatus(422, { message: 'x', errors: { foto: ['La imagen no es válida.'] } }));
    const arbol = render(<PasoFotoExpediente foto={FOTO_PENDIENTE} onSubida={jest.fn()} />);
    await tocar(arbol, 'Tomar foto');
    await tocar(arbol, 'Usar esta foto');
    expect(textos(arbol)).toContain('La imagen no es válida.');
  });

  it('con foto ya guardada muestra «Cambiar foto» si puede reemplazar', () => {
    const arbol = render(<PasoFotoExpediente foto={{ ...FOTO_PENDIENTE, completo: true, url: 'https://x/foto?v=1' }} onSubida={jest.fn()} />);
    expect(textos(arbol)).toContain('quedó guardada');
    expect(textos(arbol)).toContain('Cambiar foto');
    expect(textos(arbol)).not.toContain('Tomar foto');
  });
});

describe('conReintentos (subida de la foto)', () => {
  const sinEspera = { esperar: () => Promise.resolve() };

  it('reintenta 2 veces ante red/5xx con espera creciente y luego lo logra', async () => {
    const esperas: number[] = [];
    const fn = jest.fn().mockRejectedValueOnce(errorDeRed()).mockRejectedValueOnce(errorConStatus(503)).mockResolvedValue('ok');
    await expect(conReintentos(fn, { esperar: async (ms) => void esperas.push(ms) })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(esperas).toEqual([1000, 2000]);
  });

  it('se rinde tras 2 reintentos', async () => {
    const fn = jest.fn().mockRejectedValue(errorConStatus(500));
    await expect(conReintentos(fn, sinEspera)).rejects.toBeInstanceOf(AxiosError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('un 4xx no se reintenta', async () => {
    const fn = jest.fn().mockRejectedValue(errorConStatus(422));
    await expect(conReintentos(fn, sinEspera)).rejects.toBeInstanceOf(AxiosError);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(esErrorReintentable(errorConStatus(403))).toBe(false);
    expect(esErrorReintentable(errorDeRed())).toBe(true);
  });
});
