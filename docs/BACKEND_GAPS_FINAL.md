# Discrepancias reales entre la app y `capacitaciones` (backend)

**NO se modificó `capacitaciones` desde esta sesión** (fuera de alcance
explícito). Este documento solo audita y describe, para que quien tenga
acceso al backend decida qué hacer. La app ya quedó construida para
funcionar correctamente el día que cada uno de estos puntos se resuelva —
ninguno bloquea el uso normal de lo demás hoy.

Auditado en modo lectura contra el código fuente real de `capacitaciones`
(rutas, controladores, servicios, seeders) el 2026-09-10, no contra un
servidor corriendo — no se ejecutó ningún request de prueba.

---

## G1 — App Links / Universal Links sin archivos de verificación de dominio

**Endpoint esperado:**
```
GET https://people.mr-lana.com/.well-known/apple-app-site-association
GET https://people.mr-lana.com/.well-known/assetlinks.json
```

**Request:** ninguno (archivos estáticos servidos por HTTPS, sin auth).

**Response actual:** no confirmada — no se encontró ninguna ruta ni archivo
público para estas dos rutas en `capacitaciones` (ni en `routes/api.php` ni
en `public/`).

**Problema:** `app.json` de la app móvil ya declara `associatedDomains`
(iOS, `applinks:people.mr-lana.com`) e `intentFilters` (Android,
`autoVerify: true` sobre `/incorporacion/qr`) para que el QR que ya genera
RH (`https://people.mr-lana.com/incorporacion/qr/{token}`) abra la app
directo cuando ya está instalada, en vez de solo el navegador (AGENTS.md
sección 28). Sin los dos archivos de verificación, iOS/Android nunca
confirman que el dominio autoriza a la app a interceptar esa URL, y el
sistema operativo sigue abriendo el navegador siempre — comportamiento
normal del sistema operativo, no un bug de la app.

**Cambio mínimo requerido:**
- `apple-app-site-association` (sin extensión, `Content-Type:
  application/json`, sin redirección):
  ```json
  { "applinks": { "details": [ { "appID": "<TEAM_ID>.com.mrlana.people", "paths": ["/incorporacion/qr/*"] } ] } }
  ```
- `assetlinks.json`:
  ```json
  [{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": { "namespace": "android_app", "package_name": "com.mrlana.people", "sha256_cert_fingerprints": ["<SHA256_DEL_KEYSTORE_DE_FIRMA>"] }
  }]
  ```
  El `sha256_cert_fingerprints` depende del keystore real usado para firmar
  el build de producción (EAS lo genera/gestiona) — coordinarlo con quien
  corra `eas build --profile production` la primera vez.

---

## G2 — Sin landing pública para quien escanea el QR sin tener la app instalada

**Endpoint esperado:** `GET https://people.mr-lana.com/incorporacion/qr/{token}` (web, HTML).

**Response actual:** capacitaciones documenta explícitamente
(`docs/API_MOVIL.md`, sección "Registro por QR temporal") que esa ruta
"todavía no existe" como página web — la liga que codifica el QR solo la
consume hoy la API pública (`/api/v1/incorporacion/invitaciones/{token}/
validar`), pensada para la app móvil.

**Problema:** si alguien escanea el QR con la cámara nativa del teléfono
(no la de la app) y todavía NO tiene MR. LANA PEOPLE instalada (AGENTS.md
sección 21: "puerta de entrada... para quien TODAVÍA NO TIENE CUENTA"), el
navegador intenta abrir esa URL y no encuentra nada útil — ni la app (sin
G1 resuelto) ni una página que lo guíe a instalarla.

**Cambio mínimo requerido:** una landing web mínima en esa ruta con "Instala
MR. LANA PEOPLE" + enlaces a Play Store/APK de descarga directa (ya existe
`GET /api/v1/app/releases/latest` para obtener el `download_url` real) y,
si G1 ya está resuelto, un intento de abrir el deep link antes de mostrar
la landing. Explícitamente fuera de alcance de esta sesión (repo separado).

---

## G3 — RH no puede ver el contenido de los adjuntos de una solicitud

**Endpoint esperado:** `GET /api/v1/rh/solicitudes/{solicitud}/adjuntos/{adjunto}/ver` (o equivalente).

**Request:** `Authorization: Bearer <token>`, permiso `rh.solicitudes.ver` o `rh.solicitudes.detalle`.

**Response actual esperada:** el detalle de una solicitud RH
(`GET /rh/solicitudes/{solicitud}`) sí incluye `adjuntos: [{id, nombre}]`
(confirmado en `docs/RH_MOBILE_API.md`), pero no existe ninguna ruta
documentada ni en `routes/api.php` para descargar/ver el contenido de esos
adjuntos — a diferencia de documentos de expediente
(`rh/documentos/{id}/ver`, `rh/expedientes/{colaborador}/documentos/
{documento}/ver`), que sí tienen streaming autenticado.

**Problema:** hoy RH ve el NOMBRE del adjunto (ej. "incapacidad.pdf") en el
detalle de la solicitud, pero no hay forma de abrirlo — la app
deliberadamente NO ofrece un botón "Ver" ahí para no prometer una acción
que no existe (AGENTS.md sección 61: "no mostrar acción engañosa"), ver
`src/app/(app)/rh/solicitudes/[id].tsx`.

**Cambio mínimo requerido:** una ruta de streaming análoga a
`rh/documentos/{id}/ver`, reutilizando `DocumentoStorageService::respuesta`
sobre el modelo de adjunto de solicitud (`solicitud_interna_adjuntos`, ver
`docs/BACKEND_REQUIREMENTS_V4.md` P1.3 para el modelo de datos). En cuanto
exista, conectar `SecureDocumentViewer` (ya construido y reutilizable) solo
requiere agregar `path` a la card de adjunto.

---

## G4 — Sin API móvil RH de cumpleaños

**Endpoint esperado:** algo como `GET /api/v1/rh/cumpleanos` (lista de cumpleaños del equipo/alcance de RH).

**Response actual:** no existe — confirmado contra `routes/api.php`: solo
existe `colaborador/cumpleanos/felicitacion-actual[/imagen]`, siempre sobre
el usuario autenticado, nunca sobre el equipo.

**Problema:** el push `rh_cumpleanos` (ya documentado en
`docs/PUSH_NOTIFICATIONS.md` de capacitaciones como tipo válido, aunque no
se confirmó qué lo dispara todavía) no tiene a dónde navegar de forma
específica. La app cae en Notificaciones RH de forma elegante en vez de
crashear (AGENTS.md sección 37/61), ver `resolveResourceRoute` en
`src/utils/appLinks.ts`.

**Cambio mínimo requerido:** definir si `rh_cumpleanos` debe existir del
lado backend (¿qué evento lo dispara? ¿cumpleaños de un subordinado?) y, si
sí, un endpoint `rh/cumpleanos` con el mismo patrón de alcance
organizacional que el resto de RH móvil.

---

## Formas de contrato no confirmadas (no son errores, quedaron defensivas)

Estos campos se tipificaron como **opcionales** en
`src/types/rh.ts` porque `docs/RH_MOBILE_API.md` no muestra un JSON de
ejemplo completo para ellos — la app los renderiza solo si vienen, nunca
asume su ausencia como error:

- `RhVacacion.workflow` / `RhVacacion.historial` — el doc de vacaciones
  solo confirma `saldo_disponible`; no se confirmó si el detalle también
  trae `workflow`/`historial` como el de solicitudes.
- `RhDocumento.workflow` — mismo caso.
- `RhExpediente.acciones_permitidas` / `RhExpedienteDocumento.acciones_permitidas`
  — el doc de expedientes no muestra este campo (a diferencia de
  pendientes/solicitudes/vacaciones/documentos, que sí lo documentan
  explícitamente). La app usa en su lugar los permisos reales de Spatie
  (`user.permissions` de `mobile/bootstrap`, ver `hasPermission()` en
  `src/utils/capabilities.ts`) para decidir qué botones mostrar en
  expedientes — sigue sin ser un `if role === "rh_admin"`, pero si el
  backend llega a agregar `acciones_permitidas` a este recurso, migrar
  `src/app/(app)/rh/expedientes/**` a leerlo de ahí es más simple/consistente
  con el resto de RH.

Si al conectar contra un backend real alguno de estos campos llega con
otro nombre o forma, son los únicos puntos que requerirían ajuste — el
resto del contrato (bootstrap, dashboard, pendientes, solicitudes,
documentos, incorporaciones, colaboradores, cumpleaños, releases, config)
se confirmó 1:1 contra el código fuente real.
