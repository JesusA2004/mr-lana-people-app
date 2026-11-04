import type {
  CampoListaSolicitud,
  CampoSolicitud,
  CondicionSolicitud,
  DocumentoSolicitud,
  EstadoSolicitudEmpleo,
  FaltanteSolicitud,
  FilaListaSolicitud,
  ListaSolicitud,
  OpcionSolicitud,
  ResumenSeccionSolicitud,
  ResumenSolicitudRegistro,
  SeccionSolicitud,
  TipoCampoSolicitud,
  ValorSolicitud,
} from '@/types/solicitudEmpleo';
import { asArray, asBoolean, asNumber, asRecord, asRecordOrNull, asString, asStringArray } from '@/utils/normalize';

/**
 * Normalizador defensivo del contrato de la Solicitud de empleo + Estudio
 * socioeconómico (docs/SOLICITUD_EMPLEO_Y_SOCIOECONOMICO.md): un campo
 * ausente o de tipo inesperado nunca truena la pantalla; un tipo de control
 * desconocido (backend más nuevo) se dibuja como texto.
 */

const TIPOS: readonly TipoCampoSolicitud[] = ['texto', 'texto_largo', 'entero', 'moneda', 'booleano', 'select', 'multiselect', 'fecha', 'mes'];
const OPERADORES: readonly CondicionSolicitud['operador'][] = ['igual', 'en', 'distinto', 'positivo', 'contiene'];

function tipoDe(valor: unknown): TipoCampoSolicitud {
  const tipo = asString(valor);
  return tipo && (TIPOS as readonly string[]).includes(tipo) ? (tipo as TipoCampoSolicitud) : 'texto';
}

export function normalizarValorSolicitud(valor: unknown): ValorSolicitud {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'boolean' || typeof valor === 'string') return valor;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (Array.isArray(valor)) return valor.map((v) => asString(v)).filter((v): v is string => v !== null);
  return null;
}

function opciones(valor: unknown): OpcionSolicitud[] {
  return asArray(valor)
    .map((o) => {
      const r = asRecord(o);
      const value = asString(r.value);
      return value === null ? null : { value, label: asString(r.label) ?? value };
    })
    .filter((o): o is OpcionSolicitud => o !== null);
}

function condicion(valor: unknown): CondicionSolicitud | null {
  const r = asRecordOrNull(valor);
  const campo = asString(r?.campo);
  const operador = asString(r?.operador);
  if (!r || !campo || !operador || !(OPERADORES as readonly string[]).includes(operador)) return null;
  return { campo, operador: operador as CondicionSolicitud['operador'], valor: normalizarValorSolicitud(r.valor) };
}

function campo(raw: unknown): CampoSolicitud | null {
  const r = asRecord(raw);
  const clave = asString(r.campo);
  if (!clave) return null;
  return {
    campo: clave,
    etiqueta: asString(r.etiqueta) ?? clave,
    tipo: tipoDe(r.tipo),
    opciones: opciones(r.opciones),
    valor: normalizarValorSolicitud(r.valor),
    valor_legible: asString(r.valor_legible) ?? null,
    sugerencia: normalizarValorSolicitud(r.sugerencia),
    requerido: asBoolean(r.requerido),
    requerido_si: condicion(r.requerido_si),
    permite_no_aplica: asBoolean(r.permite_no_aplica),
    no_aplica: asBoolean(r.no_aplica),
    bloqueado: asBoolean(r.bloqueado),
    origen: asString(r.origen) === 'datos_personales' ? 'datos_personales' : 'solicitud',
    documentos: asStringArray(r.documentos),
    min: asNumber(r.min),
    max: asNumber(r.max),
    ayuda: asString(r.ayuda),
  };
}

function campoLista(raw: unknown): CampoListaSolicitud | null {
  const r = asRecord(raw);
  const clave = asString(r.campo);
  if (!clave) return null;
  return {
    campo: clave,
    etiqueta: asString(r.etiqueta) ?? clave,
    tipo: tipoDe(r.tipo),
    requerido: asBoolean(r.requerido),
    opciones: opciones(r.opciones),
    min: asNumber(r.min),
    max: asNumber(r.max),
  };
}

function fila(raw: unknown): FilaListaSolicitud {
  const salida: FilaListaSolicitud = {};
  for (const [clave, valor] of Object.entries(asRecord(raw))) {
    salida[clave] = typeof valor === 'number' ? (Number.isFinite(valor) ? valor : null) : asString(valor);
  }
  return salida;
}

function lista(raw: unknown): ListaSolicitud | null {
  const r = asRecordOrNull(raw);
  const clave = asString(r?.clave);
  if (!r || !clave) return null;
  return {
    clave,
    etiqueta: asString(r.etiqueta) ?? clave,
    singular: asString(r.singular) ?? 'Renglón',
    minimo: Math.max(0, asNumber(r.minimo) ?? 0),
    maximo: Math.max(1, asNumber(r.maximo) ?? 1),
    bandera_vacia: asString(r.bandera_vacia),
    etiqueta_vacia: asString(r.etiqueta_vacia),
    vacia: asBoolean(r.vacia),
    bloqueada: asBoolean(r.bloqueada),
    campos: asArray(r.campos)
      .map(campoLista)
      .filter((c): c is CampoListaSolicitud => c !== null),
    filas: asArray(r.filas).map(fila),
  };
}

function porcentaje(valor: unknown): number {
  const n = asNumber(valor) ?? 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function resumenSeccion(raw: unknown): ResumenSeccionSolicitud | null {
  const r = asRecord(raw);
  const clave = asString(r.clave);
  if (!clave) return null;
  return { clave, titulo: asString(r.titulo) ?? clave, completa: asBoolean(r.completa), porcentaje: porcentaje(r.porcentaje), faltantes: asStringArray(r.faltantes) };
}

function seccion(raw: unknown): SeccionSolicitud | null {
  const base = resumenSeccion(raw);
  if (!base) return null;
  const r = asRecord(raw);
  return {
    ...base,
    descripcion: asString(r.descripcion) ?? '',
    guardada_en: asString(r.guardada_en),
    origen: asString(r.origen),
    campos: asArray(r.campos)
      .map(campo)
      .filter((c): c is CampoSolicitud => c !== null),
    lista: lista(r.lista),
  };
}

/** `documentos` llega como objeto (GET solicitud) o como lista (bloque del registro). */
function documentos(raw: unknown): DocumentoSolicitud[] {
  const valores = Array.isArray(raw) ? raw : Object.values(asRecord(raw));
  return valores
    .map((d) => {
      const r = asRecord(d);
      const clave = asString(r.clave);
      return clave ? { clave, nombre: asString(r.nombre) ?? clave, completo: asBoolean(r.completo), mensaje: asString(r.mensaje) ?? '' } : null;
    })
    .filter((d): d is DocumentoSolicitud => d !== null);
}

function faltante(raw: unknown): FaltanteSolicitud | null {
  const r = asRecord(raw);
  const seccionClave = asString(r.seccion);
  const clave = asString(r.campo);
  if (!seccionClave || !clave) return null;
  return {
    seccion: seccionClave,
    campo: clave,
    etiqueta: asString(r.etiqueta) ?? clave,
    documentos: asStringArray(r.documentos),
    origen: asString(r.origen) === 'datos_personales' ? 'datos_personales' : 'solicitud',
  };
}

/** `GET registro/solicitud` y respuesta de `POST registro/solicitud/{seccion}`. */
export function normalizarEstadoSolicitud(raw: unknown): EstadoSolicitudEmpleo {
  const r = asRecord(raw);
  const c = asRecord(r.completitud);
  const secciones = asArray(r.secciones)
    .map(seccion)
    .filter((s): s is SeccionSolicitud => s !== null);
  const resumen = asArray(c.secciones)
    .map(resumenSeccion)
    .filter((s): s is ResumenSeccionSolicitud => s !== null);
  return {
    registro_abierto: r.registro_abierto === undefined ? true : asBoolean(r.registro_abierto),
    exigida: asBoolean(r.exigida),
    secciones,
    completitud: {
      completo: asBoolean(c.completo),
      porcentaje: porcentaje(c.porcentaje),
      total: asNumber(c.total) ?? 0,
      completos: asNumber(c.completos) ?? 0,
      faltantes: asArray(c.faltantes)
        .map(faltante)
        .filter((f): f is FaltanteSolicitud => f !== null),
      secciones: resumen.length > 0 ? resumen : secciones.map(({ clave, titulo, completa, porcentaje: p, faltantes }) => ({ clave, titulo, completa, porcentaje: p, faltantes })),
      documentos: documentos(c.documentos),
    },
  };
}

/** Bloque `solicitud_empleo` de `GET /colaborador/registro` (null = backend anterior sin el bloque). */
export function normalizarResumenSolicitud(raw: unknown): ResumenSolicitudRegistro | null {
  const r = asRecordOrNull(raw);
  if (!r) return null;
  return {
    exigida: asBoolean(r.exigida),
    completo: asBoolean(r.completo),
    porcentaje: porcentaje(r.porcentaje),
    secciones: asArray(r.secciones)
      .map(resumenSeccion)
      .filter((s): s is ResumenSeccionSolicitud => s !== null),
    documentos: documentos(r.documentos),
    pendientes: asStringArray(r.pendientes).filter((p) => p.trim() !== ''),
  };
}
