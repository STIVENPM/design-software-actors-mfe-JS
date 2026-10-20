import { useCallback, useEffect, useState } from 'react'
import type { InstructorContract, InstructorContractInput } from '../domain/instructor'
import { actorsApi } from '../infrastructure/actors-api'

export function useInstructorContracts(instructorId: string | null) {
  const [contracts, setContracts] = useState<InstructorContract[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!instructorId) {
      setContracts([])
      return
    }
    setLoading(true)
    setError('')
    try {
      setContracts(await actorsApi.listContracts(instructorId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar contratos.')
    } finally {
      setLoading(false)
    }
  }, [instructorId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addContract = async (input: InstructorContractInput) => {
    if (!instructorId) return
    const contract = await actorsApi.addContract(instructorId, input)
    setContracts(current => [contract, ...current])
  }

  const closeContract = async (contractId: string) => {
    if (!instructorId) return
    const closed = await actorsApi.closeContract(instructorId, contractId)
    setContracts(current => current.map(item => item.id === contractId ? closed : item))
  }

  return { contracts, loading, error, addContract, closeContract }
}
