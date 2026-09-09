# Build y pruebas — MR. LANA PEOPLE Mobile V4

## 0. Antes de empezar

```bash
npm install
```

`.env` ya debe existir con:
```
EXPO_PUBLIC_API_URL=https://people.mr-lana.com/api/v1
```

## 1. Correr en Expo Go (sin push remoto, todo lo demás funciona)

```bash
npx expo start --clear
```

Escanea el QR con Expo Go. Push remoto no está disponible aquí (limitación
del propio Expo Go en SDK 57) — la app lo detecta solo
(`src/utils/runtime.ts`, `supportsRemotePush`) y no intenta cargar
`expo-notifications` de forma que truene.

## 2. Development Build (necesario para push real, biometría, screen capture, app links)

### 2.1 Cuenta EAS

```bash
npx eas-cli login
```

Este proyecto **todavía no tiene un `projectId` de EAS** (confirmado: no
existe `extra.eas.projectId` en `app.json` ni `eas.json` previo a esta
iteración). Antes del primer build:

```bash
npx eas-cli init
```

Esto crea el proyecto en tu cuenta de Expo y agrega
`extra.eas.projectId` a `app.json` automáticamente — es el paso que faltaba
para que `Constants.expoConfig?.extra?.eas?.projectId` (usado en
`src/services/pushNotifications.ts` para pedir el Expo Push Token) tenga un
valor real.

### 2.2 Generar el Development Build (Android)

```bash
npx eas-cli build --platform android --profile development
```

Con el perfil `development` de `eas.json` (`developmentClient: true`,
`distribution: internal`, `buildType: apk`) obtienes un `.apk` instalable
directo en el teléfono (link o QR al terminar el build en la nube).

### 2.3 Instalar y correr

1. Instala el `.apk` en el Android físico (Samsung u otro).
2. En la laptop, con el teléfono en la misma red Wi-Fi:
   ```bash
   npx expo start --dev-client
   ```
3. Abre la app instalada — se conecta sola al Metro bundler.

## 3. Preview APK (para compartir sin cuenta de desarrollador)

```bash
npx eas-cli build --platform android --profile preview
```

Genera un `.apk` de `distribution: internal` (no requiere Development
Client ni Metro corriendo — la app queda embebida, lista para instalar y
usar tal cual, ideal para que alguien más la pruebe sin este entorno).

## 4. Production (cuando se decida publicar)

```bash
npx eas-cli build --platform android --profile production
```

Perfil `production` con `autoIncrement: true` (sube `versionCode`
automático en cada build) — listo aunque todavía no se suba a Play Store.

## 5. Validación estática (ejecutada en esta iteración)

```bash
npx tsc --noEmit      # 0 errores
npm run lint          # 0 errores/warnings
npx expo-doctor       # 21/21
npx expo export --platform android   # bundle .hbc, sin errores
```

## 6. Plan de prueba de push REAL (paso a paso)

Requiere: Development Build instalado (paso 2) + que backend ya tenga
implementado `docs/BACKEND_REQUIREMENTS_V4.md` P0.1-P0.3.

1. Generar el Development Build (`eas build --profile development`).
2. Instalar el `.apk` en el Samsung físico.
3. Login con una cuenta de colaborador real.
4. La app muestra el primer de permiso propio ("Recibe avisos
   importantes") 1.2s después de entrar — tocar "Activar notificaciones".
5. Aceptar el diálogo nativo del sistema operativo.
6. Confirmar en el backend (tabla `device_push_tokens`) que llegó un
   registro con el `token` de ese dispositivo — o, en DEV, usar la
   herramienta interna del paso 7 para ver el token localmente.
7. **Herramienta DEV-only para copiar el token** (nunca en producción, ver
   sección 8): agregar temporalmente un `console.log` o un botón visible
   solo con `if (__DEV__)` en `src/app/(app)/configuracion.tsx` que llame
   `Notifications.getExpoPushTokenAsync()` y muestre el resultado en
   pantalla para copiarlo a mano — no se dejó permanente en el código para
   no tentar a que sobreviva a un build de producción por accidente.
8. Provocar el evento en el backend (ej. aprobar una solicitud de ese
   colaborador desde el Portal RH).
9. Confirmar que llega la notificación push al teléfono (con la app en
   background o cerrada).
10. Tocar la notificación → confirmar que la app abre y navega directo al
    recurso (ej. el detalle de esa solicitud) — lógica en
    `src/hooks/useNotificationResponseRouting.ts` /
    `src/utils/appLinks.ts`.

## 7. Sin backend de push todavía: prueba manual con Expo Push Tool

Mientras P0.1-P0.3 no estén implementados, se puede probar la recepción/
navegación del lado app sin backend:

1. Repetir pasos 1-7 de la sección 6 para obtener un Expo Push Token real
   en DEV.
2. Ir a <https://expo.dev/notifications> (Expo Push Notification Tool).
3. Pegar el token, y en el campo de datos JSON:
   ```json
   { "type": "solicitud", "resource_id": 1 }
   ```
4. Enviar — confirmar que llega el push y que al tocarlo navega a
   `/solicitud/1` (ajustar el id a una solicitud real de la cuenta de
   prueba para ver contenido de verdad).

## 8. Importante: nunca exponer el token en producción

El helper de la sección 6.7 es exclusivamente para depuración local
(`if (__DEV__)`) — no debe quedar un botón o pantalla que exponga el Expo
Push Token en un build de producción, ni loggearlo completo en ningún
`console.log` fuera de ese bloque `__DEV__`.

## 9. Prueba de biometría

Requiere Development Build (Expo Go sí soporta `expo-local-authentication`,
pero para probar el flujo completo con auto-lock real es más representativo
en un build real).

1. En el emulador/dispositivo, registrar una huella o Face ID a nivel
   sistema operativo (Ajustes del teléfono) si no la tiene.
2. Login en la app.
3. Debería aparecer el primer de biometría ("¿Quieres usar tu huella…?")
   ~1.6s después de entrar — tocar "Activar" y confirmar con la huella
   real cuando lo pida (la app verifica que funciona ANTES de activarla).
4. Ir a Configuración → Seguridad y confirmar que el switch "Desbloqueo
   biométrico" quedó encendido y muestra el tipo correcto (Huella / Face
   ID / Biometría).
5. Mandar la app a segundo plano y esperar más de 5 minutos (o cambiar
   `AUTO_LOCK_MINUTES` en `src/constants/config.ts` a `0.1` temporalmente
   para probar más rápido — revertir después).
6. Volver a abrir la app — debe pedir biometría automáticamente
   (`LockScreen`); cancelar el prompt debe caer al formulario de
   contraseña sin dejar la app atorada.

## 10. Prueba de screenshot / screen recording

En Android físico (con Development Build o preview APK — Expo Go también
soporta `expo-screen-capture`):

1. Entrar a cualquier pantalla dentro de `(app)` (Dashboard, Expediente,
   etc.).
2. Intentar tomar un screenshot (botones físicos o desde Recientes) — debe
   fallar o mostrar pantalla negra/en blanco, según el fabricante.
3. Intentar grabar pantalla — debe bloquearse o mostrar contenido negro
   donde está la app.
4. Abrir el selector de apps recientes — el preview de MR. LANA PEOPLE NO
   debe mostrar contenido (Android: en blanco por `FLAG_SECURE`; iOS:
   blur por `enableAppSwitcherProtectionAsync`).
5. Ir a `login.tsx` (cerrar sesión primero) y repetir 2-4 — ahí SÍ debe
   poder capturarse (la protección solo cubre `(app)`, no el login).

## 11. Prueba offline

1. Activar modo avión con la app abierta en Dashboard.
2. Confirmar que aparece la barra "Sin conexión" en la parte superior.
3. Intentar refrescar (pull-to-refresh) — no debe tronar ni mostrar pantalla
   roja, debe fallar con mensaje amistoso.
4. Desactivar modo avión — confirmar que la barra desaparece y las
   pantallas se refrescan solas (React Query `onlineManager`, ver
   `src/api/queryClient.ts`).

## 12. Prueba de errores HTTP (sin dañar producción)

- `401`: dejar el token expirar o revocarlo manualmente desde otra sesión —
  confirmar que la app expulsa a login con el mensaje correcto.
- `422`: en Nueva Solicitud, dejar el campo motivo vacío y forzar el envío
  (debería bloquearse en cliente, pero si se prueba contra la API
  directamente con `curl` sin `motivo`, confirma el mensaje de validación).
- `503`: no hay forma segura de simular esto contra producción sin apagar
  el servidor real — se validó por código (client.ts intercepta cualquier
  503 y activa `MaintenanceScreen`), pendiente de confirmar en vivo si se
  llega a dar una ventana de mantenimiento real.

## 13. Qué NO se pudo probar en este entorno

Esta sesión corrió en un contenedor de desarrollo sin dispositivo Android
físico ni sesión interactiva de Expo/EAS. Lo siguiente quedó preparado en
código y documentado paso a paso arriba, pero no ejecutado:

- Build real con `eas build` (requiere `eas-cli login` interactivo).
- Push de extremo a extremo en dispositivo físico.
- Biometría en hardware real.
- Verificación visual de bloqueo de screenshot/recording en un Samsung
  físico.
- `expo-doctor`, `tsc`, `lint` y `expo export` SÍ se ejecutaron aquí y
  pasaron limpios (ver sección 5).
