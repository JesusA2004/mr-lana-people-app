import type { CreateSolicitudPayload, Solicitud, SolicitudPrestamoEtapa } from '@/types/request';
import type { StepTimelineStatus } from '@/components/ciclo/StepTimeline';

/** Límite de captura (el backend valida igual: `numeric|min:1`). */
export const LOAN_MAX_AMOUNT = 9_999_999;
export const LOAN_REASON_MAX = 500;

export interface LoanRequestErrors {
  monto?: string;
  motivo?: string;
}

/**
 * Validación de la solicitud de préstamo del colaborador: SOLO monto y
 * motivo. Plazo, periodicidad y condiciones los decide RH al autorizar.
 */
export function validateLoanRequest(monto: number | undefined, motivo: string): LoanRequestErrors {
  const errors: LoanRequestErrors = {};
  if (monto === undefined || !Number.isFinite(monto) || monto <= 0) errors.monto = 'Indica cuánto necesitas.';
  else if (monto > LOAN_MAX_AMOUNT) errors.monto = 'El monto es demasiado alto.';
  const texto = motivo.trim();
  if (!texto) errors.motivo = 'Cuéntanos para qué lo necesitas.';
  else if (texto.length > LOAN_REASON_MAX) errors.motivo = `Máximo ${LOAN_REASON_MAX} caracteres.`;
  return errors;
}

/** Payload exacto de `POST /solicitudes` para un préstamo: tipo + monto + motivo. Nada más. */
export function buildLoanRequestPayload(monto: number, motivo: string): CreateSolicitudPayload {
  return { tipo: 'prestamo', monto_solicitado: Math.round(monto * 100) / 100, motivo: motivo.trim() };
}

const ETAPA_A_TIMELINE: Record<string, StepTimelineStatus> = {
  hecho: 'done',
  actual: 'current',
  pendiente: 'pending',
  rechazado: 'cancelled',
};

/** Etapas del backend → timeline. Un estado desconocido se pinta como pendiente. */
export function loanStagesToTimeline(etapas: SolicitudPrestamoEtapa[] | undefined) {
  return (etapas ?? []).map((etapa) => ({ key: etapa.clave, label: etapa.etiqueta, status: ETAPA_A_TIMELINE[etapa.estado] ?? 'pending' }));
}

/** Solicitudes de préstamo que siguen en trámite (aún sin préstamo autorizado o en firma). */
export function loanRequestsInProgress(solicitudes: Solicitud[] | undefined): Solicitud[] {
  return (solicitudes ?? []).filter((s) => {
    if (s.tipo !== 'prestamo') return false;
    if (s.estado === 'cancelada' || s.estado === 'cerrada') return false;
    const etapas = s.prestamo?.etapas ?? [];
    if (etapas.length === 0) return s.estado !== 'rechazada' && s.estado !== 'aprobada';
    // Terminado cuando la firma ya está hecha; rechazado se sigue mostrando para que la persona vea el motivo.
    return etapas.some((e) => e.estado === 'actual' || e.estado === 'rechazado');
  });
}
