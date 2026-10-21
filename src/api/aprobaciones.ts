import { apiClient, extractData } from './client';

import type { AprobacionItem, ConteoAprobaciones } from '@/types/aprobaciones';
import { normalizeAprobacionItem, normalizeConteoAprobaciones } from '@/utils/flujoAprobacion';
import { asArray, asRecord } from '@/utils/normalize';

/** Estados de RH donde todavía hay algo por decidir (lo demás ya es final). */
const ESTADOS_ABIERTOS_RH = ['enviada', 'en_revision'] as const;

/**
 * Motor de aprobaciones (backend 2026-10-20). La app solo consume lo que el
 * backend calcula: quién aprueba, si me toca y por qué no.
 */
export const aprobacionesApi = {
  /**
   * `GET /api/v1/equipo/aprobaciones/conteo` — badge único de «mis
   * aprobaciones pendientes»: SOLO lo que la cuenta puede aprobar AHORA.
   */
  async conteo(): Promise<ConteoAprobaciones> {
    const response = await apiClient.get('/equipo/aprobaciones/conteo');
    return normalizeConteoAprobaciones(extractData<unknown>(response.data));
  },

  /**
   * Solicitudes abiertas de la bandeja RH (`GET /rh/solicitudes`, primera
   * página por estado) con su flujo calculado para la cuenta: las que
   * puede autorizar ahora y las que esperan vistos buenos previos.
   */
  async abiertasRh(): Promise<AprobacionItem[]> {
    const paginas = await Promise.all(ESTADOS_ABIERTOS_RH.map((estado) => apiClient.get('/rh/solicitudes', { params: { estado } })));
    return paginas
      .flatMap((response) => asArray(asRecord(response.data).data))
      .map((item) => normalizeAprobacionItem(item, 'rh'))
      .filter((item): item is AprobacionItem => item !== null);
  },
};
