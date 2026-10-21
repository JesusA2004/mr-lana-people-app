import { apiClient, extractData } from './client';

import type { EstadoRegistro } from '@/types/registro';

/**
 * Registro completo antes de entrar (cuenta creada con el QR de
 * incorporación) — `App\Http\Controllers\Api\V1\RegistroAppController`.
 * Los documentos se suben con `documentosApi.upload` (mismo endpoint del
 * checklist de incorporación).
 */
export const registroApi = {
  async estado(): Promise<EstadoRegistro> {
    const response = await apiClient.get('/colaborador/registro');
    return extractData<EstadoRegistro>(response.data);
  },

  /** Guarda un paso del asistente (solo los campos que la persona puede capturar). */
  async guardarDatos(datos: Record<string, string>, datosMedicos?: { condicion_medica?: string; alergias?: string }): Promise<EstadoRegistro> {
    const response = await apiClient.post('/colaborador/registro/datos', {
      ...(Object.keys(datos).length > 0 ? { datos } : {}),
      ...(datosMedicos ? { datos_medicos: datosMedicos } : {}),
    });
    return extractData<EstadoRegistro>(response.data);
  },

  /**
   * Cierra el registro (el backend vuelve a verificar datos y documentos).
   * `documentosSinTener`: `document_type_id` de los documentos requeridos
   * que la persona marcó «No tengo este documento» — el backend genera una
   * carta compromiso (7 días para subirlos) y la devuelve en
   * `carta_compromiso`. Se acepta dentro de `data` o junto a ella.
   */
  async finalizar(documentosSinTener: number[] = []): Promise<EstadoRegistro> {
    const response = await apiClient.post(
      '/colaborador/registro/finalizar',
      documentosSinTener.length > 0 ? { documentos_sin_tener: documentosSinTener } : undefined,
    );
    const estado = extractData<EstadoRegistro>(response.data);
    const raiz = response.data as { carta_compromiso?: EstadoRegistro['carta_compromiso'] } | undefined;
    return { ...estado, carta_compromiso: estado.carta_compromiso ?? raiz?.carta_compromiso ?? null };
  },
};
