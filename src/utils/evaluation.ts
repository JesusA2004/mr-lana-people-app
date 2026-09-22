import type { Evaluacion } from '@/types/evaluation';

/**
 * Acciones de evaluación que tiene sentido OFRECER (el backend decide con
 * `EvaluacionPeriodoPruebaPolicy` + guardas de estado del servicio):
 *
 *  - capturar: estado `pendiente`/`devuelta` (`EstadoEvaluacionPrueba::permiteCaptura()`)
 *    y la cuenta es evaluador/jefe (el listado de un usuario SIN
 *    `evaluaciones.autorizar` solo contiene evaluaciones de su equipo —
 *    `EvaluacionPeriodoPruebaService::listar()`) o tiene `evaluaciones.autorizar`.
 *  - autorizar / devolver: estado `capturada` + `evaluaciones.autorizar`.
 */
export interface EvaluationActions {
  capturar: boolean;
  autorizar: boolean;
  devolver: boolean;
}

export function evaluationActions(evaluacion: Pick<Evaluacion, 'estado'>, permissions: string[] | undefined, esDeMiEquipo: boolean): EvaluationActions {
  const puedeAutorizar = Array.isArray(permissions) && permissions.includes('evaluaciones.autorizar');
  const capturable = evaluacion.estado === 'pendiente' || evaluacion.estado === 'devuelta';
  return {
    capturar: capturable && (esDeMiEquipo || puedeAutorizar),
    autorizar: evaluacion.estado === 'capturada' && puedeAutorizar,
    devolver: evaluacion.estado === 'capturada' && puedeAutorizar,
  };
}

export function evaluacionBadge(estado: string): string {
  switch (estado) {
    case 'pendiente':
      return 'pendiente';
    case 'devuelta':
      return 'requiere_correccion';
    case 'capturada':
      return 'en_revision';
    case 'autorizada':
      return 'aprobado';
    default:
      return 'pendiente';
  }
}

/** Texto de la consecuencia real de autorizar (lo ejecuta el backend, no la app). */
export function consecuenciaAutorizacion(renovar: boolean): string {
  return renovar
    ? 'Renovar: el contrato actual se marcará como renovado y se generará un contrato por tiempo indeterminado que entra al flujo de firmas.'
    : 'No renovar: se iniciará el cierre laboral del colaborador con tipo "No renovación de contrato".';
}
