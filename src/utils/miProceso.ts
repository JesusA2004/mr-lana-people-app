import type { Href } from 'expo-router';

import type { LeccionEstado, MiProcesoDestino } from '@/types/miProceso';

/**
 * Traduce el destino que manda el backend (`accion.app` de mi-proceso) a la
 * ruta de Expo Router. Es solo un mapa de navegación: la app NUNCA decide
 * qué acción corresponde, eso viene del backend.
 */
export function rutaDeDestino(destino: MiProcesoDestino): Href {
  switch (destino) {
    case 'expediente':
      return '/(app)/(tabs)/expediente';
    case 'documentos-laborales':
      return '/documentos-laborales';
    case 'lecciones':
      return '/lecciones';
  }
}

export function etiquetaEstadoLeccion(estado: LeccionEstado): string {
  switch (estado) {
    case 'aprobada':
      return 'Aprobada';
    case 'disponible':
      return 'Lista para responder';
    case 'en_espera':
      return 'Recursos Humanos te dejará un comentario';
    case 'bloqueada':
      return 'Se habilita después';
  }
}

/** Calificación legible (nunca NaN/undefined): "8.5" o "—". */
export function formatoCalificacion(valor: number | null | undefined): string {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor.toFixed(1).replace(/\.0$/, '') : '—';
}

/** Todas las preguntas contestadas (cada índice con una opción elegida). */
export function respuestasCompletas(preguntas: { indice: number }[], respuestas: Record<number, number>): boolean {
  return preguntas.length > 0 && preguntas.every((p) => typeof respuestas[p.indice] === 'number');
}
