/**
 * Agenda de entrevistas y estudios socioeconómicos — espejo de
 * `AgendaConsultaService::aArray()` (contrato en capacitaciones,
 * docs/AGENDA_API_MOVIL.md). Las banderas `puede` salen del backend: la app
 * nunca decide por rol.
 */
export type TipoAgendaEvento = 'entrevista' | 'socioeconomico';
export type EstadoAgendaEvento = 'programado' | 'realizado' | 'no_asistio' | 'reprogramado' | 'cancelado';

export interface AgendaPuede {
  gestionar: boolean;
  registrar_resultado: boolean;
  ver_datos_candidato: boolean;
  reprogramar: boolean;
  cancelar: boolean;
  capturar: boolean;
}

export interface AgendaCandidato {
  id: number;
  nombre: string;
  puesto: string | null;
  estado: string | null;
  estado_etiqueta: string | null;
  telefono: string | null;
  tiene_cv: boolean | null;
}

export interface AgendaHistorial {
  accion: string;
  estado_nuevo: string | null;
  detalle: string | null;
  usuario: string | null;
  fecha: string | null;
}

export interface AgendaEvento {
  id: number;
  tipo: TipoAgendaEvento | string;
  tipo_etiqueta: string;
  fecha_hora: string;
  fecha: string;
  hora: string;
  estado: EstadoAgendaEvento | string;
  estado_etiqueta: string;
  origen: string;
  origen_etiqueta: string;
  agendado_por: string | null;
  sucursal: { id: number; nombre: string };
  candidato: AgendaCandidato;
  domicilio: string | null;
  notas: string | null;
  resultado: string | null;
  resultado_etiqueta: string | null;
  motivo_no_viable: string | null;
  motivo_no_viable_etiqueta: string | null;
  comentario_resultado: string | null;
  resultado_en: string | null;
  motivo_cancelacion: string | null;
  reprogramado_de_id: number | null;
  reprogramado_a_id: number | null;
  puede: AgendaPuede;
  historial: AgendaHistorial[] | null;
}

export interface AgendaDia {
  fecha: string;
  eventos: AgendaEvento[];
}

export interface AgendaMotivo {
  value: string;
  etiqueta: string;
}

export interface AgendaListado {
  dias: AgendaDia[];
  motivos_no_viable: AgendaMotivo[];
  puede_agendar: boolean;
  puede_alta_candidato: boolean;
}

export interface AgendaOpciones {
  sucursales: { id: number; nombre: string }[];
  candidatos: { id: number; nombre: string; puesto: string | null; sucursal_id: number | null }[];
}

export interface AgendaGuardado {
  evento: AgendaEvento;
  /** Advertencias de empalme en texto: la cita sí se creó. */
  empalmes: string[];
  repetido: boolean;
}

export interface AgendarPayload {
  sucursal_id: number;
  tipo: TipoAgendaEvento;
  fecha: string;
  hora: string;
  candidato_id?: number;
  candidato_nuevo?: { nombre: string; apellidos?: string; telefono?: string };
  notas?: string;
  domicilio?: string;
  clave_idempotencia: string;
}

export interface ReprogramarPayload {
  fecha: string;
  hora: string;
  motivo?: string;
}

export type ResultadoEntrevistaPayload = { resultado: 'viable' } | { resultado: 'no_viable'; motivo: string; comentario: string };

export interface ResultadoSocioeconomicoPayload {
  resultado: 'favorable' | 'no_favorable';
  comentario?: string;
}
