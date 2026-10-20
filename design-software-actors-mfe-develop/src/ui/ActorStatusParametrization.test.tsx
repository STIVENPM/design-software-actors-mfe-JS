import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import ActorStatusParametrization from './ActorStatusParametrization'
import { actorStatusApi } from '../infrastructure/actor-status-api'

vi.mock('../infrastructure/actor-status-api', async importOriginal => {
  const original = await importOriginal<typeof import('../infrastructure/actor-status-api')>()
  return { ...original, actorStatusApi: original.mockActorStatusApi }
})

describe('ActorStatusParametrization (HU actores, mock quemado)', () => {
  it('E1: abre en Estados con filas, badges y conteo del mockup', async () => {
    render(<ActorStatusParametrization />)
    expect(await screen.findByText('INSTR_ACTIVE')).toBeDefined()
    expect(screen.getByText('En comisión')).toBeDefined()
    expect(screen.getByText('Total: 12')).toBeDefined()
    // Acciones presentes pero deshabilitadas (sin endpoints de escritura).
    expect(screen.getByRole('button', { name: /nuevo estado/i })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: /editar/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /editar/i })[0]).toBeDisabled()
  })

  it('cambia a Categorías y Transiciones sin recargar', async () => {
    render(<ActorStatusParametrization />)
    await screen.findByText('INSTR_ACTIVE')

    fireEvent.click(screen.getByRole('tab', { name: 'Categorías' }))
    expect(await screen.findByText('INSTRUCTOR_STATUS')).toBeDefined()
    expect(screen.getByText('Ciclo de vida del instructor frente a la programación académica.')).toBeDefined()

    fireEvent.click(screen.getByRole('tab', { name: 'Transiciones' }))
    expect(await screen.findByText('PRODUCTIVE_STAGE_ASSIGN')).toBeDefined()
    expect(screen.getAllByText('Libre')).toHaveLength(3)
    const row = screen.getByText('PRODUCTIVE_STAGE_ASSIGN').closest('tr')
    if (!row) throw new Error('expected row')
    expect(within(row).getByText('En etapa productiva')).toBeDefined()
  })

  it('muestra error con reintento si falla la carga', async () => {
    const spy = vi.spyOn(actorStatusApi, 'listStatuses').mockRejectedValueOnce(new Error('Caído'))
    try {
      render(<ActorStatusParametrization />)
      expect(await screen.findByText('Caído')).toBeDefined()
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDefined()
    } finally {
      spy.mockRestore()
    }
  })
})
