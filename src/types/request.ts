/**
 * Contrato REAL de solicitudes unificadas, re-auditado contra el backend
 * actual (`capacitaciones/main`) el 2026-09-15:
 *
 * - `App\Enums\TipoSolicitudInterna` (17 casos)
 * - `App\Enums\EstadoSolicitudInterna` (8 estados + `puedeCancelarse()`)
 * - `App\Http\Resources\Api\V1\SolicitudInternaResource`
 * - `App\Http\Requests\Solicitudes\StoreSolicitudInternaRequest`
 * - `App\Services\Solicitudes\SolicitudesService::tiposConFormulario()`
 *
 * Ojo con los cambios respecto a la sincronización anterior (ver
 * `docs/BACKEND_SYNC_2026_09_15.md`):
 *   1. La clave del préstamo es `prestamo`, NO `prestamo_interno`; la
 *      genérica es `solicitud_general`, NO `general`.
 *   2. `GET /solicitudes/configuracion` devuelve `{ tipos: [...] }`, no
 *      `{ data: [...] }`, y cada tipo usa `requiere_*`/`permite_adjuntos`/
 *      `campos[]` — el contrato viejo (`requires_dates`/`allows_attachments`/
 *      `attachment_required`) nunca existió en este backend.
 *
 * Sincronización 2026-09-15 (backend a1e8546): el backend ahora puede
 * generar automáticamente un "documento oficial" al aprobar una solicitud
 * (`config/solicitudes.php` + `App\Services\Solicitudes\
 * SolicitudFormatoOficialService`), para vacaciones/permisos/préstamo/baja.
 * El endpoint móvil `Api\V1\SolicitudController` (colaborador) NO cambió —
 * sigue sin serializar nada de esto. Los tipos de abajo
 * (`SolicitudDocumentoGenerado`/`SolicitudFormatoOficial`) son PREPARACIÓN
 * forward-compatible: opcionales, y la UI que los consume solo se dibuja
 * si el backend algún día los manda de verdad (ver
 * `SolicitudFormatoOficialCard` en la pantalla de detalle).
 */

/** Claves exactas de `App\Enums\TipoSolicitudInterna`. */
export const REQUEST_TYPES = [
  'permiso',
  'vacaciones',
  'permiso_con_goce',
  'permiso_sin_goce',
  'permiso_tiempo',
  'salida_temprano',
  'llegada_tarde',
  'incapacidad',
  'constancia_laboral',
  'actualizacion_datos',
  'actualizacion_bancaria',
  'reposicion_documental',
  'prestamo',
  'baja_colaborador',
  'permiso_especial_cumpleanos',
  'permiso_especial_paternidad',
  'permiso_especial_fallecimiento',
  'solicitud_general',
] as const;

export type KnownRequestType = (typeof REQUEST_TYPES)[number];
/** Un tipo nuevo del backend nunca debe romper la app: se acepta cualquier string. */
export type RequestType = KnownRequestType | (string & {});

/** Claves exactas de `App\Enums\EstadoSolicitudInterna`. */
export const REQUEST_STATUSES = [
  'creada',
  'enviada',
  'en_revision',
  'aprobada',
  'rechazada',
  'requiere_correccion',
  'cancelada',
] as const;

export type KnownRequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestStatus = KnownRequestStatus | (string & {});

/**
 * Estados finales (`EstadoSolicitudInterna::esFinal()`): ya no admiten
 * transiciones ni ediciones.
 */
export const FINAL_REQUEST_STATUSES: readonly RequestStatus[] = ['aprobada', 'rechazada', 'cancelada'];

/**
 * Estados en los que el colaborador puede cancelar su propia solicitud —
 * copia exacta de `EstadoSolicitudInterna::puedeCancelarse()`, que es lo
 * que aplica `SolicitudInternaPolicy::cancelar()`. El backend sigue siendo
 * la autoridad (responde 403 si no procede); esto solo evita mostrar un
 * botón que de todos modos fallaría. Cuando el Resource empiece a mandar
 * `acciones_permitidas` para el colaborador, ese campo debe ganarle a esta
 * lista (ver `canCancelSolicitud`).
 */
export const CANCELABLE_REQUEST_STATUSES: readonly RequestStatus[] = [
  'creada',
  'enviada',
  'en_revision',
  'requiere_correccion',
];

/** Tipo de control que el backend pide para un campo de `campos[]`. */
export type SolicitudCampoTipo = 'text' | 'date' | 'dates' | 'number' | 'select' | 'opciones' | 'time' | (string & {});

/** Opción de un campo `opciones` (ej. modalidad, goce y causal del permiso oficial). */
export interface SolicitudCampoOpcion {
  value: string;
  label: string;
}

/** El campo solo se muestra (y se envía) si `campo` vale alguno de `valores`. */
export interface SolicitudCampoCondicion {
  campo: string;
  valores: string[];
}

/** Cómo captura fechas cada tipo (backend App\Enums\ModoFechasSolicitud). */
export type ModoFechasSolicitud = 'duracion' | 'dias_especificos' | 'horario' | 'fecha_unica' | 'ninguna';

/** Un elemento de `campos[]` en `GET /solicitudes/configuracion`. */
export interface SolicitudCampo {
  name: string;
  type: SolicitudCampoTipo;
  required: boolean;
  /** Etiqueta, ayuda y límites que manda el backend (si no, la app usa su propia redacción). */
  label?: string;
  ayuda?: string;
  min?: number;
  max?: number;
  /** Solo `opciones`: valores permitidos con su etiqueta. */
  opciones?: SolicitudCampoOpcion[];
  /** Campo condicional (ej. la causal solo en un permiso especial). */
  mostrar_si?: SolicitudCampoCondicion;
}

/**
 * Un tipo del catálogo `GET /api/v1/solicitudes/configuracion`, tal cual lo
 * serializa `SolicitudesService::tiposConFormulario()`.
 */
export interface SolicitudTipoConfig {
  clave: RequestType;
  nombre: string;
  /** duracion: inicio + días naturales (el backend calcula la fecha fin). dias_especificos: vacaciones por días elegidos. */
  modo_fechas: ModoFechasSolicitud;
  /** Vacaciones: días de la semana que no se pueden elegir (0 = domingo). */
  dias_no_seleccionables: number[];
  requiere_fechas: boolean;
  requiere_horario: boolean;
  requiere_dias: boolean;
  requiere_monto: boolean;
  requiere_colaborador_objetivo: boolean;
  requiere_motivo: boolean;
  permite_adjuntos: boolean;
  campos: SolicitudCampo[];
}

/**
 * Ciclo de vida de un documento/formato oficial generado a partir de una
 * solicitud — espejo conceptual de `App\Enums\EstadoFormatoOficialGeneracion`
 * (hoy solo `generado`/`firmado` en el backend) más los estados que la UI
 * necesita distinguir aunque el backend aún no los nombre así
 * (`no_generado` es simplemente la ausencia del recurso; `pendiente_de_firma`
 * es "generado y requiere firma pero aún no llega"; `error` es una falla de
 * generación que el backend registra en log pero todavía no expone).
 */
export type DocumentoOficialStatus =
  | 'no_generado'
  | 'generado'
  | 'pendiente_de_firma'
  | 'firmado'
  | 'error'
  | (string & {});

/**
 * PREPARACIÓN, no contrato confirmado: forma recomendada para un documento
 * generado por una solicitud (sección 3 del encargo 2026-09-15). El Resource
 * móvil del colaborador NO manda esto hoy — declarado opcional a propósito.
 */
export interface SolicitudDocumentoGenerado {
  id: number | string;
  tipo?: string;
  nombre: string;
  status: DocumentoOficialStatus;
  requiere_firma: boolean;
  firmado: boolean;
  /** Ruta relativa a la API para abrir en `SecureDocumentViewer` — nunca una URL absoluta con el disco NAS expuesto. */
  ver_url?: string | null;
}

/**
 * PREPARACIÓN, no contrato confirmado: espejo de
 * `App\Models\OfficialFormatGeneration` para cuando el backend lo exponga
 * en el Resource del colaborador (hoy solo existe en el detalle web de RH,
 * ver `Rh\SolicitudController::show()`).
 */
export interface SolicitudFormatoOficial {
  id: number | string;
  slug: string;
  estado: DocumentoOficialStatus;
  requiere_firma: boolean;
  firmado_at?: string | null;
}

/** Un archivo que el colaborador adjuntó a su solicitud — ver gap D-1. */
export interface SolicitudAdjunto {
  id: number | string;
  nombre: string;
}

/** Una entrada de la bitácora de una solicitud — ver gap D-1. */
export interface SolicitudHistorialEntrada {
  accion: string;
  /** Texto en español que manda el backend (no se traduce aquí). */
  accion_etiqueta?: string;
  comentario?: string | null;
  usuario?: string | null;
  fecha: string;
}

/**
 * `App\Http\Resources\Api\V1\SolicitudInternaResource` — 13 campos
 * confirmados. El Resource NO serializa adjuntos, historial, documentos
 * generados ni formatos oficiales todavía (aunque `SolicitudController::
 * show()` cargue `documentos`/`historial` en memoria): ver gap D-1 en
 * `docs/BACKEND_SYNC_2026_09_15.md`. Todos los campos de abajo son
 * opcionales EXACTAMENTE por eso — la UI que los usa está protegida por su
 * presencia real (`if (solicitud.documentos_generados?.length)`), nunca se
 * asume que existan.
 */
/** Etapa del seguimiento de un préstamo (`PrestamoSeguimientoService`). */
export interface SolicitudPrestamoEtapa {
  clave: 'solicitud' | 'visto_bueno' | 'autorizacion' | 'firma' | (string & {});
  etiqueta: string;
  estado: 'hecho' | 'actual' | 'pendiente' | 'rechazado' | (string & {});
  /** Quién decidió este nivel (o quién puede decidirlo si sigue pendiente). */
  aprobador?: string | null;
}

/** Bloque `prestamo` que el backend agrega a una solicitud de préstamo del colaborador. */
export interface SolicitudPrestamoSeguimiento {
  monto_solicitado: number | null;
  prestamo_id: number | null;
  monto_autorizado: number | null;
  etapas: SolicitudPrestamoEtapa[];
}

export interface Solicitud {
  id: number | string;
  folio?: string;
  tipo?: RequestType;
  tipo_etiqueta?: string;
  estado?: RequestStatus;
  estado_etiqueta?: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  /** Cómo se capturaron las fechas (duración natural, días específicos…). */
  modo_fechas?: ModoFechasSolicitud;
  /** Duración en días naturales o cuántos días de vacaciones. */
  dias_solicitados?: number | null;
  /** Vacaciones: días específicos elegidos (fuente real). */
  dias?: string[];
  motivo?: string;
  observaciones?: string | null;
  motivo_rechazo?: string | null;
  revisado_en?: string | null;
  creada_en?: string;
  /**
   * Todavía no lo manda el Resource del colaborador; se declara opcional
   * para que el día que el backend lo agregue la app ya lo prefiera por
   * encima de `CANCELABLE_REQUEST_STATUSES` sin cambiar una línea.
   */
  acciones_permitidas?: string[];
  /** Gap D-1: no viene del Resource actual, preparado para cuando exista. */
  adjuntos?: SolicitudAdjunto[];
  /** Gap D-1: no viene del Resource actual, preparado para cuando exista. */
  historial?: SolicitudHistorialEntrada[];
  /** Sección 2/3 del encargo 2026-09-15: preparación, ver `SolicitudDocumentoGenerado`. */
  documentos_generados?: SolicitudDocumentoGenerado[];
  /** Sección 2/3 del encargo 2026-09-15: preparación, ver `SolicitudFormatoOficial`. */
  formatos_oficiales?: SolicitudFormatoOficial[];
  /** Solo en préstamos: monto pedido y avance (visto bueno → RH → firma). */
  prestamo?: SolicitudPrestamoSeguimiento | null;
  /** Solo en permisos: modalidad, goce, causal y si RH ya lo autorizó. */
  permiso?: SolicitudPermisoResumen | null;
  /** Ruta del formato oficial de permiso; solo responde cuando RH ya lo autorizó. */
  permiso_pdf?: string | null;
  [key: string]: unknown;
}

/** `SolicitudesService::resumenPermiso()` — Formato de Permiso oficial. */
export interface SolicitudPermisoResumen {
  tipo: string | null;
  tipo_etiqueta: string | null;
  goce: string | null;
  goce_etiqueta: string | null;
  causal: string | null;
  causal_etiqueta: string | null;
  hora_salida: string | null;
  hora_entrada: string | null;
  dias: number | null;
  autorizado_por_rh: boolean;
  autorizado_por: string | null;
  autorizado_en: string | null;
  pdf_disponible: boolean;
}

/**
 * Tipos que el backend puede generar un documento oficial automático para
 * ellos al aprobar (espejo LITERAL de las claves en `config/solicitudes.php`,
 * confirmado contra `capacitaciones@a1e8546`). Usado solo para decidir si
 * vale la pena preguntar por `documentos_generados`/`formatos_oficiales` —
 * nunca para inventar un documento que no llegó.
 */
export const REQUEST_TYPES_WITH_OFFICIAL_FORMAT: readonly KnownRequestType[] = [
  'permiso',
  'vacaciones',
  'permiso_con_goce',
  'permiso_sin_goce',
  'permiso_tiempo',
  'salida_temprano',
  'llegada_tarde',
  'prestamo',
  'baja_colaborador',
];

/**
 * Payload de `POST /api/v1/solicitudes` — unión de todo lo que valida
 * `StoreSolicitudInternaRequest`. Solo se envían las claves que el tipo
 * elegido realmente pide (ver `buildCreatePayload`).
 */
export interface CreateSolicitudPayload {
  tipo: RequestType;
  motivo: string;
  observaciones?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  dias_solicitados?: number;
  /** Incapacidad/permisos por días: número de días naturales (el backend calcula la fecha fin). */
  duracion_dias?: number;
  /** Vacaciones: días específicos `YYYY-MM-DD` (sin domingos). */
  dias?: string[];
  monto_solicitado?: number;
  [key: string]: unknown;
}

/**
 * `POST /api/v1/solicitudes/{id}/adjuntos` responde 201 con SOLO un
 * mensaje — nunca un objeto adjunto con `id`. Bug de contrato corregido en
 * esta sincronización (ver `docs/BACKEND_SYNC_2026_09_15.md`, bug B-2).
 */
export interface SolicitudAdjuntoRespuesta {
  message?: string;
}

/** `POST /api/v1/solicitudes/{id}/cancelar` → `{ message, data: SolicitudInternaResource }`. */
export interface CancelSolicitudRespuesta {
  message?: string;
  data?: Solicitud;
}

/**
 * ¿Se puede ofrecer "Cancelar solicitud"? El backend manda (403/422 si no);
 * si algún día serializa `acciones_permitidas` para el colaborador, ese
 * campo es la autoridad y esta función lo respeta automáticamente.
 */
export function canCancelSolicitud(solicitud: Pick<Solicitud, 'estado' | 'acciones_permitidas'> | undefined): boolean {
  if (!solicitud) return false;
  if (Array.isArray(solicitud.acciones_permitidas)) return solicitud.acciones_permitidas.includes('cancelar');
  return CANCELABLE_REQUEST_STATUSES.includes(solicitud.estado ?? '');
}
