/**
 * Préstamo personal — espejo de
 * `App\Services\Nomina\PrestamoAutorizacionService::aArray()`.
 *
 * IMPORTANTE (producto): MR. LANA PEOPLE NO ejecuta descuentos de nómina.
 * `saldo_informativo` y `movimientos` son CONTROL ADMINISTRATIVO que RH
 * alimenta; la UI nunca debe decir que People aplicó un descuento.
 */

import type { ColaboradorRef } from '@/utils/normalize';

export interface PrestamoDocumentoRef {
  id: number;
  estado: string | null;
}

export interface PrestamoVistoBueno {
  nivel: string | number | null;
  decision: string | null;
  usuario: string | null;
  comentario: string | null;
  fecha: string | null;
}

export interface PrestamoMovimiento {
  fecha: string | null;
  tipo: string | null;
  monto: number | null;
  saldo_nuevo: number | null;
}

export interface Prestamo {
  id: number;
  colaborador: ColaboradorRef | null;
  solicitud_id: number | null;
  folio: string | null;
  monto_solicitado: number | null;
  plazo_solicitado: number | null;
  monto_autorizado: number | null;
  plazo_autorizado: number | null;
  periodicidad: string | null;
  pago_programado: number | null;
  saldo_informativo: number | null;
  motivo: string | null;
  fecha_solicitud: string | null;
  estado: string | null;
  autorizado_en: string | null;
  observaciones: string | null;
  contrato: PrestamoDocumentoRef | null;
  pagare: PrestamoDocumentoRef | null;
  resguardado_en: string | null;
  /** Solo en detalle. */
  vistos_buenos?: PrestamoVistoBueno[];
  requiere_visto_bueno_jefe?: boolean;
  movimientos?: PrestamoMovimiento[];
}

/** Respuesta de `POST /rh/prestamos/{id}/documentos`. */
export interface PrestamoDocumentosResult {
  contrato: number | null;
  pagare: number | null;
  /** Claves sin plantilla activa (`contrato_prestamo`, `pagare`). */
  pendientes: string[];
}

/**
 * `GET /api/v1/solicitudes/prestamo/elegibilidad` — regla única de 6 meses
 * completos desde `fecha_ingreso`, con la FECHA DEL SERVIDOR
 * (`AprobacionOrganizacionalService::elegibilidadPrestamo`). La app nunca
 * calcula antigüedad con el reloj del teléfono.
 */
export interface ElegibilidadPrestamo {
  cumple: boolean;
  meses_minimos: number;
  fecha_ingreso: string | null;
  antiguedad: { anios: number; meses: number; dias: number } | null;
  /** «5 meses 12 días». */
  antiguedad_texto: string | null;
  /** `YYYY-MM-DD`. */
  disponible_desde: string | null;
  /** `dd/mm/aaaa`. */
  disponible_desde_texto: string | null;
  fecha_servidor: string | null;
  /** Texto humano listo para mostrarse. */
  mensaje: string | null;
}
