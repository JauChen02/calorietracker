/**
 * Barcode scanner — Android-first, iOS-compatible.
 *
 * Flow: camera → scan lock → barcode lookup API → food-review screen.
 * Non-numeric barcodes and API not-found responses offer a manual entry
 * fallback so the user is never dead-ended.
 *
 * See docs/barcode-scanner-android-test-checklist.md for manual device tests.
 */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
} from 'react';
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useBarcodeFood } from '@/features/food/useBarcodeFood';
import { catalogFoodQueryKey } from '@/features/food/useCatalogFood';
import { Ionicons } from '@expo/vector-icons';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type BarcodeType,
} from 'expo-camera';
import { useTheme } from '@/theme';

// ─── Barcode types ────────────────────────────────────────────────────────────
// Common numeric formats found on packaged food products. QR excluded: QR
// codes are rarely food barcodes and produce non-numeric data that fails
// lookup. The numeric check below (NUMERIC_BARCODE_RE) filters any remaining
// alphanumeric Code-39 / Code-128 values before calling the API.
const FOOD_BARCODE_TYPES: BarcodeType[] = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'itf14',
];

// Must match the server-side BarcodeSchema: /^\d{4,14}$/
const NUMERIC_BARCODE_RE = /^\d{4,14}$/;

// ─── Dev scan log ─────────────────────────────────────────────────────────────
type ScanLogEntry = {
  ts: string;
  type: string;
  data: string;
  /** false when the scan-once lock was already held and this event was dropped */
  accepted: boolean;
};

// ─── Camera error boundary ────────────────────────────────────────────────────
// Catches native errors thrown during CameraView mount (e.g. hardware unavailable,
// camera already in use). Calls onError so the parent can show a fallback screen.
type ErrorBoundaryProps = { onError: () => void; children: React.ReactNode };
type ErrorBoundaryState = { hasError: boolean };

class CameraErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function BarcodeScannerScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  // Camera active only while this screen is focused — prevents >1 preview.
  const [isFocused, setIsFocused] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [scanResult, setScanResult] = useState<BarcodeScanningResult | null>(null);
  const [cameraHardwareError, setCameraHardwareError] = useState(false);

  // Scan-once lock: prevents duplicate onBarcodeScanned callbacks from updating
  // state more than once after a successful scan.
  const hasScannedRef = useRef(false);

  // Track whether we've already triggered the system permission prompt, so
  // we don't call requestPermission() on every render.
  const permissionRequestedRef = useRef(false);

  // Developer-only scan event log — records ALL callbacks (accepted + dropped).
  const scanLog = useRef<ScanLogEntry[]>([]);

  // Prevents navigating to food-review twice if the food query resolves twice.
  const hasNavigatedRef = useRef(false);

  const queryClient = useQueryClient();

  // Pass the barcode to the lookup hook only when a numeric scan is locked.
  const barcodeForLookup =
    scanResult !== null && NUMERIC_BARCODE_RE.test(scanResult.data)
      ? scanResult.data
      : null;

  const { food, isLoading: lookupLoading, providerUnavailable, hardError, errorMessage } =
    useBarcodeFood(barcodeForLookup);

  // Navigate to food-review as soon as the product is found.
  useEffect(() => {
    if (!food || hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    queryClient.setQueryData(catalogFoodQueryKey(food.provider, food.providerFoodId), food);
    router.replace(
      `/today/food-review?provider=${encodeURIComponent(food.provider)}&providerFoodId=${encodeURIComponent(food.providerFoodId)}&source=barcode`,
    );
  }, [food, queryClient, router]);

  // ── Screen focus lifecycle ───────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      // Reset scan state when re-entering the screen.
      hasScannedRef.current = false;
      hasNavigatedRef.current = false;
      setScanResult(null);
      scanLog.current = [];
      return () => {
        // Deactivate camera and torch immediately when leaving.
        setIsFocused(false);
        setTorchOn(false);
      };
    }, []),
  );

  // ── Permission auto-request ──────────────────────────────────────────────
  // On first render after the permission status is known: prompt immediately
  // if the OS will show the dialog (canAskAgain). This avoids the user having
  // to tap an intermediate "Allow" button on first entry.
  useEffect(() => {
    if (
      permission !== null &&
      !permission.granted &&
      permission.canAskAgain &&
      !permissionRequestedRef.current
    ) {
      permissionRequestedRef.current = true;
      requestPermission();
    }
  }, [permission, requestPermission]);

  // ── Scan handler ─────────────────────────────────────────────────────────
  const handleBarcodeScan = useCallback((result: BarcodeScanningResult) => {
    // Record every callback in the dev log before the dedup check.
    if (__DEV__) {
      scanLog.current = [
        ...scanLog.current,
        {
          ts: new Date().toISOString(),
          type: result.type,
          data: result.data,
          accepted: !hasScannedRef.current,
        },
      ];
    }

    // Scan-once lock: ignore callbacks that fire after the first accepted scan.
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;

    setScanResult(result);
  }, []);

  const handleScanAgain = useCallback(() => {
    hasScannedRef.current = false;
    setScanResult(null);
    scanLog.current = [];
  }, []);

  const handleCameraError = useCallback(() => {
    setCameraHardwareError(true);
  }, []);

  // ── Render states ────────────────────────────────────────────────────────

  // 1. Permission status not yet determined (OS async check in progress)
  if (permission === null) {
    return (
      <>
        <Stack.Screen options={{ title: 'Scan Barcode', headerShown: false }} />
        <View style={[styles.centred, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.base }}>
            Checking camera permission…
          </Text>
        </View>
      </>
    );
  }

  // 2. Permission permanently denied — user must open system settings
  if (!permission.granted && !permission.canAskAgain) {
    return (
      <>
        <Stack.Screen options={{ title: 'Camera Access', headerShown: true }} />
        <View
          style={[
            styles.centred,
            { backgroundColor: colors.background, padding: spacing.xl },
          ]}
        >
          <Ionicons
            name="camera-outline"
            size={56}
            color={colors.textTertiary}
            style={{ marginBottom: spacing.md }}
          />
          <Text
            style={{
              color: colors.text,
              fontSize: typography.lg,
              fontWeight: typography.semibold,
              textAlign: 'center',
              marginBottom: spacing.sm,
            }}
          >
            Camera access denied
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sm,
              textAlign: 'center',
              lineHeight: typography.lineHeightBase,
              marginBottom: spacing.xl,
            }}
          >
            To scan barcodes, allow camera access for CalorieLog in your device settings.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openSettings()}
            accessibilityRole="button"
            accessibilityLabel="Open device settings"
            style={[
              styles.primaryBtn,
              {
                backgroundColor: colors.primary,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm + 4,
                borderRadius: 10,
                marginBottom: spacing.md,
              },
            ]}
          >
            <Text
              style={{
                color: colors.primaryText,
                fontSize: typography.base,
                fontWeight: typography.semibold,
              }}
            >
              Open settings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text
              style={{ color: colors.textSecondary, fontSize: typography.sm }}
            >
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // 3. Permission not yet granted but can be requested (e.g. auto-request in
  //    flight, or user dismissed the first prompt)
  if (!permission.granted) {
    return (
      <>
        <Stack.Screen options={{ title: 'Camera Access', headerShown: true }} />
        <View
          style={[
            styles.centred,
            { backgroundColor: colors.background, padding: spacing.xl },
          ]}
        >
          <Ionicons
            name="camera-outline"
            size={56}
            color={colors.textTertiary}
            style={{ marginBottom: spacing.md }}
          />
          <Text
            style={{
              color: colors.text,
              fontSize: typography.lg,
              fontWeight: typography.semibold,
              textAlign: 'center',
              marginBottom: spacing.sm,
            }}
          >
            Camera access needed
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sm,
              textAlign: 'center',
              lineHeight: typography.lineHeightBase,
              marginBottom: spacing.xl,
            }}
          >
            Allow camera access to scan barcodes on packaged foods.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            accessibilityRole="button"
            accessibilityLabel="Allow camera access"
            style={[
              styles.primaryBtn,
              {
                backgroundColor: colors.primary,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm + 4,
                borderRadius: 10,
              },
            ]}
          >
            <Text
              style={{
                color: colors.primaryText,
                fontSize: typography.base,
                fontWeight: typography.semibold,
              }}
            >
              Allow camera access
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // 4. Camera hardware unavailable (caught by CameraErrorBoundary)
  if (cameraHardwareError) {
    return (
      <>
        <Stack.Screen
          options={{ title: 'Camera Unavailable', headerShown: true }}
        />
        <View
          style={[
            styles.centred,
            { backgroundColor: colors.background, padding: spacing.xl },
          ]}
        >
          <Ionicons
            name="camera-reverse-outline"
            size={56}
            color={colors.textTertiary}
            style={{ marginBottom: spacing.md }}
          />
          <Text
            style={{
              color: colors.text,
              fontSize: typography.lg,
              fontWeight: typography.semibold,
              textAlign: 'center',
              marginBottom: spacing.sm,
            }}
          >
            Camera unavailable
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sm,
              textAlign: 'center',
              lineHeight: typography.lineHeightBase,
              marginBottom: spacing.xl,
            }}
          >
            The camera could not be started. Close other apps that may be using
            the camera and try again.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text
              style={{ color: colors.textSecondary, fontSize: typography.sm }}
            >
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // 5. Scan confirmed — drive barcode lookup
  if (scanResult !== null) {
    const isNonNumeric = !NUMERIC_BARCODE_RE.test(scanResult.data);

    // 5a. Numeric barcode: awaiting API response
    if (lookupLoading) {
      return (
        <>
          <Stack.Screen options={{ title: 'Looking Up', headerShown: true }} />
          <View
            style={[
              styles.centred,
              { backgroundColor: colors.background, padding: spacing.xl },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.base,
                marginTop: spacing.md,
                textAlign: 'center',
              }}
            >
              Looking up barcode…
            </Text>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: typography.xs,
                marginTop: spacing.xs,
              }}
              selectable
            >
              {scanResult.data}
            </Text>
          </View>
        </>
      );
    }

    // 5b. Product found — useEffect handles navigation; show spinner while
    //     the route transition fires so the screen isn't blank.
    if (food !== null) {
      return (
        <>
          <Stack.Screen options={{ title: 'Product Found', headerShown: true }} />
          <View style={[styles.centred, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </>
      );
    }

    // ── Shared elements for error / not-found states ──────────────────────

    const devLogBlock = __DEV__ && scanLog.current.length > 0 ? (
      <View
        style={[styles.devLog, { marginTop: spacing.lg, borderRadius: 8, padding: spacing.sm }]}
      >
        <Text style={styles.devLogTitle}>
          DEV · Scan event log ({scanLog.current.length} callbacks)
        </Text>
        {scanLog.current.map((entry, idx) => (
          <Text key={idx} style={styles.devLogEntry}>
            {entry.accepted ? '✓ accepted' : '× dropped '} [{entry.type}]{'\n'}
            {entry.data}{'\n'}
            <Text style={styles.devLogTs}>{entry.ts}</Text>
          </Text>
        ))}
      </View>
    ) : null;

    const barcodeCard = (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            padding: spacing.md,
            marginBottom: spacing.md,
          },
        ]}
      >
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.xs,
            fontWeight: typography.semibold,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: spacing.xs,
          }}
        >
          Barcode
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.lg,
            fontWeight: typography.bold,
          }}
          selectable
        >
          {scanResult.data}
        </Text>
        <Text
          style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing.xs }}
        >
          Format: {scanResult.type}
        </Text>
      </View>
    );

    const scanAgainBtn = (
      <TouchableOpacity
        onPress={handleScanAgain}
        accessibilityRole="button"
        accessibilityLabel="Scan another barcode"
        style={[
          styles.outlineBtn,
          {
            borderColor: colors.primary,
            paddingVertical: spacing.sm + 4,
            borderRadius: 10,
            marginBottom: spacing.sm,
          },
        ]}
      >
        <Ionicons name="barcode-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={{ color: colors.primary, fontSize: typography.base, fontWeight: typography.semibold }}>
          Scan another barcode
        </Text>
      </TouchableOpacity>
    );

    const enterManuallyBtn = (
      <TouchableOpacity
        onPress={() => router.replace('/today/manual-entry')}
        accessibilityRole="button"
        accessibilityLabel="Enter food manually"
        style={[
          styles.primaryBtn,
          {
            backgroundColor: colors.primary,
            paddingVertical: spacing.sm + 4,
            borderRadius: 10,
            marginBottom: spacing.sm,
          },
        ]}
      >
        <Text style={{ color: colors.primaryText, fontSize: typography.base, fontWeight: typography.semibold }}>
          Enter manually
        </Text>
      </TouchableOpacity>
    );

    // 5c. Food database unavailable
    if (providerUnavailable) {
      return (
        <>
          <Stack.Screen options={{ title: 'Scan Barcode', headerShown: true }} />
          <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: spacing.md }}
          >
            <View style={[styles.centred, { marginVertical: spacing.xl }]}>
              <Ionicons
                name="cloud-offline-outline"
                size={56}
                color={colors.textTertiary}
                style={{ marginBottom: spacing.md }}
              />
              <Text
                style={{
                  color: colors.text,
                  fontSize: typography.xl,
                  fontWeight: typography.bold,
                  textAlign: 'center',
                  marginBottom: spacing.sm,
                }}
              >
                Food database unavailable
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.sm,
                  textAlign: 'center',
                  lineHeight: typography.lineHeightBase,
                }}
              >
                The food database is not reachable right now. Enter the food manually or try again later.
              </Text>
            </View>
            {barcodeCard}
            {enterManuallyBtn}
            {scanAgainBtn}
            {devLogBlock}
          </ScrollView>
        </>
      );
    }

    // 5d. Hard error (network failure, unexpected server error)
    if (hardError) {
      return (
        <>
          <Stack.Screen options={{ title: 'Scan Barcode', headerShown: true }} />
          <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: spacing.md }}
          >
            <View style={[styles.centred, { marginVertical: spacing.xl }]}>
              <Ionicons
                name="alert-circle-outline"
                size={56}
                color={colors.textTertiary}
                style={{ marginBottom: spacing.md }}
              />
              <Text
                style={{
                  color: colors.text,
                  fontSize: typography.xl,
                  fontWeight: typography.bold,
                  textAlign: 'center',
                  marginBottom: spacing.sm,
                }}
              >
                Something went wrong
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.sm,
                  textAlign: 'center',
                  lineHeight: typography.lineHeightBase,
                }}
              >
                {errorMessage}
              </Text>
            </View>
            {barcodeCard}
            {scanAgainBtn}
            {enterManuallyBtn}
            {devLogBlock}
          </ScrollView>
        </>
      );
    }

    // 5e. Not found — covers both API 404 and non-numeric barcodes
    return (
      <>
        <Stack.Screen options={{ title: 'Not Found', headerShown: true }} />
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ padding: spacing.md }}
        >
          <View style={[styles.centred, { marginVertical: spacing.xl }]}>
            <Ionicons
              name="search-outline"
              size={56}
              color={colors.textTertiary}
              style={{ marginBottom: spacing.md }}
            />
            <Text
              style={{
                color: colors.text,
                fontSize: typography.xl,
                fontWeight: typography.bold,
                textAlign: 'center',
                marginBottom: spacing.sm,
              }}
            >
              Product not found
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.sm,
                textAlign: 'center',
                lineHeight: typography.lineHeightBase,
              }}
            >
              {isNonNumeric
                ? 'Only numeric barcodes on food packages are supported.'
                : "This barcode isn't in our food database yet."}
            </Text>
          </View>
          {barcodeCard}
          {enterManuallyBtn}
          {scanAgainBtn}
          {devLogBlock}
        </ScrollView>
      </>
    );
  }

  // 6. Active scanning — full-screen camera with viewfinder overlay
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.scannerRoot, { backgroundColor: '#000' }]}>
        {/* Mount CameraView only while this screen is focused.
            Conditional render (not just active=false) ensures the camera
            hardware is fully released when the user navigates away. */}
        {isFocused && (
          <CameraErrorBoundary onError={handleCameraError}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torchOn}
              onBarcodeScanned={handleBarcodeScan}
              barcodeScannerSettings={{ barcodeTypes: FOOD_BARCODE_TYPES }}
            />
          </CameraErrorBoundary>
        )}

        {/* Overlay controls — SafeAreaView keeps buttons out of notch/nav bar */}
        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          {/* ── Top bar ── */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Close scanner"
              style={styles.overlayBtn}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTorchOn((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={torchOn ? 'Turn off torch' : 'Turn on torch'}
              style={[
                styles.overlayBtn,
                torchOn && styles.overlayBtnActive,
              ]}
            >
              <Ionicons
                name={torchOn ? 'flashlight' : 'flashlight-outline'}
                size={22}
                color={torchOn ? '#000' : '#fff'}
              />
            </TouchableOpacity>
          </View>

          {/* ── Viewfinder ── */}
          <View style={styles.viewfinderArea} pointerEvents="none">
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cTL]} />
              <View style={[styles.corner, styles.cTR]} />
              <View style={[styles.corner, styles.cBL]} />
              <View style={[styles.corner, styles.cBR]} />
            </View>
          </View>

          {/* ── Bottom hint ── */}
          <View style={styles.bottomBar}>
            <Text style={styles.hintText}>
              Point at a barcode on a food package
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CORNER = 24;
const CORNER_W = 3;
const CORNER_R = 4;

const styles = StyleSheet.create({
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    alignItems: 'center',
    width: '100%',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },

  // ── Scanner ──
  scannerRoot: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  overlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayBtnActive: {
    backgroundColor: 'rgba(255,210,0,0.9)',
  },
  viewfinderArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: 270,
    height: 180,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#fff',
  },
  cTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_W,
    borderLeftWidth: CORNER_W,
    borderTopLeftRadius: CORNER_R,
  },
  cTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_W,
    borderRightWidth: CORNER_W,
    borderTopRightRadius: CORNER_R,
  },
  cBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_W,
    borderLeftWidth: CORNER_W,
    borderBottomLeftRadius: CORNER_R,
  },
  cBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_W,
    borderRightWidth: CORNER_W,
    borderBottomRightRadius: CORNER_R,
  },
  bottomBar: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  hintText: {
    color: '#fff',
    fontSize: 15,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },

  // ── Dev log ──
  devLog: {
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  devLogTitle: {
    color: '#00ff88',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  devLogEntry: {
    color: '#aaa',
    fontSize: 10,
    marginBottom: 6,
    lineHeight: 16,
  },
  devLogTs: {
    color: '#555',
    fontSize: 9,
  },
});
