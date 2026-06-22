/**
 * Seed the initial tasks (and a few sample rewards) into Firestore using the
 * Firebase Admin SDK. The Admin SDK runs with full privileges and bypasses
 * security rules, so seeding does not depend on how parents sign in.
 *
 * Auth: provide a service-account key (the same one used for GitHub Actions
 * deploys). Either set GOOGLE_APPLICATION_CREDENTIALS to its path, or drop the
 * file at ./serviceAccount.json (gitignored).
 *
 *   # generate the key: Firebase console -> Project settings -> Service
 *   #   accounts -> Generate new private key
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npm run seed
 *
 * Pass --force to seed even if tasks already exist.
 */
import 'dotenv/config'
import { existsSync, readFileSync } from 'node:fs'
import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import type { ChildId, ScheduleType } from '../src/types'

interface SeedTask {
  title: string
  category: string
  minutes: number
  points: number
  scheduleType: ScheduleType
  assignedTo: ChildId[]
  linkUrl?: string
}

const BOTH: ChildId[] = ['emma', 'sophia']

const TASKS: SeedTask[] = [
  // Both children
  { title: 'Pushups / squats', category: 'Exercise', minutes: 10, points: 2, scheduleType: 'daily', assignedTo: BOTH },
  { title: 'Read', category: 'Reading', minutes: 20, points: 2, scheduleType: 'daily', assignedTo: BOTH },
  // Emma
  { title: 'Piano / violin', category: 'Music', minutes: 20, points: 3, scheduleType: 'daily', assignedTo: ['emma'] },
  { title: 'Songwriting', category: 'Music', minutes: 10, points: 2, scheduleType: 'daily', assignedTo: ['emma'] },
  { title: 'Vocal warmup', category: 'Music', minutes: 5, points: 1, scheduleType: 'daily', assignedTo: ['emma'] },
  // Sophia
  { title: 'Drawing', category: 'Art', minutes: 15, points: 2, scheduleType: 'daily', assignedTo: ['sophia'] },
  { title: 'Handwriting', category: 'Writing', minutes: 10, points: 2, scheduleType: 'daily', assignedTo: ['sophia'] },
  {
    title: 'Guitar practice',
    category: 'Music',
    minutes: 15,
    points: 2,
    scheduleType: 'daily',
    assignedTo: ['sophia'],
    linkUrl: 'https://www.youtube.com/results?search_query=beginner+guitar+lesson',
  },
]

const REWARDS = [
  { title: 'Family movie night pick', description: 'You choose the movie!', cost: 20 },
  { title: 'Ice cream trip', description: 'A scoop of your favorite flavor.', cost: 30 },
  { title: 'Extra 30 min screen time', cost: 15 },
  { title: 'Choose dinner', description: 'Pick what we eat one night.', cost: 25 },
]

function loadServiceAccount(): ServiceAccount {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccount.json'
  if (!existsSync(path)) {
    throw new Error(
      `Service account key not found at "${path}". Generate one in the Firebase ` +
        'console (Project settings -> Service accounts -> Generate new private key) ' +
        'and set GOOGLE_APPLICATION_CREDENTIALS to its path, or save it as ./serviceAccount.json.',
    )
  }
  return JSON.parse(readFileSync(path, 'utf8')) as ServiceAccount
}

async function main() {
  const force = process.argv.includes('--force')
  const serviceAccount = loadServiceAccount()

  initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore()

  const tasksCol = db.collection('tasks')
  const existing = await tasksCol.limit(1).get()
  if (!existing.empty && !force) {
    console.log('Tasks already exist. Skipping seed. Pass --force to seed anyway.')
    process.exit(0)
  }

  console.log('Seeding tasks…')
  let order = 0
  for (const t of TASKS) {
    const data: Record<string, unknown> = {
      title: t.title,
      category: t.category,
      minutes: t.minutes,
      points: t.points,
      scheduleType: t.scheduleType,
      active: true,
      order: order++,
      assignedTo: t.assignedTo,
    }
    if (t.linkUrl) data.linkUrl = t.linkUrl
    await tasksCol.add(data)
    console.log(`  + ${t.title} (${t.assignedTo.join(', ')})`)
  }

  const rewardsCol = db.collection('rewards')
  const existingRewards = await rewardsCol.limit(1).get()
  if (existingRewards.empty || force) {
    console.log('Seeding sample rewards…')
    let rOrder = 0
    for (const r of REWARDS) {
      const data: Record<string, unknown> = {
        title: r.title,
        cost: r.cost,
        active: true,
        order: rOrder++,
      }
      if (r.description) data.description = r.description
      await rewardsCol.add(data)
      console.log(`  + ${r.title} (${r.cost} pts)`)
    }
  }

  console.log('\n✅ Done seeding.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
