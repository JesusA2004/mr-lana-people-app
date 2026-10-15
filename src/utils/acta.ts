/**
 * Presentación de actas (solo consulta en la app). Las actas se levantan y
 * completan desde el Portal RH en la web: la app no crea, edita ni opera
 * actas (formato único «Acta administrativa circunstanciada»).
 */

export const AVISO_ACTAS_SOLO_CONSULTA = 'Las actas se levantan y completan desde el Portal RH en la web.';

const LABEL: Record<string, string> = {
  borrador: 'Borrador',
  generada: 'Formato generado',
  firmada: 'Firmada',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
};

export function actaEstadoLabel(estado: string): string {
  return LABEL[estado] ?? estado;
}

export function actaBadge(estado: string): string {
  if (estado === 'borrador') return 'pendiente';
  if (estado === 'cerrada') return 'cerrada';
  if (estado === 'cancelada') return 'cancelada';
  if (estado === 'firmada') return 'aprobado';
  return 'en_revision';
}

/** `App\Enums\TipoIncidenciaActa::etiqueta()` (respaldo si la API no manda `catalogos`). */
export const INCIDENCIAS_ACTA: Record<string, string> = {
  inasistencia: 'Inasistencia',
  retardo: 'Retardo',
  incumplimiento_instrucciones: 'Incumplimiento de instrucciones',
  incidencia_operativa: 'Incidencia operativa',
  irregularidad_bienes: 'Irregularidad relacionada con bienes de la empresa',
  otra: 'Otra situación laboral',
};

/** `App\Enums\CaracterLevantamientoActa::etiqueta()`. */
export const CARACTERES_ACTA: Record<string, string> = {
  recursos_humanos: 'Recursos Humanos',
  gerente: 'Gerente',
  jefe_directo: 'Jefe directo',
  responsable_autorizado: 'Responsable autorizado',
};

/** `App\Enums\RelacionTestigoActa::etiqueta()`. */
export const RELACIONES_TESTIGO_ACTA: Record<string, string> = {
  presencio_directamente: 'Presenció directamente los hechos',
  conocimiento_posterior: 'Tuvo conocimiento posterior de los hechos',
  a_cargo_del_area: 'Estaba a cargo del área',
  otra: 'Otra',
};

/** Constancia de entrega de copia (`ActaService::registrarEntrega`). */
export function actaEntregaLabel(estado: string | null | undefined): string {
  if (estado === 'entregada') return 'Copia entregada al trabajador';
  if (estado === 'no_posible') return 'No fue posible entregar la copia';
  return 'Entrega de copia pendiente';
}
