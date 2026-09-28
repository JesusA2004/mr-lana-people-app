/**
 * Sistema unificado de celebraciones (cumpleaños + aniversario laboral) —
 * espejo EXACTO de `App\Http\Controllers\Api\V1\CelebracionController` y
 * `App\Services\Celebraciones\CelebracionService::aArray()` en
 * `capacitaciones@cc4beeb` (ver `docs/CELEBRACIONES.md`).
 *
 * Es un sistema DISTINTO del cumpleaños "clásico"
 * (`ColaboradorCumpleanosController` + `cumpleanos/muros/*`, ver
 * `src/api/cumpleanos.ts` / `src/api/birthdayWall.ts`), que sigue existiendo
 * en el backend y la app tal cual — no se reemplaza, para no romper un
 * flujo que ya funciona (AGENTS.md sección 3). El aniversario laboral SOLO
 * existe aquí: no hay una versión "clásica" equivalente.
 *
 * Diferencia clave de privacidad: aquí los mensajes son PRIVADOS (un
 * compañero solo ve el suyo; el homenajeado los ve todos) — no es el mismo
 * concepto que el "muro" público de cumpleaños clásico.
 */
export type TipoCelebracion = 'cumpleanos' | 'aniversario_laboral';

export interface CelebracionHomenajeado {
  colaborador_id: number;
  nombre: string;
  puesto?: string | null;
  sucursal?: string | null;
  /** Streaming autenticado (Bearer) — `null` si no tiene foto. */
  foto_url: string | null;
}

/** `GET /api/v1/celebraciones/activas` y `GET /api/v1/celebraciones/{id}`. */
export interface Celebracion {
  id: number;
  tipo: TipoCelebracion;
  tipo_etiqueta: string;
  fecha: string;
  es_hoy: boolean;
  /** Años cumplidos (edad o antigüedad) — `null` si el backend no los calculó para este tipo. */
  anios: number | null;
  titulo: string;
  mensaje_tarjeta: string | null;
  homenajeado: CelebracionHomenajeado;
  /** Streaming autenticado (Bearer) — imagen PNG de la tarjeta. */
  tarjeta_url: string;
  recibe_mensajes: boolean;
  es_mia: boolean;
  puede_escribir: boolean;
  puede_ver_todos: boolean;
  mi_mensaje: CelebracionMensaje | null;
  /** `null` si el viewer no puede ver todos los mensajes (solo el suyo). */
  mensajes_count: number | null;
  enviada_at: string | null;
  avisada_todos_at: string | null;
  puede_enviar: boolean;
  puede_moderar: boolean;
}

export interface CelebracionMensajeAutor {
  id: number | null;
  nombre: string | null;
  puesto?: string | null;
}

export interface CelebracionMensaje {
  id: number;
  mensaje: string | null;
  foto_url: string | null;
  autor: CelebracionMensajeAutor;
  es_mio: boolean;
  puede_eliminar: boolean;
  creado_en: string;
}

/** Fila de `GET /rh/celebraciones/aniversarios` (`CelebracionService::filasAniversarios()`, misma forma que la web). */
export interface RhAniversarioFila {
  colaborador_id: number;
  nombre: string;
  puesto?: string | null;
  sucursal?: string | null;
  departamento?: string | null;
  foto_url: string | null;
  fecha: string;
  es_hoy: boolean;
  anios: number;
  /** Ya redactado por el backend: "6 años en MR. LANA". */
  detalle: string;
  /** `null` hasta que el scheduler genere el evento del día — igual que `greeting_id` en cumpleaños clásico. */
  celebracion_id: number | null;
  enviada_at: string | null;
  avisada_todos_at: string | null;
}
