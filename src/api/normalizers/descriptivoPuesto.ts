import type { AcuseDescriptivoPuesto, SeccionDescriptivo } from '@/types/descriptivoPuesto';
import { asArray, asBoolean, asId, asNumber, asRecord, asRecordOrNull, asString, asStringArray } from '@/utils/normalize';

function normalizeSeccion(raw: unknown): SeccionDescriptivo | null {
  const s = asRecord(raw);
  const clave = asString(s.clave);
  const titulo = asString(s.titulo);
  const elementos = asStringArray(s.elementos).filter((e) => e.trim() !== '');
  if (!clave || !titulo || elementos.length === 0) return null;
  return { clave, titulo, elementos };
}

/** `data` de `GET /colaborador/descriptivo-puesto` (o `null` si RH no ha enviado ninguno). */
export function normalizeAcuseDescriptivo(raw: unknown): AcuseDescriptivoPuesto | null {
  const a = asRecordOrNull(raw);
  const id = a ? asId(a.id) : null;
  if (!a || !id) return null;
  const d = asRecord(a.descriptivo);

  return {
    id,
    estado: asString(a.estado) ?? 'enviado',
    estadoEtiqueta: asString(a.estado_etiqueta) ?? '',
    enviadoPor: asString(a.enviado_por),
    enviadoEn: asString(a.enviado_en),
    leidoEn: asString(a.leido_en),
    acusadoEn: asString(a.acusado_en),
    enterado: asBoolean(a.enterado),
    comentario: asString(a.comentario),
    descriptivo: {
      id: asId(d.id) ?? 0,
      nombrePuesto: asString(d.nombre_puesto) ?? 'Tu puesto',
      version: asNumber(d.version) ?? 1,
      area: asString(d.area),
      objetivo: asString(d.objetivo),
      personalACargo: asString(d.personal_a_cargo),
      fecha: asString(d.fecha),
      secciones: asArray(d.secciones)
        .map(normalizeSeccion)
        .filter((s): s is SeccionDescriptivo => s !== null),
    },
  };
}
