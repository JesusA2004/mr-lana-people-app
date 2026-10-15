import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import {
  rhActasApi,
  rhAltaApi,
  rhCierresApi,
  rhContratosApi,
  rhDocumentosLaboralesApi,
  rhPrestamosApi,
  type AutorizarPrestamoPayload,
  type EnvioPayload,
  type FirmaFisicaPayload,
  type RhDocumentosLaboralesParams,
} from '@/api/rh/cicloLaboral';
import type { LocalUploadFile } from '@/api/upload';
import type { FiniquitoConceptoPayload } from '@/types/rhCiclo';
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

export function useRhCierre(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhCierre(id ?? ''),
    queryFn: () => rhCierresApi.get(id as string | number),
    enabled: id !== undefined && id !== '',
    retry: retryUnlessClientError,
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

// ------------------------------------------------------------ Préstamos

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

// ------------------------------------------------------------ Estructura

