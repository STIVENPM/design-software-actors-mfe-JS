import { useCallback, useEffect, useRef, useState } from 'react'
import type { LearnerFichaEnrollment, LearnerFichaEnrollmentCreate } from '../domain/learner'
import { actorsApi } from '../infrastructure/actors-api'

export function useLearnerFichaEnrollments(learnerId: string | null) {
  const [enrollments, setEnrollments] = useState<LearnerFichaEnrollment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [canceling, setCanceling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const busyRef = useRef(false)

  const refresh = useCallback(async () => {
    if (!learnerId) return
    setLoading(true)
    setError('')
    try { setEnrollments(await actorsApi.listLearnerFichaEnrollments(learnerId)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cargar inscripciones.') }
    finally { setLoading(false) }
  }, [learnerId])

  useEffect(() => { setEnrollments([]); void refresh() }, [refresh])

  async function create(input: LearnerFichaEnrollmentCreate): Promise<boolean> {
    if (!learnerId || busyRef.current) return false
    busyRef.current = true
    setSaving(true)
    setSaveError('')
    try {
      const saved = await actorsApi.createLearnerFichaEnrollment(learnerId, input)
      if (saved.learner_id !== learnerId) throw new Error('La respuesta no corresponde al aprendiz seleccionado.')
      setEnrollments(current => [saved, ...current.filter(item => item.id !== saved.id).map(item =>
        item.is_current ? { ...item, is_current: false } : item,
      )])
      await refresh()
      return true
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'No fue posible inscribir al aprendiz.')
      return false
    } finally { busyRef.current = false; setSaving(false) }
  }

  async function cancelCurrent(): Promise<boolean> {
    if (!learnerId || busyRef.current || !enrollments.some(item => item.is_current)) return false
    busyRef.current = true
    setCanceling(true)
    setCancelError('')
    try {
      await actorsApi.cancelLearnerEnrollment(learnerId)
      await refresh()
      return true
    } catch (cause) {
      setCancelError(cause instanceof Error ? cause.message : 'No fue posible cancelar la inscripción.')
      return false
    } finally { busyRef.current = false; setCanceling(false) }
  }

  return { enrollments, loading, error, saving, saveError, canceling, cancelError, refresh, create, cancelCurrent }
}
