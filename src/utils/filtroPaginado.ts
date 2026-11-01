/**
 * Filtro local sobre una lista paginada: con 0 resultados y páginas pendientes
 * todavía no se puede decir «no hay». Hay que seguir cargando, salvo si la
 * última carga falló (ahí decide la persona, para no reintentar en bucle).
 */
export function debeCargarMasParaFiltro(opciones: {
  resultados: number;
  hayFiltroLocal: boolean;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fallo: boolean;
}): boolean {
  const { resultados, hayFiltroLocal, hasNextPage, isFetchingNextPage, fallo } = opciones;
  return hayFiltroLocal && resultados === 0 && Boolean(hasNextPage) && !isFetchingNextPage && !fallo;
}
