import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import type { Instructor } from '../domain/instructor'
import { actorsApi } from '../infrastructure/actors-api'
import { ApiError } from '../domain/instructor'
import type { CompetencySelectorProps } from './App'

vi.mock('../infrastructure/actors-api', () => ({
  isDemoMode: false,
  actorsApi: {
    listInstructors: vi.fn(),
    getInstructor: vi.fn(),
    createInstructor: vi.fn(),
    updateInstructor: vi.fn(),
    deactivateInstructor: vi.fn(),
    listAreas: vi.fn(),
    addArea: vi.fn(),
    listContracts: vi.fn(),
    addContract: vi.fn(),
    closeContract: vi.fn(),
    listInstructorCompetencies: vi.fn(),
    addInstructorCompetency: vi.fn(),
    removeInstructorCompetency: vi.fn(),
  },
}))

const instructor: Instructor = {
  id: 'inst-1',
  first_name: 'Juan',
  last_name: 'Pérez',
  full_name: 'Juan Pérez',
  document_number: '1075421336',
  email: 'juan.perez@sena.edu.co',
  phone: '3001234567',
  status: 'active',
}

const assignment = {
  id: 'assignment-1',
  instructor_id: 'inst-1',
  competency_id: 'competency-1',
  certified_at: '2026-01-15',
  certification_entity: 'SENA',
  is_active: true,
  created_at: '2026-01-16T00:00:00Z',
}

function TestSelector({ value, onChange, disabled }: CompetencySelectorProps) {
  return <button type="button" disabled={disabled} onClick={() => onChange({ id: 'competency-1', label: 'Desarrollo de software' })}>
    {value?.label ?? 'Elegir competencia'}
  </button>
}

async function openCompetencies(canManageCompetencies = true) {
  render(<App CompetencySelector={TestSelector} canManageCompetencies={canManageCompetencies} />)
  await screen.findByText('Juan Pérez')
  fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }))
  fireEvent.click(screen.getByRole('tab', { name: 'Competencias' }))
}

describe('instructor administration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(actorsApi.listInstructors).mockResolvedValue([instructor])
    vi.mocked(actorsApi.getInstructor).mockResolvedValue(instructor)
    vi.mocked(actorsApi.listAreas).mockResolvedValue([])
    vi.mocked(actorsApi.listContracts).mockResolvedValue([])
    vi.mocked(actorsApi.listInstructorCompetencies).mockResolvedValue([])
  })

  it('loads server-scoped results and sends status changes to the backend', async () => {
    render(<App />)

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(actorsApi.listInstructors).toHaveBeenCalledWith('active')

    fireEvent.click(screen.getByRole('button', { name: 'Inactivos' }))
    await waitFor(() => expect(actorsApi.listInstructors).toHaveBeenLastCalledWith('inactive'))
    expect(screen.getByText(/Alcance de acceso/)).toBeInTheDocument()
  })

  it('creates an instructor and keeps full_name derived and read-only', async () => {
    vi.mocked(actorsApi.createInstructor).mockResolvedValue({
      ...instructor,
      id: 'inst-2',
      first_name: 'Laura',
      last_name: 'Gómez',
      full_name: 'Laura Gómez',
    })
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Nuevo instructor/ }))
    fireEvent.change(screen.getByLabelText('Nombre(s)'), { target: { value: 'Laura' } })
    fireEvent.change(screen.getByLabelText('Apellido(s)'), { target: { value: 'Gómez' } })
    expect(screen.getByLabelText('Nombre completo derivado')).toHaveValue('Laura Gómez')
    expect(screen.getByLabelText('Nombre completo derivado')).toHaveAttribute('readonly')
    fireEvent.change(screen.getByLabelText('Número de documento'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'laura@sena.edu.co' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))

    await waitFor(() => expect(actorsApi.createInstructor).toHaveBeenCalledWith({
      first_name: 'Laura',
      last_name: 'Gómez',
      document_number: '123456',
      email: 'laura@sena.edu.co',
      phone: '',
    }))
    expect(await screen.findByText('Instructor creado correctamente.')).toBeInTheDocument()
  })

  it('updates an existing instructor profile', async () => {
    vi.mocked(actorsApi.updateInstructor).mockResolvedValue({
      ...instructor,
      phone: '3117654321',
    })
    render(<App />)
    await screen.findByText('Juan Pérez')

    fireEvent.click(screen.getByRole('button', { name: 'Editar Juan Pérez' }))
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '3117654321' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))

    await waitFor(() => expect(actorsApi.updateInstructor).toHaveBeenCalledWith('inst-1', {
      first_name: 'Juan',
      last_name: 'Pérez',
      document_number: '1075421336',
      email: 'juan.perez@sena.edu.co',
      phone: '3117654321',
    }))
    expect(await screen.findByText('Perfil actualizado correctamente.')).toBeInTheDocument()
  })

  it('soft-deletes an instructor and allows its inactive status to be viewed', async () => {
    vi.mocked(actorsApi.listInstructors).mockImplementation(async status => (
      status === 'inactive' ? [{ ...instructor, status: 'inactive' }] : [instructor]
    ))
    render(<App />)
    await screen.findByText('Juan Pérez')
    fireEvent.click(screen.getByRole('button', { name: 'Inactivar Juan Pérez' }))
    fireEvent.click(screen.getByRole('button', { name: 'Inactivar perfil' }))

    await waitFor(() => expect(actorsApi.deactivateInstructor).toHaveBeenCalledWith('inst-1'))
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Inactivos' }))
    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
  })

  it('shows instructor areas and contracts in their detail tabs', async () => {
    vi.mocked(actorsApi.listAreas).mockResolvedValue([
      { id: 'area-1', name: 'Desarrollo de software', is_primary: true },
    ])
    vi.mocked(actorsApi.listContracts).mockResolvedValue([
      {
        id: 'contract-1',
        contract_type: 'STAFF',
        start_date: '2026-01-01',
        end_date: null,
        weekly_hour_limit: 40,
        is_current: true,
      },
    ])
    render(<App />)
    await screen.findByText('Juan Pérez')
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }))
    await waitFor(() => expect(actorsApi.getInstructor).toHaveBeenCalledWith('inst-1'))
    await waitFor(() => expect(actorsApi.listAreas).toHaveBeenCalledWith('inst-1'))
    await waitFor(() => expect(actorsApi.listContracts).toHaveBeenCalledWith('inst-1'))

    fireEvent.click(screen.getByRole('tab', { name: /reas/ }))
    expect(await screen.findByText('Desarrollo de software')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Contratos/ }))
    expect(await screen.findByText('STAFF')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear contrato' })).toBeDisabled()
  })

  it('loads only active competency assignments in the instructor details', async () => {
    vi.mocked(actorsApi.listInstructorCompetencies).mockResolvedValue([assignment, { ...assignment, id: 'assignment-2', is_active: false }])
    await openCompetencies()

    expect(await screen.findByText('Competencia competency-1')).toBeInTheDocument()
    expect(actorsApi.listInstructorCompetencies).toHaveBeenCalledWith('inst-1')
    expect(screen.getByText(/Certificada:.*2026.*SENA/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Revocar' })).toHaveLength(1)
  })

  it('shows a loading state until assignments arrive', async () => {
    let resolveList!: (items: typeof assignment[]) => void
    vi.mocked(actorsApi.listInstructorCompetencies).mockImplementation(() => new Promise(resolve => { resolveList = resolve }))
    await openCompetencies()
    expect(screen.getByText('Cargando competencias…')).toBeInTheDocument()
    resolveList([assignment])
    expect(await screen.findByText('Competencia competency-1')).toBeInTheDocument()
  })

  it('adds the assignment returned by POST 201 and keeps the shell selection label', async () => {
    vi.mocked(actorsApi.addInstructorCompetency).mockResolvedValue(assignment)
    await openCompetencies()
    await screen.findByText('No hay competencias activas asignadas.')

    fireEvent.click(screen.getByRole('button', { name: 'Elegir competencia' }))
    fireEvent.change(screen.getByLabelText('Fecha de certificación'), { target: { value: '2026-01-15' } })
    fireEvent.change(screen.getByLabelText('Entidad certificadora'), { target: { value: 'SENA' } })
    fireEvent.click(screen.getByRole('button', { name: 'Asignar competencia' }))

    await waitFor(() => expect(actorsApi.addInstructorCompetency).toHaveBeenCalledWith('inst-1', {
      competency_id: 'competency-1', certified_at: '2026-01-15', certification_entity: 'SENA',
    }))
    expect(await screen.findByText('Desarrollo de software')).toBeInTheDocument()
    expect(screen.getByText('Competencia asignada correctamente.')).toBeInTheDocument()
  })

  it('shows duplicate active assignment 409 inline and preserves the form', async () => {
    vi.mocked(actorsApi.addInstructorCompetency).mockRejectedValue(new ApiError('La competencia ya está activa.', 409))
    await openCompetencies()
    fireEvent.click(screen.getByRole('button', { name: 'Elegir competencia' }))
    fireEvent.change(screen.getByLabelText('Fecha de certificación'), { target: { value: '2026-01-15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Asignar competencia' }))

    expect(await screen.findByRole('alert', { name: '' })).toHaveTextContent('La competencia ya está activa.')
    expect(screen.getByRole('button', { name: 'Desarrollo de software' })).toBeInTheDocument()
    expect(screen.queryByText('Competencia asignada correctamente.')).not.toBeInTheDocument()
  })

  it('revokes by assignment ID and updates the active list after DELETE 204', async () => {
    vi.mocked(actorsApi.listInstructorCompetencies).mockResolvedValue([assignment])
    vi.mocked(actorsApi.removeInstructorCompetency).mockResolvedValue(undefined)
    await openCompetencies()
    fireEvent.click(await screen.findByRole('button', { name: 'Revocar' }))

    await waitFor(() => expect(actorsApi.removeInstructorCompetency).toHaveBeenCalledWith('inst-1', 'assignment-1'))
    expect(await screen.findByText('No hay competencias activas asignadas.')).toBeInTheDocument()
    expect(screen.getByText('Competencia revocada correctamente.')).toBeInTheDocument()
  })

  it('keeps the assignment visible when revocation fails', async () => {
    vi.mocked(actorsApi.listInstructorCompetencies).mockResolvedValue([assignment])
    vi.mocked(actorsApi.removeInstructorCompetency).mockRejectedValue(new ApiError('Acceso denegado.', 403))
    await openCompetencies()
    fireEvent.click(await screen.findByRole('button', { name: 'Revocar' }))
    expect(await screen.findByText('Acceso denegado.')).toBeInTheDocument()
    expect(screen.getByText('Competencia competency-1')).toBeInTheDocument()
  })

  it('keeps competencies read-only without the manage feature', async () => {
    vi.mocked(actorsApi.listInstructorCompetencies).mockResolvedValue([assignment])
    await openCompetencies(false)
    expect(await screen.findByText('Competencia competency-1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revocar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Asignar competencia' })).not.toBeInTheDocument()
  })

  it('shows a retry action when competency loading fails', async () => {
    vi.mocked(actorsApi.listInstructorCompetencies).mockRejectedValueOnce(new Error('Servicio no disponible')).mockResolvedValueOnce([assignment])
    await openCompetencies()
    expect(await screen.findByText('Servicio no disponible')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Competencia competency-1')).toBeInTheDocument()
  })
})
