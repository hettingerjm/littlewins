/**
 * Little Wins Cloud Functions.
 *
 * Two small callables underpin the multi-family security model:
 *
 *   kidLogin({ familyId, pin })  — public. Verifies the family PIN against the
 *     hash stored in /families/{familyId}/private/auth, then mints a custom
 *     auth token carrying { familyId, role: 'child' }. The client signs in with
 *     it. Includes simple brute-force lockout.
 *
 *   syncParentClaims()  — requires an authenticated Google user. Looks the
 *     user's email up in /parentInvites/{email}; if found, stamps
 *     { familyId, role: 'parent' } onto their auth token.
 *
 * Both run with the Admin SDK and therefore bypass Firestore rules.
 */
import { createHash } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import manifest from './avatar-manifest.json'

initializeApp()
setGlobalOptions({ region: 'us-central1', maxInstances: 5 })

const db = getFirestore()

const MAX_ATTEMPTS = 6
const LOCKOUT_MS = 5 * 60 * 1000 // 5 minutes

function hashPin(pin: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${pin}`).digest('hex')
}

interface KidLoginData {
  familyId?: unknown
  pin?: unknown
}

export const kidLogin = onCall<KidLoginData>(async (request) => {
  const familyId = String(request.data?.familyId ?? '').trim()
  const pin = String(request.data?.pin ?? '').trim()

  if (!familyId || !pin) {
    throw new HttpsError('invalid-argument', 'familyId and pin are required.')
  }

  const authRef = db.doc(`families/${familyId}/private/auth`)

  // Verify (and update lockout state) inside a transaction.
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(authRef)
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Unknown family.')
    }
    const data = snap.data() as {
      pinHash?: string
      pinSalt?: string
      failCount?: number
      lockUntil?: Timestamp
    }

    const now = Date.now()
    if (data.lockUntil && data.lockUntil.toMillis() > now) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many tries. Please wait a few minutes and try again.',
      )
    }

    const ok =
      !!data.pinHash &&
      !!data.pinSalt &&
      hashPin(pin, data.pinSalt) === data.pinHash

    if (!ok) {
      const fail = (data.failCount ?? 0) + 1
      const update: Record<string, unknown> = { failCount: fail }
      if (fail >= MAX_ATTEMPTS) {
        update.lockUntil = Timestamp.fromMillis(now + LOCKOUT_MS)
        update.failCount = 0
      }
      tx.set(authRef, update, { merge: true })
      throw new HttpsError('permission-denied', 'Incorrect PIN.')
    }

    // Success — clear any failure state.
    tx.set(authRef, { failCount: 0, lockUntil: null }, { merge: true })
  })

  // One shared kiosk identity per family for the kids' device.
  const uid = `child_${familyId}`
  const token = await getAuth().createCustomToken(uid, {
    familyId,
    role: 'child',
  })
  return { token }
})

// ---- avatar shop (server-side, earned-only enforcement) ---------------------

function xpToNext(level: number): number {
  return Math.round(80 * Math.pow(level, 1.45))
}
function levelFromTotalXp(totalXp: number, cap: number): number {
  let level = 1
  let spent = 0
  while (level < cap && spent + xpToNext(level) <= totalXp) {
    spent += xpToNext(level)
    level++
  }
  return level
}
function choreSizeForPoints(points: number): 'small' | 'medium' | 'large' | 'boss' {
  if (points >= 5) return 'boss'
  if (points >= 3) return 'large'
  if (points >= 2) return 'medium'
  return 'small'
}

interface PurchaseData {
  childId?: unknown
  itemId?: unknown
}

/** Buy a shop item. Re-derives earned coins + level from completions so a child
 * cannot grant themselves coins or items by writing Firestore directly. */
export const avatarPurchase = onCall<PurchaseData>(async (request) => {
  const auth = request.auth
  const familyId = auth?.token.familyId as string | undefined
  if (!auth || !familyId) {
    throw new HttpsError('permission-denied', 'Join a family first.')
  }
  const childId = String(request.data?.childId ?? '').trim()
  const itemId = String(request.data?.itemId ?? '').trim()
  if (!childId || !itemId) {
    throw new HttpsError('invalid-argument', 'childId and itemId are required.')
  }

  const item = (manifest.shop as Array<{ id: string; price: number; levelReq: number }>).find(
    (i) => i.id === itemId,
  )
  if (!item) throw new HttpsError('not-found', 'Unknown item.')

  // Re-derive economy from the child's rule-validated completions.
  const compsSnap = await db
    .collection(`families/${familyId}/completions`)
    .where('childId', '==', childId)
    .get()
  let totalXp = 0
  let earnedCoins = 0
  const rewards = manifest.economy.choreRewards as Record<string, { xp: number; coins: number }>
  compsSnap.forEach((d) => {
    const r = rewards[choreSizeForPoints((d.data().points as number) ?? 0)]
    totalXp += r.xp
    earnedCoins += r.coins
  })
  const level = levelFromTotalXp(totalXp, manifest.meta.levelCap as number)

  const avatarRef = db.doc(`families/${familyId}/avatars/${childId}`)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(avatarRef)
    const data = (snap.data() ?? {}) as { owned?: string[]; coinsSpent?: number }
    const owned = data.owned ?? []
    const coinsSpent = data.coinsSpent ?? 0

    if (owned.includes(itemId)) throw new HttpsError('already-exists', 'Already owned.')
    if (level < item.levelReq) {
      throw new HttpsError('failed-precondition', `Reach level ${item.levelReq} first.`)
    }
    if (earnedCoins - coinsSpent < item.price) {
      throw new HttpsError('failed-precondition', 'Not enough coins yet.')
    }

    tx.set(
      avatarRef,
      { owned: FieldValue.arrayUnion(itemId), coinsSpent: coinsSpent + item.price },
      { merge: true },
    )
  })

  return { ok: true, itemId, coinsAvailable: earnedCoins }
})

interface SetPinData {
  pin?: unknown
}

/** A parent resets their OWN family's PIN. Scoped by the caller's claim. */
export const setFamilyPin = onCall<SetPinData>(async (request) => {
  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.')
  }
  const familyId = auth.token.familyId as string | undefined
  if (auth.token.role !== 'parent' || !familyId) {
    throw new HttpsError('permission-denied', 'Only a parent can change the family PIN.')
  }
  const pin = String(request.data?.pin ?? '').trim()
  if (!/^\d{4,10}$/.test(pin)) {
    throw new HttpsError('invalid-argument', 'PIN must be 4–10 digits.')
  }

  const { randomBytes } = await import('node:crypto')
  const salt = randomBytes(16).toString('hex')
  await db.doc(`families/${familyId}/private/auth`).set(
    { pinHash: hashPin(pin, salt), pinSalt: salt, failCount: 0, lockUntil: null },
    { merge: true },
  )
  return { ok: true }
})

export const syncParentClaims = onCall(async (request) => {
  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.')
  }
  const email = (auth.token.email ?? '').toLowerCase().trim()
  if (!email || auth.token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'A verified email is required.')
  }

  const inviteSnap = await db.doc(`parentInvites/${email}`).get()
  if (!inviteSnap.exists) {
    throw new HttpsError('permission-denied', 'This account is not invited as a parent.')
  }
  const familyId = String(inviteSnap.data()?.familyId ?? '')
  if (!familyId) {
    throw new HttpsError('failed-precondition', 'Invite is missing a family.')
  }

  const alreadySet =
    auth.token.familyId === familyId && auth.token.role === 'parent'
  if (!alreadySet) {
    await getAuth().setCustomUserClaims(auth.uid, { familyId, role: 'parent' })
  }

  return { familyId, role: 'parent', updated: !alreadySet }
})
