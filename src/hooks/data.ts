import { useEffect, useState } from 'react'
import {
  onSnapshot,
  query,
  where,
  type Query,
  type DocumentData,
} from 'firebase/firestore'
import {
  childrenCol,
  claimsCol,
  completionsCol,
  rewardsCol,
  tasksCol,
} from '../lib/db'
import type {
  Child,
  ChildId,
  Completion,
  FamilyId,
  Reward,
  RewardClaim,
  Task,
} from '../types'

/** Generic realtime list subscription with id + data merge. */
function useCollectionData<T>(q: Query<DocumentData> | null, deps: unknown[]) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!q) {
      setItems([])
      setLoading(false)
      return
    }
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

export function useChildren(familyId: FamilyId | null) {
  const { items, loading, error } = useCollectionData<Child>(
    familyId ? query(childrenCol(familyId)) : null,
    [familyId],
  )
  const children = [...items].sort((a, b) => a.order - b.order)
  return { children, loading, error }
}

export function useTasks(familyId: FamilyId | null) {
  const { items, loading, error } = useCollectionData<Task>(
    familyId ? query(tasksCol(familyId)) : null,
    [familyId],
  )
  const tasks = [...items].sort((a, b) => a.order - b.order)
  return { tasks, loading, error }
}

export function useRewards(familyId: FamilyId | null) {
  const { items, loading, error } = useCollectionData<Reward>(
    familyId ? query(rewardsCol(familyId)) : null,
    [familyId],
  )
  const rewards = [...items].sort((a, b) => a.order - b.order)
  return { rewards, loading, error }
}

/** All completions for one child (full history; used for streaks + totals). */
export function useChildCompletions(familyId: FamilyId | null, childId: ChildId | null) {
  const { items, loading, error } = useCollectionData<Completion>(
    familyId && childId ? query(completionsCol(familyId), where('childId', '==', childId)) : null,
    [familyId, childId],
  )
  return { completions: items, loading, error }
}

/** All completions for the family on a single day (parent "today" view). */
export function useCompletionsForDate(familyId: FamilyId | null, dateKey: string) {
  const { items, loading, error } = useCollectionData<Completion>(
    familyId ? query(completionsCol(familyId), where('date', '==', dateKey)) : null,
    [familyId, dateKey],
  )
  return { completions: items, loading, error }
}

export function useChildClaims(familyId: FamilyId | null, childId: ChildId | null) {
  const { items, loading, error } = useCollectionData<RewardClaim>(
    familyId && childId ? query(claimsCol(familyId), where('childId', '==', childId)) : null,
    [familyId, childId],
  )
  return { claims: items, loading, error }
}

export function useAllClaims(familyId: FamilyId | null) {
  const { items, loading, error } = useCollectionData<RewardClaim>(
    familyId ? query(claimsCol(familyId)) : null,
    [familyId],
  )
  const claims = [...items].sort(
    (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
  )
  return { claims, loading, error }
}
