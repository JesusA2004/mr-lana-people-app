import { isAxiosError } from 'axios';

import { apiClient } from '../client';

import type {
  AccionDocumentoProceso,
  DatoFaltanteDocumento,
  ItemDocumentoProceso,
  SeccionDocumentosProceso,
  TipoRegistroDocumental,
} from '@/types/documentosProceso';
import { asArray, asRecord } from '@/utils/normalize';

/**
 * Motor documental del ciclo laboral — mismas rutas, reglas y payload que la
 * web (`/api/v1/rh/documentos-proceso/*`). La app nunca decide qué documento
 * le toca a una persona: solo pinta `documentos` y `acciones` del backend.
 * El PDF, compartir/imprimir y el flujo físico se operan en la pantalla de
 * documento laboral existente (`/rh/documentos-laborales/[id]`).
 */

const texto = (v: unknown): string => (typeof v === 'string' ? v : '');
const textoONulo = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

function normalizarAcciones(valor: unknown): AccionDocumentoProceso[] {
  return asArray(valor).map((a) => {
    const r = asRecord(a);
    return { clave: texto(r.clave), etiqueta: texto(r.etiqueta), tipo: texto(r.tipo) };
  });
}

function normalizarItem(valor: unknown): ItemDocumentoProceso {
  const r = asRecord(valor);
  const documento = r.documento ? asRecord(r.documento) : null;
  const master = r.master ? asRecord(r.master) : null;
  const requiere = asRecord(r.requiere);
  const faltante = r.formato_faltante ? asRecord(r.formato_faltante) : null;

  return {
    clave: texto(r.clave),
    nombre: texto(r.nombre),
    motivo: texto(r.motivo),
    estado: texto(r.estado),
    estadoEtiqueta: texto(r.estado_etiqueta),
    bloqueo: textoONulo(r.bloqueo),
    formatoFaltante: faltante ? textoONulo(faltante.mensaje) : null,
    masterVersion: master && typeof master.version === 'number' ? master.version : null,
    documentoId: documento && typeof documento.id === 'number' ? documento.id : null,
    generadoEn: documento ? textoONulo(documento.generado_en) : null,
    firmado: Boolean(documento?.firmado),
    escaneado: Boolean(documento?.escaneado),
    archivado: Boolean(documento?.archivado),
    requiereHuella: Boolean(requiere.huella),
    requiereTestigos: Boolean(requiere.testigos),
    acciones: normalizarAcciones(r.acciones),
  };
}

export function normalizarSeccion(valor: unknown): SeccionDocumentosProceso {
  const r = asRecord(valor);
  const registro = asRecord(r.registro);
  const negativa = r.negativa ? asRecord(r.negativa) : null;

  return {
    proceso: texto(r.proceso),
    titulo: texto(r.titulo),
    descripcion: texto(r.descripcion),
    registro: { tipo: texto(registro.tipo) as TipoRegistroDocumental, id: Number(registro.id ?? 0) },
    bloqueo: textoONulo(r.bloqueo),
    expedienteCompleto: typeof r.expediente_completo === 'boolean' ? r.expediente_completo : null,
    acciones: normalizarAcciones(r.acciones),
    documentos: asArray(r.documentos).map(normalizarItem),
    negativaRegistrada: negativa !== null,
    testigos: negativa ? asArray(negativa.testigos).map((t) => ({ nombre: texto(asRecord(t).nombre), cargo: texto(asRecord(t).cargo) })) : [],
    checklist: Array.isArray(r.checklist)
      ? asArray(r.checklist)
          .filter((p) => asRecord(p).aplica !== false)
          .map((p) => ({ clave: texto(asRecord(p).clave), etiqueta: texto(asRecord(p).etiqueta), cumplido: Boolean(asRecord(p).cumplido) }))
      : null,
  };
}

/** Datos faltantes de un 422 DATOS_FALTANTES (null si el error es otro). */
export function faltantesDeError(error: unknown): { mensaje: string; faltantes: DatoFaltanteDocumento[] } | null {
  if (!isAxiosError(error) || error.response?.status !== 422) return null;
  const data = asRecord(error.response.data);
  if (data.code !== 'DATOS_FALTANTES') return null;

  return {
    mensaje: texto(data.message),
    faltantes: asArray(data.faltantes).map((f) => {
      const r = asRecord(f);
      return {
        campo: texto(r.campo),
        fuente: texto(r.fuente),
        columna: texto(r.columna),
        etiqueta: texto(r.etiqueta),
        tipo: texto(r.tipo),
        editable: Boolean(r.editable),
      };
    }),
  };
}

export interface GenerarDocumentoPayload {
  clave?: string;
  proceso?: string;
  regenerar?: boolean;
  completar?: Record<string, string>;
  manuales?: Record<string, string>;
}

export const rhDocumentosProcesoApi = {
  async delColaborador(colaboradorId: number | string): Promise<SeccionDocumentosProceso[]> {
    const response = await apiClient.get(`/rh/documentos-proceso/colaborador/${colaboradorId}`);
    return asArray(asRecord(response.data).data).map(normalizarSeccion);
  },

  /** null: el trámite no lleva documentos oficiales (lo decide el backend). */
  async seccion(tipo: TipoRegistroDocumental, id: number | string): Promise<SeccionDocumentosProceso | null> {
    const response = await apiClient.get(`/rh/documentos-proceso/${tipo}/${id}`);
    const data = asRecord(response.data).data;
    return data ? normalizarSeccion(data) : null;
  },

  async generar(tipo: TipoRegistroDocumental, id: number, payload: GenerarDocumentoPayload): Promise<SeccionDocumentosProceso> {
    const response = await apiClient.post(`/rh/documentos-proceso/${tipo}/${id}/generar`, payload);
    return normalizarSeccion(asRecord(response.data).data);
  },

  async paquete(tipo: TipoRegistroDocumental, id: number, payload: GenerarDocumentoPayload): Promise<SeccionDocumentosProceso> {
    const response = await apiClient.post(`/rh/documentos-proceso/${tipo}/${id}/paquete`, payload);
    return normalizarSeccion(asRecord(response.data).data);
  },

  /** Negativa del colaborador a firmar/recibir (rama del procedimiento de baja). */
  async negativa(
    cierreId: number,
    payload: { documentos: string[]; finiquito_a_disposicion: boolean; testigos: { nombre: string; cargo: string }[]; observaciones?: string },
  ): Promise<SeccionDocumentosProceso> {
    const response = await apiClient.post(`/rh/cierres/${cierreId}/procedimiento/negativa`, payload);
    return normalizarSeccion(asRecord(response.data).data);
  },

  async testigos(cierreId: number, testigos: { nombre: string; cargo: string }[]): Promise<SeccionDocumentosProceso> {
    const response = await apiClient.post(`/rh/cierres/${cierreId}/procedimiento/testigos`, { testigos });
    return normalizarSeccion(asRecord(response.data).data);
  },
};
