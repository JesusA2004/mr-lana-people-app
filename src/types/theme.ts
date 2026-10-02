/**
 * Tema institucional dinámico (`GET /api/v1/app/theme`, Administración →
 * Configuración → Apariencia). Claves `tema` reales de
 * `config/configuracion_sistema.php` → `apariencia.*` (backend
 * `ConfiguracionSistemaService::tema()`).
 */
export interface AppThemeColors {
  primary?: string;
  primaryAlt?: string;
  success?: string;
  deepGreen?: string;
  secondary?: string;
  gold?: string;
  goldDark?: string;
  muted?: string;
  navy?: string;
  accent?: string;
  danger?: string;
  background?: string;
  surface?: string;
}

export interface AppTheme {
  colors: AppThemeColors;
  /** Huella del tema: cambia solo si algún color cambió (para repintar solo cuando aplica). */
  version: string | null;
}
