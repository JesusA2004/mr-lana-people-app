# Build y pruebas — MR. LANA PEOPLE Mobile (versión final)

Reemplaza a `docs/BUILD_AND_TEST_V4.md` (se conserva por historial). Cubre
todo lo agregado en esta pasada: experiencia RH completa, QR real,
cumpleaños, actualización de app y seguridad de la experiencia RH.

## 0. Antes de empezar

```bash
npm install
```

`.env` debe existir con:
```
EXPO_PUBLIC_API_URL=https://people.mr-lana.com/api/v1
```

## 1. Cambio importante: ya NO alcanza con Expo Go

Esta pasada agregó `expo-camera` (scanner QR real) y `react-native-webview`
(visor de documentos PDF en Gestión RH) — ambos son módulos nativos.
**Se necesita un Development Build nuevo** (los anteriores, de antes de esta
pasada, no lo incluyen). Expo Go sigue sirviendo para desarrollar todo lo
demás (RH, cumpleaños, actualización de app, cambio de experiencia), pero:

- El scanner QR (`/(auth)/escanear-qr`) no puede probarse en Expo Go — usa
  la herramienta `__DEV__` "Pegar token QR" dentro de esa misma pantalla
  para probar el flujo de registro sin cámara real.
- El visor de documentos RH (`SecureDocumentViewer`) tampoco renderiza PDF
  en Expo Go de forma confiable — probar con Development Build.

## 2. Development Build (obligatorio para QR/visor de documentos/push/biometría)

```bash
npx eas-cli login
npx eas-cli build --platform android --profile development
```

Instala el `.apk` en el dispositivo físico, luego:
```bash
npx expo start --dev-client
```

## 3. Preview APK / Production

Sin cambios respecto a `docs/BUILD_AND_TEST_V4.md`:
```bash
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
```

## 4. Validación estática (ejecutada en esta iteración)

```bash
npm install
npx tsc --noEmit                     # 0 errores
npm run lint                         # 0 errores, 0 warnings
npx expo-doctor                      # 21/21
npx expo export --platform android   # bundle .hbc, 2101 módulos, sin errores
npm test                             # 53 pruebas, 8 suites, todas verdes
```

`npm audit` reporta 15 vulnerabilidades moderadas, TODAS transitivas de
herramientas de build (`@expo/cli`/`@expo/config-plugins` vía `xcode`/`uuid`,
y `expo-router` vía `query-string`/`decode-uri-component`) — nunca corren en
el bundle final de la app, solo en el toolchain de desarrollo. La única
corrección que ofrece `npm audit fix --force` exige downgradear
`expo-router` a `5.1.11` y `expo` a `46.0.21` — **incompatible con SDK 57**,
así que NO se aplicó (AGENTS.md sección 81: nunca `--force` a ciegas). Se
revisará de nuevo cuando Expo publique un SDK 57 con estas dependencias ya
actualizadas.

## 5. Gestión RH — plan de prueba

Requiere una cuenta con capacidad RH real en el backend (rol con
`rh.pendientes.ver`, ej. `rh_admin`/`rh_auxiliar`/`gerente_sucursal`).

1. Login con esa cuenta.
2. Si es la primera vez que esa cuenta entra con capacidad RH, debe
   aparecer el selector "¿Cómo quieres entrar hoy?" (`ExperienceSelectorPrimer`)
   — elegir "Gestión RH".
3. Confirmar que el tab bar cambia a Inicio / Pendientes / Colaboradores /
   Notificaciones / Perfil (`src/app/(app)/rh/(tabs)/`).
4. **Dashboard**: confirmar que `resumen`/`urgentes`/`recientes` cargan
   desde `GET /rh/dashboard` (pull-to-refresh, skeleton, estado vacío).
5. **Pendientes**: probar los 5 filtros (Todos/Solicitudes/Vacaciones/
   Documentos/Incorporaciones), el buscador (debounce 350ms) y el scroll
   infinito con una cuenta que tenga más de una página de pendientes.
6. **Detalle de solicitud**: abrir una, confirmar que solo aparecen los
   botones que trae `acciones_permitidas` (probar con una cuenta
   `rh_auxiliar`, que NO debe ver "Aprobar"/"Rechazar"). Probar Aprobar
   (confirmación), Rechazar y Solicitar corrección (motivo obligatorio,
   botón deshabilitado sin texto). Confirmar toast + que la lista/dashboard
   se actualizan solos.
7. **Doble tap**: en el detalle, tocar "Aprobar" dos veces rápido — debe
   quedar deshabilitado tras el primer tap (ver `disabled={pending}`).
8. **Conflicto de concurrencia**: aprobar la misma solicitud desde dos
   sesiones (dos dispositivos o un dispositivo + `curl`) — la segunda debe
   mostrar "Esta solicitud ya fue atendida..." y refrescar sola.
9. **Documentos**: abrir un documento, tocar "Ver documento" — confirmar
   que abre el visor seguro (`SecureDocumentViewer`), que el watermark
   (nombre RH + fecha/hora) es visible sin tapar el contenido, y que NO hay
   forma de compartir/descargar/guardar desde ahí. Cerrar y confirmar (con
   un explorador de archivos, en dev) que el temporal en `Paths.cache` se
   borró.
10. **Expedientes**: desde Colaboradores → un colaborador → "Ver
    expediente" → abrir un documento individual → probar aprobar/rechazar/
    autorizar cambio (solo visibles si el permiso real de Spatie lo trae,
    ver `hasPermission` en `src/utils/capabilities.ts`).
11. **Cambiar de experiencia**: Configuración → "Cambiar a Mi espacio" /
    "Cambiar a Gestión RH" — confirmar que NO pide login de nuevo y que el
    token sigue siendo el mismo.

## 6. QR de incorporación — plan de prueba end-to-end

Requiere Development Build (paso 2) y que RH haya generado una invitación
real desde el Portal RH (`/rh/incorporacion/invitaciones`).

1. Desde `login.tsx`, tocar "Escanear código QR".
2. Primer propio de cámara ("Necesitamos tu cámara... código QR...") antes
   del diálogo nativo — confirmar que aparece UNA vez.
3. Aceptar el diálogo nativo del sistema.
4. Apuntar al QR real generado por RH — debe vibrar (haptic) y navegar
   directo a `/incorporacion/qr/{token}` sin mostrar el token en ningún
   log completo (`maskTokenForLog`).
5. Probar la linterna (ícono de flash) en un lugar oscuro.
6. Probar "Cancelar" — regresa a login sin pedir nada.
7. Probar apuntar a un QR que NO es de MR. LANA (ej. una URL cualquiera) —
   debe mostrar un toast de error y permitir reintentar sin salir de la
   pantalla.
8. En la pantalla `/incorporacion/qr/{token}` (ya existente, sin cambios en
   esta pasada): completar el registro → confirmar login automático →
   entra directo a `/incorporacion`.
9. Subir un documento requerido, confirmar push/registro de token.
10. **QR inválido**: pedir a RH que revoque o deje vencer una invitación,
    escanearla — confirmar que se muestra el motivo exacto (vencido/
    revocado/usado/correo no coincide) con botones "Volver a escanear"/
    "Ir a inicio de sesión", nunca una pantalla rota.
11. `__DEV__` únicamente: usar "Pegar token QR" dentro del scanner para
    repetir 4-10 sin cámara real (acepta también un token pelado, sin URL,
    para pruebas rápidas).

### App Links / Universal Links (pendiente de verificación en backend)

`app.json` ya declara `associatedDomains` (iOS) e `intentFilters` (Android)
para `https://people.mr-lana.com/incorporacion/qr/*`, para que el mismo QR
abra la app directo si ya está instalada. **Esto requiere que el backend
publique los archivos de verificación** (`/.well-known/apple-app-site-
association` y `/.well-known/assetlinks.json`) — ver
`docs/BACKEND_GAPS_FINAL.md`. Sin esos archivos, el sistema operativo no
verifica el dominio y el link sigue abriendo el navegador en vez de la app
(comportamiento normal, no un bug de la app).

## 7. Cumpleaños — plan de prueba

Requiere una cuenta cuyo cumpleaños sea "hoy" en el backend (o cambiar la
fecha de nacimiento de una cuenta de prueba en el backend a la fecha de
hoy).

1. Login con esa cuenta — debe aparecer la celebración a pantalla completa
   automáticamente (una sola vez ese día — `useBirthdayAutoCelebration`).
2. Confirmar confetti sutil (desactivar con "Reducir movimiento" del
   sistema y confirmar que YA NO aparece confetti, pero el resto del
   contenido sigue igual).
3. Cerrar el modal, volver al Dashboard — debe seguir apareciendo el hero
   "¡Feliz cumpleaños, {nombre}!" con botón "Ver mi felicitación".
4. Cambiar de tab y volver al Dashboard — el modal NO debe reaparecer solo
   (ya se marcó como visto), pero el hero sigue.
5. Confirmar que la imagen de felicitación carga (skeleton mientras
   descarga, fallback si falla) y que nunca se muestra año de nacimiento ni
   edad.
6. Push `cumpleanos`: enviar un push de prueba con
   `{ "type": "cumpleanos" }` (Expo Push Tool o backend real) — debe abrir
   `/cumpleanos` directo.

## 8. Actualización de app — plan de prueba

Requiere que RH/backend publique una versión en `app/releases` con
`build_number` mayor al instalado (ver `docs/APP_RELEASES.md` de
capacitaciones).

1. Con una versión más nueva publicada y `minimum_required: false`: abrir
   la app — debe aparecer el banner inferior "Nueva versión disponible" con
   botón "Actualizar" (abre `download_url` en el navegador) y botón para
   cerrar (vuelve a aparecer el siguiente arranque).
2. Con `minimum_required: true` (u `app/config.force_update: true`): abrir
   la app — debe bloquear con pantalla completa "Necesitas actualizar..." y
   NUNCA dejar continuar sin actualizar.
3. `app/config.maintenance: true`: abrir la app (con o sin sesión) — debe
   bloquear con `MaintenanceScreen` usando el `message` real del backend si
   lo manda.
4. Sin ninguna versión publicada para la plataforma actual (`app/releases/
   latest` responde 404): confirmar que NO aparece ningún banner ni botón
   falso (AGENTS.md sección 42).

## 9. Push completo — plan de prueba

Repetir el plan de `docs/BUILD_AND_TEST_V4.md` sección 6-7 para los tipos
de colaborador (`solicitud`/`documento`/`vacaciones`/`incorporacion`/
`perfil`/`notificacion`/`cumpleanos`), y agregar:

1. Con la app en "Mi espacio", enviar un push `{"type":"rh_solicitud",
   "resource_id": N}` a una cuenta con capacidad RH — al tocarlo, la app
   debe cambiar sola a Gestión RH y abrir `/rh/solicitudes/N` directo (sin
   pedir login, sin quedarse en Mi espacio).
2. Viceversa: estando en Gestión RH, un push de tipo `solicitud` debe
   regresar a Mi espacio y abrir el detalle correspondiente.
3. `rh_pendiente` sin `resource_id`: debe abrir la bandeja de Pendientes,
   nunca truena por falta de id.
4. `rh_cumpleanos`: hoy no existe API móvil RH de cumpleaños dedicada — debe
   caer en Notificaciones RH, nunca en una pantalla rota.
5. Cold start: cerrar la app por completo (no solo a background), enviar un
   push y tocarlo desde la notificación del sistema — debe abrir la app
   directo en el recurso correcto (`getLastNotificationResponseAsync`, ver
   `useNotificationResponseRouting.ts`).

## 10. Biometría, screenshot/recording, offline, errores HTTP

Sin cambios de comportamiento respecto a `docs/BUILD_AND_TEST_V4.md`
secciones 9-12 — repetir ahí, además confirmando que la protección de
captura de pantalla también cubre la experiencia RH completa (AGENTS.md
sección 51: "especialmente fuerte en Gestión RH" — `useAppPrivacyProtection`
está montado en `(app)/_layout.tsx`, que envuelve tanto `(tabs)` como `rh`).

## 11. Pruebas unitarias (`npm test`)

```bash
npm test
```

53 pruebas en 8 suites, cubriendo (AGENTS.md sección 79):

- `parseIncorporacionQr` — acepta solo los 3 formatos reales, rechaza host/
  scheme/token inválido.
- `compareVersionStrings`/`evaluateUpdate`/`isBelowMinimumVersion` — compara
  por segmento numérico, nunca como string; nunca bloquea sin URL válida.
- `resolveResourceRoute`/`experienceForPushType` — mapeo completo de los 13
  tipos de push (colaborador + RH).
- `canUseRhExperience`/`hasPermission` — capacidades y permisos reales,
  nunca por nombre de rol.
- `hasAction`/`canApprove`/`canReject`/`canRequestCorrection`/
  `canAuthorizeChange` — lectura exacta de `acciones_permitidas`.
- `mapWorkflowToSteps` — traducción de `workflow` real a pasos visuales,
  incluyendo flujos de más de una etapa.
- `birthdaySeenStorageKey` — clave de persistencia del modal de cumpleaños.
- `rhPendienteDetailRoute` — navegación de la bandeja unificada a cada tipo
  de detalle.

## 12. Qué NO se pudo probar en este entorno

Esta sesión corrió en un contenedor de desarrollo sin dispositivo físico ni
sesión interactiva de EAS/cámara real. Quedó preparado y documentado paso a
paso arriba, pero NO ejecutado en hardware real:

- Build real con `eas build --profile development` (requiere `eas-cli
  login` interactivo) y su instalación en un dispositivo físico.
- Lectura de QR con cámara real (solo se validó `parseIncorporacionQr` por
  unit test — la integración con `expo-camera`/`CameraView` no se pudo
  correr en un simulador de cámara).
- Renderizado real del visor de PDF (`react-native-webview`) en Android —
  ver limitación conocida en `docs/BACKEND_GAPS_FINAL.md`.
- Push de extremo a extremo, biometría en hardware, bloqueo de screenshot
  visual, App Links reales (dependen de que el backend publique los
  archivos de verificación de dominio).
- `tsc`, `lint`, `expo-doctor`, `expo export --platform android` y
  `npm test` SÍ se ejecutaron en este entorno y pasaron limpios (secciones
  4 y 11).
