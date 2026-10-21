import type { AprobacionItem } from '@/types/aprobaciones';
import {
  armarBandeja,
  etiquetasAccion,
  formatFechaHoraFlujo,
  lineaEstadoBandeja,
  modoAcciones,
  motivoSinTurno,
  normalizeAprobacionItem,
  normalizeConteoAprobaciones,
  normalizeFlujo,
  pasoVisual,
  pillCortoFlujo,
  pillEstadoFlujo,
  textoPendienteDe,
} from '@/utils/flujoAprobacion';

/** Contrato literal de docs/SOLICITUDES_UNIFICADAS.md («Contrato API del flujo»), visto por RH antes del jefe. */
const RH_ANTES_DEL_JEFE = {
  flujo: [
    {
      orden: 1,
      clave: 'creada',
      rol: 'Solicitante',
      etiqueta: 'Solicitud creada',
      responsable: { id: 15, nombre: 'Ana López' },
      responsables: [],
      estado: 'aprobado',
      estado_etiqueta: 'Enviada',
      fecha: '2026-10-20T14:30:00-06:00',
      comentario: null,
      decidio: null,
      bloqueado: false,
      puede_actuar: false,
      motivo_no_puede: null,
    },
    {
      orden: 2,
      clave: 'jefe_inmediato',
      rol: 'Gerente de sucursal',
      etiqueta: 'Gerente de sucursal',
      responsable: { id: 7, nombre: 'Alberto Carlos Bueno' },
      responsables: [{ id: 7, nombre: 'Alberto Carlos Bueno' }],
      estado: 'pendiente',
      estado_etiqueta: 'Pendiente',
      fecha: null,
      comentario: null,
      decidio: null,
      bloqueado: false,
      puede_actuar: false,
      motivo_no_puede: 'Este paso le corresponde a Alberto Carlos Bueno.',
    },
    { orden: 3, clave: 'regional', etiqueta: 'Gerente regional', estado: 'esperando', estado_etiqueta: 'Esperando paso anterior' },
    { orden: 4, clave: 'rh', rol: 'Recursos Humanos', etiqueta: 'RH autoriza el préstamo', responsable: null, estado: 'esperando', estado_etiqueta: 'Esperando paso anterior' },
  ],
  puede_actuar_usuario_actual: false,
  accion_usuario_actual: null,
  motivo_no_puede: 'RH podrá aprobar cuando Alberto Carlos Bueno dé su visto bueno.',
  pendiente_de: { clave: 'jefe_inmediato', etiqueta: 'Gerente de sucursal', nombres: ['Alberto Carlos Bueno'], texto: 'Pendiente de aprobación de: Alberto Carlos Bueno' },
  estado_flujo_texto: 'Pendiente de aprobación de: Alberto Carlos Bueno',
};

describe('normalizeFlujo', () => {
  it('lee el contrato del backend y ordena los pasos por `orden`', () => {
    const flujo = normalizeFlujo({ ...RH_ANTES_DEL_JEFE, flujo: [...RH_ANTES_DEL_JEFE.flujo].reverse() })!;
    expect(flujo.pasos.map((p) => p.clave)).toEqual(['creada', 'jefe_inmediato', 'regional', 'rh']);
    expect(flujo.puede_actuar_usuario_actual).toBe(false);
    expect(flujo.pendiente_de?.nombres).toEqual(['Alberto Carlos Bueno']);
  });

  it('devuelve null si el backend no manda `flujo` (versión anterior)', () => {
    expect(normalizeFlujo({ estado: 'enviada' })).toBeNull();
  });

  it('nunca habilita una acción desconocida aunque `puede_actuar_usuario_actual` sea true', () => {
    const flujo = normalizeFlujo({ ...RH_ANTES_DEL_JEFE, puede_actuar_usuario_actual: true, accion_usuario_actual: 'borrar_todo' })!;
    expect(flujo.puede_actuar_usuario_actual).toBe(false);
    expect(flujo.accion_usuario_actual).toBeNull();
  });
});

describe('pasoVisual: flujo → estados visibles', () => {
  const flujo = normalizeFlujo(RH_ANTES_DEL_JEFE)!;
  const [creada, jefe, regional, rh] = flujo.pasos.map(pasoVisual);

  it('✓ Solicitud creada con nombre y fecha del servidor', () => {
    expect(creada).toMatchObject({ simbolo: '✓', tono: 'exito', titulo: 'Solicitud creada', detalle: 'Ana López — 20/10/2026 14:30', completado: true });
  });

  it('○ Jefe directo pendiente con su nombre', () => {
    expect(jefe).toMatchObject({ simbolo: '○', tono: 'aviso', detalle: 'Alberto Carlos Bueno — Pendiente', esMiTurno: false });
  });

  it('○ Esperando paso anterior para regional y RH', () => {
    expect(regional).toMatchObject({ simbolo: '○', tono: 'neutral', detalle: 'Esperando paso anterior' });
    expect(rh).toMatchObject({ simbolo: '○', titulo: 'RH autoriza el préstamo', detalle: 'Esperando paso anterior' });
  });

  it('✓ <nombre> — aprobado dd/mm/aaaa hh:mm cuando avanza', () => {
    const v = pasoVisual({
      ...flujo.pasos[1]!,
      estado: 'aprobado',
      fecha: '2026-10-20T14:30:00-06:00',
      decidio: { id: 7, nombre: 'Alberto Carlos Bueno' },
      comentario: 'Adelante',
    });
    expect(v).toMatchObject({ simbolo: '✓', detalle: 'Alberto Carlos Bueno — aprobado 20/10/2026 14:30', nota: 'Adelante' });
  });

  it('marca «Te toca a ti» en el paso donde la cuenta puede actuar', () => {
    expect(pasoVisual({ ...flujo.pasos[1]!, puede_actuar: true })).toMatchObject({ esMiTurno: true, detalle: 'Te toca a ti' });
  });

  it('paso bloqueado por la estructura: candado y motivo humano', () => {
    const v = pasoVisual({ ...flujo.pasos[1]!, bloqueado: true, estado_etiqueta: 'Pendiente de asignar región de aprobación', motivo_no_puede: 'RH debe asignar la región Q1/Q3.' });
    expect(v).toMatchObject({ icono: 'lock-closed', tono: 'peligro', detalle: 'Pendiente de asignar región de aprobación', nota: 'RH debe asignar la región Q1/Q3.' });
  });

  it('no aplica y rechazado', () => {
    expect(pasoVisual({ ...flujo.pasos[2]!, estado: 'no_aplica', estado_etiqueta: null })).toMatchObject({ simbolo: '–', detalle: 'No aplica' });
    expect(pasoVisual({ ...flujo.pasos[1]!, estado: 'rechazado', fecha: '2026-10-21T09:05:00-06:00', comentario: 'Sin cobertura' })).toMatchObject({
      simbolo: '✕',
      tono: 'peligro',
      detalle: 'Alberto Carlos Bueno — rechazado 21/10/2026 09:05',
      nota: 'Sin cobertura',
    });
  });
});

describe('textos de la bandeja', () => {
  const flujo = normalizeFlujo(RH_ANTES_DEL_JEFE)!;

  it('sin turno: motivo del backend, «Pendiente de aprobación de» y chip «Esperando…»', () => {
    expect(motivoSinTurno(flujo)).toBe('RH podrá aprobar cuando Alberto Carlos Bueno dé su visto bueno.');
    expect(textoPendienteDe(flujo)).toBe('Pendiente de aprobación de: Alberto Carlos Bueno');
    expect(pillEstadoFlujo(flujo)).toMatchObject({ texto: 'Esperando gerente de sucursal', tono: 'info' });
    expect(pillCortoFlujo(flujo).texto).toBe('En espera');
    expect(lineaEstadoBandeja(flujo)).toBe('Esperando gerente de sucursal');
  });

  it('sin `motivo_no_puede` arma un texto humano con los nombres', () => {
    expect(motivoSinTurno({ ...flujo, motivo_no_puede: null })).toBe('Aún no es tu turno: primero debe aprobar Alberto Carlos Bueno.');
  });

  it('cuando le toca: «Te toca» y el texto de la acción', () => {
    const turno = normalizeFlujo({ ...RH_ANTES_DEL_JEFE, puede_actuar_usuario_actual: true, accion_usuario_actual: 'visto_bueno' })!;
    expect(pillEstadoFlujo(turno).texto).toBe('Te toca');
    expect(lineaEstadoBandeja(turno)).toBe('Te toca dar tu visto bueno');
    expect(etiquetasAccion('visto_bueno')).toMatchObject({ aprobar: 'Aprobar', rechazar: 'Rechazar' });
  });
});

describe('modoAcciones', () => {
  const base = normalizeFlujo(RH_ANTES_DEL_JEFE)!;
  const con = (accion: string) => normalizeFlujo({ ...RH_ANTES_DEL_JEFE, puede_actuar_usuario_actual: true, accion_usuario_actual: accion })!;

  it('sin turno → botón deshabilitado', () => {
    expect(modoAcciones(base, 'vacaciones')).toBe('sin_turno');
  });

  it('visto bueno / aprobación simple → Aprobar y Rechazar grandes', () => {
    expect(modoAcciones(con('visto_bueno'), 'prestamo')).toBe('decidir');
    expect(modoAcciones(con('aprobar'), 'vacaciones')).toBe('decidir');
  });

  it('préstamo (cargo/IVA), baja y corrección de datos → detalle de RH', () => {
    expect(modoAcciones(con('autorizar_prestamo'), 'prestamo')).toBe('revisar_detalle');
    expect(modoAcciones(con('aprobar'), 'baja_colaborador')).toBe('revisar_detalle');
    expect(modoAcciones(con('aprobar'), 'actualizacion_datos')).toBe('revisar_detalle');
  });
});

describe('armarBandeja', () => {
  const item = (id: number, puede: boolean, origen: 'equipo' | 'rh', estado = 'enviada', creada = '2026-10-20'): AprobacionItem =>
    normalizeAprobacionItem({ id, tipo: 'vacaciones', tipo_etiqueta: 'Vacaciones', estado, colaborador: 'Ana', creada_en: creada, ...RH_ANTES_DEL_JEFE, puede_actuar_usuario_actual: puede, accion_usuario_actual: puede ? 'visto_bueno' : null }, origen)!;

  it('separa «Me toca» de «En espera» y descarta las finales', () => {
    const bandeja = armarBandeja({ equipo: [item(1, true, 'equipo'), item(2, false, 'equipo')], rh: [item(3, false, 'rh', 'aprobada')] });
    expect(bandeja.meToca.map((i) => i.id)).toEqual([1]);
    expect(bandeja.enEspera.map((i) => i.id)).toEqual([2]);
  });

  it('no duplica: si llega por equipo y por RH gana la versión donde puede actuar', () => {
    const bandeja = armarBandeja({ equipo: [item(5, false, 'equipo')], rh: [item(5, true, 'rh')] });
    expect(bandeja.meToca).toHaveLength(1);
    expect(bandeja.meToca[0]!.origen).toBe('rh');
    expect(bandeja.enEspera).toHaveLength(0);
  });

  it('lee el formato de la bandeja RH (`resource_id`, `titulo`, colaborador objeto)', () => {
    const rh = normalizeAprobacionItem({ id: 'solicitud:9', resource_id: 9, titulo: 'Préstamo', estado: 'enviada', colaborador: { id: 1, nombre: 'Luis Pérez' }, ...RH_ANTES_DEL_JEFE }, 'rh')!;
    expect(rh).toMatchObject({ id: 9, tipo_etiqueta: 'Préstamo', solicitante: 'Luis Pérez' });
  });
});

describe('utilidades', () => {
  it('formatFechaHoraFlujo usa la hora del servidor, sin convertir zona', () => {
    expect(formatFechaHoraFlujo('2026-10-20T23:45:00-06:00')).toBe('20/10/2026 23:45');
    expect(formatFechaHoraFlujo('2026-04-20')).toBe('20/04/2026');
    expect(formatFechaHoraFlujo(null)).toBe('');
  });

  it('normalizeConteoAprobaciones', () => {
    expect(normalizeConteoAprobaciones({ visto_bueno: 2, autorizar: 1, total: 3 })).toEqual({ visto_bueno: 2, autorizar: 1, total: 3 });
    expect(normalizeConteoAprobaciones({ visto_bueno: 2 })).toEqual({ visto_bueno: 2, autorizar: 0, total: 2 });
  });
});
