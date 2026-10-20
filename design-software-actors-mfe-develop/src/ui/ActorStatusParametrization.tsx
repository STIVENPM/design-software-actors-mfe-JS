import { useState } from 'react'
import { Check, ChevronRight, Lock, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { ActorStatusTab } from '../domain/actor-status'
import { useActorStatuses } from '../application/useActorStatuses'
import { isDemoMode } from '../infrastructure/actors-api'

const TABS: { value: ActorStatusTab; label: string }[] = [
  { value: 'categories', label: 'Categorías' },
  { value: 'statuses', label: 'Estados' },
  { value: 'transitions', label: 'Transiciones' },
]

function ActiveBadge({ active }: { active: boolean }) {
  return active
    ? <span className="status-badge active"><Check size={11} />Activo</span>
    : <span className="status-badge inactive">Inactivo</span>
}

function FlagBadge({ on, label }: { on: boolean; label: string }) {
  if (!on) return <span className="status-badge inactive">—</span>
  return (
    <span
      className="status-badge"
      style={{ color: '#175cd3', background: '#eff8ff', border: '1px solid #b2ddff' }}
    >
      <Check size={11} />{label}
    </span>
  )
}

function TargetBadge({ label }: { label: string }) {
  return (
    <span
      className="status-badge"
      style={{ color: '#175cd3', background: '#eff8ff', border: '1px solid #b2ddff' }}
    >
      {label}
    </span>
  )
}

function SourceBadge({ label }: { label: string }) {
  return <span className="status-badge inactive">{label}</span>
}

/**
 * ui/ActorStatusParametrization — pantalla "Estados de actores" (HU actores).
 *
 * Solo lectura (E1 + E2 re-alcanceado): la HU no trae criterios de crear/editar/
 * eliminar, así que no hay botones de acción — solo listado por pestañas.
 * Se monta en `/admin/parametrizacion/estados` (ver main.tsx); el menú y el
 * marco los aporta el shell-host.
 */
export default function ActorStatusParametrization() {
  const [tab, setTab] = useState<ActorStatusTab>('statuses')
  const { categories, statuses, transitions, refresh } = useActorStatuses()

  return (
    <main className="main-content">
      <div className="breadcrumb"><span>Administración</span><span>/</span><strong>Estados de actores</strong></div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PARAMETRIZACIÓN</span>
          <div className="heading-title">
            <h1>Parametrización — Estados de actores</h1>
            {isDemoMode && <span className="demo-mode-badge">Modo demostración</span>}
          </div>
          <p>Máquina de estados (categorías, estados y transiciones permitidas) para instructores, aprendices, empresas y etapas productivas.</p>
        </div>
      </div>

      <section className="panel">
        <div className="detail-tabs" role="tablist" aria-label="Secciones de parametrización" style={{ padding: '0 20px' }}>
          {TABS.map(item => (
            <button
              key={item.value}
              role="tab"
              type="button"
              aria-selected={tab === item.value}
              onClick={() => setTab(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'categories' && (
          <div>
            <div className="panel-heading">
              <div><h2>Categorías de estado</h2><p>Cada categoría agrupa los estados de una entidad (instructor, aprendiz, empresa o etapa productiva).</p></div>
              <button className="button btn-primary" type="button" disabled title="La creación llega cuando el backend exponga el endpoint (DoR abierto).">
                <Plus size={18} />Nueva categoría
              </button>
            </div>
            {categories.error && <div className="error-banner" role="alert">{categories.error} <button type="button" className="text-action" onClick={() => void refresh()}>Reintentar</button></div>}
            {categories.loading ? <p className="loading-state">Cargando categorías…</p> : (
              <div className="table-wrap">
                <table>
                  <caption className="sr-only">Categorías de estado</caption>
                  <thead><tr><th scope="col">Categoría</th><th scope="col">Código</th><th scope="col">Aplica a</th><th scope="col">Descripción</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead>
                  <tbody>
                    {categories.data.map(item => (
                      <tr key={item.code}>
                        <td><strong>{item.name}</strong></td>
                        <td><code>{item.code}</code></td>
                        <td>{item.appliesTo}</td>
                        <td>{item.description || '—'}</td>
                        <td><ActiveBadge active={item.isActive} /></td>
                        <td>
                          <div className="row-actions">
                            <button className="button button-secondary" type="button" disabled title="La edición llega cuando el backend exponga el endpoint (DoR abierto)."><Pencil size={16} />Editar</button>
                            <button className="icon-button" type="button" disabled aria-label="Eliminar categoría" title="La eliminación llega cuando el backend exponga el endpoint (DoR abierto)."><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!categories.data.length && (
                      <tr><td className="empty-cell" colSpan={6}>
                        <Search size={27} /><strong>No hay categorías registradas</strong>
                        <span>El catálogo de estados aún no tiene categorías.</span>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="table-footer">
              <span>Total: {categories.data.length}</span>
              <span>{isDemoMode ? 'Datos locales de demostración; no se guardan en el backend' : 'Los permisos de alcance los valida el servicio'}</span>
            </div>
          </div>
        )}

        {tab === 'statuses' && (
          <div>
            <div className="panel-heading">
              <div><h2>Estados</h2><p>Cada estado pertenece a una categoría y define si es inicial, terminal, su orden y color.</p></div>
              <button className="button btn-primary" type="button" disabled title="La creación llega cuando el backend exponga el endpoint (DoR abierto).">
                <Plus size={18} />Nuevo estado
              </button>
            </div>
            {statuses.error && <div className="error-banner" role="alert">{statuses.error} <button type="button" className="text-action" onClick={() => void refresh()}>Reintentar</button></div>}
            {statuses.loading ? <p className="loading-state">Cargando estados…</p> : (
              <div className="table-wrap">
                <table>
                  <caption className="sr-only">Estados</caption>
                  <thead><tr><th scope="col">Categoría</th><th scope="col">Estado</th><th scope="col">Código</th><th scope="col">Orden</th><th scope="col">Inicial</th><th scope="col">Terminal</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead>
                  <tbody>
                    {statuses.data.map(item => (
                      <tr key={item.code}>
                        <td>{item.categoryName}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, display: 'inline-block', background: item.colorHex }} />
                            <strong>{item.name}</strong>
                          </span>
                        </td>
                        <td><code>{item.code}</code></td>
                        <td>{item.displayOrder}</td>
                        <td><FlagBadge on={item.isInitial} label="Inicial" /></td>
                        <td><FlagBadge on={item.isTerminal} label="Terminal" /></td>
                        <td><ActiveBadge active={item.isActive} /></td>
                        <td>
                          <div className="row-actions">
                            <button className="button button-secondary" type="button" disabled title="La edición llega cuando el backend exponga el endpoint (DoR abierto)."><Pencil size={16} />Editar</button>
                            <button className="icon-button" type="button" disabled aria-label="Eliminar estado" title="La eliminación llega cuando el backend exponga el endpoint (DoR abierto)."><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!statuses.data.length && (
                      <tr><td className="empty-cell" colSpan={8}>
                        <Search size={27} /><strong>No hay estados registrados</strong>
                        <span>El catálogo de estados aún no tiene estados.</span>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="table-footer">
              <span>Total: {statuses.data.length}</span>
              <span>{isDemoMode ? 'Datos locales de demostración; no se guardan en el backend' : 'Los permisos de alcance los valida el servicio'}</span>
            </div>
          </div>
        )}

        {tab === 'transitions' && (
          <div>
            <div className="panel-heading">
              <div><h2>Transiciones permitidas</h2><p>Define qué cambios de estado son válidos y qué permiso los habilita.</p></div>
              <button className="button btn-primary" type="button" disabled title="La creación llega cuando el backend exponga el endpoint (DoR abierto).">
                <Plus size={18} />Nueva transición
              </button>
            </div>
            {transitions.error && <div className="error-banner" role="alert">{transitions.error} <button type="button" className="text-action" onClick={() => void refresh()}>Reintentar</button></div>}
            {transitions.loading ? <p className="loading-state">Cargando transiciones…</p> : (
              <div className="table-wrap">
                <table>
                  <caption className="sr-only">Transiciones permitidas</caption>
                  <thead><tr><th scope="col">Categoría</th><th scope="col">Desde</th><th scope="col"><span className="sr-only">Hacia</span></th><th scope="col">Hacia</th><th scope="col">Permiso requerido</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead>
                  <tbody>
                    {transitions.data.map(item => (
                      <tr key={`${item.categoryCode}-${item.fromName}-${item.toName}`}>
                        <td>{item.categoryName}</td>
                        <td><SourceBadge label={item.fromName} /></td>
                        <td aria-hidden="true"><ChevronRight size={16} /></td>
                        <td><TargetBadge label={item.toName} /></td>
                        <td>{item.requiredFeature
                          ? <span><Lock size={13} /> <code>{item.requiredFeature}</code></span>
                          : <span className="status-badge inactive">Libre</span>}</td>
                        <td><ActiveBadge active={item.isActive} /></td>
                        <td>
                          <div className="row-actions">
                            <button className="button button-secondary" type="button" disabled title="La edición llega cuando el backend exponga el endpoint (DoR abierto)."><Pencil size={16} />Editar</button>
                            <button className="icon-button" type="button" disabled aria-label="Eliminar transición" title="La eliminación llega cuando el backend exponga el endpoint (DoR abierto)."><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!transitions.data.length && !transitions.error && (
                      <tr><td className="empty-cell" colSpan={6}>
                        <Search size={27} /><strong>No hay transiciones registradas</strong>
                        <span>Aún no hay transiciones permitidas configuradas.</span>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="table-footer">
              <span>Total: {transitions.data.length}</span>
              <span>{isDemoMode ? 'Datos locales de demostración; no se guardan en el backend' : 'Los permisos de alcance los valida el servicio'}</span>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

