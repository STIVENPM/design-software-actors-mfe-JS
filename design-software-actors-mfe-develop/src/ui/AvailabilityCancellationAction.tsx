import { useEffect, useRef, useState } from 'react'

interface AvailabilityCancellationActionProps {
  exceptionId: string
  busy: boolean
  disabled: boolean
  error?: { message: string; retryable: boolean }
  onCancel: (exceptionId: string) => void
}

export default function AvailabilityCancellationAction({
  exceptionId, busy, disabled, error, onCancel,
}: AvailabilityCancellationActionProps) {
  const [confirming, setConfirming] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (confirming) keepRef.current?.focus()
  }, [confirming])

  function closeConfirmation() {
    setConfirming(false)
    queueMicrotask(() => triggerRef.current?.focus())
  }

  function confirmCancellation() {
    setConfirming(false)
    onCancel(exceptionId)
  }

  return (
    <div className="availability-cancel-action">
      <button
        ref={triggerRef}
        className="button availability-cancel-button"
        type="button"
        disabled={disabled || busy || (Boolean(error) && !error?.retryable)}
        onClick={() => setConfirming(true)}
      >
        {busy ? 'Cancelando…' : error?.retryable ? 'Reintentar cancelación' : 'Cancelar'}
      </button>
      {error && <p className="field-error" role="alert">{error.message}</p>}
      {confirming && <div className="availability-confirm-backdrop">
        <div
          className="availability-confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="availability-confirm-title"
          aria-describedby="availability-confirm-description"
          onKeyDown={event => {
            if (event.key === 'Escape') closeConfirmation()
            if (event.key === 'Tab') {
              const buttons = [keepRef.current, event.currentTarget.querySelector<HTMLButtonElement>('[data-confirm-cancel]')]
              if (event.shiftKey && document.activeElement === buttons[0]) {
                event.preventDefault()
                buttons[1]?.focus()
              } else if (!event.shiftKey && document.activeElement === buttons[1]) {
                event.preventDefault()
                buttons[0]?.focus()
              }
            }
          }}
        >
          <h3 id="availability-confirm-title">¿Cancelar esta excepción?</h3>
          <p id="availability-confirm-description">Se eliminará de tus excepciones de disponibilidad.</p>
          <div className="availability-confirm-actions">
            <button ref={keepRef} className="button button-secondary" type="button" onClick={closeConfirmation}>No, conservar</button>
            <button data-confirm-cancel className="button availability-confirm-button" type="button" onClick={confirmCancellation}>Sí, cancelar</button>
          </div>
        </div>
      </div>}
    </div>
  )
}
