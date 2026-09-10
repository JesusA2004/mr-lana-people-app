import type { ApprovalStep, ApprovalStepStatus } from '@/types/incorporation';
import type { Workflow } from '@/types/rh';

const REJECTED_STATES = new Set(['rechazada', 'rechazado']);
const APPROVED_STATES = new Set(['aprobada', 'aprobado']);

/**
 * Traduce el `workflow` real que manda el backend (`estado`,
 * `etapa_actual`, `progreso`, `flujo`) a los pasos visuales de
 * `WorkflowTimeline`/`ApprovalTimeline` (AGENTS.md sección 15). La app NUNCA
 * inventa etapas: recorre exactamente `workflow.flujo` tal como llega —
 * hoy siempre una sola etapa ("rh"), pero esto no asume esa cantidad, para
 * seguir funcionando si el backend agrega una etapa más (ver
 * `App\Services\RhMobile\WorkflowService`, comentario "extensible").
 */
export function mapWorkflowToSteps(workflow: Workflow): ApprovalStep[] {
  const isRejected = REJECTED_STATES.has(workflow.estado);
  const isApproved = APPROVED_STATES.has(workflow.estado);
  const lastIndex = workflow.flujo.length - 1;

  return workflow.flujo.map((etapa, index) => {
    const isCurrent = workflow.etapa_actual?.clave === etapa.clave;
    let status: ApprovalStepStatus = 'pending';

    if (isApproved) {
      status = 'approved';
    } else if (isRejected) {
      status = isCurrent || index === lastIndex ? 'rejected' : index < workflow.progreso.actual ? 'approved' : 'pending';
    } else if (index < workflow.progreso.actual) {
      status = 'approved';
    } else if (isCurrent) {
      status = 'in_review';
    }

    return { key: etapa.clave, label: etapa.nombre, status };
  });
}
