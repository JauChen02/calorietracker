# EAS Builds — CalorieLog

This document covers all three EAS build profiles (development, preview,
production) for both Android and iOS. For local Android emulator testing
without EAS, see `docs/ANDROID_DEV_BUILD.md`.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `npm install -g pnpm` |
| EAS CLI | 12+ | `npm install -g eas-cli` |
| Expo account | — | [expo.dev](https://expo.dev) — free |

For iOS production builds only:
- Apple Developer Program membership (USD 99/year)
- Mac with Xcode 16+ for local iOS simulator testing

---

## One-time setup

### 1. Log in to EAS

```bash
npx eas-cli login
```

### 2. Link the project to your Expo account

```bash
cd apps/mobile
npx eas-cli project:init
```

This creates a project on expo.dev and writes the `extra.eas.projectId` field
into `app.json`. Commit that change.

### 3. Set EAS Secrets for production

Environment variables that must not appear in source control can be stored as
EAS Secrets:

```bash
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL \
  --value "https://your-project.vercel.app"

npx eas-cli secret:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY \
  --value "pk_live_..."

# Optional — leave blank to disable error reporting
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ERROR_REPORTING_DSN \
  --value "https://...@sentry.io/..."
```

For the preview profile, set the correct production API URL so preview testers
hit the live backend.

---

## Build profiles

The three profiles in `apps/mobile/eas.json` map to the following use-cases:

| Profile | Who uses it | Distribution | Android output | iOS output |
|---------|-------------|--------------|----------------|------------|
| `development` | Developers only | Internal | `.apk` (debug) | Simulator |
| `preview` | Internal testers / beta | Internal | `.apk` (release) | Ad-hoc IPA |
| `production` | Store submission | Store | `.aab` (App Bundle) | App Store IPA |

---

## Development build

A development build includes the Expo Dev Client, enabling debugging, fast
refresh, and native module testing.

```bash
cd apps/mobile

# Android
npx eas-cli build --profile development --platform android

# iOS (builds for simulator by default — see eas.json)
npx eas-cli build --profile development --platform ios
```

- The build runs on EAS cloud servers. When complete, EAS provides a download
  link for the `.apk`.
- Install on a device or emulator: `adb install path/to/app.apk`
- Start the dev server: `pnpm dev:mobile`
- The installed dev client connects to the running Metro server.

### Running on a local Android emulator without EAS

See `docs/ANDROID_DEV_BUILD.md` for the faster local build workflow that skips
EAS entirely.

---

## Preview build (for closed beta)

The preview profile produces a release-signed APK (Android) or ad-hoc IPA (iOS)
suitable for distributing to testers without going through the Play Store or
App Store.

```bash
cd apps/mobile

# Android — generates a downloadable .apk
npx eas-cli build --profile preview --platform android

# iOS — requires an Apple Developer account and registered device UDIDs
npx eas-cli build --profile preview --platform ios
```

### Distributing the Android preview APK

1. EAS emails a download link when the build completes.
2. Testers open the link on their Android device and install the APK.
   - They may need to enable "Install from unknown sources" the first time.
3. Alternatively, share the link from the EAS build dashboard.

### Distributing via Google Play Internal Testing (recommended for Android)

Upload the preview APK to Play Console → Testing → Internal testing. This
gives testers a managed install flow without sideloading.

> **Note:** Internal testing tracks do not require Google review and go live
> within minutes.

---

## Production build

The production profile builds an AAB (Android App Bundle) for the Play Store
and an IPA for the App Store.

```bash
cd apps/mobile

# Android — produces .aab for Play Store submission
npx eas-cli build --profile production --platform android

# iOS — produces .ipa for App Store Connect
npx eas-cli build --profile production --platform ios
```

### Submitting to Google Play

```bash
# Submit the most recent production Android build
npx eas-cli submit --profile production --platform android
```

Before submitting, set the service account JSON path in `eas.json` (the
`submit.production.android.serviceAccountKeyPath` field) or pass it with
`--service-account-key-path`.

See `docs/RELEASE.md` for the full release checklist including manual Play
Console steps.

### Submitting to App Store Connect

```bash
npx eas-cli submit --profile production --platform ios
```

Requires Apple Developer credentials configured via `eas-cli credentials`.

---

## Versioning

Before each release, update the following fields in `apps/mobile/app.json`:

| Field | Purpose |
|-------|---------|
| `version` | Human-readable version shown in stores (e.g. `"1.0.0"`) |
| `android.versionCode` | Integer, must increment on every Play Store upload |
| `ios.buildNumber` | String, must increment on every App Store upload |

There is no script to automate this — update manually and commit before building.

---

## Credentials management

EAS manages signing credentials automatically for most cases.

- **Android keystore**: Generated and stored by EAS on first build. Download a
  backup via `eas-cli credentials` and store it securely (losing the keystore
  means you cannot update the app on Play Store).
- **iOS distribution certificate and provisioning profile**: Managed by EAS via
  Apple's APIs. Requires an Apple Developer account.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `eas-cli: command not found` | `npm install -g eas-cli` |
| Build fails with "missing env var" | Set the variable in EAS Secrets or add to `eas.json` `env` block |
| Android APK installs but shows blank screen | Check Metro logs; usually a JS error at startup |
| iOS build fails "no matching provisioning profile" | Run `eas-cli credentials` to regenerate |
| `adb install` fails `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | `adb uninstall com.yourname.calorielog` first |
| Tester can't install preview APK | Enable "Install unknown apps" in Android Settings |
| Build queue is slow | Use `--local` flag for local builds (requires Android Studio / Xcode) |
