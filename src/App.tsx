import { useEffect, useState } from 'react'
import CountdownDialog from './components/CountdownDialog'
import CountdownDisplay from './components/CountdownDisplay'
import IconButton, { GearIcon, PlusIcon } from './components/IconButton'
import { useNow, useUrlCountdown } from './hooks'
import type { CountdownConfig } from './lib/countdown'

type DialogMode = 'closed' | 'create' | 'edit'

export default function App() {
  const [parsed, update] = useUrlCountdown()
  const now = useNow()
  const [dialog, setDialog] = useState<DialogMode>('closed')
  const config = parsed.status === 'ok' ? parsed.config : null

  useEffect(() => {
    document.title = config?.title ? `${config.title} – Countdown` : 'Countdown'
  }, [config?.title])

  function submit(next: CountdownConfig) {
    // New countdowns get their own history entry; edits replace the current one.
    update(next, dialog === 'edit' ? 'replace' : 'push')
    setDialog('closed')
  }

  return (
    <main className="relative flex h-full items-center justify-center">
      {config && (
        <div className="absolute right-3 top-3 flex gap-1">
          <IconButton label="New countdown" onClick={() => setDialog('create')}><PlusIcon /></IconButton>
          <IconButton label="Edit countdown" onClick={() => setDialog('edit')}><GearIcon /></IconButton>
        </div>
      )}

      {config ? (
        <CountdownDisplay config={config} now={now} />
      ) : (
        <div className="flex flex-col items-center gap-4 px-4 text-center">
          {parsed.status === 'invalid' && <p role="alert" className="text-red-600 dark:text-red-400">{parsed.message}</p>}
          <button
            type="button"
            onClick={() => setDialog('create')}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-lg font-medium text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            Create new Countdown
          </button>
        </div>
      )}

      <CountdownDialog
        open={dialog !== 'closed'}
        initial={dialog === 'edit' ? config : null}
        onSubmit={submit}
        onClose={() => setDialog('closed')}
      />
    </main>
  )
}
