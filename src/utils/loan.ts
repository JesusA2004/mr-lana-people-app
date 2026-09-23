import type { Prestamo } from '@/types/loan';

/** Estados reales de `prestamos.estado` (`App\Services\Nomina\PrestamoService`). */
const ESTADO_LABEL: Record<string, string> = {
  pendiente_entrega: 'Autorizado · pendiente de entrega',
  activo: 'Activo',
  liquidado: 'Liquidado',
  cancelado: 'Cancelado',
};

const ESTADO_BADGE: Record<string, string> = {
  pendiente_entrega: 'en_revision',
  activo: 'aprobado',
  liquidado: 'cerrada',
  cancelado: 'cancelada',
};

export function prestamoEstadoLabel(estado: string | null): string {
  return (estado && ESTADO_LABEL[estado]) ?? estado ?? 'Sin estado';
}

export function prestamoEstadoBadge(estado: string | null): string {
  return (estado && ESTADO_BADGE[estado]) ?? 'pendiente';
}

/** Préstamo "vigente" para la card de Inicio: el que el backend marca activo o por entregar. */
export function prestamoVigente(prestamos: Prestamo[] | undefined): Prestamo | null {
  return (prestamos ?? []).find((p) => p.estado === 'activo' || p.estado === 'pendiente_entrega') ?? null;
}

const DOC_FIRMADO = new Set([
  'firmado_digitalmente',
  'pendiente_impresion',
  'impreso',
  'pendiente_firma_fisica',
  'firmado_fisicamente',
  'enviado_corporativo',
  'recibido_corporativo',
  'escaneado',
  'archivado',
]);

/** Espejo de la guarda de `PrestamoAutorizacionService::resguardar()`: contrato Y pagaré firmados, sin resguardo previo. */
export function canResguardarPrestamo(prestamo: Prestamo, permissions: string[] | undefined): boolean {
  return (
    Array.isArray(permissions) &&
    permissions.includes('prestamos.resguardar') &&
    !prestamo.resguardado_en &&
    !!prestamo.contrato?.estado &&
    DOC_FIRMADO.has(prestamo.contrato.estado) &&
    !!prestamo.pagare?.estado &&
    DOC_FIRMADO.has(prestamo.pagare.estado)
  );
}

/** Generar contrato/pagaré solo tiene sentido si falta alguno (el backend omite los ya generados). */
export function canGenerarDocumentosPrestamo(prestamo: Prestamo, permissions: string[] | undefined): boolean {
  return (
    Array.isArray(permissions) &&
    permissions.includes('prestamos.autorizar') &&
    prestamo.estado !== 'cancelado' &&
    (!prestamo.contrato || !prestamo.pagare)
  );
}

/** "12 meses" / "1 mes"; `null` si el backend no manda un plazo válido (nunca "NaN meses"). */
export function formatPlazoMeses(plazo: number | string | null | undefined): string | null {
  if (plazo == null || plazo === '') return null;
  const n = Number(plazo);
  if (!Number.isFinite(n)) return null;
  return `${n} ${n === 1 ? 'mes' : 'meses'}`;
}

export type PeriodicidadPrestamo = 'semanal' | 'quincenal' | 'mensual';

/**
 * Valores iniciales del formulario "Autorizar préstamo": lo solicitado, que
 * RH puede ajustar. El plazo solicitado está en MESES (`plazo_meses`), así
 * que la periodicidad inicial es mensual para que "plazo = número de pagos"
 * signifique lo mismo que pidió el colaborador.
 */
export function prestamoAutorizacionInicial(prestamo: { monto_solicitado: number | null; plazo_solicitado: number | null }): {
  monto: string;
  plazo: string;
  periodicidad: PeriodicidadPrestamo;
} {
  const monto = prestamo.monto_solicitado != null && Number.isFinite(prestamo.monto_solicitado) ? String(prestamo.monto_solicitado) : '';
  const plazo =
    prestamo.plazo_solicitado != null && Number.isInteger(prestamo.plazo_solicitado) && prestamo.plazo_solicitado >= 1 ? String(prestamo.plazo_solicitado) : '';
  return { monto, plazo, periodicidad: plazo ? 'mensual' : 'quincenal' };
}
