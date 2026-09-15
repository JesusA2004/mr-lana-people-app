/**
 * Fixtures de contrato — copias LITERALES de lo que el backend real
 * (`capacitaciones/main`, auditado el 2026-09-15) serializa hoy. Cada una
 * cita la clase PHP exacta que la produce.
 *
 * Regla: si un test necesita un campo que no está aquí, el arreglo NO se
 * "completa a mano" — primero hay que confirmar que el backend lo manda de
 * verdad. Estas fixtures son el contrato; inventar campos aquí es cómo se
 * introdujeron los bugs que esta sincronización vino a corregir.
 */

/**
 * `GET /api/v1/solicitudes/configuracion`
 * → `Api\V1\SolicitudController::configuracion()`
 *   = `response()->json(['tipos' => $this->solicitudes->tiposConFormulario()])`
 *
 * OJO: la envoltura es `tipos`, NO `data`.
 */
export const configuracionResponse = {
  tipos: [
    {
      clave: 'vacaciones',
      nombre: 'Vacaciones',
      requiere_fechas: true,
      requiere_horario: false,
      requiere_dias: true,
      requiere_monto: false,
      requiere_colaborador_objetivo: false,
      requiere_motivo: true,
      permite_adjuntos: true,
      campos: [
        { name: 'fecha_inicio', type: 'date', required: true },
        { name: 'fecha_fin', type: 'date', required: true },
        { name: 'motivo', type: 'text', required: true },
        { name: 'observaciones', type: 'text', required: false },
        { name: 'dias_solicitados', type: 'number', required: true },
      ],
    },
    {
      clave: 'permiso_tiempo',
      nombre: 'Permiso por tiempo (horas)',
      requiere_fechas: false,
      requiere_horario: true,
      requiere_dias: false,
      requiere_monto: false,
      requiere_colaborador_objetivo: false,
      requiere_motivo: true,
      permite_adjuntos: true,
      campos: [
        { name: 'fecha_inicio', type: 'date', required: true },
        { name: 'motivo', type: 'text', required: true },
        { name: 'observaciones', type: 'text', required: false },
      ],
    },
    {
      clave: 'prestamo',
      nombre: 'Préstamo interno',
      requiere_fechas: false,
      requiere_horario: false,
      requiere_dias: false,
      requiere_monto: true,
      requiere_colaborador_objetivo: false,
      requiere_motivo: true,
      permite_adjuntos: true,
      campos: [
        { name: 'motivo', type: 'text', required: true },
        { name: 'observaciones', type: 'text', required: false },
        { name: 'monto_solicitado', type: 'number', required: true },
        { name: 'plazo_meses', type: 'number', required: false },
      ],
    },
    {
      clave: 'baja_colaborador',
      nombre: 'Baja de colaborador',
      requiere_fechas: false,
      requiere_horario: false,
      requiere_dias: false,
      requiere_monto: false,
      requiere_colaborador_objetivo: true,
      requiere_motivo: true,
      permite_adjuntos: true,
      // El backend SOLO emite `colaborador_objetivo_id` aquí, aunque
      // `StoreSolicitudInternaRequest` también exija `fecha_efectiva` y
      // `tipo_baja` (gap D-2).
      campos: [
        { name: 'motivo', type: 'text', required: true },
        { name: 'observaciones', type: 'text', required: false },
        { name: 'colaborador_objetivo_id', type: 'select', required: true },
      ],
    },
    {
      clave: 'solicitud_general',
      nombre: 'Solicitud general',
      requiere_fechas: false,
      requiere_horario: false,
      requiere_dias: false,
      requiere_monto: false,
      requiere_colaborador_objetivo: false,
      requiere_motivo: true,
      permite_adjuntos: true,
      campos: [
        { name: 'motivo', type: 'text', required: true },
        { name: 'observaciones', type: 'text', required: false },
      ],
    },
  ],
};

/**
 * `GET /api/v1/solicitudes/{id}` → `SolicitudInternaResource`.
 * Estos 13 campos son TODO lo que serializa: sin adjuntos ni historial.
 */
export const solicitudResource = {
  id: 184,
  folio: 'SOL-2026-000184',
  tipo: 'vacaciones',
  tipo_etiqueta: 'Vacaciones',
  estado: 'enviada',
  estado_etiqueta: 'Enviada',
  fecha_inicio: '2026-10-05',
  fecha_fin: '2026-10-09',
  motivo: 'Descanso familiar',
  observaciones: null,
  motivo_rechazo: null,
  revisado_en: null,
  creada_en: '2026-09-15T10:12:03-06:00',
};

/** `POST /api/v1/solicitudes/{id}/adjuntos` → 201. SOLO un mensaje. */
export const adjuntoResponse = {
  message: 'Adjunto agregado correctamente.',
};

/** `POST /api/v1/solicitudes/{id}/cancelar` → `['message' => ..., 'data' => Resource]`. */
export const cancelarResponse = {
  message: 'Solicitud cancelada.',
  data: { ...solicitudResource, estado: 'cancelada', estado_etiqueta: 'Cancelada' },
};

/**
 * Un elemento de `GET /api/v1/notificaciones`
 * → `Colaboradores\NotificacionesService::aArray()`.
 */
export const notificacionItem = {
  id: '9f2c1a4e-5b6d-4c8a-9e1f-2b3c4d5e6f70',
  tipo: 'solicitud',
  emoji: '📝',
  color: 'info',
  titulo: 'Tu solicitud cambió de estado',
  mensaje: 'Vacaciones · Enviada → En revisión',
  url: '/solicitudes/184',
  leida: false,
  creada_en: 'hace 2 horas',
  creada_en_iso: '2026-09-15T08:12:03-06:00',
  created_at: '2026-09-15T08:12:03-06:00',
  data: { type: 'solicitud', resource_id: 184 },
};

/** Notificación de un tipo que la app todavía no conoce — debe degradar, no romper. */
export const notificacionDesconocida = {
  id: '11111111-2222-3333-4444-555555555555',
  tipo: 'modulo_futuro',
  emoji: '🔔',
  color: 'neutral',
  titulo: 'Aviso nuevo',
  mensaje: 'Algo que esta versión de la app no conoce.',
  url: null,
  leida: false,
  creada_en: 'hace 1 minuto',
  creada_en_iso: '2026-09-15T10:11:03-06:00',
  created_at: '2026-09-15T10:11:03-06:00',
  data: { type: 'modulo_futuro', resource_id: null },
};

/** Notificación de cumpleaños: única que usa el color `celebracion`. */
export const notificacionCumpleanos = {
  id: '22222222-3333-4444-5555-666666666666',
  tipo: 'cumpleanos',
  emoji: '🎂',
  color: 'celebracion',
  titulo: '¡Feliz cumpleaños!',
  mensaje: 'Todo MR. LANA te desea un gran día.',
  url: null,
  leida: false,
  creada_en: 'hoy',
  creada_en_iso: '2026-09-15T07:00:00-06:00',
  created_at: '2026-09-15T07:00:00-06:00',
  data: { type: 'cumpleanos', resource_id: null },
};

/** `GET /api/v1/rh/solicitudes/{id}` → `Rh\SolicitudController::show()`. */
export const rhSolicitudDetalle = {
  data: {
    id: 184,
    folio: 'SOL-2026-000184',
    tipo: 'vacaciones',
    estado: 'enviada',
    colaborador: {
      id: 42,
      nombre: 'Ana López Rivera',
      numero_empleado: 'MX-0042',
      puesto: 'Cajera',
      sucursal: 'Matriz',
    },
    fecha_inicio: '2026-10-05',
    fecha_fin: '2026-10-09',
    motivo: 'Descanso familiar',
    motivo_rechazo: null,
    adjuntos: [{ id: 7, nombre: 'constancia.pdf' }],
    acciones_permitidas: ['ver', 'aprobar', 'rechazar', 'solicitar_correccion'],
    workflow: {
      estado: 'enviada',
      etapa_actual: { clave: 'rh', nombre: 'Revisión RH' },
      progreso: { actual: 0, total: 1 },
      flujo: [{ etapa: 'rh', estado: 'pendiente', usuario: null, fecha: null }],
      siguiente_etapa: null,
    },
    historial: [{ accion: 'creada', comentario: null, usuario: 'Ana López Rivera', fecha: '2026-09-15T10:12:03-06:00' }],
  },
};

/** `GET /api/v1/rh/vacantes` → `Rh\VacanteController::index()`. Solo lectura. */
export const rhVacantesResponse = {
  data: [
    {
      id: 12,
      puesto: 'Asesor de ventas',
      departamento: 'Comercial',
      sucursal: 'Matriz',
      motivo: 'Crecimiento de plantilla',
      estado: 'abierta',
      estado_etiqueta: 'Abierta',
      fecha_apertura: '2026-09-01',
      plazas_requeridas: 3,
      plazas_cubiertas: 1,
      plazas_disponibles: 2,
      generada_automaticamente: true,
      candidatos_count: 5,
    },
  ],
  meta: { current_page: 1, per_page: 15, total: 1 },
};

/** `GET /api/v1/rh/documentos/{id}/extraccion` → OCR. */
export const ocrExtraccionResponse = {
  elegible: true,
  extraccion: {
    id: 33,
    estado: 'pendiente',
    campos: [{ campo: 'curp', valor_extraido: 'LORA900101MDFPVN08', valor_actual: null, confianza: 0.94 }],
  },
};

/** `GET /api/v1/rh/cumpleanos` → bandeja RH de cumpleaños. */
export const rhCumpleanosResponse = {
  data: [
    {
      id: 3,
      colaborador: { id: 42, nombre: 'Ana López Rivera', numero_empleado: 'MX-0042', puesto: 'Cajera', sucursal: 'Matriz' },
      fecha: '2026-09-15',
      estado: 'enviada',
    },
  ],
  meta: { current_page: 1, per_page: 15, total: 1, hoy: 1 },
};

/** `GET /api/v1/mobile/bootstrap` → `Mobile\MobileBootstrapService::bootstrap()`. */
export const bootstrapResponse = {
  user: {
    id: 42,
    name: 'Ana',
    apellidos: 'López Rivera',
    email: 'ana@mr-lana.com',
    estatus: 'activo',
    numero_empleado: 'MX-0042',
    foto_url: null,
    empresa: { id: 1, nombre: 'MR. LANA' },
    sucursal: { id: 2, nombre: 'Matriz' },
    departamento: { id: 3, nombre: 'Comercial' },
    puesto: { id: 4, nombre: 'Cajera' },
    roles: ['colaborador'],
    permissions: ['solicitudes.ver', 'solicitudes.crear', 'vacaciones.ver', 'expedientes.ver'],
  },
  capabilities: { employee: true, rh: false, manager: false, director: false },
  features: {
    incorporacion: true,
    expedientes: true,
    solicitudes: true,
    vacaciones: true,
    notificaciones: true,
    push: true,
    rh_mobile: false,
    maintenance: false,
  },
  counts: {
    notifications: 2,
    tasks: 0,
    documents_pending: 1,
    rh_pendientes: 0,
    rh_solicitudes: 0,
    rh_vacaciones: 0,
    rh_documentos: 0,
    rh_incorporaciones: 0,
  },
  server: { time: '2026-09-15T10:30:00-06:00', timezone: 'America/Mexico_City' },
};

/** Mismo bootstrap, pero de alguien que sí puede crear bajas (gerente). */
export const bootstrapGerente = {
  ...bootstrapResponse,
  user: {
    ...bootstrapResponse.user,
    roles: ['gerente_sucursal'],
    permissions: [...bootstrapResponse.user.permissions, 'solicitudes.bajas.crear', 'rh.colaboradores.ver', 'vacantes.ver'],
  },
  capabilities: { employee: true, rh: true, manager: true, director: false },
};

/** `GET /api/v1/vacaciones/saldo` → `VacacionesService::saldo()` (legacy, solo lectura). */
export const saldoVacaciones = {
  antiguedad_anios: 3,
  vigencia_inicio: '2026-03-01',
  vigencia_fin: '2027-02-28',
  dias_generados: 14,
  dias_usados: 4,
  dias_en_solicitud: 5,
  dias_disponibles: 5,
};

/** 422 real al aprobar una baja sin finiquito revisado (`SolicitudesService::cambiarEstado`). */
export const bajaSinFiniquito422 = {
  message: 'The given data was invalid.',
  errors: { finiquito: ['Calcula y revisa el finiquito antes de aprobar esta baja.'] },
};

/** 422 real al aprobar una baja sin evidencia adjunta. */
export const bajaSinEvidencia422 = {
  message: 'The given data was invalid.',
  errors: { evidencia: ['Adjunta la evidencia/firma del gerente antes de aprobar esta baja.'] },
};
