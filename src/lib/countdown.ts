import { DateTime } from 'luxon'

export const WORK_START_HOUR = 9
export const WORK_END_HOUR = 17

export interface CountdownConfig {
  /** Target instant; its zone is the offset given in the URL. */
  target: DateTime
  title: string
  workingDays: boolean
}

export type ParseResult =
  | { status: 'empty' }
  | { status: 'invalid'; message: string }
  | { status: 'ok'; config: CountdownConfig }

const HAS_OFFSET = /(Z|[+-]\d{2}(:?\d{2})?)$/i

export function parseSearch(search: string): ParseResult {
  const params = new URLSearchParams(search)
  const raw = params.get('date')
  if (!raw) return { status: 'empty' }
  // A "+" in a query string decodes as a space, so restore it.
  const iso = raw.trim().replace(/ (\d{2}(:?\d{2})?)$/, '+$1')
  if (!HAS_OFFSET.test(iso)) {
    return { status: 'invalid', message: 'The date must include a timezone offset, e.g. 2026-12-25T09:00:00+00:00.' }
  }
  const target = DateTime.fromISO(iso, { setZone: true })
  if (!target.isValid) return { status: 'invalid', message: `"${raw}" is not a valid date.` }
  return {
    status: 'ok',
    config: {
      target,
      title: params.get('title') ?? '',
      workingDays: params.get('workdays') === '1',
    },
  }
}

export function buildSearch(config: CountdownConfig): string {
  const params = new URLSearchParams()
  params.set('date', config.target.toISO({ suppressMilliseconds: true })!)
  if (config.title.trim()) params.set('title', config.title.trim())
  if (config.workingDays) params.set('workdays', '1')
  return `?${params.toString()}`
}

export interface Parts {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function remainingParts(now: DateTime, target: DateTime): Parts {
  let total = Math.max(0, Math.floor((target.toMillis() - now.toMillis()) / 1000))
  const days = Math.floor(total / 86400)
  total -= days * 86400
  const hours = Math.floor(total / 3600)
  total -= hours * 3600
  const minutes = Math.floor(total / 60)
  return { days, hours, minutes, seconds: total - minutes * 60 }
}

/**
 * Counts Mon–Fri days in [now, target] whose 09:00–17:00 window overlaps the
 * remaining range. Days are evaluated in the target's timezone.
 */
export function workingDaysUntil(now: DateTime, target: DateTime): number {
  if (target <= now) return 0
  const zone = target.zone
  const from = now.setZone(zone)
  let count = 0
  for (let day = from.startOf('day'); day <= target; day = day.plus({ days: 1 }).startOf('day')) {
    if (day.weekday > 5) continue
    const open = day.set({ hour: WORK_START_HOUR })
    const close = day.set({ hour: WORK_END_HOUR })
    if (from < close && target > open) count++
  }
  return count
}

/** Zones offered in the dialog: all IANA zones, plus the browser's own. */
export function timeZones(): string[] {
  const zones = Intl.supportedValuesOf('timeZone')
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone
  const all = new Set([local, 'UTC', ...zones])
  return [...all].sort()
}

export function localZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** Builds a DateTime from a datetime-local value interpreted in an IANA zone. */
export function fromLocalInput(value: string, zone: string): DateTime {
  return DateTime.fromISO(value, { zone })
}

/** Picks a zone from the list whose offset at the target instant matches the target's offset. */
export function zoneForTarget(target: DateTime, zones: string[]): string {
  const local = localZone()
  const matches = (z: string) => target.setZone(z).offset === target.offset
  if (matches(local)) return local
  return zones.find(matches) ?? 'UTC'
}
