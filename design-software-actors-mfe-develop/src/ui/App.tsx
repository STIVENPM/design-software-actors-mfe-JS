import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import '../design-system-tokens.css'
import {
  Activity,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  FilePlus2,
  Filter,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { useInstructorAreas } from '../application/useInstructorAreas'
import { useInstructorContracts } from '../application/useInstructorContracts'
import { useInstructorCompetencies } from '../application/useInstructorCompetencies'
import { useInstructors } from '../application/useInstructors'
import { contractHourError, validateContract } from '../domain/contract-validation'
import type { ActorsMfeProps } from '../contracts/remote-props'
import type {
  ContractType,
  Instructor,
  InstructorContractInput,
  InstructorInput,
  InstructorStatusFilter,
} from '../domain/instructor'
import { ApiError } from '../domain/instructor'
import type { CompetencySelection } from '../domain/instructor-competency'
import { actorsApi } from '../infrastructure/actors-api'
import { isDemoMode } from '../infrastructure/actors-api'
import './styles.css'

type DialogState =
  | { mode: 'create' }
  | { mode: 'edit'; instructor: Instructor }
  | { mode: 'details'; instructor: Instructor }
  | { mode: 'deactivate'; instructor: Instructor }
  | null

export interface CompetencySelectorProps {
  value: CompetencySelection | null
  onChange: (selection: CompetencySelection | null) => void
  disabled?: boolean
}

export interface AppProps extends ActorsMfeProps {
  CompetencySelector?: ComponentType<CompetencySelectorProps>
  canManageCompetencies?: boolean
}

const EMPTY_INSTRUCTOR: InstructorInput = {
  first_name: '',
  last_name: '',
  document_number: '',
  email: '',
  phone: '',
}

const STATUS_FILTERS: { value: InstructorStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
]

function displayDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  )
}

function App({ basePath, CompetencySelector, canManageCompetencies = false }: AppProps = {}) {
  const [status, setStatus] = useState<InstructorStatusFilter>('active')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const instructors = useInstructors(status)

  const visibleInstructors = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-CO')
    if (!term) return instructors.instructors
    return instructors.instructors.filter(item =>
      `${item.full_name} ${item.document_number} ${item.email}`.toLocaleLowerCase('es-CO').includes(term),
    )
  }, [instructors.instructors, search])

  async function saveInstructor(input: InstructorInput, id?: string) {
    if (id) await instructors.update(id, input)
    else await instructors.create(input)
    setDialog(null)
    setNotice(id ? 'Perfil actualizado correctamente.' : 'Instructor creado correctamente.')
  }

  async function deactivateInstructor(instructor: Instructor) {
    try {
      await instructors.deactivate(instructor)
      setDialog(null)
      setNotice('Instructor inactivado. El registro se conserva en el sistema.')
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'No fue posible inactivar el instructor.')
    }
  }

  return (
    <div className={`app-shell ${basePath ? 'hosted-remote' : ''}`}>
      <header className="topbar">
        <button
          className="icon-button menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Cerrar navegación' : 'Abrir navegación'}
          onClick={() => setMenuOpen(value => !value)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="brand">
          <img className="brand-logo" src="/assets/sena-logo.svg" alt="Logo oficial del SENA" />
          <div>
            <strong>SENA — Gestión de Horarios</strong>
            <span>Plataforma académica</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button type="button" className="icon-button notification-button" aria-label="Notificaciones">
            <Bell size={19} />
            <span className="notification-count">3</span>
          </button>
          <button type="button" className="profile-menu" onClick={() => setMenuOpen(value => !value)}>
            <span className="avatar">MG</span>
            <span className="profile-name"><strong>María García</strong><small>Coordinador Académico</small></span>
            <ChevronDown size={17} />
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} aria-label="Navegación principal">
          <p className="role-label">COORDINADOR ACADÉMICO</p>
          <nav>
            <a href="#inicio"><LayoutDashboard size={19} />Inicio</a>
            <a href="#horarios"><CalendarDays size={19} />Horarios</a>
            <a href="#disponibilidad"><Activity size={19} />Disponibilidad</a>
            <a href="#fichas"><BookOpen size={19} />Fichas</a>
            <a className="active" href="#instructores" aria-current="page"><UsersRound size={19} />Instructores</a>
            <a href="/aprendices"><GraduationCap size={19} />Aprendices</a>
            <a href="/admin/parametrizacion/estados"><Settings size={19} />Estados de actores</a>
          </nav>
          <div className="sidebar-footer">
            <ShieldCheck size={17} />
            <span>Acceso de coordinador</span>
          </div>
        </aside>

        <main className="main-content">
          <div className="breadcrumb"><span>Administración</span><span>/</span><strong>Instructores</strong></div>
          <div className="page-heading">
            <div>
              <span className="eyebrow">GESTIÓN DE ACTORES</span>
              <div className="heading-title">
                <h1>Instructores</h1>
                {isDemoMode && <span className="demo-mode-badge">Modo demostración</span>}
              </div>
              <p>Administra los perfiles, áreas de conocimiento y contratos de vinculación.</p>
            </div>
            <button className="button btn-primary" type="button" onClick={() => setDialog({ mode: 'create' })}>
              <Plus size={18} /> Nuevo instructor
            </button>
          </div>

          {notice && (
            <div className="notice" role="status">
              <Check size={18} /><span>{notice}</span>
              <button type="button" aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={16} /></button>
            </div>
          )}

          <section className="summary-grid" aria-label="Resumen de instructores">
            <article className="summary-card">
              <span className="summary-icon green"><UsersRound size={20} /></span>
              <div><span>Resultados en este alcance</span><strong>{instructors.instructors.length}</strong></div>
              <small>{isDemoMode ? 'Datos de demostración locales' : 'Según permisos del servidor'}</small>
            </article>
            <article className="summary-card">
              <span className="summary-icon blue"><BriefcaseBusiness size={20} /></span>
              <div><span>Estado consultado</span><strong>{status === 'all' ? 'Todos' : status === 'active' ? 'Activos' : 'Inactivos'}</strong></div>
              <small>{isDemoMode ? 'Filtro aplicado en modo demostración' : 'Filtro enviado al servicio'}</small>
            </article>
            <article className="summary-card summary-note">
              <span className="summary-icon amber"><ShieldCheck size={20} /></span>
              <div><span>{isDemoMode ? 'Autorización' : 'Alcance de acceso'}</span><strong>{isDemoMode ? 'No simulada' : 'Administrado por RBAC'}</strong></div>
              <small>{isDemoMode ? 'No representa un scope real' : 'El backend aplica el scope asignado'}</small>
            </article>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Directorio de instructores</h2>
                <p>Consulta los datos maestros y gestiona la vinculación institucional.</p>
              </div>
              <button className="button button-secondary export-button" type="button" onClick={() => void instructors.refresh()}>
                <Filter size={16} /> Actualizar
              </button>
            </div>
            <div className="list-toolbar">
              <div className="filter-tabs" role="group" aria-label="Filtrar por estado">
                {STATUS_FILTERS.map(filter => (
                  <button
                    type="button"
                    key={filter.value}
                    className={status === filter.value ? 'filter-tab selected' : 'filter-tab'}
                    aria-pressed={status === filter.value}
                    onClick={() => setStatus(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <label className="search-field">
                <Search size={17} />
                <span className="sr-only">Buscar en los instructores recibidos</span>
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre, documento o correo" />
              </label>
            </div>

            {instructors.error && <div className="error-banner" role="alert">{instructors.error}</div>}
            {instructors.loading ? (
              <div className="loading-state" role="status">Cargando instructores…</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <caption className="sr-only">Lista de instructores</caption>
                  <thead>
                    <tr>
                      <th scope="col">Instructor</th>
                      <th scope="col">Documento</th>
                      <th scope="col">Correo electrónico</th>
                      <th scope="col">Teléfono</th>
                      <th scope="col">Estado</th>
                      <th scope="col"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleInstructors.map(instructor => (
                      <tr key={instructor.id}>
                        <td>
                          <div className="person-cell">
                            <span className="person-avatar"><UserRound size={17} /></span>
                            <span><strong>{instructor.full_name}</strong><small>Instructor</small></span>
                          </div>
                        </td>
                        <td>{instructor.document_number}</td>
                        <td><a className="email-link" href={`mailto:${instructor.email}`}>{instructor.email}</a></td>
                        <td>{instructor.phone || '—'}</td>
                        <td><StatusBadge status={instructor.status} /></td>
                        <td>
                          <div className="row-actions">
                            <button type="button" className="text-action" onClick={() => setDialog({ mode: 'details', instructor })}>Ver detalle</button>
                            <button type="button" className="icon-button row-edit" aria-label={`Editar ${instructor.full_name}`} onClick={() => setDialog({ mode: 'edit', instructor })}><Pencil size={16} /></button>
                            {instructor.status === 'active' && (
                              <button type="button" className="icon-button row-deactivate" aria-label={`Inactivar ${instructor.full_name}`} onClick={() => setDialog({ mode: 'deactivate', instructor })}><X size={17} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!visibleInstructors.length && (
                      <tr><td className="empty-cell" colSpan={6}>
                        <UsersRound size={27} />
                        <strong>{search ? 'No hay coincidencias' : 'No hay instructores para este filtro'}</strong>
                        <span>{search ? 'Prueba con otro nombre, documento o correo.' : 'Cambia el filtro o crea un nuevo instructor.'}</span>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="table-footer">
              <span>{visibleInstructors.length} resultado{visibleInstructors.length === 1 ? '' : 's'} en los datos recibidos</span>
              <span>{isDemoMode ? 'Datos locales de demostración; no se guardan en el backend' : 'Los permisos de alcance los valida el servicio'}</span>
            </div>
          </section>
          <footer className="page-footer">SENA · Centro de Formación <span>Gestión de actores</span></footer>
        </main>
      </div>

      {dialog && (
        <div className="dialog-backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget) setDialog(null)
        }}>
          {dialog.mode === 'create' || dialog.mode === 'edit' ? (
            <InstructorForm
              key={dialog.mode === 'edit' ? dialog.instructor.id : 'new'}
              instructor={dialog.mode === 'edit' ? dialog.instructor : undefined}
              onClose={() => setDialog(null)}
              onSave={input => saveInstructor(input, dialog.mode === 'edit' ? dialog.instructor.id : undefined)}
            />
          ) : dialog.mode === 'details' ? (
            <InstructorDetails instructor={dialog.instructor} onClose={() => setDialog(null)} CompetencySelector={CompetencySelector} canManageCompetencies={canManageCompetencies} />
          ) : (
            <section className="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="deactivate-title">
              <div className="dialog-heading">
                <span className="dialog-icon danger"><X size={20} /></span>
                <button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setDialog(null)}><X size={19} /></button>
              </div>
              <h2 id="deactivate-title">Inactivar instructor</h2>
              <p>¿Deseas inactivar a <strong>{dialog.instructor.full_name}</strong>? Su perfil se conservará y aparecerá al consultar los instructores inactivos.</p>
              <div className="dialog-actions">
                <button className="button button-secondary" type="button" onClick={() => setDialog(null)}>Cancelar</button>
                <button className="button button-danger" type="button" onClick={() => void deactivateInstructor(dialog.instructor)}>Inactivar perfil</button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: Instructor['status'] }) {
  return <span className={`status-badge ${status}`}><span />{status === 'active' ? 'Activo' : 'Inactivo'}</span>
}

function InstructorForm({
  instructor,
  onClose,
  onSave,
}: {
  instructor?: Instructor
  onClose: () => void
  onSave: (input: InstructorInput) => Promise<void>
}) {
  const [form, setForm] = useState<InstructorInput>(instructor
    ? {
        first_name: instructor.first_name,
        last_name: instructor.last_name,
        document_number: instructor.document_number,
        email: instructor.email,
        phone: instructor.phone,
      }
    : EMPTY_INSTRUCTOR)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const derivedName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim()

  function update<K extends keyof InstructorInput>(key: K, value: InstructorInput[K]) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave(form)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible guardar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="dialog form-dialog" role="dialog" aria-modal="true" aria-labelledby="instructor-form-title">
      <div className="dialog-heading">
        <div><span className="eyebrow">PERFIL BASE</span><h2 id="instructor-form-title">{instructor ? 'Editar instructor' : 'Nuevo instructor'}</h2></div>
        <button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}><X size={19} /></button>
      </div>
      <p className="dialog-intro">Completa los datos de identificación y contacto del instructor.</p>
      <form onSubmit={event => void submit(event)}>
        <div className="form-grid">
          <label>Nombre(s)<input required value={form.first_name} onChange={event => update('first_name', event.target.value)} autoFocus /></label>
          <label>Apellido(s)<input required value={form.last_name} onChange={event => update('last_name', event.target.value)} /></label>
          <label className="full-width">Nombre completo <span className="readonly-tag">Derivado · solo lectura</span>
            <input value={derivedName} readOnly aria-label="Nombre completo derivado" placeholder="Se genera con nombre y apellido" />
          </label>
          <label>Número de documento<input required value={form.document_number} onChange={event => update('document_number', event.target.value)} /></label>
          <label>Correo electrónico<input required type="email" value={form.email} onChange={event => update('email', event.target.value)} /></label>
          <label className="full-width">Teléfono<input value={form.phone} onChange={event => update('phone', event.target.value)} /></label>
        </div>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancelar</button>
          <button className="button btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar perfil'}</button>
        </div>
      </form>
    </section>
  )
}

function InstructorDetails({ instructor, onClose, CompetencySelector, canManageCompetencies }: {
  instructor: Instructor
  onClose: () => void
  CompetencySelector?: ComponentType<CompetencySelectorProps>
  canManageCompetencies: boolean
}) {
  const [tab, setTab] = useState<'profile' | 'areas' | 'contracts' | 'competencies'>('profile')
  const [profile, setProfile] = useState(instructor)
  const [profileError, setProfileError] = useState('')
  const { areas, loading: areasLoading, error: areasError, addArea } = useInstructorAreas(instructor.id)
  const { contracts, loading: contractsLoading, error: contractsError, addContract, closeContract } = useInstructorContracts(instructor.id)
  const [areaName, setAreaName] = useState('')
  const [areaError, setAreaError] = useState('')
  const [contractDialog, setContractDialog] = useState(false)
  const [contractError, setContractError] = useState('')
  const [savingArea, setSavingArea] = useState(false)

  useEffect(() => {
    void actorsApi.getInstructor(instructor.id)
      .then(setProfile)
      .catch(cause => setProfileError(
        cause instanceof Error ? cause.message : 'No fue posible cargar el perfil del instructor.',
      ))
  }, [instructor.id])

  async function submitArea(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAreaError('')
    setSavingArea(true)
    try {
      await addArea(areaName.trim())
      setAreaName('')
    } catch (cause) {
      setAreaError(cause instanceof Error ? cause.message : 'No fue posible agregar el área.')
    } finally {
      setSavingArea(false)
    }
  }

  async function saveContract(input: InstructorContractInput) {
    const validationError = validateContract(input, contracts.some(contract => contract.is_current))
    if (validationError) {
      setContractError(validationError)
      return
    }
    setContractError('')
    try {
      await addContract(input)
      setContractDialog(false)
    } catch (cause) {
      setContractError(cause instanceof ApiError && cause.status === 422
        ? cause.message
        : cause instanceof Error ? cause.message : 'No fue posible crear el contrato.')
    }
  }

  async function finishContract(contractId: string) {
    setContractError('')
    try {
      await closeContract(contractId)
    } catch (cause) {
      setContractError(cause instanceof Error ? cause.message : 'No fue posible cerrar el contrato.')
    }
  }

  return (
    <section className="dialog details-dialog" role="dialog" aria-modal="true" aria-labelledby="details-title">
      <div className="dialog-heading">
        <div className="detail-title">
          <span className="person-avatar large"><UserRound size={20} /></span>
          <div><span className="eyebrow">PERFIL DE INSTRUCTOR</span><h2 id="details-title">{profile.full_name}</h2></div>
        </div>
        <button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}><X size={19} /></button>
      </div>
      <div className="detail-meta"><span>{profile.document_number}</span><span>{profile.email}</span><StatusBadge status={profile.status} /></div>
      <div className="detail-tabs" role="tablist" aria-label="Información del instructor">
        <button role="tab" aria-selected={tab === 'profile'} onClick={() => setTab('profile')}>Perfil</button>
        <button role="tab" aria-selected={tab === 'areas'} onClick={() => setTab('areas')}>Áreas <span>{areas.length}</span></button>
        <button role="tab" aria-selected={tab === 'contracts'} onClick={() => setTab('contracts')}>Contratos <span>{contracts.length}</span></button>
        <button role="tab" aria-selected={tab === 'competencies'} onClick={() => setTab('competencies')}>Competencias</button>
      </div>
      <div className="detail-content">
        {profileError && <div className="error-banner" role="alert">{profileError}</div>}
        {tab === 'profile' && (
          <div className="profile-details">
            <div><span>Nombre completo</span><strong>{profile.full_name}</strong></div>
            <div><span>Documento</span><strong>{profile.document_number}</strong></div>
            <div><span>Correo</span><strong>{profile.email}</strong></div>
            <div><span>Teléfono</span><strong>{profile.phone || 'No registrado'}</strong></div>
            <div><span>Estado</span><StatusBadge status={profile.status} /></div>
          </div>
        )}
        {tab === 'areas' && (
          <div className="detail-section">
            <div className="detail-section-title"><div><h3>Áreas de conocimiento</h3><p>Áreas asociadas al perfil de instructor.</p></div><span className="section-count">{areas.length}</span></div>
            {areasError && <div className="error-banner" role="alert">{areasError}</div>}
            {areasLoading ? <p className="inline-loading">Cargando áreas…</p> : (
              <ul className="area-list">{areas.map(area => <li key={area.id}><span><GraduationCap size={17} />{area.name}</span>{area.is_primary && <small>Principal</small>}</li>)}</ul>
            )}
            <form className="inline-add" onSubmit={event => void submitArea(event)}>
              <label htmlFor="new-area">Agregar área</label>
              <div><input id="new-area" required value={areaName} onChange={event => setAreaName(event.target.value)} placeholder="Ej. Desarrollo de software" /><button className="button btn-primary" type="submit" disabled={savingArea}><Plus size={16} />Agregar</button></div>
              {areaError && <span className="field-error" role="alert">{areaError}</span>}
            </form>
          </div>
        )}
        {tab === 'contracts' && (
          <div className="detail-section">
            <div className="detail-section-title"><div><h3>Contratos de vinculación</h3><p>Solo se permite un contrato vigente por instructor.</p></div><span className="section-count">{contracts.length}</span></div>
            {contractsError && <div className="error-banner" role="alert">{contractsError}</div>}
            {contractError && <div className="error-banner" role="alert">{contractError}</div>}
            {contractsLoading ? <p className="inline-loading">Cargando contratos…</p> : contracts.length ? (
              <div className="contract-list">{contracts.map(contract => (
                <article className="contract-card" key={contract.id}>
                  <div className="contract-card-heading"><strong>{contract.contract_type}</strong><span className={`contract-status ${contract.is_current ? 'current' : ''}`}>{contract.is_current ? 'Vigente' : 'Cerrado'}</span></div>
                  <div className="contract-dates">{displayDate(contract.start_date)}{contract.end_date ? ` — ${displayDate(contract.end_date)}` : ' — Sin fecha de cierre'}</div>
                  <p>Límite semanal: {contract.weekly_hour_limit === null ? 'Sin límite definido' : `${contract.weekly_hour_limit} horas`}</p>
                  {contract.is_current && <button className="text-action close-contract" type="button" onClick={() => void finishContract(contract.id)}>Cerrar contrato vigente</button>}
                </article>
              ))}</div>
            ) : <div className="empty-detail"><ClipboardList size={24} /><span>No hay contratos registrados.</span></div>}
            <button className="button button-secondary add-contract" type="button" onClick={() => {
              setContractError('')
              setContractDialog(true)
            }} disabled={contracts.some(contract => contract.is_current)}>
              <FilePlus2 size={17} /> Crear contrato
            </button>
            {contracts.some(contract => contract.is_current) && <p className="form-hint">Cierra el contrato vigente para habilitar otro contrato actual.</p>}
            {contractDialog && <ContractForm onClose={() => setContractDialog(false)} onSave={saveContract} />}
          </div>
        )}
        {tab === 'competencies' && (
          <InstructorCompetencies
            instructorId={instructor.id}
            canManage={canManageCompetencies && profile.status === 'active'}
            CompetencySelector={CompetencySelector}
          />
        )}
      </div>
      <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cerrar</button></div>
    </section>
  )
}

function InstructorCompetencies({ instructorId, canManage, CompetencySelector }: {
  instructorId: string
  canManage: boolean
  CompetencySelector?: ComponentType<CompetencySelectorProps>
}) {
  const { competencies, loading, error, assignmentError, revokeError, assigning, revokingId, refresh, assign, revoke } = useInstructorCompetencies(instructorId)
  const [selection, setSelection] = useState<CompetencySelection | null>(null)
  const [certifiedAt, setCertifiedAt] = useState('')
  const [certificationEntity, setCertificationEntity] = useState('')
  const [knownLabels, setKnownLabels] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selection) return
    setNotice('')
    const saved = await assign({
      competency_id: selection.id,
      certified_at: certifiedAt,
      ...(certificationEntity.trim() ? { certification_entity: certificationEntity.trim() } : {}),
    })
    if (saved) {
      setKnownLabels(current => ({ ...current, [selection.id]: selection.label }))
      setSelection(null)
      setCertifiedAt('')
      setCertificationEntity('')
      setNotice('Competencia asignada correctamente.')
    }
  }

  async function remove(assignmentId: string) {
    setNotice('')
    if (await revoke(assignmentId)) setNotice('Competencia revocada correctamente.')
  }

  return (
    <div className="detail-section">
      <div className="detail-section-title"><div><h3>Competencias del instructor</h3><p>Asignaciones activas y certificación registrada.</p></div><span className="section-count">{competencies.length}</span></div>
      {error && <div className="error-banner" role="alert">{error} <button type="button" className="text-action" onClick={() => void refresh()}>Reintentar</button></div>}
      {revokeError && <div className="error-banner" role="alert">{revokeError}</div>}
      {notice && <p role="status" className="form-hint">{notice}</p>}
      {loading ? <p className="inline-loading">Cargando competencias…</p> : competencies.length ? (
        <ul className="competency-list">{competencies.map(item => (
          <li key={item.id}>
            <div>
              <strong>{knownLabels[item.competency_id] || `Competencia ${item.competency_id}`}</strong>
              <small>Certificada: {displayDate(item.certified_at)}{item.certification_entity ? ` · ${item.certification_entity}` : ''}</small>
            </div>
            {canManage && <button className="text-action" type="button" disabled={revokingId !== null} onClick={() => void remove(item.id)}>{revokingId === item.id ? 'Revocando…' : 'Revocar'}</button>}
          </li>
        ))}</ul>
      ) : !error && <div className="empty-detail"><GraduationCap size={24} /><span>No hay competencias activas asignadas.</span></div>}
      {canManage && CompetencySelector && (
        <form className="competency-form" onSubmit={event => void submit(event)}>
          <h4>Asignar competencia</h4>
          <div className="competency-selector" role="group" aria-label="Competencia">
            <CompetencySelector value={selection} onChange={setSelection} disabled={assigning} />
          </div>
          {assignmentError && <span className="field-error" role="alert">{assignmentError}</span>}
          <div className="form-grid">
            <label>Fecha de certificación<input type="date" required value={certifiedAt} onChange={event => setCertifiedAt(event.target.value)} disabled={assigning} /></label>
            <label>Entidad certificadora<input maxLength={200} value={certificationEntity} onChange={event => setCertificationEntity(event.target.value)} disabled={assigning} /></label>
          </div>
          <button className="button btn-primary" type="submit" disabled={assigning || !selection}>{assigning ? 'Asignando…' : 'Asignar competencia'}</button>
        </form>
      )}
    </div>
  )
}

function ContractForm({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (input: InstructorContractInput) => Promise<void>
}) {
  const [contractType, setContractType] = useState<ContractType>('STAFF')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [weeklyHours, setWeeklyHours] = useState('')
  const [isCurrent, setIsCurrent] = useState(true)
  const hourError = contractHourError(contractType, weeklyHours === '' ? null : Number(weeklyHours))
  const [attempted, setAttempted] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    if (hourError) return
    await onSave({
      contract_type: contractType,
      start_date: startDate,
      end_date: endDate || null,
      weekly_hour_limit: weeklyHours === '' ? null : Number(weeklyHours),
      is_current: isCurrent,
    })
  }

  return (
    <div className="nested-dialog-backdrop">
      <section className="dialog contract-form-dialog" role="dialog" aria-modal="true" aria-labelledby="contract-form-title">
        <div className="dialog-heading"><div><span className="eyebrow">VINCULACIÓN</span><h2 id="contract-form-title">Nuevo contrato</h2></div><button className="icon-button" type="button" aria-label="Cerrar formulario de contrato" onClick={onClose}><X size={18} /></button></div>
        <form onSubmit={event => void submit(event)}>
          <div className="form-grid">
            <label className="full-width">Tipo de contrato
              <select value={contractType} onChange={event => setContractType(event.target.value as ContractType)}>
                <option value="STAFF">STAFF · Planta</option>
                <option value="CONTRACTOR">CONTRACTOR · Contratista</option>
                <option value="HOURLY">HOURLY · Por horas</option>
              </select>
            </label>
            <label>Fecha de inicio<input type="date" required value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
            <label>Fecha de fin<input type="date" min={startDate || undefined} value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
            <label className="full-width">Límite de horas semanales
              <input type="number" min="0" max={contractType === 'STAFF' ? 40 : contractType === 'CONTRACTOR' ? 48 : undefined} value={weeklyHours} onChange={event => setWeeklyHours(event.target.value)} placeholder={contractType === 'HOURLY' ? 'Sin límite' : 'Ingresa las horas'} />
              <small className="field-hint">{contractType === 'STAFF' ? 'STAFF: máximo 40 h/semana.' : contractType === 'CONTRACTOR' ? 'CONTRACTOR: máximo 48 h/semana.' : 'HOURLY: sin límite máximo de horas.'}</small>
            </label>
            <label className="checkbox-field full-width"><input type="checkbox" checked={isCurrent} onChange={event => setIsCurrent(event.target.checked)} />Marcar como contrato vigente</label>
          </div>
          {attempted && hourError && <div className="error-banner" role="alert">{hourError}</div>}
          <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancelar</button><button className="button btn-primary" type="submit">Guardar contrato</button></div>
        </form>
      </section>
    </div>
  )
}

export default App
