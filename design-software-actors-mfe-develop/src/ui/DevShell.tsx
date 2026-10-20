import { useState, type ReactNode } from 'react'
import {
  Bell,
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Activity,
  UsersRound,
  X,
  ChevronDown,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '#inicio', label: 'Inicio', icon: LayoutDashboard },
  { href: '#horarios', label: 'Horarios', icon: CalendarDays },
  { href: '#disponibilidad', label: 'Disponibilidad', icon: Activity },
  { href: '#fichas', label: 'Fichas', icon: BookOpen },
  // OJO dev-only: aquí Instructores SÍ navega a `/` (en App.tsx es `#instructores`
  // porque ya está en esa pantalla; aquí el hash te dejaría clavado en estados).
  { href: '/', label: 'Instructores', icon: UsersRound },
  { href: '/aprendices', label: 'Aprendices', icon: GraduationCap },
  { href: '/admin/parametrizacion/estados', label: 'Estados de actores', icon: Settings },
]

/**
 * ui/DevShell — marco dev-only (topbar + sidebar) para las pantallas que no
 * traen chrome propio. Réplica visual de App.tsx SIN duplicar su lógica:
 * en producción el shell-host real aporta el marco (ADR-009 §10).
 * No envolver pantallas existentes: solo las nuevas que lo necesiten.
 */
export default function DevShell({ children, activeHref }: { children: ReactNode; activeHref: string }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-shell">
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
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              const active = item.href === activeHref
              return (
                <a key={item.href} href={item.href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
                  <Icon size={19} />{item.label}
                </a>
              )
            })}
          </nav>
          <div className="sidebar-footer">
            <ShieldCheck size={17} />
            <span>Acceso de coordinador</span>
          </div>
        </aside>

        {children}
      </div>
    </div>
  )
}
