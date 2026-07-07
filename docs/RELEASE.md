# Release Checklist — CalorieLog

This document is the authoritative pre-release checklist for every CalorieLog
release. Work through it top-to-bottom before uploading any build to Google Play
or App Store Connect.

Items marked **Manual** cannot be automated by the coding agent and must be
completed by a human in the relevant console.

---

## 1 — Code Readiness

### 1.1 Static checks

Run these in the repo root. All must exit 0.

```bash
pnpm typecheck      # tsc --noEmit across all workspaces
pnpm lint           # eslint across all workspaces
pnpm test           # vitest — unit + integration tests
```

### 1.2 Migration check

- No pending Drizzle migration files in `packages/db/drizzle/` that have not
  been applied to the production database.
- Confirm by comparing `_journal.json` against the Neon schema version.

### 1.3 Environment variables

API (Vercel):
- [ ] `DATABASE_URL` — pooled Neon connection string
- [ ] `DATABASE_URL_UNPOOLED` — direct Neon connection (migrations only)
- [ ] `CLERK_SECRET_KEY` — Clerk secret
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- [ ] `API_ENV=production`
- [ ] `FOOD_DATA_PROVIDER` — `open_food_facts` or `disabled`

Mobile (EAS Secrets / `.env.production`):
- [ ] `EXPO_PUBLIC_API_BASE_URL` — production Vercel URL (no trailing slash)
- [ ] `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- [ ] `EXPO_PUBLIC_ERROR_REPORTING_DSN` — Sentry DSN (optional; leave blank to disable)

### 1.4 app.json / app config

- [ ] `version` matches the Play Store / App Store version string.
- [ ] `android.package` is set to the final package name (not `com.yourname.calorielog`).
- [ ] `ios.bundleIdentifier` matches App Store Connect.
- [ ] `android.versionCode` is incremented from the previous production build.
- [ ] `ios.buildNumber` is incremented from the previous production build.

---

## 2 — EAS Build

See `docs/EAS_BUILDS.md` for detailed build commands.

### 2.1 Preview build (closed beta)

```bash
cd apps/mobile
npx eas-cli build --profile preview --platform android
```

- Download the `.apk` link from the EAS build dashboard.
- Install on a physical Android device and run the test checklist (Section 4).

### 2.2 Production build

```bash
npx eas-cli build --profile production --platform android
npx eas-cli build --profile production --platform ios
```

Do not submit until all test checklists pass.

---

## 3 — Manual Store-Console Tasks

> These steps require human access to Google Play Console and Apple App Store
> Connect. The coding agent cannot perform them.

### 3.1 Google Play — Closed Testing setup **[Manual]**

1. **Create a closed testing track** in Play Console → Testing → Closed testing → Create track.
2. **Upload the AAB** produced by `eas build --profile production --platform android`.
3. **Fill in the Release notes** (What's new in this version). Keep them factual and calm — no promotional language.
4. **Add testers** via the Testers tab: upload a CSV of Gmail addresses or invite by email.
5. **Submit for review**. Internal testing tracks do not require review; closed testing tracks do (typically 1–3 days).
6. Share the **opt-in URL** from Play Console → Testing → Closed testing → [your track] with testers.

### 3.2 Google Play — Store listing requirements **[Manual]**

Before the first public release (not required for closed beta):
- [ ] App icon (512 × 512 PNG, no transparency)
- [ ] Feature graphic (1024 × 500 PNG)
- [ ] At least 2 screenshots per supported screen size
- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)
- [ ] Privacy policy URL
- [ ] Content rating questionnaire completed (target: Everyone)
- [ ] Data safety form completed (see Section 5)

### 3.3 Apple App Store Connect — TestFlight setup **[Manual]**

1. Create the app in App Store Connect → Apps → +.
2. Upload the IPA from EAS (`eas build --profile production --platform ios`).
3. Add internal testers (up to 100 accounts with TestFlight access).
4. Add external testers via External Testing → + Group.
5. External testing requires Apple review (typically 1–3 days).

---

## 4 — Manual Test Checklists

### 4.1 Android emulator checklist

Run on a Pixel 8 emulator, API 35, `x86_64`.

| # | Test | Expected | Pass? |
|---|------|----------|-------|
| E-01 | App launches to Today screen | No crash, loads user data | ☐ |
| E-02 | Sign in with existing account | Reaches Today screen | ☐ |
| E-03 | Sign up with new account | Reaches Today screen, data is empty | ☐ |
| E-04 | Log a food manually (Today → Add food → Manual entry) | Entry appears in Today's list with correct macros | ☐ |
| E-05 | Edit an existing entry | Entry updates in list | ☐ |
| E-06 | Delete an entry | Entry removed from list | ☐ |
| E-07 | View History — navigate to yesterday | Yesterday's entries are shown | ☐ |
| E-08 | Set nutrition goals | Goals saved and reflected in progress bar | ☐ |
| E-09 | Insights tab — 3+ logged days | Weekly averages displayed | ☐ |
| E-10 | Insights tab — fewer than 3 logged days | Empty state message shown | ☐ |
| E-11 | Rotate device to landscape | Layout does not break | ☐ |
| E-12 | Dark mode (system setting → dark) | All screens readable, no white-on-white text | ☐ |
| E-13 | Airplane mode — log a food | Entry queued offline, sync on reconnect | ☐ |
| E-14 | Settings → Export your data | Share sheet opens with JSON | ☐ |
| E-15 | Settings → Delete account (cancel) | Account not deleted | ☐ |
| E-16 | Android back button on each screen | Navigates back without crash | ☐ |
| E-17 | Keyboard — text field on Goals screen | Keyboard does not cover the form | ☐ |

### 4.2 Android physical device checklist

Run on a physical Android device (API 28+) with the preview APK installed.

| # | Test | Expected | Pass? |
|---|------|----------|-------|
| P-01 | Install preview APK via adb or QR link | Installs without errors | ☐ |
| P-02 | Launch app on first install | Onboarding / sign-in screen appears | ☐ |
| P-03 | Camera permission — first grant | System dialog appears; after Allow, scanner opens | ☐ |
| P-04 | Barcode scan — EAN-13 | Scan succeeds, navigates to food review | ☐ |
| P-05 | Barcode scan — deny camera permission | "Camera access needed" screen, re-prompt on tap | ☐ |
| P-06 | Barcode scan — permanently denied | "Open settings" button visible, navigates to app settings | ☐ |
| P-07 | Touch targets on small screen (5″) | All tappable elements at least 44 dp tall | ☐ |
| P-08 | Font scale at 130% (accessibility) | Text does not clip or overlap | ☐ |
| P-09 | Safe area insets on devices with notch/punch-hole | Content not obscured | ☐ |
| P-10 | Network loss mid-sync | Sync indicator shows failed state; retry succeeds | ☐ |
| P-11 | Dark mode toggle | All text remains legible | ☐ |
| P-12 | Sign out and sign back in | Data reloads correctly | ☐ |

### 4.3 iOS simulator checklist

Run on iPhone 16 simulator, iOS 18.

| # | Test | Expected | Pass? |
|---|------|----------|-------|
| I-01 | App launches to Today screen | No crash | ☐ |
| I-02 | Sign in | Works identically to Android | ☐ |
| I-03 | Log a food manually | Entry appears, macros correct | ☐ |
| I-04 | Navigation — swipe back gesture | Navigates back on all push screens | ☐ |
| I-05 | Safe area — iPhone with Dynamic Island | Header not obscured | ☐ |
| I-06 | Dark mode | All screens legible | ☐ |
| I-07 | Keyboard handling on Goals screen | Form scrolls when keyboard appears | ☐ |
| I-08 | Settings → Export your data | iOS share sheet opens | ☐ |
| I-09 | Settings → Delete account — confirm | Account deleted, redirected to sign-in | ☐ |
| I-10 | Insights tab with data | Weekly summary displayed | ☐ |

---

## 5 — Data Safety & Privacy

### 5.1 Google Play Data Safety form **[Manual]**

Complete the Data safety form in Play Console → App content → Data safety.

| Category | What CalorieLog collects | Shared with third parties? |
|----------|--------------------------|---------------------------|
| Personal info — Name | No | No |
| Personal info — Email | Yes (Clerk auth) | No (Clerk is the processor) |
| App activity — In-app actions | Event names only (no food data) | No |
| Health and fitness | No | No |
| Food and drink | No — food names are stored server-side but not shared | No |

**Answers for the form:**
- "Does your app collect or share any of the required user data types?" → Yes (email for auth)
- "Is all of the user data collected by your app encrypted in transit?" → Yes
- "Do you provide a way for users to request that their data is deleted?" → Yes (in-app account deletion)

### 5.2 Privacy policy

A privacy policy URL is required for both stores before any external testing.
The policy must describe:
- What data is collected (email, food log entries, nutrition targets)
- Where it is stored (Neon Postgres via Vercel)
- How users can delete their data (in-app delete account)
- That CalorieLog does not sell data or share it with advertisers

---

## 6 — Accessibility Audit

Before each release, verify:

- [ ] All interactive elements have `accessibilityLabel` or `accessibilityRole`.
- [ ] Color contrast ≥ 4.5:1 for normal text (use Colour Contrast Analyser).
- [ ] Screen reader (TalkBack on Android, VoiceOver on iOS) can navigate Today screen.
- [ ] No information conveyed by color alone (e.g. progress bar has text label).
- [ ] Loading states announce themselves to screen readers (`accessibilityLiveRegion`).

---

## 7 — Timezone & Midnight Behavior

- [ ] Test logging at 11:55 PM: entry appears on the correct local date.
- [ ] Test in a secondary timezone (change device timezone to UTC+9 or UTC-8).
- [ ] Confirm that History shows the date matching the device's clock at log time.
- [ ] Confirm that Insights window aligns to the device's local date, not UTC.

---

## 8 — Post-Release Verification

After a production release is live:

- [ ] `GET /api/health` returns `{ "status": "ok" }` from the production URL.
- [ ] A new user can sign up, log a food, and sign out.
- [ ] A returning user can sign in and see their data.
- [ ] The export endpoint returns valid JSON with correct data.
- [ ] Monitor Vercel function logs for unexpected errors in the first 24 hours.

---

## 9 — Hotfix Process

For critical bugs found after release:

1. Fix on a branch off `main`.
2. Run the full checklist (Sections 1–3 minimum).
3. Increment `versionCode` (Android) and `buildNumber` (iOS).
4. Build with `--profile production`.
5. Upload directly to the closed testing track; do not use preview.
6. After tester confirmation, promote to production track in Play Console.

---

## Appendix — Things the Coding Agent Cannot Do

The following tasks require human access to external consoles and are outside
what a coding agent can automate:

| Task | Console |
|------|---------|
| Create Google Play application | Play Console |
| Complete Play Store listing (screenshots, description, icon) | Play Console |
| Fill in Data safety form | Play Console |
| Create closed testing track and add testers | Play Console |
| Upload AAB to Play Console | Play Console |
| Complete content rating questionnaire | Play Console |
| Create App Store Connect application | App Store Connect |
| Set up App Store Connect TestFlight groups | App Store Connect |
| Purchase or configure Apple Developer Account | developer.apple.com |
| Set Vercel environment variables | Vercel dashboard |
| Add Clerk social login providers | Clerk dashboard |
| Configure a privacy policy URL | Any web host |
| Set up a Sentry project and copy its DSN | sentry.io |
