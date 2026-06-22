import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import { SoundToggle } from '../components/SoundToggle'

export default function FamilyPin() {
  const { familyId = '' } = useParams<{ familyId: string }>()
  const { enterPin, role, familyId: sessionFamily } = useAuth()
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [wrongKey, setWrongKey] = useState(0)
  const [busy, setBusy] = useState(false)

  // Already in this family's session? Skip ahead.
  useEffect(() => {
    if (role === 'parent') navigate('/parent', { replace: true })
    else if (role === 'child' && sessionFamily === familyId) navigate('/who', { replace: true })
  }, [role, sessionFamily, familyId, navigate])

  const append = (d: string) => {
    setError(false)
    void sound.play('tap')
    setPin((p) => (p.length >= 10 ? p : p + d))
  }
  const backspace = () => {
    setError(false)
    void sound.play('tap')
    setPin((p) => p.slice(0, -1))
  }

  const submit = async () => {
    if (!pin || busy) return
    setBusy(true)
    try {
      const ok = await enterPin(familyId, pin)
      if (ok) {
        void sound.play('unlock')
        navigate('/who', { replace: true })
      } else {
        void sound.play('error')
        setError(true)
        setWrongKey((k) => k + 1)
        setPin('')
      }
    } catch {
      void sound.play('error')
      setError(true)
      setWrongKey((k) => k + 1)
    } finally {
      setBusy(false)
    }
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
        <p className="mt-1 text-slate-500">
          Family PIN for <span className="font-bold capitalize">{familyId}</span>
        </p>

        <div
          key={wrongKey}
          className={`mt-6 flex justify-center gap-2 ${error ? 'animate-shake' : ''}`}
          aria-hidden
        >
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full transition ${
                i < pin.length ? 'bg-indigo-500' : 'bg-slate-200'
              } ${error ? 'bg-rose-400' : ''}`}
            />
          ))}
        </div>
        {error && (
          <p className="mt-3 text-sm font-bold text-rose-500">That PIN didn't work — try again.</p>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => append(d)}
              className="btn aspect-square rounded-2xl bg-white text-2xl text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              {d}
            </button>
          ))}
          <button onClick={backspace} className="btn aspect-square rounded-2xl text-2xl text-slate-500">
            ⌫
          </button>
          <button
            onClick={() => append('0')}
            className="btn aspect-square rounded-2xl bg-white text-2xl text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          >
            0
          </button>
          <button
            onClick={submit}
            disabled={pin.length < 1 || busy}
            className="btn aspect-square rounded-2xl bg-indigo-600 text-2xl text-white hover:bg-indigo-700"
          >
            {busy ? '…' : '✓'}
          </button>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-8 text-sm font-bold text-slate-400 hover:text-slate-600"
        >
          ← Different family
        </button>
      </div>
    </div>
  )
}
