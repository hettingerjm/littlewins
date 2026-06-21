import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  ChildId,
  ClaimStatus,
  Reward,
  Task,
} from '../types'

// ---- collection references --------------------------------------------------
export const tasksCol = collection(db, 'tasks')
export const completionsCol = collection(db, 'completions')
export const rewardsCol = collection(db, 'rewards')
export const claimsCol = collection(db, 'rewardClaims')

// ---- completions ------------------------------------------------------------

/** Deterministic id ensures exactly one completion per child / task / day. */
export function completionId(childId: ChildId, taskId: string, dateKey: string): string {
  return `${childId}_${taskId}_${dateKey}`
}

/**
 * Mark a task complete for a child on a day. Uses a deterministic doc id so a
 * task cannot be completed twice for the same child/date (Firestore rules also
 * forbid children from overwriting an existing completion).
 */
export async function completeTask(
  child: ChildId,
  task: Task,
  dateKey: string,
): Promise<void> {
  const ref = doc(completionsCol, completionId(child, task.id, dateKey))
  await setDoc(ref, {
    childId: child,
    taskId: task.id,
    date: dateKey,
    points: task.points,
    minutes: task.minutes,
    category: task.category,
    title: task.title,
    createdAt: serverTimestamp(),
  })
}

/** Parent-only: remove a completion (undo / correct history). */
export async function removeCompletion(id: string): Promise<void> {
  await deleteDoc(doc(completionsCol, id))
}

// ---- tasks (parent only) ----------------------------------------------------

export type TaskInput = Omit<Task, 'id'>

export async function createTask(input: TaskInput): Promise<void> {
  const data: Record<string, unknown> = {
    title: input.title,
    category: input.category,
    minutes: input.minutes,
    points: input.points,
    scheduleType: input.scheduleType,
    active: input.active,
    order: input.order,
    assignedTo: input.assignedTo,
  }
  if (input.linkUrl) data.linkUrl = input.linkUrl
  await addDoc(tasksCol, data)
}

export async function updateTask(id: string, input: TaskInput): Promise<void> {
  const data: Record<string, unknown> = {
    title: input.title,
    category: input.category,
    minutes: input.minutes,
    points: input.points,
    scheduleType: input.scheduleType,
    active: input.active,
    order: input.order,
    assignedTo: input.assignedTo,
    // Always include linkUrl so clearing it removes the value.
    linkUrl: input.linkUrl ?? '',
  }
  await updateDoc(doc(tasksCol, id), data)
}

export async function setTaskActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(tasksCol, id), { active })
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(tasksCol, id))
}

/** Persist a new ordering by writing each task's `order` in one batch. */
export async function reorderTasks(orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  orderedIds.forEach((id, index) => {
    batch.update(doc(tasksCol, id), { order: index })
  })
  await batch.commit()
}

// ---- rewards (parent only) --------------------------------------------------

export type RewardInput = Omit<Reward, 'id'>

export async function createReward(input: RewardInput): Promise<void> {
  const data: Record<string, unknown> = {
    title: input.title,
    cost: input.cost,
    active: input.active,
    order: input.order,
  }
  if (input.description) data.description = input.description
  await addDoc(rewardsCol, data)
}

export async function updateReward(id: string, input: RewardInput): Promise<void> {
  await updateDoc(doc(rewardsCol, id), {
    title: input.title,
    cost: input.cost,
    active: input.active,
    order: input.order,
    description: input.description ?? '',
  })
}

export async function deleteReward(id: string): Promise<void> {
  await deleteDoc(doc(rewardsCol, id))
}

// ---- reward claims ----------------------------------------------------------

/** Child requests a reward; always created as pending. */
export async function requestReward(
  child: ChildId,
  reward: Reward,
): Promise<void> {
  await addDoc(claimsCol, {
    childId: child,
    rewardId: reward.id,
    rewardTitle: reward.title,
    cost: reward.cost,
    status: 'pending' as ClaimStatus,
    createdAt: serverTimestamp(),
  })
}

/** Parent decides on a claim. */
export async function decideClaim(
  id: string,
  status: ClaimStatus,
  decidedBy: string,
): Promise<void> {
  await updateDoc(doc(claimsCol, id), {
    status,
    decidedAt: serverTimestamp(),
    decidedBy,
  })
}
