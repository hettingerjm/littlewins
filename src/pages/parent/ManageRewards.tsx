import { FormEvent, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRewards } from '../../hooks/data'
import { createReward, deleteReward, updateReward, type RewardInput } from '../../lib/db'
import type { FamilyId, Reward } from '../../types'
import { Badge, EmptyState, PageHeader, Spinner } from '../../components/ui'

const emptyDraft = (order: number): RewardInput => ({
  title: '',
  description: '',
  cost: 10,
  active: true,
  order,
})

export default function ManageRewards() {
  const { familyId } = useAuth()
  const { rewards, loading } = useRewards(familyId)
  const [editing, setEditing] = useState<Reward | null>(null)
  const [creating, setCreating] = useState(false)

  if (loading) return <Spinner label="Loading rewards…" />

  return (
    <>
      <PageHeader
        title="Rewards"
        subtitle="Set up what the kids can spend their points on."
        right={
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Add reward
          </button>
        }
      />

      {rewards.length === 0 ? (
        <EmptyState emoji="🎁" title="No rewards yet" hint="Add a reward the kids can save up for." />
      ) : (
        <ul className="space-y-2">
          {rewards.map((reward) => (
            <li
              key={reward.id}
              className={`card flex items-center gap-3 p-4 ${reward.active ? '' : 'opacity-60'}`}
            >
              <div className="text-2xl" aria-hidden>
                🎈
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-800">{reward.title}</span>
                  {!reward.active && <Badge tone="rose">Inactive</Badge>}
                </div>
                {reward.description && (
                  <div className="mt-0.5 text-xs text-slate-400">{reward.description}</div>
                )}
                <div className="mt-1 text-sm font-black text-indigo-600">{reward.cost} points</div>
              </div>
              <button onClick={() => setEditing(reward)} className="btn-ghost text-sm">
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}

      {(creating || editing) && familyId && (
        <RewardForm
          familyId={familyId}
          reward={editing}
          defaultOrder={rewards.length}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

function RewardForm({
  familyId,
  reward,
  defaultOrder,
  onClose,
}: {
  familyId: FamilyId
  reward: Reward | null
  defaultOrder: number
  onClose: () => void
}) {
  const [draft, setDraft] = useState<RewardInput>(
    reward
      ? {
          title: reward.title,
          description: reward.description ?? '',
          cost: reward.cost,
          active: reward.active,
          order: reward.order,
        }
      : emptyDraft(defaultOrder),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim()) return setError('Please enter a title.')
    setBusy(true)
    setError(null)
    try {
      const clean: RewardInput = {
        ...draft,
        title: draft.title.trim(),
        description: draft.description?.trim() || undefined,
        cost: Math.max(0, Math.round(draft.cost)),
      }
      if (reward) await updateReward(familyId, reward.id, clean)
      else await createReward(familyId, clean)
      onClose()
    } catch (err) {
      console.error(err)
      setError('Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async () => {
    if (!reward) return
    if (!confirm(`Delete "${reward.title}"?`)) return
    setBusy(true)
    try {
      await deleteReward(familyId, reward.id)
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
        <h2 className="mb-5 text-xl font-black text-slate-900">
          {reward ? 'Edit reward' : 'New reward'}
        </h2>

        <label className="label" htmlFor="r-title">
          Title
        </label>
        <input
          id="r-title"
          className="input mb-4"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          autoFocus
        />

        <label className="label" htmlFor="r-desc">
          Description (optional)
        </label>
        <input
          id="r-desc"
          className="input mb-4"
          value={draft.description ?? ''}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />

        <label className="label" htmlFor="r-cost">
          Point cost
        </label>
        <input
          id="r-cost"
          type="number"
          min={0}
          className="input mb-4"
          value={draft.cost}
          onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) })}
        />

        <label className="mb-2 flex items-center gap-2 font-bold text-slate-600">
          <input
            type="checkbox"
            className="h-5 w-5 rounded"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />
          Active
        </label>

        {error && <p className="mt-2 text-sm font-bold text-rose-500">{error}</p>}

        <div className="mt-6 flex items-center gap-2">
          <button type="submit" disabled={busy} className="btn-primary flex-1">
            {busy ? 'Saving…' : 'Save reward'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          {reward && (
            <button type="button" onClick={onDelete} disabled={busy} className="btn-danger">
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
