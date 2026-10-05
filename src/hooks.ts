import { useEffect, useState } from 'react'
import { DateTime } from 'luxon'
import { buildSearch, parseSearch, type CountdownConfig, type ParseResult } from './lib/countdown'

export function useNow(intervalMs = 1000): DateTime {
  const [now, setNow] = useState(() => DateTime.now())
  useEffect(() => {
    const id = setInterval(() => setNow(DateTime.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** The URL query string is the only app state. */
export function useUrlCountdown(): [ParseResult, (config: CountdownConfig, mode: 'push' | 'replace') => void] {
  const [search, setSearch] = useState(() => window.location.search)
  useEffect(() => {
    const onPop = () => setSearch(window.location.search)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const update = (config: CountdownConfig, mode: 'push' | 'replace') => {
    const next = buildSearch(config)
    if (mode === 'push') window.history.pushState(null, '', next)
    else window.history.replaceState(null, '', next)
    setSearch(next)
  }
  return [parseSearch(search), update]
}
