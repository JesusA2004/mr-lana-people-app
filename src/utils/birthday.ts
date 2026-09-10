/**
 * Clave de persistencia local para "ya vio la felicitación de hoy"
 * (AGENTS.md sección 34: `birthdayGreetingSeen:{greeting_id}`). Un valor
 * por `greeting_id` (no por fecha) porque el backend ya garantiza que solo
 * existe una felicitación vigente a la vez (`felicitacion-actual`) — el id
 * cambia de un cumpleaños a otro sin ambigüedad.
 */
export function birthdaySeenStorageKey(greetingId: number | string): string {
  return `birthdayGreetingSeen:${greetingId}`;
}
