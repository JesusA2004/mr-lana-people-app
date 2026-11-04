import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { BarraProgresoVideo } from '../BarraProgresoVideo';
import { ExpedienteGate } from '../guia/ExpedienteGate';

import type { EstadoExpedienteIncompleto } from '@/types/guia';
import {
  formatoTiempo,
  listaPaginasFaltantes,
  paginasQueBloqueanVideo,
  posicionDesdeBarra,
  posicionRetroceder,
  textoPaginasFaltantes,
} from '@/utils/induccion';

// Reanimated/Worklets no inicializan en jest: su mock oficial.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- el mock oficial se carga con require dentro de jest.mock.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- idem.
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true }) }));

let mockEstado: EstadoExpedienteIncompleto & { cargando: boolean };
jest.mock('@/hooks/queries/useGuia', () => ({
  useBloqueoExpediente: () => mockEstado,
  useGuia: () => ({
    data: {
      siguiente: {
        clave: 'documento_7',
        grupo: 'documentos',
        titulo: 'Acta de nacimiento',
        descripcion: '',
        estado: 'pendiente',
        estadoEtiqueta: 'Pendiente',
        motivo: null,
        detalle: [],
        accion: { etiqueta: 'Subir documento', destino: 'documento', params: { document_type_id: 7 } },
        bloqueaApp: true,
      },
    },
  }),
}));

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

const SIN_BLOQUEO: EstadoExpedienteIncompleto & { cargando: boolean } = {
  aplica: true,
  bloqueado: false,
  mensaje: null,
  motivos: [],
  datosFaltantes: 0,
  documentosPorSubir: 0,
  documentosRechazados: 0,
  cargando: false,
};

describe('ExpedienteGate (modo completar expediente)', () => {
  beforeEach(() => mockPush.mockClear());

  it('sin bloqueo pinta la pantalla tal cual', () => {
    mockEstado = SIN_BLOQUEO;
    const arbol = render(
      <ExpedienteGate modulo="Solicitudes">
        <Text>Mis solicitudes</Text>
      </ExpedienteGate>,
    );
    expect(textos(arbol)).toContain('Mis solicitudes');
  });

  it('con faltantes explica qué falta en lista y lleva al siguiente paso', () => {
    mockEstado = {
      ...SIN_BLOQUEO,
      bloqueado: true,
      mensaje: 'Completa tu expediente para usar esta sección. Te falta: 2 documentos por subir.',
      motivos: [{ clave: 'documentos_por_subir', titulo: 'Te faltan 2 documentos por subir', detalle: ['Acta de nacimiento', 'CURP'], conteo: 2 }],
      documentosPorSubir: 2,
    };
    const arbol = render(
      <ExpedienteGate modulo="Solicitudes" enTab>
        <Text>Mis solicitudes</Text>
      </ExpedienteGate>,
    );
    const contenido = textos(arbol);
    expect(contenido).not.toContain('Mis solicitudes');
    expect(contenido).toContain('Solicitudes está en pausa');
    expect(contenido).toContain('Te faltan 2 documentos por subir');
    expect(contenido).toContain('Acta de nacimiento');

    const boton = arbol.root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Siguiente: Acta de nacimiento');
    expect(boton.length).toBeGreaterThan(0);
    act(() => {
      boton[0].props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/expediente/[tipoId]', params: { tipoId: '7' } });
  });
});

describe('BarraProgresoVideo: no se puede arrastrar más allá de lo visto', () => {
  it('un toque al 90 % con solo 40 s vistos (de 100) lleva a 40 s, nunca más', () => {
    const onBuscar = jest.fn();
    const arbol = render(<BarraProgresoVideo duracion={100} actual={10} maximoVisto={40} onBuscar={onBuscar} />);
    const barra = arbol.root.findByProps({ testID: 'barra-progreso-video' });
    act(() => {
      barra.props.onLayout({ nativeEvent: { layout: { width: 300, height: 32, x: 0, y: 0 } } });
    });
    act(() => {
      arbol.root.findByProps({ testID: 'barra-progreso-video' }).props.onResponderRelease({ nativeEvent: { locationX: 270 } });
    });
    expect(onBuscar).toHaveBeenLastCalledWith(40);

    // Dentro de lo visto sí se mueve libre (regresar).
    act(() => {
      arbol.root.findByProps({ testID: 'barra-progreso-video' }).props.onResponderMove({ nativeEvent: { locationX: 60 } });
    });
    expect(onBuscar).toHaveBeenLastCalledWith(20);
  });

  it('posicionDesdeBarra nunca rebasa lo visto ni la duración', () => {
    expect(posicionDesdeBarra(1, 100, 40)).toBe(40);
    expect(posicionDesdeBarra(0.25, 100, 40)).toBe(25);
    expect(posicionDesdeBarra(2, 100, 500)).toBe(100);
    expect(posicionDesdeBarra(-1, 100, 40)).toBe(0);
    expect(posicionDesdeBarra(0.5, 0, 40)).toBe(0);
    expect(posicionRetroceder(5, 10)).toBe(0);
    expect(posicionRetroceder(75, 10)).toBe(65);
    expect(formatoTiempo(605)).toBe('10:05');
    expect(formatoTiempo(3729)).toBe('1:02:09');
  });
});

describe('Páginas faltantes de la inducción (decir CUÁL y llevar ahí)', () => {
  it('lista y texto legible', () => {
    expect(listaPaginasFaltantes([...Array.from({ length: 29 }, (_, i) => i + 1)], 30)).toEqual([30]);
    expect(textoPaginasFaltantes([30])).toBe('Te falta la página 30');
    expect(textoPaginasFaltantes([12, 13, 30])).toBe('Te faltan las páginas 12, 13 y 30');
    expect(textoPaginasFaltantes([1, 2, 3, 4, 5, 6, 7])).toBe('Te faltan 7 páginas (empieza en la 1)');
  });

  it('el video queda bloqueado por las páginas que manda el backend, menos las ya vistas aquí', () => {
    const material = { tipo: 'video' as const, videoDisponible: true, videoEstado: 'listo', videoMensaje: null, videoBloqueado: true, paginasFaltantes: [29, 30], videoBloqueadoMensaje: null };
    expect(paginasQueBloqueanVideo(material, [29])).toEqual([30]);
    expect(paginasQueBloqueanVideo(material, [29, 30])).toEqual([]);
    expect(paginasQueBloqueanVideo({ ...material, videoBloqueado: false }, [])).toEqual([]);
  });
});
