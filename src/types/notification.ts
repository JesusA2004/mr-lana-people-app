export interface NotificationItem {
  id: number | string;
  titulo?: string;
  mensaje?: string;
  leido?: boolean;
  leida?: boolean;
  fecha?: string;
  created_at?: string;
  [key: string]: unknown;
}
