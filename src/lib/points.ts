import type { ChildId, Completion, RewardClaim } from '../types'

/** Total points a child has ever earned from completions. */
export function totalEarned(completions: Completion[], childId: ChildId): number {
  return completions
    .filter((c) => c.childId === childId)
    .reduce((sum, c) => sum + (c.points ?? 0), 0)
}

/** Points earned by a child on a specific day. */
export function earnedOn(completions: Completion[], childId: ChildId, dateKey: string): number {
  return completions
    .filter((c) => c.childId === childId && c.date === dateKey)
    .reduce((sum, c) => sum + (c.points ?? 0), 0)
}

/** Points already spent on fulfilled (or approved) reward claims. */
export function spentPoints(claims: RewardClaim[], childId: ChildId): number {
  return claims
    .filter(
      (c) =>
        c.childId === childId &&
        (c.status === 'approved' || c.status === 'fulfilled'),
    )
    .reduce((sum, c) => sum + (c.cost ?? 0), 0)
}

/** Points a child currently has available to spend on rewards. */
export function availableBalance(
  completions: Completion[],
  claims: RewardClaim[],
  childId: ChildId,
): number {
  return totalEarned(completions, childId) - spentPoints(claims, childId)
}
