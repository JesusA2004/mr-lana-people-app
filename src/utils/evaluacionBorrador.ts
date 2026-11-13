import { File, Paths } from 'expo-file-system';

import type { OpinionInduccion, RespuestasInduccion } from '@/types/induccion';

import { logError } from './errors';

/**
 * Borrador LOCAL de la evaluación de inducción: cada respuesta se guarda en
 * el teléfono al momento, así cerrar la app, el bloqueo por inactividad o que
 * el sistema la saque de memoria nunca borran lo ya contestado. Va en un
 * archivo privado de la app (los casos prácticos no caben en SecureStore) y
 * se elimina al enviar la evaluación. La calificación sigue siendo del
 * servidor: aquí solo vive lo que todavía no se envía.
 */
export interface BorradorEvaluacion {
  respuestas: RespuestasInduccion;
  opinion: OpinionInduccion;
}

function archivo(evaluacionId: number): File {
  return new File(Paths.document, `evaluacion_induccion_${Math.trunc(evaluacionId)}.json`);
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

export function serializarBorradorEvaluacion(borrador: BorradorEvaluacion): string {
  return JSON.stringify({ respuestas: borrador.respuestas, opinion: borrador.opinion });
}

/** `null` si no hay borrador utilizable (vacío, corrupto o con otra forma). */
export function deserializarBorradorEvaluacion(texto: string | null): BorradorEvaluacion | null {
  if (!texto) return null;
  try {
    const crudo: unknown = JSON.parse(texto);
    if (!esObjeto(crudo) || !esObjeto(crudo.respuestas)) return null;
    const { a, b, c, d } = crudo.respuestas;
    return {
      respuestas: {
        a: esObjeto(a) ? a : {},
        b: esObjeto(b) ? b : {},
        c: esObjeto(c) ? c : {},
        d: esObjeto(d) ? d : {},
      } as RespuestasInduccion,
      opinion: (esObjeto(crudo.opinion) ? crudo.opinion : {}) as OpinionInduccion,
    };
  } catch {
    return null;
  }
}

export async function leerBorradorEvaluacion(evaluacionId: number): Promise<BorradorEvaluacion | null> {
  try {
    const destino = archivo(evaluacionId);
    if (!destino.exists) return null;
    return deserializarBorradorEvaluacion(await destino.text());
  } catch (error) {
    logError('evaluacionBorrador.leer', error);
    return null;
  }
}

export function guardarBorradorEvaluacion(evaluacionId: number, borrador: BorradorEvaluacion): void {
  try {
    const destino = archivo(evaluacionId);
    if (!destino.exists) destino.create();
    destino.write(serializarBorradorEvaluacion(borrador));
  } catch (error) {
    logError('evaluacionBorrador.guardar', error);
  }
}

export function borrarBorradorEvaluacion(evaluacionId: number): void {
  try {
    const destino = archivo(evaluacionId);
    if (destino.exists) destino.delete();
  } catch (error) {
    logError('evaluacionBorrador.borrar', error);
  }
}
