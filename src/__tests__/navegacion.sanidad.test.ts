import { destinosEnCodigo, existeRuta, rutasDeLaApp } from '@/testing/navegacionInventario';

describe('el inventario de navegación sí detecta', () => {
  it('encuentra cientos de destinos reales en el código', () => {
    const destinos = destinosEnCodigo();
    expect(destinos.length).toBeGreaterThan(80);
    // Muestras conocidas.
    expect(destinos.some((d) => d.destino === '/solicitud/nueva')).toBe(true);
    expect(destinos.some((d) => d.destino.startsWith('/(app)/rh/'))).toBe(true);
  });

  it('marca como inexistente una ruta que no tiene pantalla', () => {
    const rutas = rutasDeLaApp();
    expect(existeRuta('/no-existe', rutas)).toBe(false);
    expect(existeRuta('/(app)/rh/candidatos/${id}/fantasma', rutas)).toBe(false);
    expect(existeRuta('/(app)/rh/candidatos/${id}', rutas)).toBe(true);
    expect(existeRuta('/expediente/12?ref=documento', rutas)).toBe(true);
  });
});
