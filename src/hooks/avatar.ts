import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { avatarsCol, ensureAvatar } from '../lib/db'
import { DEFAULT_AVATAR, type AvatarDoc } from '../avatar/economy'
import type { ChildId, FamilyId } from '../types'

/** Realtime subscription to a child's avatar doc (creates defaults if missing). */
export function useAvatar(familyId: FamilyId | null, childId: ChildId | null) {
  const [avatar, setAvatar] = useState<AvatarDoc | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!familyId || !childId) {
      setAvatar(null)
      setLoading(false)
      return
    }
    setLoading(true)
    let ensured = false
    const ref = doc(avatarsCol(familyId), childId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setAvatar({ ...DEFAULT_AVATAR, ...(snap.data() as Partial<AvatarDoc>) })
        } else {
          setAvatar(null)
          if (!ensured) {
            ensured = true
            void ensureAvatar(familyId, childId).catch(() => {})
          }
        }
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [familyId, childId])

  return { avatar, loading }
}
