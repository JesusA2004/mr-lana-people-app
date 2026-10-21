import * as SecureStore from 'expo-secure-store';

import { logError } from './errors';
import { PASOS_REGISTRO, type ClavePaso } from './registroWizard';

/**
 * Borrador LOCAL del asistente de registro (si la persona cierra la app a
 * media captura, al volver encuentra lo que ya había escrito y el paso donde
 * iba). Va en SecureStore (cifrado del sistema), por usuario: lleva CURP,
 * NSS… Lo guardado en el servidor (cada «Siguiente») sigue siendo la fuente
 * de verdad; esto solo cubre lo que todavía no se envió.
 */
export interface BorradorRegistro {
  paso: ClavePaso | null;
  valores: Record<string, string>;
}

/** SecureStore recomienda valores ≤ 2 KB: se recortan los textos largos (datos médicos). */
const MAX_VALOR = 300;

export function claveBorrador(userId: string | number): string {
  return `registro_borrador_${String(userId).replace(/[^A-Za-z0-9_.-]/g, '_')}`;
}

export function serializarBorrador(borrador: BorradorRegistro): string {
  const valores: Record<string, string> = {};
  for (const [campo, valor] of Object.entries(borrador.valores)) {
    if (typeof valor === 'string' && valor.trim() !== '') valores[campo] = valor.slice(0, MAX_VALOR);
  }
  return JSON.stringify({ paso: borrador.paso, valores });
}

export function deserializarBorrador(texto: string | null): BorradorRegistro {
  const vacio: BorradorRegistro = { paso: null, valores: {} };
  if (!texto) return vacio;
  try {
    const crudo = JSON.parse(texto) as { paso?: unknown; valores?: unknown };
    const paso = PASOS_REGISTRO.some((p) => p.clave === crudo.paso) ? (crudo.paso as ClavePaso) : null;
    const valores: Record<string, string> = {};
    if (crudo.valores && typeof crudo.valores === 'object') {
      for (const [campo, valor] of Object.entries(crudo.valores as Record<string, unknown>)) {
        if (typeof valor === 'string') valores[campo] = valor;
      }
    }
    return { paso, valores };
  } catch {
    return vacio;
  }
}

export async function leerBorrador(userId: string | number): Promise<BorradorRegistro> {
  try {
    return deserializarBorrador(await SecureStore.getItemAsync(claveBorrador(userId)));
  } catch (error) {
    logError('registroBorrador.leer', error);
    return { paso: null, valores: {} };
  }
}

export async function guardarBorrador(userId: string | number, borrador: BorradorRegistro): Promise<void> {
  try {
    await SecureStore.setItemAsync(claveBorrador(userId), serializarBorrador(borrador));
  } catch (error) {
    logError('registroBorrador.guardar', error);
  }
}

export async function borrarBorrador(userId: string | number): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(claveBorrador(userId));
  } catch (error) {
    logError('registroBorrador.borrar', error);
  }
}
