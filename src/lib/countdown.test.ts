import { describe, expect, it } from 'vitest'
import { DateTime } from 'luxon'
import { parseEarn, parseLocaleNumber, formatEarn, earnFromFixed } from './earn'
import { buildSearch, parseSearch, remainingParts, workingDaysUntil, workingParts, workingSecondsUntil } from './countdown'

const at = (iso: string) => DateTime.fromISO(iso, { setZone: true })

describe('workingDaysUntil', () => {
  it('counts today and target day (Mon 11:57 -> Thu 15:00)', () => {
    expect(workingDaysUntil(at('2026-10-05T11:57:00Z'), at('2026-10-08T15:00:00Z'), 'UTC')).toBe(4)
  })
  it('drops today once past 17:00', () => {
    expect(workingDaysUntil(at('2026-10-05T17:00:00Z'), at('2026-10-08T15:00:00Z'), 'UTC')).toBe(3)
    expect(workingDaysUntil(at('2026-10-05T18:30:00Z'), at('2026-10-08T15:00:00Z'), 'UTC')).toBe(3)
  })
  it('excludes target day if the target is before 9:00', () => {
    expect(workingDaysUntil(at('2026-10-05T11:57:00Z'), at('2026-10-08T08:59:00Z'), 'UTC')).toBe(3)
  })
  it('skips weekends', () => {
    expect(workingDaysUntil(at('2026-10-09T10:00:00Z'), at('2026-10-12T10:00:00Z'), 'UTC')).toBe(2)
    expect(workingDaysUntil(at('2026-10-10T10:00:00Z'), at('2026-10-11T10:00:00Z'), 'UTC')).toBe(0)
  })
  it('counts a single day when both ends are in the same window', () => {
    expect(workingDaysUntil(at('2026-10-05T10:00:00Z'), at('2026-10-05T12:00:00Z'), 'UTC')).toBe(1)
  })
  it('is 0 once the target has passed', () => {
    expect(workingDaysUntil(at('2026-10-09T10:00:00Z'), at('2026-10-05T10:00:00Z'), 'UTC')).toBe(0)
  })
  it('uses the viewer timezone for working hours', () => {
    // 20:00Z Monday is already Tuesday 07:00 in +11:00; target Tue 10:00+11:00
    expect(workingDaysUntil(at('2026-10-05T20:00:00Z'), at('2026-10-06T10:00:00+11:00'), 'Australia/Sydney')).toBe(1)
  })
  it('drops today after 17:00 local (BST) even for a GMT target', () => {
    // Fri 17:34 BST = 16:34 UTC; target Mon 17:00 GMT -> only Monday remains
    expect(workingDaysUntil(at('2026-10-09T16:34:00Z'), at('2026-10-12T17:00:00+00:00'), 'Europe/London')).toBe(1)
  })
})

describe('workingSecondsUntil', () => {
  const h = 3600
  it('counts full days as 8 hours (Mon 09:00 -> Tue 17:00)', () => {
    expect(workingSecondsUntil(at('2026-10-05T09:00:00Z'), at('2026-10-06T17:00:00Z'), 'UTC')).toBe(16 * h)
  })
  it('counts partial first and last days', () => {
    // Mon 15:00-17:00 = 2h, Tue 09:00-10:30 = 1.5h
    expect(workingSecondsUntil(at('2026-10-05T15:00:00Z'), at('2026-10-06T10:30:00Z'), 'UTC')).toBe(3.5 * h)
  })
  it('ignores time outside the window and weekends', () => {
    // Fri 16:00 -> Mon 10:00: 1h + 1h
    expect(workingSecondsUntil(at('2026-10-09T16:00:00Z'), at('2026-10-12T10:00:00Z'), 'UTC')).toBe(2 * h)
    expect(workingSecondsUntil(at('2026-10-10T10:00:00Z'), at('2026-10-11T10:00:00Z'), 'UTC')).toBe(0)
    expect(workingSecondsUntil(at('2026-10-05T18:00:00Z'), at('2026-10-06T08:00:00Z'), 'UTC')).toBe(0)
  })
  it('is 0 once passed', () => {
    expect(workingSecondsUntil(at('2026-10-09T10:00:00Z'), at('2026-10-05T10:00:00Z'), 'UTC')).toBe(0)
  })
  it('reports total hours with no days', () => {
    expect(workingParts(at('2026-10-05T09:00:00Z'), at('2026-10-07T10:30:15Z'), 'UTC')).toEqual({ days: 0, hours: 17, minutes: 30, seconds: 15 })
  })
  it('uses the viewer zone DST: 17:34 BST is after close even for a GMT target', () => {
    // Fri 17:34 BST = 16:34 UTC; target Mon 09:00 +00:00 = 10:00 BST -> only Mon 09:00-10:00 BST
    expect(workingSecondsUntil(at('2026-10-09T16:34:00Z'), at('2026-10-12T09:00:00+00:00'), 'Europe/London')).toBe(3600)
    // after DST ends (GMT), 17:34 local is still after close
    expect(workingSecondsUntil(at('2026-11-06T17:34:00Z'), at('2026-11-09T09:00:00+00:00'), 'Europe/London')).toBe(0)
  })
})

describe('remainingParts', () => {
  it('splits into d/h/m/s and clamps at zero', () => {
    expect(remainingParts(at('2026-10-05T00:00:00Z'), at('2026-10-06T01:02:03Z'))).toEqual({ days: 1, hours: 1, minutes: 2, seconds: 3 })
    expect(remainingParts(at('2026-10-06T00:00:00Z'), at('2026-10-05T00:00:00Z')).days).toBe(0)
  })
})

describe('search params', () => {
  it('round-trips', () => {
    const res = parseSearch('?date=2026-12-25T09:00:00%2B01:00&workdays=1&title=Xmas')
    expect(res.status).toBe('ok')
    if (res.status !== 'ok') return
    expect(res.config.workingDays).toBe(true)
    expect(res.config.title).toBe('Xmas')
    expect(res.config.workingHours).toBe(false)
    expect(buildSearch(res.config)).toBe('?date=2026-12-25T09%3A00%3A00%2B01%3A00&title=Xmas&workdays=1')
  })
  it('round-trips workdays=primary', () => {
    const res = parseSearch('?date=2026-12-25T09:00:00Z&workdays=primary')
    if (res.status !== 'ok') throw new Error('expected ok')
    expect(res.config.workingDays).toBe(true)
    expect(res.config.workingDaysPrimary).toBe(true)
    expect(buildSearch(res.config)).toContain('workdays=primary')
  })
  it('round-trips workinghours', () => {
    const res = parseSearch('?date=2026-12-25T09:00:00Z&workinghours=1')
    if (res.status !== 'ok') throw new Error('expected ok')
    expect(res.config.workingHours).toBe(true)
    expect(buildSearch(res.config)).toContain('workinghours=1')
  })
  it('tolerates an unencoded +', () => {
    expect(parseSearch('?date=2026-12-25T09:00:00+01:00').status).toBe('ok')
  })
  it('flags missing offset and garbage', () => {
    expect(parseSearch('').status).toBe('empty')
    expect(parseSearch('?date=2026-12-25T09:00').status).toBe('invalid')
    expect(parseSearch('?date=nonsenseZ').status).toBe('invalid')
  })
})

describe('leftToEarn', () => {
  it('parses units into a daily rate', () => {
    expect(parseEarn('£450/d', 'en-GB')).toEqual({ daily: 450, currency: 'GBP' })
    expect(parseEarn('2000/m', 'en-GB')).toEqual({ daily: 24000 / 260, currency: 'GBP' })
    expect(parseEarn('$50,000/y', 'en-US')).toEqual({ daily: 50000 / 260, currency: 'USD' })
  })
  it('defaults currency from the locale, falling back to GBP', () => {
    expect(parseEarn('100/d', 'en-US')?.currency).toBe('USD')
    expect(parseEarn('100/d', 'de-DE')?.currency).toBe('EUR')
    expect(parseEarn('100/d', 'xx')?.currency).toBe('GBP')
  })
  it('uses locale separators', () => {
    expect(parseLocaleNumber('50.000', 'de-DE')).toBe(50000)
    expect(parseLocaleNumber('50,000', 'en-GB')).toBe(50000)
    expect(parseLocaleNumber('1.234,5', 'de-DE')).toBe(1234.5)
    expect(parseLocaleNumber('123.4567', 'de-DE')).toBe(123.4567)
  })
  it('rejects malformed values', () => {
    expect(parseEarn('450', 'en-GB')).toBeNull()
    expect(parseEarn('£450/w', 'en-GB')).toBeNull()
    expect(parseEarn('abc/d', 'en-GB')).toBeNull()
  })
  it('formats rates so they survive any locale', () => {
    expect(formatEarn({ daily: 450, currency: 'GBP' })).toBe('£450/d')
    expect(formatEarn({ daily: 123.456, currency: 'GBP' })).toBe('£123.4560/d')
    expect(parseEarn(formatEarn({ daily: 123.456, currency: 'GBP' }), 'de-DE')?.daily).toBeCloseTo(123.456)
  })
  it('converts a fixed amount to a daily rate', () => {
    expect(earnFromFixed(1000, 'GBP', 4)).toEqual({ daily: 250, currency: 'GBP' })
    expect(earnFromFixed(1000, 'GBP', 0)).toBeNull()
  })
  it('round-trips via the URL', () => {
    const res = parseSearch('?date=2026-12-25T09:00:00Z&leftToEarn=%C2%A3450%2Fd')
    if (res.status !== 'ok') throw new Error('expected ok')
    expect(res.config.earn).toEqual({ daily: 450, currency: 'GBP' })
    expect(buildSearch(res.config)).toContain('leftToEarn=%C2%A3450%2Fd')
  })
})
