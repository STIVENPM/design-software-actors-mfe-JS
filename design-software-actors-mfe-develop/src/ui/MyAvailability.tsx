import { useEffect, useState } from 'react'
import { CalendarDays, ShieldCheck } from 'lucide-react'
import { useMyAvailability } from '../application/useMyAvailability'
import { isFutureAvailabilityException, type AvailabilityExceptionInput, type AvailabilityExceptionType } from '../domain/instructor-availability'
import { isDemoMode } from '../infrastructure/actors-api'
import AvailabilityCancellationAction from './AvailabilityCancellationAction'

const TYPES: { value: AvailabilityExceptionType; label: string; category: string }[] = [
  { value: 'SICK_LEAVE', label: 'Incapacidad', category: 'Salud' },
  { value: 'VACATION', label: 'Vacaciones', category: 'Tiempo libre' },
  { value: 'COMMISSION', label: 'Comisión', category: 'Servicio institucional' },
  { value: 'PERSONAL_LEAVE', label: 'Permiso personal', category: 'Asuntos personales' },
  { value: 'TRAINING', label: 'Capacitación', category: 'Formación' },
  { value: 'OTHER', label: 'Otro', category: 'Otro motivo' },
]

const TIME_24_HOUR = /^([01]\d|2[0-3]):[0-5]\d$/

function formatTimeInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
}

function localDateTime(dateValue: string, timeValue: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !TIME_24_HOUR.test(timeValue)) return null
  const [year, month, day] = dateValue.split('-').map(Number)
  const [hour, minute] = timeValue.split(':').map(Number)
  const value = new Date(year, month - 1, day, hour, minute)
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day ||
      value.getHours() !== hour || value.getMinutes() !== minute) return null
  return value
}

function dateLabel(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23',
  }).format(date)
}

export default function MyAvailability() {
  const availability = useMyAvailability()
  const [type, setType] = useState<AvailabilityExceptionType>('PERSONAL_LEAVE')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError('')
    if (!startDate || !endDate) {
      setValidationError('Selecciona las fechas de inicio y fin.')
      return
    }
    if (!TIME_24_HOUR.test(startTime) || !TIME_24_HOUR.test(endTime)) {
      setValidationError('Escribe ambas horas en formato HH:mm de 24 horas.')
      return
    }
    const start = localDateTime(startDate, startTime)
    const end = localDateTime(endDate, endTime)
    if (!start || !end) {
      setValidationError('Revisa las fechas y horas ingresadas.')
      return
    }
    if (end <= start) {
      setValidationError('La fecha y hora de fin deben ser posteriores al inicio.')
      return
    }
    const input: AvailabilityExceptionInput = {
      exception_type: type,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      ...(description.trim() ? { description: description.trim() } : {}),
    }
    if (await availability.create(input)) {
      setStartDate('')
      setStartTime('')
      setEndDate('')
      setEndTime('')
      setDescription('')
    }
  }

  if (availability.access === 'loading') return <main className="self-service" role="status">Consultando sesión…</main>
  if (availability.access === 'forbidden') return <main className="self-service"><div className="error-banner" role="alert">Esta pantalla requiere el rol INSTRUCTOR.</div></main>
  if (availability.access === 'error') return <main className="self-service"><div className="error-banner" role="alert">{availability.sessionError}</div></main>

  return (
    <main className="self-service">
      <header className="self-service-header">
        <div><span className="eyebrow">INSTRUCTOR · AUTOSERVICIO</span><h1>Mi disponibilidad</h1>{isDemoMode && <span className="demo-mode-badge">Modo demostración</span>}<p>Registra los periodos en los que no puedes recibir asignaciones.</p></div>
        <span className="self-service-mark"><ShieldCheck size={18} /> Perfil propio</span>
      </header>

      <section className="panel availability-panel" aria-labelledby="exceptions-title">
        <div className="panel-heading"><div><h2 id="exceptions-title">Mis excepciones</h2><p>Bloqueos de disponibilidad registrados.</p></div><button className="button button-secondary" type="button" onClick={() => void availability.refresh()} disabled={availability.loading}>Actualizar</button></div>
        {availability.cancelNotice && <p className="notice availability-cancel-notice" role="status">{availability.cancelNotice}</p>}
        {availability.listError && <div className="error-banner" role="alert">{availability.listError}</div>}
        {availability.loading ? <p className="inline-loading" role="status">Cargando excepciones…</p> : availability.exceptions.length ? (
          <ul className="availability-list" aria-label="Excepciones de disponibilidad">{availability.exceptions.map(item => (
            <li key={item.id}>
              <article className="availability-entry" aria-labelledby={`availability-exception-${item.id}`}>
                <div className="availability-entry-heading">
                  <div><span className="availability-category">{TYPES.find(option => option.value === item.exception_type)?.category ?? 'Otro motivo'}</span><h3 id={`availability-exception-${item.id}`}>{TYPES.find(option => option.value === item.exception_type)?.label ?? item.exception_type}</h3></div>
                  {isFutureAvailabilityException(item, now) && <AvailabilityCancellationAction
                    exceptionId={item.id}
                    busy={availability.cancelingId === item.id}
                    disabled={availability.cancelingId !== null}
                    error={availability.cancelError?.exceptionId === item.id ? availability.cancelError : undefined}
                    onCancel={id => void availability.cancel(id)}
                  />}
                </div>
                <dl className="availability-entry-dates">
                  <div><dt>Inicio</dt><dd><time dateTime={item.start_datetime}>{dateLabel(item.start_datetime)}</time></dd></div>
                  <div><dt>Fin</dt><dd><time dateTime={item.end_datetime}>{dateLabel(item.end_datetime)}</time></dd></div>
                </dl>
                {item.description && <p className="availability-entry-description"><strong>Descripción:</strong> {item.description}</p>}
              </article>
            </li>
          ))}</ul>
        ) : !availability.listError && <div className="empty-detail"><CalendarDays size={24} /><span>No tienes excepciones registradas.</span></div>}
      </section>

      <section className="panel availability-panel" aria-labelledby="new-exception-title">
        <div className="panel-heading"><div><h2 id="new-exception-title">Nueva excepción</h2><p>Indica el rango de fechas, el motivo y una descripción si la necesitas.</p></div></div>
        <form className="availability-form" noValidate onSubmit={event => void submit(event)}>
          <div className="form-grid">
            <label className="full-width">Motivo<select value={type} onChange={event => setType(event.target.value as AvailabilityExceptionType)} disabled={availability.creating}>{TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <fieldset className="availability-range full-width">
              <legend>Rango de la excepción</legend>
              <div className="availability-date-grid">
                <div className="availability-date-group">
                  <h3>Inicio</h3>
                  <div className="availability-date-fields">
                    <label htmlFor="availability-start-date">Fecha<input id="availability-start-date" type="date" lang="es-CO" aria-label="Fecha de inicio" required value={startDate} onChange={event => setStartDate(event.target.value)} disabled={availability.creating} aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'availability-range-error' : undefined} /></label>
                    <label htmlFor="availability-start-time">Hora (24 h)<input id="availability-start-time" type="text" inputMode="numeric" autoComplete="off" maxLength={5} placeholder="HH:mm" aria-label="Hora de inicio" required value={startTime} onChange={event => setStartTime(formatTimeInput(event.target.value))} disabled={availability.creating} aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'availability-range-error' : undefined} /></label>
                  </div>
                </div>
                <div className="availability-date-group">
                  <h3>Fin</h3>
                  <div className="availability-date-fields">
                    <label htmlFor="availability-end-date">Fecha<input id="availability-end-date" type="date" lang="es-CO" aria-label="Fecha de fin" required value={endDate} onChange={event => setEndDate(event.target.value)} disabled={availability.creating} aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'availability-range-error' : undefined} /></label>
                    <label htmlFor="availability-end-time">Hora (24 h)<input id="availability-end-time" type="text" inputMode="numeric" autoComplete="off" maxLength={5} placeholder="HH:mm" aria-label="Hora de fin" required value={endTime} onChange={event => setEndTime(formatTimeInput(event.target.value))} disabled={availability.creating} aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'availability-range-error' : undefined} /></label>
                  </div>
                </div>
              </div>
              {validationError && <p id="availability-range-error" className="field-error" role="alert">{validationError}</p>}
            </fieldset>
            <label className="full-width">Descripción (opcional)<textarea value={description} onChange={event => setDescription(event.target.value)} disabled={availability.creating} /></label>
          </div>
          {availability.createError && <p className="field-error" role="alert">{availability.createError}</p>}
          {availability.notice && <p className="notice" role="status">{availability.notice}</p>}
          <button className="button btn-primary" type="submit" disabled={availability.creating}>{availability.creating ? 'Registrando…' : 'Registrar excepción'}</button>
        </form>
      </section>
    </main>
  )
}
