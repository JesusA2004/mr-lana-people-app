import { apiClient, extractData } from '../client';

import type { RhDashboard } from '@/types/rh';

/** `GET /api/v1/rh/dashboard` — permiso `rh.mobile.dashboard.ver`. */
export const rhDashboardApi = {
  async get(): Promise<RhDashboard> {
    const response = await apiClient.get('/rh/dashboard');
    return extractData<RhDashboard>(response.data);
  },
};
