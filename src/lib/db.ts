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
import type { ChildId, ClaimStatus, FamilyId, Reward, Task, ThemeKey } from '../types'

// ---- family-scoped collection references ------------------------------------
export const childrenCol = (fid: FamilyId) => collection(db, 'families', fid, 'children')
export const tasksCol = (fid: FamilyId) => collection(db, 'families', fid, 'tasks')
export const completionsCol = (fid: FamilyId) => collection(db, 'families', fid, 'completions')
export const rewardsCol = (fid: FamilyId) => collection(db, 'families', fid, 'rewards')
export const claimsCol = (fid: FamilyId) => collection(db, 'families', fid, 'rewardClaims')
export const familyDoc = (fid: FamilyId) => doc(db, 'families', fid)

// ---- completions ------------------------------------------------------------

/** Deterministic id ensures exactly one completion per child / task / day. */
export function completionId(childId: ChildId, taskId: string, dateKey: string): string {
  return `${childId}_${taskId}_${dateKey}`
}

export async function completeTask(
  fid: FamilyId,
  child: ChildId,
  task: Task,
  dateKey: string,
): Promise<void> {
  const ref = doc(completionsCol(fid), completionId(child, task.id, dateKey))
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

export async function removeCompletion(fid: FamilyId, id: string): Promise<void> {
  await deleteDoc(doc(completionsCol(fid), id))
}

// ---- children (parent only) -------------------------------------------------

export interface ChildInput {
  name: string
  emoji: string
  theme: ThemeKey
  order: number
}

export async function createChild(fid: FamilyId, input: ChildInput): Promise<void> {
  await addDoc(childrenCol(fid), { ...input })
}

export async function updateChild(fid: FamilyId, id: ChildId, input: ChildInput): Promise<void> {
  await updateDoc(doc(childrenCol(fid), id), { ...input })
}

export async function deleteChild(fid: FamilyId, id: ChildId): Promise<void> {
  await deleteDoc(doc(childrenCol(fid), id))
}

// ---- tasks (parent only) ----------------------------------------------------

export type TaskInput = Omit<Task, 'id'>

export async function createTask(fid: FamilyId, input: TaskInput): Promise<void> {
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
  await addDoc(tasksCol(fid), data)
}

export async function updateTask(fid: FamilyId, id: string, input: TaskInput): Promise<void> {
  await updateDoc(doc(tasksCol(fid), id), {
    title: input.title,
    category: input.category,
    minutes: input.minutes,
    points: input.points,
    scheduleType: input.scheduleType,
    active: input.active,
    order: input.order,
    assignedTo: input.assignedTo,
    linkUrl: input.linkUrl ?? '',
  })
}

export async function setTaskActive(fid: FamilyId, id: string, active: boolean): Promise<void> {
  await updateDoc(doc(tasksCol(fid), id), { active })
}

export async function deleteTask(fid: FamilyId, id: string): Promise<void> {
  await deleteDoc(doc(tasksCol(fid), id))
}

export async function reorderTasks(fid: FamilyId, orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  orderedIds.forEach((id, index) => batch.update(doc(tasksCol(fid), id), { order: index }))
  await batch.commit()
}

// ---- rewards (parent only) --------------------------------------------------

export type RewardInput = Omit<Reward, 'id'>

export async function createReward(fid: FamilyId, input: RewardInput): Promise<void> {
  const data: Record<string, unknown> = {
    title: input.title,
    cost: input.cost,
    active: input.active,
    order: input.order,
  }
  if (input.description) data.description = input.description
  await addDoc(rewardsCol(fid), data)
}

export async function updateReward(fid: FamilyId, id: string, input: RewardInput): Promise<void> {
  await updateDoc(doc(rewardsCol(fid), id), {
    title: input.title,
    cost: input.cost,
    active: input.active,
    order: input.order,
    description: input.description ?? '',
  })
}

export async function deleteReward(fid: FamilyId, id: string): Promise<void> {
  await deleteDoc(doc(rewardsCol(fid), id))
}

// ---- reward claims ----------------------------------------------------------

export async function requestReward(fid: FamilyId, child: ChildId, reward: Reward): Promise<void> {
  await addDoc(claimsCol(fid), {
    childId: child,
    rewardId: reward.id,
    rewardTitle: reward.title,
    cost: reward.cost,
    status: 'pending' as ClaimStatus,
    createdAt: serverTimestamp(),
  })
}

export async function decideClaim(
  fid: FamilyId,
  id: string,
  status: ClaimStatus,
  decidedBy: string,
): Promise<void> {
  await updateDoc(doc(claimsCol(fid), id), {
    status,
    decidedAt: serverTimestamp(),
    decidedBy,
  })
}
