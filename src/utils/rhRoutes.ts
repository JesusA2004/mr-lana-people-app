import type { RhPendiente, RhPendienteTipo } from '@/types/rh';

/** Ruta de detalle para una entrada de la bandeja unificada RH (dashboard/pendientes) según su `tipo`. */
export function rhPendienteDetailRoute(pendiente: Pick<RhPendiente, 'tipo' | 'resource_id'>): string {
  const byTipo: Record<RhPendienteTipo, string> = {
    solicitud: `/(app)/rh/solicitudes/${pendiente.resource_id}`,
    vacaciones: `/(app)/rh/vacaciones/${pendiente.resource_id}`,
    documento: `/(app)/rh/documentos/${pendiente.resource_id}`,
    incorporacion: `/(app)/rh/incorporaciones/${pendiente.resource_id}`,
  };
  return byTipo[pendiente.tipo];
}
