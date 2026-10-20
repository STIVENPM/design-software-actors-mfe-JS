import { useCallback, useEffect, useState } from 'react'
import type {
  ActorStatus,
  ActorStatusCategory,
  ActorStatusTransition,
} from '../domain/actor-status'
import { actorStatusApi } from '../infrastructure/actor-status-api'

interface SectionState<T> {
  data: T[]
  loading: boolean
  error: string
}

function emptySection<T>(): SectionState<T> {
  return { data: [], loading: true, error: '' }
}

/**
 * application/useActorStatuses — máquina de estados parametrizable.
 *
 * Cada pestaña carga independiente: un fallo (p. ej. transiciones sin endpoint
 * en modo real) no tumba las demás. Solo habla con la fachada actorStatusApi.
 */
export function useActorStatuses() {
  const [categories, setCategories] = useState<SectionState<ActorStatusCategory>>(emptySection)
  const [statuses, setStatuses] = useState<SectionState<ActorStatus>>(emptySection)
  const [transitions, setTransitions] = useState<SectionState<ActorStatusTransition>>(emptySection)

  const refresh = useCallback(async () => {
    setCategories(emptySection())
    setStatuses(emptySection())
    setTransitions(emptySection())
    const [cats, stats, trans] = await Promise.allSettled([
      actorStatusApi.listCategories(),
      actorStatusApi.listStatuses(),
      actorStatusApi.listTransitions(),
    ])
    if (cats.status === 'fulfilled') setCategories({ data: cats.value, loading: false, error: '' })
    else setCategories({ data: [], loading: false, error: cats.reason instanceof Error ? cats.reason.message : 'No fue posible cargar las categorías.' })
    if (stats.status === 'fulfilled') setStatuses({ data: stats.value, loading: false, error: '' })
    else setStatuses({ data: [], loading: false, error: stats.reason instanceof Error ? stats.reason.message : 'No fue posible cargar los estados.' })
    if (trans.status === 'fulfilled') setTransitions({ data: trans.value, loading: false, error: '' })
    else setTransitions({ data: [], loading: false, error: trans.reason instanceof Error ? trans.reason.message : 'No fue posible cargar las transiciones.' })
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return { categories, statuses, transitions, refresh }
}
