/**
 * Puente de la RONDA 1. La regla es «sin flag no hay descarga», pero el
 * backend todavía no manda `puede_descargar` en todos los documentos. Donde
 * falta, la pantalla declara EXPLÍCITAMENTE qué autoriza hoy el Policy
 * (comentario junto al uso) con esta constante.
 *
 * RONDA 2: reemplazar cada uso por el flag por documento y borrar la
 * constante. `grep AUTORIZADO_POR_POLICY_ACTUAL src` da la lista exacta. El
 * backend vuelve a validar en la ruta: un 403 se muestra como error.
 */
export const AUTORIZADO_POR_POLICY_ACTUAL = true;
