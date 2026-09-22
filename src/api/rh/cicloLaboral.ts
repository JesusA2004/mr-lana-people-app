import { apiClient, extractData } from '../client';
import { normalizeAlta, normalizeContrato, normalizeJerarquia, normalizeOrganigramaPersona } from '../normalizers/cicloLaboral';
import { normalizeLaborDocument, normalizeLaborDocumentPendingCounts } from '../normalizers/laborDocument';
import { normalizePrestamo, normalizePrestamoDocumentos, normalizeRecibo, normalizeReciboImport } from '../normalizers/nomina';
import {
  normalizeActa,
  normalizeCierre,
  normalizeCobertura,
  normalizeIndicadores,
  normalizePlantillas,
  normalizeVacanteDetalle,
} from '../normalizers/rhCiclo';
import { appendFile, multipartHeaders, type LocalUploadFile } from '../upload';

import type { AltaChecklist, ContratoLaboral, Jerarquia, PersonaOrganigrama } from '@/types/cicloLaboral';
import type { EtapaDocumentoLaboral, LaborDocument, LaborDocumentPendingCounts, Testigo } from '@/types/laborDocument';
import type { Prestamo, PrestamoDocumentosResult } from '@/types/loan';
import type { ReciboImportResult, ReciboNomina } from '@/types/payroll';
import type {
  Acta,
  CierreLaboral,
  Cobertura,
  FiniquitoConceptoPayload,
  GuardarActaPayload,
  IndicadoresRh,
  IniciarCierrePayload,
  PlantillasDocumentales,
  VacanteDetalle,
} from '@/types/rhCiclo';
import { asArray, asRecord, normalizePaginated, type Paginated } from '@/utils/normalize';

/**
 * Operación RH/Dirección/Jurídico del ciclo laboral — `/api/v1/rh/*`
 * (backend 2026-09-22). Cada acción del backend = FormRequest + Policy
 * (permiso + alcance organizacional) + Service; la app solo llama y
 * muestra — nunca duplica reglas de negocio.
 */

// ------------------------------------------------------------ Alta / colaborador

export const rhAltaApi = {
  async checklist(colaboradorId: number | string): Promise<AltaChecklist> {
    const response = await apiClient.get(`/rh/colaboradores/${colaboradorId}/alta`);
    return normalizeAlta(extractData<unknown>(response.data));
  },

  /** Exige obligatorios aprobados + contrato principal firmado; si no, 422 con el motivo real. */
  async activar(colaboradorId: number | string): Promise<AltaChecklist> {
    const response = await apiClient.post(`/rh/colaboradores/${colaboradorId}/activar`);
    return normalizeAlta(extractData<unknown>(response.data));
  },

  async jerarquia(colaboradorId: number | string): Promise<Jerarquia> {
    const response = await apiClient.get(`/rh/colaboradores/${colaboradorId}/jerarquia`);
    return normalizeJerarquia(extractData<unknown>(response.data));
  },

  async contratos(colaboradorId: number | string): Promise<ContratoLaboral[]> {
    const response = await apiClient.get(`/rh/colaboradores/${colaboradorId}/contratos`);
    return asArray(extractData<unknown>(response.data)).map(normalizeContrato);
  },
};

export const rhContratosApi = {
  /** `GET /rh/contratos/por-vencer?dias=` — `dias_para_vencer` lo calcula el backend. */
  async porVencer(dias = 30): Promise<{ contratos: ContratoLaboral[]; dias: number }> {
    const response = await apiClient.get('/rh/contratos/por-vencer', { params: { dias } });
    const root = asRecord(response.data);
    return {
      contratos: asArray(root.data).map(normalizeContrato),
      dias: typeof root.dias === 'number' ? root.dias : dias,
    };
  },
};

// ------------------------------------------------------------ Documentos laborales

export interface RhDocumentosLaboralesParams {
  etapa?: EtapaDocumentoLaboral;
  estado?: string;
  colaborador_id?: number | string;
  categoria?: string;
  page?: number;
  per_page?: number;
}

export interface FirmaFisicaPayload {
  huella_registrada?: boolean;
  testigos?: Testigo[];
  observaciones?: string | null;
}

export interface EnvioPayload {
  paqueteria: string;
  numero_guia: string;
  observaciones?: string | null;
  comprobante?: LocalUploadFile | null;
}

export const rhDocumentosLaboralesApi = {
  async list(params: RhDocumentosLaboralesParams = {}): Promise<Paginated<LaborDocument>> {
    const response = await apiClient.get('/rh/documentos-laborales', { params });
    return normalizePaginated(response.data, normalizeLaborDocument);
  },

  async pendientes(): Promise<LaborDocumentPendingCounts> {
    const response = await apiClient.get('/rh/documentos-laborales/pendientes');
    return normalizeLaborDocumentPendingCounts(extractData<unknown>(response.data));
  },

  async get(id: number | string): Promise<LaborDocument> {
    const response = await apiClient.get(`/rh/documentos-laborales/${id}`);
    return normalizeLaborDocument(extractData<unknown>(response.data));
  },

  descargarPath(id: number | string): string {
    return `/rh/documentos-laborales/${id}/descargar`;
  },

  async imprimir(id: number | string, observaciones?: string | null): Promise<LaborDocument> {
    const response = await apiClient.post(`/rh/documentos-laborales/${id}/imprimir`, { observaciones: observaciones || null });
    return normalizeLaborDocument(extractData<unknown>(response.data));
  },

  async firmaFisica(id: number | string, payload: FirmaFisicaPayload): Promise<LaborDocument> {
    const response = await apiClient.post(`/rh/documentos-laborales/${id}/firma-fisica`, payload);
    return normalizeLaborDocument(extractData<unknown>(response.data));
  },

  async envio(id: number | string, { comprobante, ...datos }: EnvioPayload): Promise<LaborDocument> {
    const formData = new FormData();
    formData.append('paqueteria', datos.paqueteria);
    formData.append('numero_guia', datos.numero_guia);
    if (datos.observaciones) formData.append('observaciones', datos.observaciones);
    if (comprobante) appendFile(formData, 'comprobante', comprobante);
    const response = await apiClient.post(`/rh/documentos-laborales/${id}/envio`, formData, { headers: multipartHeaders });
    return normalizeLaborDocument(extractData<unknown>(response.data));
  },

  async recepcion(id: number | string, observaciones?: string | null): Promise<LaborDocument> {
    const response = await apiClient.post(`/rh/documentos-laborales/${id}/recepcion`, { observaciones: observaciones || null });
    return normalizeLaborDocument(extractData<unknown>(response.data));
  },

  async escaneo(id: number | string, archivo: LocalUploadFile, observaciones?: string | null): Promise<LaborDocument> {
    const formData = new FormData();
    appendFile(formData, 'archivo', archivo);
    if (observaciones) formData.append('observaciones', observaciones);
    const response = await apiClient.post(`/rh/documentos-laborales/${id}/escaneo`, formData, { headers: multipartHeaders });
    return normalizeLaborDocument(extractData<unknown>(response.data));
  },

  async archivar(id: number | string, observaciones?: string | null): Promise<LaborDocument> {
    const response = await apiClient.post(`/rh/documentos-laborales/${id}/archivar`, { observaciones: observaciones || null });
    return normalizeLaborDocument(extractData<unknown>(response.data));
  },

  async cancelar(id: number | string, motivo: string): Promise<LaborDocument> {
    const response = await apiClient.post(`/rh/documentos-laborales/${id}/cancelar`, { motivo });
    return normalizeLaborDocument(extractData<unknown>(response.data));
  },
};

// ------------------------------------------------------------ Cierres / finiquito

export const rhCierresApi = {
  async list(params: { estado?: string; page?: number; per_page?: number } = {}): Promise<Paginated<CierreLaboral>> {
    const response = await apiClient.get('/rh/cierres', { params });
    return normalizePaginated(response.data, normalizeCierre);
  },

  async get(id: number | string): Promise<CierreLaboral> {
    const response = await apiClient.get(`/rh/cierres/${id}`);
    return normalizeCierre(extractData<unknown>(response.data));
  },

  async iniciar(colaboradorId: number | string, payload: IniciarCierrePayload): Promise<CierreLaboral> {
    const response = await apiClient.post(`/rh/colaboradores/${colaboradorId}/cierres`, payload);
    return normalizeCierre(extractData<unknown>(response.data));
  },

  async aviso(id: number | string, archivo: LocalUploadFile): Promise<CierreLaboral> {
    const formData = new FormData();
    appendFile(formData, 'archivo', archivo);
    const response = await apiClient.post(`/rh/cierres/${id}/aviso`, formData, { headers: multipartHeaders });
    return normalizeCierre(extractData<unknown>(response.data));
  },

  /** Genera el aviso de término por plantilla (`aviso_termino`) — 422 si no hay plantilla activa. */
  async generarAviso(id: number | string): Promise<LaborDocument> {
    const response = await apiClient.post(`/rh/cierres/${id}/aviso/generar`);
    return normalizeLaborDocument(extractData<unknown>(response.data));
  },

  /** El cálculo lo hace el backend (`FiniquitoService`); la app solo manda los insumos que pide el FormRequest. */
  async calcularFiniquito(id: number | string, sueldoMensual: number, sueldoPendiente?: number | null): Promise<CierreLaboral> {
    const response = await apiClient.post(`/rh/cierres/${id}/finiquito/calcular`, {
      sueldo_mensual: sueldoMensual,
      ...(sueldoPendiente !== undefined && sueldoPendiente !== null ? { sueldo_pendiente: sueldoPendiente } : {}),
    });
    return normalizeCierre(extractData<unknown>(response.data));
  },

  async agregarConcepto(id: number | string, payload: FiniquitoConceptoPayload): Promise<CierreLaboral> {
    const response = await apiClient.post(`/rh/cierres/${id}/finiquito/conceptos`, payload);
    return normalizeCierre(extractData<unknown>(response.data));
  },

  async actualizarConcepto(id: number | string, conceptoId: number | string, payload: Partial<FiniquitoConceptoPayload>): Promise<CierreLaboral> {
    const response = await apiClient.patch(`/rh/cierres/${id}/finiquito/conceptos/${conceptoId}`, payload);
    return normalizeCierre(extractData<unknown>(response.data));
  },

  async eliminarConcepto(id: number | string, conceptoId: number | string): Promise<CierreLaboral> {
    const response = await apiClient.delete(`/rh/cierres/${id}/finiquito/conceptos/${conceptoId}`);
    return normalizeCierre(extractData<unknown>(response.data));
  },

  async revisarFiniquito(id: number | string): Promise<CierreLaboral> {
    const response = await apiClient.post(`/rh/cierres/${id}/finiquito/revisar`);
    return normalizeCierre(extractData<unknown>(response.data));
  },

  async generarFiniquito(id: number | string): Promise<{ cierre: CierreLaboral; documento_id: number | null }> {
    const response = await apiClient.post(`/rh/cierres/${id}/finiquito/documento`);
    const root = asRecord(response.data);
    return {
      cierre: normalizeCierre(root.data),
      documento_id: typeof root.documento_id === 'number' ? root.documento_id : null,
    };
  },

  async finiquitoFirmado(id: number | string, archivo: LocalUploadFile): Promise<CierreLaboral> {
    const formData = new FormData();
    appendFile(formData, 'archivo', archivo);
    const response = await apiClient.post(`/rh/cierres/${id}/finiquito/firmado`, formData, { headers: multipartHeaders });
    return normalizeCierre(extractData<unknown>(response.data));
  },

  /** Confirmación ADMINISTRATIVA del pago (referencia). People no dispersa pagos. */
  async confirmarPago(id: number | string, referenciaPago: string): Promise<CierreLaboral> {
    const response = await apiClient.post(`/rh/cierres/${id}/finiquito/pago`, { referencia_pago: referenciaPago });
    return normalizeCierre(extractData<unknown>(response.data));
  },

  async ejecutarBaja(id: number | string): Promise<CierreLaboral> {
    const response = await apiClient.post(`/rh/cierres/${id}/ejecutar-baja`);
    return normalizeCierre(extractData<unknown>(response.data));
  },

  async cerrarExpediente(id: number | string): Promise<CierreLaboral> {
    const response = await apiClient.post(`/rh/cierres/${id}/cerrar-expediente`);
    return normalizeCierre(extractData<unknown>(response.data));
  },

  async cancelar(id: number | string, motivo: string): Promise<CierreLaboral> {
    const response = await apiClient.post(`/rh/cierres/${id}/cancelar`, { motivo });
    return normalizeCierre(extractData<unknown>(response.data));
  },
};

// ------------------------------------------------------------ Recibos

export interface RhRecibosParams {
  periodo_inicio?: string;
  periodo_fin?: string;
  colaborador_id?: number | string;
  lote?: string;
  page?: number;
  per_page?: number;
}

export interface ReciboConceptoPayload {
  tipo: 'percepcion' | 'deduccion';
  concepto: string;
  cantidad?: number | null;
  importe: number;
  observaciones?: string | null;
}

export interface CrearReciboPayload {
  periodo_inicio: string;
  periodo_fin: string;
  fecha_pago?: string | null;
  tipo_periodo?: 'semanal' | 'quincenal' | 'mensual' | 'libre';
  observaciones?: string | null;
  conceptos: ReciboConceptoPayload[];
}

export interface ImportarRecibosPayload {
  archivo: LocalUploadFile;
  periodo_inicio: string;
  periodo_fin: string;
  fecha_pago?: string | null;
  simular?: boolean;
}

export const rhRecibosApi = {
  async list(params: RhRecibosParams = {}): Promise<Paginated<ReciboNomina>> {
    const response = await apiClient.get('/rh/recibos', { params });
    return normalizePaginated(response.data, normalizeRecibo);
  },

  async get(id: number | string): Promise<ReciboNomina> {
    const response = await apiClient.get(`/rh/recibos/${id}`);
    return normalizeRecibo(extractData<unknown>(response.data));
  },

  pdfPath(id: number | string): string {
    return `/rh/recibos/${id}/pdf`;
  },

  async regenerarPdf(id: number | string): Promise<ReciboNomina> {
    const response = await apiClient.post(`/rh/recibos/${id}/regenerar-pdf`);
    return normalizeRecibo(extractData<unknown>(response.data));
  },

  async crear(colaboradorId: number | string, payload: CrearReciboPayload): Promise<ReciboNomina> {
    const response = await apiClient.post(`/rh/colaboradores/${colaboradorId}/recibos`, payload);
    return normalizeRecibo(extractData<unknown>(response.data));
  },

  async importar({ archivo, ...datos }: ImportarRecibosPayload): Promise<ReciboImportResult> {
    const formData = new FormData();
    appendFile(formData, 'archivo', archivo);
    formData.append('periodo_inicio', datos.periodo_inicio);
    formData.append('periodo_fin', datos.periodo_fin);
    if (datos.fecha_pago) formData.append('fecha_pago', datos.fecha_pago);
    // Laravel `boolean` acepta "1"/"0" en multipart (no "true"/"false").
    formData.append('simular', datos.simular ? '1' : '0');
    const response = await apiClient.post('/rh/recibos/importar', formData, { headers: multipartHeaders, timeout: 120_000 });
    return normalizeReciboImport(extractData<unknown>(response.data));
  },
};

// ------------------------------------------------------------ Préstamos

export interface AutorizarPrestamoPayload {
  monto_autorizado: number;
  plazo_autorizado: number;
  periodicidad?: 'semanal' | 'quincenal' | 'mensual';
  pago_programado?: number | null;
  observaciones?: string | null;
}

export const rhPrestamosApi = {
  async list(params: { estado?: string; colaborador_id?: number | string; page?: number; per_page?: number } = {}): Promise<Paginated<Prestamo>> {
    const response = await apiClient.get('/rh/prestamos', { params });
    return normalizePaginated(response.data, normalizePrestamo);
  },

  async get(id: number | string): Promise<Prestamo> {
    const response = await apiClient.get(`/rh/prestamos/${id}`);
    return normalizePrestamo(extractData<unknown>(response.data));
  },

  async autorizar(solicitudId: number | string, payload: AutorizarPrestamoPayload): Promise<Prestamo> {
    const response = await apiClient.post(`/rh/solicitudes/${solicitudId}/prestamo/autorizar`, payload);
    return normalizePrestamo(extractData<unknown>(response.data));
  },

  async rechazar(solicitudId: number | string, motivo: string): Promise<void> {
    await apiClient.post(`/rh/solicitudes/${solicitudId}/prestamo/rechazar`, { motivo });
  },

  /** Contrato de préstamo + pagaré por plantilla; las claves sin plantilla regresan en `pendientes`. */
  async generarDocumentos(id: number | string): Promise<PrestamoDocumentosResult> {
    const response = await apiClient.post(`/rh/prestamos/${id}/documentos`);
    return normalizePrestamoDocumentos(extractData<unknown>(response.data));
  },

  async resguardar(id: number | string): Promise<Prestamo> {
    const response = await apiClient.post(`/rh/prestamos/${id}/resguardar`);
    return normalizePrestamo(extractData<unknown>(response.data));
  },
};

// ------------------------------------------------------------ Actas

export const rhActasApi = {
  async list(params: { tipo?: string; estado?: string; colaborador_id?: number | string; page?: number; per_page?: number } = {}): Promise<Paginated<Acta>> {
    const response = await apiClient.get('/rh/actas', { params });
    return normalizePaginated(response.data, normalizeActa);
  },

  async get(id: number | string): Promise<Acta> {
    const response = await apiClient.get(`/rh/actas/${id}`);
    return normalizeActa(extractData<unknown>(response.data));
  },

  async crear(colaboradorId: number | string, payload: GuardarActaPayload): Promise<Acta> {
    const response = await apiClient.post(`/rh/colaboradores/${colaboradorId}/actas`, payload);
    return normalizeActa(extractData<unknown>(response.data));
  },

  /** PATCH prohíbe `tipo` (`GuardarActaRequest`): se omite siempre. */
  async actualizar(id: number | string, { tipo: _tipo, ...payload }: GuardarActaPayload): Promise<Acta> {
    const response = await apiClient.patch(`/rh/actas/${id}`, payload);
    return normalizeActa(extractData<unknown>(response.data));
  },

  async anexo(id: number | string, archivo: LocalUploadFile, descripcion?: string | null): Promise<Acta> {
    const formData = new FormData();
    appendFile(formData, 'archivo', archivo);
    if (descripcion) formData.append('descripcion', descripcion);
    const response = await apiClient.post(`/rh/actas/${id}/anexos`, formData, { headers: multipartHeaders });
    return normalizeActa(extractData<unknown>(response.data));
  },

  anexoPath(id: number | string, anexoId: number | string): string {
    return `/rh/actas/${id}/anexos/${anexoId}`;
  },

  async generarDocumento(id: number | string): Promise<LaborDocument> {
    const response = await apiClient.post(`/rh/actas/${id}/documento`);
    return normalizeLaborDocument(extractData<unknown>(response.data));
  },

  async negativaFirma(id: number | string, motivo: string): Promise<Acta> {
    const response = await apiClient.post(`/rh/actas/${id}/negativa-firma`, { motivo });
    return normalizeActa(extractData<unknown>(response.data));
  },

  async seguimiento(id: number | string, nota: string): Promise<Acta> {
    const response = await apiClient.post(`/rh/actas/${id}/seguimiento`, { nota });
    return normalizeActa(extractData<unknown>(response.data));
  },

  async cerrar(id: number | string): Promise<Acta> {
    const response = await apiClient.post(`/rh/actas/${id}/cerrar`);
    return normalizeActa(extractData<unknown>(response.data));
  },
};

// ------------------------------------------------------------ Estructura e indicadores

export interface IndicadoresParams {
  desde?: string;
  hasta?: string;
  sucursal_id?: number;
  empresa_id?: number;
  dias_vencimiento?: number;
}

export const rhEstructuraApi = {
  async cobertura(params: { sucursal_id?: number; empresa_id?: number } = {}): Promise<Cobertura> {
    const response = await apiClient.get('/rh/plantilla/cobertura', { params });
    return normalizeCobertura(extractData<unknown>(response.data));
  },

  async indicadores(params: IndicadoresParams = {}): Promise<IndicadoresRh> {
    const response = await apiClient.get('/rh/indicadores', { params });
    return normalizeIndicadores(extractData<unknown>(response.data));
  },

  async organigrama(params: { sucursal_id?: number; departamento_id?: number } = {}): Promise<PersonaOrganigrama[]> {
    const response = await apiClient.get('/rh/organigrama', { params });
    return asArray(extractData<unknown>(response.data))
      .map(normalizeOrganigramaPersona)
      .filter((n): n is PersonaOrganigrama => n !== null);
  },

  async vacante(id: number | string): Promise<VacanteDetalle> {
    const response = await apiClient.get(`/rh/vacantes/${id}`);
    return normalizeVacanteDetalle(extractData<unknown>(response.data));
  },

  /** Solo CONSULTA desde móvil: la carga de plantillas DOCX se administra en el Portal RH. */
  async plantillasDocumentales(): Promise<PlantillasDocumentales> {
    const response = await apiClient.get('/rh/plantillas-documentales');
    return normalizePlantillas(response.data);
  },
};
