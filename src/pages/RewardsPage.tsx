import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useChildClaims, useChildCompletions, useChildren, useRewards } from '../hooks/data'
import { requestReward } from '../lib/db'
import { availableBalance } from '../lib/points'
import { getTheme } from '../config'
import { sound } from '../lib/sound'
import { confetti } from '../lib/confetti'
import type { ChildId, FamilyId, Reward, RewardClaim } from '../types'
import { Badge, Spinner, StatCard } from '../components/ui'
import { SoundToggle } from '../components/SoundToggle'

const STATUS_TONE = {
  pending: 'amber',
  approved: 'indigo',
  fulfilled: 'green',
  denied: 'rose',
} as const

const STATUS_LABEL = {
  pending: 'Waiting for parent',
  approved: 'Approved!',
  fulfilled: 'Got it! 🎉',
  denied: 'Not this time',
} as const

export default function RewardsPage() {
  const { childId = '' } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { familyId } = useAuth()

  const { children, loading: childrenLoading } = useChildren(familyId)
  const { rewards, loading: rewardsLoading } = useRewards(familyId)
  const { completions, loading: compLoading } = useChildCompletions(familyId, childId)
  const { claims, loading: claimsLoading } = useChildClaims(familyId, childId)

  const child = children.find((c) => c.id === childId)

  if (childrenLoading || rewardsLoading || compLoading || claimsLoading)
    return <Spinner label="Loading rewards…" />

  if (!child) {
    return (
      <div className="p-8 text-center">
        <Link to="/who" className="btn-primary">
          Back to profiles
        </Link>
      </div>
    )
  }

  const balance = availableBalance(completions, claims, child.id)
  const activeRewards = rewards.filter((r) => r.active)
  const pendingByReward = new Set(
    claims.filter((c) => c.status === 'pending').map((c) => c.rewardId),
  )
  const recentClaims = [...claims]
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
    .slice(0, 8)

  const accent = getTheme(child.theme).accent

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <div className="mb-5 flex items-center justify-between">
        <button onClick={() => navigate(`/kid/${child.id}`)} className="text-2xl" aria-label="Back">
          ‹
        </button>
        <h1 className="text-xl font-black text-slate-900">🎁 Rewards</h1>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <span className="text-3xl" aria-hidden>
            {child.emoji}
          </span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Points to spend" value={balance} emoji="🪙" accent={accent} />
        <StatCard label="Requests" value={claims.length} emoji="📨" />
      </div>

      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-400">
        Available rewards
      </h2>
      {activeRewards.length === 0 ? (
        <div className="card px-6 py-10 text-center text-slate-400">
          <div className="text-4xl">🛒</div>
          <p className="mt-2 font-bold text-slate-600">No rewards yet.</p>
          <p className="text-sm">Ask a parent to add some!</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {activeRewards.map((reward) => (
            <RewardRow
              key={reward.id}
              familyId={familyId!}
              reward={reward}
              childId={child.id}
              balance={balance}
              pending={pendingByReward.has(reward.id)}
              accent={accent}
            />
          ))}
        </ul>
      )}

      {recentClaims.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-black uppercase tracking-wide text-slate-400">
            My requests
          </h2>
          <ul className="space-y-2">
            {recentClaims.map((claim) => (
              <ClaimRow key={claim.id} claim={claim} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function RewardRow({
  familyId,
  reward,
  childId,
  balance,
  pending,
  accent,
}: {
  familyId: FamilyId
  reward: Reward
  childId: ChildId
  balance: number
  pending: boolean
  accent: string
}) {
  const [busy, setBusy] = useState(false)
  const affordable = balance >= reward.cost

  const onRequest = async () => {
    if (busy || pending) return
    setBusy(true)
    void sound.play('reward')
    try {
      await requestReward(familyId, childId, reward)
      confetti({ originY: 0.4, count: 90, power: 0.85 })
    } catch (err) {
      console.error('Could not request reward', err)
      void sound.play('error')
      alert("That didn't save — please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="card flex animate-fade-up items-center gap-3 p-4">
      <div className="text-3xl" aria-hidden>
        🎈
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-slate-800">{reward.title}</div>
        {reward.description && (
          <div className="mt-0.5 text-xs text-slate-400">{reward.description}</div>
        )}
        <div className={`mt-1 text-sm font-black ${accent}`}>{reward.cost} points</div>
      </div>
      {pending ? (
        <Badge tone="amber">Requested</Badge>
      ) : (
        <button
          onClick={onRequest}
          disabled={busy || !affordable}
          className="btn-primary shrink-0"
          title={affordable ? 'Request this reward' : 'Not enough points yet'}
        >
          {busy ? '…' : affordable ? 'Request' : 'Locked'}
        </button>
      )}
    </li>
  )
}

function ClaimRow({ claim }: { claim: RewardClaim }) {
  return (
    <li className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-slate-100">
      <div className="min-w-0">
        <div className="truncate font-bold text-slate-700">{claim.rewardTitle}</div>
        <div className="text-xs text-slate-400">{claim.cost} points</div>
      </div>
      <Badge tone={STATUS_TONE[claim.status]}>{STATUS_LABEL[claim.status]}</Badge>
    </li>
  )
}
