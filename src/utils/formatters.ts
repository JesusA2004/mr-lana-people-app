/** Humanización de catálogos y helpers de lectura defensiva de campos. */

const REQUEST_TYPE_LABELS: Record<string, string> = {
  permiso_con_goce: 'Permiso con goce',
  permiso_sin_goce: 'Permiso sin goce',
  incapacidad: 'Incapacidad',
  constancia_laboral: 'Constancia laboral',
  actualizacion_datos: 'Actualización de datos',
  actualizacion_bancaria: 'Actualización bancaria',
  reposicion_documental: 'Reposición documental',
  prestamo_interno: 'Préstamo interno',
  general: 'Solicitud general',
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

export function pickString(obj: Record<string, unknown> | undefined | null, keys: string[]): string | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
}

export function pickNumber(obj: Record<string, unknown> | undefined | null, keys: string[]): number | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  }
  return undefined;
}

export function pickBoolean(obj: Record<string, unknown> | undefined | null, keys: string[]): boolean | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}
