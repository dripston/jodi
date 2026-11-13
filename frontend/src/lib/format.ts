import { differenceInHours, format, formatDistanceToNowStrict, parseISO } from 'date-fns';

export function toDate(iso: string): Date {
  return parseISO(iso);
}

/** Relative under 24h ("4 min ago"), absolute after ("13 Nov, 09:12"). */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const date = toDate(iso);
  if (Math.abs(differenceInHours(now, date)) < 24) {
    return formatDistanceToNowStrict(date, { addSuffix: true })
      .replace(' minutes', ' min')
      .replace(' minute', ' min')
      .replace(' seconds', ' sec')
      .replace(' second', ' sec');
  }
  return format(date, 'd MMM, HH:mm');
}

export function formatAbsolute(iso: string): string {
  return format(toDate(iso), 'd MMM yyyy, HH:mm');
}

export function formatTime(iso: string): string {
  return format(toDate(iso), 'HH:mm');
}

export function formatShortDate(iso: string): string {
  return format(toDate(iso), 'd MMM');
}

/** "+919800000001" → "+91 98•••• 0001" */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return phone;
  const local = digits.slice(-10);
  return `+${digits.slice(0, digits.length - 10) || '91'} ${local.slice(0, 2)}•••• ${local.slice(-4)}`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = digits.slice(-10);
  if (local.length !== 10) return phone;
  return `+${digits.slice(0, digits.length - 10) || '91'} ${local.slice(0, 5)} ${local.slice(5)}`;
}

export function formatGrams(grams: number): string {
  return `${(grams / 1000).toFixed(grams % 100 === 0 ? 1 : 2)} kg`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function shortHash(hash: string): string {
  const clean = hash.replace(/…/g, '');
  if (clean.length <= 8) return hash;
  return `${clean.slice(0, 4)}…${clean.slice(-4)}`;
}
