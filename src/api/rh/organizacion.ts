import { apiClient } from '../client';

import type { OrganizationPosition } from '@/types/organization';

/**
 * `GET /api/v1/rh/jerarquia-puestos` — solo lectura (permiso
 * `puestos.administrar`, mismo criterio que el panel web). Espejo EXACTO de
 * `App\Http\Controllers\Api\V1\Rh\JerarquiaPuestoController` en
 * capacitaciones (confirmado contra el código fuente real): regresa una
 * LISTA PLANA de puestos con `puesto_superior_id`, nunca un árbol anidado
 * — el cliente arma el árbol localmente (ver `utils/organizationTree.ts`).
 */
export const rhOrganizacionApi = {
  async jerarquia(): Promise<OrganizationPosition[]> {
    const response = await apiClient.get('/rh/jerarquia-puestos');
    return (response.data as { data: OrganizationPosition[] }).data;
  },
};
