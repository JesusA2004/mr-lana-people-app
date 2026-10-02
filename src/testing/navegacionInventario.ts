/**
 * Inventario AUTOMÁTICO de navegación (usado por navegacion.matrix.test.ts):
 * - rutas reales de Expo Router (archivos en src/app);
 * - destinos escritos en el código (router.push/replace/navigate, href,
 *   pathname, Redirect) — literales y plantillas `${...}`.
 */
import fs from 'fs';
import path from 'path';

export const RAIZ_APP = path.join(__dirname, '..', 'app');
const RAIZ_SRC = path.join(__dirname, '..');

function archivos(dir: string, filtro: (f: string) => boolean): string[] {
  const salida: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === 'node_modules' || entrada.name === '__tests__' || entrada.name === 'vendor') continue;
      salida.push(...archivos(completo, filtro));
    } else if (filtro(completo)) {
      salida.push(completo);
    }
  }
  return salida;
}

/** Patrón de cada pantalla: segmentos sin grupos `(x)` ni `index`; `[id]` = comodín. */
export function rutasDeLaApp(): string[][] {
  return archivos(RAIZ_APP, (f) => /\.tsx?$/.test(f))
    .map((f) => path.relative(RAIZ_APP, f).replace(/\\/g, '/').replace(/\.tsx?$/, ''))
    .filter((r) => !r.split('/').some((s) => s.startsWith('_') || s.startsWith('+')))
    .map((r) => r.split('/').filter((s) => !/^\(.*\)$/.test(s) && s !== 'index'));
}

export function normalizarDestino(destino: string): string[] {
  const sinQuery = destino.split(/[?#]/)[0];
  return sinQuery
    .split('/')
    .filter((s) => s.length > 0 && !/^\(.*\)$/.test(s))
    .map((s) => (s.includes('${') || s.startsWith('[') ? '*' : s));
}

export function existeRuta(destino: string, rutas = rutasDeLaApp()): boolean {
  const pedido = normalizarDestino(destino);
  return rutas.some(
    (ruta) =>
      ruta.length === pedido.length &&
      ruta.every((seg, i) => seg === pedido[i] || (seg.startsWith('[') && seg.endsWith(']')) || (pedido[i] === '*' && seg.startsWith('['))),
  );
}

export interface DestinoEnCodigo {
  archivo: string;
  linea: number;
  destino: string;
}

const PATRONES = [
  /\b(?:push|replace|navigate|dismissTo)\(\s*(['"`])(\/[^'"`]*)\1/g,
  /\bpathname:\s*(['"`])(\/[^'"`]*)\1/g,
  /\bhref=\{?\s*(['"`])(\/[^'"`]*)\1/g,
  /<Redirect\s+href=\{?\s*(['"`])(\/[^'"`]*)\1/g,
  /\broute:\s*(['"`])(\/[^'"`]*)\1/g,
];

export function destinosEnCodigo(): DestinoEnCodigo[] {
  const salida: DestinoEnCodigo[] = [];
  for (const archivo of archivos(RAIZ_SRC, (f) => /\.tsx?$/.test(f) && !f.includes(`${path.sep}__tests__${path.sep}`))) {
    const lineas = fs.readFileSync(archivo, 'utf8').split(/\r?\n/);
    lineas.forEach((texto, i) => {
      for (const patron of PATRONES) {
        patron.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = patron.exec(texto)) !== null) {
          // Rutas de API (`/colaborador/...` con apiClient) no son navegación.
          if (/apiClient|axios|\.get\(|\.post\(|fetch\(/.test(texto)) continue;
          salida.push({ archivo: path.relative(RAIZ_SRC, archivo).replace(/\\/g, '/'), linea: i + 1, destino: m[2] });
        }
      }
    });
  }
  return salida;
}
