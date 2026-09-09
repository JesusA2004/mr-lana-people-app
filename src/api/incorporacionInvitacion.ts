import { apiClient } from './client';

import type { InvitacionValidarResponse, RegistrarQrPayload, RegistrarQrResponse } from '@/types/invitation';

/**
 * Endpoints públicos (sin `auth:sanctum`, sin Bearer token) del flujo de
 * registro por QR — `App\Http\Controllers\Api\V1\IncorporacionInvitacionController`
 * en capacitaciones. Ninguno de los dos responde envuelto en `{ data: ... }`,
 * así que aquí no se usa `extractData`.
 */
export const incorporacionInvitacionApi = {
  /** GET /api/v1/incorporacion/invitaciones/{token}/validar */
  async validar(token: string): Promise<InvitacionValidarResponse> {
    const response = await apiClient.get(`/incorporacion/invitaciones/${token}/validar`);
    return response.data as InvitacionValidarResponse;
  },

  /** POST /api/v1/incorporacion/invitaciones/{token}/registrar */
  async registrar(token: string, payload: RegistrarQrPayload): Promise<RegistrarQrResponse> {
    const response = await apiClient.post(`/incorporacion/invitaciones/${token}/registrar`, payload);
    return response.data as RegistrarQrResponse;
  },
};
