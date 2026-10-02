/** Presentación del reclutamiento (`CandidatoWorkflowService` / `EstadoCandidato`). */

const ESTADOS_SALIDA = new Set(['no_viable', 'no_seleccionado', 'rechazado_rh', 'no_respondio', 'desistio']);

export function candidatoBadge(estado: string): string {
  if (ESTADOS_SALIDA.has(estado)) return 'rechazada';
  if (estado === 'contratado') return 'aprobada';
  if (estado === 'autorizado_rh' || estado === 'en_contratacion') return 'aprobado';
  return 'en_revision';
}

export function esCandidatoEnSalida(estado: string): boolean {
  return ESTADOS_SALIDA.has(estado) || estado === 'contratado';
}
