import { apiClient } from './client';

import type { AppTheme, AppThemeColors } from '@/types/theme';
import { asRecord, asString } from '@/utils/normalize';

/** `GET /api/v1/app/theme` — público, sin `auth:sanctum`, se consulta al iniciar la app. */
export const appThemeApi = {
  async get(): Promise<AppTheme> {
    const response = await apiClient.get('/app/theme');
    const root = asRecord(response.data);
    const data = asRecord(root.data);
    const colores = asRecord(data.colors);
    const colors: AppThemeColors = {};
    (Object.keys(colores) as (keyof AppThemeColors)[]).forEach((clave) => {
      const valor = asString(colores[clave]);
      if (valor) colors[clave] = valor;
    });
    return { colors, version: asString(data.version) };
  },
};
