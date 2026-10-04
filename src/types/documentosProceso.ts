/**
 * "Documentos del proceso" — `GET /api/v1/rh/documentos-proceso/*`.
 * El backend (DocumentoProcesoService) decide qué documento oficial toca,
 * su estado y las acciones permitidas; la app solo lo pinta.
 */
export type TipoRegistroDocumental = 'contrato' | 'cierre' | 'solicitud' | 'prestamo' | 'evaluacion' | 'entrega_activo';

export interface AccionDocumentoProceso {
  clave: string;
  etiqueta: string;
  tipo: string;
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
  documentoId: number | null;
  generadoEn: string | null;
  firmado: boolean;
  escaneado: boolean;
  archivado: boolean;
  requiereHuella: boolean;
  requiereTestigos: boolean;
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
}
