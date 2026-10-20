import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './ui/App'
import MyAvailability from './ui/MyAvailability'
import LearnersPage from './ui/LearnersPage'
import ActorStatusParametrization from './ui/ActorStatusParametrization'
import DevShell from './ui/DevShell'
import './ui/styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {window.location.pathname === '/instructor/mi-disponibilidad' ? <MyAvailability />
      : window.location.pathname === '/aprendices' ? <LearnersPage />
      : window.location.pathname === '/admin/parametrizacion/estados' ? (
        <DevShell activeHref="/admin/parametrizacion/estados">
          <ActorStatusParametrization />
        </DevShell>
      ) : <App />}
  </React.StrictMode>,
)
