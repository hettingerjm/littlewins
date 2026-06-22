import type { ChildId } from './types'

export interface ChildProfile {
  id: ChildId
  name: string
  emoji: string
  /** Tailwind color family used across that child's screens. */
  theme: 'emma' | 'sophia'
}

/**
 * The two fixed family profiles. This app deliberately supports exactly one
 * family and exactly these two children — no multi-family support, and no
 * child email accounts.
 */
export const CHILDREN: ChildProfile[] = [
  { id: 'emma', name: 'Emma', emoji: '🦄', theme: 'emma' },
  { id: 'sophia', name: 'Sophia', emoji: '🌸', theme: 'sophia' },
]

export function getChild(id: string): ChildProfile | undefined {
  return CHILDREN.find((c) => c.id === id)
}

/**
 * The family PIN. Read from VITE_FAMILY_PIN at build time. This is a friction
 * gate, not a real secret (it is visible in the JS bundle). The real security
 * boundary is Firestore rules: a correct PIN triggers anonymous auth, and all
 * parent actions require an allow-listed Google account.
 */
export const FAMILY_PIN: string = import.meta.env.VITE_FAMILY_PIN ?? '1234'

/**
 * Google accounts allowed to act as parents, from VITE_PARENT_EMAILS
 * (comma-separated). Because parents sign in with Google, ANY Google account
 * could authenticate — so this allow-list (mirrored in firestore.rules) is what
 * actually grants parent powers. Compared lower-cased.
 *
 * NOTE: This is the single-family stopgap. A future multi-family version would
 * replace the allow-list with per-family membership records + a token claim.
 */
export const PARENT_EMAILS: string[] = (import.meta.env.VITE_PARENT_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function isParentEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return PARENT_EMAILS.includes(email.toLowerCase())
}
