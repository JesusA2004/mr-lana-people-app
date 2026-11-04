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
  /**
   * Documento que puede venir en el MISMO archivo (las dos cartas de
   * recomendación, backend 2026-10-27). Si `puede_subir`, al subir se ofrece
   * «Este archivo trae también…» (`incluyePar`). Null/ausente = sin par.
   */
  par?: { id: number; nombre: string; puede_subir: boolean } | null;
  /**
   * Formato que PEOPLE GENERA con los datos de la persona (Solicitud de
   * empleo, Estudio socioeconómico — backend 2026-11-04): nunca se sube
   * (`puede_subir` = false), no bloquea ni va en la carta compromiso.
   * Null/ausente = documento normal que la persona sube.
   */
  generado_por_sistema?: GeneradoPorSistema | null;
}

/**
 * - escaneo: ya había subido un escaneo (historial, sigue cumpliendo).
 * - generado: ya se generó con sus datos (RH lo entrega impreso para firma).
 * - por_generar: aún no; lo prepara RH, o sale del paso «Solicitud de empleo» del registro.
 */
export type EstadoGeneradoPorSistema = 'escaneo' | 'generado' | 'por_generar';

/** Quién lo resuelve: la persona en su registro (`registro`) o Recursos Humanos (`rh`). */
export type CapturaGeneradoPorSistema = 'registro' | 'rh';

export interface GeneradoPorSistema {
  estado: EstadoGeneradoPorSistema;
  cumplido: boolean;
  titulo: string;
  mensaje: string;
  captura: CapturaGeneradoPorSistema;
  documento_generado_id?: number | null;
}
