import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import DevShell from './DevShell'

describe('DevShell (marco dev-only)', () => {
  it('muestra topbar, menú con Estados de actores activo y el contenido', () => {
    render(
      <DevShell activeHref="/admin/parametrizacion/estados">
        <p>Contenido hijo</p>
      </DevShell>,
    )
    expect(screen.getByText('SENA — Gestión de Horarios')).toBeDefined()
    expect(screen.getByText('Contenido hijo')).toBeDefined()
    const active = screen.getByRole('link', { name: 'Estados de actores' })
    expect(active.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Instructores' })).toBeDefined()
  })
})
