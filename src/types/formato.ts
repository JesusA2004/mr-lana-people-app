/**
 * Catálogo de formatos automáticos RH, generación y descarga — espejo de
 * `App\Http\Controllers\Api\V1\Rh\FormatoController` (motor DOCX,
 * `App\Services\Plantillas\*`/`App\Services\Formatos\FormatoPreviewService`).
 * Catálogo, preparar, generar y descarga (DOCX/PDF) ya están implementados
 * en el backend real; administrar plantillas (subir DOCX, mapear variables,
 * versionar) se queda en Portal RH — ver docs/PLANTILLAS_FORMATOS.md.
 */

export type FormatoOutput = 'pdf' | 'docx';

/**
 * Valores reales de `App\Enums\TipoPlantillaDocumento` — closed set con
 * passthrough para forward-compat si el backend agrega un tipo nuevo. La
 * app nunca decide el texto a mostrar por este valor: siempre usa
 * `tipo_etiqueta`, que ya viene traducido desde el backend.
 */
export type FormatoTipo =
  | 'contrato'
  | 'aviso_privacidad'
  | 'consentimiento_datos'
  | 'carta_confidencialidad'
  | 'formato_permiso'
  | 'formato_vacaciones'
  | 'formato_incapacidad'
  | 'formato_alta'
  | 'formato_baja'
  | 'constancia_laboral'
  | 'actualizacion_datos'
  | 'reposicion_documental'
  | 'solicitud_general'
  | 'resguardo'
  | 'acuse'
  | 'otro'
  | (string & {});

/**
 * Entrada real de `GET /rh/formatos` (`FormatoCatalogoService::listar()`).
 * `variables` son los placeholders {{...}} detectados dentro del DOCX
 * (informativo). El permiso que controla ver el catálogo es
 * `plantillas.ver`, y generar un documento nuevo `plantillas.generar`
 * (autorización backend, no algo que la app deba replicar).
 */
export interface RhFormato {
  id: number;
  nombre: string;
  tipo: FormatoTipo;
  tipo_etiqueta: string;
  descripcion: string | null;
  variables: string[];
  veces_generado: number;
  ultimo_uso: string | null;
}

// ---------------------------------------------------------------------------
// `POST /rh/formatos/{plantilla}/preparar` y `.../generar` — implementados
// en `App\Http\Controllers\Api\V1\Rh\FormatoController` reutilizando
// `App\Services\Formatos\FormatoPreviewService`/`VariableMappingService`
// (el mismo motor que ya usa el panel web, ver docs/PLANTILLAS_FORMATOS.md).
// Misma convención de nombres que el motor de formatos oficiales
// (`types/formatoOficial.ts`: `puede_generar`, `faltantes`, `manuales`,
// `datos`) para que ambos sistemas se lean igual desde la app, aunque son
// motores distintos.
// ---------------------------------------------------------------------------

/** Variable conocida (dato real del colaborador/candidato) ya resuelta. */
export interface FormatoDato {
  clave: string;
  etiqueta: string;
  valor: string;
}

/**
 * Variable conocida (automática) que resolvió vacío. Por default es solo
 * informativo, pero si RH la marcó requerida en Portal RH → Formatos →
 * Variables (ej. {{curp}}), `requerido: true` SÍ bloquea `puede_generar` —
 * ver `App\Services\Formatos\FormatoPreviewService`.
 */
export interface FormatoFaltante {
  variable: string;
  etiqueta: string;
  requerido: boolean;
}

/**
 * Variable manual declarada por RH en Portal RH → Formatos → Plantillas
 * avanzadas → "Variables" (no corresponde a ningún dato real). `valor` trae
 * el valor por defecto configurado, si existe.
 */
export interface FormatoVariableManual {
  clave: string;
  etiqueta: string;
  descripcion: string | null;
  tipo: 'text' | 'textarea' | 'date' | 'number' | 'currency' | 'select';
  requerido: boolean;
  valor: string;
  opciones: string[] | null;
}

export interface FormatoPreparation {
  plantilla: { id: number; nombre: string };
  sujeto: { id: number; nombre: string };
  datos: FormatoDato[];
  faltantes: FormatoFaltante[];
  manuales: FormatoVariableManual[];
  /** false si falta una variable manual requerida O una automática que RH marcó requerida — usar este campo, no recalcular en el cliente. */
  puede_generar: boolean;
  output_available: { docx: true; pdf: boolean };
}

export type GeneratedDocumentAction = 'preview' | 'download' | (string & {});

export interface GeneratedDocument {
  documento_generado_id: number;
  nombre: string;
  filename: string;
  mime_type: string;
  created_at: string;
  acciones_permitidas: GeneratedDocumentAction[];
}
