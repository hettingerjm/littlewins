import { useState } from 'react'
import { getChild } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { useAllClaims } from '../../hooks/data'
import { decideClaim } from '../../lib/db'
import { sound } from '../../lib/sound'
import { confetti } from '../../lib/confetti'
import type { ClaimStatus, RewardClaim } from '../../types'
import { Badge, EmptyState, PageHeader, Spinner } from '../../components/ui'

const STATUS_TONE = {
  pending: 'amber',
  approved: 'indigo',
  fulfilled: 'green',
  denied: 'rose',
} as const

function formatWhen(claim: RewardClaim): string {
  const ms = claim.createdAt?.toMillis?.()
  if (!ms) return ''
  const d = new Date(ms)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ManageClaims() {
  const { claims, loading } = useAllClaims()
  const { user } = useAuth()
  const [busyId, setBusyId] = useState<string | null>(null)

  const decide = async (claim: RewardClaim, status: ClaimStatus) => {
    setBusyId(claim.id)
    try {
      await decideClaim(claim.id, status, user?.uid ?? 'parent')
      if (status === 'fulfilled') {
        void sound.play('celebrate')
        confetti({ originY: 0.35, count: 120 })
      } else if (status === 'approved') {
        void sound.play('check')
      } else {
        void sound.play('tap')
      }
    } catch (err) {
      console.error(err)
      alert('Could not update this claim.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <Spinner label="Loading claims…" />

  const pending = claims.filter((c) => c.status === 'pending')
  const decided = claims.filter((c) => c.status !== 'pending')

  return (
    <>
      <PageHeader title="Reward claims" subtitle="Approve, fulfill, or deny what the kids request." />

      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-400">
        Needs your attention ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <EmptyState emoji="✅" title="All caught up!" hint="No pending reward requests." />
      ) : (
        <ul className="space-y-2">
          {pending.map((claim) => (
            <ClaimItem key={claim.id} claim={claim} busy={busyId === claim.id}>
              <button
                onClick={() => decide(claim, 'approved')}
                disabled={busyId === claim.id}
                className="btn-ghost text-sm"
              >
                Approve
              </button>
              <button
                onClick={() => decide(claim, 'fulfilled')}
                disabled={busyId === claim.id}
                className="btn-primary text-sm"
              >
                Fulfill
              </button>
              <button
                onClick={() => decide(claim, 'denied')}
                disabled={busyId === claim.id}
                className="btn-danger text-sm"
              >
                Deny
              </button>
            </ClaimItem>
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-black uppercase tracking-wide text-slate-400">
            History
          </h2>
          <ul className="space-y-2">
            {decided.map((claim) => (
              <ClaimItem key={claim.id} claim={claim} busy={busyId === claim.id}>
                {claim.status === 'approved' && (
                  <button
                    onClick={() => decide(claim, 'fulfilled')}
                    disabled={busyId === claim.id}
                    className="btn-primary text-sm"
                  >
                    Mark fulfilled
                  </button>
                )}
              </ClaimItem>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

function ClaimItem({
  claim,
  busy,
  children,
}: {
  claim: RewardClaim
  busy: boolean
  children?: React.ReactNode
}) {
  const child = getChild(claim.childId)
  return (
    <li className={`card flex flex-wrap items-center gap-3 p-4 ${busy ? 'opacity-60' : ''}`}>
      <span className="text-2xl" aria-hidden>
        {child?.emoji ?? '🎁'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-slate-800">{claim.rewardTitle ?? 'Reward'}</div>
        <div className="text-xs text-slate-400">
          {child?.name ?? claim.childId} • {claim.cost} points • {formatWhen(claim)}
        </div>
      </div>
      <Badge tone={STATUS_TONE[claim.status]}>{claim.status}</Badge>
      <div className="flex items-center gap-2">{children}</div>
    </li>
  )
}
