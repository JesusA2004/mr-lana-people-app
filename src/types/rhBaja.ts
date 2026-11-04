import type { SiguientePaso } from '@/types/siguientePaso';

/** Renglón de `GET /rh/bajas` (`BajaConsultaService::fila`). */
export interface BajaFila {
  id: number;
  folio: string | null;
  colaborador: string;
  /** Foto del colaborador (URL con Bearer); `null` ⇒ iniciales. */
  foto_url: string | null;
  numero_empleado: string | null;
  sucursal: string | null;
  puesto: string | null;
  forma_etiqueta: string | null;
  causal: string | null;
  estatus: string;
  estatus_etiqueta: string | null;
  fecha_baja: string | null;
  dias_en_espera: number | null;
  documentos_faltantes: number;
}

export interface BajaDocumentoEspacio {
  id: number | null;
  nombre: string;
  obligatorio: boolean;
  cumplido: boolean;
}

export interface BajaBitacoraEntrada {
  id: number;
  accion: string;
  motivo: string | null;
  usuario: string | null;
  fecha: string | null;
}

/** `GET /rh/bajas/{id}` (`BajaService::detalle`). */
export interface BajaDetalle extends BajaFila {
  fecha_ingreso: string | null;
  causal_nombre: string | null;
  comentarios: string | null;
  recontratable_etiqueta: string | null;
  solicitado_por: string | null;
  documentos: BajaDocumentoEspacio[];
  bitacora: BajaBitacoraEntrada[];
  siguiente_paso: SiguientePaso | null;
}
