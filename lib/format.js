const LOCALE = 'es-AR';
const TZ     = 'America/Argentina/Buenos_Aires';

export function fmtCurrency(val, decimals = 0) {
  if (val === null || val === undefined) return '–';
  if (typeof val === 'string') return val;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function fmtPercent(val, decimals = 2) {
  if (val === null || val === undefined) return '–';
  if (typeof val === 'string') return val;
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val) + '%';
}

export function fmtNumber(val, decimals = 2) {
  if (val === null || val === undefined) return '–';
  if (typeof val === 'string') return val;
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function fmtDate(date) {
  if (!date) return '–';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d);
}

export function fmtDateTime(date) {
  if (!date) return '–';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
}

export function fmtDateLong(date) {
  if (!date) return '–';
  const d = typeof date === 'string' ? new Date(date) : date;
  const str = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(d);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function hoyArgentina() {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).formatToParts(new Date());
  const obj = {};
  for (const p of partes) obj[p.type] = p.value;
  return `${obj.year}-${obj.month}-${obj.day}`;
}

export { fmtCurrency as fmt };
