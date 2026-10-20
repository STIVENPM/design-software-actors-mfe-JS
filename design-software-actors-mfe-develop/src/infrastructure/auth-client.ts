import type { operations } from '../generated/iam'
import { ApiError } from '../domain/instructor'
import { demoModeEnabled } from './api-mode'
import { DEMO_INSTRUCTOR_ID } from './mock-actors-api'

export type CurrentUser = operations['getMe']['responses'][200]['content']['application/json']

const IAM_API_BASE_URL = (import.meta.env.VITE_IAM_API_BASE_URL || '/api/v1').replace(/\/$/, '')

const DEMO_USER: CurrentUser = {
  id: '99999999-9999-4999-8999-999999999999',
  email: 'juan.perez@example.test',
  full_name: 'Juan Pérez',
  actor_type: 'INSTRUCTOR',
  actor_id: DEMO_INSTRUCTOR_ID,
  roles: [{ name: 'INSTRUCTOR' }],
  features: [],
  modules: ['MOD_ACTORS'],
}

export const AuthClient = {
  async currentUser(): Promise<CurrentUser> {
    if (demoModeEnabled()) return DEMO_USER
    const response = await fetch(`${IAM_API_BASE_URL}/auth/me`, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
    if (!response.ok) {
      throw new ApiError(response.status === 401
        ? 'La sesión expiró. Inicia sesión nuevamente.'
        : `No fue posible consultar la sesión (${response.status}).`, response.status)
    }
    return response.json() as Promise<CurrentUser>
  },
}
