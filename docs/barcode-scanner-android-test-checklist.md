# Barcode Scanner — Android Physical Device Test Checklist

> **Scope:** Capability spike only. No food lookup or logging is wired up yet.
> All tests must be run on a **physical Android device** (not an emulator).
> Emulators cannot access real camera hardware and will always trigger the
> Camera Unavailable state.

---

## Prerequisites

- Physical Android device (API 26+ / Android 8.0+)
- Development build installed via `expo run:android` or EAS Build
- Device has a working rear camera
- Test food packages with the following barcode formats on hand:
  - EAN-13 (most packaged foods worldwide)
  - UPC-A (North American grocery products)

---

## Test Cases

### TC-01 — First permission grant

**Setup:** App freshly installed, no camera permission granted.

**Steps:**
1. Open the app.
2. Tap **Add Food** on the Today screen.
3. Tap **Scan barcode**.

**Expected:**
- System camera permission dialog appears automatically.
- Dialog text includes "CalorieLog uses the camera to scan barcodes on food packages."
- Tap **Allow** (or **While using the app**).
- Camera viewfinder appears immediately with corner-mark overlay.

---

### TC-02 — First permission denial

**Setup:** App freshly installed, no camera permission granted.

**Steps:**
1. Tap **Add Food** → **Scan barcode**.
2. When the system dialog appears, tap **Deny**.

**Expected:**
- Screen shows "Camera access needed" with an **Allow camera access** button.
- Tapping **Allow camera access** re-shows the system dialog.

---

### TC-03 — Permanent permission denial (Open Settings flow)

**Setup:** Camera permission has been denied at least once on this device.

**Steps:**
1. Go to **Device Settings → Apps → CalorieLog → Permissions**.
2. Set **Camera** to **Deny** (or select **Don't ask again** if still prompted).
3. Open the app → **Add Food** → **Scan barcode**.

**Expected:**
- Screen shows "Camera access denied" with an **Open settings** button.
- Tapping **Open settings** opens the CalorieLog app settings page on the device.
- No "Allow camera access" button is shown.

---

### TC-04 — Successful barcode scan (EAN-13)

**Setup:** Camera permission granted. Have an EAN-13 barcode ready.

**Steps:**
1. Open **Add Food** → **Scan barcode**.
2. Point the camera at an EAN-13 barcode on a food package.

**Expected:**
- Scanner locks immediately after one successful decode (no repeated navigation or state changes).
- Screen transitions to "Barcode scanned" confirmation view.
- Raw 13-digit barcode value is displayed prominently and is selectable.
- Format reads "ean13" (or the actual format detected).
- Scan state is stable — the screen does **not** flash or re-render repeatedly.

---

### TC-05 — Scan duplicate lock

**Setup:** TC-04 is in progress (camera viewing a barcode).

**Steps:**
1. Hold the barcode in frame for 2–3 seconds before or after the first decode.

**Expected:**
- The confirmation screen is shown exactly once.
- In dev builds: the scan event log shows multiple callbacks but only the first is marked "✓ accepted"; subsequent ones are "× dropped".

---

### TC-06 — Torch toggle

**Setup:** Camera viewfinder is active. Test in a dim environment.

**Steps:**
1. Tap the **torch (flashlight)** button in the top-right corner.

**Expected:**
- Rear camera torch turns on.
- Torch button background changes to yellow.
- Tapping again turns the torch off and restores button appearance.
- Torch state resets to off when leaving and re-entering the scanner screen.

---

### TC-07 — Camera deactivation on navigate away

**Setup:** Camera viewfinder is active.

**Steps:**
1. While the scanner viewfinder is showing, tap the **close (×)** button.
2. Observe the device camera indicator light (if present) or check the Recent
   Apps screen to confirm the camera is no longer in use.

**Expected:**
- Navigation returns to the Add Food screen.
- Camera is fully released (no other app should report "camera in use" error).
- Returning to the scanner opens a fresh camera session (TC-04 still works).

---

### TC-08 — Re-entering scanner resets state

**Setup:** A scan has been completed (confirmation screen is showing).

**Steps:**
1. Tap the back/close button to leave the scanner.
2. Re-open **Add Food** → **Scan barcode**.

**Expected:**
- Camera viewfinder appears (not the confirmation screen).
- Scan log is empty.
- A new barcode can be scanned normally.

---

### TC-09 — Scan again from confirmation screen

**Setup:** Confirmation screen is showing after a successful scan.

**Steps:**
1. Tap **Scan another barcode**.

**Expected:**
- Confirmation screen clears.
- Camera viewfinder becomes active again.
- A fresh scan can be performed.

---

### TC-10 — Camera unavailable (emulator or hardware failure)

**Setup:** Run on Android emulator (which has no real camera hardware).

**Steps:**
1. Open **Add Food** → **Scan barcode**.
2. Grant camera permission when prompted.

**Expected:**
- "Camera unavailable" screen appears.
- Error message: "The camera could not be started. Close other apps that may be using the camera and try again."
- No crash or blank screen.

> **Note:** This state is also triggered on physical devices if another app holds
> the camera exclusively. Close the competing app and re-open the scanner.

---

## Formats Covered

| Format  | Example product type       | Tested |
|---------|---------------------------|--------|
| EAN-13  | Most packaged EU/AU foods  | ☐      |
| EAN-8   | Small packaging            | ☐      |
| UPC-A   | North American grocery     | ☐      |
| UPC-E   | Small North American packs | ☐      |
| Code-128| Some pharmacy / bulk goods | ☐      |

---

## Known Limitations (Spike Scope)

- Scanning is not connected to food lookup or logging yet.
- Torch availability is not checked programmatically; it is always shown on
  back camera. On devices without a torch the button will have no effect.
- The scan log is only visible in **development builds** (`__DEV__ === true`).
- iOS has not been physically tested in this sprint.

---

## Sign-off

| Tester | Device | Android version | Date | Result |
|--------|--------|-----------------|------|--------|
|        |        |                 |      |        |
