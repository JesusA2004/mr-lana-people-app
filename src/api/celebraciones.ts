import { apiClient, extractData } from './client';

import type { PaginatedResponse } from '@/types/api';
import type { Celebracion, CelebracionMensaje } from '@/types/celebracion';
import type { LocalUploadFile } from '@/api/upload';

/**
 * Sistema unificado de celebraciones (`App\Http\Controllers\Api\V1\
 * CelebracionController`) — cumpleaños y aniversario laboral, mismo
 * registro y misma tarjeta. Ver `src/types/celebracion.ts` para la
 * diferencia con el cumpleaños "clásico" (`src/api/cumpleanos.ts`), que
 * sigue existiendo aparte.
 */
export const celebracionesApi = {
  /** `GET /api/v1/celebraciones/activas` — todo lo que el usuario autenticado puede ver hoy (cumpleaños Y aniversarios). */
  async activas(): Promise<Celebracion[]> {
    const response = await apiClient.get('/celebraciones/activas');
    return extractData<Celebracion[]>(response.data);
  },

  async getById(id: number | string): Promise<Celebracion> {
    const response = await apiClient.get(`/celebraciones/${id}`);
    return extractData<Celebracion>(response.data);
  },

  /** Ruta de streaming autenticado (Bearer) — nunca una URL pública. */
  tarjetaPath(id: number | string): string {
    return `/celebraciones/${id}/tarjeta`;
  },

  /** Foto del homenajeado — streaming autenticado. */
  fotoPath(id: number | string): string {
    return `/celebraciones/${id}/foto`;
  },

  async mensajes(id: number | string, page: number): Promise<PaginatedResponse<CelebracionMensaje>> {
    const response = await apiClient.get(`/celebraciones/${id}/mensajes`, { params: { page } });
    return response.data as PaginatedResponse<CelebracionMensaje>;
  },

  /** `POST .../mensajes` — solo si `puede_escribir` (una persona, un mensaje: 422 si ya dejó el suyo). */
  async publicarMensaje(id: number | string, payload: { mensaje?: string; foto?: LocalUploadFile | null }): Promise<CelebracionMensaje> {
    const formData = new FormData();
    if (payload.mensaje) formData.append('mensaje', payload.mensaje);
    if (payload.foto) formData.append('foto', { uri: payload.foto.uri, name: payload.foto.name, type: payload.foto.mimeType } as unknown as Blob);

    const response = await apiClient.post(`/celebraciones/${id}/mensajes`, formData);
    return extractData<CelebracionMensaje>(response.data);
  },

  /** Solo el autor puede editar el suyo. */
  async actualizarMensaje(id: number | string, mensajeId: number | string, mensaje: string): Promise<CelebracionMensaje> {
    const response = await apiClient.patch(`/celebraciones/${id}/mensajes/${mensajeId}`, { mensaje });
    return extractData<CelebracionMensaje>(response.data);
  },

  /** El autor o RH con permiso de moderación. */
  async eliminarMensaje(id: number | string, mensajeId: number | string): Promise<void> {
    await apiClient.delete(`/celebraciones/${id}/mensajes/${mensajeId}`);
  },
};
