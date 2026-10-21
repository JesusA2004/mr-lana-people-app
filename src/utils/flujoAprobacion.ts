import type { NombreIcono } from '@/components/ui/IconoTono';
import type { Tono } from '@/components/ui/tonos';
import type {
  AccionUsuarioActual,
  AprobacionItem,
  BandejaAprobaciones,
  ConteoAprobaciones,
  FlujoAprobacion,
  OrigenAprobacion,
  PasoFlujo,
  PendienteDe,
  PersonaFlujo,
} from '@/types/aprobaciones';
import { asArray, asBoolean, asId, asNumber, asRecord, asRecordOrNull, asString } from '@/utils/normalize';

/**
 * Motor de aprobaciones (backend) → lo que la app pinta. Funciones puras:
 * la app no decide pasos, responsables ni turnos; solo traduce el contrato
 * `flujo[]` / `puede_actuar_usuario_actual` / `motivo_no_puede` a íconos,
 * tonos y textos. Probadas en `utils/__tests__/flujoAprobacion.test.ts`.
 */

const ESTADOS_FINALES = new Set(['aprobada', 'rechazada', 'cancelada']);
const ACCIONES: readonly NonNullable<AccionUsuarioActual>[] = ['visto_bueno', 'aprobar', 'autorizar_prestamo'];

// ------------------------------------------------------------ Normalización

function normalizePersona(value: unknown): PersonaFlujo | null {
  const raw = asRecordOrNull(value);
  if (!raw) return null;
  const nombre = asString(raw.nombre);
  if (!nombre) return null;
  return { id: asId(raw.id), nombre };
}

export function normalizePasoFlujo(value: unknown, index = 0): PasoFlujo {
  const raw = asRecord(value);
  return {
    orden: asNumber(raw.orden) ?? index + 1,
    clave: asString(raw.clave) ?? `paso-${index + 1}`,
    rol: asString(raw.rol),
    etiqueta: asString(raw.etiqueta) ?? asString(raw.rol) ?? 'Revisión',
    responsable: normalizePersona(raw.responsable),
    responsables: asArray(raw.responsables)
      .map(normalizePersona)
      .filter((p): p is PersonaFlujo => p !== null),
    estado: asString(raw.estado) ?? 'esperando',
    estado_etiqueta: asString(raw.estado_etiqueta),
    fecha: asString(raw.fecha),
    comentario: asString(raw.comentario),
    decidio: normalizePersona(raw.decidio),
    bloqueado: asBoolean(raw.bloqueado),
    puede_actuar: asBoolean(raw.puede_actuar),
    motivo_no_puede: asString(raw.motivo_no_puede),
  };
}

function normalizePendienteDe(value: unknown): PendienteDe | null {
  const raw = asRecordOrNull(value);
  if (!raw) return null;
  return {
    clave: asString(raw.clave),
    etiqueta: asString(raw.etiqueta),
    nombres: asArray(raw.nombres)
      .map((n) => asString(n))
      .filter((n): n is string => Boolean(n)),
    texto: asString(raw.texto),
  };
}

function normalizeAccion(value: unknown): AccionUsuarioActual {
  const accion = asString(value);
  return accion && (ACCIONES as readonly string[]).includes(accion) ? (accion as AccionUsuarioActual) : null;
}

/**
 * Lee el contrato del flujo de una solicitud (cualquier endpoint que lo
 * mande). `null` si el backend no lo mandó (versión anterior): la pantalla
 * cae en su línea de tiempo de siempre.
 */
export function normalizeFlujo(value: unknown): FlujoAprobacion | null {
  const raw = asRecord(value);
  if (!Array.isArray(raw.flujo)) return null;
  const pasos = asArray(raw.flujo)
    .map(normalizePasoFlujo)
    .sort((a, b) => a.orden - b.orden);
  const accion = normalizeAccion(raw.accion_usuario_actual);
  const puede = asBoolean(raw.puede_actuar_usuario_actual);
  return {
    pasos,
    // Sin acción conocida no hay botón: nunca se muestra «Aprobar» activo por una acción que la app no sabe ejecutar.
    puede_actuar_usuario_actual: puede && accion !== null,
    accion_usuario_actual: puede ? accion : null,
    motivo_no_puede: asString(raw.motivo_no_puede),
    pendiente_de: normalizePendienteDe(raw.pendiente_de),
    estado_flujo_texto: asString(raw.estado_flujo_texto),
  };
}

export function normalizeConteoAprobaciones(value: unknown): ConteoAprobaciones {
  const raw = asRecord(value);
  const vistoBueno = asNumber(raw.visto_bueno) ?? 0;
  const autorizar = asNumber(raw.autorizar) ?? 0;
  return { visto_bueno: vistoBueno, autorizar, total: asNumber(raw.total) ?? vistoBueno + autorizar };
}

// ------------------------------------------------------------ Fechas

const ISO_LOCAL = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

/**
 * «20/10/2026 14:30» con la hora DEL SERVIDOR (el ISO trae el offset de
 * México): se leen los componentes tal cual, sin convertir a la zona del
 * teléfono — la fecha de un paso nunca depende del dispositivo.
 */
export function formatFechaHoraFlujo(value: string | null | undefined): string {
  if (!value) return '';
  const m = ISO_LOCAL.exec(value);
  if (!m) return '';
  const fecha = `${m[3]}/${m[2]}/${m[1]}`;
  return m[4] ? `${fecha} ${m[4]}:${m[5]}` : fecha;
}

// ------------------------------------------------------------ Visual

export type SimboloPaso = '✓' | '○' | '✕' | '–';

export interface PasoVisual {
  key: string;
  simbolo: SimboloPaso;
  icono: NombreIcono;
  tono: Tono;
  titulo: string;
  /** Línea principal: «Ana López — aprobado 20/10/2026 14:30», «Alberto Carlos Bueno — Pendiente»… */
  detalle: string;
  /** Comentario de quien decidió o motivo del bloqueo. */
  nota: string | null;
  /** Le toca a la cuenta actual (resalta el paso). */
  esMiTurno: boolean;
  /** Conector hacia el siguiente paso en verde. */
  completado: boolean;
}

function nombresPaso(paso: PasoFlujo): string | null {
  if (paso.responsables.length > 0) return paso.responsables.map((r) => r.nombre).join(', ');
  return paso.responsable?.nombre ?? null;
}

/** Un paso del backend → cómo se ve (✓ aprobado / ○ pendiente / ○ esperando / no aplica / ✕ rechazado). */
export function pasoVisual(paso: PasoFlujo): PasoVisual {
  const fecha = formatFechaHoraFlujo(paso.fecha);
  const quien = paso.decidio?.nombre ?? nombresPaso(paso);
  const base = { key: `${paso.orden}-${paso.clave}`, titulo: paso.etiqueta, esMiTurno: false, completado: false };

  switch (paso.estado) {
    case 'aprobado': {
      if (paso.clave === 'creada') {
        return {
          ...base,
          simbolo: '✓',
          icono: 'checkmark',
          tono: 'exito',
          detalle: [quien, fecha].filter(Boolean).join(' — '),
          nota: paso.comentario,
          completado: true,
        };
      }
      return {
        ...base,
        simbolo: '✓',
        icono: 'checkmark',
        tono: 'exito',
        detalle: [quien, `aprobado${fecha ? ` ${fecha}` : ''}`].filter(Boolean).join(' — '),
        nota: paso.comentario,
        completado: true,
      };
    }
    case 'rechazado':
      return {
        ...base,
        simbolo: '✕',
        icono: 'close',
        tono: 'peligro',
        detalle: [quien, `rechazado${fecha ? ` ${fecha}` : ''}`].filter(Boolean).join(' — '),
        nota: paso.comentario,
      };
    case 'pendiente':
      if (paso.bloqueado) {
        return {
          ...base,
          simbolo: '○',
          icono: 'lock-closed',
          tono: 'peligro',
          detalle: paso.estado_etiqueta ?? 'Detenido',
          nota: paso.motivo_no_puede,
        };
      }
      if (paso.puede_actuar) {
        return { ...base, simbolo: '○', icono: 'hand-right', tono: 'aviso', detalle: 'Te toca a ti', nota: null, esMiTurno: true };
      }
      return {
        ...base,
        simbolo: '○',
        icono: 'time',
        tono: 'aviso',
        detalle: [quien, paso.estado_etiqueta ?? 'Pendiente'].filter(Boolean).join(' — '),
        nota: null,
      };
    case 'no_aplica':
      return { ...base, simbolo: '–', icono: 'remove', tono: 'neutral', detalle: paso.estado_etiqueta ?? 'No aplica', nota: null };
    case 'esperando':
    default:
      return {
        ...base,
        simbolo: '○',
        icono: 'ellipse-outline',
        tono: 'neutral',
        detalle: [quien, paso.estado_etiqueta ?? 'Esperando paso anterior'].filter(Boolean).join(' — '),
        nota: null,
      };
  }
}

export function flujoVisual(flujo: FlujoAprobacion | null | undefined): PasoVisual[] {
  return (flujo?.pasos ?? []).map(pasoVisual);
}

// ------------------------------------------------------------ Textos de la bandeja

export interface EtiquetasAccion {
  aprobar: string;
  rechazar: string;
  /** Pregunta del diálogo de confirmación. */
  confirmar: string;
}

export function etiquetasAccion(accion: AccionUsuarioActual): EtiquetasAccion {
  switch (accion) {
    case 'visto_bueno':
      return { aprobar: 'Aprobar', rechazar: 'Rechazar', confirmar: '¿Das tu visto bueno a esta solicitud? Seguirá al siguiente paso.' };
    case 'autorizar_prestamo':
      return { aprobar: 'Revisar y autorizar', rechazar: 'Rechazar', confirmar: '' };
    case 'aprobar':
      return { aprobar: 'Aprobar', rechazar: 'Rechazar', confirmar: '¿Confirmas que apruebas esta solicitud?' };
    default:
      return { aprobar: 'Aprobar', rechazar: 'Rechazar', confirmar: '' };
  }
}

function minusculaInicial(texto: string): string {
  return texto.length > 0 ? texto.charAt(0).toLowerCase() + texto.slice(1) : texto;
}

/** Chip de estado de la bandeja: «Te toca» / «Esperando gerente de sucursal» / «Detenida». */
export function pillEstadoFlujo(flujo: FlujoAprobacion): { texto: string; tono: Tono; icono: NombreIcono } {
  if (flujo.puede_actuar_usuario_actual) return { texto: 'Te toca', tono: 'aviso', icono: 'hand-right-outline' };
  const actual = flujo.pasos.find((p) => p.estado === 'pendiente');
  if (actual?.bloqueado) return { texto: 'Detenida', tono: 'peligro', icono: 'lock-closed-outline' };
  const etiqueta = flujo.pendiente_de?.etiqueta ?? actual?.etiqueta;
  if (etiqueta) return { texto: `Esperando ${minusculaInicial(etiqueta)}`, tono: 'info', icono: 'time-outline' };
  return { texto: 'En espera', tono: 'info', icono: 'time-outline' };
}

/** Chip corto para filas de lista (el detalle largo va en el subtítulo). */
export function pillCortoFlujo(flujo: FlujoAprobacion): { texto: string; tono: Tono; icono: NombreIcono } {
  const pill = pillEstadoFlujo(flujo);
  if (pill.texto.startsWith('Esperando')) return { ...pill, texto: 'En espera' };
  return pill;
}

/** Línea de estado de la bandeja: «Te toca dar tu visto bueno» / «Esperando gerente de sucursal». */
export function lineaEstadoBandeja(flujo: FlujoAprobacion): string {
  switch (flujo.accion_usuario_actual) {
    case 'visto_bueno':
      return 'Te toca dar tu visto bueno';
    case 'aprobar':
      return 'Te toca la autorización final';
    case 'autorizar_prestamo':
      return 'Te toca autorizar el préstamo';
    default: {
      const pill = pillEstadoFlujo(flujo);
      // Corto en la lista («Pendiente de asignar región de aprobación»); el motivo completo va en el detalle.
      return pill.texto === 'Detenida' ? (flujo.pasos.find((p) => p.bloqueado)?.estado_etiqueta ?? 'Detenida por la estructura') : pill.texto;
    }
  }
}

/**
 * Texto humano de por qué NO hay botón activo. Siempre lo da el backend
 * (`motivo_no_puede`); si no lo manda, se arma con `pendiente_de` — nunca
 * un mensaje técnico.
 */
export function motivoSinTurno(flujo: FlujoAprobacion): string {
  if (flujo.motivo_no_puede) return flujo.motivo_no_puede;
  const nombres = flujo.pendiente_de?.nombres ?? [];
  if (nombres.length > 0) return `Aún no es tu turno: primero debe aprobar ${nombres.join(', ')}.`;
  return 'Aún no es tu turno de aprobar esta solicitud.';
}

/** «Pendiente de aprobación de: X» (o null si ya no está pendiente de nadie). */
export function textoPendienteDe(flujo: FlujoAprobacion | null | undefined): string | null {
  if (!flujo) return null;
  if (flujo.pendiente_de?.texto) return flujo.pendiente_de.texto;
  const nombres = flujo.pendiente_de?.nombres ?? [];
  if (nombres.length > 0) return `Pendiente de aprobación de: ${nombres.join(', ')}`;
  return null;
}

/** Tipos cuya decisión final necesita la pantalla completa de RH (captura de cargo/IVA, baja, comparativo de datos). */
const TIPOS_DETALLE_RH = new Set(['prestamo', 'baja_colaborador', 'actualizacion_datos']);

export type ModoAcciones = 'decidir' | 'revisar_detalle' | 'sin_turno';

/**
 * Qué botones lleva la barra inferior:
 * - `decidir`: Aprobar / Rechazar grandes (visto bueno o aprobación simple).
 * - `revisar_detalle`: le toca, pero se decide en el detalle de RH
 *   (préstamo con cargo/IVA, baja, corrección de datos con comparativo).
 * - `sin_turno`: botón deshabilitado + motivo humano.
 */
export function modoAcciones(flujo: FlujoAprobacion, tipo: string): ModoAcciones {
  if (!flujo.puede_actuar_usuario_actual || flujo.accion_usuario_actual === null) return 'sin_turno';
  if (flujo.accion_usuario_actual === 'autorizar_prestamo') return 'revisar_detalle';
  if (flujo.accion_usuario_actual === 'aprobar' && TIPOS_DETALLE_RH.has(tipo)) return 'revisar_detalle';
  return 'decidir';
}

// ------------------------------------------------------------ Bandeja

function itemDesdeRaw(value: unknown, origen: OrigenAprobacion): AprobacionItem | null {
  const raw = asRecord(value);
  const flujo = normalizeFlujo(raw);
  // RH manda `id: "solicitud:12"` + `resource_id`; equipo manda `id` numérico.
  const id = asId(raw.resource_id) ?? asId(raw.id);
  if (id === null || !flujo) return null;
  const colaborador = asRecordOrNull(raw.colaborador);
  return {
    id,
    origen,
    folio: asString(raw.folio),
    tipo: asString(raw.tipo) ?? '',
    tipo_etiqueta: asString(raw.tipo_etiqueta) ?? asString(raw.titulo) ?? 'Solicitud',
    estado: asString(raw.estado) ?? '',
    solicitante: (colaborador ? asString(colaborador.nombre) : asString(raw.colaborador)) ?? 'Colaborador',
    fecha_inicio: asString(raw.fecha_inicio),
    fecha_fin: asString(raw.fecha_fin),
    monto_solicitado: asNumber(raw.monto_solicitado),
    motivo: asString(raw.resumen) ?? asString(raw.motivo),
    creada_en: asString(raw.creada_en) ?? asString(raw.creado_en),
    flujo,
  };
}

export function normalizeAprobacionItem(value: unknown, origen: OrigenAprobacion): AprobacionItem | null {
  return itemDesdeRaw(value, origen);
}

/**
 * Une las dos fuentes (vistos buenos del equipo y autorización de RH) sin
 * duplicar: si la misma solicitud llega por ambas, gana la versión en la
 * que la cuenta puede actuar. «Me toca» = `puede_actuar_usuario_actual`;
 * el resto (no final) va a «En espera», sin botón activo.
 */
export function armarBandeja(fuentes: { equipo?: AprobacionItem[]; rh?: AprobacionItem[] }): BandejaAprobaciones {
  const porId = new Map<number, AprobacionItem>();
  for (const item of [...(fuentes.equipo ?? []), ...(fuentes.rh ?? [])]) {
    const previo = porId.get(item.id);
    if (!previo || (!previo.flujo.puede_actuar_usuario_actual && item.flujo.puede_actuar_usuario_actual)) {
      porId.set(item.id, item);
    }
  }
  const todos = [...porId.values()].filter((item) => !ESTADOS_FINALES.has(item.estado));
  const porFecha = (a: AprobacionItem, b: AprobacionItem) => (a.creada_en ?? '').localeCompare(b.creada_en ?? '');
  return {
    meToca: todos.filter((i) => i.flujo.puede_actuar_usuario_actual).sort(porFecha),
    enEspera: todos.filter((i) => !i.flujo.puede_actuar_usuario_actual).sort(porFecha),
  };
}
