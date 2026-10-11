import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { DateTime } from 'luxon'
import { fromLocalInput, localZone, timeZones, zoneForTarget, type CountdownConfig } from '../lib/countdown'

interface Props {
  open: boolean
  /** Config to edit; null opens a blank form. */
  initial: CountdownConfig | null
  onSubmit: (config: CountdownConfig) => void
  onClose: () => void
}

const INPUT_FORMAT = "yyyy-LL-dd'T'HH:mm"
const field = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900'

export default function CountdownDialog({ open, initial, onSubmit, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const zones = useMemo(timeZones, [])
  const [title, setTitle] = useState('')
  const [datetime, setDatetime] = useState('')
  const [zone, setZone] = useState(localZone())
  const [workingDays, setWorkingDays] = useState(false)
  const [workingDaysPrimary, setWorkingDaysPrimary] = useState(false)
  const [workingHours, setWorkingHours] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      if (initial) {
        const z = zoneForTarget(initial.target, zones)
        setZone(z)
        setDatetime(initial.target.setZone(z).toFormat(INPUT_FORMAT))
        setTitle(initial.title)
        setWorkingDays(initial.workingDays)
        setWorkingDaysPrimary(initial.workingDaysPrimary)
        setWorkingHours(initial.workingHours)
      } else {
        setZone(localZone())
        setDatetime(DateTime.now().plus({ days: 1 }).startOf('hour').toFormat(INPUT_FORMAT))
        setTitle('')
        setWorkingDays(false)
        setWorkingDaysPrimary(false)
        setWorkingHours(false)
      }
      setError('')
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, initial, zones])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const target = fromLocalInput(datetime, zone)
    if (!target.isValid) {
      setError('Please choose a valid date and time.')
      return
    }
    onSubmit({ target, title, workingDays, workingDaysPrimary: workingDays && workingDaysPrimary, workingHours })
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-black/50 dark:bg-slate-900 dark:text-slate-100"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <h2 className="text-xl font-semibold">{initial ? 'Edit countdown' : 'Create new Countdown'}</h2>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Name (optional)
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Date and time
          <input className={field} type="datetime-local" required value={datetime} onChange={(e) => setDatetime(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Timezone
          <select className={field} value={zone} onChange={(e) => setZone(e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="size-4" checked={workingDays} onChange={(e) => setWorkingDays(e.target.checked)} />
          Show working days remaining (Mon–Fri, 09:00–17:00)
        </label>

        {workingDays && (
          <label className="flex items-center gap-2 pl-6 text-sm font-medium">
            <input type="checkbox" className="size-4" checked={workingDaysPrimary} onChange={(e) => setWorkingDaysPrimary(e.target.checked)} />
            Use working days as the only countdown (pauses outside working hours)
          </label>
        )}

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="size-4" checked={workingHours} onChange={(e) => setWorkingHours(e.target.checked)} />
          Count working hours only (Mon–Fri, 09:00–17:00)
        </label>

        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500">
            {initial ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
