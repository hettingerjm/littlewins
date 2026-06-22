import type { Timestamp } from 'firebase/firestore'

/** A child profile id (Firestore doc id within a family). */
export type ChildId = string

/** A family id (Firestore doc id, e.g. "hettinger"). */
export type FamilyId = string

/** Color theme key for a child's screens (see THEMES in config.ts). */
export type ThemeKey =
  | 'pink'
  | 'indigo'
  | 'emerald'
  | 'amber'
  | 'sky'
  | 'violet'
  | 'rose'
  | 'teal'

/** How often a task is scheduled. */
export type ScheduleType = 'daily' | 'weekdays' | 'weekends'

export interface Family {
  id: FamilyId
  name: string
}

export interface Child {
  id: ChildId
  name: string
  emoji: string
  theme: ThemeKey
  /** Sort order on the profile screen. */
  order: number
}

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
  /** Which children (by id) the task applies to. */
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

/** Decoded custom-claim info from the signed-in user's token. */
export interface SessionClaims {
  familyId: FamilyId | null
  role: 'parent' | 'child' | null
}
