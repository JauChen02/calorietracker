# Android Development Build — CalorieLog

This document covers creating and running an Android development build locally.
It does **not** cover Play Store submission; see EAS docs for that.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Android Studio | Latest stable | Install via [developer.android.com/studio](https://developer.android.com/studio) |
| Android SDK | API 35 | Installed through Android Studio SDK Manager |
| JDK | 17 | Bundled with Android Studio; ensure `JAVA_HOME` is set |
| Node.js | 20+ | |
| pnpm | 9+ | |
| Expo CLI | Latest | `npm install -g expo-cli` (or `npx expo`) |
| EAS CLI | 12+ | `npm install -g eas-cli` (for cloud builds) |

---

## Option A — Local emulator (fastest iteration)

### 1. Start an Android Virtual Device (AVD)

1. Open **Android Studio → Virtual Device Manager** (Tools menu or the phone icon in the toolbar).
2. Create a device if none exists:
   - Hardware: **Pixel 8** (recommended)
   - System image: **API 35 (Android 15)**, `x86_64`
3. Click **▶ Play** to start the emulator and wait for it to fully boot.

### 2. Install workspace dependencies

```bash
pnpm install
```

### 3. Configure the mobile .env

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

Edit `apps/mobile/.env.local`:
```
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

> **Important:** Android emulator uses `10.0.2.2` to reach the host machine's `localhost`.
> Physical devices need the host machine's LAN IP (e.g. `http://192.168.x.x:3000`).

### 4. Start the API (separate terminal)

```bash
pnpm dev:api
```

### 5. Start the Expo development server

```bash
pnpm dev:mobile
```

Press **`a`** in the Expo CLI to open on the running Android emulator.

The app will load with Metro bundler hot-reload. Shake the device (or press `Ctrl+M` in the emulator) to open the Expo dev menu.

---

## Option B — Development build via EAS (cloud build)

Use this when you need native modules that Expo Go does not support (not required for the current shell).

### 1. Log in to Expo / EAS

```bash
npx eas-cli login
```

### 2. Configure your EAS project

```bash
cd apps/mobile
npx eas-cli build:configure
```

This creates a project on [expo.dev](https://expo.dev) and links your `app.json`.

### 3. Build the development APK

```bash
npx eas-cli build --profile development --platform android
```

- The build runs on EAS cloud servers.
- When complete, EAS provides a download link for the `.apk`.
- Install it on a physical device or emulator: `adb install path/to/app.apk`.

### 4. Start the dev server and connect

```bash
pnpm dev:mobile
```

The installed development build connects to the Metro server running on your machine. Scan the QR code or enter the server URL manually.

---

## Option C — Physical Android device (USB debugging)

### 1. Enable Developer Options on the device

1. Go to **Settings → About phone → Software information**.
2. Tap **Build number** 7 times until "Developer mode enabled" appears.
3. Go back to **Settings → Developer options**.
4. Enable **USB debugging**.

### 2. Connect via USB and verify ADB sees the device

```bash
adb devices
# Should list: <serial>  device
```

### 3. Start the API and dev server

```bash
pnpm dev:api
# In a separate terminal:
pnpm dev:mobile
```

### 4. Update .env for LAN access

In `apps/mobile/.env.local`, set `EXPO_PUBLIC_API_BASE_URL` to the host machine's local IP:
```
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000
```

Find your machine's IP: `ifconfig | grep "inet "` (macOS) or `ipconfig` (Windows).

Press **`a`** in Expo CLI or scan the QR code with the Expo Go app.

---

## Verifying the health check

Once the app is running:

1. Open **Settings** tab.
2. Tap **API Health Check** (visible only in development builds — the `__DEV__` flag shows it).
3. The screen fetches `GET /api/health` and shows:
   - API status (`ok` or `degraded`)
   - Database connectivity and latency
   - Environment and version

A green "Yes" for DB Connected confirms the full Neon → API → Mobile chain is working.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Could not reach API` | Check `EXPO_PUBLIC_API_BASE_URL` in `.env.local`. Use `10.0.2.2` for emulator, LAN IP for physical device. |
| Emulator shows network error | Ensure `pnpm dev:api` is running and the port is not blocked by a firewall. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` (adb install) | Uninstall the old build: `adb uninstall com.yourname.calorielog` |
| Metro stuck on "bundling" | Clear the cache: `expo start --clear` |
| Blank white screen on startup | Check Metro logs for a JavaScript error and fix the source. |
| Android emulator very slow | Enable hardware acceleration (Intel HAXM or Hyper-V) in AVD settings. |

---

## Notes on physical device testing

Physical device tests have **not been performed** for this build. All verification was done with the emulator or by reading code. Before shipping to internal testers:

1. Build the preview APK: `eas build --profile preview --platform android`
2. Install on a physical Android device (API 28+).
3. Verify touch targets, font scaling, and safe-area insets on a real screen.
4. Test dark mode by enabling it in Android system settings.
