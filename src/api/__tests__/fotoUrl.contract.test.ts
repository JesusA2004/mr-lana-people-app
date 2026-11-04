import { normalizeColaboradorDirectorio } from '../directorio';
import { normalizeJerarquia } from '../normalizers/cicloLaboral';
import { normalizeCandidatoDetalle, normalizeCandidatoFila } from '../normalizers/rhCandidato';
import { normalizeRhColaborador, normalizeRhIncorporacion, normalizeRhPagina, normalizeRhSolicitud } from '../normalizers/rhFotos';
import { normalizeEquipoPendientes } from '../normalizers/trabajo';
import { normalizeBajaDetalle, normalizeBajaFila, normalizeBajasPagina } from '../rh/bajas';

import { asFotoUrl } from '@/utils/normalize';

/**
 * `foto_url` en respuestas que listan personas
 * (`capacitaciones/docs/FOTO_EXPEDIENTE.md`): una cadena no vacía se
 * conserva tal cual; `null`, `''` o ausente ⇒ `null` (la pantalla pinta
 * iniciales).
 */
const URL = 'https://people.mr-lana.com/api/v1/colaboradores/7/foto?v=abc123';
const SIN_FOTO: [string, unknown][] = [
  ['null', null],
  ['cadena vacía', ''],
  ['solo espacios', '   '],
  ['ausente', undefined],
  ['tipo inválido', 123],
];

describe('asFotoUrl', () => {
  it('conserva una URL', () => expect(asFotoUrl(URL)).toBe(URL));
  it.each(SIN_FOTO)('%s ⇒ null', (_caso, valor) => expect(asFotoUrl(valor)).toBeNull());
});

describe('GET /directorio → data[].foto_url', () => {
  it('conserva la URL', () => {
    expect(normalizeColaboradorDirectorio({ id: 1, nombre: 'Ana', foto_url: URL }).fotoUrl).toBe(URL);
  });
  it.each(SIN_FOTO)('%s ⇒ null', (_caso, valor) => {
    expect(normalizeColaboradorDirectorio({ id: 1, nombre: 'Ana', foto_url: valor }).fotoUrl).toBeNull();
  });
});

describe('GET /equipo/pendientes → colaborador_foto_url', () => {
  const flujo = { flujo: [{ orden: 1, clave: 'jefe', estado: 'pendiente', puede_actuar: true }], puede_actuar_usuario_actual: true, accion_usuario_actual: 'visto_bueno' };
  const payload = (foto: unknown) => ({
    solicitudes: [{ id: 10, tipo: 'vacaciones', estado: 'pendiente', colaborador: 'Ana', colaborador_foto_url: foto, ...flujo }],
    en_espera: [{ id: 11, tipo: 'permiso', estado: 'pendiente', colaborador: 'Luis', colaborador_foto_url: foto, ...flujo, puede_actuar_usuario_actual: false }],
    evaluaciones: [{ id: 3, colaborador: 'Sofía', estado: 'pendiente', colaborador_foto_url: foto }],
  });

  it('conserva la URL en solicitudes, en_espera, aprobar y evaluaciones', () => {
    const r = normalizeEquipoPendientes(payload(URL));
    expect(r.solicitudes[0]?.colaborador_foto_url).toBe(URL);
    expect(r.aprobar[0]?.solicitante_foto_url).toBe(URL);
    expect(r.en_espera[0]?.solicitante_foto_url).toBe(URL);
    expect(r.evaluaciones[0]?.colaborador_foto_url).toBe(URL);
  });

  it.each(SIN_FOTO)('%s ⇒ null', (_caso, valor) => {
    const r = normalizeEquipoPendientes(payload(valor));
    expect(r.solicitudes[0]?.colaborador_foto_url).toBeNull();
    expect(r.aprobar[0]?.solicitante_foto_url).toBeNull();
    expect(r.en_espera[0]?.solicitante_foto_url).toBeNull();
    expect(r.evaluaciones[0]?.colaborador_foto_url).toBeNull();
  });
});

describe('GET /colaborador/jerarquia → foto_url por persona', () => {
  it('conserva la URL de cada persona y null donde no hay', () => {
    const j = normalizeJerarquia({
      colaborador: { id: 1, nombre: 'Yo', foto_url: URL },
      jefe_inmediato: { id: 2, nombre: 'Jefa', foto_url: null },
      gerente: { id: 3, nombre: 'Gerente', foto_url: '' },
      subordinados_directos: [{ id: 4, nombre: 'Sub', foto_url: URL }, { id: 5, nombre: 'Sub 2' }],
    });
    expect(j.colaborador?.foto_url).toBe(URL);
    expect(j.jefe_inmediato?.foto_url).toBeNull();
    expect(j.gerente?.foto_url).toBeNull();
    expect(j.subordinados_directos.map((p) => p.foto_url)).toEqual([URL, null]);
  });
});

describe('GET /rh/colaboradores → data[].foto_url / data.foto_url', () => {
  it('normaliza la página y conserva meta', () => {
    const pagina = normalizeRhPagina(
      { data: [{ id: 1, nombre: 'Ana', foto_url: URL, estatus: 'activo' }, { id: 2, nombre: 'Luis', foto_url: '' }], meta: { current_page: 1, last_page: 3, per_page: 40, total: 90 } },
      normalizeRhColaborador,
    );
    expect(pagina.data.map((c) => c.foto_url)).toEqual([URL, null]);
    expect(pagina.data[0]?.estatus).toBe('activo');
    expect(pagina.meta?.total).toBe(90);
  });
  it.each(SIN_FOTO)('detalle: %s ⇒ null', (_caso, valor) => {
    expect(normalizeRhColaborador({ id: 1, nombre: 'Ana', foto_url: valor }).foto_url).toBeNull();
  });
});

describe('GET /rh/candidatos → data[].foto_url / data.candidato.foto_url', () => {
  it('fila y detalle conservan la URL', () => {
    expect(normalizeCandidatoFila({ id: 1, nombre_completo: 'Ana', foto_url: URL }).foto_url).toBe(URL);
    expect(normalizeCandidatoDetalle({ id: 1, nombre: 'Ana', foto_url: URL }).foto_url).toBe(URL);
  });
  it.each(SIN_FOTO)('%s ⇒ null', (_caso, valor) => {
    expect(normalizeCandidatoFila({ id: 1, nombre_completo: 'Ana', foto_url: valor }).foto_url).toBeNull();
    expect(normalizeCandidatoDetalle({ id: 1, nombre: 'Ana', foto_url: valor }).foto_url).toBeNull();
  });
});

describe('GET /rh/solicitudes → colaborador.foto_url', () => {
  it('conserva la URL y el resto del recurso', () => {
    const s = normalizeRhSolicitud({ id: 9, folio: 'SOL-9', colaborador: { id: 1, nombre: 'Ana', foto_url: URL }, adjuntos: [] });
    expect(s.colaborador.foto_url).toBe(URL);
    expect(s.colaborador.nombre).toBe('Ana');
    expect(s.folio).toBe('SOL-9');
  });
  it.each(SIN_FOTO)('%s ⇒ null', (_caso, valor) => {
    expect(normalizeRhSolicitud({ id: 9, colaborador: { id: 1, nombre: 'Ana', foto_url: valor } }).colaborador.foto_url).toBeNull();
  });
});

describe('GET /rh/bajas → data[].foto_url / data.foto_url', () => {
  it('lista y detalle conservan la URL', () => {
    const pagina = normalizeBajasPagina({ data: [{ id: 1, colaborador: 'Ana', foto_url: URL }], current_page: 1, last_page: 1 });
    expect(pagina.data[0]?.foto_url).toBe(URL);
    expect(normalizeBajaDetalle({ id: 1, colaborador: 'Ana', foto_url: URL }).foto_url).toBe(URL);
  });
  it.each(SIN_FOTO)('%s ⇒ null', (_caso, valor) => {
    expect(normalizeBajaFila({ id: 1, colaborador: 'Ana', foto_url: valor }).foto_url).toBeNull();
  });
});

describe('GET /rh/incorporaciones → colaborador.foto_url', () => {
  it('conserva la URL', () => {
    const i = normalizeRhIncorporacion({ colaborador: { id: 1, nombre: 'Ana', foto_url: URL }, estado: 'en_revision', documentos: [] });
    expect(i.colaborador.foto_url).toBe(URL);
    expect(i.estado).toBe('en_revision');
  });
  it.each(SIN_FOTO)('%s ⇒ null', (_caso, valor) => {
    expect(normalizeRhIncorporacion({ colaborador: { id: 1, nombre: 'Ana', foto_url: valor } }).colaborador.foto_url).toBeNull();
  });
});
