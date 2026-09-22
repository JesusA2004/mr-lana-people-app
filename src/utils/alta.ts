import type { AltaChecklist, EstadoAlta } from '@/types/cicloLaboral';

/**
 * Pasos visuales del alta — traducción 1:1 del estado REAL que calcula el
 * backend (`AltaColaboradorService::recalcularEstado()`):
 *
 *   pendiente_documentos → documentacion_en_revision → pendiente_contrato
 *   → pendiente_firma → pendiente_activacion → activo
 *
 * La app nunca recalcula el estado: solo decide en qué paso pintar el
 * stepper a partir de `estado_alta`.
 */
export const ALTA_STEPS = ['Documentación', 'Revisión', 'Contrato', 'Firma', 'Activación'] as const;

const STEP_INDEX: Record<EstadoAlta, number> = {
  pendiente_documentos: 0,
  documentacion_en_revision: 1,
  pendiente_contrato: 2,
  pendiente_firma: 3,
  pendiente_activacion: 4,
  // Activo = todos los pasos completos (índice fuera de rango ⇒ Stepper los marca hechos).
  activo: ALTA_STEPS.length,
  baja: ALTA_STEPS.length,
};

export function altaStepIndex(estado: EstadoAlta | null | undefined): number {
  return estado ? STEP_INDEX[estado] : 0;
}

/** true si el colaborador sigue en incorporación (mostrar avance en Inicio). */
export function isAltaEnProceso(estado: EstadoAlta | null | undefined): boolean {
  return !!estado && estado !== 'activo' && estado !== 'baja';
}

/** Mensaje orientado al colaborador para el paso actual. */
export function altaColaboradorHint(estado: EstadoAlta | null | undefined): string | null {
  switch (estado) {
    case 'pendiente_documentos':
      return 'Carga o corrige los documentos obligatorios de tu expediente.';
    case 'documentacion_en_revision':
      return 'RH está revisando tus documentos.';
    case 'pendiente_contrato':
      return 'RH está preparando tu contrato.';
    case 'pendiente_firma':
      return 'Tienes documentos contractuales por firmar.';
    case 'pendiente_activacion':
      return 'Todo listo: RH activará tu alta en breve.';
    default:
      return null;
  }
}

/**
 * ¿Ofrecer "Activar" a RH? Espejo de la guarda de
 * `AltaColaboradorService::activar()`: solo cuando el backend ya calculó
 * `pendiente_activacion` (obligatorios aprobados + contrato firmado) y la
 * cuenta tiene `colaboradores.activar`. Si el backend cambiara de opinión
 * responde 422 con el motivo real.
 */
export function canActivarAlta(alta: Pick<AltaChecklist, 'estado_alta'>, permissions: string[] | undefined): boolean {
  return alta.estado_alta === 'pendiente_activacion' && Array.isArray(permissions) && permissions.includes('colaboradores.activar');
}

/** Lista de lo que bloquea el alta, en lenguaje de RH, derivada SOLO de datos del checklist. */
export function altaBloqueos(alta: AltaChecklist): string[] {
  const bloqueos: string[] = [];
  const exp = alta.expediente;
  if (exp.faltantes > 0) bloqueos.push(`${exp.faltantes} documento(s) obligatorio(s) sin cargar o rechazado(s).`);
  if (exp.en_revision > 0) bloqueos.push(`${exp.en_revision} documento(s) en revisión.`);
  if (!alta.contrato) bloqueos.push('Sin contrato vigente registrado.');
  if (alta.documentos_contractuales_sin_plantilla.length > 0) {
    bloqueos.push(`Documentos contractuales sin plantilla activa: ${alta.documentos_contractuales_sin_plantilla.join(', ')}.`);
  }
  const sinFirma = alta.documentos_contractuales.filter((doc) => !doc.firmado && doc.estado !== 'cancelado');
  if (sinFirma.length > 0) bloqueos.push(`${sinFirma.length} documento(s) contractual(es) pendiente(s) de firma.`);
  if (!alta.acceso.tiene_cuenta) bloqueos.push('El colaborador no tiene cuenta de acceso para firmar desde la app.');
  return bloqueos;
}
