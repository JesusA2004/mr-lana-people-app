import { apiClient, extractData } from './client';

import type { IncorporacionResponse } from '@/types/incorporation';

/**
 * `GET /api/v1/colaborador/incorporacion` — pendiente en backend (ver
 * docs/MOBILE_BACKEND_REQUIREMENTS.md P1.2). Expone
 * `App\Services\Onboarding\OnboardingService::checklist()`/`porcentaje()` +
 * el `AltaDigital` ligado al colaborador (si existe). `approval_steps` no
 * lo calcula el backend todavía (no existe cadena RH→Gerente→Director
 * Comercial) — puede venir ausente.
 */
export const incorporacionApi = {
  async get(): Promise<IncorporacionResponse> {
    const response = await apiClient.get('/colaborador/incorporacion');
    return extractData<IncorporacionResponse>(response.data);
  },
};
