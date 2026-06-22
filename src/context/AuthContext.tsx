import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../firebase'
import type { FamilyId } from '../types'

export type Role = 'parent' | 'child' | null

interface AuthState {
  user: User | null
  familyId: FamilyId | null
  role: Role
  loading: boolean
  /** True when a Google user signed in but isn't invited as a parent. */
  notAuthorized: boolean
  /** Verify a family's PIN (server-side) and start a child session. */
  enterPin: (familyId: FamilyId, pin: string) => Promise<boolean>
  /** Parent sign-in with Google (popup, falling back to redirect on mobile). */
  parentSignInWithGoogle: () => Promise<void>
  signOutAll: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

const kidLoginFn = httpsCallable<{ familyId: string; pin: string }, { token: string }>(
  functions,
  'kidLogin',
)
const syncParentClaimsFn = httpsCallable<void, { familyId: string; role: string }>(
  functions,
  'syncParentClaims',
)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [familyId, setFamilyId] = useState<FamilyId | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)
  const [notAuthorized, setNotAuthorized] = useState(false)
  const syncingRef = useRef(false)

  const applyClaims = useCallback(async (u: User | null, forceRefresh = false) => {
    if (!u) {
      setFamilyId(null)
      setRole(null)
      return
    }
    const res = await u.getIdTokenResult(forceRefresh)
    setFamilyId((res.claims.familyId as string | undefined) ?? null)
    const r = res.claims.role as string | undefined
    setRole(r === 'parent' || r === 'child' ? r : null)
  }, [])

  useEffect(() => {
    // Surface any redirect-based sign-in result (mobile fallback path).
    getRedirectResult(auth).catch(() => {
      /* handled by onAuthStateChanged */
    })

    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      await applyClaims(u)

      // A signed-in Google user without a parent role yet: try to stamp it.
      if (u && !u.isAnonymous) {
        const res = await u.getIdTokenResult()
        if (res.claims.role !== 'parent' && !syncingRef.current) {
          syncingRef.current = true
          try {
            await syncParentClaimsFn()
            await applyClaims(u, true)
            setNotAuthorized(false)
          } catch {
            setNotAuthorized(true)
          } finally {
            syncingRef.current = false
          }
        }
      } else {
        setNotAuthorized(false)
      }
      setLoading(false)
    })
  }, [applyClaims])

  const value = useMemo<AuthState>(
    () => ({
      user,
      familyId,
      role,
      loading,
      notAuthorized,
      async enterPin(fid: string, pin: string) {
        try {
          const { data } = await kidLoginFn({ familyId: fid, pin: pin.trim() })
          await signInWithCustomToken(auth, data.token)
          return true
        } catch (err) {
          const code = (err as { code?: string })?.code
          // Wrong PIN / lockout / unknown family -> treat as failed entry.
          if (
            code === 'functions/permission-denied' ||
            code === 'functions/not-found' ||
            code === 'functions/resource-exhausted' ||
            code === 'functions/invalid-argument'
          ) {
            return false
          }
          throw err
        }
      },
      async parentSignInWithGoogle() {
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        try {
          await signInWithPopup(auth, provider)
          // Claim sync happens in the onAuthStateChanged handler.
        } catch (err) {
          const code = (err as { code?: string })?.code
          // Popups are unreliable on mobile — fall back to a full-page redirect.
          if (
            code === 'auth/popup-blocked' ||
            code === 'auth/operation-not-supported-in-this-environment' ||
            code === 'auth/cancelled-popup-request'
          ) {
            await signInWithRedirect(auth, provider)
            return
          }
          throw err
        }
      },
      async signOutAll() {
        await signOut(auth)
        setNotAuthorized(false)
      },
    }),
    [user, familyId, role, loading, notAuthorized],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
