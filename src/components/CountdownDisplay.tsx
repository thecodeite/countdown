import { useMemo } from 'react'
import type { DateTime } from 'luxon'
import { remainingParts, workingDaysUntil, workingParts, type CountdownConfig } from '../lib/countdown'

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[4.5rem] flex-col items-center sm:min-w-[7rem]">
      <span className="text-5xl font-semibold tabular-nums sm:text-7xl">{String(value).padStart(2, '0')}</span>
      <span className="mt-1 text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 sm:text-sm">{label}</span>
    </div>
  )
}

export default function CountdownDisplay({ config, now }: { config: CountdownConfig; now: DateTime }) {
  const { target, title, workingDays, workingHours } = config
  const done = target <= now
  const parts = workingHours ? workingParts(now, target) : remainingParts(now, target)
  const workdays = workingDays ? workingDaysUntil(now, target) : null

  // Screen readers get a once-a-minute summary instead of a ticking clock.
  const minuteKey = Math.floor(now.toMillis() / 60000)
  const summary = useMemo(
    () => (done ? `${title || 'Countdown'} has arrived` : `${workingHours ? '' : `${parts.days} days, `}${parts.hours} ${workingHours ? 'working hours' : 'hours'} and ${parts.minutes} minutes remaining`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minuteKey, done, title, workingHours],
  )

  return (
    <div className="flex flex-col items-center gap-8 px-4 text-center">
      {title && <h1 className="text-2xl font-medium sm:text-4xl">{title}</h1>}
      {done ? (
        <p className="text-5xl font-semibold sm:text-7xl">It's here!</p>
      ) : (
        <div aria-hidden="true" className="flex flex-wrap justify-center gap-2 sm:gap-4">
          {!workingHours && <Unit value={parts.days} label="Days" />}
          <Unit value={parts.hours} label="Hours" />
          <Unit value={parts.minutes} label="Minutes" />
          <Unit value={parts.seconds} label="Seconds" />
        </div>
      )}
      {workingHours && !done && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Working hours only (Mon–Fri, 09:00–17:00)</p>
      )}
      {workdays !== null && !done && (
        <p className="text-lg text-slate-600 dark:text-slate-300">
          <span className="font-semibold tabular-nums">{workdays}</span> working {workdays === 1 ? 'day' : 'days'} remaining
        </p>
      )}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {target.toLocaleString({ ...DATE_FORMAT, timeZoneName: 'short' })} ({target.zoneName})
      </p>
      <p className="sr-only" aria-live="polite">{summary}</p>
    </div>
  )
}

const DATE_FORMAT = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' } as const
