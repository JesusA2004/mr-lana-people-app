/**
 * Clave de persistencia local para "ya vio la felicitación de hoy"
 * (AGENTS.md sección 34: `birthdayGreetingSeen:{greeting_id}`). Corrección
 * de bug real: `greeting_id` es una secuencia GLOBAL del backend (no por
 * usuario) — con la llave anterior (solo `greeting_id`), si el colaborador
 * A veía la felicitación con id 45 y luego el colaborador B iniciaba sesión
 * en el mismo teléfono y su propio cumpleaños generaba también el id 45
 * (siguiente de la secuencia), B nunca vería su celebración porque la app
 * ya la marcaba como "vista" por A. Ahora la llave incluye el `userId` del
 * colaborador autenticado, así que "vista" es siempre relativo a quién la
 * vio, nunca solo al id global.
 */
export function birthdaySeenStorageKey(userId: number | string, greetingId: number | string): string {
  return `birthdayGreetingSeen:${userId}:${greetingId}`;
}
