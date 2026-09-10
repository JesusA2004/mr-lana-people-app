import type { ExtractionAction, ExtractionStatus } from '@/types/documentExtraction';

/** Etiqueta humana del estado de extracción (AGENTS.md de este encargo, sección 9) — nunca mostrar el slug crudo (`pending`, `processed`...) al usuario. */
export function extractionStatusLabel(status: ExtractionStatus | string | undefined): string {
  switch (status) {
    case 'pending':
      return 'En cola para analizar';
    case 'processing':
      return 'Analizando documento…';
    case 'processed':
      return 'Datos detectados';
    case 'reviewed':
      return 'Revisado';
    case 'failed':
      return 'No se pudo analizar';
    default:
      return 'Sin analizar';
  }
}

/** true mientras el backend sigue trabajando — usado para decidir si hay que seguir haciendo polling (ver `useRhDocumentExtraction`). */
export function isExtractionInProgress(status: ExtractionStatus | string | undefined): boolean {
  return status === 'pending' || status === 'processing';
}

export type ConfidenceLevel = 'alta' | 'media' | 'baja';

/** Nivel legible de confianza — la UI NUNCA muestra el decimal crudo (sección 9: "0.97 → Confianza alta"). */
export function confidenceLevel(value: number | null | undefined): ConfidenceLevel {
  if (value === null || value === undefined) return 'baja';
  if (value >= 0.85) return 'alta';
  if (value >= 0.6) return 'media';
  return 'baja';
}

export function confidenceLabel(value: number | null | undefined): string {
  const level = confidenceLevel(value);
  return level === 'alta' ? 'Confianza alta' : level === 'media' ? 'Confianza media' : 'Confianza baja';
}

/** Único punto de verdad para leer `acciones_permitidas` de una extracción — mismo criterio que `utils/rhActions.ts` para el resto de RH. */
export function hasExtractionAction(actions: ExtractionAction[] | undefined, action: ExtractionAction): boolean {
  return Array.isArray(actions) && actions.includes(action);
}
