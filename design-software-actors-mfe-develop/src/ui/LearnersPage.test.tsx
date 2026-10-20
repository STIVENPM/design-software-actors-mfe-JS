import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import LearnersPage, { type CatalogSelectorProps } from './LearnersPage'
import { actorsApi } from '../infrastructure/actors-api'
import { ApiError } from '../domain/instructor'
import type { Learner, LearnerFichaEnrollment } from '../domain/learner'

vi.mock('../infrastructure/actors-api', () => ({ isDemoMode: false, actorsApi: {
  listLearners: vi.fn(), getLearner: vi.fn(), createLearner: vi.fn(), updateLearner: vi.fn(),
  listLearnerFichaEnrollments: vi.fn(), createLearnerFichaEnrollment: vi.fn(), cancelLearnerEnrollment: vi.fn(),
} }))

const learner: Learner = {
  id: '11111111-1111-4111-8111-111111111111', user_id: '22222222-2222-4222-8222-222222222222',
  document_type: 'TI', document_number: '12345', first_name: 'Ana', last_name: 'López',
  email: 'ana@example.test', phone: '3001234567', birth_date: '2006-01-01', created_at: '2026-01-01T12:00:00',
}
const enrollment: LearnerFichaEnrollment = {
  id: '33333333-3333-4333-8333-333333333333', learner_id: learner.id,
  ficha_id: '44444444-4444-4444-8444-444444444444',
  enrollment_status_id: '55555555-5555-4555-8555-555555555555', stage: 'LECTURE',
  enrollment_date: '2026-02-01', completion_date: null, is_current: true,
}
const cancelledId = '66666666-6666-4666-8666-666666666666'

function FichaSelector({ value, onChange }: CatalogSelectorProps) {
  return <button type="button" onClick={() => onChange({ id: enrollment.ficha_id, label: 'Ficha 2026' })}>{value?.label ?? 'Elegir ficha'}</button>
}
function StatusSelector({ value, onChange }: CatalogSelectorProps) {
  return <button type="button" onClick={() => onChange({ id: enrollment.enrollment_status_id, label: 'Activa' })}>{value?.label ?? 'Elegir estado'}</button>
}
function UserSelector({ value, onChange }: CatalogSelectorProps) {
  return <button type="button" onClick={() => onChange({ id: learner.user_id, label: 'Usuario Ana' })}>{value?.label ?? 'Elegir usuario'}</button>
}

async function openDetail() {
  render(<LearnersPage canManageLearners FichaSelector={FichaSelector} EnrollmentStatusSelector={StatusSelector}
    fichaLabels={{ [enrollment.ficha_id]: 'Ficha 2026' }} enrollmentStatusLabels={{ [enrollment.enrollment_status_id]: 'Activa', [cancelledId]: 'Cancelada' }} cancelledEnrollmentStatusId={cancelledId} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle de Ana López' }))
  return await screen.findByRole('dialog', { name: 'Ana López' })
}

describe('gestión de aprendices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(actorsApi.listLearners).mockResolvedValue({ data: [learner], pagination: { total_items: 1, current_page: 1, total_pages: 1 } })
    vi.mocked(actorsApi.getLearner).mockResolvedValue(learner)
    vi.mocked(actorsApi.listLearnerFichaEnrollments).mockResolvedValue([enrollment])
  })

  it('loads the profile and shows status/date from the enrollment subresource', async () => {
    const detail = await openDetail()
    expect(actorsApi.listLearners).toHaveBeenCalledWith(1)
    expect(screen.getByRole('button', { name: 'Ver detalle de Ana López' })).toHaveTextContent('Ver detalle')
    expect(actorsApi.getLearner).toHaveBeenCalledWith(learner.id)
    expect(actorsApi.listLearnerFichaEnrollments).toHaveBeenCalledWith(learner.id)
    expect(within(detail).getByText('Estado: Activa')).toBeInTheDocument()
    expect(within(detail).getByText('2026-02-01')).toBeInTheDocument()
    expect(within(detail).getByText('Ficha 2026')).toBeInTheDocument()
  })

  it('creates a learner with the generated contract fields', async () => {
    vi.mocked(actorsApi.createLearner).mockResolvedValue({ ...learner, id: '77777777-7777-4777-8777-777777777777', document_number: '67890' })
    render(<LearnersPage canManageLearners UserSelector={UserSelector} />)
    fireEvent.click(await screen.findByRole('button', { name: /Nuevo aprendiz/ }))
    expect(screen.queryByLabelText('ID de usuario IAM')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Elegir usuario' }))
    fireEvent.change(screen.getByLabelText('Número de documento'), { target: { value: '67890' } })
    fireEvent.change(screen.getByLabelText('Nombre(s)'), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText('Apellido(s)'), { target: { value: 'López' } })
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar aprendiz' }))
    await waitFor(() => expect(actorsApi.createLearner).toHaveBeenCalledWith(expect.objectContaining({
      user_id: learner.user_id, document_number: '67890', first_name: 'Ana', last_name: 'López',
    })))
    expect(await screen.findByText('Aprendiz creado correctamente.')).toBeInTheDocument()
  })

  it('requires a shell IAM user selector for learner creation in HTTP mode', async () => {
    render(<LearnersPage canManageLearners />)
    fireEvent.click(await screen.findByRole('button', { name: /Nuevo aprendiz/ }))
    expect(screen.getByText(/El shell debe proporcionar un selector de usuarios IAM/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar aprendiz' })).toBeDisabled()
    expect(actorsApi.createLearner).not.toHaveBeenCalled()
  })

  it('updates a profile without copying enrollment fields into Learner', async () => {
    vi.mocked(actorsApi.updateLearner).mockResolvedValue({ ...learner, phone: '3119990000' })
    const detail = await openDetail()
    fireEvent.click(within(detail).getByRole('button', { name: 'Editar perfil' }))
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '3119990000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar aprendiz' }))
    await waitFor(() => expect(actorsApi.updateLearner).toHaveBeenCalledWith(learner.id, expect.objectContaining({ phone: '3119990000' })))
    expect(vi.mocked(actorsApi.updateLearner).mock.calls[0][1]).not.toHaveProperty('enrollment_status_id')
    expect(vi.mocked(actorsApi.updateLearner).mock.calls[0][1]).not.toHaveProperty('enrollment_date')
    expect(await within(detail).findByText('3119990000')).toBeInTheDocument()
  })

  it('uses shell selectors and sends ficha and status IDs in enrollment POST', async () => {
    vi.mocked(actorsApi.createLearnerFichaEnrollment).mockResolvedValue(enrollment)
    const detail = await openDetail()
    fireEvent.click(within(detail).getByRole('button', { name: 'Elegir ficha' }))
    fireEvent.click(within(detail).getByRole('button', { name: 'Elegir estado' }))
    fireEvent.change(within(detail).getByLabelText('Fecha de inscripción'), { target: { value: '2026-02-01' } })
    fireEvent.click(within(detail).getByRole('button', { name: 'Registrar inscripción' }))
    await waitFor(() => expect(actorsApi.createLearnerFichaEnrollment).toHaveBeenCalledWith(learner.id, {
      ficha_id: enrollment.ficha_id, enrollment_status_id: enrollment.enrollment_status_id,
      stage: 'INDUCTION', enrollment_date: '2026-02-01',
    }))
    expect(await within(detail).findByText('Inscripción registrada correctamente.')).toBeInTheDocument()
  })

  it('requires shell selectors in HTTP mode instead of calling another domain', async () => {
    render(<LearnersPage canManageLearners />)
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle de Ana López' }))
    expect(await screen.findByText(/El shell debe proporcionar los selectores/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar inscripción' })).not.toBeInTheDocument()
    expect(actorsApi.createLearnerFichaEnrollment).not.toHaveBeenCalled()
  })

  it('confirms soft cancellation, retains history, and shows backend error', async () => {
    vi.mocked(actorsApi.cancelLearnerEnrollment)
      .mockRejectedValueOnce(new ApiError('No hay inscripción vigente.', 400)).mockResolvedValueOnce(undefined)
    vi.mocked(actorsApi.listLearnerFichaEnrollments).mockResolvedValueOnce([enrollment])
      .mockResolvedValueOnce([{ ...enrollment, enrollment_status_id: cancelledId }])
    const detail = await openDetail()
    fireEvent.click(within(detail).getByRole('button', { name: 'Cancelar inscripción vigente' }))
    expect(actorsApi.cancelLearnerEnrollment).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'No, conservar' }))
    fireEvent.click(within(detail).getByRole('button', { name: 'Cancelar inscripción vigente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
    expect(await within(detail).findByText('No hay inscripción vigente.')).toBeInTheDocument()
    expect(within(detail).getByText('Estado: Activa')).toBeInTheDocument()
    fireEvent.click(within(detail).getByRole('button', { name: 'Cancelar inscripción vigente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
    expect(await within(detail).findByText(/Inscripción vigente cancelada/)).toBeInTheDocument()
    expect(within(detail).getByText('Estado: Cancelada')).toBeInTheDocument()
    expect(within(detail).queryByRole('button', { name: 'Cancelar inscripción vigente' })).not.toBeInTheDocument()
    expect(actorsApi.cancelLearnerEnrollment).toHaveBeenCalledTimes(2)
  })
})
