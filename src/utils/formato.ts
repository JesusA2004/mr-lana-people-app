import type { RhFormato } from '@/types/formato';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Nunca castear `response.data as RhFormato[]` a ciegas (bug corregido: la
 * auditoría anterior asumía `clave`/`formatos_salida`/`variables_requeridas`/
 * `acciones_permitidas`, ninguno existe en el backend real — un
 * `.includes()`/`.map()` sobre esos campos habría reventado en runtime).
 * Defaults seguros ante cualquier forma inesperada; nunca inventa el
 * permiso de generar — eso lo decide únicamente el backend.
 */
export function normalizeRhFormato(raw: unknown): RhFormato | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'number' || typeof raw.nombre !== 'string') return null;

  return {
    id: raw.id,
    nombre: raw.nombre,
    tipo: typeof raw.tipo === 'string' ? raw.tipo : 'otro',
    tipo_etiqueta: typeof raw.tipo_etiqueta === 'string' ? raw.tipo_etiqueta : 'Otro',
    descripcion: typeof raw.descripcion === 'string' ? raw.descripcion : null,
    variables: Array.isArray(raw.variables) ? raw.variables.filter((v): v is string => typeof v === 'string') : [],
    veces_generado: typeof raw.veces_generado === 'number' ? raw.veces_generado : 0,
    ultimo_uso: typeof raw.ultimo_uso === 'string' ? raw.ultimo_uso : null,
  };
}

/**
 * `GET /rh/formatos` regresa un ARREGLO PLANO (`FormatoCatalogoService::listar()`
 * → `['data' => [...]]`), nunca un paginador Laravel. Defensivo ante
 * cualquier forma que llegue (arreglo directo, `{data:[...]}`, o algo
 * inesperado) — nunca truena, cae en lista vacía.
 */
export function normalizeRhFormatosList(raw: unknown): RhFormato[] {
  const list = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.data) ? raw.data : [];
  return list.map(normalizeRhFormato).filter((formato): formato is RhFormato => formato !== null);
}
