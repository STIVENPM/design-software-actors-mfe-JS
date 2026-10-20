import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthClient } from './auth-client'
import { ApiError } from '../domain/instructor'
import { DEMO_INSTRUCTOR_ID, mockActorsApi } from './mock-actors-api'

describe('GET /auth/me', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('provides a demo instructor session matching the mock actors data without contacting IAM', async () => {
    vi.stubEnv('VITE_ACTORS_API_MODE', 'mock')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = await AuthClient.currentUser()
    expect(user).toMatchObject({ actor_type: 'INSTRUCTOR', actor_id: DEMO_INSTRUCTOR_ID, roles: [{ name: 'INSTRUCTOR' }] })
    expect(await mockActorsApi.getInstructor(user.actor_id!)).toMatchObject({ id: DEMO_INSTRUCTOR_ID, full_name: user.full_name })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reads the authenticated actor mapping from the session response', async () => {
    vi.stubEnv('VITE_ACTORS_API_MODE', 'http')
    const session = { id: 'user-id', actor_type: 'INSTRUCTOR', actor_id: 'instructor-id', roles: [{ name: 'INSTRUCTOR' }] }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(session), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await AuthClient.currentUser()).toEqual(session)
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/me', expect.objectContaining({ credentials: 'same-origin' }))
  })

  it.each([401, 403, 404])('does not fall back to demo on HTTP %i', async status => {
    vi.stubEnv('VITE_ACTORS_API_MODE', 'http')
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(AuthClient.currentUser()).rejects.toEqual(new ApiError(status === 401
      ? 'La sesión expiró. Inicia sesión nuevamente.'
      : `No fue posible consultar la sesión (${status}).`, status))
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
