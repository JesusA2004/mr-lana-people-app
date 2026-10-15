import type { AcuseDescriptivoPuesto } from '@/types/descriptivoPuesto';

/** Placeholder del comentario de enterado (lo pidió RH tal cual). */
export const PLACEHOLDER_ENTERADO = 'Doy por enterado de mis actividades y responsabilidades…';

/** El servidor exige las dos cosas: «OK, enterado» marcado y un comentario con texto. */
export function puedeEnviarAcuse(enterado: boolean, comentario: string): boolean {
  return enterado && comentario.trim().length > 0;
}

/** RH lo envió y todavía falta tu «OK, enterado» (el estado lo decide el servidor). */
export function descriptivoPendiente(acuse: AcuseDescriptivoPuesto | null | undefined): boolean {
  return !!acuse && acuse.acusadoEn === null && acuse.estado !== 'enterado';
}
