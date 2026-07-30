import { DateTime } from 'luxon';

const LIMA_ZONE = 'America/Lima';

/**
 * Start (inclusive) and end (exclusive) of "today" in America/Lima, as UTC
 * JS Dates — suitable for a Prisma `timestamp: { gte, lt }` filter. Lima has
 * no DST, but we still compute this off `DateTime.now()` rather than
 * hardcoding an offset so it stays correct if that ever changes.
 */
export function limaTodayRange(): { start: Date; end: Date } {
  const nowInLima = DateTime.now().setZone(LIMA_ZONE);
  const start = nowInLima.startOf('day');
  const end = start.plus({ days: 1 });
  return { start: start.toJSDate(), end: end.toJSDate() };
}

/** True when `timestamp` falls on the current calendar day in America/Lima. */
export function isTimestampInLimaToday(timestamp: Date): boolean {
  const paymentDay = DateTime.fromJSDate(timestamp, { zone: LIMA_ZONE }).startOf('day');
  const today = DateTime.now().setZone(LIMA_ZONE).startOf('day');
  return paymentDay.equals(today);
}

/**
 * Start of a rolling window of `days` calendar days back from today, in
 * America/Lima — used for the supervisor's "hasta 3 meses" read window
 * (`limaWindowStart(90)`), as a plain `timestamp: { gte }` lower bound.
 */
export function limaWindowStart(days: number): Date {
  return DateTime.now().setZone(LIMA_ZONE).startOf('day').minus({ days }).toJSDate();
}

/**
 * "Archived" is computed on the fly, never stored: a payment is archived
 * once its calendar year (in America/Lima) is before the current year.
 * Nothing is ever moved or deleted — archived data stays fully queryable,
 * it just becomes read-only for money-affecting actions.
 */
export function isArchived(timestamp: Date): boolean {
  const paymentYear = DateTime.fromJSDate(timestamp, { zone: LIMA_ZONE }).year;
  const currentYear = DateTime.now().setZone(LIMA_ZONE).year;
  return paymentYear < currentYear;
}
