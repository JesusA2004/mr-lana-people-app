/**
 * Formatos oficiales (PDF fijo + overlay de datos) — espejo de
 * `App\Http\Controllers\Api\V1\Rh\FormatoOficialController` en
 * `capacitaciones@cc4beeb` (ver `docs/FORMATOS_OFICIALES.md` — el propio
 * controlador confirma que SÍ hay API móvil, aunque ese doc todavía diga
 * "fuera de alcance"). Sistema DISTINTO del motor DOCX legacy
 * (`src/api/rh/formatos.ts`, `rh/formatos/*`), que sigue existiendo aparte.
 *
 * RH móvil es solo CONSUMIDOR: navega catálogo, genera para un colaborador
 * y ve/descarga el resultado. Administrar plantillas (subir PDF, configurar
 * coordenadas del overlay, versionar) se queda en el Portal RH — mismo
 * criterio que Vacantes (`docs/HEADCOUNT_Y_VACANTES.md`).
 */
export interface OfficialFormatVersionResumen {
  id: number;
  numero: number;
  publicada_en: string | null;
  fidelidad: string | null;
  campos: number;
}

export interface OfficialFormatItem {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  tipo_etiqueta: string;
  /** `colaborador` | `candidato` | `ambos` — a quién puede aplicarse. */
  aplica_a: string;
  empresa?: string | null;
  file_type: string;
  /** `OfficialFormat::tieneConfiguracion()` — false = "Falta configurar" (RH ve el badge, no debe intentar generar). */
  lista: boolean;
  archivado: boolean;
  version_vigente: OfficialFormatVersionResumen | null;
}

export interface OfficialFormatFaltante {
  variable: string;
  etiqueta: string;
  /** Ruta WEB para completarlo en el expediente — no navegable desde la app; se muestra solo como texto informativo. */
  completar_url: string | null;
}

export interface OfficialFormatManual {
  clave: string;
  etiqueta: string;
  requerido: boolean;
  /** Valor ya capturado si se está reintentando `preparar()` con `manuales` previos. */
  valor: string;
}

export interface OfficialFormatDato {
  etiqueta: string;
  valor: string;
}

/** `POST {formato}/preparar` o `/vista-previa` — nunca pide un dato que el backend ya puede resolver solo. */
export interface OfficialFormatPreparacion {
  version: number;
  puede_generar: boolean;
  motivo: string | null;
  faltantes: OfficialFormatFaltante[];
  manuales: OfficialFormatManual[];
  contextos_faltantes: string[];
  datos: OfficialFormatDato[];
  puede_guardar_en_expediente: boolean;
}

export interface OfficialFormatGeneracion {
  id: number;
  formato_id: number;
  formato: string;
  categoria: string;
  version: number;
  persona: string | null;
  tipo_persona: 'colaborador' | 'candidato';
  colaborador_id: number | null;
  solicitud_folio: string | null;
  generado_por: string | null;
  generado_en: string | null;
  estado: string;
  en_expediente: boolean;
  checksum: string | null;
  [key: string]: unknown;
}

export interface GenerarFormatoOficialPayload {
  tipo_sujeto: 'colaborador' | 'candidato';
  sujeto_id: number;
  manuales?: Record<string, string>;
  guardar_en_expediente?: boolean;
}
