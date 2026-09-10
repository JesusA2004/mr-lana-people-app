import { uniqueTempFileName } from '../tempFileName';

describe('uniqueTempFileName', () => {
  it('nunca reutiliza el mismo nombre para dos documentos, incluso con el mismo título de origen', () => {
    const names = new Set(Array.from({ length: 50 }, () => uniqueTempFileName('pdf')));
    expect(names.size).toBe(50);
  });

  it('conserva la extensión pedida', () => {
    expect(uniqueTempFileName('png').endsWith('.png')).toBe(true);
  });

  it('nunca depende de un nombre de documento — el nombre es genérico', () => {
    expect(uniqueTempFileName('pdf')).toMatch(/^mrlana-doc-\d+-[a-z0-9]+\.pdf$/);
  });
});
