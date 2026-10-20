import { normalizeDomicilioVigente } from '@/api/cicloLaboral';
import { ESTADOS_REPUBLICA } from '@/constants/estadosRepublica';
import { cambiosDomicilio, esCampoDomicilio, estadoOficial, validarDomicilio } from '@/utils/domicilio';

const completo = {
  domicilio_calle: 'Av. Emiliano Zapata',
  domicilio_numero_exterior: '1234',
  domicilio_colonia: 'Lomas de la Selva',
  domicilio_cp: '62270',
  domicilio_municipio: 'Cuernavaca',
  domicilio_estado: 'Morelos',
};

describe('domicilio estructurado', () => {
  it('tiene los 32 estados y reconoce el nombre sin importar mayúsculas ni acentos', () => {
    expect(ESTADOS_REPUBLICA).toHaveLength(32);
    expect(estadoOficial('MORELOS')).toBe('Morelos');
    expect(estadoOficial('ciudad de mexico')).toBe('Ciudad de México');
    expect(estadoOficial('Narnia')).toBe('');
  });

  it('valida C.P. de 5 dígitos, estado de la lista y obligatorios (el número interior es opcional)', () => {
    expect(validarDomicilio(completo, true)).toEqual({});
    expect(validarDomicilio({ ...completo, domicilio_cp: '6227' }, true).domicilio_cp).toBe('El código postal son 5 dígitos.');
    expect(validarDomicilio({ ...completo, domicilio_estado: 'Gondor' }, true).domicilio_estado).toBe('Elige un estado de la lista.');
    expect(Object.keys(validarDomicilio({ domicilio_cp: '62270' }, true))).toEqual(
      expect.arrayContaining(['domicilio_calle', 'domicilio_numero_exterior', 'domicilio_colonia', 'domicilio_municipio', 'domicilio_estado']),
    );
    expect(validarDomicilio({}, true).domicilio_numero_interior).toBeUndefined();
    // Sin exigir completo, solo el formato de lo capturado.
    expect(validarDomicilio({ domicilio_cp: '62270' }, false)).toEqual({});
  });

  it('solo propone lo que cambia respecto al expediente', () => {
    expect(cambiosDomicilio({ ...completo, domicilio_colonia: 'Centro' }, completo)).toEqual({ domicilio_colonia: 'Centro' });
    expect(cambiosDomicilio(completo, completo)).toEqual({});
  });

  it('reconoce los campos del domicilio y normaliza el domicilio vigente (backend viejo → null)', () => {
    expect(esCampoDomicilio('domicilio_cp')).toBe(true);
    expect(esCampoDomicilio('domicilio')).toBe(false);
    expect(normalizeDomicilioVigente(undefined)).toBeNull();
    expect(
      normalizeDomicilioVigente({
        texto: 'Calle Vieja 10',
        completo: false,
        campos: [{ campo: 'domicilio_cp', etiqueta: 'Código postal', tipo: 'number', actual: '' }],
      }),
    ).toEqual({ texto: 'Calle Vieja 10', completo: false, campos: [{ campo: 'domicilio_cp', etiqueta: 'Código postal', tipo: 'number', opciones: undefined, actual: null }] });
  });
});
