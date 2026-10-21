import { Text } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { ElegibilidadPrestamoResumen } from '@/components/ElegibilidadPrestamoResumen';
import { elegibilidadDesdeRespuesta, fechaDisponibleTexto, mensajeNoElegible, normalizeElegibilidadPrestamo, vistaElegibilidad } from '@/utils/prestamoElegibilidad';

// Reanimated/Worklets no inicializan en jest: su mock oficial (los componentes se renderizan de verdad).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- el mock oficial se carga con require dentro de jest.mock.
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- idem.
jest.mock("react-native-reanimated", () => ({ ...require("react-native-reanimated/mock"), useReducedMotion: () => false }));

/** Ejemplo literal del contrato (docs/SOLICITUDES_UNIFICADAS.md → «Préstamos: 6 meses completos»). */
const NO_CUMPLE = {
  cumple: false,
  meses_minimos: 6,
  fecha_ingreso: '2026-05-08',
  antiguedad: { anios: 0, meses: 5, dias: 12 },
  antiguedad_texto: '5 meses 12 días',
  disponible_desde: '2026-11-08',
  disponible_desde_texto: '08/11/2026',
  fecha_servidor: '2026-10-20',
  mensaje: 'Necesitas mínimo 6 meses de antigüedad para solicitar un préstamo. Podrás solicitarlo a partir del 08/11/2026.',
};

const CUMPLE = { ...NO_CUMPLE, cumple: true, fecha_ingreso: '2026-04-20', antiguedad: { anios: 0, meses: 6, dias: 0 }, antiguedad_texto: '6 meses', disponible_desde: '2026-10-20', disponible_desde_texto: '20/10/2026', mensaje: 'Ya puedes solicitar un préstamo.' };

function textos(element: React.ReactElement): string[] {
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = renderer.create(element);
  });
  return arbol.root.findAllByType(Text).map((n) => String(n.props.children));
}

describe('elegibilidad de préstamo', () => {
  it('lee `{ data: {...} }` del endpoint y descarta respuestas sin contrato', () => {
    expect(elegibilidadDesdeRespuesta({ data: NO_CUMPLE })?.cumple).toBe(false);
    expect(normalizeElegibilidadPrestamo({ foo: 1 })).toBeNull();
  });

  it('no cumple: botón deshabilitado «Disponible al cumplir 6 meses» y aviso con el mensaje del backend', () => {
    const vista = vistaElegibilidad(normalizeElegibilidadPrestamo(NO_CUMPLE));
    expect(vista).toMatchObject({
      botonTitulo: 'Disponible al cumplir 6 meses',
      botonHabilitado: false,
      antiguedad: 'Antigüedad actual: 5 meses 12 días',
      disponibleDesde: 'Disponible desde: 08/11/2026',
      aviso: { titulo: 'Aún no puedes solicitar un préstamo', mensaje: 'Necesitas mínimo 6 meses de antigüedad para solicitar un préstamo. Podrás solicitarlo a partir del 08/11/2026.' },
    });
  });

  it('cumple (exactamente 6 meses): «Solicitar préstamo» activo y sin aviso', () => {
    const vista = vistaElegibilidad(normalizeElegibilidadPrestamo(CUMPLE));
    expect(vista).toMatchObject({ botonTitulo: 'Solicitar préstamo', botonHabilitado: true, aviso: null, disponibleDesde: 'Disponible desde: 20/10/2026' });
  });

  it('sin fecha de ingreso: no hay fecha y el aviso pide a RH capturarla', () => {
    const vista = vistaElegibilidad(
      normalizeElegibilidadPrestamo({ ...NO_CUMPLE, fecha_ingreso: null, antiguedad: null, antiguedad_texto: null, disponible_desde: null, disponible_desde_texto: null, mensaje: 'Necesitas mínimo 6 meses de antigüedad para solicitar un préstamo. No tenemos registrada tu fecha de ingreso; pide a RH que la capture en tu expediente.' }),
    );
    expect(vista.botonHabilitado).toBe(false);
    expect(vista.disponibleDesde).toBeNull();
    expect(vista.aviso?.mensaje).toContain('pide a RH');
  });

  it('sin respuesta del backend no bloquea (el POST vuelve a validar con 422)', () => {
    expect(vistaElegibilidad(null)).toMatchObject({ botonTitulo: 'Solicitar préstamo', botonHabilitado: true, aviso: null });
  });

  it('mensaje de respaldo (backend sin `mensaje`): mínimo de meses y fecha en que podrá solicitarlo', () => {
    expect(mensajeNoElegible(6, '08/11/2026')).toBe('Necesitas mínimo 6 meses de antigüedad para solicitar un préstamo. Podrás solicitarlo a partir del 08/11/2026.');
    expect(mensajeNoElegible(6, null)).toBe('Necesitas mínimo 6 meses de antigüedad para solicitar un préstamo.');
    expect(vistaElegibilidad(normalizeElegibilidadPrestamo({ ...NO_CUMPLE, mensaje: null })).aviso?.mensaje).toBe(
      'Necesitas mínimo 6 meses de antigüedad para solicitar un préstamo. Podrás solicitarlo a partir del 08/11/2026.',
    );
  });

  it('antiguedad_meses es opcional (backend anterior → null)', () => {
    expect(normalizeElegibilidadPrestamo({ ...NO_CUMPLE, antiguedad_meses: 5 })?.antiguedad_meses).toBe(5);
    expect(normalizeElegibilidadPrestamo(NO_CUMPLE)?.antiguedad_meses).toBeNull();
  });

  it('la fecha nunca pasa por la zona del teléfono', () => {
    expect(fechaDisponibleTexto({ disponible_desde: '2027-04-20', disponible_desde_texto: null })).toBe('20/04/2027');
  });

  it('render: antigüedad, fecha y aviso con los textos del backend', () => {
    const t = textos(<ElegibilidadPrestamoResumen elegibilidad={normalizeElegibilidadPrestamo(NO_CUMPLE)} />);
    expect(t).toEqual(expect.arrayContaining(['Antigüedad actual', '5 meses 12 días', 'Disponible desde', '08/11/2026', 'Aún no puedes solicitar un préstamo']));
    expect(t).toContain('Necesitas mínimo 6 meses de antigüedad para solicitar un préstamo. Podrás solicitarlo a partir del 08/11/2026.');
  });

  it('render: si cumple no hay aviso', () => {
    const t = textos(<ElegibilidadPrestamoResumen elegibilidad={normalizeElegibilidadPrestamo(CUMPLE)} />);
    expect(t).not.toContain('Aún no puedes solicitar un préstamo');
    expect(t).toContain('6 meses');
  });
});
