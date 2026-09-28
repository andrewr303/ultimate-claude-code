/**
 * Locale formatting helpers. Formatters are created once per process,
 * not per render, and are deterministic for a given input.
 */

const listDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const detailDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

/** "Sep 14, 2026" — table cells and compact lists. */
export function formatListDate(iso: string): string {
  return listDateFormatter.format(new Date(iso))
}

/** "Monday, September 14, 2026" — the detail panel. */
export function formatDetailDate(iso: string): string {
  return detailDateFormatter.format(new Date(iso))
}

/** "$1,250.50" — tabular rendering is handled in CSS. */
export function formatMoney(amount: number): string {
  return moneyFormatter.format(amount)
}
