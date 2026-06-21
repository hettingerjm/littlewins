/**
 * Date helpers. All "days" in Little Wins are based on the child's LOCAL
 * calendar day (not UTC), formatted as YYYY-MM-DD, so a day rolls over at the
 * family's local midnight.
 */

/** Local YYYY-MM-DD for a given Date (defaults to now). */
export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a YYYY-MM-DD key back into a local Date at midnight. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Today's local date key. */
export function todayKey(): string {
  return toDateKey()
}

/** Day-of-week (0 = Sunday … 6 = Saturday) for a date key. */
export function dayOfWeek(key: string): number {
  return fromDateKey(key).getDay()
}

export function isWeekend(key: string): boolean {
  const dow = dayOfWeek(key)
  return dow === 0 || dow === 6
}

/** Add (or subtract) whole days to a date key, returning a new key. */
export function addDays(key: string, delta: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + delta)
  return toDateKey(d)
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Friendly label, e.g. "Saturday, June 20". */
export function formatLong(key: string): string {
  const d = fromDateKey(key)
  return `${WEEKDAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
}

/** Short label, e.g. "Jun 20". */
export function formatShort(key: string): string {
  const d = fromDateKey(key)
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`
}
