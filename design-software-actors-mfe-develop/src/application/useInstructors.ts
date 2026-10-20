import { useCallback, useEffect, useState } from 'react'
import type {
  Instructor,
  InstructorInput,
  InstructorStatusFilter,
} from '../domain/instructor'
import { actorsApi } from '../infrastructure/actors-api'

export function useInstructors(status: InstructorStatusFilter) {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setInstructors(await actorsApi.listInstructors(status))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar instructores.')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = async (input: InstructorInput) => {
    const saved = await actorsApi.createInstructor(input)
    if (status === 'all' || status === 'active') {
      setInstructors(current => [saved, ...current])
    }
    return saved
  }

  const update = async (id: string, input: InstructorInput) => {
    const saved = await actorsApi.updateInstructor(id, input)
    setInstructors(current => current.map(item => item.id === id ? saved : item))
    return saved
  }

  const deactivate = async (instructor: Instructor) => {
    await actorsApi.deactivateInstructor(instructor.id)
    const inactive = { ...instructor, status: 'inactive' as const }
    setInstructors(current => status === 'active'
      ? current.filter(item => item.id !== instructor.id)
      : current.map(item => item.id === instructor.id ? inactive : item))
  }

  return { instructors, loading, error, refresh, create, update, deactivate }
}
