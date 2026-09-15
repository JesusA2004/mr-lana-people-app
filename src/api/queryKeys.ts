/** Fábrica central de query keys — evita strings mágicos repetidos al invalidar. */
export const queryKeys = {
  bootstrap: ['bootstrap'] as const,
  dashboard: ['dashboard'] as const,
  perfil: ['perfil'] as const,
  /** El backend no separa "expediente" de "incorporación": mismo endpoint real (ver src/api/incorporacion.ts). */
  incorporacion: ['incorporacion'] as const,
  solicitudes: ['solicitudes'] as const,
  solicitud: (id: string | number) => ['solicitudes', String(id)] as const,
  solicitudesConfiguracion: ['solicitudes', 'configuracion'] as const,
  vacacionesSaldo: ['vacaciones', 'saldo'] as const,
  vacacionesSolicitudes: ['vacaciones', 'solicitudes'] as const,
  notificaciones: ['notificaciones'] as const,
  cumpleanosFelicitacionActual: ['cumpleanos', 'felicitacion-actual'] as const,
  appConfig: ['app', 'config'] as const,
  appReleaseLatest: (platform: string) => ['app', 'releases', 'latest', platform] as const,

  // Gestión RH — namespace propio para poder invalidar todo con un solo predicate si hace falta.
  rhDashboard: ['rh', 'dashboard'] as const,
  rhPendientes: (params: Record<string, unknown> = {}) => ['rh', 'pendientes', params] as const,
  rhSolicitudes: (params: Record<string, unknown> = {}) => ['rh', 'solicitudes', params] as const,
  rhSolicitud: (id: string | number) => ['rh', 'solicitudes', String(id)] as const,
  /** @deprecated Bandeja RH legacy (`solicitudes_vacaciones`) — ver `src/api/rh/vacaciones.ts`. */
  rhVacaciones: (params: Record<string, unknown> = {}) => ['rh', 'vacaciones', params] as const,
  /** @deprecated Igual que arriba. */
  rhVacacion: (id: string | number) => ['rh', 'vacaciones', String(id)] as const,
  rhVacantes: (params: Record<string, unknown> = {}) => ['rh', 'vacantes', params] as const,
  rhDocumentos: (params: Record<string, unknown> = {}) => ['rh', 'documentos', params] as const,
  rhDocumento: (id: string | number) => ['rh', 'documentos', String(id)] as const,
  rhIncorporaciones: (params: Record<string, unknown> = {}) => ['rh', 'incorporaciones', params] as const,
  rhIncorporacion: (id: string | number) => ['rh', 'incorporaciones', String(id)] as const,
  rhColaboradores: (params: Record<string, unknown> = {}) => ['rh', 'colaboradores', params] as const,
  rhColaborador: (id: string | number) => ['rh', 'colaboradores', String(id)] as const,
  rhExpedientes: (params: Record<string, unknown> = {}) => ['rh', 'expedientes', params] as const,
  rhExpediente: (id: string | number) => ['rh', 'expedientes', String(id)] as const,

  rhCumpleanos: (params: Record<string, unknown> = {}) => ['rh', 'cumpleanos', params] as const,
  rhCumpleano: (id: string | number) => ['rh', 'cumpleanos', String(id)] as const,

  rhFormatos: (params: Record<string, unknown> = {}) => ['rh', 'formatos', params] as const,
  rhFormatoPreparation: (formatoId: string | number, colaboradorId: string | number) =>
    ['rh', 'formatos', String(formatoId), 'preparar', String(colaboradorId)] as const,

  rhDocumentExtraction: (documentoId: string | number) => ['rh', 'documentos', String(documentoId), 'extraccion'] as const,

  rhOrganizacion: ['rh', 'organizacion', 'jerarquia'] as const,

  laborDocuments: (params: Record<string, unknown> = {}) => ['colaborador', 'documentos-laborales', params] as const,
  laborDocument: (id: string | number) => ['colaborador', 'documentos-laborales', String(id)] as const,
} as const;

/** Invalida todo lo que empiece con `['rh', ...]` — usado tras cualquier acción de aprobación/rechazo en Gestión RH. */
export const rhQueryKeyPrefix = ['rh'] as const;
