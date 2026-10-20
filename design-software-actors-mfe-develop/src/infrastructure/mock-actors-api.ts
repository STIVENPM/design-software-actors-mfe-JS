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

export const DEMO_INSTRUCTOR_ID = '11111111-1111-4111-8111-111111111111'
export const DEMO_FICHA_ID = '55555555-5555-4555-8555-555555555555'
export const DEMO_ACTIVE_ENROLLMENT_STATUS_ID = '66666666-6666-4666-8666-666666666666'
export const DEMO_CANCELLED_ENROLLMENT_STATUS_ID = '77777777-7777-4777-8777-777777777777'

const INITIAL_INSTRUCTORS: Instructor[] = [
  {
    id: DEMO_INSTRUCTOR_ID,
    first_name: 'Juan',
    last_name: 'Pérez',
    full_name: 'Juan Pérez',
    document_number: '1075421336',
    email: 'juan.perez@example.test',
    phone: '300 123 4567',
    status: 'active',
  },
  {
    id: 'demo-inst-2',
    first_name: 'Carolina',
    last_name: 'Rojas',
    full_name: 'Carolina Rojas',
    document_number: '1010338224',
    email: 'carolina.rojas@example.test',
    phone: '310 456 7890',
    status: 'active',
  },
  {
    id: 'demo-inst-3',
    first_name: 'Diego',
    last_name: 'Castro',
    full_name: 'Diego Castro',
    document_number: '79521440',
    email: 'diego.castro@example.test',
    phone: '320 555 0182',
    status: 'active',
  },
]

const INITIAL_AREAS: Record<string, InstructorArea[]> = {
  [DEMO_INSTRUCTOR_ID]: [{ id: 'demo-area-1', name: 'Desarrollo de software', is_primary: true }],
  'demo-inst-2': [{ id: 'demo-area-2', name: 'Bases de datos', is_primary: true }],
  'demo-inst-3': [{ id: 'demo-area-3', name: 'Calidad', is_primary: true }],
}

const INITIAL_CONTRACTS: Record<string, InstructorContract[]> = {
  [DEMO_INSTRUCTOR_ID]: [{
    id: 'demo-contract-1',
    contract_type: 'STAFF',
    start_date: '2025-01-15',
    end_date: null,
    weekly_hour_limit: 40,
    is_current: true,
  }],
}

function makeId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
}

export function createMockActorsApi(seed: Instructor[] = INITIAL_INSTRUCTORS) {
  let instructors = seed.map(instructor => ({ ...instructor }))
  const areas = Object.fromEntries(
    Object.entries(INITIAL_AREAS).map(([id, items]) => [id, items.map(item => ({ ...item }))]),
  ) as Record<string, InstructorArea[]>
  const contracts = Object.fromEntries(
    Object.entries(INITIAL_CONTRACTS).map(([id, items]) => [id, items.map(item => ({ ...item }))]),
  ) as Record<string, InstructorContract[]>
  const competencies: Record<string, InstructorCompetency[]> = {}
  const availabilityExceptions: Record<string, AvailabilityException[]> = {}
  let learners: Learner[] = [{
    id: '88888888-8888-4888-8888-888888888888',
    user_id: '99999999-9999-4999-8999-999999999999',
    document_type: 'TI', document_number: '1020304050', first_name: 'Laura', last_name: 'Rojas',
    email: 'laura.rojas@example.test', phone: '3001234567', birth_date: '2007-04-12',
    created_at: '2026-01-10T10:00:00',
  }]
  const learnerEnrollments: Record<string, LearnerFichaEnrollment[]> = {
    [learners[0].id]: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', learner_id: learners[0].id,
      ficha_id: DEMO_FICHA_ID, enrollment_status_id: DEMO_ACTIVE_ENROLLMENT_STATUS_ID,
      stage: 'LECTURE', enrollment_date: '2026-02-01', completion_date: null,
      is_current: true, transfer_reason: null }],
  }

  function requireInstructor(id: string) {
    if (!instructors.some(instructor => instructor.id === id)) {
      throw new ApiError('No se encontró el instructor solicitado.', 404)
    }
  }

  return {
    async listInstructors(status: InstructorStatusFilter): Promise<Instructor[]> {
      return instructors
        .filter(instructor => status === 'all' || instructor.status === status)
        .map(instructor => ({ ...instructor }))
    },

    async getInstructor(id: string): Promise<Instructor> {
      requireInstructor(id)
      return { ...instructors.find(instructor => instructor.id === id)! }
    },

    async createInstructor(input: InstructorInput): Promise<Instructor> {
      const instructor: Instructor = {
        ...input,
        id: makeId('demo-inst'),
        full_name: `${input.first_name.trim()} ${input.last_name.trim()}`.trim(),
        status: 'active',
      }
      instructors = [instructor, ...instructors]
      return { ...instructor }
    },

    async updateInstructor(id: string, input: InstructorInput): Promise<Instructor> {
      requireInstructor(id)
      const updated: Instructor = {
        ...instructors.find(instructor => instructor.id === id)!,
        ...input,
        full_name: `${input.first_name.trim()} ${input.last_name.trim()}`.trim(),
      }
      instructors = instructors.map(instructor => instructor.id === id ? updated : instructor)
      return { ...updated }
    },

    async deactivateInstructor(id: string): Promise<void> {
      requireInstructor(id)
      instructors = instructors.map(instructor =>
        instructor.id === id ? { ...instructor, status: 'inactive' } : instructor,
      )
    },

    async listAreas(instructorId: string): Promise<InstructorArea[]> {
      requireInstructor(instructorId)
      return (areas[instructorId] ?? []).map(area => ({ ...area }))
    },

    async addArea(instructorId: string, name: string): Promise<InstructorArea> {
      requireInstructor(instructorId)
      const area = { id: makeId('demo-area'), name, is_primary: false }
      areas[instructorId] = [...(areas[instructorId] ?? []), area]
      return { ...area }
    },

    async listContracts(instructorId: string): Promise<InstructorContract[]> {
      requireInstructor(instructorId)
      return (contracts[instructorId] ?? []).map(contract => ({ ...contract }))
    },

    async addContract(
      instructorId: string,
      input: InstructorContractInput,
    ): Promise<InstructorContract> {
      requireInstructor(instructorId)
      const currentContracts = contracts[instructorId] ?? []
      if (input.is_current && currentContracts.some(contract => contract.is_current)) {
        throw new ApiError('El instructor ya tiene un contrato vigente.', 422)
      }
      const contract = { ...input, id: makeId('demo-contract') }
      contracts[instructorId] = [contract, ...currentContracts]
      return { ...contract }
    },

    async closeContract(instructorId: string, contractId: string): Promise<InstructorContract> {
      requireInstructor(instructorId)
      const currentContracts = contracts[instructorId] ?? []
      const contract = currentContracts.find(item => item.id === contractId)
      if (!contract) throw new ApiError('No se encontró el contrato solicitado.', 404)
      const closed = { ...contract, is_current: false }
      contracts[instructorId] = currentContracts.map(item => item.id === contractId ? closed : item)
      return { ...closed }
    },

    async listInstructorCompetencies(instructorId: string): Promise<InstructorCompetency[]> {
      requireInstructor(instructorId)
      return (competencies[instructorId] ?? []).filter(item => item.is_active).map(item => ({ ...item }))
    },

    async addInstructorCompetency(instructorId: string, input: InstructorCompetencyInput): Promise<InstructorCompetency> {
      requireInstructor(instructorId)
      const current = competencies[instructorId] ?? []
      if (current.some(item => item.is_active && item.competency_id === input.competency_id)) {
        throw new ApiError('El instructor ya tiene esta competencia activa.', 409)
      }
      const assignment: InstructorCompetency = {
        ...input,
        id: makeId('demo-assignment'),
        instructor_id: instructorId,
        is_active: true,
        created_at: new Date().toISOString(),
      }
      competencies[instructorId] = [assignment, ...current]
      return { ...assignment }
    },

    async removeInstructorCompetency(instructorId: string, assignmentId: InstructorCompetencyId): Promise<void> {
      requireInstructor(instructorId)
      const current = competencies[instructorId] ?? []
      if (!current.some(item => item.id === assignmentId && item.is_active)) {
        throw new ApiError('No se encontró la asignación activa.', 404)
      }
      competencies[instructorId] = current.map(item => item.id === assignmentId
        ? { ...item, is_active: false, updated_at: new Date().toISOString() }
        : item)
    },

    async listInstructorAvailabilityExceptions(instructorId: string): Promise<AvailabilityException[]> {
      requireInstructor(instructorId)
      return (availabilityExceptions[instructorId] ?? []).map(item => ({ ...item }))
    },

    async addInstructorAvailabilityException(instructorId: string, input: AvailabilityExceptionInput): Promise<AvailabilityException> {
      requireInstructor(instructorId)
      const created: AvailabilityException = {
        ...input,
        id: makeId('demo-exception'),
        instructor_id: instructorId,
        created_at: new Date().toISOString(),
      }
      availabilityExceptions[instructorId] = [created, ...(availabilityExceptions[instructorId] ?? [])]
      return { ...created }
    },

    async removeInstructorAvailabilityException(instructorId: string, exceptionId: AvailabilityExceptionId): Promise<void> {
      requireInstructor(instructorId)
      const current = availabilityExceptions[instructorId] ?? []
      if (!current.some(item => item.id === exceptionId)) throw new ApiError('No se encontró la excepción.', 404)
      availabilityExceptions[instructorId] = current.filter(item => item.id !== exceptionId)
    },

    async listLearners(page = 1): Promise<LearnerPage> {
      const limit = 20
      return { data: learners.slice((page - 1) * limit, page * limit).map(item => ({ ...item })),
        pagination: { total_items: learners.length, current_page: page, total_pages: Math.max(1, Math.ceil(learners.length / limit)) } }
    },

    async getLearner(id: string): Promise<Learner> {
      const learner = learners.find(item => item.id === id)
      if (!learner) throw new ApiError('No se encontró el aprendiz.', 404)
      return { ...learner }
    },

    async createLearner(input: LearnerCreate): Promise<Learner> {
      if (learners.some(item => item.document_number === input.document_number)) throw new ApiError('El documento ya existe.', 409)
      const created: Learner = { ...input, id: globalThis.crypto.randomUUID(), created_at: new Date().toISOString() }
      learners = [created, ...learners]
      return { ...created }
    },

    async updateLearner(id: string, input: LearnerUpdate): Promise<Learner> {
      const current = learners.find(item => item.id === id)
      if (!current) throw new ApiError('No se encontró el aprendiz.', 404)
      const updated = { ...current, ...input }
      learners = learners.map(item => item.id === id ? updated : item)
      return { ...updated }
    },

    async cancelLearnerEnrollment(id: string): Promise<void> {
      await this.getLearner(id)
      const current = (learnerEnrollments[id] ?? []).find(item => item.is_current)
      if (!current || current.enrollment_status_id === DEMO_CANCELLED_ENROLLMENT_STATUS_ID) throw new ApiError('No hay inscripción vigente para cancelar.', 400)
      learnerEnrollments[id] = learnerEnrollments[id].map(item => item.id === current.id
        ? { ...item, enrollment_status_id: DEMO_CANCELLED_ENROLLMENT_STATUS_ID } : item)
    },

    async listLearnerFichaEnrollments(id: string): Promise<LearnerFichaEnrollment[]> {
      await this.getLearner(id)
      return (learnerEnrollments[id] ?? []).map(item => ({ ...item }))
    },

    async createLearnerFichaEnrollment(id: string, input: LearnerFichaEnrollmentCreate): Promise<LearnerFichaEnrollment> {
      await this.getLearner(id)
      const previous = learnerEnrollments[id] ?? []
      learnerEnrollments[id] = previous.map(item => item.is_current
        ? { ...item, is_current: false, completion_date: input.enrollment_date } : item)
      const created: LearnerFichaEnrollment = { ...input, id: globalThis.crypto.randomUUID(), learner_id: id,
        is_current: true, completion_date: null, transfer_reason: input.transfer_reason ?? null }
      learnerEnrollments[id] = [created, ...learnerEnrollments[id]]
      return { ...created }
    },
  }
}

export const mockActorsApi = createMockActorsApi()
