/**
 * Saldo de vacaciones — `App\Services\Vacaciones\VacacionesService::saldo()`,
 * expuesto por el endpoint legacy `GET /api/v1/vacaciones/saldo`
 * (excepción de solo lectura documentada en `src/api/vacaciones.ts`).
 * El campo es `dias_usados`, no `dias_utilizados`.
 *
 * El saldo suma los días de la tabla legacy Y los de las solicitudes
 * unificadas `tipo=vacaciones`, así que es la cifra correcta aunque la app
 * ya no cree nada en el módulo legacy.
 */
export interface VacationBalance {
  antiguedad_anios?: number;
  vigencia_inicio?: string | null;
  vigencia_fin?: string | null;
  dias_generados?: number;
  dias_usados?: number;
  dias_en_solicitud?: number;
  dias_disponibles?: number;
  [key: string]: unknown;
}

/**
 * @deprecated Forma de la tabla legacy `solicitudes_vacaciones`
 * (`SolicitudVacacionesResource`). La app ya no lista ni crea vacaciones por
 * ahí: la pantalla "Mis vacaciones" filtra `Solicitud` con
 * `tipo === 'vacaciones'`. Se conserva solo para la bandeja RH legacy
 * (`rhVacacionesApi`), que puede seguir recibiendo registros históricos.
 */
export interface VacationRequest {
  id: number | string;
  fecha_inicio?: string;
  fecha_fin?: string;
  dias_solicitados?: number;
  estado?: string;
  estado_etiqueta?: string;
  comentario?: string;
  created_at?: string;
  [key: string]: unknown;
}
