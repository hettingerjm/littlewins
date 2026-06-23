import { manifest } from '../avatar/economy'
import { resolveSlot } from '../avatar/assets'
import type { AvatarState, BodyTypeId, SkinToneId, SlotId } from '../avatar/types'

interface Props {
  bodyType: BodyTypeId
  skinTone: SkinToneId
  level: number
  equipped: Partial<Record<SlotId, string>>
  /** Pixel size of the square. */
  size?: number
  /** Gentle breathing idle animation. */
  animate?: boolean
  className?: string
}

/**
 * Composites the hero from z-ordered webp layers (background → base → overlays).
 * The whole art stack animates as one unit so pinned gear never detaches.
 */
export function AvatarView({
  bodyType,
  skinTone,
  level,
  equipped,
  size = 320,
  animate = true,
  className = '',
}: Props) {
  const state = {
    name: '',
    bodyType,
    skinTone,
    level,
    totalXp: 0,
    coins: 0,
    equipped,
    owned: [],
    streakDays: 0,
    shieldsLeft: 0,
  } as AvatarState

  const src = (slot: SlotId) => resolveSlot(manifest, state, slot)
  const overlays = manifest.render.slots
    .filter((s) => s.mode === 'overlay' && s.id !== 'background')
    .sort((a, b) => a.z - b.z)

  const bg = src('background')
  const base = src('base')

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-100 to-slate-200 ${className}`}
      style={{ width: size, height: size }}
    >
      {bg && <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className={`absolute inset-0 ${animate ? 'animate-idle' : ''}`}>
        {base && (
          <img src={base} alt="hero" className="absolute inset-0 h-full w-full object-contain" />
        )}
        {overlays.map((s) => {
          const a = src(s.id as SlotId)
          return a ? (
            <img
              key={s.id}
              src={a}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              style={{ zIndex: s.z }}
            />
          ) : null
        })}
      </div>
    </div>
  )
}
