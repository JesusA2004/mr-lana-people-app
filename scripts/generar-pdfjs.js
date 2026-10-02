/**
 * Genera `src/vendor/pdfjs.generated.ts` con el código de pdf.js (build
 * legacy, compatible con WebViews Android viejos) como texto, para que el
 * visor de PDF de Android funcione SIN internet: nada se descarga en tiempo
 * de ejecución (antes dependía de cdnjs).
 *
 * Uso: `npm run vendor:pdfjs` (tras actualizar `pdfjs-dist`). El archivo
 * generado se versiona.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const base = path.join(raiz, 'node_modules', 'pdfjs-dist');
const { version } = require(path.join(base, 'package.json'));

const leer = (archivo) =>
  fs
    .readFileSync(path.join(base, 'legacy', 'build', archivo), 'utf8')
    // Nunca debe poder cerrar el <script> que lo contiene.
    .replace(/<\/script/gi, '<\\/script');

const destino = path.join(raiz, 'src', 'vendor', 'pdfjs.generated.ts');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(
  destino,
  `/* eslint-disable */\n// ARCHIVO GENERADO por scripts/generar-pdfjs.js — no editar a mano.\n// pdfjs-dist ${version} (legacy build). Licencia Apache-2.0 (Mozilla).\n\nexport const PDFJS_VERSION = ${JSON.stringify(version)};\n\nexport const PDFJS_SCRIPT: string = ${JSON.stringify(leer('pdf.min.js'))};\n\nexport const PDFJS_WORKER_SCRIPT: string = ${JSON.stringify(leer('pdf.worker.min.js'))};\n`,
);

console.log(`pdf.js ${version} empaquetado en ${path.relative(raiz, destino)} (${Math.round(fs.statSync(destino).size / 1024)} KB)`);
