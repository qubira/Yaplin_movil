# EAS Update + EAS Build (distribución interna)

Configurado en este commit, sin publicar nada todavía:

- `app.json` → `runtimeVersion.policy = "fingerprint"`: la versión de runtime se
  recalcula automáticamente a partir del código nativo. Si haces un cambio
  nativo (nueva librería, permiso, plugin) sin volver a compilar, un build
  viejo simplemente no verá esos updates — quedan aislados por diseño, no hay
  forma de que un update incompatible llegue a un build antiguo.
- `expo-updates` instalado como dependencia (es la librería que revisa e
  instala los updates dentro de la app).
- `eas.json` con dos perfiles de build, **ambos con distribución interna**
  (instalación directa por link/QR, sin tienda):
  - `preview` → canal `preview`
  - `production` → canal `production`
- `.github/workflows/eas-update-preview.yml` → al hacer push a `main`,
  publica automáticamente un update OTA al canal **preview**.
- `.github/workflows/eas-update-production.yml` → **solo manual**
  (`workflow_dispatch` desde la pestaña Actions) y además apunta al GitHub
  Environment `production`, así que si configuras revisores obligatorios ahí
  (ver paso 4), el flujo se queda pausado pidiendo aprobación antes de
  publicar. Dos capas: alguien tiene que dispararlo a mano, y alguien tiene
  que aprobarlo.

## Lo que falta — pasos únicos que debes hacer tú (necesito tu cuenta de Expo)

No tengo login de Expo ni tu proyecto vinculado, así que esto no lo puedo
hacer yo:

1. **Login y vincular el proyecto**
   ```sh
   npx eas-cli login
   npx eas-cli update:configure
   ```
   Esto crea el proyecto en tu cuenta de Expo y completa `updates.url` y
   `extra.eas.projectId` en `app.json` (lo dejé sin tocar a propósito, para
   no inventar un projectId falso).

2. **Token para GitHub Actions**
   - Genera uno en https://expo.dev/settings/access-tokens
   - Repo → Settings → Secrets and variables → Actions → agrega el secret
     `EXPO_TOKEN` con ese valor.

3. **(Solo si vas a probar en iPhone)** registrar el dispositivo para
   distribución interna:
   ```sh
   npx eas-cli device:create
   ```
   Android no lo necesita — el `.apk` se instala directo.

4. **Aprobación manual para producción**
   - Repo → Settings → Environments → New environment → nómbralo
     `production` → activa "Required reviewers" y agrégate a ti mismo (o a
     quien deba aprobar). Sin este paso, el workflow de producción igual
     exige que alguien lo dispare a mano, pero no pedirá aprobación extra.

## Cómo se prueba (primera vez, en un celular real)

```sh
# build instalable por QR/link, distribución interna
npx eas-cli build --profile preview --platform android
```

Al terminar, la CLI (o expo.dev) te da un link/QR — lo abres desde el
celular y se instala como una app normal, sin tienda. Ese es el momento en
que "sale de mi máquina": recién ahí conviene decidir si generas también un
build de iOS.

Después de tener ese build instalado, cualquier `eas update --channel
preview ...` (manual o vía el workflow, con solo hacer push a `main`) lo
actualiza solo, sin reinstalar nada — siempre que el cambio no sea nativo
(si lo es, hay que repetir el build).

## Qué NO hice todavía (a propósito)

- No corrí `eas login`, `eas init`, `eas build` ni `eas update` — nada se
  publicó ni se compiló para clientes reales.
- No cambié `distribution` de `production` a `"store"` — eso es para cuando
  decidan someter la app a Play Store / App Store, es un paso aparte.
