import { useCallback, useEffect, useRef, useState } from 'react'
import { isFutureAvailabilityException, type AvailabilityException, type AvailabilityExceptionInput } from '../domain/instructor-availability'
import { ApiError } from '../domain/instructor'
import { actorsApi } from '../infrastructure/actors-api'
import { AuthClient } from '../infrastructure/auth-client'

type Access = 'loading' | 'granted' | 'forbidden' | 'error'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function useMyAvailability() {
  const [access, setAccess] = useState<Access>('loading')
  const [instructorId, setInstructorId] = useState<string | null>(null)
  const [sessionError, setSessionError] = useState('')
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState('')
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<{ exceptionId: string; message: string; retryable: boolean } | null>(null)
  const [cancelNotice, setCancelNotice] = useState('')
  const creatingRef = useRef(false)
  const cancelingRef = useRef(false)

  useEffect(() => {
    let live = true
    void AuthClient.currentUser().then(user => {
      if (!live) return
      if (user.actor_type !== 'INSTRUCTOR' || !user.roles.some(role => role.name === 'INSTRUCTOR')) {
        setAccess('forbidden')
        return
      }
      if (!user.actor_id || !UUID.test(user.actor_id)) {
        setSessionError('La sesión no contiene el actor_id del instructor. Contacta al administrador.')
        setAccess('error')
        return
      }
      setInstructorId(user.actor_id)
      setAccess('granted')
    }).catch(cause => {
      if (!live) return
      setSessionError(cause instanceof Error ? cause.message : 'No fue posible consultar la sesión.')
      setAccess('error')
    })
    return () => { live = false }
  }, [])

  const refresh = useCallback(async () => {
    if (!instructorId) return
    setLoading(true)
    setListError('')
    try {
      const items = await actorsApi.listInstructorAvailabilityExceptions(instructorId)
      setExceptions(items.filter(item => item.instructor_id === instructorId))
    } catch (cause) {
      setListError(cause instanceof Error ? cause.message : 'No fue posible cargar las excepciones.')
    } finally {
      setLoading(false)
    }
  }, [instructorId])

  useEffect(() => { void refresh() }, [refresh])

  async function create(input: AvailabilityExceptionInput): Promise<boolean> {
    if (!instructorId || creatingRef.current) return false
    creatingRef.current = true
    setCreating(true)
    setCreateError('')
    setNotice('')
    try {
      const created = await actorsApi.addInstructorAvailabilityException(instructorId, input)
      if (created.instructor_id !== instructorId) throw new Error('La respuesta no corresponde al instructor de la sesión.')
      setExceptions(current => [created, ...current])
      setNotice('Excepción registrada correctamente.')
      return true
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : 'No fue posible registrar la excepción.')
      return false
    } finally {
      creatingRef.current = false
      setCreating(false)
    }
  }

  async function cancel(exceptionId: string): Promise<boolean> {
    if (!instructorId || cancelingRef.current || !exceptions.some(item => item.id === exceptionId && isFutureAvailabilityException(item))) return false
    cancelingRef.current = true
    setCancelingId(exceptionId)
    setCancelError(null)
    setCancelNotice('')
    try {
      await actorsApi.removeInstructorAvailabilityException(instructorId, exceptionId)
      setExceptions(current => current.filter(item => item.id !== exceptionId))
      setCancelNotice('Excepción cancelada correctamente.')
      return true
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Intenta de nuevo más tarde.'
      const retryable = !(cause instanceof ApiError) || cause.status === 429 || cause.status >= 500
      setCancelError({ exceptionId, message: `No fue posible cancelar la excepción. ${message}`, retryable })
      return false
    } finally {
      cancelingRef.current = false
      setCancelingId(null)
    }
  }

  return { access, sessionError, exceptions, loading, listError, createError, creating, notice, refresh, create, cancelingId, cancelError, cancelNotice, cancel }
}
