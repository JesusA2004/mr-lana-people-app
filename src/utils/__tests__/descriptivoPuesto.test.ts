import { normalizeAcuseDescriptivo } from '@/api/normalizers/descriptivoPuesto';
import { PLACEHOLDER_ENTERADO, descriptivoPendiente, puedeEnviarAcuse } from '../descriptivoPuesto';

/**
 * Descriptivo de puesto tras la inducción — contrato real de
 * `AcuseDescriptivoPuestoService::aArray($acuse, true)` (capacitaciones).
 */
const RESPUESTA = {
  id: 12,
  colaborador_id: 44,
  estado: 'leido',
  estado_etiqueta: 'Leído · falta su «Enterado»',
  enviado_por: 'Laura RH',
  enviado_en: '2026-10-15T10:00:00-06:00',
  leido_en: '2026-10-15T11:00:00-06:00',
  acusado_en: null,
  enterado: false,
  comentario: null,
  descriptivo: {
    id: 3,
    nombre_puesto: 'Asesor comercial',
    version: 2,
    area: 'Comercial',
    objetivo: 'Colocar créditos con calidad de cartera.',
    personal_a_cargo: null,
    fecha: '01/09/2026',
    secciones: [
      { clave: 'funciones', titulo: 'Tus funciones', elementos: ['Promover los productos.', ''] },
      { clave: 'facultades', titulo: 'Facultades', elementos: [] },
      { titulo: 'Sin clave', elementos: ['x'] },
    ],
  },
};

describe('descriptivo de puesto', () => {
  it('normaliza el contrato del backend sin inventar secciones', () => {
    const acuse = normalizeAcuseDescriptivo(RESPUESTA);
    expect(acuse).not.toBeNull();
    expect(acuse?.estado).toBe('leido');
    expect(acuse?.descriptivo.nombrePuesto).toBe('Asesor comercial');
    expect(acuse?.descriptivo.version).toBe(2);
    expect(acuse?.descriptivo.secciones).toEqual([{ clave: 'funciones', titulo: 'Tus funciones', elementos: ['Promover los productos.'] }]);
  });

  it('sin descriptivo enviado (data: null) devuelve null', () => {
    expect(normalizeAcuseDescriptivo(null)).toBeNull();
    expect(normalizeAcuseDescriptivo({})).toBeNull();
  });

  it('el botón se habilita solo con «OK, enterado» marcado y un comentario con texto', () => {
    expect(puedeEnviarAcuse(false, 'Enterado')).toBe(false);
    expect(puedeEnviarAcuse(true, '   ')).toBe(false);
    expect(puedeEnviarAcuse(true, '')).toBe(false);
    expect(puedeEnviarAcuse(true, 'Doy por enterado.')).toBe(true);
    expect(PLACEHOLDER_ENTERADO.startsWith('Doy por enterado')).toBe(true);
  });

  it('pendiente mientras el servidor no registre el acuse', () => {
    const acuse = normalizeAcuseDescriptivo(RESPUESTA);
    expect(descriptivoPendiente(acuse)).toBe(true);
    expect(descriptivoPendiente(normalizeAcuseDescriptivo({ ...RESPUESTA, estado: 'enterado', acusado_en: '2026-10-15T12:00:00-06:00' }))).toBe(false);
    expect(descriptivoPendiente(null)).toBe(false);
  });
});
