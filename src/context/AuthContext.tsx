import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '../firebase'
import { FAMILY_PIN } from '../config'

export type Role = 'parent' | 'child' | null

interface AuthState {
  user: User | null
  role: Role
  loading: boolean
  /** Validate the family PIN; on success, sign in anonymously (child session). */
  enterPin: (pin: string) => Promise<boolean>
  /** Parent sign-in with email + password. */
  parentSignIn: (email: string, password: string) => Promise<void>
  /** Sign out the current session (parent or child). */
  signOutAll: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

function roleFor(user: User | null): Role {
  if (!user) return null
  // A parent authenticates with email/password; a child is anonymous.
  return user.isAnonymous ? 'child' : 'parent'
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
      async parentSignIn(email: string, password: string) {
        await signInWithEmailAndPassword(auth, email.trim(), password)
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
