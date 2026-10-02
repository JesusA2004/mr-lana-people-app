import { construirHtmlVisorPdf, partirEnTrozos, TAMANO_TROZO } from '../pdfViewerHtml';

describe('visor PDF Android (offline)', () => {
  const html = construirHtmlVisorPdf();

  it('no carga NADA de internet: pdf.js va empaquetado', () => {
    expect(html).not.toMatch(/cdnjs|unpkg|jsdelivr/);
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).toContain('pdfjsWorker');
    expect(html).toContain("default-src 'none'");
  });

  it('el código empaquetado no puede cerrar su <script>', () => {
    const scripts = html.split('<script>');
    // Cada bloque solo cierra una vez su propio </script>.
    for (const bloque of scripts.slice(1)) {
      expect(bloque.split('</script>').length).toBe(2);
    }
  });

  it('parte un PDF grande en trozos base64 válidos y los rearma igual', () => {
    const base64 = 'QUJDRA=='.padStart(3 * TAMANO_TROZO + 128, 'QUJD');
    const trozos = partirEnTrozos(base64);
    expect(trozos.length).toBeGreaterThan(3);
    expect(trozos.every((t) => t.length % 4 === 0 || t === trozos[trozos.length - 1])).toBe(true);
    expect(trozos.join('')).toBe(base64);
    expect(partirEnTrozos('')).toEqual([]);
  });
});
