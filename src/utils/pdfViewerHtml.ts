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
 * Render PEREZOSO: cada página es un contenedor del tamaño de la hoja y
 * solo se dibuja (canvas) la que está a la vista ± 1; las que salen de ese
 * rango liberan su canvas. Así un PDF largo (contrato, finiquito, acta) no
 * mantiene decenas de canvas en memoria. El zoom es el del WebView
 * (pellizco, `maximum-scale=5`) y el scroll es el normal del documento.
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
  .pagina{background:#fff;max-width:100%;box-shadow:0 1px 4px rgba(0,0,0,.4);overflow:hidden;}
  canvas{display:block;max-width:100%;height:auto;}
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
      // Tope más bajo que el visor paginado (2): hasta 3 páginas (vista ± 1)
      // pueden tener canvas a la vez; en un Android de gama media un canvas
      // muy denso puede agotar la memoria del proceso de render (ver
      // PdfViewer.tsx: onRenderProcessGone).
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      return pdf.getPage(1).then(function(p1){
        var base1 = p1.getViewport({ scale: 1 });
        var altoEstimado = Math.floor(ancho * base1.height / base1.width);
        // estado: 0 = sin dibujar · 1 = dibujando · 2 = dibujada
        var paginas = [];
        for (var i = 0; i < pdf.numPages; i++) {
          var div = document.createElement('div');
          div.className = 'pagina';
          div.style.width = ancho + 'px';
          div.style.height = altoEstimado + 'px';
          cont.appendChild(div);
          paginas.push({ div: div, canvas: null, estado: 0, tarea: null });
        }
        var cola = [], ocupado = false, avisado = false;
        function liberar(p){
          if (p.tarea) { try { p.tarea.cancel(); } catch (e) {} p.tarea = null; }
          if (p.canvas) { p.canvas.width = 0; p.canvas.height = 0; p.div.removeChild(p.canvas); p.canvas = null; }
          p.estado = 0;
        }
        // Una página a la vez: nunca varios renders compitiendo por memoria.
        function procesar(){
          if (ocupado) return;
          var indice = cola.shift();
          if (indice === undefined) return;
          var p = paginas[indice];
          if (p.estado !== 0) { procesar(); return; }
          ocupado = true; p.estado = 1;
          pdf.getPage(indice + 1).then(function(pagina){
            // Salió de la vista mientras se pedía la página: no se dibuja.
            if (p.estado !== 1) return;
            var base = pagina.getViewport({ scale: 1 });
            var vista = pagina.getViewport({ scale: (ancho / base.width) * dpr });
            var canvas = document.createElement('canvas');
            canvas.width = Math.floor(vista.width); canvas.height = Math.floor(vista.height);
            canvas.style.width = Math.floor(vista.width / dpr) + 'px';
            p.div.style.height = Math.floor(vista.height / dpr) + 'px';
            p.div.appendChild(canvas); p.canvas = canvas;
            p.tarea = pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vista });
            return p.tarea.promise.then(function(){
              p.tarea = null; p.estado = 2; pagina.cleanup();
              if (!avisado) { avisado = true; avisar('rendered', {pages: pdf.numPages}); }
              // La altura real puede diferir de la estimada: recalcula qué se ve.
              programar();
            });
          }).catch(function(e){
            // Cancelado por salir de la vista: no es un error.
            if (e && e.name === 'RenderingCancelledException') return;
            avisar('error', {message: e && e.message});
          }).then(function(){ ocupado = false; procesar(); });
        }
        function actualizar(){
          // Viewport de layout (no el visual): con zoom de pellizco cubre de
          // más, nunca de menos.
          var alto = Math.max(window.innerHeight, document.documentElement.clientHeight);
          var primera = -1, ultima = -1;
          for (var i = 0; i < paginas.length; i++) {
            var r = paginas[i].div.getBoundingClientRect();
            if (r.bottom >= 0 && r.top <= alto) { if (primera < 0) primera = i; ultima = i; }
            else if (primera >= 0) break;
          }
          if (primera < 0) return;
          var desde = Math.max(primera - 1, 0), hasta = Math.min(ultima + 1, paginas.length - 1);
          for (var k = 0; k < paginas.length; k++) {
            if ((k < desde || k > hasta) && paginas[k].estado !== 0) liberar(paginas[k]);
          }
          // Primero las visibles, luego la anterior y la siguiente.
          cola = [];
          for (var v = primera; v <= ultima; v++) cola.push(v);
          if (desde < primera) cola.push(desde);
          if (hasta > ultima) cola.push(hasta);
          procesar();
        }
        var programado = false;
        function programar(){
          if (programado) return;
          programado = true;
          window.requestAnimationFrame(function(){ programado = false; actualizar(); });
        }
        window.addEventListener('scroll', programar, { passive: true });
        window.addEventListener('resize', programar);
        if (window.visualViewport) {
          window.visualViewport.addEventListener('scroll', programar);
          window.visualViewport.addEventListener('resize', programar);
        }
        actualizar();
      });
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
