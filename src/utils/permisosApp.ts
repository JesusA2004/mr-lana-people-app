/**
 * Permisos por botón de la app (backend 2026-11-18,
 * `App\Support\CatalogoPermisosAppMovil` en capacitaciones): llegan en
 * `mobile/bootstrap` → `permisos_app` como mapa `permiso → puede`, ya con
 * el rol y los permisos especiales de la persona.
 *
 * Tolerante a backends anteriores: si el campo (o la clave) no viene, el
 * botón se ofrece como siempre — nunca se oculta algo por un backend viejo.
 * El backend vuelve a exigir cada permiso (403 con el motivo).
 */
export type PermisoApp =
  | 'app.solicitudes.ver'
  | 'app.solicitudes.crear_permiso'
  | 'app.solicitudes.crear_incapacidad'
  | 'app.solicitudes.crear_constancia'
  | 'app.solicitudes.crear_actualizacion'
  | 'app.solicitudes.crear_prestamo'
  | 'app.solicitudes.crear_baja'
  | 'app.solicitudes.crear_general'
  | 'app.solicitudes.adjuntar'
  | 'app.solicitudes.cancelar'
  | 'app.solicitudes.responder_correccion'
  | 'app.solicitudes.descargar_formato'
  | 'app.vacaciones.ver'
  | 'app.vacaciones.solicitar'
  | 'app.expediente.ver'
  | 'app.perfil.cambiar_foto'
  | 'app.documentos_laborales.ver'
  | 'app.documentos_laborales.descargar'
  | 'app.documentos_laborales.firmar'
  | 'app.recibos.ver'
  | 'app.prestamos.ver'
  | 'app.carta_compromiso.ver'
  | 'app.carta_compromiso.solicitar'
  | 'app.descriptivo_puesto.acusar'
  | 'app.induccion.ver'
  | 'app.induccion.contestar'
  | 'app.induccion.presentacion'
  | 'app.avisos.ver'
  | 'app.celebraciones.ver'
  | 'app.celebraciones.felicitar'
  | 'app.jerarquia.ver'
  | 'app.equipo.ver'
  | 'app.equipo.visto_bueno'
  /** Permiso web de siempre; el backend ya resuelve «Corporativo entra siempre». */
  | 'directorio.ver';

export type PermisosAppMapa = Record<string, boolean | undefined>;

/** Ausente (backend anterior o clave nueva) = se ofrece como hoy. */
export function puedeEnApp(mapa: PermisosAppMapa | null | undefined, permiso: PermisoApp): boolean {
  const valor = mapa?.[permiso];
  return valor === undefined ? true : valor === true;
}

/**
 * Permiso de la app para CREAR una solicitud del tipo dado (espejo de
 * `CatalogoPermisosAppMovil::permisoParaCrear`). Tipo desconocido → null
 * (no se filtra).
 */
export function permisoCrearSolicitud(tipo: string): PermisoApp | null {
  if (tipo === 'vacaciones') return 'app.vacaciones.solicitar';
  if (
    tipo === 'permiso' ||
    tipo === 'permiso_con_goce' ||
    tipo === 'permiso_sin_goce' ||
    tipo === 'permiso_tiempo' ||
    tipo === 'salida_temprano' ||
    tipo === 'llegada_tarde' ||
    tipo.startsWith('permiso_especial_')
  ) {
    return 'app.solicitudes.crear_permiso';
  }
  if (tipo === 'incapacidad') return 'app.solicitudes.crear_incapacidad';
  if (tipo === 'constancia_laboral') return 'app.solicitudes.crear_constancia';
  if (tipo === 'actualizacion_datos' || tipo === 'actualizacion_bancaria' || tipo === 'reposicion_documental') return 'app.solicitudes.crear_actualizacion';
  if (tipo === 'prestamo') return 'app.solicitudes.crear_prestamo';
  if (tipo === 'baja_colaborador') return 'app.solicitudes.crear_baja';
  if (tipo === 'solicitud_general') return 'app.solicitudes.crear_general';
  return null;
}

/** Permisos que abren «Nueva solicitud» (basta uno). */
export const PERMISOS_CREAR_SOLICITUD: PermisoApp[] = [
  'app.vacaciones.solicitar',
  'app.solicitudes.crear_permiso',
  'app.solicitudes.crear_incapacidad',
  'app.solicitudes.crear_constancia',
  'app.solicitudes.crear_actualizacion',
  'app.solicitudes.crear_prestamo',
  'app.solicitudes.crear_baja',
  'app.solicitudes.crear_general',
];

export function puedeCrearAlgunaSolicitud(puede: (permiso: PermisoApp) => boolean): boolean {
  return PERMISOS_CREAR_SOLICITUD.some((permiso) => puede(permiso));
}
