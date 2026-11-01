import { debeCargarMasParaFiltro } from '../filtroPaginado';

const base = { resultados: 0, hayFiltroLocal: true, hasNextPage: true, isFetchingNextPage: false, fallo: false };

describe('debeCargarMasParaFiltro', () => {
  it('sigue cargando si el filtro no encontró nada y quedan páginas', () => {
    expect(debeCargarMasParaFiltro(base)).toBe(true);
  });
  it.each([
    ['hay resultados', { resultados: 1 }],
    ['sin filtro', { hayFiltroLocal: false }],
    ['no quedan páginas', { hasNextPage: false }],
    ['ya está cargando', { isFetchingNextPage: true }],
    ['la última carga falló', { fallo: true }],
  ])('se detiene: %s', (_nombre, cambio) => {
    expect(debeCargarMasParaFiltro({ ...base, ...cambio })).toBe(false);
  });
});
