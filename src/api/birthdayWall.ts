import { apiClient, extractData } from './client';
import { appendFile, multipartHeaders, type LocalUploadFile } from './upload';

import type { PaginatedResponse } from '@/types/api';
import type { BirthdayWall, BirthdayWallMessage, RhBirthdayWallState } from '@/types/birthdayWall';

/** Una foto por mensaje (≤ 8 MB en backend): más margen que el timeout general por redes lentas. */
const PHOTO_UPLOAD_TIMEOUT_MS = 60_000;

/** `/api/v1/cumpleanos/muros/*` — `Api\V1\MuroCumpleanosController`. */
export const birthdayWallApi = {
  async list(): Promise<BirthdayWall[]> {
    const response = await apiClient.get('/cumpleanos/muros');
    return extractData<BirthdayWall[]>(response.data) ?? [];
  },

  async get(id: number | string): Promise<BirthdayWall> {
    const response = await apiClient.get(`/cumpleanos/muros/${id}`);
    return extractData<BirthdayWall>(response.data);
  },

  async mensajes(id: number | string, page = 1): Promise<PaginatedResponse<BirthdayWallMessage>> {
    const response = await apiClient.get(`/cumpleanos/muros/${id}/mensajes`, { params: { page } });
    return response.data as PaginatedResponse<BirthdayWallMessage>;
  },

  /** Multipart: `mensaje?` + `foto?` (al menos uno; el backend responde 422 si faltan ambos o el muro está cerrado). */
  async publicar(id: number | string, payload: { mensaje: string; foto: LocalUploadFile | null }): Promise<BirthdayWallMessage> {
    const formData = new FormData();
    if (payload.mensaje.trim()) formData.append('mensaje', payload.mensaje.trim());
    if (payload.foto) appendFile(formData, 'foto', payload.foto);
    const response = await apiClient.post(`/cumpleanos/muros/${id}/mensajes`, formData, { headers: multipartHeaders, timeout: PHOTO_UPLOAD_TIMEOUT_MS });
    return extractData<BirthdayWallMessage>(response.data);
  },

  async eliminar(id: number | string, mensajeId: number): Promise<void> {
    await apiClient.delete(`/cumpleanos/muros/${id}/mensajes/${mensajeId}`);
  },

  // RH (`rh.cumpleanos.muro.gestionar`).
  async abrir(greetingId: number | string): Promise<RhBirthdayWallState> {
    const response = await apiClient.post(`/rh/cumpleanos/${greetingId}/muro/abrir`);
    return extractData<RhBirthdayWallState>(response.data);
  },

  async cerrar(greetingId: number | string): Promise<RhBirthdayWallState> {
    const response = await apiClient.post(`/rh/cumpleanos/${greetingId}/muro/cerrar`);
    return extractData<RhBirthdayWallState>(response.data);
  },
};
