import { apiClient, extractData } from './client';
import { normalizeAlta, normalizeContrato, normalizeEstadoDocumental, normalizeJerarquia, normalizeMiExpediente } from './normalizers/cicloLaboral';
import { normalizeLaborDocument } from './normalizers/laborDocument';
import { normalizeMiProceso, normalizeResultadoLeccion } from './normalizers/miProceso';
import { normalizePrestamo, normalizeRecibo } from './normalizers/nomina';

import type { AltaChecklist, ContratoLaboral, ExpedienteDocumentoEstado, Jerarquia, MiExpediente } from '@/types/cicloLaboral';
import type { LaborDocument } from '@/types/laborDocument';
import type { Prestamo } from '@/types/loan';
import type { MiProceso, ResultadoLeccion } from '@/types/miProceso';
import type { ReciboNomina } from '@/types/payroll';
import { asArray, asRecord, normalizePaginated, type Paginated } from '@/utils/normalize';

export interface DocumentosPendientes {
  por_cargar: ExpedienteDocumentoEstado[];
  por_firmar: LaborDocument[];
}

/** Control con el que se captura un dato faltante (`ActualizacionDatosService::camposCaptura`). */
export type TipoCapturaDato = 'text' | 'date' | 'tel' | 'email' | 'number' | 'opciones';

export interface DatoFaltante {
  campo: string;
  etiqueta: string;
  tipo: TipoCapturaDato;
  opciones?: { value: string; label: string }[];
}

/** `GET /colaborador/datos-faltantes` — «Completa tu información». */
export interface DatosFaltantes {
  completo: boolean;
  faltan: DatoFaltante[];
  /** Ya hay una actualización de datos esperando a RH: no se pide otra. */
  solicitud_en_revision: boolean;
}

const TIPOS_CAPTURA: TipoCapturaDato[] = ['text', 'date', 'tel', 'email', 'number', 'opciones'];

function normalizeDatosFaltantes(raw: unknown): DatosFaltantes {
  const record = asRecord(raw);
  const faltan = asArray(record.faltan)
    .map((item): DatoFaltante | null => {
      const fila = asRecord(item);
      if (typeof fila.campo !== 'string') return null;
      const tipo = TIPOS_CAPTURA.includes(fila.tipo as TipoCapturaDato) ? (fila.tipo as TipoCapturaDato) : 'text';
      const opciones = asArray(fila.opciones)
        .map((o) => asRecord(o))
        .filter((o) => typeof o.value === 'string')
        .map((o) => ({ value: String(o.value), label: typeof o.label === 'string' ? o.label : String(o.value) }));
      return {
        campo: fila.campo,
        etiqueta: typeof fila.etiqueta === 'string' ? fila.etiqueta : fila.campo,
        tipo: tipo === 'opciones' && opciones.length === 0 ? 'text' : tipo,
        opciones: opciones.length > 0 ? opciones : undefined,
      };
    })
    .filter((dato): dato is DatoFaltante => dato !== null);

  return { completo: record.completo === true || faltan.length === 0, faltan, solicitud_en_revision: record.solicitud_en_revision === true };
}

/**
 * Autoservicio del ciclo laboral — `GET/POST /api/v1/colaborador/*`
 * (`CicloLaboralColaboradorController`, backend 2026-09-22). Siempre la
 * información del propio colaborador (sale de la sesión; nunca de un id en
 * la URL salvo recursos que pasan por Policy).
 *
 * Si la cuenta no está vinculada a un Colaborador el backend responde 404
 * — la UI lo trata como "sin información", nunca como error fatal.
 */
export const cicloLaboralApi = {
  async alta(): Promise<AltaChecklist> {
    const response = await apiClient.get('/colaborador/alta');
    return normalizeAlta(extractData<unknown>(response.data));
  },

  async datosFaltantes(): Promise<DatosFaltantes> {
    const response = await apiClient.get('/colaborador/datos-faltantes');
    return normalizeDatosFaltantes(extractData<unknown>(response.data));
  },

  async expediente(): Promise<MiExpediente> {
    const response = await apiClient.get('/colaborador/expediente');
    return normalizeMiExpediente(extractData<unknown>(response.data));
  },

  async documentosPendientes(): Promise<DocumentosPendientes> {
    const response = await apiClient.get('/colaborador/documentos-pendientes');
    const raw = asRecord(extractData<unknown>(response.data));
    return {
      por_cargar: normalizeEstadoDocumental({ documentos: raw.por_cargar }).documentos,
      por_firmar: asArray(raw.por_firmar).map(normalizeLaborDocument),
    };
  },

  async contratos(): Promise<ContratoLaboral[]> {
    const response = await apiClient.get('/colaborador/contratos');
    return asArray(extractData<unknown>(response.data)).map(normalizeContrato);
  },

  async jerarquia(): Promise<Jerarquia> {
    const response = await apiClient.get('/colaborador/jerarquia');
    return normalizeJerarquia(extractData<unknown>(response.data));
  },

  /**
   * "Lo que necesitas hacer": FUENTE ÚNICA del estado del ciclo del
   * colaborador (`CicloLaboralService::misPendientes`). La app no recalcula
   * etapa ni acción; solo pinta lo que llega.
   */
  async miProceso(): Promise<MiProceso> {
    const response = await apiClient.get('/colaborador/mi-proceso');
    return normalizeMiProceso(extractData<unknown>(response.data));
  },

  /** Presenta la evaluación de una lección de bienvenida (respuestas: índice de pregunta → índice de opción). */
  async presentarLeccion(avanceId: number, respuestas: Record<number, number>): Promise<ResultadoLeccion> {
    const response = await apiClient.post(`/colaborador/onboarding/avances/${avanceId}/evaluacion`, { respuestas });
    return normalizeResultadoLeccion(extractData<unknown>(response.data));
  },
};

/** Recibos de nómina propios. Solo lectura. */
export const recibosApi = {
  async list(page = 1, perPage = 20): Promise<Paginated<ReciboNomina>> {
    const response = await apiClient.get('/colaborador/recibos', { params: { page, per_page: perPage } });
    return normalizePaginated(response.data, normalizeRecibo);
  },

  async get(id: number | string): Promise<ReciboNomina> {
    const response = await apiClient.get(`/colaborador/recibos/${id}`);
    return normalizeRecibo(extractData<unknown>(response.data));
  },

  /** Solo cuando `tiene_pdf === true` — si no, el backend responde 404. */
  pdfPath(id: number | string): string {
    return `/colaborador/recibos/${id}/pdf`;
  },
};

/** Préstamos propios. El saldo es CONTROL ADMINISTRATIVO, no un descuento aplicado por People. */
export const prestamosApi = {
  async list(): Promise<Prestamo[]> {
    const response = await apiClient.get('/colaborador/prestamos');
    return asArray(extractData<unknown>(response.data)).map(normalizePrestamo);
  },

  async get(id: number | string): Promise<Prestamo> {
    const response = await apiClient.get(`/colaborador/prestamos/${id}`);
    return normalizePrestamo(extractData<unknown>(response.data));
  },
};
