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

## Sesión, bloqueo y biometría (28/09/2026)

**Onboarding global (ya no por cuenta)**
- Instalación limpia → login → aparece la guía. Termínala o ciérrala.
- Cerrar sesión → iniciar sesión con una cuenta **distinta** en el mismo teléfono → la guía **NO** debe volver a aparecer.
- Configuración → Ayuda → "Ver guía" la vuelve a mostrar manualmente en cualquier momento.

**Experiencia por cuenta (Mi espacio / Gestión RH)**
- Cuenta con ambas capacidades: elige "Gestión RH" → cerrar sesión → iniciar sesión con una cuenta **distinta** que también tenga ambas → debe ofrecer el selector de nuevo (no heredar "Gestión RH" de la cuenta anterior).
- Cerrar sesión de la cuenta A y volver a iniciar sesión con A en el mismo teléfono → debe restaurar la última experiencia que A eligió (sin volver a preguntar).
- Si a la cuenta le retiran el permiso RH del lado del servidor, al reabrir la app debe caer sola a "Mi espacio".

**Biometría por cuenta**
- Activar biometría en la cuenta A → cerrar sesión → iniciar sesión con la cuenta B en el mismo teléfono → `LockScreen` de B **NO** debe ofrecer huella/Face ID automáticamente (B nunca la activó).
- Volver a entrar con A → su biometría sigue activada.

**Bloqueo en frío (cold start)**
- Con sesión iniciada, **matar la app completamente** (deslizar fuera de recientes) y reabrirla → debe mostrar `LockScreen` (contraseña o biometría) **sin importar cuánto tiempo pasó**, incluso si se reabre a los 2 segundos.
- Desbloquear con contraseña → confirmar que la sesión sigue siendo la misma (no pide iniciar sesión completo de nuevo) y que sí puede seguir navegando con normalidad.
- Con la app en segundo plano **menos** de 5 minutos (sin matarla) → al volver, entra directo sin `LockScreen`.
- Con la app en segundo plano **más** de 5 minutos (sin matarla) → al volver, exige `LockScreen`.

## Formatos (generar documento DOCX) — 28/09/2026

- Gestión RH → Formatos → elegir un formato con al menos una variable manual configurada en Portal RH (ver `docs/DOCX_TEMPLATES.md`) → elegir colaborador.
- Si la plantilla tiene una variable manual **obligatoria** sin valor: el botón "Generar documento" debe estar deshabilitado y mostrar el aviso; capturar el valor lo habilita.
- Generar el documento → aparece la pantalla de resultado con nombre de archivo real.
- "Vista previa" abre el visor con el PDF (si la conversión está disponible en el servidor) sin que la app se congele si no lo está.
- El documento debe aparecer en el expediente del colaborador en Portal RH.
