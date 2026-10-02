import type { RequestStatus, SolicitudPrestamoEtapa } from '@/types/request';

/**
 * Copy humano para el detalle de una solicitud (colaborador). Basado en el
 * flujo REAL de `App\Services\RhMobile\WorkflowService::paraSolicitud()`:
 * una sola etapa de revisión (RH), nunca "tu gerente" — ese paso solo existe
 * para préstamos (`visto_bueno`, ver `prestamoNextAction` abajo) y ya se
 * muestra aparte con `StepTimeline`. No inventar una etapa que el backend no
 * tiene.
 */
export interface SolicitudStory {
  /** Frase corta, en negritas en la UI. */
  title: string;
  /** "Qué sigue" — una sola oración. */
  nextAction: string;
}

export function getSolicitudStory(estado: RequestStatus | undefined): SolicitudStory {
  switch (estado) {
    case 'creada':
    case 'enviada':
      return {
        title: 'Tu solicitud fue enviada y está esperando revisión.',
        nextAction: 'Recursos Humanos la revisará pronto. No necesitas hacer nada más por ahora.',
      };
    case 'en_revision':
      return {
        title: 'Recursos Humanos está revisando tu solicitud.',
        nextAction: 'No necesitas hacer nada. Te avisaremos en cuanto haya una respuesta.',
      };
    case 'requiere_correccion':
      return {
        title: 'Necesitamos que hagas un cambio antes de continuar.',
        nextAction: 'Revisa el motivo. Puedes agregar el documento que falte o cancelar esta solicitud y crear una nueva.',
      };
    case 'aprobada':
      return {
        title: 'Tu solicitud fue aprobada.',
        nextAction: 'No necesitas hacer nada más.',
      };
    case 'rechazada':
      return {
        title: 'Tu solicitud fue rechazada.',
        nextAction: 'Si crees que fue un error, puedes crear una nueva solicitud con más información.',
      };
    case 'cancelada':
      return {
        title: 'Cancelaste esta solicitud.',
        nextAction: 'Ya no está en revisión. Puedes crear una nueva cuando la necesites.',
      };
    default:
      return {
        title: 'Estamos procesando tu solicitud.',
        nextAction: 'Te avisaremos en cuanto haya una actualización.',
      };
  }
}

/**
 * "Quién tiene la bola" en un préstamo: se lee directo de la etapa marcada
 * `actual` por `PrestamoSeguimientoService` (dato real del backend, nunca
 * inferido). `null` si no hay ninguna etapa actual (ej. ya se resolvió).
 */
export function prestamoNextAction(etapas: SolicitudPrestamoEtapa[] | undefined): string | null {
  const actual = etapas?.find((etapa) => etapa.estado === 'actual');
  return actual ? `Esperando: ${actual.etiqueta}` : null;
}
