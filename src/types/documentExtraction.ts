/**
 * Extracción automática de datos de documentos (OCR) — contrato AÚN NO
 * IMPLEMENTADO en capacitaciones (no existe `routes/api.php` ni controlador
 * para esto al momento de escribir este cliente; confirmado contra el
 * backend real). Se implementa completo contra el contrato acordado para
 * que la app quede lista en automático el día que el backend despliegue
 * estas rutas — ver `docs/BACKEND_GAPS_FINAL.md`.
 *
 * MUY IMPORTANTE (AGENTS.md de este encargo, sección 10): OCR nunca
 * aprueba/rechaza un documento ni cambia el perfil del colaborador por su
 * cuenta — solo ayuda a RH a decidir. RH sigue siendo quien aprueba/rechaza
 * (ver `acciones_permitidas` de `RhDocumento`, ya existente).
 */

export type ExtractionStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'reviewed';

export type ExtractionAction = 'aplicar' | 'ignorar' | 'reprocesar' | (string & {});

/** Datos estructurados detectados — nunca `extracted_text` crudo (sección 71: puede traer información sensible/innecesaria). */
export interface ExtractedFields {
  nombre?: string;
  apellidos?: string;
  curp?: string;
  rfc?: string;
  nss?: string;
  fecha_nacimiento?: string;
  domicilio?: string;
  codigo_postal?: string;
  sexo?: string;
  clave_elector?: string;
  vigencia?: string;
  [key: string]: string | undefined;
}

/** Confianza 0-1 por campo — la UI nunca muestra el decimal crudo, ver `utils/documentExtraction.ts`. */
export type ExtractionConfidenceByField = Record<string, number>;

export interface DocumentDifference {
  field: string;
  label: string;
  current_value: string | null;
  detected_value: string | null;
  confidence: number;
}

export interface DocumentExtraction {
  id: number;
  documento_id: number;
  status: ExtractionStatus;
  confidence_general?: number | null;
  datos_detectados: ExtractedFields;
  confidence: ExtractionConfidenceByField;
  differences: DocumentDifference[];
  /** Mensaje técnico solo para status `failed` — la app muestra un mensaje amable propio, no este texto crudo. */
  error_message?: string | null;
  acciones_permitidas: ExtractionAction[];
}
