/**
 * "Documentos del proceso" — `GET /api/v1/rh/documentos-proceso/*`.
 * El backend (DocumentoProcesoService) decide qué documento oficial toca,
 * su estado, la línea de tiempo, la SIGUIENTE acción y las acciones
 * permitidas; la app solo lo pinta (nunca decide por puesto ni por rol).
 */
export type TipoRegistroDocumental = 'contrato' | 'cierre' | 'solicitud' | 'prestamo' | 'evaluacion' | 'entrega_activo';

export interface AccionDocumentoProceso {
  clave: string;
  etiqueta: string;
  /** primaria | secundaria | peligro */
  tipo: string;
}

export interface PasoLineaTiempo {
  clave: string;
  etiqueta: string;
  estado: 'hecho' | 'actual' | 'pendiente';
}

export interface ItemDocumentoProceso {
  clave: string;
  nombre: string;
  motivo: string;
  estado: string;
  estadoEtiqueta: string;
  bloqueo: string | null;
  formatoFaltante: string | null;
  masterVersion: number | null;
  /** "Gestor v2", "General v1": formato oficial que se usará. */
  masterEtiqueta: string | null;
  documentoId: number | null;
  generadoEn: string | null;
  generadoPor: string | null;
  firmado: boolean;
  escaneado: boolean;
  archivado: boolean;
  tieneWord: boolean;
  /** false: el registro existe pero el archivo ya no está en el almacenamiento. */
  archivoDisponible: boolean;
  revisionDeId: number | null;
  motivoRevision: string | null;
  requiereHuella: boolean;
  requiereTestigos: boolean;
  lineaTiempo: PasoLineaTiempo[];
  siguienteAccion: AccionDocumentoProceso | null;
  historial: { id: number; estadoEtiqueta: string; versionPlantilla: number | null; generadoEn: string | null; motivoCancelacion: string | null }[];
  acciones: AccionDocumentoProceso[];
}

export interface SeccionDocumentosProceso {
  proceso: string;
  titulo: string;
  descripcion: string;
  registro: { tipo: TipoRegistroDocumental; id: number };
  bloqueo: string | null;
  expedienteCompleto: boolean | null;
  acciones: AccionDocumentoProceso[];
  documentos: ItemDocumentoProceso[];
  negativaRegistrada: boolean;
  testigos: { nombre: string; cargo: string }[];
  checklist: { clave: string; etiqueta: string; cumplido: boolean }[] | null;
}

export interface DatoFaltanteDocumento {
  campo: string;
  fuente: string;
  columna: string;
  etiqueta: string;
  tipo: string;
  editable: boolean;
  /** colaborador | sucursal (se guarda en la ficha) · documento (solo este documento) */
  persistencia: string;
  /** select | fecha | hora | correo | moneda | texto */
  control: string;
  opciones: { value: string; label: string }[];
  sugerencias: string[];
}

/** Errores esperables del motor documental (422 con `code`). */
export interface ErrorMotorDocumental {
  codigo: 'DOCUMENT_TEMPLATE_MISSING' | 'DOCUMENT_CONVERTER_UNAVAILABLE' | 'DOCUMENT_VISUAL_VALIDATION_FAILED' | 'DOCUMENT_FIELD_OVERFLOW';
  titulo: string;
  mensaje: string;
  detalles: string[];
}
