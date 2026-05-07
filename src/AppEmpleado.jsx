import { useState, useEffect } from 'react'
import PunchScreen from './components/PunchScreen'
import AdminScreen from './components/AdminScreen'
import VacacionesScreen from './components/VacacionesScreen'
import NominaScreen from './components/NominaScreen'
import './index.css'

const TABS = [
  { id:'punch',      label:'Ponchar',    icon:ClockIcon  },
  { id:'registros',  label:'Registros',  icon:ListIcon   },
  { id:'nomina',     label:'Mi Nómina',  icon:MoneyIcon  },
  { id:'vacaciones', label:'Vacaciones', icon:CalIcon    },
]

export default function AppEmpleado() {
  const [tab, setTab] = useState('punch')

  const screens = {
    punch:      <PunchScreen />,
    registros:  <AdminScreen isAdmin={false} />,
    nomina:     <NominaScreen isAdmin={false} />,
    vacaciones: <VacacionesScreen isAdmin={false} />,
  }

  return (
    <div className="app-shell">
      <div className="emp-header">
        <div className="emp-header-logo">⏰</div>
        <div>
          <div className="emp-header-title">Control de Asistencia</div>
          <div className="emp-header-sub">VR Insurance Group</div>
        </div>
      </div>
      <main className="screen-area">{screens[tab]}</main>
      <nav className="bottom-nav" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {TABS.map(t => (
          <button key={t.id} className={`nav-btn ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
            <t.icon />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function ClockIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function ListIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> }
function MoneyIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
function CalIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
