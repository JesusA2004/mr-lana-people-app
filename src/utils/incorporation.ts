import type { AltaDigitalSummary, ApprovalStep } from '@/types/incorporation';

/**
 * Deriva 3 pasos visuales (Documentación → Revisión RH → Alta completada) a
 * partir del único campo `estado` de `AltaDigital` — el backend HOY no
 * calcula una cadena de aprobación real (confirmado: no hay campos de
 * gerente/director comercial en `altas_digitales`, ver
 * docs/MOBILE_BACKEND_REQUIREMENTS.md P1.1). Es una aproximación honesta
 * para no dejar la pantalla vacía; en cuanto el backend entregue
 * `approval_steps`, esta función deja de usarse.
 */
export function deriveApprovalStepsFromEstado(alta: AltaDigitalSummary): ApprovalStep[] {
  const enCaptura = ['creada', 'enviada', 'en_captura', 'enviada_por_candidato'].includes(alta.estado);
  const enRevision = alta.estado === 'en_revision_rh';
  const requiereCorreccion = alta.estado === 'requiere_correccion';
  const aprobada = alta.estado === 'aprobada';
  const convertida = alta.estado === 'convertida_a_colaborador';
  const rechazada = alta.estado === 'rechazada';
  const cancelada = alta.estado === 'cancelada';

  return [
    {
      key: 'documentacion',
      label: 'Documentación',
      status: enCaptura ? 'in_review' : 'approved',
    },
    {
      key: 'revision_rh',
      label: 'Revisión de RH',
      status: enCaptura ? 'pending' : requiereCorreccion ? 'rejected' : enRevision ? 'in_review' : rechazada || cancelada ? 'rejected' : 'approved',
      comment: requiereCorreccion ? 'Se te pidió corregir información o documentos.' : alta.motivo_rechazo ?? undefined,
    },
    {
      key: 'alta_completada',
      label: 'Alta completada',
      status: convertida ? 'approved' : aprobada ? 'in_review' : 'pending',
    },
  ];
}
