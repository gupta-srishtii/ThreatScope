import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Api } from './api'
import type { Dataset } from './types'
import { errorMessage } from './utils'

type Workspace = {
  api: Api; datasets: Dataset[]; selected: Dataset | null; select: (id: string) => void
  refresh: (preferred?: string) => Promise<void>; loading: boolean; error: string
  connect: (key: string) => void; revision: number; invalidate: () => void
}
const Context = createContext<Workspace | null>(null)
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState('') // Intentionally memory-only, never browser storage or a Vite variable.
  const api = useMemo(() => new Api(key), [key])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedId, select] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(async (preferred?: string) => {
    const next = await api.request<Dataset[]>('/api/datasets')
    setDatasets(next)
    select(current => preferred || (next.some(d => d.id === current) ? current : next[0]?.id || ''))
    setError('')
  }, [api])
  useEffect(() => {
    let active = true
    setLoading(true); setDatasets([]); setError('')
    api.request<Dataset[]>('/api/datasets').then(next => {
      if (active) { setDatasets(next); select(next[0]?.id || '') }
    }).catch(e => { if (active) setError(errorMessage(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api])
  return <Context.Provider value={{ api, datasets, selected: datasets.find(d => d.id === selectedId) || null,
    select, refresh, loading, error, connect: setKey, revision, invalidate: () => setRevision(v => v + 1) }}>{children}</Context.Provider>
}
export function useWorkspace() {
  const value = useContext(Context)
  if (!value) throw new Error('Workspace provider missing')
  return value
}
