import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NotAuthorizedError, useAuth } from '../../context/AuthContext'

export default function ParentLogin() {
  const { parentSignInWithGoogle, signOutAll, role, user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (role === 'parent') navigate('/parent', { replace: true })
  }, [role, navigate])

  // A Google account signed in that isn't on the parent allow-list.
  const signedInButNotParent = !!user && !user.isAnonymous && role !== 'parent'

  const onSignIn = async () => {
    setError(null)
    setBusy(true)
    try {
      await parentSignInWithGoogle()
      navigate('/parent', { replace: true })
    } catch (err) {
      if (err instanceof NotAuthorizedError) {
        setError(
          `${err.email ?? 'That account'} isn't authorized as a parent. ` +
            'Ask an admin to add it to the parent list.',
        )
      } else if ((err as { code?: string })?.code === 'auth/popup-closed-by-user') {
        setError(null)
      } else {
        console.error(err)
        setError('Sign-in failed. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-6">
      <div className="card w-full max-w-sm p-7 text-center">
        <div className="text-4xl" aria-hidden>
          👋
        </div>
        <h1 className="mt-2 text-2xl font-black text-slate-900">Parent sign in</h1>
        <p className="text-sm text-slate-500">Manage tasks, rewards, and approvals</p>

        {signedInButNotParent ? (
          <>
            <p className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
              {user?.email ?? 'This account'} isn't authorized as a parent.
            </p>
            <button onClick={() => void signOutAll()} className="btn-ghost mt-4 w-full">
              Use a different account
            </button>
          </>
        ) : (
          <button onClick={onSignIn} disabled={busy} className="btn-primary mt-6 w-full">
            <span aria-hidden>🇬</span>
            {busy ? 'Signing in…' : 'Sign in with Google'}
          </button>
        )}

        {error && <p className="mt-3 text-sm font-bold text-rose-500">{error}</p>}

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-5 w-full text-sm font-bold text-slate-400 hover:text-slate-600"
        >
          ← Back to the kids' app
        </button>
      </div>
    </div>
  )
}
