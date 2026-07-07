/**
 * Privacy-safe analytics wrapper.
 *
 * Allowed events are enumerated below. The `track` function is a no-op until
 * an analytics SDK is wired up. To integrate a provider (e.g. PostHog, Mixpanel),
 * replace the body of `track` and add the SDK initialisation to app/_layout.tsx.
 *
 * Privacy constraints (enforced by the type system):
 * - Only the event name is transmitted — no payload.
 * - Food names, calories, macros, meal notes, and any user-entered text must
 *   NEVER appear in an analytics call. Add fields to AllowedEventName only for
 *   structural product events (feature used / flow completed / error occurred).
 */

export type AllowedEventName =
  | 'app_opened'
  | 'food_entry_created'
  | 'food_search_used'
  | 'barcode_scan_succeeded'
  | 'sync_failed'
  | 'sync_recovered'
  | 'account_deleted'
  | 'data_exported';

/**
 * Records a product event. Currently a no-op; replace the body with an SDK call
 * when analytics is configured.
 *
 * Only event names from AllowedEventName are accepted. Never pass nutrition
 * data, food names, or any user-entered content as context.
 */
export function track(_event: AllowedEventName): void {
  // No-op — wire to an analytics SDK here when ready.
}
