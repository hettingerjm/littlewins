import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useChildCompletions, useChildren } from '../hooks/data'
import { useAvatar } from '../hooks/avatar'
import { setAvatarAppearance, setEquipped } from '../lib/db'
import {
  manifest,
  deriveEconomy,
  coinsAvailable,
  rarityColor,
} from '../avatar/economy'
import { resolveIcon } from '../avatar/assets'
import type { BodyTypeId, ItemCategory, ShopItem, SkinToneId } from '../avatar/types'
import { AvatarView } from '../components/AvatarView'
import { Spinner } from '../components/ui'
import { SoundToggle } from '../components/SoundToggle'
import { sound } from '../lib/sound'
import { confetti } from '../lib/confetti'

const purchaseFn = httpsCallable<{ childId: string; itemId: string }, { ok: boolean }>(
  functions,
  'avatarPurchase',
)

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  outfit: 'Outfits',
  headgear: 'Headgear',
  weapon: 'Weapons',
  pet: 'Pets',
  aura: 'Auras',
  background: 'Backgrounds',
  frame: 'Frames',
  emote: 'Emotes',
}
const CATEGORY_ORDER: ItemCategory[] = [
  'outfit', 'headgear', 'weapon', 'pet', 'aura', 'background', 'frame', 'emote',
]

export default function HeroPage() {
  const { childId = '' } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { familyId } = useAuth()
  const { children, loading: childrenLoading } = useChildren(familyId)
  const { completions, loading: compLoading } = useChildCompletions(familyId, childId)
  const { avatar, loading: avatarLoading } = useAvatar(familyId, childId)
  const [busyItem, setBusyItem] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const child = children.find((c) => c.id === childId)
  const econ = useMemo(() => deriveEconomy(completions), [completions])

  if (childrenLoading || compLoading || avatarLoading) return <Spinner label="Loading your hero…" />
  if (!child || !avatar || !familyId) {
    return (
      <div className="p-8 text-center">
        <Link to="/who" className="btn-primary">Back to profiles</Link>
      </div>
    )
  }

  const balance = coinsAvailable(econ.earnedCoins, avatar)

  const equip = async (item: ShopItem) => {
    const slot = item.category
    const next = { ...avatar.equipped }
    if (next[slot] === item.id) delete next[slot]
    else next[slot] = item.id
    void sound.play('tap')
    try {
      await setEquipped(familyId, child.id, next)
    } catch (err) {
      console.error(err)
    }
  }

  const buy = async (item: ShopItem) => {
    setBusyItem(item.id)
    setMsg(null)
    try {
      await purchaseFn({ childId: child.id, itemId: item.id })
      void sound.play('celebrate')
      confetti({ originY: 0.4, count: 110 })
    } catch (err) {
      const m = (err as { message?: string })?.message ?? 'Could not buy that.'
      void sound.play('error')
      setMsg(m.replace(/^.*?:\s*/, ''))
    } finally {
      setBusyItem(null)
    }
  }

  const setBody = (bodyType: BodyTypeId) => {
    void sound.play('tap')
    void setAvatarAppearance(familyId, child.id, { bodyType, skinTone: avatar.skinTone })
  }
  const setSkin = (skinTone: SkinToneId) => {
    void sound.play('tap')
    void setAvatarAppearance(familyId, child.id, { bodyType: avatar.bodyType, skinTone })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => navigate(`/kid/${child.id}`)} className="text-2xl" aria-label="Back">
          ‹
        </button>
        <h1 className="text-xl font-black text-slate-900">🛡️ {child.name}'s Hero HQ</h1>
        <SoundToggle />
      </div>

      {/* Avatar + stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="flex justify-center">
          <AvatarView
            bodyType={avatar.bodyType}
            skinTone={avatar.skinTone}
            level={econ.level}
            equipped={avatar.equipped}
            size={300}
          />
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-sm font-bold uppercase tracking-wide text-indigo-500">
            {econ.stageName}
          </div>
          <div className="text-3xl font-black text-slate-900">Level {econ.level}</div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs font-bold text-slate-500">
              <span>XP</span>
              <span>{econ.atCap ? 'MAX' : `${econ.intoLevel} / ${econ.needForLevel}`}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-500"
                style={{ width: `${Math.round(econ.fraction * 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-lg font-black text-amber-700">
            🪙 {balance} coins
          </div>

          {/* Creator */}
          <div className="mt-5">
            <div className="label">Body</div>
            <div className="flex gap-2">
              {manifest.bodyTypes.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBody(b.id)}
                  className={`btn ${avatar.bodyType === b.id ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {b.name}
                </button>
              ))}
            </div>
            <div className="label mt-3">Skin tone</div>
            <div className="flex gap-2">
              {manifest.skinTones.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSkin(s.id)}
                  aria-label={s.name}
                  title={s.name}
                  className={`h-9 w-9 rounded-full border-2 ${avatar.skinTone === s.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'}`}
                  style={{ background: skinSwatch(s.id) }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <p className="mb-4 rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600">{msg}</p>
      )}

      {/* Shop */}
      <h2 className="mb-2 text-lg font-black text-slate-900">🛒 Shop</h2>
      {CATEGORY_ORDER.map((cat) => {
        const items = manifest.shop.filter((i) => i.category === cat)
        if (items.length === 0) return null
        return (
          <section key={cat} className="mb-5">
            <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
              {CATEGORY_LABEL[cat]}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item) => (
                <ShopCard
                  key={item.id}
                  item={item}
                  owned={avatar.owned.includes(item.id)}
                  equipped={avatar.equipped[item.category] === item.id}
                  level={econ.level}
                  balance={balance}
                  busy={busyItem === item.id}
                  onBuy={() => buy(item)}
                  onEquip={() => equip(item)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function ShopCard({
  item,
  owned,
  equipped,
  level,
  balance,
  busy,
  onBuy,
  onEquip,
}: {
  item: ShopItem
  owned: boolean
  equipped: boolean
  level: number
  balance: number
  busy: boolean
  onBuy: () => void
  onEquip: () => void
}) {
  const color = rarityColor(item.rarity)
  const levelOk = level >= item.levelReq
  const affordable = balance >= item.price

  let action: JSX.Element
  if (owned) {
    action = (
      <button
        onClick={onEquip}
        className={`btn w-full text-sm ${equipped ? 'bg-emerald-500 text-white' : 'btn-ghost'}`}
      >
        {equipped ? 'Equipped ✓' : 'Equip'}
      </button>
    )
  } else if (!levelOk) {
    action = <button disabled className="btn-ghost w-full cursor-not-allowed text-sm opacity-60">🔒 Lv {item.levelReq}</button>
  } else {
    action = (
      <button
        onClick={onBuy}
        disabled={busy || !affordable}
        className={`btn w-full text-sm ${affordable ? 'btn-primary' : 'btn-ghost opacity-60'}`}
        title={affordable ? '' : 'Not enough coins yet'}
      >
        {busy ? '…' : `🪙 ${item.price}`}
      </button>
    )
  }

  return (
    <div className="card overflow-hidden p-3" style={{ boxShadow: `inset 0 0 0 2px ${color}22` }}>
      <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-slate-100">
        <img
          src={resolveIcon(manifest, item)}
          alt={item.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <span
          className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase text-white"
          style={{ background: color }}
        >
          {item.rarity}
        </span>
      </div>
      <div className="truncate text-sm font-bold text-slate-800" title={item.name}>
        {item.name}
      </div>
      <div className="mb-2 mt-0.5 text-xs text-slate-400">Lv {item.levelReq}+</div>
      {action}
    </div>
  )
}

function skinSwatch(id: SkinToneId): string {
  return { fair: '#f3d2b3', warm: '#e0ac82', tan: '#b07a4f', deep: '#6f4630' }[id] ?? '#e0ac82'
}
