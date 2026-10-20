import { useCallback, useEffect, useState } from 'react'
import type { InstructorArea } from '../domain/instructor'
import { actorsApi } from '../infrastructure/actors-api'

export function useInstructorAreas(instructorId: string | null) {
  const [areas, setAreas] = useState<InstructorArea[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!instructorId) {
      setAreas([])
      return
    }
    setLoading(true)
    setError('')
    try {
      setAreas(await actorsApi.listAreas(instructorId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar áreas.')
    } finally {
      setLoading(false)
    }
  }, [instructorId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addArea = async (name: string) => {
    if (!instructorId) return
    const area = await actorsApi.addArea(instructorId, name)
    setAreas(current => [...current, area])
  }

  return { areas, loading, error, addArea }
}
