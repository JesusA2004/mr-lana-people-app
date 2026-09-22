import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import {
  rhActasApi,
  rhAltaApi,
  rhCierresApi,
  rhContratosApi,
  rhDocumentosLaboralesApi,
  rhEstructuraApi,
  rhPrestamosApi,
  rhRecibosApi,
  type AutorizarPrestamoPayload,
  type CrearReciboPayload,
  type EnvioPayload,
  type FirmaFisicaPayload,
  type ImportarRecibosPayload,
  type IndicadoresParams,
  type RhDocumentosLaboralesParams,
  type RhRecibosParams,
} from '@/api/rh/cicloLaboral';
import type { LocalUploadFile } from '@/api/upload';
import type { FiniquitoConceptoPayload, GuardarActaPayload, IniciarCierrePayload } from '@/types/rhCiclo';
import { nextPageOf } from '@/utils/normalize';
import { invalidateCiclo } from './cicloInvalidate';
import { retryUnlessClientError, SENSITIVE_MUTATION } from './queryOptions';

/**
 * Hooks de Gestión RH para el ciclo laboral. Todas las lecturas se montan
 * con `enabled` explícito: el detalle del colaborador carga cada sección
 * SOLO cuando el usuario la expande (lazy), nunca todo al abrir.
 */

// ------------------------------------------------------------ Colaborador: alta, jerarquía, contratos

export function useRhAlta(colaboradorId: string | number | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rhAlta(colaboradorId ?? ''),
    queryFn: () => rhAltaApi.checklist(colaboradorId as string | number),
    enabled: enabled && !!colaboradorId,
    retry: retryUnlessClientError,
  });
}

export function useRhActivarColaborador(colaboradorId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: () => rhAltaApi.activar(colaboradorId),
    onSuccess: (alta) => {
      queryClient.setQueryData(queryKeys.rhAlta(colaboradorId), alta);
      invalidateCiclo(queryClient, { type: 'rh_alta_activada', colaboradorId });
    },
  });
}

export function useRhColaboradorJerarquia(colaboradorId: string | number | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rhColaboradorJerarquia(colaboradorId ?? ''),
    queryFn: () => rhAltaApi.jerarquia(colaboradorId as string | number),
    enabled: enabled && !!colaboradorId,
    retry: retryUnlessClientError,
  });
}

export function useRhColaboradorContratos(colaboradorId: string | number | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rhColaboradorContratos(colaboradorId ?? ''),
    queryFn: () => rhAltaApi.contratos(colaboradorId as string | number),
    enabled: enabled && !!colaboradorId,
    retry: retryUnlessClientError,
  });
}

export function useRhContratosPorVencer(dias: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rhContratosPorVencer(dias),
    queryFn: () => rhContratosApi.porVencer(dias),
    enabled,
    retry: retryUnlessClientError,
  });
}

// ------------------------------------------------------------ Documentos laborales

export function useRhDocumentosLaborales(params: Omit<RhDocumentosLaboralesParams, 'page'>, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.rhDocumentosLaboralesList(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => rhDocumentosLaboralesApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    retry: retryUnlessClientError,
  });
}

export function useRhDocumentosLaboralesPendientes(enabled = true) {
  return useQuery({
    queryKey: queryKeys.rhDocumentosLaboralesPendientes,
    queryFn: rhDocumentosLaboralesApi.pendientes,
    enabled,
    retry: retryUnlessClientError,
  });
}

export function useRhDocumentoLaboral(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhDocumentoLaboral(id ?? ''),
    queryFn: () => rhDocumentosLaboralesApi.get(id as string | number),
    enabled: id !== undefined && id !== '',
    retry: retryUnlessClientError,
  });
}

export type RhDocumentoOperacion =
  | { tipo: 'imprimir'; observaciones?: string | null }
  | { tipo: 'firma_fisica'; payload: FirmaFisicaPayload }
  | { tipo: 'envio'; payload: EnvioPayload }
  | { tipo: 'recepcion'; observaciones?: string | null }
  | { tipo: 'escaneo'; archivo: LocalUploadFile; observaciones?: string | null }
  | { tipo: 'archivar'; observaciones?: string | null }
  | { tipo: 'cancelar'; motivo: string };

export function useRhOperarDocumentoLaboral(id: number, colaboradorId?: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: (op: RhDocumentoOperacion) => {
      switch (op.tipo) {
        case 'imprimir':
          return rhDocumentosLaboralesApi.imprimir(id, op.observaciones);
        case 'firma_fisica':
          return rhDocumentosLaboralesApi.firmaFisica(id, op.payload);
        case 'envio':
          return rhDocumentosLaboralesApi.envio(id, op.payload);
        case 'recepcion':
          return rhDocumentosLaboralesApi.recepcion(id, op.observaciones);
        case 'escaneo':
          return rhDocumentosLaboralesApi.escaneo(id, op.archivo, op.observaciones);
        case 'archivar':
          return rhDocumentosLaboralesApi.archivar(id, op.observaciones);
        case 'cancelar':
          return rhDocumentosLaboralesApi.cancelar(id, op.motivo);
      }
    },
    onSuccess: (documento) => {
      queryClient.setQueryData(queryKeys.rhDocumentoLaboral(id), documento);
      invalidateCiclo(queryClient, { type: 'rh_documento_laboral', documentoId: id, colaboradorId });
    },
  });
}

// ------------------------------------------------------------ Cierres

export function useRhCierres(estado: string | undefined, enabled = true) {
  const params = estado ? { estado } : {};
  return useInfiniteQuery({
    queryKey: queryKeys.rhCierresList(params),
    queryFn: ({ pageParam }) => rhCierresApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    retry: retryUnlessClientError,
  });
}

export function useRhCierre(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhCierre(id ?? ''),
    queryFn: () => rhCierresApi.get(id as string | number),
    enabled: id !== undefined && id !== '',
    retry: retryUnlessClientError,
  });
}

export function useRhIniciarCierre(colaboradorId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: (payload: IniciarCierrePayload) => rhCierresApi.iniciar(colaboradorId, payload),
    onSuccess: (cierre) => {
      queryClient.setQueryData(queryKeys.rhCierre(cierre.id), cierre);
      invalidateCiclo(queryClient, { type: 'rh_cierre', cierreId: cierre.id, colaboradorId });
    },
  });
}

export type RhCierreOperacion =
  | { tipo: 'aviso'; archivo: LocalUploadFile }
  | { tipo: 'generar_aviso' }
  | { tipo: 'calcular'; sueldoMensual: number; sueldoPendiente?: number | null }
  | { tipo: 'agregar_concepto'; payload: FiniquitoConceptoPayload }
  | { tipo: 'actualizar_concepto'; conceptoId: number; payload: Partial<FiniquitoConceptoPayload> }
  | { tipo: 'eliminar_concepto'; conceptoId: number }
  | { tipo: 'revisar' }
  | { tipo: 'generar_finiquito' }
  | { tipo: 'finiquito_firmado'; archivo: LocalUploadFile }
  | { tipo: 'confirmar_pago'; referencia: string }
  | { tipo: 'ejecutar_baja' }
  | { tipo: 'cerrar_expediente' }
  | { tipo: 'cancelar'; motivo: string };

export function useRhOperarCierre(id: number, colaboradorId?: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: async (op: RhCierreOperacion) => {
      switch (op.tipo) {
        case 'aviso':
          return rhCierresApi.aviso(id, op.archivo);
        case 'generar_aviso':
          await rhCierresApi.generarAviso(id);
          return rhCierresApi.get(id);
        case 'calcular':
          return rhCierresApi.calcularFiniquito(id, op.sueldoMensual, op.sueldoPendiente);
        case 'agregar_concepto':
          return rhCierresApi.agregarConcepto(id, op.payload);
        case 'actualizar_concepto':
          return rhCierresApi.actualizarConcepto(id, op.conceptoId, op.payload);
        case 'eliminar_concepto':
          return rhCierresApi.eliminarConcepto(id, op.conceptoId);
        case 'revisar':
          return rhCierresApi.revisarFiniquito(id);
        case 'generar_finiquito':
          return (await rhCierresApi.generarFiniquito(id)).cierre;
        case 'finiquito_firmado':
          return rhCierresApi.finiquitoFirmado(id, op.archivo);
        case 'confirmar_pago':
          return rhCierresApi.confirmarPago(id, op.referencia);
        case 'ejecutar_baja':
          return rhCierresApi.ejecutarBaja(id);
        case 'cerrar_expediente':
          return rhCierresApi.cerrarExpediente(id);
        case 'cancelar':
          return rhCierresApi.cancelar(id, op.motivo);
      }
    },
    onSuccess: (cierre) => {
      queryClient.setQueryData(queryKeys.rhCierre(id), cierre);
      invalidateCiclo(queryClient, { type: 'rh_cierre', cierreId: id, colaboradorId });
    },
  });
}

// ------------------------------------------------------------ Recibos

export function useRhRecibos(params: Omit<RhRecibosParams, 'page'>, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.rhRecibosList(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => rhRecibosApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    retry: retryUnlessClientError,
  });
}

export function useRhRecibo(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhRecibo(id ?? ''),
    queryFn: () => rhRecibosApi.get(id as string | number),
    enabled: id !== undefined && id !== '',
    retry: retryUnlessClientError,
  });
}

export function useRhRegenerarReciboPdf(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: () => rhRecibosApi.regenerarPdf(id),
    onSuccess: (recibo) => {
      queryClient.setQueryData(queryKeys.rhRecibo(id), recibo);
      invalidateCiclo(queryClient, { type: 'rh_recibo', reciboId: id });
    },
  });
}

export function useRhCrearRecibo(colaboradorId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: (payload: CrearReciboPayload) => rhRecibosApi.crear(colaboradorId, payload),
    onSuccess: (recibo) => {
      queryClient.setQueryData(queryKeys.rhRecibo(recibo.id), recibo);
      invalidateCiclo(queryClient, { type: 'rh_recibo', reciboId: recibo.id });
    },
  });
}

export function useRhImportarRecibos() {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: (payload: ImportarRecibosPayload) => rhRecibosApi.importar(payload),
    onSuccess: (result) => {
      if (!result.simulacion) invalidateCiclo(queryClient, { type: 'rh_recibo' });
    },
  });
}

// ------------------------------------------------------------ Préstamos

export function useRhPrestamos(filtros: { estado?: string; colaborador_id?: string | number }, enabled = true) {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== '')) as { estado?: string; colaborador_id?: string | number };
  return useInfiniteQuery({
    queryKey: queryKeys.rhPrestamosList(params),
    queryFn: ({ pageParam }) => rhPrestamosApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    retry: retryUnlessClientError,
  });
}

export function useRhPrestamo(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhPrestamo(id ?? ''),
    queryFn: () => rhPrestamosApi.get(id as string | number),
    enabled: id !== undefined && id !== '',
    retry: retryUnlessClientError,
  });
}

export function useRhOperarPrestamo(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: async (op: 'generar_documentos' | 'resguardar') => {
      if (op === 'resguardar') return { prestamo: await rhPrestamosApi.resguardar(id), pendientes: [] as string[] };
      const result = await rhPrestamosApi.generarDocumentos(id);
      return { prestamo: await rhPrestamosApi.get(id), pendientes: result.pendientes };
    },
    onSuccess: ({ prestamo }) => {
      queryClient.setQueryData(queryKeys.rhPrestamo(id), prestamo);
      invalidateCiclo(queryClient, { type: 'rh_prestamo', prestamoId: id });
    },
  });
}

export function useRhDecidirPrestamo(solicitudId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: async (op: { tipo: 'autorizar'; payload: AutorizarPrestamoPayload } | { tipo: 'rechazar'; motivo: string }) => {
      if (op.tipo === 'autorizar') return rhPrestamosApi.autorizar(solicitudId, op.payload);
      await rhPrestamosApi.rechazar(solicitudId, op.motivo);
      return null;
    },
    onSuccess: () => invalidateCiclo(queryClient, { type: 'rh_prestamo', solicitudId }),
  });
}

// ------------------------------------------------------------ Actas

export function useRhActas(params: { estado?: string; colaborador_id?: number | string }, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.rhActasList(params),
    queryFn: ({ pageParam }) => rhActasApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    retry: retryUnlessClientError,
  });
}

export function useRhActa(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhActa(id ?? ''),
    queryFn: () => rhActasApi.get(id as string | number),
    enabled: id !== undefined && id !== '',
    retry: retryUnlessClientError,
  });
}

export function useRhGuardarActa() {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: ({ actaId, colaboradorId, payload }: { actaId?: number; colaboradorId?: number | string; payload: GuardarActaPayload }) => {
      if (actaId) return rhActasApi.actualizar(actaId, payload);
      return rhActasApi.crear(colaboradorId as number | string, payload);
    },
    onSuccess: (acta) => {
      queryClient.setQueryData(queryKeys.rhActa(acta.id), acta);
      invalidateCiclo(queryClient, { type: 'rh_acta', actaId: acta.id });
    },
  });
}

export type RhActaOperacion =
  | { tipo: 'anexo'; archivo: LocalUploadFile; descripcion?: string | null }
  | { tipo: 'generar_documento' }
  | { tipo: 'negativa_firma'; motivo: string }
  | { tipo: 'seguimiento'; nota: string }
  | { tipo: 'cerrar' };

export function useRhOperarActa(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: async (op: RhActaOperacion) => {
      switch (op.tipo) {
        case 'anexo':
          return rhActasApi.anexo(id, op.archivo, op.descripcion);
        case 'generar_documento':
          await rhActasApi.generarDocumento(id);
          return rhActasApi.get(id);
        case 'negativa_firma':
          return rhActasApi.negativaFirma(id, op.motivo);
        case 'seguimiento':
          return rhActasApi.seguimiento(id, op.nota);
        case 'cerrar':
          return rhActasApi.cerrar(id);
      }
    },
    onSuccess: (acta) => {
      queryClient.setQueryData(queryKeys.rhActa(id), acta);
      invalidateCiclo(queryClient, { type: 'rh_acta', actaId: id });
    },
  });
}

// ------------------------------------------------------------ Estructura

export function useRhCobertura(params: { sucursal_id?: number }, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rhCobertura(params),
    queryFn: () => rhEstructuraApi.cobertura(params),
    enabled,
    retry: retryUnlessClientError,
  });
}

export function useRhIndicadores(params: IndicadoresParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rhIndicadores(params as Record<string, unknown>),
    queryFn: () => rhEstructuraApi.indicadores(params),
    enabled,
    retry: retryUnlessClientError,
    staleTime: 5 * 60_000,
  });
}

export function useRhOrganigramaPersonas(params: { sucursal_id?: number }, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rhOrganigramaPersonas(params),
    queryFn: () => rhEstructuraApi.organigrama(params),
    enabled,
    retry: retryUnlessClientError,
    staleTime: 5 * 60_000,
  });
}

export function useRhVacante(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhVacante(id ?? ''),
    queryFn: () => rhEstructuraApi.vacante(id as string | number),
    enabled: id !== undefined && id !== '',
    retry: retryUnlessClientError,
  });
}

export function useRhPlantillasDocumentales(enabled = true) {
  return useQuery({
    queryKey: queryKeys.rhPlantillasDocumentales,
    queryFn: rhEstructuraApi.plantillasDocumentales,
    enabled,
    retry: retryUnlessClientError,
  });
}
