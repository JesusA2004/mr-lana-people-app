import {
  CAMPOS_APLICABLES,
  type DocumentExtraction,
  type DocumentExtractionResponse,
  type ExtractedFieldKey,
  type ExtractionApplicableField,
  type ExtractionConfidenceLevel,
  type ExtractionStatus,
} from '@/types/documentExtraction';

/** Mismo texto que `EstadoExtraccion::etiqueta()` en el backend — nunca mostrar el slug crudo (`pending`, `processed`...) al usuario. */
export function extractionStatusLabel(status: ExtractionStatus | string | undefined): string {
  switch (status) {
    case 'pending':
      return 'Pendiente de análisis';
    case 'processing':
      return 'Analizando documento…';
    case 'processed':
      return 'Datos detectados';
    case 'failed':
      return 'No se pudo leer';
    case 'reviewed':
      return 'Revisado por RH';
    default:
      return 'Sin analizar';
  }
}

/** true mientras el backend sigue trabajando — usado para decidir si hay que seguir haciendo polling (ver `useRhDocumentExtraction`). */
export function isExtractionInProgress(status: ExtractionStatus | string | undefined): boolean {
  return status === 'pending' || status === 'processing';
}

/**
 * Nivel de confianza legible. El backend real solo emite `'alta'`/`'media'`
 * como STRING (nunca un número 0-1) — un campo sin entrada en `confidence`
 * se trata como confianza baja, nunca como alta (AGENTS.md de este encargo,
 * sección 9: "0.97 → Confianza alta", adaptado al contrato real por string).
 */
export function confidenceLabelForLevel(level: ExtractionConfidenceLevel | undefined): string {
  if (level === 'alta') return 'Confianza alta';
  if (level === 'media') return 'Confianza media';
  return 'Confianza baja';
}

/** Etiqueta legible por campo detectado — el backend no manda un `label`, la app lo traduce aquí (único lugar). */
export const EXTRACTED_FIELD_LABELS: Record<ExtractedFieldKey, string> = {
  curp: 'CURP',
  rfc: 'RFC',
  nss: 'NSS',
  codigo_postal: 'Código postal',
  sexo: 'Sexo',
  fecha_nacimiento: 'Fecha de nacimiento',
};

export function extractedFieldLabel(field: string): string {
  return EXTRACTED_FIELD_LABELS[field as ExtractedFieldKey] ?? field;
}

/**
 * Solo estos 4 campos aceptan la acción "aplicar" (`CAMPOS_APLICABLES` del
 * backend) — `codigo_postal`/`sexo` se muestran como detectados pero sin
 * columna propia en `users`, nunca ofrecer "usar dato detectado" para ellos.
 */
export function isApplicableField(field: string): field is ExtractionApplicableField {
  return (CAMPOS_APLICABLES as readonly string[]).includes(field);
}

/**
 * `fecha_nacimiento` detectada puede llegar con separador `/`, `-` o `.`
 * (el regex del backend acepta los tres: `\d{2}[\/\-.]\d{2}[\/\-.]...`),
 * pero `POST .../extraccion/aplicar` valida estrictamente `date_format:d/m/Y`
 * — normaliza el separador a `/` antes de mandarlo para no fallar un 422
 * por un guión que el propio backend generó.
 */
export function normalizeFechaNacimientoParaAplicar(value: string): string {
  return value.replace(/[-.]/g, '/');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Nunca castear la respuesta HTTP a ciegas — valida el shape mínimo antes de tipificarlo. */
function normalizeDocumentExtraction(raw: unknown): DocumentExtraction | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'number' || typeof raw.status !== 'string') return null;

  return {
    id: raw.id,
    employee_document_id: typeof raw.employee_document_id === 'number' ? raw.employee_document_id : 0,
    user_id: typeof raw.user_id === 'number' ? raw.user_id : 0,
    status: raw.status as ExtractionStatus,
    extracted_data: isRecord(raw.extracted_data) ? (raw.extracted_data as DocumentExtraction['extracted_data']) : null,
    confidence: isRecord(raw.confidence) ? (raw.confidence as DocumentExtraction['confidence']) : null,
    differences: isRecord(raw.differences) ? (raw.differences as DocumentExtraction['differences']) : null,
    error_message: typeof raw.error_message === 'string' ? raw.error_message : null,
    reviewed_by_id: typeof raw.reviewed_by_id === 'number' ? raw.reviewed_by_id : null,
    reviewed_at: typeof raw.reviewed_at === 'string' ? raw.reviewed_at : null,
    // extracted_text deliberadamente NO se copia al objeto normalizado:
    // aunque el backend lo mande, la app nunca debe tener un camino fácil
    // para renderizarlo por accidente (sección 71).
  };
}

/**
 * `GET .../extraccion` responde siempre `200` con `{elegible, extraccion}`
 * — nunca tratar `data` directamente como una `DocumentExtraction`
 * (bug corregido: la auditoría anterior asumía un contrato plano
 * incorrecto). Defensivo ante cualquier forma inesperada: nunca truena,
 * cae en "no elegible" antes que asumir datos falsos.
 */
export function normalizeDocumentExtractionResponse(raw: unknown): DocumentExtractionResponse {
  if (!isRecord(raw)) return { elegible: false, extraccion: null };
  return {
    elegible: raw.elegible === true,
    extraccion: normalizeDocumentExtraction(raw.extraccion),
  };
}
