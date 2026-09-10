import { mapWorkflowToSteps } from '../workflow';

import type { Workflow } from '@/types/rh';

const baseWorkflow: Workflow = {
  estado: 'enviada',
  etapa_actual: { clave: 'rh', nombre: 'Revisión RH' },
  progreso: { actual: 0, total: 1 },
  flujo: [{ clave: 'rh', nombre: 'Revisión RH' }],
  siguiente_etapa: null,
};

describe('mapWorkflowToSteps', () => {
  it('la etapa actual en un flujo pendiente queda en_revision', () => {
    expect(mapWorkflowToSteps(baseWorkflow)).toEqual([{ key: 'rh', label: 'Revisión RH', status: 'in_review' }]);
  });

  it('estado aprobado marca todas las etapas como aprobadas', () => {
    expect(mapWorkflowToSteps({ ...baseWorkflow, estado: 'aprobada' })).toEqual([{ key: 'rh', label: 'Revisión RH', status: 'approved' }]);
  });

  it('estado rechazado marca la etapa actual como rechazada', () => {
    expect(mapWorkflowToSteps({ ...baseWorkflow, estado: 'rechazada' })).toEqual([{ key: 'rh', label: 'Revisión RH', status: 'rejected' }]);
  });

  it('etapas ya superadas (index < progreso.actual) quedan aprobadas', () => {
    const twoStages: Workflow = {
      estado: 'en_revision',
      etapa_actual: { clave: 'gerencia', nombre: 'Gerencia' },
      progreso: { actual: 1, total: 2 },
      flujo: [
        { clave: 'rh', nombre: 'Revisión RH' },
        { clave: 'gerencia', nombre: 'Gerencia' },
      ],
      siguiente_etapa: null,
    };
    expect(mapWorkflowToSteps(twoStages)).toEqual([
      { key: 'rh', label: 'Revisión RH', status: 'approved' },
      { key: 'gerencia', label: 'Gerencia', status: 'in_review' },
    ]);
  });

  it('etapas futuras quedan pendientes', () => {
    const twoStages: Workflow = {
      estado: 'enviada',
      etapa_actual: { clave: 'rh', nombre: 'Revisión RH' },
      progreso: { actual: 0, total: 2 },
      flujo: [
        { clave: 'rh', nombre: 'Revisión RH' },
        { clave: 'gerencia', nombre: 'Gerencia' },
      ],
      siguiente_etapa: { clave: 'gerencia', nombre: 'Gerencia' },
    };
    expect(mapWorkflowToSteps(twoStages)[1]).toEqual({ key: 'gerencia', label: 'Gerencia', status: 'pending' });
  });
});
