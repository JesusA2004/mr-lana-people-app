/**
 * «Tu siguiente paso» — `GET /colaborador/guia`
 * (`GuiaSiguientePasoService` + `ExpedienteIncompletoService` del backend).
 * El backend ORDENA los pendientes y decide estado, textos y destino; la app
 * solo los pinta y traduce `accion.app` a una ruta.
 */

export type EstadoPasoGuia = 'hecho' | 'en_revision' | 'pendiente' | 'rechazado' | 'espera';

export type GrupoPasoGuia = 'datos' | 'foto' | 'documentos' | 'induccion' | 'firmas';

/** Pantalla de la app a la que lleva un paso (contrato con el backend). */
export type DestinoPasoGuia =
  | 'completar-datos'
  | 'foto'
  | 'documento'
  | 'induccion'
  | 'induccion-documento'
  | 'induccion-video'
  | 'induccion-evaluacion'
  | 'documento-laboral'
  | 'descriptivo-puesto';

export interface AccionPasoGuia {
  etiqueta: string;
  destino: DestinoPasoGuia;
  params: Record<string, number | string>;
}

export interface PasoGuia {
  clave: string;
  grupo: GrupoPasoGuia;
  titulo: string;
  descripcion: string;
  estado: EstadoPasoGuia;
  estadoEtiqueta: string;
  /** Motivo de RH cuando rechazó (documento o foto). */
  motivo: string | null;
  /** Líneas legibles (p. ej. «Domicilio: Calle, Colonia»). */
  detalle: string[];
  /** null = no hay nada que hacer aquí (o el destino no existe en esta versión). */
  accion: AccionPasoGuia | null;
  /** Este paso es parte de lo que bloquea el autoservicio. */
  bloqueaApp: boolean;
}

export interface MotivoBloqueoExpediente {
  clave: string;
  titulo: string;
  detalle: string[];
  conteo: number;
}

/** `expediente_incompleto` del bootstrap y del 423 «expediente_incompleto». */
export interface EstadoExpedienteIncompleto {
  aplica: boolean;
  bloqueado: boolean;
  mensaje: string | null;
  motivos: MotivoBloqueoExpediente[];
  datosFaltantes: number;
  documentosPorSubir: number;
  documentosRechazados: number;
}

export interface GuiaColaborador {
  pasos: PasoGuia[];
  siguiente: PasoGuia | null;
  resumen: {
    total: number;
    hechos: number;
    enRevision: number;
    porHacer: number;
    enEspera: number;
    todoListo: boolean;
  };
  induccion: { activa: boolean; estado: string; porcentaje: number };
  bloqueo: EstadoExpedienteIncompleto;
}
