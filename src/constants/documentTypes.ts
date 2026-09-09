import type { Ionicons } from '@expo/vector-icons';

import { Colors } from './colors';

export interface DocumentTypeMeta {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
}

/**
 * Ícono + color por tipo de documento — espejo exacto de las claves reales
 * de `database/seeders/DocumentTypeSeeder.php` en capacitaciones (mismos 19
 * `clave` que el backend siembra hoy). Puramente visual: identifica de un
 * vistazo qué documento es cada tarjeta, no reemplaza `DocumentStatusBadge`
 * (que indica el estado). `otro`/cualquier clave futura cae al genérico.
 */
export const DOCUMENT_TYPE_META: Record<string, DocumentTypeMeta> = {
  ine: { icon: 'card-outline', color: Colors.primaryDark, background: Colors.primarySoft },
  curp: { icon: 'finger-print-outline', color: Colors.primaryDark, background: Colors.primarySoft },
  rfc: { icon: 'receipt-outline', color: Colors.info, background: Colors.infoSoft },
  nss: { icon: 'medkit-outline', color: Colors.warning, background: Colors.warningSoft },
  acta_nacimiento: { icon: 'ribbon-outline', color: Colors.primaryDark, background: Colors.primarySoft },
  comprobante_domicilio: { icon: 'home-outline', color: Colors.secondary, background: Colors.secondarySoft },
  comprobante_estudios: { icon: 'school-outline', color: Colors.secondary, background: Colors.secondarySoft },
  estado_cuenta: { icon: 'wallet-outline', color: Colors.info, background: Colors.infoSoft },
  fotografia: { icon: 'camera-outline', color: Colors.primaryDark, background: Colors.primarySoft },
  contrato: { icon: 'document-text-outline', color: Colors.neutral, background: Colors.neutralSoft },
  aviso_privacidad: { icon: 'shield-checkmark-outline', color: Colors.info, background: Colors.infoSoft },
  carta_confidencialidad: { icon: 'lock-closed-outline', color: Colors.info, background: Colors.infoSoft },
  cv: { icon: 'briefcase-outline', color: Colors.neutral, background: Colors.neutralSoft },
  reglamento: { icon: 'list-outline', color: Colors.neutral, background: Colors.neutralSoft },
  incapacidad: { icon: 'pulse-outline', color: Colors.warning, background: Colors.warningSoft },
  permiso: { icon: 'time-outline', color: Colors.neutral, background: Colors.neutralSoft },
  formato_vacaciones: { icon: 'airplane-outline', color: Colors.secondary, background: Colors.secondarySoft },
  documento_baja: { icon: 'exit-outline', color: Colors.danger, background: Colors.dangerSoft },
  otro: { icon: 'document-outline', color: Colors.neutral, background: Colors.neutralSoft },
};

const FALLBACK_META: DocumentTypeMeta = { icon: 'document-outline', color: Colors.neutral, background: Colors.neutralSoft };

export function getDocumentTypeMeta(clave?: string | null): DocumentTypeMeta {
  if (!clave) return FALLBACK_META;
  return DOCUMENT_TYPE_META[clave] ?? FALLBACK_META;
}
