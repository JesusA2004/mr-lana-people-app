/**
 * Carta compromiso de documentos pendientes — contrato del backend
 * (capacitaciones): al terminar el registro sin algún documento requerido,
 * la persona firma una carta compromiso con 7 días para subirlos. Si vence
 * (o no hay carta y faltan documentos), la app queda limitada a subir
 * documentos (`bloqueo.activo`).
 */

/**
 * - sin_carta: personal que ya laboraba con documentos faltantes (nunca recibe carta).
 * - carta_vencida: la carta compromiso venció sin entregar lo comprometido.
 * - excede_maximo_carta: nuevo ingreso que terminó su registro con más documentos
 *   faltantes de los que cubre una carta (`max_documentos_carta`); al bajar a ese
 *   máximo, el backend genera su carta solo y el bloqueo se levanta.
 */
export type MotivoBloqueoDocumentos = 'sin_carta' | 'carta_vencida' | 'excede_maximo_carta';

export type EstadoCartaCompromiso = 'vigente' | 'cumplida' | 'vencida';

/** `user.bloqueo_documentos` (me/login) y `bloqueo` de `GET colaborador/carta-compromiso`. */
export interface BloqueoDocumentos {
  activo: boolean;
  motivo: MotivoBloqueoDocumentos | null;
  /** Y-m-d. */
  fecha_limite: string | null;
  pendientes: number;
  /** Máximo de documentos que cubre una carta (backends anteriores no lo mandan: `maxDocumentosCarta()` usa 2). */
  max_documentos_carta?: number;
}

/** `user.carta_compromiso` (me/login): resumen para el banner. */
export interface CartaCompromisoResumen {
  folio: string;
  /** Y-m-d. */
  fecha_limite: string;
  dias_restantes: number;
  estado: EstadoCartaCompromiso;
}

/** Carta completa (`GET colaborador/carta-compromiso` y respuesta de `registro/finalizar`). */
export interface CartaCompromiso {
  id: number;
  folio: string;
  estado: string;
  estado_etiqueta: string;
  /** Y-m-d. */
  fecha_limite: string;
  dias_restantes: number;
  documentos: { document_type_id: number; nombre: string }[];
  generada_en: string;
}

export interface DocumentoPendienteCarta {
  document_type_id: number;
  clave: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  estado_etiqueta: string;
}

export interface EstadoCartaCompromisoResponse {
  carta: CartaCompromiso | null;
  documentos_pendientes: DocumentoPendienteCarta[];
  bloqueo: BloqueoDocumentos;
}
