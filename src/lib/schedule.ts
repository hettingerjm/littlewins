import type { ChildId, Task } from '../types'
import { isWeekend } from './dates'

/** Does this task's schedule apply on the given date key? */
export function isScheduledOn(task: Task, dateKey: string): boolean {
  switch (task.scheduleType) {
    case 'daily':
      return true
    case 'weekdays':
      return !isWeekend(dateKey)
    case 'weekends':
      return isWeekend(dateKey)
    default:
      return true
  }
}

/**
 * The active tasks a child is expected to do on a given day, sorted by `order`.
 * These are the tasks that count toward progress and the daily streak.
 */
export function tasksForChildOn(tasks: Task[], childId: ChildId, dateKey: string): Task[] {
  return tasks
    .filter(
      (t) => t.active && t.assignedTo.includes(childId) && isScheduledOn(t, dateKey),
    )
    .sort((a, b) => a.order - b.order)
}

const SCHEDULE_LABELS: Record<Task['scheduleType'], string> = {
  daily: 'Every day',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
}

export function scheduleLabel(scheduleType: Task['scheduleType']): string {
  return SCHEDULE_LABELS[scheduleType] ?? scheduleType
}
