import { Ionicons } from '@expo/vector-icons';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { Button } from '@/components/Button';
import { PdfViewer } from '@/components/PdfViewer';
import { PressableScale } from '@/components/PressableScale';
import DocumentoLaboralDetailScreen from '@/app/(app)/documentos-laborales/[id]';
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
const mockDocumento = {
  id: 5,
  titulo: 'Contrato',
  estado: 'pendiente_firma_colaborador',
  requiere_firma_digital: true,
  puede_descargar: true,
};
const mockRegistrarApertura = jest.fn();
jest.mock('@/hooks/queries/useLaborDocuments', () => ({
  useLaborDocument: () => ({ data: mockDocumento, isLoading: false, error: null, refetch: jest.fn(), isRefetching: false }),
  useFirmarDocumentoLaboral: () => ({ mutate: jest.fn(), isPending: false }),
  useRegistrarAperturaDocumento: () => ({ mutate: mockRegistrarApertura }),
}));

const boton = (arbol: ReactTestRenderer, titulo: string) => arbol.root.findAllByType(Button).find((b) => b.props.title === titulo)!;
const casilla = (arbol: ReactTestRenderer) => arbol.root.findAllByType(PressableScale).find((p) => p.props.accessibilityLabel === 'Leí el documento y acepto su contenido')!;

async function tocar(arbol: ReactTestRenderer, titulo: string) {
  await act(async () => {
    await boton(arbol, titulo).props.onPress();
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  });
}

function montar(): ReactTestRenderer {
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = renderer.create(<DocumentoLaboralDetailScreen />);
  });
  return arbol;
}

beforeEach(() => {
  mockRegistrarApertura.mockReset();
  mockRegistrarApertura.mockImplementation((_id: number, opciones: { onSuccess?: () => void; onSettled?: () => void }) => {
    opciones.onSuccess?.();
    opciones.onSettled?.();
  });
  discoFalso.clear();
  FakeFile.descargaFalsa = async (_url, destino) => {
    discoFalso.set(destino.uri, PDF_BYTES);
  };
});

describe('regla de firma en la pantalla', () => {
  it('al entrar la aceptación está bloqueada', () => {
    const arbol = montar();
    expect(casilla(arbol).props.disabled).toBe(true);
    expect(boton(arbol, 'Firmar / Aceptar').props.disabled).toBe(true);
  });

  it('abrir y cerrar sin que se dibuje mantiene el bloqueo', async () => {
    const arbol = montar();
    await tocar(arbol, 'Abrir documento para revisarlo');
    await tocar(arbol, 'Cerrar');
    expect(casilla(arbol).props.disabled).toBe(true);
  });

  it('si el visor falla sigue bloqueada y ofrece Reintentar', async () => {
    const arbol = montar();
    await tocar(arbol, 'Abrir documento para revisarlo');
    act(() => arbol.root.findByType(PdfViewer).props.onError('No se pudo mostrar este documento en este teléfono.'));
    expect(casilla(arbol).props.disabled).toBe(true);
    expect(boton(arbol, 'Reintentar')).toBeDefined();
    expect(mockRegistrarApertura).not.toHaveBeenCalled();
    expect(JSON.stringify(arbol.toJSON())).toContain('acude a Recursos Humanos');
  });

  it('si el servidor no registra la apertura, sigue bloqueada', async () => {
    mockRegistrarApertura.mockImplementation((_id: number, opciones: { onError?: (e: unknown) => void; onSettled?: () => void }) => {
      opciones.onError?.(new Error('sin red'));
      opciones.onSettled?.();
    });
    const arbol = montar();
    await tocar(arbol, 'Abrir documento para revisarlo');
    act(() => arbol.root.findByType(PdfViewer).props.onRendered());
    expect(mockRegistrarApertura).toHaveBeenCalledWith(5, expect.anything());
    expect(casilla(arbol).props.disabled).toBe(true);
  });

  it('abrirlo con otra app no habilita nada', async () => {
    const arbol = montar();
    await tocar(arbol, 'Abrir con…');
    expect(casilla(arbol).props.disabled).toBe(true);
  });

  it('tras el dibujo correcto habilita la casilla, y aceptar sigue siendo consciente', async () => {
    const arbol = montar();
    await tocar(arbol, 'Abrir documento para revisarlo');
    act(() => arbol.root.findByType(PdfViewer).props.onRendered());
    expect(casilla(arbol).props.disabled).toBe(false);
    expect(boton(arbol, 'Firmar / Aceptar').props.disabled).toBe(true);
    act(() => casilla(arbol).props.onPress());
    expect(boton(arbol, 'Firmar / Aceptar').props.disabled).toBe(false);
    expect(arbol.root.findAllByType(Ionicons).some((i) => i.props.name === 'checkbox')).toBe(true);
  });
});
