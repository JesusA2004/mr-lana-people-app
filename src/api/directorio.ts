import { apiClient, extractData } from './client';

import type { ColaboradorDirectorio, FiltrosDirectorio, OpcionDirectorio, OpcionesDirectorio } from '@/types/directorio';
import { asArray, asId, asRecord, asString, normalizePaginated, type Paginated } from '@/utils/normalize';

export function normalizeColaboradorDirectorio(raw: unknown): ColaboradorDirectorio {
  const r = asRecord(raw);
  // Solo los campos de contacto corporativo: cualquier otra llave que llegara
  // por error se ignora (nunca se pinta un dato personal).
  return {
    id: asId(r.id) ?? 0,
    nombre: asString(r.nombre) ?? '',
    numeroEmpleado: asString(r.numero_empleado),
    puesto: asString(r.puesto),
    sucursal: asString(r.sucursal),
    departamento: asString(r.departamento),
    correoCorporativo: asString(r.correo_corporativo) || null,
    telefonoCorporativo: asString(r.telefono_corporativo) || null,
  };
}

function normalizeOpciones(raw: unknown): OpcionDirectorio[] {
  return asArray(raw)
    .map((o) => asRecord(o))
    .map((o) => ({ id: asId(o.id) ?? 0, nombre: asString(o.nombre) ?? '' }))
    .filter((o) => o.id > 0 && o.nombre !== '');
}

/** Directorio global (solo contacto corporativo) — mismo service que la web. */
export const directorioApi = {
  async list(filtros: FiltrosDirectorio, page = 1): Promise<Paginated<ColaboradorDirectorio>> {
    const response = await apiClient.get('/directorio', { params: { ...filtros, page, per_page: 30 } });
    return normalizePaginated(response.data, normalizeColaboradorDirectorio);
  },

  async opciones(): Promise<OpcionesDirectorio> {
    const response = await apiClient.get('/directorio/opciones');
    const r = asRecord(extractData<unknown>(response.data));
    return { puestos: normalizeOpciones(r.puestos), sucursales: normalizeOpciones(r.sucursales), departamentos: normalizeOpciones(r.departamentos) };
  },
};
