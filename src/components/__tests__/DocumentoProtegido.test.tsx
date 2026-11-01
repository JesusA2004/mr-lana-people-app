import { Platform, Text } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { Button } from '../Button';
import { DocumentoProtegido, TEXTO_RESTRICCION_CONSULTA, TEXTO_SIN_AUTORIZACION } from '../DocumentoProtegido';
import { PdfViewer } from '../PdfViewer';

import { discoFalso, FakeFile, PDF_BYTES } from '@/test/fakeFileSystem';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- los mocks oficiales se cargan con require dentro de jest.mock.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- idem.
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- idem.
jest.mock('expo-file-system', () => require('@/test/fakeFileSystem').fakeExpoFileSystem);
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(async () => undefined),
  allowScreenCaptureAsync: jest.fn(async () => undefined),
}));
const mockCompartir = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: (...args: unknown[]) => mockCompartir(...args) }));
const mockIntent = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('expo-intent-launcher', () => ({ startActivityAsync: (...args: unknown[]) => mockIntent(...args) }));
const mockExpirar = jest.fn(async () => undefined);
jest.mock('@/store/authStore', () => ({ useAuthStore: (selector: (s: unknown) => unknown) => selector({ token: 'tkn', expirarSesion: mockExpirar }) }));
// El motor WebView no existe en Node: la prueba dispara sus eventos reales (onRendered/onError).
jest.mock('../PdfViewer', () => ({ PdfViewer: () => null }));

const titulos = (arbol: ReactTestRenderer) => arbol.root.findAllByType(Button).map((b) => b.props.title as string);
const textos = (arbol: ReactTestRenderer) => arbol.root.findAllByType(Text).map((t) => t.props.children).flat().join(' | ');
const boton = (arbol: ReactTestRenderer, titulo: string) => arbol.root.findAllByType(Button).find((b) => b.props.title === titulo)!;
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

function montar(element: React.ReactElement): ReactTestRenderer {
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = renderer.create(element);
  });
  return arbol;
}

let descargas: string[];

beforeEach(() => {
  discoFalso.clear();
  descargas = [];
  mockCompartir.mockClear();
  mockIntent.mockClear();
  mockExpirar.mockClear();
  FakeFile.descargaFalsa = async (url, destino) => {
    descargas.push(url);
    discoFalso.set(destino.uri, PDF_BYTES);
  };
});

afterEach(() => {
  Platform.OS = 'ios';
});

function fallarCon(mensaje: string) {
  FakeFile.descargaFalsa = async (url, destino) => {
    descargas.push(url);
    discoFalso.set(destino.uri, new Uint8Array([1])); // parcial en disco
    throw new Error(mensaje);
  };
}

describe('modo descarga', () => {
  it('autorizado: muestra nombre, estado y acciones, sin visor embebido', () => {
    const arbol = montar(<DocumentoProtegido titulo="Contrato" estado={{ status: 'aprobado', etiqueta: 'Aprobado' }} modo="descarga" path="/doc/1" puedeDescargar />);
    expect(titulos(arbol)).toEqual(['Descargar PDF', 'Abrir con…']);
    expect(textos(arbol)).toContain('Contrato');
    expect(textos(arbol)).toContain('Aprobado');
    expect(arbol.root.findAllByType(PdfViewer)).toHaveLength(0);
  });

  it('sin flag no hay descarga: ni botones ni petición', () => {
    const arbol = montar(<DocumentoProtegido titulo="Contrato" modo="descarga" path="/doc/1" />);
    expect(titulos(arbol)).toEqual([]);
    expect(textos(arbol)).toContain(TEXTO_SIN_AUTORIZACION);
    expect(descargas).toHaveLength(0);
  });

  it('un flag que no es true estricto tampoco autoriza', () => {
    const arbol = montar(<DocumentoProtegido titulo="Contrato" modo="descarga" path="/doc/1" puedeDescargar={'1' as unknown as boolean} />);
    expect(titulos(arbol)).toEqual([]);
  });

  it('doble toque en el mismo frame: una sola descarga y una sola salida', async () => {
    const arbol = montar(<DocumentoProtegido titulo="Contrato" modo="descarga" path="/doc/1" puedeDescargar />);
    await act(async () => {
      const presionar = boton(arbol, 'Descargar PDF').props.onPress;
      await Promise.all([presionar(), presionar()]);
    });
    await flush();
    expect(descargas).toHaveLength(1);
    expect(mockCompartir).toHaveBeenCalledTimes(1);
  });

  it('guardar y luego abrir reutilizan el mismo archivo', async () => {
    const arbol = montar(<DocumentoProtegido titulo="Contrato" modo="descarga" path="/doc/1" puedeDescargar />);
    await tocar(arbol, 'Descargar PDF');
    await tocar(arbol, 'Abrir con…');
    expect(descargas).toHaveLength(1);
  });

  it('Android: «Abrir con…» entrega el nombre legible, no el temporal, y al salir no queda nada', async () => {
    Platform.OS = 'android';
    const arbol = montar(<DocumentoProtegido titulo="Contrato de Ana López" modo="descarga" path="/doc/1" puedeDescargar />);
    await tocar(arbol, 'Abrir con…');
    expect(mockIntent).toHaveBeenCalledTimes(1);
    const [, opciones] = mockIntent.mock.calls[0] as [string, { data: string }];
    expect(opciones.data).toMatch(/mrlana-salida\/Contrato de Ana Lopez\.pdf$/);
    act(() => arbol.unmount());
    expect([...discoFalso.keys()]).toEqual([]);
  });

  it('error de red: mensaje en español, sin parcial en disco, y reintenta', async () => {
    fallarCon('Unable to resolve host: network');
    const arbol = montar(<DocumentoProtegido titulo="Contrato" modo="descarga" path="/doc/1" puedeDescargar />);
    await tocar(arbol, 'Descargar PDF');
    expect(textos(arbol)).toContain('Revisa tu conexión');
    expect(textos(arbol)).not.toContain('Unable');
    expect([...discoFalso.keys()]).toEqual([]);
    FakeFile.descargaFalsa = async (url, destino) => {
      descargas.push(url);
      discoFalso.set(destino.uri, PDF_BYTES);
    };
    await tocar(arbol, 'Reintentar descarga');
    expect(descargas).toHaveLength(2);
    expect(mockCompartir).toHaveBeenCalledTimes(1);
  });

  it('403: dice que no hay permiso y no cierra sesión', async () => {
    fallarCon('HTTP 403');
    const arbol = montar(<DocumentoProtegido titulo="Contrato" modo="descarga" path="/doc/1" puedeDescargar />);
    await tocar(arbol, 'Descargar PDF');
    expect(textos(arbol)).toContain('No tienes permiso para descargar este documento.');
    expect(mockExpirar).not.toHaveBeenCalled();
    expect(mockCompartir).not.toHaveBeenCalled();
  });

  it('401: expira la sesión', async () => {
    fallarCon('HTTP 401');
    const arbol = montar(<DocumentoProtegido titulo="Contrato" modo="descarga" path="/doc/1" puedeDescargar />);
    await tocar(arbol, 'Descargar PDF');
    expect(mockExpirar).toHaveBeenCalledTimes(1);
  });
});

describe('modo consulta', () => {
  const consulta = (extra = {}) => <DocumentoProtegido titulo="Expediente" modo="consulta" path="/doc/1/descargar" pathConsulta="/doc/1/ver" marcaDeAgua="Ana · hoy" {...extra} />;

  it('explica la restricción y no ofrece ninguna salida, aunque llegue un flag', () => {
    const arbol = montar(consulta({ puedeDescargar: true }));
    expect(textos(arbol)).toContain(TEXTO_RESTRICCION_CONSULTA);
    expect(titulos(arbol)).toEqual(['Consultar documento']);
  });

  it('abre el visor con la ruta de consulta, con marca de agua y sin entregar a otra app', async () => {
    Platform.OS = 'android';
    const arbol = montar(consulta());
    await tocar(arbol, 'Consultar documento');
    expect(descargas).toEqual([expect.stringContaining('/doc/1/ver')]);
    expect(arbol.root.findAllByType(PdfViewer)).toHaveLength(1);
    expect(textos(arbol)).toContain('Ana');
    expect(titulos(arbol)).toEqual(expect.not.arrayContaining(['Abrir con…', 'Descargar PDF', 'Abrir documento', 'Guardar en el teléfono']));
    expect(mockIntent).not.toHaveBeenCalled();
    expect(mockCompartir).not.toHaveBeenCalled();
  });

  it('al cerrar no deja el archivo en disco', async () => {
    const arbol = montar(consulta());
    await tocar(arbol, 'Consultar documento');
    expect(discoFalso.size).toBe(1);
    await tocar(arbol, 'Cerrar');
    expect(discoFalso.size).toBe(0);
    expect(arbol.root.findAllByType(PdfViewer)).toHaveLength(0);
  });

  it('403 habla de consultar, no de descargar', async () => {
    fallarCon('HTTP 403');
    const arbol = montar(consulta());
    await tocar(arbol, 'Consultar documento');
    expect(textos(arbol)).toContain('No tienes permiso para consultar este documento.');
  });
});

describe('modo firma', () => {
  const firma = (onVerificada: () => void) => (
    <DocumentoProtegido titulo="Contrato" modo="firma" path="/doc/1" pathConsulta="/doc/1" puedeDescargar onAperturaVerificada={onVerificada} />
  );

  it('cerrar el visor sin que se dibuje NO verifica la apertura', async () => {
    const verificada = jest.fn();
    const arbol = montar(firma(verificada));
    await tocar(arbol, 'Abrir documento para revisarlo');
    await tocar(arbol, 'Cerrar');
    expect(verificada).not.toHaveBeenCalled();
  });

  it('solo el dibujo correcto verifica la apertura', async () => {
    const verificada = jest.fn();
    const arbol = montar(firma(verificada));
    await tocar(arbol, 'Abrir documento para revisarlo');
    expect(verificada).not.toHaveBeenCalled();
    act(() => arbol.root.findByType(PdfViewer).props.onRendered());
    expect(verificada).toHaveBeenCalledTimes(1);
  });

  it('si el visor falla: error con Reintentar, sin verificar, y baja una copia nueva', async () => {
    const verificada = jest.fn();
    const arbol = montar(firma(verificada));
    await tocar(arbol, 'Abrir documento para revisarlo');
    act(() => arbol.root.findByType(PdfViewer).props.onError('No se pudo mostrar este documento en este teléfono.'));
    await flush();
    expect(verificada).not.toHaveBeenCalled();
    expect(textos(arbol)).toContain('No se pudo mostrar');
    expect(arbol.root.findAllByType(PdfViewer)).toHaveLength(0);
    await tocar(arbol, 'Reintentar');
    expect(descargas).toHaveLength(2);
    act(() => arbol.root.findByType(PdfViewer).props.onRendered());
    expect(verificada).toHaveBeenCalledTimes(1);
  });

  it('error de descarga: Reintentar y sigue sin verificar', async () => {
    fallarCon('network');
    const verificada = jest.fn();
    const arbol = montar(firma(verificada));
    await tocar(arbol, 'Abrir documento para revisarlo');
    expect(titulos(arbol)).toContain('Reintentar');
    expect(verificada).not.toHaveBeenCalled();
  });

  it('abrir con otra app no verifica, y el visor pide su propia copia al servidor', async () => {
    const verificada = jest.fn();
    const arbol = montar(firma(verificada));
    await tocar(arbol, 'Abrir con…');
    expect(verificada).not.toHaveBeenCalled();
    await tocar(arbol, 'Abrir documento para revisarlo');
    expect(descargas).toHaveLength(2);
  });

  it('reabrir vuelve a pedir el documento: el servidor anota cada consulta y puede haber otra versión', async () => {
    const arbol = montar(<DocumentoProtegido titulo="Contrato" modo="firma" path="/doc/1/descargar" pathConsulta="/doc/1/ver" puedeDescargar />);
    await tocar(arbol, 'Abrir documento para revisarlo');
    await tocar(arbol, 'Cerrar');
    await tocar(arbol, 'Abrir documento para revisarlo');
    expect(descargas.filter((url) => url.endsWith('/doc/1/ver'))).toHaveLength(2);
  });

  it('al cerrar no deja el archivo en disco', async () => {
    const arbol = montar(<DocumentoProtegido titulo="Contrato" modo="firma" path="/doc/1/descargar" pathConsulta="/doc/1/ver" puedeDescargar />);
    await tocar(arbol, 'Abrir documento para revisarlo');
    expect(discoFalso.size).toBe(1);
    await tocar(arbol, 'Cerrar');
    expect(discoFalso.size).toBe(0);
  });
});

describe('cambio de ruta en la misma pantalla', () => {
  const pendiente = <DocumentoProtegido titulo="Contrato" modo="firma" path="/doc/1/descargar" pathConsulta="/doc/1/ver" puedeDescargar />;
  const firmado = <DocumentoProtegido titulo="Contrato" modo="descarga" path="/doc/1/descargar" pathConsulta="/doc/1/ver" puedeDescargar />;

  const actualizar = async (arbol: ReactTestRenderer, elemento: React.ReactElement) => {
    act(() => arbol.update(elemento));
    await flush();
  };

  it('el documento pasa a firma: el visor hace GET /ver aunque ya hubiera una copia de /descargar', async () => {
    const arbol = montar(firmado);
    await tocar(arbol, 'Descargar PDF');
    expect(descargas).toEqual([expect.stringContaining('/doc/1/descargar')]);
    await actualizar(arbol, pendiente);
    await tocar(arbol, 'Abrir documento para revisarlo');
    expect(descargas).toEqual([expect.stringContaining('/doc/1/descargar'), expect.stringContaining('/doc/1/ver')]);
  });

  it('tras firmar: «Descargar PDF» hace GET /descargar, no reutiliza la copia de /ver', async () => {
    const arbol = montar(pendiente);
    await tocar(arbol, 'Abrir documento para revisarlo');
    await actualizar(arbol, firmado);
    await tocar(arbol, 'Descargar PDF');
    expect(descargas).toEqual([expect.stringContaining('/doc/1/ver'), expect.stringContaining('/doc/1/descargar')]);
  });

  it('borra la copia de la ruta anterior y cierra el visor que la mostraba', async () => {
    const arbol = montar(pendiente);
    await tocar(arbol, 'Abrir documento para revisarlo');
    expect(arbol.root.findAllByType(PdfViewer)).toHaveLength(1);
    await actualizar(arbol, firmado);
    expect(discoFalso.size).toBe(0);
    expect(arbol.root.findAllByType(PdfViewer)).toHaveLength(0);
  });

  it('una descarga en curso de la ruta anterior no se entrega a la nueva ni deja archivo', async () => {
    const abortos: AbortSignal[] = [];
    let terminarVieja!: () => void;
    FakeFile.descargaFalsa = async (url, destino, opciones) => {
      descargas.push(url);
      if (url.endsWith('/doc/1/descargar')) {
        abortos.push(opciones.signal!);
        await new Promise<void>((resolve) => {
          terminarVieja = resolve;
        });
      }
      discoFalso.set(destino.uri, PDF_BYTES);
    };
    const arbol = montar(firmado);
    let enCurso!: Promise<void>;
    act(() => {
      enCurso = boton(arbol, 'Descargar PDF').props.onPress();
    });
    await flush();
    await actualizar(arbol, pendiente);
    expect(abortos[0]?.aborted).toBe(true);
    await tocar(arbol, 'Abrir documento para revisarlo');
    expect(descargas).toEqual([expect.stringContaining('/doc/1/descargar'), expect.stringContaining('/doc/1/ver')]);
    expect(arbol.root.findAllByType(PdfViewer)).toHaveLength(1);
    await act(async () => {
      terminarVieja();
      await enCurso;
    });
    await flush();
    expect(mockCompartir).not.toHaveBeenCalled();
    expect(discoFalso.size).toBe(1);
  });
});
