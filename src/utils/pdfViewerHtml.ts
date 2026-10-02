import { PDFJS_SCRIPT, PDFJS_WORKER_SCRIPT } from '@/vendor/pdfjs.generated';

/** Tamaño de cada trozo base64 que se manda al WebView (múltiplo de 4: base64 válido por trozo). */
export const TAMANO_TROZO = 512 * 1024;

export function partirEnTrozos(base64: string, tamano = TAMANO_TROZO): string[] {
  if (base64.length === 0) return [];
  const trozos: string[] = [];
  for (let i = 0; i < base64.length; i += tamano) {
    trozos.push(base64.slice(i, i + tamano));
  }
  return trozos;
}

/**
 * HTML autocontenido del visor de PDF para Android: pdf.js y su "worker"
 * van incrustados (modo hilo principal: `globalThis.pdfjsWorker`), así que
 * NO hay ninguna petición de red. Protocolo con la app:
 *   app → web: {type:'chunk', index, data} … {type:'end', total}
 *   web → app: {type:'ready'} · {type:'rendered', pages} · {type:'error', message}
 * Las páginas se dibujan una por una (no todas a la vez) para no agotar la
 * memoria con PDFs grandes.
 */
export function construirHtmlVisorPdf(): string {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; worker-src blob:" />
<style>
  html,body{margin:0;padding:0;background:#2b2b2b;}
  #paginas{display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 0;}
  canvas{background:#fff;max-width:100%;height:auto;box-shadow:0 1px 4px rgba(0,0,0,.4);}
</style>
<script>${PDFJS_WORKER_SCRIPT}</script>
<script>${PDFJS_SCRIPT}</script>
</head><body>
<div id="paginas"></div>
<script>
(function(){
  function avisar(tipo, extra){ if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type: tipo}, extra || {}))); }
  var trozos = [];
  function decodificar(){
    var total = 0, partes = [];
    for (var i = 0; i < trozos.length; i++) {
      var bin = atob(trozos[i]);
      var arr = new Uint8Array(bin.length);
      for (var j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
      partes.push(arr); total += arr.length; trozos[i] = null;
    }
    var bytes = new Uint8Array(total), offset = 0;
    for (var k = 0; k < partes.length; k++) { bytes.set(partes[k], offset); offset += partes[k].length; }
    return bytes;
  }
  function dibujar(bytes){
    var lib = window.pdfjsLib;
    if (!lib || !window.pdfjsWorker) { avisar('error', {message: 'pdf.js no disponible'}); return; }
    lib.getDocument({ data: bytes, isEvalSupported: false }).promise.then(function(pdf){
      var cont = document.getElementById('paginas');
      var ancho = Math.max(window.innerWidth - 16, 200);
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var n = 1;
      function siguiente(){
        if (n > pdf.numPages) { avisar('rendered', {pages: pdf.numPages}); return; }
        pdf.getPage(n).then(function(pagina){
          var base = pagina.getViewport({ scale: 1 });
          var vista = pagina.getViewport({ scale: (ancho / base.width) * dpr });
          var canvas = document.createElement('canvas');
          canvas.width = Math.floor(vista.width); canvas.height = Math.floor(vista.height);
          canvas.style.width = Math.floor(vista.width / dpr) + 'px';
          cont.appendChild(canvas);
          return pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vista }).promise.then(function(){
            pagina.cleanup();
            if (n === 1) avisar('rendered', {pages: 0});
            n++; siguiente();
          });
        }).catch(function(e){ avisar('error', {message: e && e.message}); });
      }
      siguiente();
    }).catch(function(e){ avisar('error', {message: e && e.message}); });
  }
  function recibir(evento){
    var msg;
    try { msg = JSON.parse(evento.data); } catch (e) { return; }
    if (msg.type === 'chunk') { trozos[msg.index] = msg.data; }
    else if (msg.type === 'end') {
      try { dibujar(decodificar()); } catch (e) { avisar('error', {message: e && e.message}); }
    }
  }
  document.addEventListener('message', recibir);
  window.addEventListener('message', recibir);
  avisar('ready');
})();
</script>
</body></html>`;
}
