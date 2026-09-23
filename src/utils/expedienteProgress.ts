import type { Ionicons } from '@expo/vector-icons';

/**
 * Presentación del avance del expediente. La REGLA vive en el backend
 * (`App\Services\Expedientes\ProgresoExpediente`: solo "aprobado" cuenta,
 * floor, denominador = obligatorios). Aquí solo se normaliza lo recibido
 * para pintarlo: nunca NaN, nunca decimales y NUNCA 100 % si el propio
 * backend dice que faltan documentos (defensa ante un backend anterior que
 * redondeaba hacia arriba).
 */
export interface ExpedienteProgressInput {
  total_obligatorios?: number | null;
  completos?: number | null;
  faltantes?: number | null;
  en_revision?: number | null;
  rechazados?: number | null;
  porcentaje?: number | null;
  completo?: boolean | null;
  sin_obligatorios?: boolean | null;
  // Claves previas (mismo endpoint, backend anterior).
  total?: number | null;
  aprobados?: number | null;
  pendientes?: number | null;
}

export interface ExpedienteProgress {
  total: number;
  completos: number;
  faltantes: number;
  enRevision: number;
  rechazados: number;
  /** Todo lo que todavía no está aprobado. */
  pendientes: number;
  porcentaje: number;
  completo: boolean;
  sinObligatorios: boolean;
}

const n = (value: number | null | undefined): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);

export function toExpedienteProgress(input: ExpedienteProgressInput | null | undefined): ExpedienteProgress {
  const total = n(input?.total_obligatorios ?? input?.total);
  const completos = Math.min(n(input?.completos ?? input?.aprobados), total || Number.MAX_SAFE_INTEGER);
  const faltantes = n(input?.faltantes ?? input?.pendientes);
  const enRevision = n(input?.en_revision);
  const rechazados = n(input?.rechazados);
  const sinObligatorios = input?.sin_obligatorios === true || total === 0;
  const completo = total > 0 ? completos >= total : input?.completo === true;

  let porcentaje = Math.max(0, Math.min(100, n(input?.porcentaje)));
  if (total > 0 && !completo && porcentaje >= 100) porcentaje = 99;
  if (sinObligatorios) porcentaje = 0;

  return { total, completos, faltantes, enRevision, rechazados, pendientes: Math.max(0, total - completos), porcentaje, completo: completo && !sinObligatorios, sinObligatorios };
}

/** "8 de 11 documentos completos" / "Expediente completo" / "Sin documentos obligatorios". */
export function progressHeadline(p: ExpedienteProgress): string {
  if (p.sinObligatorios) return 'Sin documentos obligatorios';
  if (p.completo) return 'Expediente completo';
  return `${p.completos} de ${p.total} ${p.total === 1 ? 'documento completo' : 'documentos completos'}`;
}

/** Desglose corto de lo que falta: "2 por subir · 1 en revisión". Vacío si no falta nada. */
export function progressBreakdown(p: ExpedienteProgress): string {
  const parts: string[] = [];
  if (p.faltantes > 0) parts.push(`${p.faltantes} por subir`);
  if (p.enRevision > 0) parts.push(`${p.enRevision} en revisión`);
  if (p.rechazados > 0) parts.push(`${p.rechazados} ${p.rechazados === 1 ? 'requiere corrección' : 'requieren corrección'}`);
  return parts.join(' · ');
}

export type DocumentGlyphTone = 'success' | 'neutral' | 'warning' | 'danger';

/** Estado de un documento en palabras + ícono (nunca solo color). */
export function documentStatusGlyph(estado: string | null | undefined): { icon: keyof typeof Ionicons.glyphMap; label: string; tone: DocumentGlyphTone } {
  switch (estado) {
    case 'aprobado':
      return { icon: 'checkmark-circle', label: 'Completo', tone: 'success' };
    case 'cargado':
    case 'en_revision':
    case 'cambio_solicitado':
      return { icon: 'time-outline', label: 'En revisión', tone: 'warning' };
    case 'requiere_correccion':
    case 'vencido':
      return { icon: 'alert-circle', label: estado === 'vencido' ? 'Vencido' : 'Requiere corrección', tone: 'danger' };
    case 'rechazado':
      return { icon: 'close-circle', label: 'Rechazado', tone: 'danger' };
    case 'cambio_autorizado':
      return { icon: 'cloud-upload-outline', label: 'Sube la nueva versión', tone: 'neutral' };
    default:
      return { icon: 'ellipse-outline', label: 'Falta subir', tone: 'neutral' };
  }
}
