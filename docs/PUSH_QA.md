# QA de notificaciones push (APK preview)

Todo esto requiere **teléfono físico** con Google Play Services (Android) o
un iPhone con build de EAS. Expo Go y los emuladores no reciben push remoto.

## Preparación

1. Instala el APK del perfil `preview` (trae `EXPO_PUBLIC_SHOW_DEV_TOOLS=true`).
2. Inicia sesión con la cuenta A.
3. Acepta el permiso de notificaciones (primer aviso de la app → diálogo del sistema).
4. **Configuración → Herramientas QA → Diagnóstico Push**. Debe mostrar:
   - Push remoto disponible: **Sí** · Dispositivo físico: **Sí**
   - Permiso: **Granted**
   - Project ID EAS: `f490fbd6-…`
   - Expo Push Token enmascarado + "Último registro" con hora de hoy.
   - Si no: "Volver a registrar" y revisa "Último error".

## Casos

| # | Paso | Esperado |
|---|---|---|
| 1 | Diagnóstico → **Enviar push de prueba** con la app abierta | Toast "Notificación de prueba enviada". Llega un **toast interno** con "Ver" (sin banner del sistema ni sonido). "Último push" = `push_test`, origen `foreground`. |
| 2 | Envía la prueba y manda la app a segundo plano (Home) | Banner del sistema. Al tocarlo abre Diagnóstico Push; origen `response`. |
| 3 | Envía la prueba y **cierra** la app (quitarla de recientes) | Al tocar la notificación la app arranca (cold start) y abre Diagnóstico Push. |
| 4 | Desde el Portal, aprueba una solicitud de la cuenta A | Push `solicitud` → abre el detalle exacto de esa solicitud. |
| 5 | Cuenta con Gestión RH: crea una solicitud que requiera RH | Push `rh_solicitud` → cambia a **Gestión RH** y abre el detalle. Probar también con la app cerrada. |
| 6 | RH abre un **muro de cumpleaños** | Push `cumpleanos_muro` a todos → abre el muro (no cambia de experiencia). |
| 7 | Cierra sesión con la cuenta A | El token se revoca (si no hay red, el logout ocurre igual). |
| 8 | Inicia sesión con la cuenta B en el mismo teléfono | Diagnóstico muestra el token registrado para B. |
| 9 | Toca una notificación vieja de la cuenta A que quedó en la bandeja | **No** abre el recurso de A: cae en Notificaciones. |
| 10 | Ajustes del sistema → desactiva notificaciones → vuelve a la app | Configuración muestra "Desactivadas" + botón "Abrir ajustes". |

## Logs con ADB

```bash
adb logcat -c
# reproduce el caso en el teléfono…
adb logcat -d -v time > mrlana-people-log.txt

# Filtros útiles
adb logcat -v time | grep -iE "ReactNativeJS|expo-notifications|ExpoPush|FirebaseMessaging|FCM"
adb logcat -v time ReactNativeJS:V *:S
adb shell dumpsys notification --noredact | grep -A3 com.mrlana.people
```

`mrlana-people-log.txt` está en `.gitignore`: nunca lo subas (puede traer tokens).

## Backend

- `POST /api/v1/dispositivos/push-prueba` solo envía a los dispositivos de la
  propia cuenta; en producción requiere `EXPO_PUSH_PRUEBA=true` o
  `app_releases.publicar`.
- Los envíos son jobs (`SendExpoPushJob`): el worker de colas debe estar
  corriendo (`php artisan queue:work`).
