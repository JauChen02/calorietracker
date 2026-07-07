/**
 * Error reporting wrapper.
 *
 * Disabled safely when EXPO_PUBLIC_ERROR_REPORTING_DSN is not set. To enable,
 * set that variable and replace the body of `captureError` with an SDK call
 * (e.g. Sentry.captureException).
 *
 * Privacy constraints:
 * - The `context` parameter accepts only string key-value pairs intended for
 *   debugging (e.g. screen name, operation type).
 * - Never pass food names, calorie values, macros, meal content, or any
 *   user-entered text in context. Those fields contain nutrition data.
 */

const isEnabled = Boolean(process.env.EXPO_PUBLIC_ERROR_REPORTING_DSN);

/**
 * Reports an error to the configured error-reporting service.
 * Safe to call unconditionally — no-ops when DSN is absent.
 *
 * @param error   The caught error or unknown value.
 * @param context Optional structural debug context (screen, operation, etc.).
 *                Must NOT contain food names, calories, macros, or meal content.
 */
export function captureError(
  error: unknown,
  context?: Record<string, string>,
): void {
  if (!isEnabled) return;

  // Replace this block with SDK initialisation + captureException call.
  // Example (Sentry):
  //   Sentry.withScope((scope) => {
  //     if (context) scope.setExtras(context);
  //     Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  //   });
  void error;
  void context;
}
