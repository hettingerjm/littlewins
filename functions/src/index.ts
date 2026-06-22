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
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'

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
