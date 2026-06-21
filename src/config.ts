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
 * parent actions require email/password auth.
 */
export const FAMILY_PIN: string = import.meta.env.VITE_FAMILY_PIN ?? '1234'
