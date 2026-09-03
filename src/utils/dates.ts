/**
 * Utilidades centralizadas de formato de fecha en español (es-MX).
 * Ninguna pantalla debe formatear fechas por su cuenta.
 */

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "3 de septiembre de 2026" */
export function formatDateLong(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** "3 sept. 2026" */
export function formatDateShort(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** "3 de septiembre de 2026, 10:45 a. m." */
export function formatDateTime(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/** yyyy-MM-dd, formato que suelen esperar los backends Laravel para fechas. */
export function toApiDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDateBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

export function isValidDateString(value?: string | null): boolean {
  return parseDate(value) !== null;
}
