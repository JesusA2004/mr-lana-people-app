/**
 * Motor de aprobaciones (backend 2026-10-20) — espejo del «Contrato API del
 * flujo» de `capacitaciones/docs/SOLICITUDES_UNIFICADAS.md`
 * (`AprobacionOrganizacionalService::flujo()`). TODO viene calculado por el
 * backend para la cuenta que consulta: la app NUNCA decide quién aprueba ni
 * si el usuario puede actuar; solo pinta el resultado.
 */

/** Estado de un paso del flujo. Un valor nuevo del backend no rompe la app. */
export type EstadoPasoFlujo = 'aprobado' | 'pendiente' | 'esperando' | 'no_aplica' | 'rechazado' | (string & {});

/** Qué puede hacer la cuenta actual ahora mismo (`null` = nada). */
export type AccionUsuarioActual = 'visto_bueno' | 'aprobar' | 'autorizar_prestamo' | null;

export interface PersonaFlujo {
  /** Id de COLABORADOR (persona), no de usuario. */
  id: number | null;
  nombre: string;
}

export interface PasoFlujo {
  orden: number;
  clave: string;
  rol: string | null;
  etiqueta: string;
  responsable: PersonaFlujo | null;
  responsables: PersonaFlujo[];
  estado: EstadoPasoFlujo;
  estado_etiqueta: string | null;
  fecha: string | null;
  comentario: string | null;
  decidio: PersonaFlujo | null;
  /** Un paso `pendiente` detenido por la estructura (p. ej. «Pendiente de asignar región de aprobación»). */
  bloqueado: boolean;
  puede_actuar: boolean;
  /** Texto humano listo para mostrarse. */
  motivo_no_puede: string | null;
}

export interface PendienteDe {
  clave: string | null;
  etiqueta: string | null;
  nombres: string[];
  /** «Pendiente de aprobación de: Alberto Carlos Bueno». */
  texto: string | null;
}

export interface FlujoAprobacion {
  pasos: PasoFlujo[];
  puede_actuar_usuario_actual: boolean;
  accion_usuario_actual: AccionUsuarioActual;
  motivo_no_puede: string | null;
  pendiente_de: PendienteDe | null;
  estado_flujo_texto: string | null;
}

/** `GET /api/v1/equipo/aprobaciones/conteo` → `{ visto_bueno, autorizar, total }`. */
export interface ConteoAprobaciones {
  visto_bueno: number;
  autorizar: number;
  total: number;
}

/** De qué bandeja vino el elemento: define qué endpoint resuelve la acción. */
export type OrigenAprobacion = 'equipo' | 'rh';

/**
 * Elemento de la bandeja de aprobaciones de la app (jefes, gerentes,
 * regionales y RH): une `GET /equipo/pendientes` (vistos buenos) y
 * `GET /rh/solicitudes` (autorización final).
 */
export interface AprobacionItem {
  id: number;
  origen: OrigenAprobacion;
  folio: string | null;
  tipo: string;
  tipo_etiqueta: string;
  estado: string;
  solicitante: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  monto_solicitado: number | null;
  motivo: string | null;
  creada_en: string | null;
  flujo: FlujoAprobacion;
}

export interface BandejaAprobaciones {
  /** Me toca ahora (`puede_actuar_usuario_actual`). */
  meToca: AprobacionItem[];
  /** Me tocará en un paso posterior / la veo sin poder actuar todavía. */
  enEspera: AprobacionItem[];
}
