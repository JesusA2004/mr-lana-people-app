import type { SolicitudPrestamoEtapa } from '@/types/request';

import { getSolicitudStory, prestamoNextAction } from '../solicitudStory';

describe('getSolicitudStory', () => {
  it('enviada/creada: RH revisa, colaborador no tiene nada que hacer', () => {
    expect(getSolicitudStory('enviada').nextAction).toMatch(/Recursos Humanos/);
    expect(getSolicitudStory('creada').nextAction).toMatch(/Recursos Humanos/);
  });

  it('requiere_correccion: nunca ofrece "corregir" — solo agregar documento o cancelar', () => {
    const story = getSolicitudStory('requiere_correccion');
    expect(story.nextAction).not.toMatch(/reenviar|editar/i);
    expect(story.nextAction).toMatch(/documento|cancelar/i);
  });

  it('aprobada/rechazada/cancelada: no piden ninguna acción al colaborador', () => {
    expect(getSolicitudStory('aprobada').nextAction).toMatch(/no necesitas/i);
  });

  it('un estado desconocido nunca revienta: cae a un mensaje neutro', () => {
    expect(() => getSolicitudStory('algo_nuevo')).not.toThrow();
  });
});

describe('prestamoNextAction', () => {
  it('null si no hay ninguna etapa "actual" (backend no la manda o ya se resolvió)', () => {
    expect(prestamoNextAction(undefined)).toBeNull();
    expect(prestamoNextAction([])).toBeNull();
  });

  it('usa la etiqueta REAL de la etapa actual del backend, nunca un texto inventado', () => {
    const etapas: SolicitudPrestamoEtapa[] = [
      { clave: 'solicitud', etiqueta: 'Solicitud enviada', estado: 'hecho' },
      { clave: 'visto_bueno', etiqueta: 'Visto bueno del jefe', estado: 'actual' },
      { clave: 'autorizacion', etiqueta: 'Autorización de RH', estado: 'pendiente' },
    ];
    expect(prestamoNextAction(etapas)).toBe('Esperando: Visto bueno del jefe');
  });
});
