/**
 * Contrato real de un documento del checklist de incorporación/expediente
 * del colaborador — espejo de
 * `App\Services\Incorporacion\IncorporacionService::documentoParaColaborador()`
 * (ver capacitaciones/docs/API_MOVIL.md, sección "Incorporación documental").
 * `id` es el id del TIPO de documento (`document_types.id`), no el id
 * interno de `employee_documents`: la app nunca necesita ese id, solo RH
 * (vista aparte, fuera de esta app).
 */
export type DocumentStatus =
  | 'pendiente'
  | 'cargado'
  | 'en_revision'
  | 'aprobado'
  | 'rechazado'
  | 'requiere_correccion'
  | 'vencido'
  | 'archivado'
  | 'cambio_solicitado'
  | 'cambio_autorizado';

/** Una entrada de `documentos[]` en `GET /api/v1/colaborador/incorporacion`. */
export interface DocumentoIncorporacion {
  id: number;
  tipo: string;
  nombre: string;
  obligatorio: boolean;
  estado: DocumentStatus;
  mensaje?: string | null;
  motivo_rechazo?: string | null;
  puede_subir: boolean;
  puede_reemplazar: boolean;
  puede_solicitar_cambio: boolean;
  /** Id del archivo vigente (backend 2026-09-22). El push `documento` usa este id como resource_id. */
  documento_id?: number | null;
  fecha_subida?: string | null;
  fecha_revision?: string | null;
}
