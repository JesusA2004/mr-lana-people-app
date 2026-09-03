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
