import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';

/**
 * Invalidación GRANULAR tras cada mutación del ciclo laboral — solo las
 * queries relacionadas, nunca `queryClient.clear()` ni refrescar toda la
 * app. Cada evento declara su lista de prefijos (testeable sin React, ver
 * `__tests__/cicloInvalidate.test.ts`).
 */
export type CicloMutationEvent =
  | { type: 'documento_firmado' }
  | { type: 'visto_bueno'; solicitudId: number | string }
  | { type: 'evaluacion_capturada'; evaluacionId: number | string }
  | { type: 'evaluacion_autorizada'; evaluacionId: number | string }
  | { type: 'evaluacion_devuelta'; evaluacionId: number | string }
  | { type: 'tarea_actualizada' }
  | { type: 'rh_documento_laboral'; documentoId: number | string; colaboradorId?: number | string | null }
  | { type: 'rh_alta_activada'; colaboradorId: number | string }
  | { type: 'rh_cierre'; cierreId: number | string; colaboradorId?: number | string | null }
  | { type: 'rh_recibo'; reciboId?: number | string | null }
  | { type: 'rh_prestamo'; prestamoId?: number | string | null; solicitudId?: number | string | null }
  | { type: 'rh_acta'; actaId?: number | string | null };

export function keysToInvalidate(event: CicloMutationEvent): QueryKey[] {
  switch (event.type) {
    case 'documento_firmado':
      // firma → documentos laborales, alta, expediente, pendientes, tareas, notificaciones (+ badges).
      return [
        queryKeys.laborDocumentsRoot,
        queryKeys.miAlta,
        queryKeys.miExpediente,
        queryKeys.documentosPendientes,
        queryKeys.misContratos,
        queryKeys.misPrestamos,
        queryKeys.tareas,
        queryKeys.notificaciones,
        queryKeys.bootstrap,
      ];
    case 'visto_bueno':
      return [queryKeys.equipoPendientes, queryKeys.solicitud(event.solicitudId), queryKeys.tareas, queryKeys.notificaciones, queryKeys.bootstrap];
    case 'evaluacion_capturada':
    case 'evaluacion_devuelta':
      return [queryKeys.evaluaciones, queryKeys.equipoPendientes, queryKeys.tareas, queryKeys.notificaciones];
    case 'evaluacion_autorizada':
      // autorizar → evaluaciones, contratos (renovación/cierre), tareas, dashboard RH.
      return [
        queryKeys.evaluaciones,
        queryKeys.rhContratos,
        queryKeys.rhCierres,
        ['rh', 'colaboradores'],
        queryKeys.rhDashboard,
        queryKeys.tareas,
        queryKeys.notificaciones,
        queryKeys.bootstrap,
      ];
    case 'tarea_actualizada':
      return [queryKeys.tareas];
    case 'rh_documento_laboral':
      return [
        queryKeys.rhDocumentosLaborales,
        ...(event.colaboradorId ? [queryKeys.rhAlta(event.colaboradorId)] : []),
        queryKeys.tareas,
        queryKeys.bootstrap,
      ];
    case 'rh_alta_activada':
      return [queryKeys.rhAlta(event.colaboradorId), queryKeys.rhColaborador(event.colaboradorId), ['rh', 'colaboradores'], queryKeys.rhDashboard, queryKeys.tareas, queryKeys.bootstrap];
    case 'rh_cierre':
      return [
        queryKeys.rhCierres,
        ...(event.colaboradorId ? [queryKeys.rhColaborador(event.colaboradorId)] : []),
        queryKeys.rhDocumentosLaborales,
        queryKeys.rhDashboard,
        queryKeys.tareas,
      ];
    case 'rh_recibo':
      return [queryKeys.rhRecibos];
    case 'rh_prestamo':
      return [
        queryKeys.rhPrestamos,
        ...(event.solicitudId ? [queryKeys.rhSolicitud(event.solicitudId), ['rh', 'pendientes']] : []),
        queryKeys.rhDocumentosLaborales,
        queryKeys.rhDashboard,
        queryKeys.tareas,
        queryKeys.bootstrap,
      ];
    case 'rh_acta':
      return [queryKeys.rhActas, queryKeys.rhDocumentosLaborales];
  }
}

export function invalidateCiclo(queryClient: QueryClient, event: CicloMutationEvent): void {
  for (const queryKey of keysToInvalidate(event)) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
