import type { MobileBootstrapCapabilities, MobileBootstrapFeatures } from '@/types/mobileBootstrap';

/**
 * Única función que decide si la app ofrece la experiencia "Gestión RH"
 * (selector, switcher, tabs RH). Nunca por nombre de rol (AGENTS.md sección
 * 2/59): requiere TANTO el permiso real (`capabilities.rh`, calculado en
 * backend a partir de Spatie) COMO el feature flag remoto
 * (`features.rh_mobile`) — así RH puede apagar la experiencia móvil
 * completa sin tocar permisos de nadie.
 */
export function canUseRhExperience(capabilities: MobileBootstrapCapabilities, features: MobileBootstrapFeatures): boolean {
  return capabilities.rh === true && features.rh_mobile === true;
}

/**
 * Permiso real (Spatie, `mobile/bootstrap` → `user.permissions`) — usado
 * donde el backend NO manda `acciones_permitidas` en el recurso (ej.
 * `rh/expedientes`, ver `database/seeders/RolesYPermisosSeeder.php` bloque
 * "Backend movil v5"). Sigue sin ser un `if role === "rh_admin"`: se
 * pregunta por el permiso exacto, nunca por el nombre del rol.
 */
export function hasPermission(permissions: string[] | undefined, permission: string): boolean {
  return Array.isArray(permissions) && permissions.includes(permission);
}

/**
 * Contrato FÍSICO de cierre/documentos interpretado desde `features` del
 * bootstrap. El backend es la autoridad; esto solo traduce los flags a algo
 * tipado y, cuando el backend aún no los manda, aplica defaults SEGUROS
 * alineados con el contrato (flujo físico nuevo, firma autógrafa, sin
 * escaneos, recibos impresos). Igual que el resto de capabilities: nunca se
 * deduce nada por nombre de rol.
 */
export interface DocumentFlowCapabilities {
  /** 2 = flujo físico nuevo (impresión + firma autógrafa, sin envío/escaneo). Default: 2. */
  documentFlow: number;
  /** El finiquito se firma en papel; PEOPLE registra quién/cuándo (sin archivo). Default: true. */
  finiquitoFirmaFisica: boolean;
  /** Si false, NINGUNA pantalla ofrece subir el escaneo de un documento firmado. Default: false. */
  subidaEscaneoFirmado: boolean;
  /** Recibos de nómina en la app (hoy se entregan impresos). Default: false. */
  recibos: boolean;
}

export function resolveDocumentCapabilities(features: MobileBootstrapFeatures | null | undefined): DocumentFlowCapabilities {
  const flujo = features?.document_flow;
  return {
    documentFlow: typeof flujo === 'number' ? flujo : 2,
    // Ausente/undefined ⇒ true (flujo físico vigente): solo un false explícito lo apaga.
    finiquitoFirmaFisica: features?.finiquito_firma_fisica !== false,
    // Ausente/undefined ⇒ false (fail-closed): solo un true explícito habilita la subida.
    subidaEscaneoFirmado: features?.subida_escaneo_firmado === true,
    recibos: features?.recibos === true,
  };
}
