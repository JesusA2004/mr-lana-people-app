import { formatDateLong } from './dates';

import type { BloqueoDocumentos, CartaCompromiso, CartaCompromisoResumen } from '@/types/cartaCompromiso';

/**
 * Lógica PURA de la carta compromiso de documentos pendientes: textos del
 * banner y del encabezado de `/documentos-pendientes`. La regla (si hay
 * bloqueo, cuántos días quedan) la manda el backend; aquí solo se redacta.
 */

/** Máximo de documentos por carta si el backend todavía no manda `max_documentos_carta`. */
export const MAX_DOCUMENTOS_CARTA_DEFAULT = 2;

/** Máximo de documentos que cubre una carta compromiso (lo manda el backend). */
export function maxDocumentosCarta(valor: number | null | undefined): number {
  return typeof valor === 'number' && valor >= 1 ? Math.floor(valor) : MAX_DOCUMENTOS_CARTA_DEFAULT;
}

/** «1 documento» / «2 documentos». */
function documentos(n: number): string {
  return n === 1 ? '1 documento' : `${n} documentos`;
}

/**
 * Aviso del registro cuando marcó «No tengo» en más documentos de los que
 * cubre una carta: puede terminar, pero la app queda bloqueada hasta bajar
 * al máximo (entonces la carta se genera sola).
 */
export function textoExcedeMaximoCarta(max: number): string {
  return (
    `Solo puedes dejar hasta ${documentos(max)} pendientes con carta compromiso. Puedes terminar tu registro, pero la app quedará bloqueada ` +
    `(solo podrás subir documentos) hasta que te falten ${max} o menos; en ese momento se generará tu carta compromiso automáticamente.`
  );
}

/** Lo que tiene que subir quien excede el máximo: «sube al menos 1 documento». */
export function textoSubirParaCarta(pendientes: number, max: number): string {
  const faltan = Math.max(1, pendientes - max);
  return `Te faltan ${documentos(pendientes)}; sube al menos ${documentos(faltan)} para generar tu carta compromiso y entrar a la app.`;
}

/**
 * ¿La carta se acaba de generar sola? Antes: bloqueado por exceder el
 * máximo y sin carta; ahora: con carta y sin bloqueo. Devuelve la carta
 * para mostrar la pantalla de éxito antes de liberar la app.
 */
export function cartaRecienGenerada(
  previo: { bloqueo: BloqueoDocumentos | null | undefined; carta: CartaCompromiso | null | undefined } | null | undefined,
  actual: { bloqueo: BloqueoDocumentos; carta: CartaCompromiso | null } | null | undefined,
): CartaCompromiso | null {
  if (!previo || !actual?.carta) return null;
  const esperaba = previo.bloqueo?.activo === true && previo.bloqueo.motivo === 'excede_maximo_carta' && !previo.carta;
  return esperaba && !actual.bloqueo.activo ? actual.carta : null;
}

/** «1 día» / «3 días» / «hoy es el último día». */
export function textoDiasRestantes(dias: number): string {
  if (dias <= 0) return 'hoy es tu último día';
  return dias === 1 ? 'te queda 1 día' : `te quedan ${dias} días`;
}

/** ¿Se muestra el banner de Inicio? Solo con carta vigente y algo pendiente (y no bloqueado). */
export function debeMostrarBannerCarta(carta: CartaCompromisoResumen | null | undefined, bloqueo: BloqueoDocumentos | null | undefined): carta is CartaCompromisoResumen {
  if (!carta || carta.estado !== 'vigente') return false;
  if (bloqueo?.activo) return false;
  // Backend anterior sin `bloqueo_documentos`: con carta vigente se asume que algo falta.
  return bloqueo ? bloqueo.pendientes > 0 : true;
}

/** Título del banner: «Tienes 2 documentos pendientes — te quedan 5 días». */
export function tituloBannerCarta(pendientes: number | null | undefined, dias: number): string {
  const cuantos = pendientes && pendientes > 0 ? (pendientes === 1 ? 'Tienes 1 documento pendiente' : `Tienes ${pendientes} documentos pendientes`) : 'Tienes documentos pendientes';
  return `${cuantos} — ${textoDiasRestantes(dias)}`;
}

export interface EncabezadoPendientes {
  titulo: string;
  mensaje: string;
  tono: 'peligro' | 'aviso' | 'info';
}

/**
 * Encabezado de la pantalla de documentos pendientes:
 * - Bloqueo por carta vencida: «Tu carta compromiso venció el …».
 * - Bloqueo sin carta: documentos obligatorios faltantes.
 * - Sin bloqueo con carta vigente: recordatorio con la fecha límite.
 */
export function encabezadoPendientes(
  bloqueo: BloqueoDocumentos | null | undefined,
  carta: { folio: string; fecha_limite: string; dias_restantes: number } | null | undefined,
): EncabezadoPendientes {
  if (bloqueo?.activo) {
    if (bloqueo.motivo === 'carta_vencida') {
      const fecha = formatDateLong(bloqueo.fecha_limite ?? carta?.fecha_limite ?? null);
      return {
        titulo: fecha ? `Tu carta compromiso venció el ${fecha}` : 'Tu carta compromiso venció',
        mensaje: 'Mientras tanto, la app solo te deja subir tus documentos pendientes. En cuanto los subas, recuperas el acceso completo.',
        tono: 'peligro',
      };
    }
    if (bloqueo.motivo === 'excede_maximo_carta') {
      const max = maxDocumentosCarta(bloqueo.max_documentos_carta);
      return {
        titulo: `Te faltan ${documentos(bloqueo.pendientes)} de tu expediente`,
        mensaje: `${textoSubirParaCarta(bloqueo.pendientes, max)} Una carta compromiso cubre como máximo ${documentos(max)}; mientras tanto, la app solo te deja subir documentos.`,
        tono: 'aviso',
      };
    }
    return {
      titulo: 'Te faltan documentos de tu expediente',
      mensaje: 'Tu acceso a la app está limitado hasta que subas los documentos pendientes. Súbelos aquí y recuperas el acceso completo.',
      tono: 'aviso',
    };
  }

  if (carta) {
    const fecha = formatDateLong(carta.fecha_limite);
    return {
      titulo: `Sube tus documentos: ${textoDiasRestantes(carta.dias_restantes)}`,
      mensaje: `Tu carta compromiso ${carta.folio} vence el ${fecha || carta.fecha_limite}. Si no los subes a tiempo, la app quedará limitada a subir documentos.`,
      tono: 'aviso',
    };
  }

  return {
    titulo: 'Tus documentos pendientes',
    mensaje: 'Sube aquí los documentos que te faltan de tu expediente.',
    tono: 'info',
  };
}

/** Estados en los que el documento ya está entregado (no se ofrece «Subir»). */
const ENTREGADOS = ['en_revision', 'aprobado', 'cargado', 'cambio_solicitado'];

export function puedeSubirPendiente(estado: string): boolean {
  return !ENTREGADOS.includes(estado);
}
