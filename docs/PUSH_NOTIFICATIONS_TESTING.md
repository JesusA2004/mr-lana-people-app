# Cómo probar push notifications reales

## Por qué Expo Go no sirve para esto

Desde el SDK 53, **Expo Go dejó de soportar push notifications remotas** en
Android e iOS — solo permite notificaciones locales programadas desde la
propia app. `src/hooks/usePushRegistration.ts` detecta esto
(`Constants.appOwnership === 'expo'`) y se sale sin pedir permiso ni token,
dejando un log en consola en DEV. Esto **no es una limitación de esta app**:
es una limitación de Expo Go documentada por el equipo de Expo. Para probar
push real hace falta un **Development Build**.

## 1. Crear el Development Build

Requiere una cuenta de Expo/EAS (gratuita) y `eas-cli`:

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Esto crea/actualiza `eas.json` con un perfil `development`. Luego:

```bash
# Android (genera un .apk instalable directo en el dispositivo/emulador)
eas build --profile development --platform android

# iOS (requiere una cuenta de Apple Developer para firmar; en simulador no
# hace falta cuenta de pago, pero push remoto SOLO funciona en dispositivo físico)
eas build --profile development --platform ios
```

Instala el `.apk`/`.ipa` resultante en un dispositivo físico (recomendado:
los simuladores de iOS no reciben push remoto de Apple; los emuladores de
Android con Google Play Services normalmente sí).

## 2. Levantar el servidor de desarrollo apuntando al build

```bash
npx expo start --dev-client
```

Abre la app instalada (Development Build), no Expo Go — debe conectarse
sola al servidor Metro.

## 3. `projectId` de EAS

`usePushRegistration` usa
`Constants.expoConfig?.extra?.eas?.projectId` para pedir el Expo Push
Token. `eas build:configure` ya debería haber agregado ese `extra.eas.projectId`
a `app.json`/`app.config.js` — verifícalo antes de probar:

```bash
cat app.json | grep -A3 '"eas"'
```

Si falta, ejecuta `eas init` o agrégalo manualmente (`eas.projectId` en el
dashboard de expo.dev del proyecto).

## 4. Verificar que el token se registra

1. Inicia sesión en la app (Development Build).
2. Acepta el permiso de notificaciones cuando se solicite.
3. Revisa el log de Metro: `usePushRegistration` llama a
   `dispositivosApi.registerPushToken(...)` — hasta que el backend agregue
   `POST /api/v1/dispositivos/push-token` (ver
   `docs/MOBILE_BACKEND_REQUIREMENTS.md` P0.2), esa llamada devolverá 404 y
   se registrará con `logError`, sin romper la sesión. Una vez el backend
   tenga el endpoint, deberías ver la llamada en 200/201 y el token guardado
   en la tabla `device_push_tokens`.

## 5. Enviar un push de prueba manual (sin esperar al backend)

Mientras el backend no envíe push automáticamente, puedes probar la
recepción/tap en la app copiando el Expo Push Token que se logueó en Metro
y usando la herramienta de Expo:

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[XXXXXXXXXXXXXXXXXXXXXX]",
    "title": "Solicitud aprobada",
    "body": "Tu solicitud de permiso fue aprobada.",
    "data": { "tipo": "solicitud", "recurso_id": 42 }
  }'
```

- Con la app en **foreground**: debe aparecer un toast interno (ver
  `useNotificationResponseRouting`).
- Con la app en **background** y tocando la notificación del sistema: debe
  abrir la app y navegar a `/solicitud/42` (según `tipo`/`recurso_id` — ver
  el mismo hook para el mapeo completo).

## 6. Cuando el backend implemente el envío real

El payload `data` que debe mandar el backend (Service nuevo, ver
`docs/MOBILE_BACKEND_REQUIREMENTS.md` P0.1) tiene que respetar exactamente
`{ tipo, recurso_id }` — es el contrato que ya consume
`useNotificationResponseRouting`. Si el backend manda otra forma, esta app
no sabrá navegar (caerá al fallback de abrir el Centro de notificaciones).
