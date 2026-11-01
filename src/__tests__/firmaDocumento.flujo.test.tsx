import { Alert, type AlertButton } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { apiClient } from '@/api/client';
import DocumentoLaboralDetailScreen from '@/app/(app)/documentos-laborales/[id]';
import { Button } from '@/components/Button';
import { PdfViewer } from '@/components/PdfViewer';
import { PressableScale } from '@/components/PressableScale';
import { toast } from '@/store/toastStore';
import { discoFalso, FakeFile, PDF_BYTES } from '@/test/fakeFileSystem';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- los mocks oficiales se cargan con require dentro de jest.mock.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- idem.
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- idem.
jest.mock('expo-file-system', () => require('@/test/fakeFileSystem').fakeExpoFileSystem);
jest.mock('expo-screen-capture', () => ({ preventScreenCaptureAsync: jest.fn(async () => undefined), allowScreenCaptureAsync: jest.fn(async () => undefined) }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: jest.fn(async () => undefined) }));
jest.mock('expo-intent-launcher', () => ({ startActivityAsync: jest.fn(async () => undefined) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }), useLocalSearchParams: () => ({ id: '5' }) }));
jest.mock('@/store/authStore', () => ({ useAuthStore: (selector: (s: unknown) => unknown) => selector({ token: 'tkn', expirarSesion: jest.fn() }) }));
jest.mock('@/hooks/useNetworkStatus', () => ({ useNetworkStatus: () => ({ isOffline: false }) }));
jest.mock('@/components/PdfViewer', () => ({ PdfViewer: () => null }));
jest.mock('@/components/ciclo/Screen', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    Screen: ({ children }: { children: React.ReactNode }) => children,
    Notice: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    SectionTitle: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
  };
});
jest.mock('@/components/ciclo/StepTimeline', () => ({ StepTimeline: () => null }));
jest.mock('@/api/client', () => ({ apiClient: { post: jest.fn() }, extractData: (data: unknown) => data }));

interface OpcionesMutacion {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  onSettled?: () => void;
}

// Mutaciones sin React Query, pero sobre la capa de API real: lo que se afirma son las rutas.
jest.mock('@/hooks/queries/useLaborDocuments', () => {
  const { documentosLaboralesApi } = jest.requireActual('@/api/documentosLaborales');
  const correr = (promesa: Promise<unknown>, opciones: OpcionesMutacion) =>
    promesa.then(() => opciones.onSuccess?.(), (error: unknown) => opciones.onError?.(error)).finally(() => opciones.onSettled?.());
  return {
    useLaborDocument: () => ({
      data: { id: 5, titulo: 'Contrato', estado: 'pendiente_firma_colaborador', requiere_firma_digital: true, puede_descargar: true },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    }),
    useRegistrarAperturaDocumento: () => ({ mutate: (id: number, opciones: OpcionesMutacion) => correr(documentosLaboralesApi.registrarApertura(id), opciones) }),
    useFirmarDocumentoLaboral: () => ({ isPending: false, mutate: ({ id }: { id: number }, opciones: OpcionesMutacion) => correr(documentosLaboralesApi.firmar(id), opciones) }),
  };
});

const MENSAJE_422 = 'Abre el documento en la app para revisarlo antes de firmar. Si no se muestra en tu teléfono, acude a Recursos Humanos.';
const error422 = { isAxiosError: true, response: { status: 422, data: { message: MENSAJE_422, errors: { documento: [MENSAJE_422] } } } };

const boton = (arbol: ReactTestRenderer, titulo: string) => arbol.root.findAllByType(Button).find((b) => b.props.title === titulo)!;
const casilla = (arbol: ReactTestRenderer) => arbol.root.findAllByType(PressableScale).find((p) => p.props.accessibilityLabel === 'Leí el documento y acepto su contenido')!;
const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  });
};

async function tocar(arbol: ReactTestRenderer, titulo: string) {
  await act(async () => {
    await boton(arbol, titulo).props.onPress();
  });
  await flush();
}

async function abrirYDibujar(arbol: ReactTestRenderer) {
  await tocar(arbol, 'Abrir documento para revisarlo');
  act(() => arbol.root.findByType(PdfViewer).props.onRendered());
  await flush();
  await tocar(arbol, 'Cerrar');
}

async function aceptarYFirmar(arbol: ReactTestRenderer) {
  act(() => casilla(arbol).props.onPress());
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await tocar(arbol, 'Firmar / Aceptar');
  const botones = alerta.mock.calls[0]![2] as AlertButton[];
  alerta.mockRestore();
  await act(async () => {
    botones.find((b) => b.text === 'Firmar')!.onPress!();
  });
  await flush();
}

function montar(): ReactTestRenderer {
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = renderer.create(<DocumentoLaboralDetailScreen />);
  });
  return arbol;
}

let peticiones: string[];
let errorSpy: jest.SpyInstance;

beforeEach(() => {
  discoFalso.clear();
  peticiones = [];
  errorSpy = jest.spyOn(toast, 'error').mockImplementation(() => undefined as never);
  FakeFile.descargaFalsa = async (url, destino) => {
    peticiones.push(`GET ${url.replace(/^.*\/colaborador/, '/colaborador')}`);
    discoFalso.set(destino.uri, PDF_BYTES);
  };
  (apiClient.post as jest.Mock).mockReset();
  (apiClient.post as jest.Mock).mockImplementation(async (url: string) => {
    peticiones.push(`POST ${url}`);
    return { data: {} };
  });
});

afterEach(() => {
  errorSpy.mockRestore();
});

const BASE = '/colaborador/documentos-laborales/5';

describe('flujo de firma contra el contrato del backend', () => {
  it('firma en orden: GET /ver, POST /apertura, POST /firmar', async () => {
    const arbol = montar();
    await abrirYDibujar(arbol);
    await aceptarYFirmar(arbol);
    expect(peticiones).toEqual([`GET ${BASE}/ver`, `POST ${BASE}/apertura`, `POST ${BASE}/firmar`]);
    expect(apiClient.post).toHaveBeenLastCalledWith(`${BASE}/firmar`, { acepto: true });
  });

  it('sin abrir el documento no hay manera de pedir la firma', () => {
    const arbol = montar();
    expect(boton(arbol, 'Firmar / Aceptar').props.disabled).toBe(true);
    expect(casilla(arbol).props.disabled).toBe(true);
    expect(peticiones).toEqual([]);
  });

  it('422 al firmar: muestra el mensaje del servidor, vuelve a bloquear, y reabrir registra otra apertura', async () => {
    const arbol = montar();
    await abrirYDibujar(arbol);
    (apiClient.post as jest.Mock).mockImplementationOnce(async (url: string) => {
      peticiones.push(`POST ${url}`);
      throw error422;
    });
    await aceptarYFirmar(arbol);

    expect(errorSpy).toHaveBeenCalledWith(MENSAJE_422);
    expect(casilla(arbol).props.disabled).toBe(true);
    expect(boton(arbol, 'Firmar / Aceptar').props.disabled).toBe(true);

    await abrirYDibujar(arbol);
    expect(peticiones).toEqual([`GET ${BASE}/ver`, `POST ${BASE}/apertura`, `POST ${BASE}/firmar`, `GET ${BASE}/ver`, `POST ${BASE}/apertura`]);
    expect(casilla(arbol).props.disabled).toBe(false);
  });

  it('422 al registrar la apertura: lo dice y reabrir vuelve a hacer GET /ver antes del POST', async () => {
    (apiClient.post as jest.Mock).mockImplementationOnce(async (url: string) => {
      peticiones.push(`POST ${url}`);
      throw { ...error422, response: { status: 422, data: { message: 'Abre el documento en la app antes de confirmar que lo revisaste.' } } };
    });
    const arbol = montar();
    await abrirYDibujar(arbol);
    expect(errorSpy).toHaveBeenCalledWith('Abre el documento en la app antes de confirmar que lo revisaste.');
    expect(casilla(arbol).props.disabled).toBe(true);

    await abrirYDibujar(arbol);
    expect(peticiones).toEqual([`GET ${BASE}/ver`, `POST ${BASE}/apertura`, `GET ${BASE}/ver`, `POST ${BASE}/apertura`]);
    expect(casilla(arbol).props.disabled).toBe(false);
  });
});
