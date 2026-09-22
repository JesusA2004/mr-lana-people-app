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

  // Ciclo laboral — autoservicio del colaborador (backend 2026-09-22).
  laborDocumentsRoot: ['colaborador', 'documentos-laborales'] as const,
  laborDocuments: (params: Record<string, unknown> = {}) => ['colaborador', 'documentos-laborales', params] as const,
  miAlta: ['colaborador', 'alta'] as const,
  miExpediente: ['colaborador', 'expediente'] as const,
  documentosPendientes: ['colaborador', 'documentos-pendientes'] as const,
  misContratos: ['colaborador', 'contratos'] as const,
  misRecibos: ['colaborador', 'recibos'] as const,
  miRecibo: (id: string | number) => ['colaborador', 'recibos', String(id)] as const,
  misPrestamos: ['colaborador', 'prestamos'] as const,
  miPrestamo: (id: string | number) => ['colaborador', 'prestamos', String(id)] as const,
  miJerarquia: ['colaborador', 'jerarquia'] as const,

  // Jefe / evaluaciones / bandeja — compartidos entre Mi espacio y Gestión RH.
  equipo: ['equipo'] as const,
  equipoPendientes: ['equipo', 'pendientes'] as const,
  evaluaciones: ['evaluaciones'] as const,
  evaluacionesList: (params: Record<string, unknown> = {}) => ['evaluaciones', 'list', params] as const,
  evaluacion: (id: string | number) => ['evaluaciones', 'detail', String(id)] as const,
  tareas: ['tareas'] as const,
  tareasList: (params: Record<string, unknown> = {}) => ['tareas', 'list', params] as const,

  // Gestión RH — ciclo laboral (todo bajo `['rh', ...]`).
  rhAlta: (colaboradorId: string | number) => ['rh', 'colaboradores', String(colaboradorId), 'alta'] as const,
  rhColaboradorJerarquia: (colaboradorId: string | number) => ['rh', 'colaboradores', String(colaboradorId), 'jerarquia'] as const,
  rhColaboradorContratos: (colaboradorId: string | number) => ['rh', 'colaboradores', String(colaboradorId), 'contratos'] as const,
  rhDocumentosLaborales: ['rh', 'documentos-laborales'] as const,
  rhDocumentosLaboralesList: (params: Record<string, unknown> = {}) => ['rh', 'documentos-laborales', 'list', params] as const,
  rhDocumentosLaboralesPendientes: ['rh', 'documentos-laborales', 'pendientes'] as const,
  rhDocumentoLaboral: (id: string | number) => ['rh', 'documentos-laborales', 'detail', String(id)] as const,
  rhContratosPorVencer: (dias: number) => ['rh', 'contratos', 'por-vencer', dias] as const,
  rhContratos: ['rh', 'contratos'] as const,
  rhCierres: ['rh', 'cierres'] as const,
  rhCierresList: (params: Record<string, unknown> = {}) => ['rh', 'cierres', 'list', params] as const,
  rhCierre: (id: string | number) => ['rh', 'cierres', 'detail', String(id)] as const,
  rhRecibos: ['rh', 'recibos'] as const,
  rhRecibosList: (params: Record<string, unknown> = {}) => ['rh', 'recibos', 'list', params] as const,
  rhRecibo: (id: string | number) => ['rh', 'recibos', 'detail', String(id)] as const,
  rhPrestamos: ['rh', 'prestamos'] as const,
  rhPrestamosList: (params: Record<string, unknown> = {}) => ['rh', 'prestamos', 'list', params] as const,
  rhPrestamo: (id: string | number) => ['rh', 'prestamos', 'detail', String(id)] as const,
  rhActas: ['rh', 'actas'] as const,
  rhActasList: (params: Record<string, unknown> = {}) => ['rh', 'actas', 'list', params] as const,
  rhActa: (id: string | number) => ['rh', 'actas', 'detail', String(id)] as const,
  rhCobertura: (params: Record<string, unknown> = {}) => ['rh', 'plantilla', 'cobertura', params] as const,
  rhIndicadores: (params: Record<string, unknown> = {}) => ['rh', 'indicadores', params] as const,
  rhOrganigramaPersonas: (params: Record<string, unknown> = {}) => ['rh', 'organigrama', params] as const,
  rhVacante: (id: string | number) => ['rh', 'vacantes', 'detail', String(id)] as const,
  rhPlantillasDocumentales: ['rh', 'plantillas-documentales'] as const,
} as const;

/** Invalida todo lo que empiece con `['rh', ...]` — usado tras cualquier acción de aprobación/rechazo en Gestión RH. */
export const rhQueryKeyPrefix = ['rh'] as const;
