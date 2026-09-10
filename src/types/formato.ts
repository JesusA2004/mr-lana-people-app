/**
 * Catálogo de formatos automáticos RH + descarga de lo ya generado — espejo
 * EXACTO de `App\Services\Formatos\FormatoCatalogoService::listar()` +
 * `App\Http\Controllers\Api\V1\Rh\FormatoController` en capacitaciones
 * (confirmado contra el código fuente real el 2026-09-10, commit
 * `34a8132`). El backend YA implementa catálogo + descarga (DOCX/PDF) —
 * auditoría anterior lo daba como gap completo, eso estaba desactualizado.
 * Generar un documento nuevo y su vista previa con variables faltantes
 * siguen solo en el panel web (`Rh\FormatoController` docblock: "requieren
 * un flujo de selección/edición más largo del que tiene sentido en la
 * app... aquí RH solo consulta el catálogo y descarga lo ya generado").
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
 * NO trae `clave`, `formatos_salida`, `variables_requeridas` ni
 * `acciones_permitidas` — esos campos eran parte de un contrato
 * especulativo de una auditoría anterior que nunca existió en el backend
 * real. `variables` son los placeholders detectados dentro del DOCX
 * (informativo, no hay UI de generación móvil hoy). El permiso que
 * controla ver el catálogo es `plantillas.ver` (autorización backend, no
 * algo que la app deba replicar).
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
// Contrato PROPUESTO para generación móvil — AÚN NO IMPLEMENTADO en el
// backend real (confirmado: no existen `preparar`/`generar`/`generados/
// {id}/preview` en `routes/api.php`). Se mantienen estos tipos y el wizard
// (`src/app/(app)/rh/formatos/generar.tsx`) preparados mas NO alcanzables
// desde ninguna navegación real de la app — ver `docs/BACKEND_GAPS_FINAL.md`.
// ---------------------------------------------------------------------------

export interface FormatoMissingField {
  field: string;
  label: string;
}

/**
 * Shape especulativa del formato dentro de `FormatoPreparation` — distinta
 * de `RhFormato` (el catálogo real) porque el contrato propuesto para
 * `preparar` incluye campos (`formatos_salida`) que el catálogo real nunca
 * mandó. Mantenida separada para no mezclar el contrato real con el
 * propuesto.
 */
export interface FormatoPreparationFormato {
  id: number;
  nombre: string;
  formatos_salida: FormatoOutput[];
}

export interface FormatoPreparation {
  formato: FormatoPreparationFormato;
  colaborador: {
    id: number;
    nombre: string;
    numero_empleado?: string | null;
  };
  valores: Record<string, string | null>;
  faltantes: FormatoMissingField[];
  puede_generar: boolean;
}

export type GeneratedDocumentAction = 'preview' | 'download' | (string & {});

export interface GeneratedDocument {
  documento_generado_id: number;
  nombre: string;
  filename: string;
  mime_type: string;
  created_at: string;
  preview_url?: string | null;
  download_url?: string | null;
  acciones_permitidas: GeneratedDocumentAction[];
}
