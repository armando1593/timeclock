import { useState, useEffect } from 'react'
import PunchScreen   from './components/PunchScreen'
import AdminScreen   from './components/AdminScreen'
import ReportsScreen from './components/ReportsScreen'
import AlertsScreen  from './components/AlertsScreen'
import LoginScreen   from './components/LoginScreen'
import { supabase }  from './lib/supabase'
import './index.css'

const TABS = [
  { id: 'punch',   label: 'Ponchar',   icon: ClockIcon   },
  { id: 'admin',   label: 'Registros', icon: GridIcon    },
  { id: 'reports', label: 'Reporte',   icon: ChartIcon   },
  { id: 'alerts',  label: 'Alertas',   icon: BellIcon    },
]

export default function App() {
  const [tab,     setTab]     = useState('punch')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="splash">
      <div className="splash-dot" />
    </div>
  )

  // La pantalla de ponche es pública; el resto requiere login
  const needsAuth = tab !== 'punch' && !session

  const screens = {
    punch:   <PunchScreen />,
    admin:   needsAuth ? <LoginScreen onLogin={() => {}} /> : <AdminScreen />,
    reports: needsAuth ? <LoginScreen onLogin={() => {}} /> : <ReportsScreen />,
    alerts:  needsAuth ? <LoginScreen onLogin={() => {}} /> : <AlertsScreen onNotifCount={setNotifCount} />,
  }

  return (
    <div className="app-shell">
      <main className="screen-area">
        {screens[tab]}
      </main>
      <nav className="bottom-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon />
            <span>{t.label}</span>
            {t.id === 'alerts' && notifCount > 0 && (
              <span className="notif-badge">{notifCount}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function GridIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
}
function ChartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
function BellIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}
