import type { InfiniteData } from '@tanstack/react-query';

import type { EstadoRenglonRecepcion, ReglaRecepcion, RenglonRecepcion } from '@/types/recepcionDocumental';
import type { Paginated } from '@/utils/normalize';

/**
 * Lógica PURA de presentación de la recepción documental: agrupar lo que
 * el backend ya calculó (SUCURSAL → evento → persona → documentos) y
 * aplicar el cambio optimista al palomear. Ninguna regla de negocio vive
 * aquí: qué se espera, métricas y estados los manda el backend.
 */

export const ESTADOS_RECIBIDO: readonly EstadoRenglonRecepcion[] = ['recibido', 'recibido_con_observacion'];

export function esRecibido(estado: EstadoRenglonRecepcion): boolean {
  return ESTADOS_RECIBIDO.includes(estado);
}

/** Tocar la casilla: si ya estaba recibido regresa a pendiente; si no, queda recibido. */
export function estadoAlTocar(renglon: Pick<RenglonRecepcion, 'estado'>): EstadoRenglonRecepcion {
  return esRecibido(renglon.estado) ? 'pendiente' : 'recibido';
}

/** Etiqueta optimista mientras responde el backend (después manda la suya). */
export const ETIQUETA_ESTADO: Record<EstadoRenglonRecepcion, string> = {
  pendiente: 'Pendiente',
  recibido: 'Recibido',
  recibido_con_observacion: 'Recibido con observación',
  no_recibido: 'No recibido',
  no_aplica: 'No aplica',
};

/** Valor del filtro `sucursal_id` (los renglones sin sucursal se piden con `sin`). */
export function parametroSucursal(sucursalId: number | null): number | 'sin' {
  return sucursalId === null ? 'sin' : sucursalId;
}

export function sucursalDeParametro(valor: string | string[] | undefined): number | 'sin' | null {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  if (texto === 'sin') return 'sin';
  const n = Number(texto);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export interface PersonaRecepcion {
  clave: string;
  nombre: string;
  numeroEmpleado: string | null;
  puesto: string | null;
  evento: string | null;
  fechaEvento: string | null;
  documentos: RenglonRecepcion[];
}

export interface SeccionRecepcion {
  regla: string;
  etiqueta: string;
  orden: number;
  /** Texto del backend cuando no hubo eventos («No hubo altas durante noviembre 2026.»). */
  sinEventos: string | null;
  personas: PersonaRecepcion[];
}

/**
 * Agrupa renglones (ya ordenados por el backend) por evento y persona. Cada
 * regla activa del corte aparece aunque no tenga renglones (estado vacío
 * con el texto del backend); una regla que llegue en renglones pero no en
 * el resumen también se muestra (nunca se esconde un original esperado).
 */
export function agruparRenglones(renglones: readonly RenglonRecepcion[], reglas: readonly ReglaRecepcion[]): SeccionRecepcion[] {
  const secciones = new Map<string, SeccionRecepcion>();

  for (const regla of reglas) {
    if (!regla.activa && regla.metricas.renglones === 0) continue;
    secciones.set(regla.regla, { regla: regla.regla, etiqueta: regla.etiqueta, orden: regla.orden, sinEventos: regla.sin_eventos, personas: [] });
  }

  const personas = new Map<string, PersonaRecepcion>();
  for (const renglon of renglones) {
    let seccion = secciones.get(renglon.regla);
    if (!seccion) {
      seccion = { regla: renglon.regla, etiqueta: renglon.regla_etiqueta || renglon.regla, orden: renglon.regla_orden, sinEventos: null, personas: [] };
      secciones.set(renglon.regla, seccion);
    }
    const clave = `${renglon.regla}:${renglon.origen.tipo}:${renglon.origen.id ?? 'x'}:${renglon.colaborador.id ?? renglon.colaborador.nombre}`;
    let persona = personas.get(clave);
    if (!persona) {
      persona = {
        clave,
        nombre: renglon.colaborador.nombre,
        numeroEmpleado: renglon.colaborador.numero_empleado,
        puesto: renglon.colaborador.puesto,
        evento: renglon.evento_descripcion,
        fechaEvento: renglon.fecha_evento,
        documentos: [],
      };
      personas.set(clave, persona);
      seccion.personas.push(persona);
    }
    persona.documentos.push(renglon);
  }

  return [...secciones.values()].sort((a, b) => a.orden - b.orden);
}

/** Reemplaza un renglón dentro de las páginas cacheadas (optimista o con la respuesta real). */
export function reemplazarRenglon(
  data: InfiniteData<Paginated<RenglonRecepcion>> | undefined,
  id: number,
  cambio: (actual: RenglonRecepcion) => RenglonRecepcion,
): InfiniteData<Paginated<RenglonRecepcion>> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((pagina) => ({ ...pagina, data: pagina.data.map((r) => (r.id === id ? cambio(r) : r)) })),
  };
}

/** Cambio optimista: estado + etiqueta + cantidad recibida (el backend confirma con su fila). */
export function aplicarEstadoOptimista(renglon: RenglonRecepcion, estado: EstadoRenglonRecepcion, texto?: { observaciones?: string; justificacion?: string }): RenglonRecepcion {
  return {
    ...renglon,
    estado,
    estado_etiqueta: ETIQUETA_ESTADO[estado],
    cantidad_recibida: esRecibido(estado) ? renglon.cantidad_esperada : 0,
    incidencia: estado === 'recibido_con_observacion' || estado === 'no_recibido',
    observaciones: texto?.observaciones ?? renglon.observaciones,
    justificacion: estado === 'no_aplica' ? (texto?.justificacion ?? renglon.justificacion) : null,
  };
}

/** «85.5 %» (una cifra decimal, sin ceros de más). */
export function textoCumplimiento(cumplimiento: number): string {
  const redondeado = Math.round(cumplimiento * 10) / 10;
  return `${Number.isInteger(redondeado) ? redondeado : redondeado.toFixed(1)} %`;
}

/**
 * Texto de una sección sin renglones, distinto del error de carga: si en
 * todo el periodo no hubo eventos, el texto del backend («No hubo altas
 * durante noviembre 2026.»); si hubo en otras sucursales, lo dice; con
 * filtro, nada por recibir / nada recibido.
 */
export function textoSeccionVacia(
  filtro: 'todos' | 'no' | 'si',
  seccion: { etiqueta: string; sinEventos: string | null; renglonesPeriodo: number },
): string {
  const nombre = seccion.etiqueta.toLowerCase();
  if (filtro === 'no') return `Nada por recibir en ${nombre}.`;
  if (filtro === 'si') return `Aún no se recibe nada de ${nombre}.`;
  if (seccion.renglonesPeriodo === 0 && seccion.sinEventos) return seccion.sinEventos;
  return `Sin ${nombre} en esta sucursal este periodo.`;
}
