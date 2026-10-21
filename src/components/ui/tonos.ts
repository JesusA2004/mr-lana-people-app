import type { ColorPalette } from '@/constants/colors';

/**
 * Tonos semánticos de los componentes base (`components/ui`). Nunca se pinta
 * un estado solo con color: el tono acompaña SIEMPRE a un ícono y a un texto.
 *
 * - primario: marca / acción neutra positiva («Mi expediente»).
 * - exito: aprobado, completo.
 * - aviso: falta algo, pendiente de la persona («Completa tu información»).
 * - peligro: rechazado, requiere corrección, vencido.
 * - info: en revisión, esperando a otra persona («Esperando jefe directo»).
 * - neutral: sin estado, histórico, cancelado.
 * - celebracion: cumpleaños, aniversarios.
 */
export type Tono = 'primario' | 'exito' | 'aviso' | 'peligro' | 'info' | 'neutral' | 'celebracion';

export interface ColoresTono {
  /** Texto / ícono sobre `fondo` (contraste AA sobre su fondo suave). */
  texto: string;
  /** Fondo suave (chips, círculo del ícono, banners). */
  fondo: string;
  /** Borde de banners / tarjetas del tono. */
  borde: string;
}

export function coloresTono(Colors: ColorPalette, tono: Tono): ColoresTono {
  switch (tono) {
    case 'exito':
      return { texto: Colors.success, fondo: Colors.successSoft, borde: Colors.successSoft };
    case 'aviso':
      return { texto: Colors.warning, fondo: Colors.warningSoft, borde: Colors.warningSoft };
    case 'peligro':
      return { texto: Colors.danger, fondo: Colors.dangerSoft, borde: Colors.dangerSoft };
    case 'info':
      return { texto: Colors.info, fondo: Colors.infoSoft, borde: Colors.infoSoft };
    case 'neutral':
      return { texto: Colors.textMuted, fondo: Colors.neutralSoft, borde: Colors.border };
    case 'celebracion':
      return { texto: Colors.celebration, fondo: Colors.celebrationSoft, borde: Colors.celebrationSoft };
    case 'primario':
    default:
      return { texto: Colors.primaryDark, fondo: Colors.primarySoft, borde: Colors.primarySoft };
  }
}

/** Porcentaje seguro para barras/anillos: entero entre 0 y 100 (NaN → 0). */
export function porcentajeSeguro(valor: number | null | undefined): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return 0;
  return Math.round(Math.max(0, Math.min(100, valor)));
}

/** «3 pendientes» / «1 pendiente» / null si es 0 (para no pintar badges vacíos). */
export function textoConteo(cantidad: number | null | undefined, singular: string, plural: string): string | null {
  if (typeof cantidad !== 'number' || cantidad <= 0) return null;
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

/** Badge numérico compacto: 1…99 y «99+». */
export function textoBadge(cantidad: number | null | undefined): string | null {
  if (typeof cantidad !== 'number' || cantidad <= 0) return null;
  return cantidad > 99 ? '99+' : String(cantidad);
}
