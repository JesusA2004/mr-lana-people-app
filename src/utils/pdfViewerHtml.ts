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

/**
 * Variante PAGINADA del visor (inducción y cualquier PDF que se lee página
 * por página): mismo pdf.js empaquetado y mismo protocolo de trozos, pero
 * dibuja UNA página a la vez a la escala pedida, cancelando el dibujo
 * anterior. Protocolo extra:
 *   app → web: {type:'page', numero, zoom}
 *   web → app: {type:'loaded', pages} · {type:'shown', numero}
 * Solo se reporta `shown` cuando la página ya quedó dibujada en pantalla.
 */
export function construirHtmlVisorPdfPaginado(): string {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; worker-src blob:" />
<style>
  html,body{margin:0;padding:0;background:#efe8db;min-height:100%;}
  #caja{display:flex;justify-content:center;align-items:flex-start;padding:12px;min-height:100vh;box-sizing:border-box;overflow:auto;}
  canvas{background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.25);border-radius:2px;transition:opacity .15s ease;}
  @media (prefers-reduced-motion: reduce){canvas{transition:none;}}
</style>
<script>${PDFJS_WORKER_SCRIPT}</script>
<script>${PDFJS_SCRIPT}</script>
</head><body>
<div id="caja"><canvas id="lienzo"></canvas></div>
<script>
(function(){
  function avisar(tipo, extra){ if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type: tipo}, extra || {}))); }
  var trozos = [], doc = null, tarea = null, pedido = 0;
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
  function mostrar(numero, zoom){
    if (!doc) return;
    var id = ++pedido;
    if (tarea) { try { tarea.cancel(); } catch (e) {} }
    var lienzo = document.getElementById('lienzo');
    lienzo.style.opacity = '0.6';
    doc.getPage(numero).then(function(pagina){
      if (id !== pedido) return;
      var base = pagina.getViewport({ scale: 1 });
      var ancho = Math.max(window.innerWidth - 24, 200) * (zoom || 1);
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var escala = ancho / base.width;
      var vista = pagina.getViewport({ scale: escala * dpr });
      lienzo.width = Math.floor(vista.width); lienzo.height = Math.floor(vista.height);
      lienzo.style.width = Math.floor(base.width * escala) + 'px';
      lienzo.style.height = Math.floor(base.height * escala) + 'px';
      tarea = pagina.render({ canvasContext: lienzo.getContext('2d'), viewport: vista });
      return tarea.promise.then(function(){
        if (id !== pedido) return;
        lienzo.style.opacity = '1';
        window.scrollTo(0, 0);
        avisar('shown', {numero: numero});
        if (numero < doc.numPages) doc.getPage(numero + 1);
      });
    }).catch(function(e){ if (e && e.name === 'RenderingCancelledException') return; avisar('error', {message: e && e.message}); });
  }
  function cargar(bytes){
    var lib = window.pdfjsLib;
    if (!lib || !window.pdfjsWorker) { avisar('error', {message: 'pdf.js no disponible'}); return; }
    lib.getDocument({ data: bytes, isEvalSupported: false }).promise.then(function(pdf){
      doc = pdf;
      avisar('loaded', {pages: pdf.numPages});
    }).catch(function(e){ avisar('error', {message: e && e.message}); });
  }
  function recibir(evento){
    var msg;
    try { msg = JSON.parse(evento.data); } catch (e) { return; }
    if (msg.type === 'chunk') { trozos[msg.index] = msg.data; }
    else if (msg.type === 'end') { try { cargar(decodificar()); } catch (e) { avisar('error', {message: e && e.message}); } }
    else if (msg.type === 'page') { mostrar(msg.numero, msg.zoom); }
  }
  document.addEventListener('message', recibir);
  window.addEventListener('message', recibir);
  avisar('ready');
})();
</script>
</body></html>`;
}
