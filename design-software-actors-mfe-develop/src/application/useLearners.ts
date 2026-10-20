import { useCallback, useEffect, useRef, useState } from 'react'
import type { Learner, LearnerCreate, LearnerPage, LearnerUpdate } from '../domain/learner'
import { actorsApi } from '../infrastructure/actors-api'

export function useLearners() {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<LearnerPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const savingRef = useRef(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setResult(await actorsApi.listLearners(page)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cargar aprendices.') }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { void refresh() }, [refresh])

  async function create(input: LearnerCreate): Promise<Learner | null> {
    if (savingRef.current) return null
    savingRef.current = true
    setSaving(true)
    setSaveError('')
    try {
      const saved = await actorsApi.createLearner(input)
      if (page === 1) setResult(current => current ? { ...current, data: [saved, ...current.data],
        pagination: { ...current.pagination, total_items: current.pagination.total_items + 1 } } : current)
      else setPage(1)
      return saved
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'No fue posible crear el aprendiz.')
      return null
    } finally { savingRef.current = false; setSaving(false) }
  }

  async function update(id: string, input: LearnerUpdate): Promise<Learner | null> {
    if (savingRef.current) return null
    savingRef.current = true
    setSaving(true)
    setSaveError('')
    try {
      const saved = await actorsApi.updateLearner(id, input)
      setResult(current => current ? { ...current, data: current.data.map(item => item.id === id ? saved : item) } : current)
      return saved
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'No fue posible actualizar el aprendiz.')
      return null
    } finally { savingRef.current = false; setSaving(false) }
  }

  return { page, setPage, result, loading, error, saving, saveError, refresh, create, update }
}
