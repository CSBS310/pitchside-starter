import { DomainError } from './errors.js';

// Dates are ISO strings without a zone ('2026-11-18T19:00'). They are read as
// local time, which is what the coordinator means by "seven o'clock".

const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

/** Parse a local ISO date or date-time string. */
export function parseLocal(iso: string): Date {
  if (!LOCAL_DATE_TIME.test(iso)) {
    throw new DomainError('INVALID_DATE', `Not a date: '${iso}' (use YYYY-MM-DD or YYYY-MM-DDTHH:mm)`);
  }
  const date = new Date(iso.length === 10 ? `${iso}T00:00` : iso);
  if (Number.isNaN(date.getTime())) {
    throw new DomainError('INVALID_DATE', `Not a date: '${iso}'`);
  }
  return date;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format a Date as local 'YYYY-MM-DDTHH:mm'. */
export function formatLocal(date: Date): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function addMinutes(iso: string, minutes: number): string {
  const date = parseLocal(iso);
  date.setMinutes(date.getMinutes() + minutes);
  return formatLocal(date);
}
