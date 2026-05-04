import { useState, useEffect } from 'react'
import DashboardScreen  from './components/DashboardScreen'
import AdminScreen      from './components/AdminScreen'
import NominaScreen     from './components/NominaScreen'
import VacacionesScreen from './components/VacacionesScreen'
import AlertsScreen     from './components/AlertsScreen'
import AsistenteIA      from './components/AsistenteIA'
import RegistroManual   from './components/RegistroManual'
import LoginScreen      from './components/LoginScreen'
import { supabase }     from './lib/supabase'
import './index.css'

const TABS = [
  { id:'dashboard',  label:'Dashboard',  icon:ChartIcon  },
  { id:'registros',  label:'Registros',  icon:GridIcon   },
  { id:'nomina',     label:'Nomina',     icon:MoneyIcon  },
  { id:'vacaciones', label:'Vacaciones', icon:CalIcon    },
  { id:'manual',     label:'Manual',     icon:EditIcon   },
  { id:'ia',         label:'IA RRHH',    icon:BotIcon    },
  { id:'alertas',    label:'Alertas',    icon:BellIcon   },
]

export default function AppAdmin() {
  const [tab,        setTab]        = useState('dashboard')
  const [session,    setSession]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="splash"><div className="splash-dot" /></div>

  if (!session) return (
    <div className="app-shell">
      <div className="emp-header admin-header">
        <div className="emp-header-logo">👨‍💼</div>
        <div>
          <div className="emp-header-title">Panel de Administrador</div>
          <div className="emp-header-sub">VR Insurance Group</div>
        </div>
      </div>
      <main className="screen-area"><LoginScreen /></main>
    </div>
  )

  const screens = {
    dashboard:  <DashboardScreen />,
    registros:  <AdminScreen isAdmin={true} />,
    nomina:     <NominaScreen isAdmin={true} />,
    vacaciones: <VacacionesScreen isAdmin={true} />,
    manual:     <RegistroManual />,
    ia:         <AsistenteIA />,
    alertas:    <AlertsScreen onNotifCount={setNotifCount} />,
  }

  return (
    <div className="app-shell">
      <div className="emp-header admin-header">
        <div className="emp-header-logo">👨‍💼</div>
        <div style={{flex:1}}>
          <div className="emp-header-title">Panel de Administrador</div>
          <div className="emp-header-sub">VR Insurance Group</div>
        </div>
        <button onClick={() => supabase.auth.signOut()}
          style={{fontSize:12,padding:'4px 10px',borderRadius:8,border:'0.5px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.15)',color:'white',cursor:'pointer'}}>
          Salir
        </button>
      </div>
      <main className="screen-area">{screens[tab]}</main>
      <nav className="bottom-nav" style={{gridTemplateColumns:'repeat(7,1fr)'}}>
        {TABS.map(t => (
          <button key={t.id} className={"nav-btn " + (tab===t.id?'active':'')} onClick={() => setTab(t.id)}>
            <t.icon />
            <span>{t.label}</span>
            {t.id==='alertas' && notifCount>0 && <span className="notif-badge">{notifCount}</span>}
          </button>
        ))}
      </nav>
    </div>
  )
}

function ChartIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
function GridIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> }
function MoneyIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
function CalIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function EditIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function BotIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="12" y1="15" x2="12" y2="15"/><line x1="16" y1="15" x2="16" y2="15"/></svg> }
function BellIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> }
