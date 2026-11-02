/** Local-time date helpers. Date keys are 'YYYY-MM-DD', datetimes 'YYYY-MM-DDTHH:mm' (local). */

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateTimeKey(d: Date): string {
  return `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function parseDate(key: string): Date {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function parseDateTime(key: string): Date {
  const [date, time = '00:00'] = key.split('T');
  const d = parseDate(date);
  const [h, mi] = time.split(':').map(Number);
  d.setHours(h || 0, mi || 0, 0, 0);
  return d;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d.getDate(), last));
  return r;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfWeek(d: Date, weekStartsOn: 0 | 1 = 1): Date {
  const s = startOfDay(d);
  const diff = (s.getDay() - weekStartsOn + 7) % 7;
  return addDays(s, -diff);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Month grid (6 rows x 7) starting at the configured weekday. */
export function monthGrid(month: Date, weekStartsOn: 0 | 1): Date[] {
  const first = startOfWeek(startOfMonth(month), weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function hhmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function withTime(dateK: string, time: string): string {
  return `${dateK.slice(0, 10)}T${time}`;
}

export function timeOf(dt: string): string {
  return dt.split('T')[1]?.slice(0, 5) ?? '00:00';
}

export function prevMonthKey(key: string, n = 1): string {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 - n, 1));
}
