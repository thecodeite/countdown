export const WORKING_DAYS_PER_YEAR = 260

export interface Earn {
  /** Earnings per working day. */
  daily: number
  /** ISO 4217 code. */
  currency: string
}

const SYMBOLS: Record<string, string> = {
  '£': 'GBP', $: 'USD', '€': 'EUR', '¥': 'JPY', '₹': 'INR', '₩': 'KRW', '₽': 'RUB', '₺': 'TRY', '₪': 'ILS', '₫': 'VND', '฿': 'THB', zł: 'PLN', kr: 'SEK',
  'A$': 'AUD', 'C$': 'CAD', 'NZ$': 'NZD', 'US$': 'USD', 'HK$': 'HKD', 'S$': 'SGD', R$: 'BRL',
}
const SYMBOL_FOR: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', JPY: '¥', INR: '₹' }

const REGION_CURRENCY: Record<string, string> = {
  GB: 'GBP', US: 'USD', CA: 'CAD', AU: 'AUD', NZ: 'NZD', JP: 'JPY', IN: 'INR', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN',
  BR: 'BRL', MX: 'MXN', ZA: 'ZAR', SG: 'SGD', HK: 'HKD', CN: 'CNY', KR: 'KRW',
  ...Object.fromEntries('IE DE FR ES IT NL BE AT PT FI GR LU SK SI EE LV LT MT CY HR'.split(' ').map((r) => [r, 'EUR'])),
}

export function browserLocale(): string {
  return (typeof navigator !== 'undefined' && navigator.language) || 'en-GB'
}

function validLocale(locale: string): string {
  try {
    return Intl.NumberFormat.supportedLocalesOf(locale)[0] ?? 'en-GB'
  } catch {
    return 'en-GB'
  }
}

/** Best guess at the browser's currency from its locale region; £ if unknown. */
export function defaultCurrency(locale = browserLocale()): string {
  try {
    const region = new Intl.Locale(locale).maximize().region
    return (region && REGION_CURRENCY[region]) || 'GBP'
  } catch {
    return 'GBP'
  }
}

function separators(locale: string): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(validLocale(locale)).formatToParts(1234567.5)
  return {
    group: parts.find((p) => p.type === 'group')?.value ?? ',',
    decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
  }
}

const SPACES = /[\s  ']/g

/**
 * Parses a number using the locale's separators. A single separator with a
 * number of digits after it other than three is always a decimal point, which
 * keeps our own generated URLs (e.g. 123.4567) readable in any locale.
 */
export function parseLocaleNumber(text: string, locale = browserLocale()): number | null {
  const s = text.replace(SPACES, '')
  if (!/^\d[\d.,]*$/.test(s)) return null
  const { group, decimal } = separators(locale)
  let decimalSep: string | null
  const seps = s.match(/[.,]/g) ?? []
  if (seps.length === 0) decimalSep = null
  else if (new Set(seps).size > 1) decimalSep = s.charAt(Math.max(s.lastIndexOf('.'), s.lastIndexOf(',')))
  else if (seps.length > 1) decimalSep = null // repeated: grouping
  else {
    const sep = seps[0] ?? '.'
    const digitsAfter = s.length - s.indexOf(sep) - 1
    decimalSep = digitsAfter === 3 ? (sep === decimal && decimal !== group ? decimal : null) : sep
  }
  const normalised = decimalSep
    ? s.slice(0, s.lastIndexOf(decimalSep)).replace(/[.,]/g, '') + '.' + s.slice(s.lastIndexOf(decimalSep) + 1)
    : s.replace(/[.,]/g, '')
  const n = Number(normalised)
  return Number.isFinite(n) ? n : null
}

/** Parses "£1,234.50" / "2000" into an amount and optional currency code. */
export function parseAmount(text: string, locale = browserLocale()): { amount: number; currency: string | null } | null {
  const m = text.trim().match(/^([^\d\s]*)\s*(\d[\d.,\s  ']*)$/)
  if (!m) return null
  const amount = parseLocaleNumber(m[2] ?? '', locale)
  if (amount === null) return null
  let currency: string | null = null
  const symbol = m[1]
  if (symbol) {
    currency = SYMBOLS[symbol] ?? (/^[A-Za-z]{3}$/.test(symbol) ? symbol.toUpperCase() : null)
    if (!currency) return null
  }
  return { amount, currency }
}

/** Parses "£450/d", "2000/m", "$50,000/y" into a daily rate. Null if malformed. */
export function parseEarn(text: string, locale = browserLocale()): Earn | null {
  const m = text.trim().match(/^(.*?)\s*\/\s*([dmy])$/i)
  if (!m) return null
  const parsed = parseAmount(m[1], locale)
  if (!parsed || parsed.amount <= 0) return null
  const unit = m[2].toLowerCase()
  const daily = unit === 'd' ? parsed.amount : unit === 'm' ? (parsed.amount * 12) / WORKING_DAYS_PER_YEAR : parsed.amount / WORKING_DAYS_PER_YEAR
  return { daily, currency: parsed.currency ?? defaultCurrency(locale) }
}

/** Locale-independent daily-rate string for the URL, e.g. "£450/d" or "£123.4567/d". */
export function formatEarn(earn: Earn): string {
  let n = earn.daily.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  const decimals = n.includes('.') ? n.split('.')[1].length : 0
  if (decimals === 1) n += '0'
  else if (decimals === 3) n += '0' // three digits would be mistaken for a thousands group
  return `${SYMBOL_FOR[earn.currency] ?? earn.currency}${n}/d`
}

/** Daily rate from a fixed total spread over the working days remaining. */
export function earnFromFixed(amount: number, currency: string, workingDays: number): Earn | null {
  if (!(amount > 0) || workingDays < 1) return null
  return { daily: amount / workingDays, currency }
}

export function formatMoney(value: number, currency: string, locale = browserLocale()): string {
  return new Intl.NumberFormat(validLocale(locale), { style: 'currency', currency }).format(value)
}
