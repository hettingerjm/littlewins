import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useChildren } from '../hooks/data'
import { getTheme } from '../config'
import { sound } from '../lib/sound'
import { SoundToggle } from '../components/SoundToggle'
import { EmptyState, Spinner } from '../components/ui'

export default function ProfileSelect() {
  const navigate = useNavigate()
  const { familyId, role, signOutAll } = useAuth()
  const { children, loading } = useChildren(familyId)

  const choose = (id: string) => {
    void sound.play('tap')
    navigate(`/kid/${id}`)
  }

  const lock = () => {
    void signOutAll().then(() => navigate('/', { replace: true }))
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50 px-6">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <SoundToggle />
        {role === 'parent' && (
          <button
            onClick={() => navigate('/parent')}
            className="rounded-full bg-white/70 px-3 py-2 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200"
          >
            Parent →
          </button>
        )}
      </div>

      <h1 className="mb-1 animate-fade-up text-2xl font-black text-slate-900">Who's playing?</h1>
      <p className="mb-8 animate-fade-up text-slate-500">Tap your name</p>

      {loading ? (
        <Spinner label="Loading profiles…" />
      ) : children.length === 0 ? (
        <EmptyState
          emoji="👶"
          title="No kids set up yet"
          hint="A parent can add children from the parent dashboard."
        />
      ) : (
        <div className="grid w-full max-w-md grid-cols-2 gap-5">
          {children.map((child, i) => (
            <button
              key={child.id}
              onClick={() => choose(child.id)}
              style={{ animationDelay: `${i * 90}ms` }}
              className={`group flex aspect-square animate-scale-in flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-br text-white shadow-lg ring-4 transition hover:-translate-y-1 hover:shadow-xl active:scale-[0.97] ${getTheme(child.theme).profile}`}
            >
              <span className="text-6xl transition group-hover:scale-110 group-hover:animate-wiggle" aria-hidden>
                {child.emoji}
              </span>
              <span className="text-2xl font-black tracking-tight">{child.name}</span>
            </button>
          ))}
        </div>
      )}

      <button onClick={lock} className="mt-10 text-sm font-bold text-slate-400 hover:text-slate-600">
        Lock app 🔒
      </button>
    </div>
  )
}
