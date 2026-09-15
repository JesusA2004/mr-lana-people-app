# Checklist de pruebas en dispositivo físico — sincronización 2026-09-15

Cubre lo que cambió en esta sincronización. Correr en **Android e iOS**: todo
lo nuevo usa API multiplataforma, pero el picker de fecha, el teclado
numérico, el multipart de adjuntos y `Linking.openURL` se comportan distinto
en cada sistema.

**Antes de empezar:** `EXPO_PUBLIC_API_URL` apuntando al backend real (IP LAN,
no `localhost`, en dispositivo físico) y `EXPO_PUBLIC_RH_WEB_URL` al portal.

---

## Colaborador

### Registro e incorporación
- [ ] Escanear el QR de invitación abre el registro y valida el token.
- [ ] Un QR vencido/inválido muestra el mensaje del backend, no una pantalla rota.
- [ ] Completar el registro deja la sesión iniciada.
- [ ] "Mi incorporación" muestra el checklist con su progreso real.
- [ ] Subir un documento del expediente refleja el estado nuevo al volver.

### Solicitudes — el corazón de esta sincronización
- [ ] "Nueva solicitud" lista **los tipos que manda el backend**, no una lista local.
- [ ] La lista **no** incluye "Baja de colaborador" para un colaborador normal.
- [ ] Cada tipo dibuja **solo** sus campos (préstamo no pide fechas; vacaciones sí).
- [ ] Cambiar de tipo a medio llenado limpia los campos del tipo anterior.
- [ ] Vacaciones: se ve el saldo disponible **antes** de enviar.
- [ ] Vacaciones: elegir el rango prellena "días solicitados"; se puede corregir a mano.
- [ ] Vacaciones: pedir más días de los disponibles devuelve el mensaje del backend ("No tienes suficientes días disponibles"), anclado al campo.
- [ ] Préstamo: teclado numérico, símbolo `$`, formato MXN debajo, y se envía el número limpio.
- [ ] Permisos por horas: aparece el aviso de indicar el horario en el motivo.
- [ ] Permisos especiales (cumpleaños/paternidad/fallecimiento): se ve el copy humano.
- [ ] Incapacidad: se puede adjuntar desde **cámara, galería y archivo**.
- [ ] Un 422 del backend marca el campo exacto y devuelve al paso de información.
- [ ] Doble toque rápido en "Enviar" **no** crea dos solicitudes.
- [ ] Con el avión activado a mitad del envío: aparece "No pudimos confirmar el envío" y **no** se reintenta solo.

### Detalle y cancelación
- [ ] La línea de tiempo muestra Enviada → En revisión → Aprobada/cerrada.
- [ ] Una rechazada/cancelada se ve como **estado final**, no como paso pendiente.
- [ ] "Cancelar solicitud" aparece en `enviada`/`en_revision`/`requiere_correccion`.
- [ ] **No** aparece en `aprobada`/`rechazada`/`cancelada`/`cerrada`.
- [ ] Cancelar pide confirmación explícita antes de ejecutar.
- [ ] Tras cancelar: toast, haptic, y la lista, el detalle y el badge del tab se actualizan solos.
- [ ] Si el backend responde 403 (el estado cambió entre tanto), se muestra su mensaje y la pantalla se refresca.

### Vacaciones
- [ ] "Mis vacaciones" muestra saldo, próximas e historial.
- [ ] Las solicitudes que se ven ahí son las **mismas** que en "Mis solicitudes" filtradas por Vacaciones.
- [ ] "Solicitar vacaciones" abre el **wizard unificado** con el tipo ya elegido — no un formulario aparte.
- [ ] Una vacación creada aquí aparece en la bandeja **Solicitudes** de RH (no en la de vacaciones legacy).

### Lista y filtros
- [ ] Filtros por familia: Todas / Vacaciones / Permisos / Incapacidades / Préstamos / Otras.
- [ ] Filtro por estado combinable con el de familia.
- [ ] Scroll infinito carga más allá de la primera página.
- [ ] Buscar por folio, tipo o motivo.

### Notificaciones
- [ ] Cada notificación muestra el **emoji del backend** y su color traducido.
- [ ] Un cumpleaños se ve con 🎂 y acento de celebración.
- [ ] Tocar una notificación de solicitud abre **ese** detalle.
- [ ] Una notificación de tipo desconocido muestra 🔔 neutral y **no** truena al tocarla.
- [ ] "Marcar todas" deja el badge en cero.

### Otros
- [ ] Cumpleaños propio: felicitación y celebración cuando aplica.
- [ ] Biometría: bloqueo/desbloqueo al volver del segundo plano.
- [ ] Modo avión: se ven las últimas solicitudes cacheadas; las mutaciones fallan con mensaje claro y **sin reintento automático**.

## RH / gerencia

- [ ] Selector "Mi espacio" / "Gestión RH" aparece solo si el bootstrap lo permite.
- [ ] La experiencia por defecto de un colaborador-con-permisos sigue siendo **Mi espacio**.
- [ ] Inicio RH muestra Pendientes / Solicitudes / Documentos / Incorporaciones — **sin** mosaico duplicado de Vacaciones.
- [ ] Si quedan vacaciones legacy abiertas, sale la tarjeta "N vacaciones anteriores por cerrar" con su aclaración.
- [ ] Push de `rh_solicitud` con la app cerrada abre el detalle correcto y cambia solo a Gestión RH.
- [ ] Una solicitud de vacaciones se ve en **Solicitudes**, con su etiqueta "Vacaciones".
- [ ] Aprobar / Rechazar / Pedir corrección aparecen **solo** si `acciones_permitidas` los trae.
- [ ] Rechazar y pedir corrección exigen motivo.
- [ ] "Marcar en revisión" solo sobre una `enviada`; "Cerrar" solo sobre una `aprobada`.
- [ ] Aprobar una **baja sin evidencia**: se ve el mensaje exacto del backend, sin CTA al portal.
- [ ] Aprobar una **baja sin finiquito revisado**: mensaje exacto + botón "Completar en portal web".
- [ ] Ese botón abre el Portal RH en el navegador, **sin token en la URL**.
- [ ] Documentos: aprobar/rechazar y revisar la extracción automática (OCR).
- [ ] Incorporaciones: aprobar/rechazar.
- [ ] Vacantes: se entra desde Inicio → Vacantes (**no** es un tab).
- [ ] Vacantes muestra puesto, departamento, sucursal, motivo, estado, plazas y candidatos.
- [ ] Vacantes **no** ofrece ningún botón de crear/editar/cubrir/cancelar.
- [ ] Filtros de vacante por estado + paginación real al llegar al final.
- [ ] Sin permiso `vacantes.ver`, el módulo **no aparece** y la ruta directa no rompe.
- [ ] Cumpleaños RH: bandeja y felicitación.
- [ ] "Abrir Portal RH" desde Inicio RH funciona.

## Baja de colaborador (gerente con `solicitudes.bajas.crear`)

- [ ] "Baja de colaborador" **sí** aparece en la lista de tipos.
- [ ] El selector de colaborador busca con debounce y **no** carga miles de registros.
- [ ] Solo aparecen colaboradores dentro del alcance (lo acota el backend).
- [ ] El formulario pide colaborador, fecha efectiva, tipo de baja, motivo y observaciones.
- [ ] El tipo de baja ofrece las 6 opciones del catálogo y el envío **no** devuelve 422 por ese campo.

## Plataforma

- [ ] Android: back físico en el wizard no pierde el formulario sin preguntar.
- [ ] iOS: el date picker inline se cierra con "Listo".
- [ ] iOS: si hay release con `install_url`/`store_url`, el aviso de actualización tiene a dónde ir.
- [ ] Android: la descarga del APK sigue funcionando igual que antes.
- [ ] Ninguna pantalla nueva llama a API exclusiva de una plataforma sin guard.
