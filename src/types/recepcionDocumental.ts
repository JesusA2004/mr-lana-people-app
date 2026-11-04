/**
 * Recepción documental RH — control mensual de ORIGINALES físicos
 * (`App\Http\Controllers\Api\V1\Rh\RecepcionDocumentalController` y
 * `RecepcionDocumentalService` en capacitaciones). La app no calcula reglas,
 * métricas ni estados: todo llega del backend.
 */

export type EstadoRenglonRecepcion = 'pendiente' | 'recibido' | 'recibido_con_observacion' | 'no_recibido' | 'no_aplica';

export interface MetricasRecepcion {
  esperados: number;
  recibidos: number;
  pendientes: number;
  no_recibidos: number;
  incidencias: number;
  no_aplica: number;
  renglones: number;
  /** 0–100, ya redondeado por el backend. */
  cumplimiento: number;
}

/** Corte = periodo mensual. `estado`: en_preparacion | abierto | con_pendientes | completo | cerrado. */
export interface CorteRecepcion {
  id: number;
  /** AAAA-MM */
  periodo: string;
  /** «Noviembre 2026» */
  etiqueta: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  estado_etiqueta: string;
  cerrado_en: string | null;
  cerrado_por: string | null;
  metricas: MetricasRecepcion;
}

export interface SucursalRecepcion {
  /** null = renglones sin sucursal (filtro `sucursal_id=sin`). */
  sucursal_id: number | null;
  nombre: string;
  metricas: MetricasRecepcion;
}

export interface ReglaRecepcion {
  regla: string;
  etiqueta: string;
  orden: number;
  activa: boolean;
  /** Texto del backend para cuando no hubo eventos («No hubo altas durante noviembre 2026.»). */
  sin_eventos: string;
  metricas: MetricasRecepcion;
}

export interface PermisosCorteRecepcion {
  recibir: boolean;
  observar: boolean;
  cerrar: boolean;
  reabrir: boolean;
  descargar_pdf: boolean;
}

export interface CorteRecepcionDetalle extends CorteRecepcion {
  sucursales_con_pendientes: SucursalRecepcion[];
  sucursales: SucursalRecepcion[];
  reglas: ReglaRecepcion[];
  permisos: PermisosCorteRecepcion;
}

export interface RenglonRecepcion {
  id: number;
  corte_id: number;
  regla: string;
  regla_etiqueta: string;
  regla_orden: number;
  tipo_documento: string;
  tipo_etiqueta: string;
  origen: { tipo: string; id: number | null };
  colaborador: { id: number | null; nombre: string; numero_empleado: string | null; puesto: string | null };
  sucursal: { id: number | null; nombre: string };
  fecha_evento: string | null;
  evento_descripcion: string | null;
  cantidad_esperada: number;
  cantidad_recibida: number;
  estado: EstadoRenglonRecepcion;
  estado_etiqueta: string;
  justificacion: string | null;
  observaciones: string | null;
  no_aplica_automatico: boolean;
  recibido_en: string | null;
  recibido_por: string | null;
  incidencia: boolean;
  documento_digital: { id: number; titulo: string | null; estado: string | null } | null;
}

export interface MarcarRecepcionPayload {
  estado: EstadoRenglonRecepcion;
  observaciones?: string;
  justificacion?: string;
}

export interface MarcarRecepcionRespuesta {
  renglon: RenglonRecepcion;
  metricas: MetricasRecepcion;
  estado_corte: { value: string; label: string } | null;
}
