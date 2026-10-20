export type InstructorStatus = 'active' | 'inactive'
export type ContractType = 'STAFF' | 'CONTRACTOR' | 'HOURLY'

export interface Instructor {
  id: string
  first_name: string
  last_name: string
  full_name: string
  document_number: string
  email: string
  phone: string
  status: InstructorStatus
  is_active?: boolean
  user_id?: string
  document_type?: 'CC' | 'CE' | 'PA' | 'PE'
  default_max_hours_per_week?: number
}

export interface InstructorInput {
  user_id?: string
  document_type?: 'CC' | 'CE' | 'PA' | 'PE'
  default_max_hours_per_week?: number
  first_name: string
  last_name: string
  document_number: string
  email: string
  phone: string
}

export interface InstructorArea {
  id: string
  name: string
  is_primary: boolean
}

export interface InstructorContract {
  id: string
  contract_type: ContractType
  start_date: string
  end_date: string | null
  weekly_hour_limit: number | null
  is_current: boolean
}

export interface InstructorContractInput {
  contract_type: ContractType
  start_date: string
  end_date: string | null
  weekly_hour_limit: number | null
  is_current: boolean
}

export type InstructorStatusFilter = 'all' | InstructorStatus

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
