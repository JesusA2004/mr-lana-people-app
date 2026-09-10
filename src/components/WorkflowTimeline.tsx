import { ApprovalTimeline } from './ApprovalTimeline';

import type { Workflow } from '@/types/rh';
import { mapWorkflowToSteps } from '@/utils/workflow';

export interface WorkflowTimelineProps {
  workflow: Workflow;
}

/**
 * Timeline visual de un `workflow` real de RH (AGENTS.md sección 15):
 * ✓ Solicitud enviada / ✓ Revisión RH / ○ Gerencia / ○ Finalizado — pero
 * SIEMPRE a partir de `workflow.flujo`/`etapa_actual`/`progreso`/`estado`
 * tal como los manda el backend, nunca una cadena inventada en el cliente.
 * Reutiliza `ApprovalTimeline` (mismo componente visual que ya usa el
 * checklist de incorporación del colaborador) — la única pieza nueva es
 * `mapWorkflowToSteps`, que traduce el contrato de RH al mismo `ApprovalStep`.
 */
export function WorkflowTimeline({ workflow }: WorkflowTimelineProps) {
  return <ApprovalTimeline steps={mapWorkflowToSteps(workflow)} />;
}
