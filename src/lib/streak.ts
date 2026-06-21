import type { ChildId, Completion, Task } from '../types'
import { addDays, todayKey } from './dates'
import { tasksForChildOn } from './schedule'

export type DayStatus = 'complete' | 'incomplete' | 'neutral'

/** Map of dateKey -> set of completed taskIds, for one child. */
function completionIndex(completions: Completion[], childId: ChildId): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>()
  for (const c of completions) {
    if (c.childId !== childId) continue
    let set = index.get(c.date)
    if (!set) {
      set = new Set<string>()
      index.set(c.date, set)
    }
    set.add(c.taskId)
  }
  return index
}

function statusFor(
  tasks: Task[],
  index: Map<string, Set<string>>,
  childId: ChildId,
  dateKey: string,
): DayStatus {
  const required = tasksForChildOn(tasks, childId, dateKey)
  // A day with no scheduled tasks is "neutral" — it neither advances nor
  // breaks a streak (it bridges, e.g. a weekend for a weekday-only schedule).
  if (required.length === 0) return 'neutral'
  const done = index.get(dateKey) ?? new Set<string>()
  return required.every((t) => done.has(t.id)) ? 'complete' : 'incomplete'
}

/** Is every required active task for this child done on this day? */
export function isDayComplete(
  tasks: Task[],
  completions: Completion[],
  childId: ChildId,
  dateKey: string,
): boolean {
  return statusFor(tasks, completionIndex(completions, childId), childId, dateKey) === 'complete'
}

/**
 * Current daily streak: consecutive days (ending today, or yesterday if today
 * isn't finished yet) on which the child completed ALL required active tasks.
 * Missing a day (an "incomplete" day in the past) resets the streak.
 */
export function computeStreak(
  tasks: Task[],
  completions: Completion[],
  childId: ChildId,
  today: string = todayKey(),
): number {
  const index = completionIndex(completions, childId)

  let cursor = today
  // If today still has unfinished tasks, don't penalize the in-progress day —
  // count the streak as it stood through yesterday.
  if (statusFor(tasks, index, childId, today) === 'incomplete') {
    cursor = addDays(today, -1)
  }

  let streak = 0
  for (let i = 0; i < 400; i++) {
    const status = statusFor(tasks, index, childId, cursor)
    if (status === 'complete') {
      streak++
      cursor = addDays(cursor, -1)
    } else if (status === 'neutral') {
      cursor = addDays(cursor, -1)
    } else {
      break
    }
  }
  return streak
}
