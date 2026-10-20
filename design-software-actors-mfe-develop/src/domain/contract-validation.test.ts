import { describe, expect, it } from 'vitest'
import { contractHourError, validateContract } from './contract-validation'

describe('contract hour limits', () => {
  it('caps STAFF at 40 hours and CONTRACTOR at 48 hours', () => {
    expect(contractHourError('STAFF', 40)).toBeNull()
    expect(contractHourError('STAFF', 41)).toContain('máximo 40')
    expect(contractHourError('CONTRACTOR', 48)).toBeNull()
    expect(contractHourError('CONTRACTOR', 49)).toContain('máximo 48')
  })

  it('does not set a maximum for HOURLY', () => {
    expect(contractHourError('HOURLY', 160)).toBeNull()
  })

  it('blocks a second current contract and invalid date ranges', () => {
    const contract = {
      contract_type: 'STAFF' as const,
      start_date: '2026-08-10',
      end_date: '2026-08-09',
      weekly_hour_limit: 40,
      is_current: true,
    }
    expect(validateContract(contract, true)).toContain('Cierra el contrato vigente')
    expect(validateContract({ ...contract, is_current: false }, false)).toContain('fecha de fin')
  })
})
