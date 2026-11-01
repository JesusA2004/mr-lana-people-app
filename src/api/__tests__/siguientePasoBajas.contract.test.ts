import { normalizeBajaDetalle, normalizeBajasPagina } from '../rh/bajas';
import { accionEjecutableEnApp, normalizeReaperturas, normalizeSiguientePaso } from '../normalizers/siguientePaso';

describe('contrato de siguiente_paso, reaperturas y bajas', () => {
  it('siguiente_paso conserva solo_web y tolera su ausencia', () => {
    expect(normalizeSiguientePaso(undefined)).toBeNull();
    const paso = normalizeSiguientePaso({ tipo: 'accion', mensaje: 'Falta', accion: { clave: 'a', etiqueta: 'Revisar', solo_web: true, href: '/rh/x' }, bloqueos: ['b', 3], responsable: { rol: 'RH', nombre: null } });
    expect(paso?.accion).toEqual({ clave: 'a', etiqueta: 'Revisar', solo_web: true, href: '/rh/x' });
    expect(paso?.bloqueos).toEqual(['b']);
    expect(paso?.responsable).toBe('RH');
  });

  it('ignora acciones_permitidas con href o solo_web', () => {
    expect(accionEjecutableEnApp({ clave: 'autorizar' })).toBe(true);
    expect(accionEjecutableEnApp({ clave: 'x', href: '/rh/x' })).toBe(false);
    expect(accionEjecutableEnApp({ clave: 'x', solo_web: true })).toBe(false);
  });

  it('reaperturas: una entrada sin tipo o id no da botón', () => {
    expect(normalizeReaperturas([{ tipo: 'entrevista_candidato', id: 4, etiqueta: 'Entrevista' }, { tipo: 'x' }, { id: 3 }])).toEqual([{ tipo: 'entrevista_candidato', id: 4, etiqueta: 'Entrevista' }]);
    expect(normalizeReaperturas(undefined)).toEqual([]);
  });

  it('la bandeja de bajas viene sin envoltura meta', () => {
    const pagina = normalizeBajasPagina({ current_page: 1, last_page: 3, per_page: 20, total: 41, data: [{ id: 2, colaborador: 'Ana', estatus: 'en_revision_rh' }] });
    expect(pagina.meta.total).toBe(41);
    expect(pagina.meta.last_page).toBe(3);
    expect(pagina.data[0].colaborador).toBe('Ana');
  });

  it('detalle de baja: documentos y paso', () => {
    const baja = normalizeBajaDetalle({ id: 1, documentos: [{ id: 3, nombre: 'Aviso', obligatorio: true, cumplido: false }], bitacora: [], siguiente_paso: { tipo: 'espera', mensaje: 'En trámite' } });
    expect(baja.documentos[0].cumplido).toBe(false);
    expect(baja.siguiente_paso?.tipo).toBe('espera');
  });
});
