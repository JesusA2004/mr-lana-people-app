/**
 * Felicitación de cumpleaños del colaborador autenticado — espejo de
 * `App\Http\Controllers\Api\V1\ColaboradorCumpleanosController::felicitacionActual()`
 * en capacitaciones. Solo existe si hoy es el cumpleaños del usuario
 * autenticado (`null`/404 el resto del año). `card_url` es streaming
 * autenticado con Bearer token, nunca la ruta física del archivo. La API
 * nunca expone año de nacimiento ni edad (AGENTS.md sección 73) — este tipo
 * tampoco los declara a propósito.
 */
export interface BirthdayGreeting {
  id: number;
  fecha: string;
  titulo: string;
  mensaje: string;
  frase?: string | null;
  card_url: string | null;
}
