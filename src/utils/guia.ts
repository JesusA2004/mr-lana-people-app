import type { Href } from 'expo-router';

import { normalizeEstadoExpediente } from '@/api/normalizers/guia';
import type { AccionPasoGuia, EstadoExpedienteIncompleto, EstadoPasoGuia, GuiaColaborador, PasoGuia } from '@/types/guia';
import type { Tono } from '@/components/ui/tonos';
import type { MobileBootstrap } from '@/types/mobileBootstrap';

/**
 * Presentación de «Tu siguiente paso» y del modo completar expediente. La
 * REGLA (qué falta, qué bloquea, en qué orden) vive en el backend
 * (`GuiaSiguientePasoService` / `ExpedienteIncompletoService`); aquí solo
 * se traduce a rutas y textos.
 */

/** Traduce el destino que manda el backend a la ruta exacta de la app. */
export function rutaDePaso(accion: AccionPasoGuia): Href {
  const numero = (clave: string): string => String(accion.params[clave] ?? '');
  switch (accion.destino) {
    case 'completar-datos':
      return '/completar-datos';
    case 'foto':
      return { pathname: '/(app)/(tabs)/perfil', params: { foto: '1' } };
    case 'documento':
      return { pathname: '/expediente/[tipoId]', params: { tipoId: numero('document_type_id') } };
    case 'induccion':
      return '/induccion';
    case 'induccion-documento':
      return { pathname: '/induccion/capitulos', params: { pagina: numero('pagina') } };
    case 'induccion-video':
      return '/induccion/video';
    case 'induccion-evaluacion':
      return '/induccion/evaluacion';
    case 'documento-laboral':
      return { pathname: '/documentos-laborales/[id]', params: { id: numero('id') } };
    case 'descriptivo-puesto':
      return '/descriptivo-puesto';
  }
}

/** `expediente_incompleto` del bootstrap (backend anterior → sin bloqueo). */
export function estadoExpedienteDe(bootstrap: MobileBootstrap | undefined | null): EstadoExpedienteIncompleto {
  return normalizeEstadoExpediente(bootstrap?.expediente_incompleto);
}

export type TonoPaso = Extract<Tono, 'exito' | 'info' | 'aviso' | 'peligro' | 'neutral'>;

export function tonoDeEstado(estado: EstadoPasoGuia): TonoPaso {
  switch (estado) {
    case 'hecho':
      return 'exito';
    case 'en_revision':
      return 'info';
    case 'rechazado':
      return 'peligro';
    case 'pendiente':
      return 'aviso';
    case 'espera':
      return 'neutral';
  }
}

export function iconoDeEstado(estado: EstadoPasoGuia): 'checkmark-circle' | 'hourglass-outline' | 'close-circle' | 'ellipse-outline' | 'lock-closed-outline' {
  switch (estado) {
    case 'hecho':
      return 'checkmark-circle';
    case 'en_revision':
      return 'hourglass-outline';
    case 'rechazado':
      return 'close-circle';
    case 'pendiente':
      return 'ellipse-outline';
    case 'espera':
      return 'lock-closed-outline';
  }
}

export const TITULOS_GRUPO: Record<PasoGuia['grupo'], string> = {
  datos: 'Tu información',
  foto: 'Tu fotografía',
  documentos: 'Tus documentos',
  induccion: 'Inducción Mr. Lana',
  firmas: 'Firmas y lecturas',
};

export interface GrupoGuia {
  grupo: PasoGuia['grupo'];
  titulo: string;
  pasos: PasoGuia[];
  hechos: number;
  porHacer: number;
}

/** Agrupa los pasos (en el orden del backend) para pintarlos por sección. */
export function agruparPasos(pasos: PasoGuia[]): GrupoGuia[] {
  const grupos: GrupoGuia[] = [];
  for (const paso of pasos) {
    let grupo = grupos.find((g) => g.grupo === paso.grupo);
    if (!grupo) {
      grupo = { grupo: paso.grupo, titulo: TITULOS_GRUPO[paso.grupo], pasos: [], hechos: 0, porHacer: 0 };
      grupos.push(grupo);
    }
    grupo.pasos.push(paso);
    if (paso.estado === 'hecho') grupo.hechos += 1;
    if (paso.estado === 'pendiente' || paso.estado === 'rechazado') grupo.porHacer += 1;
  }
  return grupos;
}

/**
 * Tras terminar una acción: «Listo. Siguiente: Acta de nacimiento». Ignora
 * el paso que se acaba de completar (el backend puede tardar en reflejarlo).
 */
export function mensajeSiguiente(guia: GuiaColaborador | null | undefined, claveCompletada?: string): { mensaje: string; paso: PasoGuia | null } {
  const paso =
    guia?.pasos.find((p) => p.clave !== claveCompletada && (p.estado === 'pendiente' || p.estado === 'rechazado') && p.accion !== null) ?? null;
  if (!paso) return { mensaje: 'Listo. Ya no tienes pendientes por ahora.', paso: null };
  return { mensaje: `Listo. Siguiente: ${paso.titulo}`, paso };
}

/** «Te faltan 3 cosas · 2 en revisión por RH» para el encabezado de la guía. */
export function textoResumenGuia(guia: GuiaColaborador): string {
  const { porHacer, enRevision } = guia.resumen;
  const partes: string[] = [];
  if (porHacer > 0) partes.push(porHacer === 1 ? 'Te falta 1 paso' : `Te faltan ${porHacer} pasos`);
  if (enRevision > 0) partes.push(enRevision === 1 ? '1 en revisión por RH' : `${enRevision} en revisión por RH`);
  if (partes.length === 0) return 'Estás al día. No tienes pendientes.';
  return partes.join(' · ');
}

/** ¿La guía merece estar arriba en Inicio? (algo por hacer o la inducción en curso). */
export function guiaProtagonista(guia: GuiaColaborador | null | undefined): boolean {
  if (!guia) return false;
  return guia.resumen.porHacer > 0 || guia.induccion.activa;
}
