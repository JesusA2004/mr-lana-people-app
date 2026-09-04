/**
 * Espejo de `App\Services\Onboarding\OnboardingService::checklist()` — 11
 * ítems fijos (`datos_personales`, `datos_laborales`, `fotografia`,
 * `documentos_cargados`, `documentos_aprobados`, `contrato_generado`,
 * `contrato_firmado`, `aviso_privacidad`, `consentimiento`,
 * `expediente_completo`, `alta_aprobada`). La app no debe asumir el
 * catálogo fijo — solo renderizar lo que llegue.
 */
export interface ChecklistItem {
  clave: string;
  etiqueta: string;
  completado: boolean;
}

export type ApprovalStepStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

/**
 * Pasos de aprobación estructurados (RH → Gerente → Director Comercial para
 * Corporativo MR. LANA, ver AGENTS.md). El backend HOY no calcula esta
 * cadena (confirmado: `AltaDigital` solo tiene un `revisado_por`/`aprobado_por`
 * de un solo paso) — por eso este campo es opcional/nulo. Cuando el backend
 * lo agregue, la pantalla de incorporación debe representarlo tal cual, sin
 * decidir la regla de negocio en el cliente.
 */
export interface ApprovalStep {
  key: string;
  label: string;
  status: ApprovalStepStatus;
  comment?: string | null;
  updated_at?: string | null;
}

/** Espejo del subconjunto de `AltaDigital` relevante para el colaborador. */
export interface AltaDigitalSummary {
  id: number;
  estado: string;
  estado_etiqueta?: string;
  enviada_en?: string | null;
  revisado_en?: string | null;
  aprobado_en?: string | null;
  motivo_rechazo?: string | null;
}

/** Contrato de `GET /api/v1/colaborador/incorporacion` (pendiente — ver docs/MOBILE_BACKEND_REQUIREMENTS.md P1.2). */
export interface IncorporacionResponse {
  checklist: ChecklistItem[];
  porcentaje: number;
  alta_digital: AltaDigitalSummary | null;
  /** Ausente hasta que el backend implemente la cadena de aprobación estructurada. */
  approval_steps?: ApprovalStep[] | null;
}
