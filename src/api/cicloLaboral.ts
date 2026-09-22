import { apiClient, extractData } from './client';
import { normalizeAlta, normalizeContrato, normalizeEstadoDocumental, normalizeJerarquia, normalizeMiExpediente } from './normalizers/cicloLaboral';
import { normalizeLaborDocument } from './normalizers/laborDocument';
import { normalizePrestamo, normalizeRecibo } from './normalizers/nomina';

import type { AltaChecklist, ContratoLaboral, ExpedienteDocumentoEstado, Jerarquia, MiExpediente } from '@/types/cicloLaboral';
import type { LaborDocument } from '@/types/laborDocument';
import type { Prestamo } from '@/types/loan';
import type { ReciboNomina } from '@/types/payroll';
import { asArray, asRecord, normalizePaginated, type Paginated } from '@/utils/normalize';

export interface DocumentosPendientes {
  por_cargar: ExpedienteDocumentoEstado[];
  por_firmar: LaborDocument[];
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
};

/** Recibos INTERNOS de nómina propios (no fiscales). Solo lectura. */
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
