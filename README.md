# hotdogdot

hotdogdot is a responsive music player built with React 19, Vite, Tauri 2, and Lavalink 4. It runs as a desktop app, an Android app through Tauri, and an installable PWA.

## Requirements

- Node.js 18+
- Rust stable
- Docker Desktop for the local Lavalink node
- Android Studio, Android SDK, and the Tauri mobile prerequisites for Android builds

## Environment

Copy `.env.example` to `.env` and set only the values you use:

```dotenv
RENDER_API_KEY=
RENDER_SERVICE_ID=
DISCORD_CLIENT_ID=
LAVALINK_SERVER_PASSWORD=change-me
```

`RENDER_API_KEY` is consumed only by `scripts/render-service.ps1`. It is never included in the frontend bundle. `DISCORD_CLIENT_ID` is the public Application ID from the Discord Developer Portal and is compiled into the native desktop integration.

For Discord Rich Presence, create a Discord Application, add a Rich Presence art asset named `hotdogdot`, place its Application ID in `.env`, and restart the Tauri build.

## Development

```powershell
npm install
docker compose up -d
npm run tauri dev
```

Web/PWA development:

```powershell
npm run dev
```

## Verification and production builds

```powershell
npm run lint
npm run typecheck
npm run build
npm run tauri build
```

The production web output in `dist/` contains the PWA manifest and service worker.

## Android

Initialize the Android project once, then build:

```powershell
npm run android:init
npm run android:dev
npm run android:build
```

Tauri uses the existing app icons in `src-tauri/icons/android`. The responsive UI includes touch targets, safe-area padding, mobile navigation, and modal sizing for phone screens.

## Lavalink

The bundled node listens on `localhost:2333` with the local development password `hotdogdot-local-lavalink`:

```powershell
docker compose up -d
Invoke-RestMethod -Headers @{ Authorization = 'hotdogdot-local-lavalink' } http://localhost:2333/version
```

For Render, `render.yaml` and `Dockerfile` define the Lavalink web service. Set `LAVALINK_SERVER_PASSWORD` as a secret in Render. Server-side Render API operations are available through:

```powershell
npm run render:status
npm run render:deploy
```

## License

MIT © 2026 hotdogdot. Dependency and open-source notices remain governed by their respective licenses.
