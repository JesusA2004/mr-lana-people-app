/**
 * Extracción automática de datos personales de un documento (OCR) — espejo
 * EXACTO de `App\Models\DocumentExtraction` + `App\Enums\EstadoExtraccion` +
 * `App\Http\Controllers\Api\V1\Rh\DocumentoController::extraccion()` en
 * capacitaciones (confirmado contra el código fuente real el 2026-09-10,
 * commit `34a8132`). El backend YA implementa este módulo — auditoría
 * anterior lo daba como gap completo, eso estaba desactualizado.
 *
 * MUY IMPORTANTE: OCR nunca aprueba/rechaza un documento ni cambia el
 * perfil del colaborador por su cuenta — solo `aplicar()` lo hace, y solo
 * con los campos que RH decide explícitamente aceptar. RH sigue siendo
 * quien aprueba/rechaza el documento (ver `acciones_permitidas` de
 * `RhDocumento`, recurso separado).
 */

export type ExtractionStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'reviewed';

/**
 * El backend real solo emite `'alta'` o `'media'` (ver
 * `RegexPersonalDataExtractor::extraer()`) — nunca `'baja'` ni un número.
 * Un campo detectado sin nivel de confianza en el payload se trata como
 * confianza baja en la UI (ver `confidenceLabelForLevel`), nunca como alta.
 */
export type ExtractionConfidenceLevel = 'alta' | 'media' | (string & {});

/**
 * Únicos campos que el regex extractor puede llegar a detectar
 * (`RegexPersonalDataExtractor`). `codigo_postal`/`sexo` se detectan pero
 * NO tienen columna propia en `users` — el backend los deja fuera de
 * `CAMPOS_APLICABLES`, así que nunca aceptan la acción "aplicar" aunque se
 * muestren como detectados.
 */
export type ExtractedFieldKey = 'curp' | 'rfc' | 'nss' | 'codigo_postal' | 'sexo' | 'fecha_nacimiento';

/** `extracted_data` — solo trae las claves que sí se detectaron; nunca las seis siempre presentes. */
export type ExtractedFields = Partial<Record<ExtractedFieldKey, string>>;

/** `confidence` — mismas claves que `extracted_data`, nivel de confianza por campo. */
export type ExtractionConfidenceByField = Partial<Record<ExtractedFieldKey, ExtractionConfidenceLevel>>;

/**
 * Una entrada de `differences` (diccionario, NO arreglo — clave = nombre
 * del campo). `actual` es `null` cuando el colaborador no tiene ese dato
 * capturado todavía. `coincide` ya viene calculado por el backend
 * (`DocumentExtractionService::calcularDiferencias()`) — la app nunca
 * recalcula la comparación por su cuenta.
 */
export interface ExtractionFieldDifference {
  detectado: string;
  actual: string | null;
  coincide: boolean;
}

/** `differences` — un diccionario con una entrada por cada campo detectado (coincida o no), nunca un arreglo. */
export type ExtractionDifferences = Partial<Record<ExtractedFieldKey, ExtractionFieldDifference>>;

export interface DocumentExtraction {
  id: number;
  employee_document_id: number;
  user_id: number;
  status: ExtractionStatus;
  /**
   * El backend real NO oculta `extracted_text` en el modelo (sin `$hidden`)
   * — viaja en el JSON hasta 20,000 caracteres. La app JAMÁS debe
   * renderizarlo ni loguearlo (AGENTS.md de este encargo, sección 71: "no
   * mostrar raw extracted_text... preferir extracted_data estructurado") —
   * se declara aquí solo para que el normalizador no lo pierda por error si
   * algún día se necesita para depuración interna, nunca para pintarlo en
   * pantalla. Ver `docs/BACKEND_GAPS_FINAL.md`.
   */
  extracted_text?: string | null;
  extracted_data: ExtractedFields | null;
  confidence: ExtractionConfidenceByField | null;
  differences: ExtractionDifferences | null;
  error_message: string | null;
  reviewed_by_id: number | null;
  reviewed_at: string | null;
}

/**
 * `GET /rh/documentos/{documento}/extraccion` responde SIEMPRE `200` con
 * este wrapper — nunca 404 por no tener extracción todavía.
 * `elegible: false` = el tipo de documento no admite extracción automática
 * (ver `DocumentExtractionService::TIPOS_ELEGIBLES`), la sección de
 * análisis automático NUNCA debe mostrarse en ese caso. `elegible: true` +
 * `extraccion: null` = el documento SÍ es elegible pero el job en cola
 * todavía no corrió (worker caído o apenas encolado) — mostrar "Pendiente
 * de análisis", no un error.
 */
export interface DocumentExtractionResponse {
  elegible: boolean;
  extraccion: DocumentExtraction | null;
}

/**
 * Campos que el backend realmente acepta en `POST .../extraccion/aplicar`
 * (`DocumentExtractionService::CAMPOS_APLICABLES` + las reglas de
 * `AplicarExtraccionRequest`/`DocumentoController::aplicarExtraccion`):
 * `curp` (máx 18), `rfc` (máx 13), `nss` (máx 11), `fecha_nacimiento`
 * (formato exacto `d/m/Y`). Mandar cualquier otra clave (`codigo_postal`,
 * `sexo`) no truena la request pero el backend la ignora en silencio — la
 * UI nunca debe ofrecer "aplicar" para esos dos campos.
 */
export const CAMPOS_APLICABLES: readonly ExtractedFieldKey[] = ['curp', 'rfc', 'nss', 'fecha_nacimiento'];

export type ExtractionApplicableField = 'curp' | 'rfc' | 'nss' | 'fecha_nacimiento';
