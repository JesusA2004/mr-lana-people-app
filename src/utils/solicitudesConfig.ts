import type { CreateSolicitudPayload, RequestType, SolicitudCampo, SolicitudCampoTipo, SolicitudTipoConfig } from '@/types/request';

/**
 * Normalización defensiva del catálogo de solicitudes.
 *
 * `Api\V1\SolicitudController::configuracion()` responde
 * `{"tipos": [...]}` — NO `{"data": [...]}`. La app lo pasaba por
 * `extractData()`, que al no encontrar `data` devolvía el objeto completo
 * `{tipos: [...]}` y el wizard terminaba con un catálogo vacío: bug B-1 de
 * esta sincronización. Aquí se lee `tipos` primero y se aceptan las otras
 * dos formas solo como red de seguridad.
 */

const CAMPO_TIPOS: SolicitudCampoTipo[] = ['text', 'date', 'number', 'select'];

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function normalizeCampo(raw: unknown): SolicitudCampo | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const name = asString(record.name);
  if (!name) return null;

  const rawType = asString(record.type);
  // Un `type` que la app todavía no dibuja se degrada a texto en vez de
  // desaparecer: el usuario puede seguir enviando la solicitud (sección 6
  // del encargo: "quedar preparado para tipos futuros").
  const type: SolicitudCampoTipo = rawType && CAMPO_TIPOS.includes(rawType) ? rawType : 'text';

  return { name, type, required: asBoolean(record.required) };
}

/**
 * Claves que el autoservicio del colaborador NUNCA envía, aunque un backend
 * anterior todavía las anuncie en `campos[]`: el plazo del préstamo lo decide
 * RH al autorizar, y los campos de baja no existen para el colaborador.
 */
export const CAMPOS_NO_AUTOSERVICIO = new Set(['plazo_meses', 'colaborador_objetivo_id', 'fecha_efectiva', 'tipo_baja']);

/** Tipos que un colaborador NO crea desde la app (la baja es un proceso administrativo de RH). */
export const TIPOS_NO_AUTOSERVICIO = new Set(['baja_colaborador']);

function normalizeTipo(raw: unknown): SolicitudTipoConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const clave = asString(record.clave);
  if (!clave) return null;

  const campos = Array.isArray(record.campos)
    ? record.campos
        .map(normalizeCampo)
        .filter((campo): campo is SolicitudCampo => campo !== null && !CAMPOS_NO_AUTOSERVICIO.has(campo.name))
    : [];

  const requiereColaboradorObjetivo = asBoolean(record.requiere_colaborador_objetivo);

  return {
    clave,
    nombre: asString(record.nombre) ?? clave,
    requiere_fechas: asBoolean(record.requiere_fechas),
    requiere_horario: asBoolean(record.requiere_horario),
    requiere_dias: asBoolean(record.requiere_dias),
    requiere_monto: asBoolean(record.requiere_monto),
    requiere_colaborador_objetivo: requiereColaboradorObjetivo,
    // El backend lo manda siempre `true` hoy; si algún día deja de mandarlo
    // se asume que sí hay motivo, que es lo que valida el FormRequest.
    requiere_motivo: asBoolean(record.requiere_motivo, true),
    permite_adjuntos: asBoolean(record.permite_adjuntos, true),
    campos,
  };
}

/** Extrae el arreglo de tipos venga como venga: `{tipos}`, `{data}` o arreglo pelón. */
function extractTiposArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.tipos)) return record.tipos;
  if (Array.isArray(record.data)) return record.data;

  // `{ data: { tipos: [...] } }` — por si alguna capa intermedia envuelve.
  const data = record.data;
  if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).tipos)) {
    return (data as Record<string, unknown>).tipos as unknown[];
  }
  return [];
}

export function normalizeSolicitudesConfiguracion(payload: unknown): SolicitudTipoConfig[] {
  return extractTiposArray(payload)
    .map(normalizeTipo)
    .filter((tipo): tipo is SolicitudTipoConfig => tipo !== null);
}

/**
 * Tipos que el colaborador puede crear desde la app. Un colaborador NO
 * solicita bajas — sin importar sus permisos: la baja laboral la gestiona
 * RH/Dirección (cierre laboral, finiquito). El backend ya no la incluye en
 * el catálogo de autoservicio y la rechaza en `POST /solicitudes`; este
 * filtro protege además contra un backend anterior.
 */
export function creatableRequestTypes(tipos: SolicitudTipoConfig[] | undefined): SolicitudTipoConfig[] {
  return (tipos ?? []).filter((tipo) => !TIPOS_NO_AUTOSERVICIO.has(tipo.clave) && !tipo.requiere_colaborador_objetivo);
}

export function findTipoConfig(tipos: SolicitudTipoConfig[] | undefined, clave: RequestType | undefined): SolicitudTipoConfig | undefined {
  if (!clave) return undefined;
  return (tipos ?? []).find((tipo) => tipo.clave === clave);
}

/** Valores capturados por el wizard, siempre indexados por el `name` del campo. */
export type DynamicFormValues = Record<string, string | number | undefined>;

/**
 * Arma el payload de `POST /solicitudes` usando EXCLUSIVAMENTE los campos
 * que el tipo declaró. Nunca se mandan claves de más: `plazo_meses` en una
 * incapacidad o `fecha_fin` en un préstamo solo confundirían la validación
 * del backend.
 */
export function buildCreatePayload(config: SolicitudTipoConfig, values: DynamicFormValues): CreateSolicitudPayload {
  if (TIPOS_NO_AUTOSERVICIO.has(config.clave)) {
    throw new Error(`El tipo ${config.clave} no se crea desde el autoservicio.`);
  }

  const payload: CreateSolicitudPayload = {
    tipo: config.clave,
    motivo: String(values.motivo ?? '').trim(),
  };

  const numericFields = new Set(['dias_solicitados', 'monto_solicitado']);

  for (const campo of config.campos) {
    if (campo.name === 'motivo' || CAMPOS_NO_AUTOSERVICIO.has(campo.name)) continue;

    const raw = values[campo.name];
    if (raw === undefined || raw === null || raw === '') continue;

    if (numericFields.has(campo.name)) {
      const numeric = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(numeric)) payload[campo.name] = numeric;
      continue;
    }

    const text = String(raw).trim();
    if (text.length > 0) payload[campo.name] = text;
  }

  return payload;
}
