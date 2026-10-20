import { useEffect, useState, type ComponentType, type FormEvent } from 'react'
import { BookOpen, GraduationCap, Plus, UserRound } from 'lucide-react'
import { useLearners } from '../application/useLearners'
import { useLearnerFichaEnrollments } from '../application/useLearnerFichaEnrollments'
import type { Learner, LearnerCreate, LearnerFichaEnrollmentCreate, LearnerUpdate } from '../domain/learner'
import { actorsApi, isDemoMode } from '../infrastructure/actors-api'
import { DEMO_ACTIVE_ENROLLMENT_STATUS_ID, DEMO_CANCELLED_ENROLLMENT_STATUS_ID, DEMO_FICHA_ID } from '../infrastructure/mock-actors-api'

export interface CatalogSelection { id: string; label: string }
export interface CatalogSelectorProps {
  value: CatalogSelection | null
  onChange: (value: CatalogSelection | null) => void
  disabled?: boolean
}
export interface LearnersPageProps {
  UserSelector?: ComponentType<CatalogSelectorProps>
  FichaSelector?: ComponentType<CatalogSelectorProps>
  EnrollmentStatusSelector?: ComponentType<CatalogSelectorProps>
  fichaLabels?: Record<string, string>
  enrollmentStatusLabels?: Record<string, string>
  cancelledEnrollmentStatusId?: string
  canManageLearners?: boolean
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function demoUserId(): string {
  return globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.floor(Math.random() * 16)
    return (char === 'x' ? value : (value & 3) | 8).toString(16)
  })
}
const EMPTY: LearnerCreate = {
  user_id: '', document_type: 'CC', document_number: '', first_name: '', last_name: '', email: '',
}
const STAGES: { value: LearnerFichaEnrollmentCreate['stage']; label: string }[] = [
  { value: 'INDUCTION', label: 'Inducción' }, { value: 'LECTURE', label: 'Lectiva' },
  { value: 'PRODUCTIVE', label: 'Productiva' },
]

function DemoFichaSelector({ value, onChange, disabled }: CatalogSelectorProps) {
  return <select aria-label="Ficha" disabled={disabled} value={value?.id ?? ''} onChange={event => onChange(event.target.value ? { id: event.target.value, label: 'Ficha de demostración' } : null)}>
    <option value="">Selecciona una ficha</option><option value={DEMO_FICHA_ID}>Ficha de demostración</option>
  </select>
}

function DemoStatusSelector({ value, onChange, disabled }: CatalogSelectorProps) {
  return <select aria-label="Estado de inscripción" disabled={disabled} value={value?.id ?? ''} onChange={event => onChange(event.target.value ? { id: event.target.value, label: 'Activa' } : null)}>
    <option value="">Selecciona el estado</option><option value={DEMO_ACTIVE_ENROLLMENT_STATUS_ID}>Activa</option>
  </select>
}

function LearnerForm({ learner, saving, error, UserSelector, onSave, onClose }: {
  learner: Learner | null; saving: boolean; error: string
  UserSelector?: ComponentType<CatalogSelectorProps>
  onSave: (input: LearnerCreate | LearnerUpdate) => Promise<void>; onClose: () => void
}) {
  const [form, setForm] = useState<LearnerCreate>(() => learner ? {
    user_id: learner.user_id, document_type: learner.document_type, document_number: learner.document_number,
    first_name: learner.first_name, last_name: learner.last_name, email: learner.email,
    phone: learner.phone ?? '', birth_date: learner.birth_date ?? '',
  } : { ...EMPTY, user_id: isDemoMode ? demoUserId() : '' })
  const [userSelection, setUserSelection] = useState<CatalogSelection | null>(null)
  const [validation, setValidation] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!learner && !UUID.test(form.user_id)) { setValidation('Ingresa un ID de usuario IAM válido.'); return }
    if (![form.document_number, form.first_name, form.last_name, form.email].every(value => value.trim())) {
      setValidation('Completa los datos obligatorios del aprendiz.'); return
    }
    setValidation('')
    const common: LearnerUpdate = { document_type: form.document_type, document_number: form.document_number.trim(),
      first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim(),
      phone: form.phone?.trim() ?? '', birth_date: form.birth_date || undefined }
    await onSave(learner ? common : { ...common, user_id: form.user_id } as LearnerCreate)
  }

  return <div className="dialog-backdrop"><section className="dialog learner-dialog" role="dialog" aria-modal="true" aria-labelledby="learner-form-title">
    <div className="dialog-heading"><h2 id="learner-form-title">{learner ? 'Editar aprendiz' : 'Nuevo aprendiz'}</h2><button type="button" className="icon-button" aria-label="Cerrar formulario" onClick={onClose}>×</button></div>
    <form onSubmit={event => void submit(event)} className="learner-form">
      <div className="form-grid">
        {!learner && (isDemoMode
          ? <p className="full-width form-hint">Se asignará automáticamente un usuario ficticio para esta demostración.</p>
          : UserSelector ? <div className="catalog-picker full-width" role="group" aria-label="Usuario IAM"><span>Usuario IAM</span><UserSelector value={userSelection} onChange={selection => { setUserSelection(selection); setForm(current => ({ ...current, user_id: selection?.id ?? '' })) }} disabled={saving} /></div>
            : <p className="full-width form-hint">El shell debe proporcionar un selector de usuarios IAM para crear aprendices.</p>)}
        <label>Tipo de documento<select value={form.document_type} onChange={event => setForm(current => ({ ...current, document_type: event.target.value as LearnerCreate['document_type'] }))}><option>CC</option><option>CE</option><option>RC</option><option>TI</option></select></label>
        <label>Número de documento<input required maxLength={20} value={form.document_number} onChange={event => setForm(current => ({ ...current, document_number: event.target.value }))} /></label>
        <label>Nombre(s)<input required maxLength={100} value={form.first_name} onChange={event => setForm(current => ({ ...current, first_name: event.target.value }))} /></label>
        <label>Apellido(s)<input required maxLength={100} value={form.last_name} onChange={event => setForm(current => ({ ...current, last_name: event.target.value }))} /></label>
        <label>Correo electrónico<input type="email" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></label>
        <label>Teléfono<input maxLength={20} value={form.phone ?? ''} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} /></label>
        <label>Fecha de nacimiento<input type="date" value={form.birth_date ?? ''} onChange={event => setForm(current => ({ ...current, birth_date: event.target.value }))} /></label>
      </div>
      {(validation || error) && <p className="field-error" role="alert">{validation || error}</p>}
      <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cerrar</button><button type="submit" className="button btn-primary" disabled={saving || (!learner && !isDemoMode && !UserSelector)}>{saving ? 'Guardando…' : 'Guardar aprendiz'}</button></div>
    </form>
  </section></div>
}

function LearnerDetail({ learnerId, onClose, onUpdated, FichaSelector, EnrollmentStatusSelector, fichaLabels, enrollmentStatusLabels, cancelledEnrollmentStatusId, canManage }: {
  learnerId: string; onClose: () => void; onUpdated: (learner: Learner) => void
  FichaSelector?: ComponentType<CatalogSelectorProps>; EnrollmentStatusSelector?: ComponentType<CatalogSelectorProps>
  fichaLabels: Record<string, string>; enrollmentStatusLabels: Record<string, string>; cancelledEnrollmentStatusId?: string; canManage: boolean
}) {
  const [learner, setLearner] = useState<Learner | null>(null)
  const [profileError, setProfileError] = useState('')
  const [editing, setEditing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [notice, setNotice] = useState('')
  const [ficha, setFicha] = useState<CatalogSelection | null>(null)
  const [status, setStatus] = useState<CatalogSelection | null>(null)
  const [stage, setStage] = useState<LearnerFichaEnrollmentCreate['stage']>('INDUCTION')
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelledEnrollmentId, setCancelledEnrollmentId] = useState<string | null>(null)
  const enrollments = useLearnerFichaEnrollments(learnerId)
  const FichaInput = FichaSelector ?? (isDemoMode ? DemoFichaSelector : null)
  const StatusInput = EnrollmentStatusSelector ?? (isDemoMode ? DemoStatusSelector : null)

  useEffect(() => {
    let live = true
    void actorsApi.getLearner(learnerId).then(item => { if (live) setLearner(item) })
      .catch(cause => { if (live) setProfileError(cause instanceof Error ? cause.message : 'No fue posible cargar el perfil.') })
    return () => { live = false }
  }, [learnerId])

  async function saveProfile(input: LearnerUpdate) {
    setUpdating(true); setUpdateError('')
    try {
      const saved = await actorsApi.updateLearner(learnerId, input)
      setLearner(saved); onUpdated(saved); setEditing(false); setNotice('Perfil actualizado correctamente.')
    } catch (cause) { setUpdateError(cause instanceof Error ? cause.message : 'No fue posible actualizar el perfil.') }
    finally { setUpdating(false) }
  }

  async function createEnrollment(event: FormEvent) {
    event.preventDefault()
    if (!ficha || !status || !date || !UUID.test(ficha.id) || !UUID.test(status.id)) return
    const saved = await enrollments.create({ ficha_id: ficha.id, enrollment_status_id: status.id,
      stage, enrollment_date: date, ...(reason.trim() ? { transfer_reason: reason.trim() } : {}) })
    if (saved) { setNotice('Inscripción registrada correctamente.'); setFicha(null); setStatus(null); setDate(''); setReason('') }
  }

  async function cancelEnrollment() {
    setConfirmCancel(false)
    if (await enrollments.cancelCurrent()) { setCancelledEnrollmentId(current?.id ?? null); setNotice('Inscripción vigente cancelada; el historial se conserva.') }
  }

  const current = enrollments.enrollments.find(item => item.is_current)
  return <div className="dialog-backdrop"><section className="dialog details-dialog learner-detail" role="dialog" aria-modal="true" aria-labelledby="learner-detail-title">
    <div className="dialog-heading"><div><span className="eyebrow">PERFIL DE APRENDIZ</span><h2 id="learner-detail-title">{learner ? `${learner.first_name} ${learner.last_name}` : 'Aprendiz'}</h2></div><button className="icon-button" type="button" aria-label="Cerrar detalle" onClick={onClose}>×</button></div>
    {profileError && <p className="error-banner" role="alert">{profileError}</p>}
    {!learner && !profileError && <p role="status">Cargando perfil…</p>}
    {learner && <><dl className="learner-profile-grid">
      <div><dt>Documento</dt><dd>{learner.document_type} {learner.document_number}</dd></div>
      <div><dt>Correo</dt><dd>{learner.email}</dd></div><div><dt>Teléfono</dt><dd>{learner.phone || '—'}</dd></div>
      <div><dt>Fecha de nacimiento</dt><dd>{learner.birth_date || '—'}</dd></div>
    </dl>{canManage && <button type="button" className="button button-secondary" onClick={() => setEditing(true)}>Editar perfil</button>}</>}
    {notice && <p className="notice learner-notice" role="status">{notice}</p>}
    <section className="learner-enrollments" aria-labelledby="learner-enrollments-title"><h3 id="learner-enrollments-title">Inscripciones en ficha</h3>
      {enrollments.error && <p className="error-banner" role="alert">{enrollments.error} <button type="button" onClick={() => void enrollments.refresh()}>Reintentar</button></p>}
      {enrollments.cancelError && <p className="error-banner" role="alert">{enrollments.cancelError}</p>}
      {enrollments.loading ? <p role="status">Cargando inscripciones…</p> : enrollments.enrollments.length ? <ul className="learner-enrollment-list">{enrollments.enrollments.map(item => <li key={item.id}>
        <strong>{fichaLabels[item.ficha_id] ?? (item.ficha_id === DEMO_FICHA_ID && isDemoMode ? 'Ficha de demostración' : `Ficha ${item.ficha_id}`)}</strong>
        <span>Estado: {enrollmentStatusLabels[item.enrollment_status_id] ?? (isDemoMode && item.enrollment_status_id === DEMO_ACTIVE_ENROLLMENT_STATUS_ID ? 'Activa'
          : isDemoMode && item.enrollment_status_id === DEMO_CANCELLED_ENROLLMENT_STATUS_ID ? 'Cancelada' : item.enrollment_status_id)}</span>
        <span>Fecha de inscripción: <time dateTime={item.enrollment_date}>{item.enrollment_date}</time></span>
        <span>Etapa: {STAGES.find(option => option.value === item.stage)?.label ?? item.stage} · {item.is_current ? 'Vigente' : 'Histórica'}</span>
      </li>)}</ul> : !enrollments.error && <p>No hay inscripciones registradas.</p>}
      {canManage && current && current.id !== cancelledEnrollmentId && current.enrollment_status_id !== (cancelledEnrollmentStatusId ?? (isDemoMode ? DEMO_CANCELLED_ENROLLMENT_STATUS_ID : '')) && <button type="button" className="button button-secondary" disabled={enrollments.canceling} onClick={() => setConfirmCancel(true)}>{enrollments.canceling ? 'Cancelando…' : 'Cancelar inscripción vigente'}</button>}
      {confirmCancel && <div className="nested-dialog-backdrop"><section className="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="learner-cancel-title"><h3 id="learner-cancel-title">¿Cancelar la inscripción vigente?</h3><p>El perfil y el historial se conservarán.</p><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setConfirmCancel(false)}>No, conservar</button><button type="button" className="button button-danger" onClick={() => void cancelEnrollment()}>Sí, cancelar</button></div></section></div>}
      {canManage && <div className="learner-enrollment-form"><h4>Inscribir en ficha</h4>
        {FichaInput && StatusInput ? <form onSubmit={event => void createEnrollment(event)}><div className="form-grid">
          <div className="catalog-picker" role="group" aria-label="Ficha"><span>Ficha</span><FichaInput value={ficha} onChange={setFicha} disabled={enrollments.saving} /></div>
          <div className="catalog-picker" role="group" aria-label="Estado de inscripción"><span>Estado de inscripción</span><StatusInput value={status} onChange={setStatus} disabled={enrollments.saving} /></div>
          <label>Etapa<select value={stage} onChange={event => setStage(event.target.value as LearnerFichaEnrollmentCreate['stage'])} disabled={enrollments.saving}>{STAGES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>Fecha de inscripción<input type="date" required value={date} onChange={event => setDate(event.target.value)} disabled={enrollments.saving} /></label>
          <label className="full-width">Motivo de traslado (opcional)<input value={reason} onChange={event => setReason(event.target.value)} disabled={enrollments.saving} /></label>
        </div>{enrollments.saveError && <p className="field-error" role="alert">{enrollments.saveError}</p>}
        <button className="button btn-primary" type="submit" disabled={enrollments.saving || !ficha || !status || !date}>{enrollments.saving ? 'Inscribiendo…' : 'Registrar inscripción'}</button></form>
        : <p className="form-hint">El shell debe proporcionar los selectores de ficha y estado de inscripción para habilitar el formulario.</p>}
      </div>}
    </section>
    <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cerrar</button></div>
    {editing && learner && <LearnerForm learner={learner} saving={updating} error={updateError} onSave={saveProfile} onClose={() => setEditing(false)} />}
  </section></div>
}

export default function LearnersPage({ UserSelector, FichaSelector, EnrollmentStatusSelector, fichaLabels = {}, enrollmentStatusLabels = {}, cancelledEnrollmentStatusId, canManageLearners = isDemoMode }: LearnersPageProps = {}) {
  const learners = useLearners()
  const [formOpen, setFormOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  async function create(input: LearnerCreate | LearnerUpdate) {
    const saved = await learners.create(input as LearnerCreate)
    if (saved) { setFormOpen(false); setNotice('Aprendiz creado correctamente.') }
  }

  return <div className="app-shell"><header className="topbar"><div className="brand"><img className="brand-logo" src="/assets/sena-logo.svg" alt="Logo oficial del SENA" /><div><strong>SENA — Gestión de Horarios</strong><span>Plataforma académica</span></div></div></header>
    <div className="workspace"><aside className="sidebar" aria-label="Navegación principal"><p className="role-label">COORDINADOR ACADÉMICO</p><nav><a href="/">Instructores</a><a className="active" aria-current="page" href="/aprendices"><GraduationCap size={19} />Aprendices</a></nav></aside>
      <main className="main-content"><div className="breadcrumb"><span>Administración</span><span>/</span><strong>Aprendices</strong></div>
        <div className="page-heading"><div><span className="eyebrow">GESTIÓN DE ACTORES</span><div className="heading-title"><h1>Aprendices</h1>{isDemoMode && <span className="demo-mode-badge">Modo demostración</span>}</div><p>Administra perfiles e inscripciones en ficha.</p></div>
          {canManageLearners && <button className="button btn-primary" type="button" onClick={() => setFormOpen(true)}><Plus size={18} /> Nuevo aprendiz</button>}
        </div>
        {notice && <p className="notice" role="status">{notice}</p>}
        <section className="panel"><div className="panel-heading"><div><h2>Directorio de aprendices</h2><p>Los datos de inscripción se consultan en el detalle de cada aprendiz.</p></div><button className="button button-secondary" type="button" onClick={() => void learners.refresh()}>Actualizar</button></div>
          {learners.error && <p className="error-banner" role="alert">{learners.error}</p>}
          {learners.loading ? <p className="loading-state" role="status">Cargando aprendices…</p> : <div className="table-wrap"><table><caption className="sr-only">Lista de aprendices</caption><thead><tr><th>Aprendiz</th><th>Documento</th><th>Correo</th><th>Acción</th></tr></thead><tbody>
            {learners.result?.data.map(item => <tr key={item.id}><td><div className="person-cell"><span className="person-avatar"><UserRound size={17} /></span><strong>{item.first_name} {item.last_name}</strong></div></td><td>{item.document_type} {item.document_number}</td><td>{item.email}</td><td><button type="button" className="text-action" aria-label={`Ver detalle de ${item.first_name} ${item.last_name}`} onClick={() => setSelectedId(item.id)}>Ver detalle</button></td></tr>)}
            {!learners.result?.data.length && <tr><td className="empty-cell" colSpan={4}><BookOpen size={24} /><strong>No hay aprendices en esta página.</strong></td></tr>}
          </tbody></table></div>}
          <div className="table-footer"><span>Total: {learners.result?.pagination.total_items ?? 0}</span><div className="learner-pagination"><button type="button" className="button button-secondary" disabled={learners.page <= 1 || learners.loading} onClick={() => learners.setPage(value => value - 1)}>Anterior</button><span>Página {learners.page} de {learners.result?.pagination.total_pages ?? 1}</span><button type="button" className="button button-secondary" disabled={learners.loading || learners.page >= (learners.result?.pagination.total_pages ?? 1)} onClick={() => learners.setPage(value => value + 1)}>Siguiente</button></div></div>
        </section></main></div>
    {formOpen && <LearnerForm learner={null} saving={learners.saving} error={learners.saveError} UserSelector={UserSelector} onSave={create} onClose={() => setFormOpen(false)} />}
    {selectedId && <LearnerDetail learnerId={selectedId} onClose={() => setSelectedId(null)} onUpdated={() => void learners.refresh()} FichaSelector={FichaSelector} EnrollmentStatusSelector={EnrollmentStatusSelector} fichaLabels={fichaLabels} enrollmentStatusLabels={enrollmentStatusLabels} cancelledEnrollmentStatusId={cancelledEnrollmentStatusId} canManage={canManageLearners} />}
  </div>
}
