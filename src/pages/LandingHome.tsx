import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import { SoundToggle } from '../components/SoundToggle'

export default function LandingHome() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  useEffect(() => {
    if (role === 'parent') navigate('/parent', { replace: true })
    else if (role === 'child') navigate('/who', { replace: true })
  }, [role, navigate])

  const go = (e: FormEvent) => {
    e.preventDefault()
    const slug = code.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!slug) return
    void sound.play('tap')
    navigate(`/f/${slug}`)
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-pink-50 px-6">
      <div className="absolute right-4 top-4">
        <SoundToggle />
      </div>
      <div className="w-full max-w-xs text-center">
        <div className="text-6xl animate-float" aria-hidden>
          ⭐
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Little Wins</h1>
        <p className="mt-1 text-slate-500">Enter your family code</p>

        <form onSubmit={go} className="mt-6">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. hettinger"
            autoCapitalize="none"
            autoCorrect="off"
            className="input text-center text-lg"
            aria-label="Family code"
          />
          <button type="submit" disabled={!code.trim()} className="btn-primary mt-3 w-full">
            Continue →
          </button>
        </form>

        <button
          onClick={() => navigate('/parent/login')}
          className="mt-8 text-sm font-bold text-slate-400 hover:text-slate-600"
        >
          I'm a parent →
        </button>
      </div>
    </div>
  )
}
