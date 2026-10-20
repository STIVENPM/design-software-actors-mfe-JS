import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../domain/instructor'
import type { InstructorCompetency, InstructorCompetencyId, InstructorCompetencyInput } from '../domain/instructor-competency'
import { actorsApi } from '../infrastructure/actors-api'

export function useInstructorCompetencies(instructorId: string) {
  const [competencies, setCompetencies] = useState<InstructorCompetency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assignmentError, setAssignmentError] = useState('')
  const [revokeError, setRevokeError] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [revokingId, setRevokingId] = useState<InstructorCompetencyId | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const items = await actorsApi.listInstructorCompetencies(instructorId)
      setCompetencies(items.filter(item => item.is_active))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar las competencias.')
    } finally {
      setLoading(false)
    }
  }, [instructorId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const assign = async (input: InstructorCompetencyInput): Promise<boolean> => {
    setAssignmentError('')
    setAssigning(true)
    try {
      const created = await actorsApi.addInstructorCompetency(instructorId, input)
      setCompetencies(current => created.is_active ? [created, ...current] : current)
      return true
    } catch (cause) {
      setAssignmentError(cause instanceof ApiError && cause.status === 409
        ? cause.message || 'Esta competencia ya está asignada al instructor.'
        : cause instanceof Error ? cause.message : 'No fue posible asignar la competencia.')
      return false
    } finally {
      setAssigning(false)
    }
  }

  const revoke = async (assignmentId: InstructorCompetencyId): Promise<boolean> => {
    setRevokeError('')
    setRevokingId(assignmentId)
    try {
      await actorsApi.removeInstructorCompetency(instructorId, assignmentId)
      setCompetencies(current => current.filter(item => item.id !== assignmentId))
      return true
    } catch (cause) {
      setRevokeError(cause instanceof Error ? cause.message : 'No fue posible revocar la competencia.')
      return false
    } finally {
      setRevokingId(null)
    }
  }

  return { competencies, loading, error, assignmentError, revokeError, assigning, revokingId, refresh, assign, revoke }
}
