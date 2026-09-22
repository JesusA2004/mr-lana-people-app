import type { DocumentoEvento, LaborDocument, LaborDocumentPendingCounts, OriginalFisico, Testigo } from '@/types/laborDocument';
import { ETAPAS_DOCUMENTO_LABORAL } from '@/types/laborDocument';
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

function normalizeTestigos(value: unknown): Testigo[] {
  const testigos: Testigo[] = [];
  for (const item of asArray(value)) {
    const raw = asRecord(item);
    const nombre = asString(raw.nombre);
    if (nombre) testigos.push({ nombre, puesto: asString(raw.puesto) });
  }
  return testigos;
}

function normalizeOriginalFisico(value: unknown): OriginalFisico | null {
  const raw = asRecordOrNull(value);
  if (!raw) return null;
  return {
    impreso_en: asString(raw.impreso_en),
    firmado_fisico_en: asString(raw.firmado_fisico_en),
    huella_registrada: asBoolean(raw.huella_registrada),
    testigos: normalizeTestigos(raw.testigos),
    enviado_en: asString(raw.enviado_en),
    paqueteria: asString(raw.paqueteria),
    numero_guia: asString(raw.numero_guia),
    tiene_comprobante: asBoolean(raw.tiene_comprobante),
    recibido_en: asString(raw.recibido_en),
    escaneado_en: asString(raw.escaneado_en),
    escaneado_documento_id: asId(raw.escaneado_documento_id),
  };
}

function normalizeEvento(value: unknown): DocumentoEvento {
  const raw = asRecord(value);
  return {
    accion: asString(raw.accion) ?? '',
    estado_anterior: asString(raw.estado_anterior),
    estado_nuevo: asString(raw.estado_nuevo),
    usuario: asString(raw.usuario),
    observaciones: asString(raw.observaciones),
    fecha: asString(raw.fecha),
  };
}

export function normalizeLaborDocument(value: unknown): LaborDocument {
  const raw = asRecord(value);
  const documento: LaborDocument = {
    id: asId(raw.id) ?? 0,
    titulo: asString(raw.titulo) ?? 'Documento laboral',
    clave_plantilla: asString(raw.clave_plantilla),
    version_plantilla: asNumber(raw.version_plantilla),
    categoria: asString(raw.categoria),
    estado: asString(raw.estado),
    estado_etiqueta: asString(raw.estado_etiqueta),
    requiere_firma_digital: asBoolean(raw.requiere_firma_digital),
    requiere_impresion: asBoolean(raw.requiere_impresion),
    requiere_firma_fisica: asBoolean(raw.requiere_firma_fisica),
    requiere_huella: asBoolean(raw.requiere_huella),
    requiere_testigos: asBoolean(raw.requiere_testigos),
    firmado_digital_en: asString(raw.firmado_digital_en),
    generado_en: asString(raw.generado_en),
    related_type: asString(raw.related_type),
    related_id: asId(raw.related_id),
    colaborador: normalizeColaboradorRef(raw.colaborador),
    original_fisico: normalizeOriginalFisico(raw.original_fisico),
  };
  if (Array.isArray(raw.eventos)) {
    documento.eventos = raw.eventos.map(normalizeEvento);
  }
  return documento;
}

export function normalizeLaborDocumentPendingCounts(value: unknown): LaborDocumentPendingCounts {
  const raw = asRecord(value);
  const counts = {} as LaborDocumentPendingCounts;
  for (const etapa of ETAPAS_DOCUMENTO_LABORAL) {
    counts[etapa] = asNumber(raw[etapa]) ?? 0;
  }
  return counts;
}
