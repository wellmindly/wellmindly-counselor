/**
 * Time helpers shared by the dashboard, sessions and availability pages.
 *
 * The platform schedules everything in UTC (the slot generator, the student
 * booking screen and this portal's availability grid all speak UTC), so UTC
 * stays the reference on every label. What used to be missing is the
 * counselor's own clock: the Profile page lets a counselor pick a "Primary Time
 * Zone", but nothing read it, so a counselor in India saw "15:00 GMT" and had
 * to do the +5:30 in their head for every appointment. These helpers add the
 * local reading next to the UTC one whenever the two differ.
 */

/** Browsers still report the legacy alias for India; the API and our options use the canonical name. */
const TZ_ALIASES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
};

export const canonicalTimeZone = (tz?: string | null): string => {
  if (!tz) return 'UTC';
  return TZ_ALIASES[tz] || tz;
};

const isValidTimeZone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** A usable IANA zone for formatting; falls back to UTC for empty or unknown values. */
export const resolveTimeZone = (tz?: string | null): string => {
  const canonical = canonicalTimeZone(tz);
  return isValidTimeZone(canonical) ? canonical : 'UTC';
};

export const isUtcZone = (tz: string): boolean => tz === 'UTC' || tz === 'Etc/UTC' || tz === 'GMT';

/** The browser's zone, canonicalised, for pre-filling the onboarding form. */
export const detectBrowserTimeZone = (): string => {
  try {
    return canonicalTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  } catch {
    return 'UTC';
  }
};

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'UTC', label: 'UTC Standard' },
];

/**
 * The options for a time-zone <select>, with `current` added when it is not one
 * of the presets. Without that, a controlled <select> whose value matches no
 * option renders the first option ("Asia/Kolkata") while state still holds the
 * real value, so the form showed one zone and saved another.
 */
export const timezoneOptionsFor = (current?: string | null) => {
  const value = canonicalTimeZone(current);
  if (!value || TIMEZONE_OPTIONS.some((o) => o.value === value)) return TIMEZONE_OPTIONS;
  return [{ value, label: value }, ...TIMEZONE_OPTIONS];
};

const zoneAbbreviation = (date: Date, tz: string): string => {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName');
  return part?.value || tz;
};

/** "15:00 UTC" */
export const formatUtcClock = (date: Date): string =>
  `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')} UTC`;

/** "8:30 PM GMT+5:30" in the given zone. */
export const formatZonedClock = (date: Date, tz: string): string =>
  `${date.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })} ${zoneAbbreviation(date, tz)}`;

/**
 * Session start for display, e.g.
 *   UTC counselor:   "Wed, Nov 11, 2026 · 15:00 UTC"
 *   IST counselor:   "Wed, Nov 11, 2026 · 8:30 PM GMT+5:30 (15:00 UTC)"
 * The date is the one in the counselor's zone, since that is the day they attend.
 */
export const formatSessionTime = (iso: string, tz?: string | null): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  const zone = resolveTimeZone(tz);
  const day = date.toLocaleDateString('en-US', {
    timeZone: zone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (isUtcZone(zone)) return `${day} · ${formatUtcClock(date)}`;
  return `${day} · ${formatZonedClock(date, zone)} (${formatUtcClock(date)})`;
};
