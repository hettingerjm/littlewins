import { useCallback, useState } from 'react'
import { sound } from '../lib/sound'

/** React binding for the mute toggle so components re-render on change. */
export function useSoundControls() {
  const [muted, setMutedState] = useState(sound.isMuted())

  const toggle = useCallback(() => {
    const next = sound.toggleMuted()
    setMutedState(next)
    if (!next) void sound.play('tap')
  }, [])

  return { muted, toggle }
}
