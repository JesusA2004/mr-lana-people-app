import type { DocumentoIncorporacion } from './document';

/** Espejo de `App\Services\Incorporacion\IncorporacionService::progreso()`. */
export interface IncorporacionProgreso {
  total: number;
  aprobados: number;
  pendientes: number;
  en_revision: number;
  rechazados: number;
  porcentaje: number;
  /** Regla única del backend (ProgresoExpediente). Opcionales por compatibilidad. */
  total_obligatorios?: number;
  completos?: number;
  faltantes?: number;
  completo?: boolean;
  sin_obligatorios?: boolean;
}

/** Espejo de `App\Services\Incorporacion\IncorporacionService::estadoGeneral()`. */
export type IncorporacionEstado = 'incompleto' | 'en_revision' | 'completo' | 'aprobado' | 'rechazado';

/**
 * Contrato real de `GET /api/v1/colaborador/incorporacion` (alias
 * `/colaborador/incorporacion/resumen`) — confirmado contra
 * `App\Services\Incorporacion\IncorporacionService::estadoIncorporacion()`
 * en capacitaciones. Es el único endpoint que expone el checklist de
 * documentos del colaborador, tanto durante el alta como después (mientras
 * `estado !== 'aprobado'` sigue pudiendo subir/solicitar cambios).
 */
export interface IncorporacionResponse {
  estado: IncorporacionEstado;
  puede_acceder_portal: boolean;
  puede_subir_documentos: boolean;
  puede_solicitar_cambios: boolean;
  progreso: IncorporacionProgreso;
  documentos: DocumentoIncorporacion[];
}

export type ApprovalStepStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

/**
 * Pasos visuales para `ApprovalTimeline`, derivados en el cliente del único
 * campo `estado` que el backend calcula hoy (ver `utils/incorporation.ts`).
 * El backend NO expone una cadena de aprobación estructurada (RH → Gerente
 * → Director Comercial): solo `estado` general de la incorporación —
 * confirmado en `IncorporacionService`/`docs/API_MOVIL.md`. Si el backend
 * llega a exponer una cadena real, esto debe reemplazarse por los pasos que
 * entregue directamente, no seguir derivándose en el cliente.
 */
export interface ApprovalStep {
  key: string;
  label: string;
  status: ApprovalStepStatus;
  comment?: string | null;
}
