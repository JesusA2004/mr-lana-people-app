import type { Prestamo, PrestamoDocumentoRef, PrestamoDocumentosResult } from '@/types/loan';
import type { ReciboConcepto, ReciboImportResult, ReciboNomina } from '@/types/payroll';
import {
  asArray,
  asBoolean,
  asId,
  asNumber,
  asRecord,
  asRecordOrNull,
  asString,
  asStringArray,
  normalizeColaboradorRef,
} from '@/utils/normalize';

const LEYENDA_RECIBO = 'RECIBO INTERNO DE NÓMINA - NO FISCAL';

function normalizeConcepto(value: unknown): ReciboConcepto {
  const raw = asRecord(value);
  return {
    tipo: asString(raw.tipo) ?? 'percepcion',
    concepto: asString(raw.concepto) ?? '',
    cantidad: asNumber(raw.cantidad),
    importe: asNumber(raw.importe),
    observaciones: asString(raw.observaciones),
  };
}

export function normalizeRecibo(value: unknown): ReciboNomina {
  const raw = asRecord(value);
  const recibo: ReciboNomina = {
    id: asId(raw.id) ?? 0,
    folio: asString(raw.folio),
    tipo_periodo: asString(raw.tipo_periodo),
    ejercicio: asNumber(raw.ejercicio),
    numero_periodo: asNumber(raw.numero_periodo),
    periodo_inicio: asString(raw.periodo_inicio),
    periodo_fin: asString(raw.periodo_fin),
    fecha_pago: asString(raw.fecha_pago),
    total_percepciones: asNumber(raw.total_percepciones),
    total_deducciones: asNumber(raw.total_deducciones),
    neto: asNumber(raw.neto),
    observaciones: asString(raw.observaciones),
    // Solo `true` explícito habilita el PDF — nunca un botón que termine en 404.
    tiene_pdf: raw.tiene_pdf === true,
    leyenda: asString(raw.leyenda) ?? LEYENDA_RECIBO,
  };
  if (Array.isArray(raw.conceptos)) recibo.conceptos = raw.conceptos.map(normalizeConcepto);
  if ('colaborador' in raw) recibo.colaborador = normalizeColaboradorRef(raw.colaborador);
  return recibo;
}

export function normalizeReciboImport(value: unknown): ReciboImportResult {
  const raw = asRecord(value);
  return {
    lote: asString(raw.lote),
    simulacion: asBoolean(raw.simulacion),
    filas_leidas: asNumber(raw.filas_leidas) ?? 0,
    recibos_generados: asNumber(raw.recibos_generados) ?? 0,
    colaboradores: asArray(raw.colaboradores).map((item) => {
      const c = asRecord(item);
      return {
        numero_empleado: asString(c.numero_empleado) ?? '',
        colaborador: asString(c.colaborador) ?? '',
        conceptos: asNumber(c.conceptos) ?? 0,
        total_percepciones: asNumber(c.total_percepciones),
        total_deducciones: asNumber(c.total_deducciones),
        neto: asNumber(c.neto),
        recibo_id: asId(c.recibo_id),
      };
    }),
    errores: asArray(raw.errores).map((item) => {
      const e = asRecord(item);
      return {
        fila: asNumber(e.fila),
        numero_empleado: asString(e.numero_empleado),
        motivo: asString(e.motivo) ?? 'Fila inválida.',
      };
    }),
  };
}

function normalizeDocumentoRef(value: unknown): PrestamoDocumentoRef | null {
  const raw = asRecordOrNull(value);
  const id = raw ? asId(raw.id) : null;
  return raw && id !== null ? { id, estado: asString(raw.estado) } : null;
}

export function normalizePrestamo(value: unknown): Prestamo {
  const raw = asRecord(value);
  const prestamo: Prestamo = {
    id: asId(raw.id) ?? 0,
    colaborador: normalizeColaboradorRef(raw.colaborador),
    solicitud_id: asId(raw.solicitud_id),
    folio: asString(raw.folio),
    monto_solicitado: asNumber(raw.monto_solicitado),
    plazo_solicitado: asNumber(raw.plazo_solicitado),
    monto_autorizado: asNumber(raw.monto_autorizado),
    plazo_autorizado: asNumber(raw.plazo_autorizado),
    periodicidad: asString(raw.periodicidad),
    pago_programado: asNumber(raw.pago_programado),
    saldo_informativo: asNumber(raw.saldo_informativo),
    motivo: asString(raw.motivo),
    fecha_solicitud: asString(raw.fecha_solicitud),
    estado: asString(raw.estado),
    autorizado_en: asString(raw.autorizado_en),
    observaciones: asString(raw.observaciones),
    contrato: normalizeDocumentoRef(raw.contrato),
    pagare: normalizeDocumentoRef(raw.pagare),
    resguardado_en: asString(raw.resguardado_en),
  };
  if (Array.isArray(raw.vistos_buenos)) {
    prestamo.vistos_buenos = raw.vistos_buenos.map((item) => {
      const v = asRecord(item);
      return {
        nivel: asString(v.nivel),
        decision: asString(v.decision),
        usuario: asString(v.usuario),
        comentario: asString(v.comentario),
        fecha: asString(v.fecha),
      };
    });
  }
  if ('requiere_visto_bueno_jefe' in raw) prestamo.requiere_visto_bueno_jefe = asBoolean(raw.requiere_visto_bueno_jefe);
  if (Array.isArray(raw.movimientos)) {
    prestamo.movimientos = raw.movimientos.map((item) => {
      const m = asRecord(item);
      return {
        fecha: asString(m.fecha),
        tipo: asString(m.tipo),
        monto: asNumber(m.monto),
        saldo_nuevo: asNumber(m.saldo_nuevo),
      };
    });
  }
  return prestamo;
}

export function normalizePrestamoDocumentos(value: unknown): PrestamoDocumentosResult {
  const raw = asRecord(value);
  return {
    contrato: asId(raw.contrato),
    pagare: asId(raw.pagare),
    pendientes: asStringArray(raw.pendientes),
  };
}
