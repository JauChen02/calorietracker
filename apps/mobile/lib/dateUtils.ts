/** Returns YYYY-MM-DD in the device's local time zone. */
export function toLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns the device's IANA time zone string, e.g. "America/New_York". */
export function localTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
