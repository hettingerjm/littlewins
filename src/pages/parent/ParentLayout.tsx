import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAllClaims } from '../../hooks/data'

const tabs = [
  { to: '/parent', label: 'Today', emoji: '📊', end: true },
  { to: '/parent/history', label: 'History', emoji: '📜', end: false },
  { to: '/parent/tasks', label: 'Tasks', emoji: '✅', end: false },
  { to: '/parent/rewards', label: 'Rewards', emoji: '🎁', end: false },
  { to: '/parent/claims', label: 'Claims', emoji: '📨', end: false },
  { to: '/parent/kids', label: 'Kids', emoji: '🧒', end: false },
  { to: '/parent/settings', label: 'Settings', emoji: '⚙️', end: false },
]

export default function ParentLayout() {
  const navigate = useNavigate()
  const { signOutAll, familyId } = useAuth()
  const { claims } = useAllClaims(familyId)
  const pendingCount = claims.filter((c) => c.status === 'pending').length

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-black text-slate-900">
            <span aria-hidden>⭐</span> Parent Dashboard
            {familyId && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold capitalize text-slate-500">
                {familyId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/who')}
              className="text-sm font-bold text-slate-400 hover:text-slate-600"
            >
              Kids' app
            </button>
            <button
              onClick={() => {
                void signOutAll().then(() => navigate('/', { replace: true }))
              }}
              className="text-sm font-bold text-slate-400 hover:text-slate-600"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-2 pb-2">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`
              }
            >
              <span aria-hidden>{tab.emoji}</span>
              {tab.label}
              {tab.to === '/parent/claims' && pendingCount > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-400 px-1.5 text-xs font-black text-white">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
