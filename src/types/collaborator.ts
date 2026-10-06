/**
 * Confirmado contra backend real (App\Services\Colaboradores\ColaboradorPerfilService,
 * ver capacitaciones/docs/API_MOVIL.md). `dashboard()` NO aplana los campos del
 * colaborador: los anida bajo `perfil`, y agrupa vacaciones/notificaciones en
 * sus propias llaves. Se conserva `[key: string]: unknown` por si el backend
 * agrega campos nuevos sin romper tipos.
 */
export interface CollaboratorProfile {
  id?: number | string;
  nombre?: string;
  apellidos?: string;
  nombre_completo?: string;
  correo?: string;
  numero_empleado?: string;
  /**
   * Ruta protegida por sesión web (`rh.expedientes.foto`), NO por Bearer
   * token: un cliente 100% nativo no puede cargarla directamente todavía.
   * El componente Avatar cae a iniciales si la carga falla, así que exponer
   * este campo tal cual es seguro aunque hoy casi siempre falle.
   */
  foto_url?: string | null;
  /**
   * URL de la foto autenticable con el mismo Bearer token de la sesión
   * móvil — `GET /api/v1/colaborador/foto` (streaming, backend móvil v5).
   * `ProfileAvatar` la usa como fuente preferida, antes que `foto_url`
   * (heredado, protegido por sesión web).
   */
  foto_url_api?: string | null;
  /** Estado de la foto (primera foto directa; cambios con aprobación de RH). */
  foto?: FotoPerfilEstado | null;
  puesto?: string | null;
  departamento?: string | null;
  sucursal?: string | null;
  empresa?: string | null;
  jefe_directo?: string | null;
  fecha_ingreso?: string | null;
  antiguedad_anios?: number;
  /** Qué le falta para que PEOPLE pueda generarle documentos (App\Services\DocumentosMaestros\DocumentoProcesoService::completitudAlta). Solo lectura: el colaborador nunca edita el cálculo. */
  completitud_datos?: CompletitudDatos;
  [key: string]: unknown;
}

export interface CompletitudDatos {
  aplica: boolean;
  porcentaje: number;
  total: number;
  completos: number;
  grupos: Record<string, { etiqueta: string; ok: boolean; faltantes: string[] }>;
  faltantes: { etiqueta: string; columna: string; documentos: string[] }[];
}

export interface DashboardVacacionesResumen {
  antiguedad_anios?: number;
  vigencia_inicio?: string | null;
  vigencia_fin?: string | null;
  dias_generados?: number;
  dias_usados?: number;
  dias_en_solicitud?: number;
  dias_disponibles?: number;
  [key: string]: unknown;
}

export interface DashboardNotificacionItem {
  id: string | number;
  tipo?: string | null;
  titulo?: string;
  mensaje?: string;
  url?: string | null;
  leida?: boolean;
  creada_en?: string;
  creada_en_iso?: string;
  [key: string]: unknown;
}

export interface DashboardNotificacionesResumen {
  no_leidas?: number;
  recientes?: DashboardNotificacionItem[];
}

export interface DashboardData {
  perfil?: CollaboratorProfile;
  vacaciones?: DashboardVacacionesResumen;
  solicitudes_recientes?: unknown[];
  notificaciones?: DashboardNotificacionesResumen;
  [key: string]: unknown;
}

/**
 * Estado de la foto de perfil (backend: FotoColaboradorService::estadoPara).
 * - sin_foto: la primera que suba queda oficial al instante.
 * - oficial: un cambio nuevo queda PENDIENTE de RH; la actual sigue visible.
 * - cambio_pendiente: ya hay una propuesta esperando a RH (no se envía otra).
 */
export interface FotoPerfilEstado {
  estado: 'sin_foto' | 'oficial' | 'cambio_pendiente';
  etiqueta: string;
  foto_url: string | null;
  puede_subir_directo: boolean;
  pendiente: { id: number; solicitada_en: string; foto_url: string } | null;
  ultimo_cambio: {
    id: number;
    estado: 'aprobado' | 'rechazado';
    etiqueta: string;
    motivo_rechazo: string | null;
    revisado_en: string | null;
  } | null;
}

export interface SubirFotoRespuesta {
  message: string;
  resultado: 'oficial' | 'pendiente';
  foto_url: string | null;
  foto: FotoPerfilEstado;
}
