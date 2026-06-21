import { useEffect, useState } from 'react'
import {
  onSnapshot,
  query,
  where,
  type Query,
  type DocumentData,
} from 'firebase/firestore'
import { claimsCol, completionsCol, rewardsCol, tasksCol } from '../lib/db'
import type { ChildId, Completion, Reward, RewardClaim, Task } from '../types'

/** Generic realtime list subscription with id + data merge. */
function useCollectionData<T>(q: Query<DocumentData>, deps: unknown[]) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T))
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { items, loading, error }
}

export function useTasks() {
  const { items, loading, error } = useCollectionData<Task>(query(tasksCol), [])
  const tasks = [...items].sort((a, b) => a.order - b.order)
  return { tasks, loading, error }
}

export function useRewards() {
  const { items, loading, error } = useCollectionData<Reward>(query(rewardsCol), [])
  const rewards = [...items].sort((a, b) => a.order - b.order)
  return { rewards, loading, error }
}

/** All completions for one child (full history; used for streaks + totals). */
export function useChildCompletions(childId: ChildId) {
  const { items, loading, error } = useCollectionData<Completion>(
    query(completionsCol, where('childId', '==', childId)),
    [childId],
  )
  return { completions: items, loading, error }
}

/** Completions across all children for a single day (parent "today" view). */
export function useCompletionsForDate(dateKey: string) {
  const { items, loading, error } = useCollectionData<Completion>(
    query(completionsCol, where('date', '==', dateKey)),
    [dateKey],
  )
  return { completions: items, loading, error }
}

/** Reward claims for one child. */
export function useChildClaims(childId: ChildId) {
  const { items, loading, error } = useCollectionData<RewardClaim>(
    query(claimsCol, where('childId', '==', childId)),
    [childId],
  )
  return { claims: items, loading, error }
}

/** All reward claims (parent management view). */
export function useAllClaims() {
  const { items, loading, error } = useCollectionData<RewardClaim>(query(claimsCol), [])
  const claims = [...items].sort(
    (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
  )
  return { claims, loading, error }
}
