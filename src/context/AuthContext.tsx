import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '../firebase'
import { FAMILY_PIN, isParentEmail } from '../config'

export type Role = 'parent' | 'child' | null

/** Thrown when a Google account signs in but isn't on the parent allow-list. */
export class NotAuthorizedError extends Error {
  constructor(public email: string | null) {
    super('This Google account is not authorized as a parent.')
    this.name = 'NotAuthorizedError'
  }
}

interface AuthState {
  user: User | null
  role: Role
  loading: boolean
  /** Validate the family PIN; on success, sign in anonymously (child session). */
  enterPin: (pin: string) => Promise<boolean>
  /** Parent sign-in with Google. Rejects (and signs out) if not allow-listed. */
  parentSignInWithGoogle: () => Promise<void>
  /** Sign out the current session (parent or child). */
  signOutAll: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

function roleFor(user: User | null): Role {
  if (!user) return null
  // A child is anonymous (granted only after the family PIN).
  if (user.isAnonymous) return 'child'
  // A parent is a Google account on the allow-list. A non-allow-listed Google
  // account gets NO role — it can authenticate but cannot do anything.
  if (isParentEmail(user.email)) return 'parent'
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      role: roleFor(user),
      loading,
      async enterPin(pin: string) {
        if (pin.trim() !== FAMILY_PIN) return false
        // Only sign in anonymously if not already signed in as a child.
        if (!auth.currentUser || !auth.currentUser.isAnonymous) {
          await signInAnonymously(auth)
        }
        return true
      },
      async parentSignInWithGoogle() {
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        const cred = await signInWithPopup(auth, provider)
        if (!isParentEmail(cred.user.email)) {
          const email = cred.user.email
          await signOut(auth)
          throw new NotAuthorizedError(email)
        }
      },
      async signOutAll() {
        await signOut(auth)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
