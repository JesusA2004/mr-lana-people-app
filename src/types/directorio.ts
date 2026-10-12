/**
 * Directorio de la empresa — `GET /api/v1/directorio`
 * (`DirectorioColaboradoresService::aArray`). Lista CERRADA de campos de
 * contacto corporativo: el backend nunca manda datos personales (correo o
 * teléfono personal, RFC, CURP, NSS, salario, domicilio) y la app tampoco
 * los modela.
 */
export interface ColaboradorDirectorio {
  id: number;
  nombre: string;
  numeroEmpleado: string | null;
  puesto: string | null;
  sucursal: string | null;
  departamento: string | null;
  correoCorporativo: string | null;
  telefonoCorporativo: string | null;
}

export interface OpcionDirectorio {
  id: number;
  nombre: string;
}

export interface OpcionesDirectorio {
  puestos: OpcionDirectorio[];
  sucursales: OpcionDirectorio[];
  departamentos: OpcionDirectorio[];
}

export interface FiltrosDirectorio {
  busqueda?: string;
  sucursal_id?: number;
  departamento_id?: number;
  puesto_id?: number;
}
