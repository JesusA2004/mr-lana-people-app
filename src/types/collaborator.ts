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
   * móvil (`GET /api/v1/colaborador/foto`, pendiente en backend — ver
   * docs/MOBILE_BACKEND_REQUIREMENTS.md P0.3). Es la fuente preferida: la
   * app la usa antes que `foto_url`.
   */
  foto_url_api?: string | null;
  puesto?: string | null;
  departamento?: string | null;
  sucursal?: string | null;
  empresa?: string | null;
  jefe_directo?: string | null;
  fecha_ingreso?: string | null;
  antiguedad_anios?: number;
  [key: string]: unknown;
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
