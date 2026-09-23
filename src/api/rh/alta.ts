import { apiClient, extractData } from '../client';

/** `GET /api/v1/rh/catalogos` — `Rh\CatalogoController` (permiso `colaboradores.alta`, acotado por alcance). */
export interface AltaCatalogos {
  empresas: { id: number; nombre: string }[];
  sucursales: { id: number; nombre: string; empresa_id: number | null }[];
  departamentos: { id: number; nombre: string }[];
  puestos: { id: number; nombre: string; departamento_id: number | null }[];
  jefes: { id: number; nombre: string; puesto: string | null; sucursal_id: number | null }[];
  tipos_contratacion: { value: string; label: string; requiere_fecha_fin: boolean }[];
  generos: { value: string; label: string }[];
}

/** Cuerpo de `POST /api/v1/rh/colaboradores` — espejo de `AltaColaboradorRequest` (solo los campos que captura la app). */
export interface AltaColaboradorPayload {
  name: string;
  apellidos?: string | null;
  genero?: string | null;
  telefono?: string | null;
  email?: string | null;
  fecha_nacimiento?: string | null;
  curp?: string | null;
  rfc?: string | null;
  nss?: string | null;
  numero_empleado?: string | null;
  sucursal_principal_id: number;
  departamento_id?: number | null;
  puesto_id: number;
  jefe_id?: number | null;
  sueldo_mensual: number;
  fecha_ingreso: string;
  tipo_contratacion: string;
  fecha_fin_contrato?: string | null;
  crear_acceso?: boolean;
}

export const rhAltaApi = {
  async catalogos(): Promise<AltaCatalogos> {
    const response = await apiClient.get('/rh/catalogos');
    const data = extractData<Partial<AltaCatalogos>>(response.data);
    return {
      empresas: data.empresas ?? [],
      sucursales: data.sucursales ?? [],
      departamentos: data.departamentos ?? [],
      puestos: data.puestos ?? [],
      jefes: data.jefes ?? [],
      tipos_contratacion: data.tipos_contratacion ?? [],
      generos: data.generos ?? [],
    };
  },

  async registrar(payload: AltaColaboradorPayload): Promise<{ colaboradorId: number }> {
    const response = await apiClient.post('/rh/colaboradores', payload);
    return { colaboradorId: Number((response.data as { colaborador_id: number }).colaborador_id) };
  },
};
