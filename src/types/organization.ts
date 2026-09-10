/**
 * Organigrama de puestos, solo lectura (AGENTS.md de este encargo, sección
 * 56) — espejo EXACTO de
 * `App\Http\Controllers\Api\V1\Rh\JerarquiaPuestoController` en
 * capacitaciones (confirmado contra el código fuente real):
 * `GET /rh/jerarquia-puestos`. El backend regresa una LISTA PLANA con
 * `puesto_superior_id` (mismo criterio que el panel web) — el árbol se arma
 * en el cliente, ver `utils/organizationTree.ts`. Representa PUESTOS, no
 * colaboradores individuales (sección 69: nunca renderizar miles de
 * colaboradores a la vez).
 */
export interface OrganizationPosition {
  id: number;
  nombre: string;
  departamento?: string | null;
  nivel_jerarquico: number | null;
  puesto_superior_id: number | null;
  puesto_superior?: string | null;
  tipo_puesto?: string | null;
  activo: boolean;
  usuarios_count: number;
  vacantes_abiertas_count: number;
}

/** Nodo del árbol ya armado en cliente a partir de la lista plana — ver `buildOrganizationTree`. */
export interface OrganizationNode extends OrganizationPosition {
  children: OrganizationNode[];
}
