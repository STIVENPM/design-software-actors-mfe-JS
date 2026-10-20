import { ApiError } from '../domain/instructor'
import type {
  ActorStatus,
  ActorStatusCategory,
  ActorStatusTransition,
} from '../domain/actor-status'
import { toActorStatus, toActorStatusCategory } from '../domain/actor-status'
import { demoModeEnabled } from './api-mode'

const API_BASE_URL = (import.meta.env.VITE_ACTORS_API_BASE_URL || '/api/v1').replace(/\/$/, '')

/**
 * Catálogos de estados de actores (`actors_parameterization.status*`).
 *
 * DoR resuelto desde docs + backend (no inventar rutas):
 * - Categorías y estados viven en actors-service: `GET /catalogs`
 *   (listActorCatalogs) para poblar el selector/tabla y
 *   `GET /catalogs/{catalog_id}/details` (listActorCatalogDetails) con el ID
 *   del catálogo para listar sus estados. NADA de `/statuses` ni
 *   `/actor-states` (el backend responde 404). La alternativa de
 *   reference-data (E2) es innecesaria: el dueño es actors-service.
 * - Transiciones (`status_transition`) NO tienen endpoint en ningún contrato:
 *   el HTTP lanza 501 explícito y el mock aporta quemados del mockup v2.
 * - Base URL desde VITE_ACTORS_API_BASE_URL (por defecto /api/v1).
 */

interface StatusCatalogs {
  listCategories(): Promise<ActorStatusCategory[]>
  listStatuses(): Promise<ActorStatus[]>
  listTransitions(): Promise<ActorStatusTransition[]>
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new ApiError(body?.error?.message || `La solicitud falló (${response.status}).`, response.status)
  }
  return response.json() as Promise<T>
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export const httpActorStatusApi: StatusCatalogs = {
  async listCategories(): Promise<ActorStatusCategory[]> {
    const data = await request<unknown>('/catalogs')
    return asArray(data)
      .map(item => toActorStatusCategory(item))
      .filter((item): item is ActorStatusCategory => item !== null)
  },

  async listStatuses(): Promise<ActorStatus[]> {
    const categories = await this.listCategories()
    const perCategory = await Promise.all(categories.map(async category => {
      // El backend pide el ID del catálogo; si un payload viejo solo trae
      // code, se usa como fallback para no romper.
      const catalogId = category.id || category.code
      const data = await request<unknown>(`/catalogs/${encodeURIComponent(catalogId)}/details`)
      return asArray(data)
        .map(item => toActorStatus(item, category.code, category.name))
        .filter((item): item is ActorStatus => item !== null)
    }))
    return perCategory.flat()
  },

  async listTransitions(): Promise<ActorStatusTransition[]> {
    throw new ApiError(
      'Las transiciones aún no tienen endpoint confirmado en actors-service (DoR abierto).',
      501,
    )
  },
}

const MOCK_CATEGORIES: ActorStatusCategory[] = [
  { id: 'cat-01', code: 'INSTRUCTOR_STATUS', name: 'Estado de instructor', description: 'Ciclo de vida del instructor frente a la programación académica.', appliesTo: 'INSTRUCTOR', isActive: true },
  { id: 'cat-02', code: 'LEARNER_STATUS', name: 'Estado de aprendiz', description: 'Ciclo de vida del aprendiz dentro de la ficha de formación.', appliesTo: 'LEARNER', isActive: true },
  { id: 'cat-03', code: 'COMPANY_STATUS', name: 'Estado de empresa', description: 'Estado de la empresa patrocinadora para etapa productiva.', appliesTo: 'COMPANY', isActive: true },
  { id: 'cat-04', code: 'PRODUCTIVE_STAGE_STATUS', name: 'Estado de etapa productiva', description: 'Avance del aprendiz durante la etapa productiva.', appliesTo: 'PRODUCTIVE_STAGE', isActive: true },
]

const MOCK_STATUSES: ActorStatus[] = [
  { categoryCode: 'INSTRUCTOR_STATUS', categoryName: 'Estado de instructor', code: 'INSTR_ACTIVE', name: 'Activo', isInitial: true, isTerminal: false, displayOrder: 1, colorHex: '#16A34A', isActive: true },
  { categoryCode: 'INSTRUCTOR_STATUS', categoryName: 'Estado de instructor', code: 'INSTR_ON_LEAVE', name: 'En comisión', isInitial: false, isTerminal: false, displayOrder: 2, colorHex: '#F59E0B', isActive: true },
  { categoryCode: 'INSTRUCTOR_STATUS', categoryName: 'Estado de instructor', code: 'INSTR_INACTIVE', name: 'Inactivo', isInitial: false, isTerminal: true, displayOrder: 3, colorHex: '#6B7280', isActive: true },
  { categoryCode: 'LEARNER_STATUS', categoryName: 'Estado de aprendiz', code: 'LRN_IN_TRAINING', name: 'En formación', isInitial: true, isTerminal: false, displayOrder: 1, colorHex: '#2563EB', isActive: true },
  { categoryCode: 'LEARNER_STATUS', categoryName: 'Estado de aprendiz', code: 'LRN_PRODUCTIVE', name: 'En etapa productiva', isInitial: false, isTerminal: false, displayOrder: 2, colorHex: '#F59E0B', isActive: true },
  { categoryCode: 'LEARNER_STATUS', categoryName: 'Estado de aprendiz', code: 'LRN_CERTIFIED', name: 'Certificado', isInitial: false, isTerminal: true, displayOrder: 3, colorHex: '#16A34A', isActive: true },
  { categoryCode: 'LEARNER_STATUS', categoryName: 'Estado de aprendiz', code: 'LRN_WITHDRAWN', name: 'Retirado', isInitial: false, isTerminal: true, displayOrder: 4, colorHex: '#DC2626', isActive: true },
  { categoryCode: 'COMPANY_STATUS', categoryName: 'Estado de empresa', code: 'CMP_APPROVED', name: 'Aprobada', isInitial: true, isTerminal: false, displayOrder: 1, colorHex: '#16A34A', isActive: true },
  { categoryCode: 'COMPANY_STATUS', categoryName: 'Estado de empresa', code: 'CMP_SUSPENDED', name: 'Suspendida', isInitial: false, isTerminal: false, displayOrder: 2, colorHex: '#F59E0B', isActive: true },
  { categoryCode: 'PRODUCTIVE_STAGE_STATUS', categoryName: 'Estado de etapa productiva', code: 'PS_STARTED', name: 'Iniciada', isInitial: true, isTerminal: false, displayOrder: 1, colorHex: '#2563EB', isActive: true },
  { categoryCode: 'PRODUCTIVE_STAGE_STATUS', categoryName: 'Estado de etapa productiva', code: 'PS_FOLLOW_UP', name: 'En seguimiento', isInitial: false, isTerminal: false, displayOrder: 2, colorHex: '#F59E0B', isActive: true },
  { categoryCode: 'PRODUCTIVE_STAGE_STATUS', categoryName: 'Estado de etapa productiva', code: 'PS_FINISHED', name: 'Finalizada', isInitial: false, isTerminal: true, displayOrder: 3, colorHex: '#16A34A', isActive: true },
]

const MOCK_TRANSITIONS: ActorStatusTransition[] = [
  { categoryCode: 'LEARNER_STATUS', categoryName: 'Estado de aprendiz', fromName: 'En formación', toName: 'En etapa productiva', requiredFeature: 'PRODUCTIVE_STAGE_ASSIGN', isActive: true },
  { categoryCode: 'LEARNER_STATUS', categoryName: 'Estado de aprendiz', fromName: 'En etapa productiva', toName: 'Certificado', requiredFeature: 'LEARNER_CERTIFY', isActive: true },
  { categoryCode: 'LEARNER_STATUS', categoryName: 'Estado de aprendiz', fromName: 'En formación', toName: 'Retirado', requiredFeature: 'LEARNER_WITHDRAW', isActive: true },
  { categoryCode: 'INSTRUCTOR_STATUS', categoryName: 'Estado de instructor', fromName: 'Activo', toName: 'En comisión', requiredFeature: null, isActive: true },
  { categoryCode: 'INSTRUCTOR_STATUS', categoryName: 'Estado de instructor', fromName: 'En comisión', toName: 'Activo', requiredFeature: null, isActive: true },
  { categoryCode: 'INSTRUCTOR_STATUS', categoryName: 'Estado de instructor', fromName: 'Activo', toName: 'Inactivo', requiredFeature: 'INSTRUCTOR_DEACTIVATE', isActive: true },
  { categoryCode: 'COMPANY_STATUS', categoryName: 'Estado de empresa', fromName: 'Aprobada', toName: 'Suspendida', requiredFeature: 'COMPANY_SUSPEND', isActive: true },
  { categoryCode: 'PRODUCTIVE_STAGE_STATUS', categoryName: 'Estado de etapa productiva', fromName: 'Iniciada', toName: 'En seguimiento', requiredFeature: null, isActive: true },
  { categoryCode: 'PRODUCTIVE_STAGE_STATUS', categoryName: 'Estado de etapa productiva', fromName: 'En seguimiento', toName: 'Finalizada', requiredFeature: 'PRODUCTIVE_STAGE_CLOSE', isActive: true },
]

export const mockActorStatusApi: StatusCatalogs = {
  async listCategories(): Promise<ActorStatusCategory[]> {
    return MOCK_CATEGORIES.map(item => ({ ...item }))
  },

  async listStatuses(): Promise<ActorStatus[]> {
    return MOCK_STATUSES.map(item => ({ ...item }))
  },

  async listTransitions(): Promise<ActorStatusTransition[]> {
    return MOCK_TRANSITIONS.map(item => ({ ...item }))
  },
}

export const actorStatusApi = demoModeEnabled() ? mockActorStatusApi : httpActorStatusApi
