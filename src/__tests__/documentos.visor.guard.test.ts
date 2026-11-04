import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const SRC = join(__dirname, '..');

/** Únicos archivos que pueden tocar un visor PDF: el componente único, sus motores y la excepción de inducción. */
const PERMITIDOS = new Set([
  'components/DocumentoProtegido.tsx',
  'components/SecureDocumentViewer.tsx',
  'components/PdfViewer.tsx',
  'components/VisorPdfPaginado.tsx',
  // Vista previa de la carta: borrador por POST, solo consulta.
  'components/CartaCompromisoVisor.tsx',
  // Inducción: excepción expresa, conserva su visor.
  'app/(app)/induccion/capitulos.tsx',
  'app/(app)/induccion/presentacion.tsx',
]);

const VISORES = /from\s+['"](?:[^'"]*\/)?(?:SecureDocumentViewer|PdfViewer|VisorPdfPaginado|DescargaDocumento)['"]|from\s+['"]react-native-webview['"]/;

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return nombre === '__tests__' ? [] : archivos(ruta);
    return /\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

describe('regla de documentos', () => {
  const fuentes = [...archivos(join(SRC, 'app')), ...archivos(join(SRC, 'components'))];

  it('recorre las pantallas de verdad', () => {
    expect(fuentes.length).toBeGreaterThan(100);
  });

  it('ninguna pantalla normal importa un visor PDF', () => {
    const infractores = fuentes
      .filter((ruta) => VISORES.test(readFileSync(ruta, 'utf8')))
      // Separadores POSIX: en Windows `relative` devuelve «\» y la lista usa «/».
      .map((ruta) => relative(SRC, ruta).split(sep).join('/'))
      .filter((ruta) => !PERMITIDOS.has(ruta));
    expect(infractores).toEqual([]);
  });

  it('el visor seguro no tiene ninguna salida a otra app', () => {
    const visor = readFileSync(join(SRC, 'components/SecureDocumentViewer.tsx'), 'utf8');
    expect(visor).not.toMatch(/expo-sharing|expo-intent-launcher|useDescargaDocumento\(|allowDownload|Abrir con/);
  });

  it('la firma no se marca al cerrar el visor', () => {
    const pantalla = readFileSync(join(SRC, 'app/(app)/documentos-laborales/[id].tsx'), 'utf8');
    expect(pantalla).not.toMatch(/onClose/);
    expect(pantalla).toMatch(/onAperturaVerificada=\{registrarApertura\}/);
    expect(pantalla).toMatch(/onSuccess: \(\) => setAperturaVerificada\(true\)/);
  });
});
