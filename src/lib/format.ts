import type { Currency, DateFormat, Language } from '@/types/models';
import { parseDate } from './dates';

const MONTHS: Record<Language, string[]> = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const MONTHS_SHORT: Record<Language, string[]> = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const DAYS: Record<Language, string[]> = {
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const DAYS_SHORT: Record<Language, string[]> = {
  es: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
};
const DAYS_ABBR: Record<Language, string[]> = {
  es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export const CURRENCY_SYMBOL: Record<Currency, string> = { EUR: '€', USD: '$', GBP: '£', MXN: '$' };

export const monthName = (lang: Language, m: number) => MONTHS[lang][m];
export const monthShort = (lang: Language, m: number) => MONTHS_SHORT[lang][m];
export const dayName = (lang: Language, d: number) => DAYS[lang][d];
export const dayInitial = (lang: Language, d: number) => DAYS_SHORT[lang][d];
export const dayAbbr = (lang: Language, d: number) => DAYS_ABBR[lang][d];

function groupThousands(int: string, sep: string) {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** Format integer cents. Spanish style "1.234,50 €", English "€1,234.50". */
export function money(cents: number, currency: Currency, lang: Language, opts: { sign?: boolean; decimals?: boolean } = {}): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const showDec = opts.decimals ?? abs % 100 !== 0;
  const int = Math.floor(abs / 100).toString();
  const dec = (abs % 100).toString().padStart(2, '0');
  const thou = lang === 'es' ? '.' : ',';
  const decSep = lang === 'es' ? ',' : '.';
  // Spanish convention: no thousands separator for 4-digit numbers
  const grouped = lang === 'es' && int.length <= 4 ? int : groupThousands(int, thou);
  const num = showDec ? `${grouped}${decSep}${dec}` : grouped;
  const sym = CURRENCY_SYMBOL[currency];
  const signStr = neg ? '−' : opts.sign ? '+' : '';
  return lang === 'es' ? `${signStr}${num} ${sym}` : `${signStr}${sym}${num}`;
}

/** Parse user-typed amount ("12,50", "1.200", "12.5") into cents. Returns null when invalid. */
export function parseAmount(input: string): number | null {
  const s = input.trim().replace(/[€$£\s]/g, '');
  if (!s) return null;
  let normalized = s;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    const decSep = lastComma > lastDot ? ',' : '.';
    const thouSep = decSep === ',' ? '.' : ',';
    normalized = s.split(thouSep).join('').replace(decSep, '.');
  } else if (lastComma > -1) {
    const after = s.length - lastComma - 1;
    normalized = after === 3 && s.indexOf(',') === lastComma && s.length > 4 ? s.replace(',', '') : s.replace(',', '.');
  } else if (lastDot > -1) {
    const after = s.length - lastDot - 1;
    normalized = after === 3 && s.indexOf('.') === lastDot && s.length > 4 ? s.replace('.', '') : s;
  }
  const n = Number(normalized);
  if (!isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function percent(v: number, lang: Language, digits = 0): string {
  const s = (v * 100).toFixed(digits);
  return lang === 'es' ? `${s.replace('.', ',')} %` : `${s}%`;
}

export function shortDate(key: string, lang: Language, fmt: DateFormat): string {
  const d = parseDate(key);
  if (lang === 'es') return `${d.getDate()} ${MONTHS_SHORT.es[d.getMonth()]}`;
  if (fmt === 'dmy') return `${d.getDate()} ${MONTHS_SHORT.en[d.getMonth()]}`;
  return `${MONTHS_SHORT.en[d.getMonth()]} ${d.getDate()}`;
}

export function numericDate(key: string, fmt: DateFormat): string {
  const [y, m, d] = key.slice(0, 10).split('-');
  if (fmt === 'mdy') return `${m}/${d}/${y}`;
  if (fmt === 'ymd') return `${y}-${m}-${d}`;
  return `${d}/${m}/${y}`;
}

export function longDate(d: Date, lang: Language): string {
  if (lang === 'es') return `${DAYS.es[d.getDay()]}, ${d.getDate()} de ${MONTHS.es[d.getMonth()]}`;
  return `${DAYS.en[d.getDay()]}, ${MONTHS.en[d.getMonth()]} ${d.getDate()}`;
}

export function monthLabel(key: string, lang: Language, withYear = true): string {
  const [y, m] = key.split('-').map(Number);
  const name = MONTHS[lang][m - 1];
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return withYear ? `${cap} ${y}` : cap;
}

export function durationLabel(min: number, lang: Language): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
