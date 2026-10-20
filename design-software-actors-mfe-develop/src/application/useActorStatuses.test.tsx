import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useActorStatuses } from './useActorStatuses'

describe('useActorStatuses', () => {
  it('carga categorías, estados y transiciones al montar', async () => {
    const { result } = renderHook(() => useActorStatuses())
    await waitFor(() => {
      expect(result.current.statuses.loading).toBe(false)
    })
    expect(result.current.categories.data).toHaveLength(4)
    expect(result.current.statuses.data).toHaveLength(12)
    expect(result.current.transitions.data).toHaveLength(9)
    expect(result.current.categories.error).toBe('')
  })

  it('refresh recarga sin duplicar', async () => {
    const { result } = renderHook(() => useActorStatuses())
    await waitFor(() => {
      expect(result.current.statuses.loading).toBe(false)
    })
    await result.current.refresh()
    expect(result.current.categories.data).toHaveLength(4)
  })
})
