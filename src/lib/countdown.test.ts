import { describe, expect, it } from 'vitest'
import { DateTime } from 'luxon'
import { buildSearch, parseSearch, remainingParts, workingDaysUntil } from './countdown'

const at = (iso: string) => DateTime.fromISO(iso, { setZone: true })

describe('workingDaysUntil', () => {
  it('counts today and target day (Mon 11:57 -> Thu 15:00)', () => {
    expect(workingDaysUntil(at('2026-10-05T11:57:00Z'), at('2026-10-08T15:00:00Z'))).toBe(4)
  })
  it('drops today once past 17:00', () => {
    expect(workingDaysUntil(at('2026-10-05T17:00:00Z'), at('2026-10-08T15:00:00Z'))).toBe(3)
    expect(workingDaysUntil(at('2026-10-05T18:30:00Z'), at('2026-10-08T15:00:00Z'))).toBe(3)
  })
  it('excludes target day if the target is before 9:00', () => {
    expect(workingDaysUntil(at('2026-10-05T11:57:00Z'), at('2026-10-08T08:59:00Z'))).toBe(3)
  })
  it('skips weekends', () => {
    expect(workingDaysUntil(at('2026-10-09T10:00:00Z'), at('2026-10-12T10:00:00Z'))).toBe(2)
    expect(workingDaysUntil(at('2026-10-10T10:00:00Z'), at('2026-10-11T10:00:00Z'))).toBe(0)
  })
  it('counts a single day when both ends are in the same window', () => {
    expect(workingDaysUntil(at('2026-10-05T10:00:00Z'), at('2026-10-05T12:00:00Z'))).toBe(1)
  })
  it('is 0 once the target has passed', () => {
    expect(workingDaysUntil(at('2026-10-09T10:00:00Z'), at('2026-10-05T10:00:00Z'))).toBe(0)
  })
  it('uses the target timezone for working hours', () => {
    // 20:00Z Monday is already Tuesday 07:00 in +11:00; target Tue 10:00+11:00
    expect(workingDaysUntil(at('2026-10-05T20:00:00Z'), at('2026-10-06T10:00:00+11:00'))).toBe(1)
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
    expect(buildSearch(res.config)).toBe('?date=2026-12-25T09%3A00%3A00%2B01%3A00&title=Xmas&workdays=1')
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
