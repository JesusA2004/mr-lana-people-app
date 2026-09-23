import { canSwitchExperience, experienceAvailability, resolveExperience, shouldCorrectStoredExperience } from '../experience';

const features = { rh_mobile: true } as never;
const caps = (employee: boolean, rh: boolean) => ({ employee, rh, manager: false, director: false });

describe('experiencias Mi espacio / Gestión RH (solo capabilities del backend)', () => {
  it('colaborador + RH: puede cambiar y se respeta la elección guardada', () => {
    const a = experienceAvailability(caps(true, true), features);
    expect(canSwitchExperience(a)).toBe(true);
    expect(resolveExperience('rh', a)).toBe('rh');
    expect(resolveExperience('colaborador', a)).toBe('colaborador');
    // Primera vez: se pregunta.
    expect(resolveExperience(null, a)).toBeNull();
  });

  it('solo colaborador: no puede elegir RH aunque haya guardado "rh"', () => {
    const a = experienceAvailability(caps(true, false), features);
    expect(canSwitchExperience(a)).toBe(false);
    expect(resolveExperience('rh', a)).toBe('colaborador');
    expect(resolveExperience(null, a)).toBe('colaborador');
  });

  it('pierde el permiso RH: vuelve a Mi espacio y la preferencia se corrige', () => {
    const antes = experienceAvailability(caps(true, true), features);
    expect(resolveExperience('rh', antes)).toBe('rh');

    const despues = experienceAvailability(caps(true, false), features);
    expect(resolveExperience('rh', despues)).toBe('colaborador');
    expect(shouldCorrectStoredExperience('rh', despues)).toBe('colaborador');
  });

  it('solo administrativo (sin expediente): entra directo a Gestión RH, sin selector', () => {
    const a = experienceAvailability(caps(false, true), features);
    expect(canSwitchExperience(a)).toBe(false);
    expect(resolveExperience(null, a)).toBe('rh');
    expect(resolveExperience('colaborador', a)).toBe('rh');
  });

  it('RH apagado por feature flag cuenta como sin RH', () => {
    const a = experienceAvailability(caps(true, true), { rh_mobile: false } as never);
    expect(a.rh).toBe(false);
  });

  it('bootstrap aún no cargado: Mi espacio por defecto, sin RH', () => {
    expect(experienceAvailability(undefined, undefined)).toEqual({ colaborador: true, rh: false });
  });

  it('una preferencia válida no se "corrige"', () => {
    expect(shouldCorrectStoredExperience('rh', experienceAvailability(caps(true, true), features))).toBeNull();
    expect(shouldCorrectStoredExperience(null, experienceAvailability(caps(true, true), features))).toBeNull();
  });
});
