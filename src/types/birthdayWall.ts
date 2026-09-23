/**
 * Muro de felicitaciones de cumpleaños — espejo de
 * `App\Services\Cumpleanos\MuroCumpleanosService::aArray/mensajeArray`
 * (capacitaciones, 2026-09-22). RH abre el muro; cualquier colaborador
 * activo deja un mensaje y/o una foto.
 */

export interface BirthdayWallPerson {
  id: number | null;
  nombre: string | null;
  puesto?: string | null;
  sucursal?: string | null;
  /** Streaming autenticado (Bearer) — solo mientras el muro esté publicado. */
  foto_url?: string | null;
}

export interface BirthdayWall {
  id: number;
  fecha: string;
  es_hoy: boolean;
  abierto: boolean;
  abierto_at: string | null;
  cerrado_at: string | null;
  mensajes_count: number;
  es_mi_muro: boolean;
  puede_gestionar: boolean;
  cumpleanero: BirthdayWallPerson;
}

export interface BirthdayWallMessage {
  id: number;
  mensaje: string | null;
  foto_url: string | null;
  autor: { id: number | null; nombre: string | null; puesto?: string | null };
  es_mio: boolean;
  puede_eliminar: boolean;
  creado_en: string;
}

/** Bloque `muro` del detalle RH (`GET /rh/cumpleanos/{greeting}`). */
export interface RhBirthdayWallState {
  publicado: boolean;
  abierto: boolean;
  abierto_at: string | null;
  cerrado_at: string | null;
  mensajes_count: number;
  puede_gestionar: boolean;
}
