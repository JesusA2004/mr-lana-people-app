import type { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import type { DocumentoOficialStatus } from '@/types/request';

/**
 * Presentación de `DocumentoOficialStatus` (sección 2 del encargo
 * 2026-09-15). Puramente cosmético — el backend todavía no manda este
 * estado en ningún endpoint móvil confirmado; este catálogo solo se usa el
 * día que lo haga (ver `SolicitudFormatoOficialCard`).
 */
export interface DocumentoOficialStatusPresentation {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
  label: string;
}

const PRESENTATION: Record<string, DocumentoOficialStatusPresentation> = {
  no_generado: { icon: 'time-outline', color: Colors.textMuted, background: Colors.neutralSoft, label: 'No generado aún' },
  generado: { icon: 'document-text-outline', color: Colors.info, background: Colors.infoSoft, label: 'Generado' },
  pendiente_de_firma: { icon: 'create-outline', color: Colors.warning, background: Colors.warningSoft, label: 'Pendiente de firma' },
  firmado: { icon: 'checkmark-done-circle-outline', color: Colors.success, background: Colors.successSoft, label: 'Firmado' },
  error: { icon: 'alert-circle-outline', color: Colors.danger, background: Colors.dangerSoft, label: 'Hubo un problema al generarlo' },
};

const FALLBACK: DocumentoOficialStatusPresentation = {
  icon: 'document-outline',
  color: Colors.textMuted,
  background: Colors.neutralSoft,
  label: 'Estado desconocido',
};

export function documentoOficialStatusPresentation(status: DocumentoOficialStatus | undefined): DocumentoOficialStatusPresentation {
  if (!status) return FALLBACK;
  return PRESENTATION[status] ?? FALLBACK;
}
