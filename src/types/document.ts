/**
 * Contrato cliente para el expediente digital y sus documentos.
 *
 * Espejo exacto de lo que ya arma `Rh\ExpedienteController::documentosParaVista()`
 * y `App\Enums\EstadoDocumento` en capacitaciones — el endpoint móvil
 * (`GET /api/v1/colaborador/expediente`, ver docs/MOBILE_BACKEND_REQUIREMENTS.md)
 * todavía no existe, pero el contrato se definió leyendo el código real, no
 * inventado. En cuanto el backend lo agregue, estos tipos no deberían
 * necesitar cambios.
 */
export type DocumentStatus =
  | 'pendiente'
  | 'cargado'
  | 'en_revision'
  | 'aprobado'
  | 'rechazado'
  | 'requiere_correccion'
  | 'vencido'
  | 'archivado';

export interface DocumentTypeCatalogItem {
  id: number;
  nombre: string;
  clave: string;
  requerido: boolean;
}

export interface EmployeeDocumentSummary {
  id: number;
  status: DocumentStatus;
  version: number;
  original_name: string;
  mime?: string | null;
  size?: number | null;
  comments?: string | null;
  rejection_reason?: string | null;
  subido_por?: string | null;
  revisado_por?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
}

/** Una fila del expediente: el catálogo de tipo de documento + el documento vigente (o null si no se ha cargado). */
export interface ExpedienteDocumentoEntry {
  tipo: DocumentTypeCatalogItem;
  documento: EmployeeDocumentSummary | null;
}
