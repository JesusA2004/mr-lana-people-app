import type {
  Acta,
  CierreLaboral,
  Cobertura,
  CoberturaTotales,
  Finiquito,
  IndicadoresRh,
  PlantillasDocumentales,
  VacanteDetalle,
} from '@/types/rhCiclo';
import {
  asArray,
  asBoolean,
  asId,
  asNumber,
  asRecord,
  asRecordOrNull,
  asString,
  normalizeColaboradorRef,
} from '@/utils/normalize';

function normalizeFiniquito(value: unknown): Finiquito | null {
  const raw = asRecordOrNull(value);
  const id = raw ? asId(raw.id) : null;
  if (!raw || id === null) return null;
  const finiquito: Finiquito = {
    id,
    estado: asString(raw.estado) ?? 'borrador',
    total_percepciones: asNumber(raw.total_percepciones),
    total_deducciones: asNumber(raw.total_deducciones),
    neto: asNumber(raw.neto),
    pagado_en: asString(raw.pagado_en),
    documento_id: asId(raw.documento_id),
  };
  if (Array.isArray(raw.desglose)) {
    finiquito.desglose = raw.desglose.map((item) => {
      const r = asRecord(item);
      return {
        id: asId(r.id),
        concepto: asString(r.concepto) ?? '',
        tipo: asString(r.tipo) ?? 'percepcion',
        cantidad: asNumber(r.cantidad),
        importe: asNumber(r.importe),
        observaciones: asString(r.observaciones),
        origen: asString(r.origen) ?? (asId(r.id) === null ? 'automatico' : 'manual'),
      };
    });
  }
  return finiquito;
}

export function normalizeCierre(value: unknown): CierreLaboral {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    colaborador: normalizeColaboradorRef(raw.colaborador),
    solicitud_id: asId(raw.solicitud_id),
    evaluacion_id: asId(raw.evaluacion_id),
    tipo_baja: asString(raw.tipo_baja) ?? '',
    tipo_baja_etiqueta: asString(raw.tipo_baja_etiqueta),
    motivo: asString(raw.motivo),
    fecha_efectiva: asString(raw.fecha_efectiva),
    estado: asString(raw.estado) ?? '',
    estado_etiqueta: asString(raw.estado_etiqueta),
    aviso_registrado_en: asString(raw.aviso_registrado_en),
    pago_confirmado_en: asString(raw.pago_confirmado_en),
    referencia_pago: asString(raw.referencia_pago),
    baja_ejecutada_en: asString(raw.baja_ejecutada_en),
    expediente_cerrado_en: asString(raw.expediente_cerrado_en),
    finiquito: normalizeFiniquito(raw.finiquito),
  };
}

export function normalizeActa(value: unknown): Acta {
  const raw = asRecord(value);
  const acta: Acta = {
    id: asId(raw.id) ?? 0,
    folio: asString(raw.folio),
    tipo: asString(raw.tipo) ?? '',
    tipo_etiqueta: asString(raw.tipo_etiqueta),
    estado: asString(raw.estado) ?? '',
    colaborador: normalizeColaboradorRef(raw.colaborador),
    fecha: asString(raw.fecha),
    hora: asString(raw.hora),
    lugar: asString(raw.lugar),
    negativa_firma: asBoolean(raw.negativa_firma),
    documento_id: asId(raw.documento_id),
    cerrada_en: asString(raw.cerrada_en),
  };
  if ('hechos' in raw) {
    acta.hechos = asString(raw.hechos);
    acta.motivo_negativa = asString(raw.motivo_negativa);
    acta.testigos = asArray(raw.testigos).map((item) => {
      const t = asRecord(item);
      return { nombre: asString(t.nombre) ?? '', puesto: asString(t.puesto) };
    });
    acta.declaraciones = asArray(raw.declaraciones).map((item) => {
      const d = asRecord(item);
      return { persona: asString(d.persona) ?? '', declaracion: asString(d.declaracion) ?? '' };
    });
    acta.seguimiento = asArray(raw.seguimiento).map((item) => {
      const s = asRecord(item);
      return { fecha: asString(s.fecha), nota: asString(s.nota) ?? '' };
    });
    acta.anexos = asArray(raw.anexos).map((item) => {
      const a = asRecord(item);
      return {
        id: asId(a.id) ?? 0,
        nombre: asString(a.nombre),
        descripcion: asString(a.descripcion),
        mime: asString(a.mime),
        size: asNumber(a.size),
      };
    });
  }
  return acta;
}

function normalizeTotales(value: unknown): CoberturaTotales {
  const raw = asRecord(value);
  return {
    autorizados: asNumber(raw.autorizados) ?? 0,
    activos: asNumber(raw.activos) ?? 0,
    vacantes: asNumber(raw.vacantes) ?? 0,
    excedentes: asNumber(raw.excedentes) ?? 0,
    cobertura: asNumber(raw.cobertura) ?? 0,
  };
}

export function normalizeCobertura(value: unknown): Cobertura {
  const raw = asRecord(value);
  return {
    filas: asArray(raw.filas).map((item) => {
      const f = asRecord(item);
      return {
        empresa_id: asId(f.empresa_id),
        empresa: asString(f.empresa),
        sucursal_id: asId(f.sucursal_id),
        sucursal: asString(f.sucursal),
        puesto_id: asId(f.puesto_id),
        puesto: asString(f.puesto),
        ...normalizeTotales(f),
      };
    }),
    totales: normalizeTotales(raw.totales),
  };
}

export function normalizeIndicadores(value: unknown): IndicadoresRh {
  const raw = asRecord(value);
  const periodo = asRecord(raw.periodo);
  const permanencia = asRecord(raw.permanencia_promedio_dias);
  const porVencer = asRecord(raw.contratos_por_vencer);
  const tiempo = asRecord(raw.tiempo_contratacion_dias);
  return {
    periodo: { desde: asString(periodo.desde), hasta: asString(periodo.hasta) },
    plantilla_activa: asNumber(raw.plantilla_activa),
    plantilla_autorizada: asNumber(raw.plantilla_autorizada),
    cobertura: asNumber(raw.cobertura),
    vacantes_plantilla: asNumber(raw.vacantes_plantilla),
    excedentes_plantilla: asNumber(raw.excedentes_plantilla),
    vacantes_abiertas: asNumber(raw.vacantes_abiertas),
    altas_periodo: asNumber(raw.altas_periodo),
    bajas_periodo: asNumber(raw.bajas_periodo),
    rotacion: asNumber(raw.rotacion),
    permanencia_promedio_dias: { activos: asNumber(permanencia.activos), bajas_periodo: asNumber(permanencia.bajas_periodo) },
    contratos_por_vencer: { dias: asNumber(porVencer.dias), total: asNumber(porVencer.total) },
    tiempo_contratacion_dias: { vacantes: asNumber(tiempo.vacantes), candidatos: asNumber(tiempo.candidatos) },
    contratados_periodo: asNumber(raw.contratados_periodo),
    inversion_reclutamiento: asNumber(raw.inversion_reclutamiento),
    costo_por_contratacion: asNumber(raw.costo_por_contratacion),
    embudo_candidatos: asArray(raw.embudo_candidatos).map((item) => {
      const e = asRecord(item);
      return { estado: asString(e.estado) ?? '', etiqueta: asString(e.etiqueta) ?? '', total: asNumber(e.total) ?? 0 };
    }),
  };
}

export function normalizeVacanteDetalle(value: unknown): VacanteDetalle {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    empresa: asString(raw.empresa),
    sucursal: asString(raw.sucursal),
    puesto: asString(raw.puesto),
    motivo: asString(raw.motivo),
    estado: asString(raw.estado),
    fecha_apertura: asString(raw.fecha_apertura),
    fecha_cierre: asString(raw.fecha_cierre),
    dias_abierta: asNumber(raw.dias_abierta),
    plazas_requeridas: asNumber(raw.plazas_requeridas),
    plazas_cubiertas: asNumber(raw.plazas_cubiertas),
    plazas_disponibles: asNumber(raw.plazas_disponibles),
    candidato_contratado: asString(raw.candidato_contratado),
    colaborador_contratado: normalizeColaboradorRef(raw.colaborador_contratado),
  };
}

export function normalizePlantillas(payload: unknown): PlantillasDocumentales {
  const root = asRecord(payload);
  return {
    plantillas: asArray(root.data).map((item) => {
      const p = asRecord(item);
      return {
        id: asId(p.id) ?? 0,
        clave: asString(p.clave),
        nombre: asString(p.nombre) ?? '',
        categoria: asString(p.categoria),
        motor: asString(p.motor),
        version: asNumber(p.version),
        activo: asBoolean(p.activo),
        requiere_firma_digital: asBoolean(p.requiere_firma_digital),
        requiere_impresion: asBoolean(p.requiere_impresion),
        requiere_firma_fisica: asBoolean(p.requiere_firma_fisica),
      };
    }),
    catalogo: asArray(root.catalogo).map((item) => {
      const c = asRecord(item);
      return { clave: asString(c.clave) ?? '', nombre: asString(c.nombre) ?? '', configurada: asBoolean(c.configurada) };
    }),
  };
}
