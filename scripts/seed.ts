/**
 * Seed the initial tasks (and a few sample rewards) into Firestore.
 *
 * Because Firestore rules require a parent (email/password) to write tasks and
 * rewards, this script signs in with a parent account using the client SDK.
 *
 * Usage:
 *   1. Create a parent user in Firebase Auth (Email/Password).
 *   2. Copy .env.example -> .env and fill in the VITE_FIREBASE_* values.
 *   3. Run:
 *        SEED_PARENT_EMAIL=you@example.com \
 *        SEED_PARENT_PASSWORD=yourpassword \
 *        npm run seed
 *
 * Pass --force to seed even if tasks already exist.
 */
import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { addDoc, collection, getDocs, getFirestore } from 'firebase/firestore'
import type { ChildId, ScheduleType } from '../src/types'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

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

async function main() {
  const force = process.argv.includes('--force')
  const email = process.env.SEED_PARENT_EMAIL
  const password = process.env.SEED_PARENT_PASSWORD

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Missing VITE_FIREBASE_* env vars. Did you create .env?')
  }
  if (!email || !password) {
    throw new Error('Set SEED_PARENT_EMAIL and SEED_PARENT_PASSWORD env vars (a parent account).')
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)

  console.log(`Signing in as ${email}…`)
  await signInWithEmailAndPassword(auth, email, password)

  const tasksCol = collection(db, 'tasks')
  const existing = await getDocs(tasksCol)
  if (!existing.empty && !force) {
    console.log(
      `Found ${existing.size} existing task(s). Skipping seed. Pass --force to seed anyway.`,
    )
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
    await addDoc(tasksCol, data)
    console.log(`  + ${t.title} (${t.assignedTo.join(', ')})`)
  }

  const rewardsCol = collection(db, 'rewards')
  const existingRewards = await getDocs(rewardsCol)
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
      await addDoc(rewardsCol, data)
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
