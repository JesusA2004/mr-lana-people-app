import type { ApprovalStep, ApprovalStepStatus } from '@/types/incorporation';
import type { NivelAprobacion, Workflow, WorkflowEtapa } from '@/types/rh';
import { formatDateTime } from '@/utils/dates';

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

  return workflow.flujo.map((original, index) => {
    // Backends anteriores mandaban la etapa como `{ etapa: 'rh' }` sin
    // `clave`/`nombre`: sin este respaldo la lista quedaba con key
    // undefined ("Each child in a list should have a unique key prop").
    const legado = original as WorkflowEtapa & { etapa?: string };
    const clave = legado.clave || legado.etapa || `etapa-${index}`;
    const etapa: WorkflowEtapa = {
      clave,
      nombre: legado.nombre || (workflow.etapa_actual?.clave === clave ? workflow.etapa_actual.nombre : '') || 'Revisión RH',
    };
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

/**
 * Cadena real de vistos buenos jerárquicos (Gerente → Regional → Dirección
 * Comercial, `AprobacionJerarquicaService::resumen()`) a los pasos visuales
 * de `ApprovalTimeline`, con "Solicitud enviada" al inicio y "RH" al final
 * (la decisión de RH ya vive en `solicitud.estado`, no en `niveles`).
 * `niveles` vacío significa que este tipo de solicitud no requiere visto
 * bueno jerárquico — en ese caso no hay nada que mostrar (la pantalla debe
 * caer en `WorkflowTimeline`/`mapWorkflowToSteps` para ese caso).
 */
export function nivelesAprobacionToTimeline(niveles: NivelAprobacion[] | undefined, estadoSolicitud: string): ApprovalStep[] {
  if (!niveles || niveles.length === 0) return [];

  const steps: ApprovalStep[] = [{ key: 'enviada', label: 'Solicitud enviada', status: 'approved' }];
  let siguientePendienteAsignado = false;

  niveles.forEach((nivel) => {
    let status: ApprovalStepStatus;
    if (nivel.estado === 'aprobado') status = 'approved';
    else if (nivel.estado === 'rechazado') status = 'rejected';
    else if (!siguientePendienteAsignado) {
      status = 'in_review';
      siguientePendienteAsignado = true;
    } else {
      status = 'pending';
    }

    steps.push({
      key: nivel.nivel,
      label: nivel.etiqueta,
      status,
      approver: nivel.decidio ?? (nivel.aprobadores.length > 0 ? nivel.aprobadores.join(', ') : 'Sin asignar'),
      date: nivel.fecha ? formatDateTime(nivel.fecha) : undefined,
      comment: nivel.comentario,
    });
  });

  const algunRechazo = niveles.some((n) => n.estado === 'rechazado');
  const todosAprobados = niveles.every((n) => n.estado === 'aprobado');
  const rhStatus: ApprovalStepStatus = algunRechazo
    ? 'pending'
    : REJECTED_STATES.has(estadoSolicitud)
      ? 'rejected'
      : APPROVED_STATES.has(estadoSolicitud)
        ? 'approved'
        : todosAprobados
          ? 'in_review'
          : 'pending';

  steps.push({ key: 'rh', label: 'RH', status: rhStatus });

  return steps;
}
