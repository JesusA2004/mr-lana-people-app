/**
 * Humanización de catálogos y helpers de lectura defensiva de campos.
 *
 * Los catálogos reflejan exactamente App\Enums\TipoSolicitudInterna y
 * App\Enums\EstadoSolicitudInterna del backend real. Las pantallas deben
 * preferir siempre `tipo_etiqueta`/`estado_etiqueta` cuando el backend los
 * incluye (ya vienen traducidos) y usar estas funciones solo como respaldo.
 */

/**
 * Espejo LITERAL de `TipoSolicitudInterna::etiqueta()` — 17 casos. Ojo: las
 * claves son `prestamo` y `solicitud_general` (antes la app usaba
 * `prestamo_interno`/`general`, que nunca existieron en el backend y hacían
 * que esas solicitudes se mostraran con el slug crudo).
 */
const REQUEST_TYPE_LABELS: Record<string, string> = {
  vacaciones: 'Vacaciones',
  permiso_con_goce: 'Permiso con goce de sueldo',
  permiso_sin_goce: 'Permiso sin goce de sueldo',
  permiso_tiempo: 'Permiso por tiempo (horas)',
  salida_temprano: 'Salida temprano',
  llegada_tarde: 'Llegada tarde',
  incapacidad: 'Incapacidad',
  constancia_laboral: 'Constancia laboral',
  actualizacion_datos: 'Actualización de datos',
  actualizacion_bancaria: 'Actualización bancaria',
  reposicion_documental: 'Reposición documental',
  prestamo: 'Préstamo interno',
  baja_colaborador: 'Baja de colaborador',
  permiso_especial_cumpleanos: 'Permiso especial: cumpleaños',
  permiso_especial_paternidad: 'Permiso especial: paternidad',
  permiso_especial_fallecimiento: 'Permiso especial: fallecimiento',
  solicitud_general: 'Solicitud general',
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  creada: 'Creada',
  enviada: 'Enviada',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  requiere_correccion: 'Requiere corrección',
  cancelada: 'Cancelada',
  cerrada: 'Cerrada',
  // Vocabulario adicional de RH/expedientes.
  pendiente: 'Pendiente',
  cargado: 'Cargado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  vencido: 'Vencido',
  cambio_solicitado: 'Cambio solicitado',
  cambio_autorizado: 'Cambio autorizado',
  incompleto: 'Incompleto',
  completo: 'Completo',
};

function humanizeSlug(value: string): string {
  const withSpaces = value.replace(/[_-]+/g, ' ').trim();
  if (!withSpaces) return value;
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

export function humanizeRequestType(tipo?: string | null): string {
  if (!tipo) return 'Solicitud';
  return REQUEST_TYPE_LABELS[tipo] ?? humanizeSlug(tipo);
}

export function humanizeRequestStatus(estado?: string | null): string {
  if (!estado) return 'Sin estado';
  return REQUEST_STATUS_LABELS[estado] ?? humanizeSlug(estado);
}

export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase() || '?';
}

/** Arma "Nombre Apellidos" a partir de las dos columnas separadas del backend. */
export function joinName(nombre?: string | null, apellidos?: string | null): string | undefined {
  const value = [nombre, apellidos].filter((part) => Boolean(part && part.trim())).join(' ');
  return value.length > 0 ? value : undefined;
}

/** Lee la primera clave de `keys` presente en `obj` cuyo valor sea un string no vacío. */
export function pickString(obj: Record<string, unknown> | undefined | null, keys: string[]): string | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
}

/** Lee la primera clave de `keys` presente en `obj` cuyo valor sea numérico (o string numérico). */
export function pickNumber(obj: Record<string, unknown> | undefined | null, keys: string[]): number | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

/** Lee la primera clave de `keys` presente en `obj` cuyo valor sea booleano. */
export function pickBoolean(obj: Record<string, unknown> | undefined | null, keys: string[]): boolean | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

/** "3 documentos", "1 documento" — pluraliza sin librería adicional. */
export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/**
 * Nombre de archivo legible para descargas (sección 73: "usar nombre
 * correcto... no exponer UUID/path NAS"). Sin extensión a propósito —
 * `SecureDocumentViewer` siempre agrega la extensión real detectada por
 * `Content-Type`, nunca confía en la del título.
 */
export function slugifyFilename(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'documento';
}

/**
 * Formato monetario MXN para mostrar (nunca para enviar): el payload de
 * `monto_solicitado` viaja como número limpio, sin separadores ni símbolo.
 */
export function formatCurrencyMXN(value: number | undefined | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(value);
}

/** Quita todo lo que no sea dígito o punto decimal — entrada de `MoneyField`. */
export function parseCurrencyInput(value: string): number | undefined {
  const cleaned = value.replace(/[^0-9.]/g, '');
  if (cleaned === '') return undefined;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : undefined;
}
