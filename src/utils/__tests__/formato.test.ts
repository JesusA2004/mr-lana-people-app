import { normalizeRhFormato, normalizeRhFormatosList } from '../formato';

describe('normalizeRhFormato', () => {
  it('bug corregido: el catálogo real no manda clave/formatos_salida/variables_requeridas/acciones_permitidas', () => {
    const raw = {
      id: 7,
      nombre: 'Contrato individual de trabajo',
      tipo: 'contrato',
      tipo_etiqueta: 'Contrato laboral',
      descripcion: 'Contrato base',
      variables: ['nombre_completo', 'puesto'],
      veces_generado: 12,
      ultimo_uso: '2026-09-01T10:00:00Z',
    };

    const result = normalizeRhFormato(raw);

    expect(result).toEqual(raw);
    expect(result).not.toHaveProperty('clave');
    expect(result).not.toHaveProperty('formatos_salida');
    expect(result).not.toHaveProperty('acciones_permitidas');
  });

  it('nunca truena con .includes()/.map() sobre campos ausentes — usa defaults seguros', () => {
    const result = normalizeRhFormato({ id: 1, nombre: 'Formato mínimo' });
    expect(result?.variables).toEqual([]);
    expect(result?.tipo_etiqueta).toBe('Otro');
    expect(result?.descripcion).toBeNull();
    expect(result?.veces_generado).toBe(0);
  });

  it('sin id/nombre válidos regresa null en vez de un objeto a medias', () => {
    expect(normalizeRhFormato({ nombre: 'sin id' })).toBeNull();
    expect(normalizeRhFormato(null)).toBeNull();
    expect(normalizeRhFormato('texto')).toBeNull();
  });

  it('nunca inventa un permiso de generar — no existe ese campo en el tipo normalizado', () => {
    const result = normalizeRhFormato({ id: 1, nombre: 'X', acciones_permitidas: ['generar'] });
    expect(result).not.toHaveProperty('acciones_permitidas');
  });
});

describe('normalizeRhFormatosList', () => {
  it('bug corregido: el catálogo real es un arreglo plano, nunca un paginador Laravel', () => {
    const result = normalizeRhFormatosList([{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }]);
    expect(result).toHaveLength(2);
  });

  it('tolera {data: [...]} por si el backend algún día envuelve la respuesta distinto', () => {
    const result = normalizeRhFormatosList({ data: [{ id: 1, nombre: 'A' }] });
    expect(result).toHaveLength(1);
  });

  it('una forma inesperada nunca truena — cae en lista vacía', () => {
    expect(normalizeRhFormatosList(null)).toEqual([]);
    expect(normalizeRhFormatosList('texto')).toEqual([]);
    expect(normalizeRhFormatosList({ total: 5 })).toEqual([]);
  });

  it('descarta silenciosamente entradas inválidas dentro del arreglo', () => {
    const result = normalizeRhFormatosList([{ id: 1, nombre: 'Válido' }, { sin: 'id' }, null]);
    expect(result).toHaveLength(1);
  });
});
