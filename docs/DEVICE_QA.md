# QA en dispositivo físico

Lo que los tests automáticos **no** pueden comprobar. Usar el APK `preview`.

## Anchos a revisar

320 (Android pequeño / modo "pantalla ampliada") · 360 · 390 · 430 · 600 y
768–820 (tablet). En tablet el contenido se centra (máx. 720 px; formularios
560 px) y los resúmenes pasan a 4 columnas desde 600 px.

## Checklist

**Arranque y sesión**
- Abrir sin red con sesión guardada → "No pudimos verificar tu sesión" + Reintentar (no Login).
- Volver la red → entra solo.
- Splash nunca se queda congelado (watchdog 15 s).

**Mi espacio / Gestión RH**
- Primer login de cuenta con RH: selector con foto real (Mi espacio) y el badge RH.
- Configuración → Cambiar de experiencia.
- Dashboard RH: badge con halo; con "Reducir movimiento" activado no se anima.

**Préstamos (RH)**
- Solicitud de préstamo: monto, plazo y visto bueno visibles; no aparece el "Aprobar" genérico ni un segundo "Rechazar".
- Visto bueno pendiente → sin "Autorizar préstamo" y con el motivo.
- Autorizar → monto y plazo prellenados; periodicidad mensual.

**Confirmaciones**
- Solicitar cambio de un documento, generar/regenerar PDFs, importar recibos, aplicar/descartar datos detectados, marcar en revisión/cerrar solicitud, abrir/cerrar muro, dar de alta: todos piden confirmación y "Cancelar" no hace nada.

**Muro de cumpleaños**
- RH: Cumpleaños → detalle → "Abrir muro" (confirmación) → todos reciben push.
- Colaborador: banner en Inicio → muro → mensaje + foto (cámara y galería) → aparece arriba.
- Borrar mensaje propio; RH puede borrar cualquiera; "Cerrar muro" deja solo lectura.

**Alta de colaborador (RH con `colaboradores.alta`)**
- Colaboradores → botón "+" → catálogos cargan → puestos se filtran por departamento, jefes por sucursal → confirmación → abre el detalle del nuevo colaborador.
- Con teclado abierto el botón "Dar de alta" sigue alcanzable (scroll).

**Visor de documentos**
- Abrir un PDF (recibo, contrato, documento laboral) en **Android y iOS**: debe verse. Si en Android queda en blanco, reportarlo (el WebView de Android no siempre renderiza PDF local; ver `docs/FINAL_MOBILE_AUDIT.md`).
- Captura de pantalla bloqueada dentro del visor.

**Tema oscuro**
- Cambiar el sistema a oscuro y **reabrir** la app (el tema se fija al arrancar): inputs, tarjetas, modales, switch, skeleton, banner offline y badge RH legibles.

**Push**: ver `docs/PUSH_QA.md`.
