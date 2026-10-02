/**
 * Guardia contra doble toque (doble aprobación, doble solicitud, doble
 * pago…). Un toque se ignora si:
 * - la acción anterior todavía no termina (si devolvió una promesa), o
 * - llegó a menos de `ventanaMs` del anterior (acciones que disparan
 *   `mutate()` sin devolver promesa: en ese lapso el `isPending` de la
 *   mutación ya pintó el botón como ocupado).
 * El backend vuelve a protegerse (bloqueos/estado), esto evita el 2º envío.
 */
export function crearGuardiaDobleToque(ventanaMs = 800, ahora: () => number = () => Date.now()) {
  let ultimo = -Infinity;
  let enCurso = false;

  return {
    get ocupado() {
      return enCurso;
    },
    /** Ejecuta `accion` si no es un doble toque. Devuelve false si se ignoró. */
    ejecutar(accion: () => unknown, alTerminar?: () => void): boolean {
      const t = ahora();
      if (enCurso || t - ultimo < ventanaMs) return false;
      ultimo = t;
      const resultado = accion();
      if (resultado && typeof (resultado as Promise<unknown>).then === 'function') {
        enCurso = true;
        void (resultado as Promise<unknown>)
          .catch(() => undefined)
          .finally(() => {
            enCurso = false;
            alTerminar?.();
          });
      }
      return true;
    },
  };
}
