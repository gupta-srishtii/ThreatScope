import { useEffect, useRef, useState, type DependencyList } from 'react'
import { errorMessage } from './utils'

export function useResource<T>(load: (signal: AbortSignal) => Promise<T>, deps: DependencyList) {
  const loader = useRef(load)
  loader.current = load
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setData(null)
    loader
      .current(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value)
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [...deps, revision])
  return { data, loading, error, reload: () => setRevision((x) => x + 1) }
}
