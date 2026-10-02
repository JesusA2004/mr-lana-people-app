import { apiClient, extractData } from '../client';

import { asArray, asBoolean, asId, asNumber, asRecord, asRecordOrNull, asString } from '@/utils/normalize';

/**
 * Onboarding de una persona para RH/jefe (`GET /rh/colaboradores/{id}/ciclo`
 * → `onboarding`, `OnboardingService::aArray`). Toda regla (mínimo 8,
 * refuerzo, reintento, activos y responsivas obligatorios, cuándo se puede
 * completar) la decide el backend: aquí solo se pinta y se envían acciones.
 */
export interface OnboardingModuloRh {
  avanceId: number;
  titulo: string;
  tipoEtiqueta: string;
  estado: string;
  estadoEtiqueta: string;
  obligatorio: boolean;
  calificacionMinima: number | null;
  ultimaCalificacion: number | null;
  mejorCalificacion: number | null;
  intentos: number;
  retroalimentacion: string | null;
  puedeRetroalimentar: boolean;
}

export interface OnboardingActivoRh {
  tipoActivoId: number;
  nombre: string;
  requiereIdentificador: boolean;
  entregado: boolean;
  identificador: string | null;
  entregadoEn: string | null;
  responsivaEstado: string | null;
}

export interface OnboardingRh {
  id: number;
  estado: string;
  estadoEtiqueta: string;
  checklist: { clave: string; etiqueta: string; completado: boolean }[];
  modulos: OnboardingModuloRh[];
  activos: OnboardingActivoRh[];
  bloqueos: string[];
  puedeEntregarActivos: boolean;
  puedeCompletar: boolean;
}

export interface FichaOnboardingRh {
  nombre: string;
  puesto: string | null;
  onboarding: OnboardingRh | null;
}

export function normalizeOnboardingRh(raw: unknown): OnboardingRh | null {
  const r = asRecordOrNull(raw);
  const id = asId(r?.id);
  if (!r || id === null) return null;
  const acciones = asRecord(r.acciones);

  return {
    id,
    estado: asString(r.estado) ?? '',
    estadoEtiqueta: asString(r.estado_etiqueta) ?? '',
    checklist: asArray(r.checklist)
      .map((c) => asRecord(c))
      .map((c) => ({ clave: asString(c.clave) ?? '', etiqueta: asString(c.etiqueta) ?? '', completado: asBoolean(c.completado) }))
      .filter((c) => c.etiqueta !== ''),
    modulos: asArray(r.modulos)
      .map((m) => asRecord(m))
      .filter((m) => asId(m.avance_id) !== null)
      .map((m) => ({
        avanceId: asId(m.avance_id) as number,
        titulo: asString(m.titulo) ?? 'Módulo',
        tipoEtiqueta: asString(m.tipo_etiqueta) ?? '',
        estado: asString(m.estado) ?? '',
        estadoEtiqueta: asString(m.estado_etiqueta) ?? '',
        obligatorio: asBoolean(m.obligatorio),
        calificacionMinima: asNumber(m.calificacion_minima),
        ultimaCalificacion: asNumber(m.ultima_calificacion),
        mejorCalificacion: asNumber(m.mejor_calificacion),
        intentos: asArray(m.intentos).length,
        retroalimentacion: asString(m.retroalimentacion),
        puedeRetroalimentar: asBoolean(m.puede_retroalimentar),
      })),
    activos: asArray(r.activos)
      .map((a) => asRecord(a))
      .filter((a) => asId(a.tipo_activo_id) !== null)
      .map((a) => {
        const entrega = asRecordOrNull(a.entrega);
        return {
          tipoActivoId: asId(a.tipo_activo_id) as number,
          nombre: asString(a.nombre) ?? 'Activo',
          requiereIdentificador: asBoolean(a.requiere_identificador),
          entregado: asBoolean(a.entregado),
          identificador: asString(entrega?.identificador),
          entregadoEn: asString(entrega?.entregado_en),
          responsivaEstado: asString(entrega?.responsiva_estado),
        };
      }),
    bloqueos: asArray(r.bloqueos)
      .map((b) => (typeof b === 'string' ? b : asString(asRecord(b).mensaje) ?? asString(asRecord(b).etiqueta)))
      .filter((b): b is string => typeof b === 'string' && b.length > 0),
    puedeEntregarActivos: asBoolean(acciones.entregar_activos),
    puedeCompletar: asBoolean(acciones.completar),
  };
}

export const rhOnboardingApi = {
  async ficha(colaboradorId: number | string): Promise<FichaOnboardingRh> {
    const response = await apiClient.get(`/rh/colaboradores/${colaboradorId}/ciclo`);
    const data = asRecord(extractData<unknown>(response.data));
    const persona = asRecord(data.colaborador);
    return {
      nombre: asString(persona.nombre) ?? asString(persona.nombre_completo) ?? 'Colaborador',
      puesto: asString(persona.puesto),
      onboarding: normalizeOnboardingRh(data.onboarding),
    };
  },

  async retroalimentar(avanceId: number, retroalimentacion: string): Promise<OnboardingRh | null> {
    const response = await apiClient.post(`/rh/onboarding/avances/${avanceId}/retroalimentacion`, { retroalimentacion });
    return normalizeOnboardingRh(extractData<unknown>(response.data));
  },

  async entregarActivo(
    procesoId: number,
    payload: { tipo_activo_id: number; identificador?: string | null; observaciones?: string | null },
  ): Promise<OnboardingRh | null> {
    const response = await apiClient.post(`/rh/onboarding/${procesoId}/activos`, payload);
    return normalizeOnboardingRh(extractData<unknown>(response.data));
  },

  async completar(procesoId: number): Promise<OnboardingRh | null> {
    const response = await apiClient.post(`/rh/onboarding/${procesoId}/completar`);
    return normalizeOnboardingRh(extractData<unknown>(response.data));
  },
};
