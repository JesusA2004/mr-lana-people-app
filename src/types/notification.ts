/**
 * Confirmado contra backend real (App\Services\Colaboradores\NotificacionesService).
 * El campo de "leída" es `leida` (no `leido`); `tipo` y `url` permiten
 * navegar al recurso relacionado cuando el backend los provee.
 */
export interface NotificationItem {
  id: number | string;
  tipo?: string | null;
  titulo?: string;
  mensaje?: string;
  url?: string | null;
  leida?: boolean;
  creada_en?: string;
  creada_en_iso?: string;
  [key: string]: unknown;
}
