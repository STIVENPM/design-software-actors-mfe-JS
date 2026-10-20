import type { ContractType, InstructorContractInput } from './instructor'

const WEEKLY_HOUR_LIMITS: Partial<Record<ContractType, number>> = {
  STAFF: 40,
  CONTRACTOR: 48,
}

export function contractHourError(
  contractType: ContractType,
  weeklyHourLimit: number | null,
): string | null {
  if (weeklyHourLimit === null) return null

  const maxHours = WEEKLY_HOUR_LIMITS[contractType]
  if (maxHours !== undefined && weeklyHourLimit > maxHours) {
    return `${contractType} permite máximo ${maxHours} horas semanales.`
  }
  if (weeklyHourLimit < 0) return 'Las horas semanales no pueden ser negativas.'
  return null
}

export function validateContract(
  contract: InstructorContractInput,
  hasCurrentContract: boolean,
): string | null {
  const hourError = contractHourError(contract.contract_type, contract.weekly_hour_limit)
  if (hourError) return hourError
  if (contract.is_current && hasCurrentContract) {
    return 'Cierra el contrato vigente antes de crear otro contrato actual.'
  }
  if (contract.end_date && contract.end_date < contract.start_date) {
    return 'La fecha de fin debe ser posterior a la fecha de inicio.'
  }
  return null
}
