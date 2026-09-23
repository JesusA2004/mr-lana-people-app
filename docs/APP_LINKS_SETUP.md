# App Links (Android) y Universal Links (iOS)

**Estado: ESPERANDO CREDENCIALES REALES.** La app ya declara todo lo suyo;
falta que el backend publique dos archivos de verificación con datos que
**no se pueden inventar**: la huella SHA-256 de la firma de Android (keystore
de EAS) y el Apple Team ID.

Mientras tanto, los *custom schemes* siguen funcionando igual:
`mrlanapeopleapp://…` y el legado `mrlanapeople://…`.

## Lo que ya está en la app (`app.json`)

- Android: `intentFilters` con `autoVerify: true` para
  `https://people.mr-lana.com/incorporacion/qr/*`.
- iOS: `associatedDomains: ["applinks:people.mr-lana.com"]`.
- Paquete / bundle: `com.mrlana.people`.

## 1. Obtener el SHA-256 de Android (keystore de EAS)

```bash
npx eas-cli login
npx eas-cli credentials --platform android
# → elige el perfil (production) → "Keystore: Manage everything needed to build your project"
#   → muestra "SHA256 Fingerprint". Cópialo tal cual (AA:BB:CC:…).
```

Si además se publica en Google Play con *Play App Signing*, agrega también
la huella de **Play Console → Configuración → Integridad de la app → Firma
de apps** (es otra llave).

## 2. Obtener el Apple Team ID

- developer.apple.com → Account → **Membership details → Team ID**
  (10 caracteres, p. ej. `AB12CD34EF`), o
- `npx eas-cli credentials --platform ios` lo muestra en el resumen.

## 3. Archivos que publica el backend (capacitaciones)

Ruta: `public/.well-known/` — servidos con `Content-Type: application/json`,
**sin redirección**, por HTTPS.

`public/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.mrlana.people",
      "sha256_cert_fingerprints": ["<SHA256_DE_EAS>"]
    }
  }
]
```

`public/.well-known/apple-app-site-association` (sin extensión)

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["<TEAM_ID>.com.mrlana.people"],
        "components": [{ "/": "/incorporacion/qr/*" }]
      }
    ]
  }
}
```

## 4. Verificar

```bash
curl -i https://people.mr-lana.com/.well-known/assetlinks.json
curl -i https://people.mr-lana.com/.well-known/apple-app-site-association
# Android, con el APK instalado:
adb shell pm get-app-links com.mrlana.people      # debe decir "verified"
adb shell am start -a android.intent.action.VIEW -d "https://people.mr-lana.com/incorporacion/qr/PRUEBA"
```

En Android la verificación ocurre al instalar: tras publicar los archivos,
reinstala el APK (o `adb shell pm verify-app-links --re-verify com.mrlana.people`).
