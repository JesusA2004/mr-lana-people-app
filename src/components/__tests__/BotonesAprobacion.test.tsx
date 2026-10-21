import { Text } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { BotonesAprobacion } from '../BotonesAprobacion';
import { Button } from '../Button';
import { FlujoAprobacionTimeline } from '../FlujoAprobacionTimeline';

import { normalizeFlujo } from '@/utils/flujoAprobacion';

// Reanimated/Worklets no inicializan en jest: su mock oficial (los componentes se renderizan de verdad).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- el mock oficial se carga con require dentro de jest.mock.
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- idem.
jest.mock("react-native-reanimated", () => ({ ...require("react-native-reanimated/mock"), useReducedMotion: () => false }));

const PASOS = [
  { orden: 1, clave: 'creada', etiqueta: 'Solicitud creada', responsable: { id: 1, nombre: 'Ana López' }, estado: 'aprobado', fecha: '2026-10-20T14:30:00-06:00' },
  { orden: 2, clave: 'jefe_inmediato', etiqueta: 'Jefe directo', responsables: [{ id: 7, nombre: 'Alberto Carlos Bueno' }], estado: 'pendiente', estado_etiqueta: 'Pendiente' },
  { orden: 3, clave: 'rh', etiqueta: 'Recursos Humanos', estado: 'esperando', estado_etiqueta: 'Esperando paso anterior' },
];

const flujo = (puede: boolean, accion: string | null) =>
  normalizeFlujo({
    flujo: PASOS,
    puede_actuar_usuario_actual: puede,
    accion_usuario_actual: accion,
    motivo_no_puede: puede ? null : 'RH podrá aprobar cuando Alberto Carlos Bueno dé su visto bueno.',
    pendiente_de: { etiqueta: 'Jefe directo', nombres: ['Alberto Carlos Bueno'] },
  })!;

function render(element: React.ReactElement): ReactTestRenderer {
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = renderer.create(element);
  });
  return arbol;
}

const noop = () => undefined;

describe('<BotonesAprobacion />', () => {
  it('puede_actuar = false: un solo «Aprobar» DESHABILITADO (nunca parece activo)', () => {
    const arbol = render(<BotonesAprobacion flujo={flujo(false, null)} tipo="vacaciones" onAprobar={noop} onRechazar={noop} onRevisarDetalle={noop} />);
    const botones = arbol.root.findAllByType(Button);
    expect(botones).toHaveLength(1);
    expect(botones[0]!.props).toMatchObject({ title: 'Aprobar', disabled: true });
  });

  it('le toca (visto bueno): Rechazar y Aprobar grandes y activos', () => {
    const onAprobar = jest.fn();
    const arbol = render(<BotonesAprobacion flujo={flujo(true, 'visto_bueno')} tipo="vacaciones" onAprobar={onAprobar} onRechazar={noop} onRevisarDetalle={noop} />);
    const botones = arbol.root.findAllByType(Button);
    expect(botones.map((b) => b.props.title)).toEqual(['Rechazar', 'Aprobar']);
    expect(botones.every((b) => b.props.disabled === false)).toBe(true);
    act(() => botones[1]!.props.onPress());
    expect(onAprobar).toHaveBeenCalledTimes(1);
  });

  it('sin conexión los botones se deshabilitan aunque le toque', () => {
    const arbol = render(<BotonesAprobacion flujo={flujo(true, 'aprobar')} tipo="vacaciones" offline onAprobar={noop} onRechazar={noop} onRevisarDetalle={noop} />);
    expect(arbol.root.findAllByType(Button).every((b) => b.props.disabled === true)).toBe(true);
  });

  it('préstamo por autorizar: lleva al detalle de RH (captura de cargo/IVA)', () => {
    const arbol = render(<BotonesAprobacion flujo={flujo(true, 'autorizar_prestamo')} tipo="prestamo" onAprobar={noop} onRechazar={noop} onRevisarDetalle={noop} />);
    const botones = arbol.root.findAllByType(Button);
    expect(botones).toHaveLength(1);
    expect(botones[0]!.props).toMatchObject({ title: 'Revisar y autorizar', disabled: false });
  });
});

describe('<FlujoAprobacionTimeline />', () => {
  it('pinta cada paso del backend con su estado visible', () => {
    const arbol = render(<FlujoAprobacionTimeline flujo={flujo(false, null)} />);
    const textos = arbol.root.findAllByType(Text).map((n) => String(n.props.children));
    expect(textos).toEqual(
      expect.arrayContaining([
        'Solicitud creada',
        'Ana López — 20/10/2026 14:30',
        'Jefe directo',
        'Alberto Carlos Bueno — Pendiente',
        'Recursos Humanos',
        'Esperando paso anterior',
      ]),
    );
    const etiquetas = arbol.root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessible === true).map((n) => n.props.accessibilityLabel as string)
      .filter((etiqueta, i, todas) => todas.indexOf(etiqueta) === i);
    expect(etiquetas[0]).toMatch(/^✓ Solicitud creada/);
    expect(etiquetas[1]).toMatch(/^○ Jefe directo/);
  });
});
