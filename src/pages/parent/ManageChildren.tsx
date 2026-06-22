import { FormEvent, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useChildren } from '../../hooks/data'
import { createChild, deleteChild, updateChild, type ChildInput } from '../../lib/db'
import { THEME_KEYS, getTheme } from '../../config'
import type { Child, FamilyId, ThemeKey } from '../../types'
import { EmptyState, PageHeader, Spinner } from '../../components/ui'

const emptyDraft = (order: number): ChildInput => ({
  name: '',
  emoji: '🙂',
  theme: 'indigo',
  order,
})

export default function ManageChildren() {
  const { familyId } = useAuth()
  const { children, loading } = useChildren(familyId)
  const [editing, setEditing] = useState<Child | null>(null)
  const [creating, setCreating] = useState(false)

  if (loading) return <Spinner label="Loading kids…" />

  return (
    <>
      <PageHeader
        title="Kids"
        subtitle="The child profiles for your family."
        right={
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Add child
          </button>
        }
      />

      {children.length === 0 ? (
        <EmptyState emoji="🧒" title="No kids yet" hint="Add your children to start assigning tasks." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {children.map((child) => (
            <li key={child.id} className="card flex items-center gap-3 p-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl text-white ${getTheme(child.theme).profile}`}
              >
                {child.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black text-slate-800">{child.name}</div>
                <div className="text-xs capitalize text-slate-400">{child.theme}</div>
              </div>
              <button onClick={() => setEditing(child)} className="btn-ghost text-sm">
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}

      {(creating || editing) && familyId && (
        <ChildForm
          familyId={familyId}
          child={editing}
          defaultOrder={children.length}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

function ChildForm({
  familyId,
  child,
  defaultOrder,
  onClose,
}: {
  familyId: FamilyId
  child: Child | null
  defaultOrder: number
  onClose: () => void
}) {
  const [draft, setDraft] = useState<ChildInput>(
    child
      ? { name: child.name, emoji: child.emoji, theme: child.theme, order: child.order }
      : emptyDraft(defaultOrder),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim()) return setError('Please enter a name.')
    setBusy(true)
    setError(null)
    try {
      const clean: ChildInput = {
        ...draft,
        name: draft.name.trim(),
        emoji: draft.emoji.trim() || '🙂',
      }
      if (child) await updateChild(familyId, child.id, clean)
      else await createChild(familyId, clean)
      onClose()
    } catch (err) {
      console.error(err)
      setError('Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async () => {
    if (!child) return
    if (
      !confirm(
        `Remove ${child.name}? Their past history stays in the database but they'll no longer appear.`,
      )
    )
      return
    setBusy(true)
    try {
      await deleteChild(familyId, child.id)
      onClose()
    } catch (err) {
      console.error(err)
      setError('Could not delete.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-6">
      <form
        onSubmit={onSubmit}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
      >
        <h2 className="mb-5 text-xl font-black text-slate-900">{child ? 'Edit child' : 'New child'}</h2>

        <div className="mb-4 flex gap-3">
          <div className="w-20">
            <label className="label" htmlFor="c-emoji">
              Emoji
            </label>
            <input
              id="c-emoji"
              className="input text-center text-2xl"
              value={draft.emoji}
              onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
              maxLength={4}
            />
          </div>
          <div className="flex-1">
            <label className="label" htmlFor="c-name">
              Name
            </label>
            <input
              id="c-name"
              className="input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              autoFocus
            />
          </div>
        </div>

        <span className="label">Color theme</span>
        <div className="mb-4 flex flex-wrap gap-2">
          {THEME_KEYS.map((key: ThemeKey) => (
            <button
              type="button"
              key={key}
              onClick={() => setDraft({ ...draft, theme: key })}
              aria-label={key}
              className={`h-10 w-10 rounded-full bg-gradient-to-br ${getTheme(key).profile} ${
                draft.theme === key ? 'ring-4 ring-offset-2' : 'opacity-70'
              }`}
            />
          ))}
        </div>

        {error && <p className="mt-2 text-sm font-bold text-rose-500">{error}</p>}

        <div className="mt-6 flex items-center gap-2">
          <button type="submit" disabled={busy} className="btn-primary flex-1">
            {busy ? 'Saving…' : 'Save child'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          {child && (
            <button type="button" onClick={onDelete} disabled={busy} className="btn-danger">
              Remove
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
