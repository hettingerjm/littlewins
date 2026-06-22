import { FormEvent, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { PageHeader } from '../../components/ui'

const setFamilyPinFn = httpsCallable<{ pin: string }, { ok: boolean }>(functions, 'setFamilyPin')

export default function ParentSettings() {
  const { familyId } = useAuth()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const familyLink = `${window.location.origin}/f/${familyId ?? ''}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(familyLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!/^\d{4,10}$/.test(pin)) {
      setMsg({ kind: 'err', text: 'PIN must be 4–10 digits.' })
      return
    }
    if (pin !== confirm) {
      setMsg({ kind: 'err', text: "The PINs don't match." })
      return
    }
    setBusy(true)
    try {
      await setFamilyPinFn({ pin })
      setMsg({ kind: 'ok', text: 'PIN updated! The kids will use the new PIN next time.' })
      setPin('')
      setConfirm('')
    } catch (err) {
      console.error(err)
      setMsg({ kind: 'err', text: 'Could not update the PIN. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Your family link and PIN." />

      <section className="card mb-5 p-5">
        <h2 className="mb-1 font-black text-slate-800">Family link</h2>
        <p className="mb-3 text-sm text-slate-500">
          Open this on the kids' device (bookmark it). They'll enter the PIN, then pick their
          profile.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-xl bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
            {familyLink}
          </code>
          <button onClick={copyLink} className="btn-ghost shrink-0 text-sm">
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-black text-slate-800">Reset family PIN</h2>
        <p className="mb-4 text-sm text-slate-500">
          Choose a new 4–10 digit PIN. It takes effect immediately.
        </p>
        <form onSubmit={submit} className="max-w-sm">
          <label className="label" htmlFor="pin">
            New PIN
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            className="input mb-3"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            maxLength={10}
          />
          <label className="label" htmlFor="confirm">
            Confirm PIN
          </label>
          <input
            id="confirm"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
            maxLength={10}
          />
          {msg && (
            <p className={`mt-3 text-sm font-bold ${msg.kind === 'ok' ? 'text-emerald-600' : 'text-rose-500'}`}>
              {msg.text}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-primary mt-4">
            {busy ? 'Saving…' : 'Update PIN'}
          </button>
        </form>
      </section>
    </>
  )
}
