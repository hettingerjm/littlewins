import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ParentLogin() {
  const { parentSignIn, role } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (role === 'parent') navigate('/parent', { replace: true })
  }, [role, navigate])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await parentSignIn(email, password)
      navigate('/parent', { replace: true })
    } catch (err) {
      console.error(err)
      setError('Incorrect email or password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-6">
      <form onSubmit={onSubmit} className="card w-full max-w-sm p-7">
        <div className="mb-6 text-center">
          <div className="text-4xl" aria-hidden>
            👋
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900">Parent sign in</h1>
          <p className="text-sm text-slate-500">Manage tasks, rewards, and approvals</p>
        </div>

        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="input mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="mt-3 text-sm font-bold text-rose-500">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 w-full text-sm font-bold text-slate-400 hover:text-slate-600"
        >
          ← Back to the kids' app
        </button>
      </form>
    </div>
  )
}
