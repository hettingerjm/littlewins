/**
 * Little Wins admin CLI (Firebase Admin SDK — bypasses security rules).
 *
 * Auth: set GOOGLE_APPLICATION_CREDENTIALS to a service-account key path, or
 * drop the key at ./serviceAccount.json.
 *
 * Commands:
 *
 *   # Create a family with a PIN, kids, and invited parents (+ optional starter
 *   # tasks/rewards). Kids are "Name:emoji:theme" (emoji/theme optional).
 *   npm run admin -- add-family \
 *     --id smith --name "Smith Family" --pin 1234 \
 *     --kids "Ava:🦊:pink,Leo:🚀:sky" \
 *     --parents "mom@gmail.com,dad@gmail.com" --seed
 *
 *   # Change a family's PIN.
 *   npm run admin -- set-pin --id smith --pin 5678
 *
 *   # Add/replace invited parent emails for a family.
 *   npm run admin -- add-parents --id smith --parents "grandma@gmail.com"
 *
 *   # Migrate the original single-family (top-level) data into a family.
 *   npm run admin -- migrate --to hettinger --name "Hettinger" \
 *     --pin 0822 --parents "hettingerjm@gmail.com,hettingerae@gmail.com"
 *
 *   # List families.
 *   npm run admin -- list
 */
import 'dotenv/config'
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { THEME_KEYS } from '../src/config'
import type { ThemeKey } from '../src/types'

// ---- args -------------------------------------------------------------------
function parseArgs(argv: string[]): { cmd: string; flags: Record<string, string> } {
  const [cmd, ...rest] = argv
  const flags: Record<string, string> = {}
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = rest[i + 1]
      if (!next || next.startsWith('--')) {
        flags[key] = 'true'
      } else {
        flags[key] = next
        i++
      }
    }
  }
  return { cmd: cmd ?? '', flags }
}

function hashPin(pin: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${pin}`).digest('hex')
}

function loadServiceAccount(): ServiceAccount {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccount.json'
  if (!existsSync(path)) {
    throw new Error(
      `Service account key not found at "${path}". Generate one in the Firebase ` +
        'console (Project settings → Service accounts) and set ' +
        'GOOGLE_APPLICATION_CREDENTIALS or save it as ./serviceAccount.json.',
    )
  }
  return JSON.parse(readFileSync(path, 'utf8')) as ServiceAccount
}

initializeApp({ credential: cert(loadServiceAccount()) })
const db = getFirestore()

interface KidSpec {
  name: string
  emoji: string
  theme: ThemeKey
}

function parseKids(spec: string | undefined): KidSpec[] {
  if (!spec) return []
  return spec
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry, i) => {
      const [name, emoji, theme] = entry.split(':').map((x) => x?.trim())
      const themeKey = (theme && (THEME_KEYS as string[]).includes(theme) ? theme : THEME_KEYS[i % THEME_KEYS.length]) as ThemeKey
      return { name, emoji: emoji || '🙂', theme: themeKey }
    })
}

function parseEmails(spec: string | undefined): string[] {
  if (!spec) return []
  return spec
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

async function setPin(familyId: string, pin: string) {
  const salt = randomBytes(16).toString('hex')
  await db.doc(`families/${familyId}/private/auth`).set(
    { pinHash: hashPin(pin, salt), pinSalt: salt, failCount: 0, lockUntil: null },
    { merge: true },
  )
}

async function inviteParents(familyId: string, emails: string[]) {
  const batch = db.batch()
  for (const email of emails) {
    batch.set(db.doc(`parentInvites/${email}`), { familyId })
  }
  await batch.commit()
}

const STARTER_TASKS = [
  { title: 'Read', category: 'Reading', minutes: 20, points: 2, scheduleType: 'daily' },
  { title: 'Exercise', category: 'Exercise', minutes: 10, points: 2, scheduleType: 'daily' },
  { title: 'Tidy room', category: 'Chores', minutes: 10, points: 1, scheduleType: 'daily' },
]
const STARTER_REWARDS = [
  { title: 'Family movie night pick', description: 'You choose the movie!', cost: 20 },
  { title: 'Ice cream trip', cost: 30 },
  { title: 'Extra 30 min screen time', cost: 15 },
]

async function addFamily(flags: Record<string, string>) {
  const id = flags.id
  const name = flags.name || id
  const pin = flags.pin
  if (!id || !pin) throw new Error('add-family requires --id and --pin')

  const kids = parseKids(flags.kids)
  const parents = parseEmails(flags.parents)

  await db.doc(`families/${id}`).set({ name, createdAt: FieldValue.serverTimestamp() })
  await setPin(id, pin)
  if (parents.length) await inviteParents(id, parents)

  const childIds: string[] = []
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i]
    const ref = await db.collection(`families/${id}/children`).add({
      name: k.name,
      emoji: k.emoji,
      theme: k.theme,
      order: i,
    })
    childIds.push(ref.id)
    console.log(`  + child ${k.name} ${k.emoji} (${k.theme})`)
  }

  if (flags.seed === 'true' && childIds.length) {
    let order = 0
    for (const t of STARTER_TASKS) {
      await db.collection(`families/${id}/tasks`).add({ ...t, active: true, order: order++, assignedTo: childIds })
    }
    let rOrder = 0
    for (const r of STARTER_REWARDS) {
      await db.collection(`families/${id}/rewards`).add({ ...r, active: true, order: rOrder++ })
    }
    console.log('  + starter tasks & rewards')
  }

  console.log(`✅ Family "${id}" created. PIN set, ${parents.length} parent(s) invited.`)
  console.log(`   Kids link: /f/${id}`)
}

async function migrate(flags: Record<string, string>) {
  const to = flags.to
  const name = flags.name || to
  const pin = flags.pin
  if (!to || !pin) throw new Error('migrate requires --to and --pin')

  await db.doc(`families/${to}`).set({ name, createdAt: FieldValue.serverTimestamp() }, { merge: true })
  await setPin(to, pin)
  await inviteParents(to, parseEmails(flags.parents))

  // The original app hardcoded Emma & Sophia with these themes. Recreate them
  // with the SAME doc ids so existing completions (which reference childId
  // 'emma'/'sophia') keep working.
  const legacyKids: Array<{ id: string; name: string; emoji: string; theme: ThemeKey }> = [
    { id: 'emma', name: 'Emma', emoji: '🦄', theme: 'pink' },
    { id: 'sophia', name: 'Sophia', emoji: '🌸', theme: 'indigo' },
  ]
  for (let i = 0; i < legacyKids.length; i++) {
    const k = legacyKids[i]
    await db.doc(`families/${to}/children/${k.id}`).set({ name: k.name, emoji: k.emoji, theme: k.theme, order: i })
  }

  // Copy each top-level collection into the family subcollection, preserving ids.
  for (const col of ['tasks', 'rewards', 'completions', 'rewardClaims']) {
    const snap = await db.collection(col).get()
    let n = 0
    for (const docSnap of snap.docs) {
      await db.doc(`families/${to}/${col}/${docSnap.id}`).set(docSnap.data())
      n++
    }
    console.log(`  migrated ${n} ${col}`)
  }

  console.log(`✅ Migrated legacy data into family "${to}". Kids link: /f/${to}`)
}

async function list() {
  const snap = await db.collection('families').get()
  if (snap.empty) {
    console.log('(no families)')
    return
  }
  for (const f of snap.docs) {
    const kids = await db.collection(`families/${f.id}/children`).get()
    console.log(`• ${f.id} — "${f.data().name}" (${kids.size} kids)`)
  }
}

async function main() {
  const { cmd, flags } = parseArgs(process.argv.slice(2))
  switch (cmd) {
    case 'add-family':
      await addFamily(flags)
      break
    case 'set-pin':
      if (!flags.id || !flags.pin) throw new Error('set-pin requires --id and --pin')
      await setPin(flags.id, flags.pin)
      console.log(`✅ PIN updated for "${flags.id}".`)
      break
    case 'add-parents':
      if (!flags.id || !flags.parents) throw new Error('add-parents requires --id and --parents')
      await inviteParents(flags.id, parseEmails(flags.parents))
      console.log(`✅ Invited parents for "${flags.id}".`)
      break
    case 'migrate':
      await migrate(flags)
      break
    case 'list':
      await list()
      break
    default:
      console.log('Unknown command. See scripts/admin.ts header for usage.')
      process.exit(1)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('admin failed:', err)
  process.exit(1)
})
