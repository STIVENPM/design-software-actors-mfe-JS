import type {
  Instructor,
  InstructorArea,
  InstructorContract,
  InstructorContractInput,
  InstructorInput,
  InstructorStatusFilter,
} from '../domain/instructor'
import { ApiError } from '../domain/instructor'
import type { InstructorCompetency, InstructorCompetencyId, InstructorCompetencyInput } from '../domain/instructor-competency'
import type { AvailabilityException, AvailabilityExceptionId, AvailabilityExceptionInput } from '../domain/instructor-availability'
import type { Learner, LearnerCreate, LearnerFichaEnrollment, LearnerFichaEnrollmentCreate, LearnerPage, LearnerUpdate } from '../domain/learner'
import type { components } from '../generated/actors'
import { mockActorsApi } from './mock-actors-api'
import { demoModeEnabled } from './api-mode'

const API_BASE_URL = (import.meta.env.VITE_ACTORS_API_BASE_URL || '/api/v1').replace(/\/$/, '')
export const isDemoMode = demoModeEnabled()
let accessTokenProvider: () => string | null = () => sessionStorage.getItem('sena.access_token')
export function setAccessTokenProvider(provider: () => string | null) { accessTokenProvider = provider }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(accessTokenProvider() ? { Authorization: `Bearer ${accessTokenProvider()}` } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as (components['schemas']['Error'] & { message?: string; detail?: string }) | null
    throw new ApiError(
      body?.error?.message || body?.message || body?.detail || `La solicitud falló (${response.status}).`,
      response.status,
    )
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function listPath(status: InstructorStatusFilter): string {
  const query = status === 'all' ? '' : `?status=${encodeURIComponent(status)}`
  return `/instructors${query}`
}

export const httpActorsApi = {
  async listInstructors(status: InstructorStatusFilter): Promise<Instructor[]> {
    const result = await request<{ data: Instructor[] }>(listPath(status))
    return result.data.map(item => ({ ...item, status: item.is_active ? 'active' : 'inactive' }))
  },

  async getInstructor(id: string): Promise<Instructor> {
    const item = await request<Instructor>(`/instructors/${encodeURIComponent(id)}`)
    return { ...item, status: item.is_active ? 'active' : 'inactive' }
  },

  async createInstructor(input: InstructorInput): Promise<Instructor> {
    const item = await request<Instructor>('/instructors', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return { ...item, status: item.is_active ? 'active' : 'inactive' }
  },

  async updateInstructor(id: string, input: InstructorInput): Promise<Instructor> {
    const item = await request<Instructor>(`/instructors/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return { ...item, status: item.is_active ? 'active' : 'inactive' }
  },

  deactivateInstructor(id: string): Promise<void> {
    return request<void>(`/instructors/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  listAreas(instructorId: string): Promise<InstructorArea[]> {
    return request<InstructorArea[]>(`/instructors/${encodeURIComponent(instructorId)}/areas`)
  },

  addArea(instructorId: string, name: string): Promise<InstructorArea> {
    return request<InstructorArea>(`/instructors/${encodeURIComponent(instructorId)}/areas`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },

  listContracts(instructorId: string): Promise<InstructorContract[]> {
    return request<InstructorContract[]>(`/instructors/${encodeURIComponent(instructorId)}/contracts`)
  },

  addContract(instructorId: string, input: InstructorContractInput): Promise<InstructorContract> {
    return request<InstructorContract>(`/instructors/${encodeURIComponent(instructorId)}/contracts`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  closeContract(instructorId: string, contractId: string): Promise<InstructorContract> {
    return request<InstructorContract>(
      `/instructors/${encodeURIComponent(instructorId)}/contracts/${encodeURIComponent(contractId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ is_current: false }),
      },
    )
  },

  listInstructorCompetencies(instructorId: string): Promise<InstructorCompetency[]> {
    return request<InstructorCompetency[]>(`/instructors/${encodeURIComponent(instructorId)}/competencies`)
  },

  addInstructorCompetency(instructorId: string, input: InstructorCompetencyInput): Promise<InstructorCompetency> {
    return request<InstructorCompetency>(`/instructors/${encodeURIComponent(instructorId)}/competencies`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  removeInstructorCompetency(instructorId: string, assignmentId: InstructorCompetencyId): Promise<void> {
    return request<void>(`/instructors/${encodeURIComponent(instructorId)}/competencies/${encodeURIComponent(assignmentId)}`, {
      method: 'DELETE',
    })
  },

  listInstructorAvailabilityExceptions(instructorId: string): Promise<AvailabilityException[]> {
    return request<AvailabilityException[]>(`/instructors/${encodeURIComponent(instructorId)}/availability-exceptions`)
  },

  addInstructorAvailabilityException(instructorId: string, input: AvailabilityExceptionInput): Promise<AvailabilityException> {
    return request<AvailabilityException>(`/instructors/${encodeURIComponent(instructorId)}/availability-exceptions`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  removeInstructorAvailabilityException(instructorId: string, exceptionId: AvailabilityExceptionId): Promise<void> {
    return request<void>(`/instructors/${encodeURIComponent(instructorId)}/availability-exceptions/${encodeURIComponent(exceptionId)}`, {
      method: 'DELETE',
    })
  },

  listLearners(page = 1): Promise<LearnerPage> {
    return request<LearnerPage>(`/learners?page=${page}&limit=20`)
  },

  getLearner(id: string): Promise<Learner> {
    return request<Learner>(`/learners/${encodeURIComponent(id)}`)
  },

  createLearner(input: LearnerCreate): Promise<Learner> {
    return request<Learner>('/learners', { method: 'POST', body: JSON.stringify(input) })
  },

  updateLearner(id: string, input: LearnerUpdate): Promise<Learner> {
    return request<Learner>(`/learners/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) })
  },

  cancelLearnerEnrollment(id: string): Promise<void> {
    return request<void>(`/learners/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  listLearnerFichaEnrollments(id: string): Promise<LearnerFichaEnrollment[]> {
    return request<LearnerFichaEnrollment[]>(`/learners/${encodeURIComponent(id)}/ficha-enrollments`)
  },

  createLearnerFichaEnrollment(id: string, input: LearnerFichaEnrollmentCreate): Promise<LearnerFichaEnrollment> {
    return request<LearnerFichaEnrollment>(`/learners/${encodeURIComponent(id)}/ficha-enrollments`, {
      method: 'POST', body: JSON.stringify(input),
    })
  },
}

export const actorsApi = isDemoMode ? mockActorsApi : httpActorsApi
