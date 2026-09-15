import type { Ionicons } from '@expo/vector-icons';

import type { KnownRequestType, RequestType, SolicitudCampo } from '@/types/request';

/**
 * Presentación (ícono, descripción, agrupación) de cada tipo de solicitud.
 * SOLO cosmético: qué tipos existen y qué campos pide cada uno lo manda
 * `GET /api/v1/solicitudes/configuracion`. Un tipo que el backend agregue y
 * que no esté aquí se dibuja igual, con el ícono neutro — nunca se filtra
 * la lista por este catálogo.
 */

/** Familias usadas por los filtros de "Mis solicitudes" (sección 48 del encargo). */
export type RequestFamily = 'vacaciones' | 'permisos' | 'incapacidades' | 'prestamos' | 'otras';

export interface RequestTypePresentation {
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  family: RequestFamily;
}

const PRESENTATION: Record<KnownRequestType, RequestTypePresentation> = {
  vacaciones: { icon: 'airplane-outline', description: 'Toma tus días con goce de sueldo.', family: 'vacaciones' },
  permiso_con_goce: { icon: 'checkmark-done-outline', description: 'Ausencia manteniendo tu sueldo.', family: 'permisos' },
  permiso_sin_goce: { icon: 'exit-outline', description: 'Ausencia sin percepción salarial.', family: 'permisos' },
  permiso_tiempo: { icon: 'hourglass-outline', description: 'Necesito unas horas de un día.', family: 'permisos' },
  salida_temprano: { icon: 'log-out-outline', description: 'Salir antes de tu horario un día.', family: 'permisos' },
  llegada_tarde: { icon: 'alarm-outline', description: 'Llegar más tarde de lo normal un día.', family: 'permisos' },
  incapacidad: { icon: 'medkit-outline', description: 'Registra tu incapacidad médica.', family: 'incapacidades' },
  constancia_laboral: { icon: 'document-text-outline', description: 'Constancia emitida por RH.', family: 'otras' },
  actualizacion_datos: { icon: 'person-outline', description: 'Corrige tu información personal.', family: 'otras' },
  actualizacion_bancaria: { icon: 'card-outline', description: 'Actualiza tu cuenta de pago.', family: 'otras' },
  reposicion_documental: { icon: 'reader-outline', description: 'Repón un documento de tu expediente.', family: 'otras' },
  prestamo: { icon: 'cash-outline', description: 'Solicita apoyo económico interno.', family: 'prestamos' },
  baja_colaborador: { icon: 'person-remove-outline', description: 'Inicia la baja de alguien de tu equipo.', family: 'otras' },
  permiso_especial_cumpleanos: { icon: 'gift-outline', description: 'Tu día libre de cumpleaños.', family: 'permisos' },
  permiso_especial_paternidad: { icon: 'people-outline', description: 'Días por nacimiento o adopción.', family: 'permisos' },
  permiso_especial_fallecimiento: { icon: 'heart-dislike-outline', description: 'Días por el fallecimiento de un familiar.', family: 'permisos' },
  solicitud_general: { icon: 'chatbubble-ellipses-outline', description: '¿Necesitas algo distinto? Escríbenos.', family: 'otras' },
};

const FALLBACK: RequestTypePresentation = {
  icon: 'document-outline',
  description: 'Solicitud disponible en tu empresa.',
  family: 'otras',
};

export function requestTypePresentation(tipo: RequestType | undefined): RequestTypePresentation {
  if (!tipo) return FALLBACK;
  return PRESENTATION[tipo as KnownRequestType] ?? FALLBACK;
}

export function requestFamily(tipo: RequestType | undefined): RequestFamily {
  return requestTypePresentation(tipo).family;
}

/** Copy humano de los permisos especiales (sección 50): el backend valida los días, la app solo acompaña. */
export const SPECIAL_LEAVE_COPY: Partial<Record<KnownRequestType, string>> = {
  permiso_especial_cumpleanos: 'Es tu día: cuéntanos cuándo quieres tomarlo y RH confirma los días que te corresponden.',
  permiso_especial_paternidad: 'Felicidades. RH revisa la documentación y confirma los días que te corresponden por ley y por política interna.',
  permiso_especial_fallecimiento: 'Lamentamos tu pérdida. Envía la solicitud y RH la atiende con prioridad; los días los determina la política de la empresa.',
};

/**
 * Etiqueta, placeholder y ayuda de cada campo de `campos[]`. El backend
 * manda solo `name`/`type`/`required` — la redacción vive aquí para no
 * mostrarle `dias_solicitados` tal cual a un colaborador.
 */
export interface RequestFieldCopy {
  label: string;
  placeholder?: string;
  helper?: string;
  multiline?: boolean;
}

const FIELD_COPY: Record<string, RequestFieldCopy> = {
  motivo: { label: 'Motivo', placeholder: 'Describe brevemente tu solicitud', multiline: true },
  observaciones: { label: 'Observaciones (opcional)', placeholder: 'Detalle adicional para Recursos Humanos', multiline: true },
  fecha_inicio: { label: 'Fecha de inicio' },
  fecha_fin: { label: 'Fecha de fin' },
  dias_solicitados: { label: 'Días solicitados', placeholder: '0', helper: 'Recursos Humanos valida el saldo disponible.' },
  monto_solicitado: { label: 'Monto solicitado', placeholder: '0.00', helper: 'Cantidad en pesos mexicanos.' },
  plazo_meses: { label: 'Plazo en meses (opcional)', placeholder: '12', helper: 'Máximo 36 meses.' },
  colaborador_objetivo_id: { label: 'Colaborador', helper: 'Solo puedes elegir personas dentro de tu alcance.' },
  fecha_efectiva: { label: 'Fecha efectiva de la baja' },
  tipo_baja: { label: 'Tipo de baja' },
};

const FALLBACK_FIELD_COPY = (name: string): RequestFieldCopy => ({
  label: name.replace(/[_-]+/g, ' ').replace(/^./, (char) => char.toUpperCase()),
});

export function requestFieldCopy(name: string): RequestFieldCopy {
  return FIELD_COPY[name] ?? FALLBACK_FIELD_COPY(name);
}

/**
 * Campo especial que se dibuja con un control dedicado en vez del control
 * genérico de su `type` (dinero, selector de colaborador, catálogo de baja).
 */
export function specialFieldKind(campo: SolicitudCampo): 'money' | 'employee' | 'tipo_baja' | null {
  if (campo.name === 'monto_solicitado') return 'money';
  if (campo.name === 'colaborador_objetivo_id') return 'employee';
  if (campo.name === 'tipo_baja') return 'tipo_baja';
  return null;
}

/**
 * Espejo LITERAL de `App\Enums\TipoBaja` (leído del código fuente del
 * backend, no inventado). No hay endpoint que exponga este catálogo hoy —
 * gap D-3 en `docs/BACKEND_SYNC_2026_09_15.md`: mientras no exista, esta
 * lista debe revisarse contra el enum en cada sincronización, porque
 * `StoreSolicitudInternaRequest` valida `tipo_baja` con `Rule::in(TipoBaja)`
 * y un valor de más aquí sería un 422 en producción.
 */
export const TIPO_BAJA_OPTIONS: { value: string; label: string }[] = [
  { value: 'renuncia', label: 'Renuncia voluntaria' },
  { value: 'despido', label: 'Despido' },
  { value: 'mutuo_acuerdo', label: 'Mutuo acuerdo' },
  { value: 'fin_contrato', label: 'Fin de contrato' },
  { value: 'abandono', label: 'Abandono de empleo' },
  { value: 'otro', label: 'Otro' },
];
