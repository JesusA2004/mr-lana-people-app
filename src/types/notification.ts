/**
 * `GET /api/v1/notificaciones` — contrato actual de
 * `App\Services\Colaboradores\NotificacionesService::aArray()`, re-auditado
 * el 2026-09-15. Novedades respecto a la sincronización anterior: `emoji`,
 * `color` (paleta cerrada), `created_at` y `data.{type,resource_id}` para
 * navegar nativamente en vez de depender de la `url` web.
 */

/**
 * Paleta CERRADA que manda el backend (`NotificacionesService::ESTILOS`).
 * Se traduce a tokens de diseño de la app en `src/utils/notificationStyle.ts`
 * — nunca se usa el hexadecimal del backend como autoridad visual.
 */
export type NotificationColor = 'success' | 'info' | 'warning' | 'danger' | 'celebracion' | 'neutral' | (string & {});

export interface NotificationItem {
  id: number | string;
  tipo?: string | null;
  /** Emoji ya resuelto por el backend — se pinta tal cual (sección 20/54). */
  emoji?: string;
  color?: NotificationColor;
  titulo?: string;
  mensaje?: string;
  /** Ruta WEB del portal, no de la app. Para navegar usa `data` (ver `notificationRoute`). */
  url?: string | null;
  leida?: boolean;
  /** Cadena ya formateada por el backend ("hace 2 horas"). */
  creada_en?: string;
  creada_en_iso?: string;
  created_at?: string;
  data?: {
    type?: string | null;
    resource_id?: string | number | null;
    /** Ciclo laboral (backend 2026-09-22): objeto relacionado y acción esperada. */
    related_type?: string | null;
    accion?: string | null;
    /** Avisos agregados (`rh_cumpleanos`): periodo a abrir cuando no hay id. */
    periodo?: string | null;
  } | null;
  [key: string]: unknown;
}
