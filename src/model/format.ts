/**
 * Display formatting. Rounding happens here and nowhere else — the engine
 * always works in full precision so intermediate rounding can't accumulate.
 */

const nf = (min: number, max: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: min, maximumFractionDigits: max })

const int = nf(0, 0)
const two = nf(2, 2)
const oneOrTwo = nf(1, 2)

export function money(n: number): string {
  if (!isFinite(n)) return '—'
  return '₹' + int.format(Math.round(n))
}

/** Rupees expressed in lakh, e.g. ₹33.17 L */
export function lakh(n: number): string {
  if (!isFinite(n)) return '—'
  return '₹' + oneOrTwo.format(n / 100000) + ' L'
}

/** Per-bottle amounts need paise. */
export function paise(n: number): string {
  if (!isFinite(n)) return '—'
  return '₹' + two.format(n)
}

export function count(n: number): string {
  if (!isFinite(n)) return '—'
  return int.format(Math.round(n))
}

export function pct(fraction: number, digits = 0): string {
  if (!isFinite(fraction)) return '—'
  return (fraction * 100).toFixed(digits) + '%'
}

export function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function uid(prefix = 'i'): string {
  return prefix + '_' + Math.random().toString(36).slice(2, 10)
}
