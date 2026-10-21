import type { NombreIcono } from '@/components/ui/IconoTono';
import type { Tono } from '@/components/ui/tonos';
import type {
  ConteoCorrecciones,
  Correccion,
  CorreccionHistorialEntrada,
  CorreccionesRespuesta,
  DatoPropuesto,
  EstadoCorreccion,
  ResponderCorreccionPayload,
} from '@/types/correcciones';
import { asArray, asBoolean, asId, asNumber, asRecord, asString, asStringArray } from '@/utils/normalize';

/**
 * Correcciones del colaborador: normalización del contrato
 * `GET /api/v1/correcciones` y cómo se ve cada estado. El estado lo decide
 * el backend (`CorreccionesService::estado()`); aquí solo se pinta.
 */

export const RESPUESTA_MIN = 3;
export const RESPUESTA_MAX = 1000;
const CONFIDENCIAL = 'Dato confidencial';

// ------------------------------------------------------------ Normalización

export function normalizeHistorial(value: unknown): CorreccionHistorialEntrada {
  const raw = asRecord(value);
  return {
    accion: asString(raw.accion) ?? '',
    etiqueta: asString(raw.etiqueta) ?? asString(raw.accion_etiqueta) ?? 'Movimiento',
    por: asString(raw.por) ?? asString(raw.usuario),
    es_rh: asBoolean(raw.es_rh),
    comentario: asString(raw.comentario),
    origen_etiqueta: asString(raw.origen_etiqueta),
    en: asString(raw.en) ?? asString(raw.fecha),
  };
}

export function normalizeCorreccion(value: unknown): Correccion {
  const raw = asRecord(value);
  const estado = asString(raw.estado) ?? 'enviada';
  return {
    id: asString(raw.id) ?? String(asId(raw.id) ?? ''),
    origen: asString(raw.origen) ?? 'solicitud',
    recurso_id: asId(raw.recurso_id),
    folio: asString(raw.folio),
    tipo: asString(raw.tipo) ?? '',
    titulo: asString(raw.titulo) ?? 'Corrección',
    estado,
    estado_etiqueta: asString(raw.estado_etiqueta) ?? estadoCorreccionVisual(estado).texto,
    estado_descripcion: asString(raw.estado_descripcion),
    comentario_rh: asString(raw.comentario_rh),
    requiere_accion: asBoolean(raw.requiere_accion),
    puede_responder: asBoolean(raw.puede_responder),
    campos: asStringArray(raw.campos),
    resuelta_por: asString(raw.resuelta_por),
    resuelta_en: asString(raw.resuelta_en),
    creada_en: asString(raw.creada_en),
    actualizada_en: asString(raw.actualizada_en),
    historial: asArray(raw.historial).map(normalizeHistorial),
  };
}

export function normalizeConteoCorrecciones(value: unknown): ConteoCorrecciones {
  const raw = asRecord(value);
  return {
    requieren_accion: asNumber(raw.requieren_accion) ?? 0,
    en_proceso: asNumber(raw.en_proceso) ?? 0,
    abiertas: asNumber(raw.abiertas) ?? 0,
  };
}

export function normalizeCorrecciones(payload: unknown): CorreccionesRespuesta {
  const root = asRecord(payload);
  return {
    data: asArray(root.data).map(normalizeCorreccion),
    conteo: normalizeConteoCorrecciones(asRecord(root.meta).conteo),
  };
}

export function normalizeDatosPropuestos(value: unknown): DatoPropuesto[] {
  return asArray(value)
    .map((item) => {
      const raw = asRecord(item);
      const campo = asString(raw.campo);
      if (!campo) return null;
      return {
        campo,
        etiqueta: asString(raw.etiqueta) ?? campo,
        actual: asString(raw.actual),
        propuesto: asString(raw.propuesto) ?? '',
      };
    })
    .filter((d): d is DatoPropuesto => d !== null);
}

// ------------------------------------------------------------ Visual

export interface EstadoCorreccionVisual {
  texto: string;
  tono: Tono;
  icono: NombreIcono;
}

/** Estado → chip (ícono + texto, nunca solo color). */
export function estadoCorreccionVisual(estado: EstadoCorreccion): EstadoCorreccionVisual {
  switch (estado) {
    case 'enviada':
      return { texto: 'Enviada', tono: 'info', icono: 'paper-plane-outline' };
    case 'en_revision':
      return { texto: 'En revisión', tono: 'info', icono: 'time-outline' };
    case 'requiere_informacion':
      return { texto: 'Requiere información', tono: 'aviso', icono: 'chatbubble-ellipses-outline' };
    case 'aprobada':
      return { texto: 'Aprobada', tono: 'exito', icono: 'checkmark-circle-outline' };
    case 'rechazada':
      return { texto: 'Rechazada', tono: 'peligro', icono: 'close-circle-outline' };
    case 'cancelada':
      return { texto: 'Cancelada', tono: 'neutral', icono: 'remove-circle-outline' };
    default:
      return { texto: 'En proceso', tono: 'info', icono: 'time-outline' };
  }
}

export type EstadoPasoCorreccion = 'hecho' | 'actual' | 'accion' | 'pendiente' | 'rechazado' | 'cancelado';

export interface PasoCorreccion {
  clave: 'enviada' | 'revision' | 'resolucion';
  etiqueta: string;
  estado: EstadoPasoCorreccion;
}

/** Barra de 3 pasos: Enviada → En revisión → Resuelta (Aprobada / Rechazada). */
export function pasosCorreccion(estado: EstadoCorreccion): PasoCorreccion[] {
  const paso = (clave: PasoCorreccion['clave'], etiqueta: string, e: EstadoPasoCorreccion): PasoCorreccion => ({ clave, etiqueta, estado: e });
  switch (estado) {
    case 'en_revision':
      return [paso('enviada', 'Enviada', 'hecho'), paso('revision', 'En revisión', 'actual'), paso('resolucion', 'Resuelta', 'pendiente')];
    case 'requiere_informacion':
      return [paso('enviada', 'Enviada', 'hecho'), paso('revision', 'Requiere tu respuesta', 'accion'), paso('resolucion', 'Resuelta', 'pendiente')];
    case 'aprobada':
      return [paso('enviada', 'Enviada', 'hecho'), paso('revision', 'Revisada', 'hecho'), paso('resolucion', 'Aprobada', 'hecho')];
    case 'rechazada':
      return [paso('enviada', 'Enviada', 'hecho'), paso('revision', 'Revisada', 'hecho'), paso('resolucion', 'Rechazada', 'rechazado')];
    case 'cancelada':
      return [paso('enviada', 'Enviada', 'hecho'), paso('revision', 'En revisión', 'cancelado'), paso('resolucion', 'Cancelada', 'cancelado')];
    case 'enviada':
    default:
      return [paso('enviada', 'Enviada', 'hecho'), paso('revision', 'En revisión', 'pendiente'), paso('resolucion', 'Resuelta', 'pendiente')];
  }
}

/** Qué hacer con una corrección que requiere acción (texto del botón y destino). */
export function destinoCorreccion(c: Pick<Correccion, 'id' | 'origen' | 'recurso_id'>): { ruta: string; accion: string } {
  if (c.origen === 'documento') {
    return { ruta: c.recurso_id ? `/expediente/${c.recurso_id}?ref=documento` : '/(app)/(tabs)/expediente', accion: 'Volver a subir el documento' };
  }
  if (c.origen === 'foto') return { ruta: '/(app)/(tabs)/perfil', accion: 'Cambiar mi foto' };
  return { ruta: `/correcciones/${encodeURIComponent(c.id)}`, accion: 'Ver corrección' };
}

/** `solicitud-12` → 12 (solo correcciones de origen solicitud). */
export function solicitudIdDeCorreccion(c: Pick<Correccion, 'origen' | 'recurso_id' | 'id'>): number | null {
  if (c.origen !== 'solicitud') return null;
  if (c.recurso_id) return c.recurso_id;
  const m = /^solicitud-(\d+)$/.exec(c.id);
  return m ? Number(m[1]) : null;
}

// ------------------------------------------------------------ Formulario de respuesta

const NO_EDITABLES = new Set(['genero', 'estado_civil', 'fecha_nacimiento']);
const MAYUSCULAS = new Set(['curp', 'rfc', 'clave_elector']);

/**
 * Datos propuestos que la persona puede corregir en texto libre desde la
 * app. Se dejan fuera los de lista/fecha (género, estado civil, fecha de
 * nacimiento), el domicilio estructurado (va completo en «Cambiar
 * domicilio») y lo confidencial que no se muestra: para esos basta el mensaje.
 */
export function camposEditables(datos: DatoPropuesto[]): DatoPropuesto[] {
  return datos.filter((d) => !NO_EDITABLES.has(d.campo) && !d.campo.startsWith('domicilio') && d.propuesto !== CONFIDENCIAL);
}

export function validarRespuesta(mensaje: string): string | null {
  const limpio = mensaje.trim();
  if (limpio.length < RESPUESTA_MIN) return 'Escribe tu respuesta para Recursos Humanos.';
  if (limpio.length > RESPUESTA_MAX) return 'La respuesta no puede pasar de 1,000 caracteres.';
  return null;
}

/** Solo viajan los datos que la persona cambió (y no vacíos). */
export function construirRespuesta(mensaje: string, originales: DatoPropuesto[], editados: Record<string, string>): ResponderCorreccionPayload {
  const datos: Record<string, string> = {};
  for (const dato of originales) {
    const nuevo = editados[dato.campo];
    if (nuevo === undefined) continue;
    let valor = nuevo.trim();
    if (MAYUSCULAS.has(dato.campo)) valor = valor.toUpperCase();
    if (valor === '' || valor === dato.propuesto) continue;
    datos[dato.campo] = valor;
  }
  return Object.keys(datos).length > 0 ? { mensaje: mensaje.trim(), datos } : { mensaje: mensaje.trim() };
}

/** Errores 422 `datos.curp` → `{ curp: '...' }` y `mensaje`. */
export function erroresRespuesta(validation: Record<string, string[]> | undefined): { mensaje?: string; datos: Record<string, string> } {
  const datos: Record<string, string> = {};
  let mensaje: string | undefined;
  for (const [clave, mensajes] of Object.entries(validation ?? {})) {
    const texto = mensajes[0];
    if (!texto) continue;
    if (clave === 'mensaje') mensaje = texto;
    else if (clave.startsWith('datos.')) datos[clave.slice('datos.'.length)] = texto;
    else if (clave === 'datos') mensaje = mensaje ?? texto;
  }
  return { mensaje, datos };
}
