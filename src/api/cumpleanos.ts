import { apiClient, extractData } from './client';

import type { BirthdayGreeting } from '@/types/birthday';
import { isNotFoundError } from '@/utils/errors';

/**
 * `GET /api/v1/colaborador/cumpleanos/felicitacion-actual[/imagen]` —
 * `App\Http\Controllers\Api\V1\ColaboradorCumpleanosController`. 404 real
 * cuando hoy no es cumpleaños del colaborador autenticado (estado normal,
 * no un error) — se normaliza a `null`.
 */
export const cumpleanosApi = {
  async getFelicitacionActual(): Promise<BirthdayGreeting | null> {
    try {
      const response = await apiClient.get('/colaborador/cumpleanos/felicitacion-actual');
      return extractData<BirthdayGreeting>(response.data);
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  },

  /** Ruta relativa de la imagen — se pide con Authorization Bearer manual (ver `useBirthdayImage`), nunca como URL pública. */
  imagenPath(): string {
    return '/colaborador/cumpleanos/felicitacion-actual/imagen';
  },
};
