import { destinosEnCodigo, existeRuta, rutasDeLaApp } from '@/testing/navegacionInventario';

import { rutaDeDestino } from '@/utils/miProceso';
import type { MiProcesoDestino } from '@/types/miProceso';

/**
 * Matriz de navegación: NINGÚN destino escrito en la app (botones, cards,
 * accesos rápidos, pushes, tareas, mi-proceso) puede apuntar a una pantalla
 * que no existe — eso era "ruta inexistente"/pantalla blanca.
 */
describe('matriz de navegación', () => {
  const rutas = rutasDeLaApp();

  it('hay pantallas registradas', () => {
    expect(rutas.length).toBeGreaterThan(40);
  });

  it('todo router.push/replace/href/pathname del código apunta a una pantalla real', () => {
    const rotos = destinosEnCodigo().filter((d) => !existeRuta(d.destino, rutas));
    expect(rotos).toEqual([]);
  });

  it('cada destino de mi-proceso abre una pantalla real', () => {
    const destinos: MiProcesoDestino[] = ['expediente', 'documentos-laborales', 'lecciones'];
    for (const d of destinos) {
      expect(existeRuta(String(rutaDeDestino(d)), rutas)).toBe(true);
    }
  });
});
