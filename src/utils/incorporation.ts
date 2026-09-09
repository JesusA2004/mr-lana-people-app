import type { ApprovalStep, IncorporacionEstado } from '@/types/incorporation';

/**
 * El backend calcula un único `estado` general para toda la incorporación
 * (`App\Services\Incorporacion\IncorporacionService::estadoGeneral()`), no
 * una cadena de aprobación con pasos independientes (RH → Gerente →
 * Director Comercial no existe en el backend hoy). Esta función solo
 * traduce ese valor a 3 pasos visuales para `ApprovalTimeline`; si el
 * backend llega a exponer una cadena real, esto debe reemplazarse por los
 * pasos que entregue directamente.
 */
export function deriveIncorporationSteps(estado: IncorporacionEstado): ApprovalStep[] {
  const documentosListos = estado !== 'incompleto';
  const decidida = estado === 'aprobado' || estado === 'rechazado';

  return [
    {
      key: 'documentos',
      label: 'Documentos cargados',
      status: documentosListos ? 'approved' : 'in_review',
    },
    {
      key: 'revision_rh',
      label: 'Revisión de Recursos Humanos',
      status: !documentosListos ? 'pending' : estado === 'rechazado' ? 'rejected' : estado === 'completo' || estado === 'aprobado' ? 'approved' : 'in_review',
    },
    {
      key: 'incorporacion_aprobada',
      label: 'Incorporación aprobada',
      status: estado === 'aprobado' ? 'approved' : estado === 'rechazado' ? 'rejected' : decidida ? 'in_review' : 'pending',
    },
  ];
}
