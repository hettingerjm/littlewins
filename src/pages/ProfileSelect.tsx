import { useNavigate } from 'react-router-dom'
import { CHILDREN } from '../config'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import { SoundToggle } from '../components/SoundToggle'

export default function ProfileSelect() {
  const navigate = useNavigate()
  const { signOutAll } = useAuth()

  const themes = {
    emma: 'from-pink-400 to-pink-600 ring-pink-200',
    sophia: 'from-indigo-400 to-indigo-600 ring-indigo-200',
  } as const

  const choose = (id: string) => {
    void sound.play('tap')
    navigate(`/kid/${id}`)
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50 px-6">
      <div className="absolute right-4 top-4">
        <SoundToggle />
      </div>
      <h1 className="mb-1 animate-fade-up text-2xl font-black text-slate-900">Who's playing?</h1>
      <p className="mb-8 animate-fade-up text-slate-500">Tap your name</p>

      <div className="grid w-full max-w-md grid-cols-2 gap-5">
        {CHILDREN.map((child, i) => (
          <button
            key={child.id}
            onClick={() => choose(child.id)}
            style={{ animationDelay: `${i * 90}ms` }}
            className={`group flex aspect-square animate-scale-in flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-br text-white shadow-lg ring-4 transition hover:-translate-y-1 hover:shadow-xl active:scale-[0.97] ${themes[child.theme]}`}
          >
            <span className="text-6xl transition group-hover:scale-110 group-hover:animate-wiggle" aria-hidden>
              {child.emoji}
            </span>
            <span className="text-2xl font-black tracking-tight">{child.name}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => {
          void signOutAll().then(() => navigate('/', { replace: true }))
        }}
        className="mt-10 text-sm font-bold text-slate-400 hover:text-slate-600"
      >
        Lock app 🔒
      </button>
    </div>
  )
}
