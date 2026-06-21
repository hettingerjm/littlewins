import type { Timestamp } from 'firebase/firestore'

/** The two (and only two) fixed child profiles. */
export type ChildId = 'emma' | 'sophia'

/** How often a task is scheduled. */
export type ScheduleType = 'daily' | 'weekdays' | 'weekends'

export interface Task {
  id: string
  title: string
  category: string
  minutes: number
  points: number
  scheduleType: ScheduleType
  active: boolean
  /** Sort order within the task list (lower = first). */
  order: number
  /** Which children the task applies to. */
  assignedTo: ChildId[]
  /** Optional helpful link (e.g. a lesson video). */
  linkUrl?: string
}

export interface Completion {
  id: string
  childId: ChildId
  taskId: string
  /** Local calendar day, formatted YYYY-MM-DD. */
  date: string
  points: number
  /** Denormalized for history display; not personal info. */
  minutes?: number
  category?: string
  title?: string
  createdAt?: Timestamp
}

export interface Reward {
  id: string
  title: string
  description?: string
  /** Point cost to claim. */
  cost: number
  active: boolean
  order: number
}

export type ClaimStatus = 'pending' | 'approved' | 'fulfilled' | 'denied'

export interface RewardClaim {
  id: string
  childId: ChildId
  rewardId: string
  rewardTitle?: string
  cost: number
  status: ClaimStatus
  createdAt?: Timestamp
  decidedAt?: Timestamp
  decidedBy?: string
}
