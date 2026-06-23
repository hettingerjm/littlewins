import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useChildClaims, useChildCompletions, useChildren, useTasks } from '../hooks/data'
import { completeTask, completionId, updateChildAppearance } from '../lib/db'
import { todayKey, formatLong } from '../lib/dates'
import { tasksForChildOn, scheduleLabel } from '../lib/schedule'
import { earnedOn, totalEarned, availableBalance } from '../lib/points'
import { computeStreak } from '../lib/streak'
import { useAvatar } from '../hooks/avatar'
import { deriveEconomy } from '../avatar/economy'
import { AvatarView } from '../components/AvatarView'
import { getTheme, KID_EMOJIS, THEME_KEYS } from '../config'
import { sound } from '../lib/sound'
import { confetti } from '../lib/confetti'
import type { Child, ChildId, FamilyId, Task, ThemeKey } from '../types'
import { Spinner, StatCard } from '../components/ui'
import { SoundToggle } from '../components/SoundToggle'

export default function ChildHome() {
  const { childId = '' } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { familyId } = useAuth()

  const { children, loading: childrenLoading } = useChildren(familyId)
  const { tasks, loading: tasksLoading } = useTasks(familyId)
  const { completions, loading: compLoading } = useChildCompletions(familyId, childId)
  const { claims } = useChildClaims(familyId, childId)
  const { avatar } = useAvatar(familyId, childId)
  const [customizing, setCustomizing] = useState(false)

  const child = children.find((c) => c.id === childId)
  const today = todayKey()

  const todays = useMemo(
    () => (child ? tasksForChildOn(tasks, child.id, today) : []),
    [tasks, child, today],
  )
  const doneToday = useMemo(() => {
    const set = new Set<string>()
    for (const c of completions) if (c.date === today) set.add(c.taskId)
    return set
  }, [completions, today])

  // Celebrate the moment the day flips from incomplete -> all done.
  const celebratedRef = useRef<boolean | null>(null)
  useEffect(() => {
    if (!child || tasksLoading || compLoading) return
    const total = todays.length
    const completed = todays.filter((t) => doneToday.has(t.id)).length
    const done = total > 0 && completed === total
    if (celebratedRef.current === null) {
      celebratedRef.current = done
      return
    }
    if (done && !celebratedRef.current) {
      void sound.play('celebrate')
      confetti({ originY: 0.3, count: 170 })
    }
    celebratedRef.current = done
  }, [child, todays, doneToday, tasksLoading, compLoading])

  if (childrenLoading || tasksLoading || compLoading) return <Spinner label="Loading your day…" />

  if (!child) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg font-bold">That profile doesn't exist.</p>
        <Link to="/who" className="btn-primary mt-4">
          Back to profiles
        </Link>
      </div>
    )
  }

  const theme = getTheme(child.theme)
  const total = todays.length
  const completed = todays.filter((t) => doneToday.has(t.id)).length
  const pointsToday = earnedOn(completions, child.id, today)
  const totalPoints = totalEarned(completions, child.id)
  const streak = computeStreak(tasks, completions, child.id, today)
  const balance = availableBalance(completions, claims, child.id)
  const heroEcon = deriveEconomy(completions)
  const allDone = total > 0 && completed === total
  const progressPct = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <div className="mb-5 flex items-center justify-between">
        <button onClick={() => navigate('/who')} className="text-2xl" aria-label="Switch profile">
          ‹
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              void sound.play('tap')
              setCustomizing(true)
            }}
            className="relative text-3xl transition active:scale-90"
            aria-label="Change my icon and color"
            title="Tap to change your icon & color"
          >
            {child.emoji}
            <span className="absolute -bottom-1 -right-1 text-[10px]">✏️</span>
          </button>
          <div>
            <h1 className="text-xl font-black leading-none text-slate-900">{child.name}</h1>
            <p className="text-xs text-slate-400">{formatLong(today)}</p>
          </div>
        </div>
        <SoundToggle />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label="Today" value={pointsToday} emoji="✨" accent={theme.accent} />
        <StatCard label="Total points" value={totalPoints} emoji="⭐" />
        <StatCard
          label="Day streak"
          value={
            <span className="inline-flex items-center gap-0.5">
              {streak}
              <span className={streak > 0 ? 'inline-block animate-flicker' : ''}>🔥</span>
            </span>
          }
          emoji="📆"
        />
      </div>

      {/* Hero HQ card */}
      {avatar && (
        <Link
          to={`/kid/${child.id}/hero`}
          onClick={() => void sound.play('tap')}
          className="card mb-4 flex items-center gap-4 p-3 transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
        >
          <AvatarView
            bodyType={avatar.bodyType}
            skinTone={avatar.skinTone}
            level={heroEcon.level}
            equipped={avatar.equipped}
            size={72}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-800">Hero HQ</span>
              <span className="text-xs font-bold uppercase tracking-wide text-indigo-500">
                {heroEcon.stageName}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-500">
              Level {heroEcon.level} · 🪙 {Math.max(0, heroEcon.earnedCoins - avatar.coinsSpent)}
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600"
                style={{ width: `${Math.round(heroEcon.fraction * 100)}%` }}
              />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-300" aria-hidden>›</span>
        </Link>
      )}

      {/* Prominent Rewards call-to-action */}
      <Link
        to={`/kid/${child.id}/rewards`}
        onClick={() => void sound.play('tap')}
        className={`mb-5 flex items-center gap-4 rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg ring-4 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99] ${theme.profile}`}
      >
        <span className="animate-float text-4xl" aria-hidden>
          🎁
        </span>
        <div className="flex-1">
          <div className="text-lg font-black leading-tight">Rewards</div>
          <div className="text-sm font-bold text-white/90">
            {balance} {balance === 1 ? 'point' : 'points'} to spend
          </div>
        </div>
        <span className="text-2xl font-black" aria-hidden>
          ›
        </span>
      </Link>

      <div className="card mb-6 p-4">
        <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
          <span>Today's progress</span>
          <span>
            {completed} / {total}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${theme.bar}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {allDone && (
          <p className={`mt-3 animate-scale-in text-center text-lg font-black ${theme.accent}`}>
            🎉 All done today! Amazing!
          </p>
        )}
      </div>

      {total === 0 ? (
        <div className="card px-6 py-12 text-center text-slate-400">
          <div className="text-5xl">🌤️</div>
          <p className="mt-2 font-bold text-slate-600">No tasks scheduled today.</p>
          <p className="text-sm">Enjoy your free day!</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {todays.map((task, i) => (
            <TaskRow
              key={task.id}
              familyId={familyId!}
              task={task}
              childId={child.id}
              dateKey={today}
              done={doneToday.has(task.id)}
              theme={theme}
              index={i}
            />
          ))}
        </ul>
      )}

      {customizing && (
        <Customizer
          familyId={familyId!}
          child={child}
          onClose={() => setCustomizing(false)}
        />
      )}
    </div>
  )
}

function Customizer({
  familyId,
  child,
  onClose,
}: {
  familyId: FamilyId
  child: Child
  onClose: () => void
}) {
  const [emoji, setEmoji] = useState(child.emoji)
  const [theme, setTheme] = useState<ThemeKey>(child.theme)
  const [busy, setBusy] = useState(false)
  const preview = getTheme(theme)

  const save = async () => {
    setBusy(true)
    void sound.play('tap')
    try {
      await updateChildAppearance(familyId, child.id, emoji, theme)
      void sound.play('sparkle')
      onClose()
    } catch (err) {
      console.error(err)
      void sound.play('error')
      alert("That didn't save — please try again.")
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-6">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
        <div className="mb-4 flex items-center gap-3">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl text-white ${preview.profile}`}
          >
            {emoji}
          </div>
          <h2 className="text-xl font-black text-slate-900">Make it yours, {child.name}!</h2>
        </div>

        <span className="label">Pick an icon</span>
        <div className="mb-4 grid grid-cols-8 gap-1.5">
          {KID_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => {
                void sound.play('tap')
                setEmoji(e)
              }}
              className={`flex aspect-square items-center justify-center rounded-xl text-2xl transition active:scale-90 ${
                emoji === e ? `bg-gradient-to-br ${preview.profile} ring-2` : 'bg-slate-100 hover:bg-slate-200'
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        <span className="label">Pick a color</span>
        <div className="mb-6 flex flex-wrap gap-2">
          {THEME_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => {
                void sound.play('tap')
                setTheme(key)
              }}
              aria-label={key}
              className={`h-11 w-11 rounded-full bg-gradient-to-br ${getTheme(key).profile} ${
                theme === key ? 'ring-4 ring-offset-2' : 'opacity-70'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={save} disabled={busy} className="btn-primary flex-1">
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskRow({
  familyId,
  task,
  childId,
  dateKey,
  done,
  theme,
  index,
}: {
  familyId: FamilyId
  task: Task
  childId: ChildId
  dateKey: string
  done: boolean
  theme: { bar: string; ring: string; accent: string; soft: string }
  index: number
}) {
  const [busy, setBusy] = useState(false)

  const onCheck = async () => {
    if (done || busy) return
    setBusy(true)
    void sound.play('check')
    try {
      await completeTask(familyId, childId, task, dateKey)
    } catch (err) {
      console.error('Could not complete task', completionId(childId, task.id, dateKey), err)
      void sound.play('error')
      alert("Hmm, that didn't save. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <li
      style={{ animationDelay: `${index * 60}ms` }}
      className={`card flex animate-fade-up items-center gap-3 p-4 transition ${
        done ? `${theme.soft} ring-2 ${theme.ring}` : ''
      }`}
    >
      <button
        onClick={onCheck}
        disabled={done || busy}
        aria-label={done ? `${task.title} completed` : `Mark ${task.title} done`}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl transition active:scale-90 ${
          done
            ? `${theme.bar} text-white`
            : 'border-2 border-dashed border-slate-300 text-transparent hover:border-slate-400'
        }`}
      >
        {done ? <span className="animate-check-pop">✓</span> : busy ? '…' : '○'}
      </button>

      <div className="min-w-0 flex-1">
        <div className={`font-bold ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
          {task.title}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
          <span>{task.category}</span>
          <span>•</span>
          <span>{task.minutes} min</span>
          <span>•</span>
          <span>{scheduleLabel(task.scheduleType)}</span>
          {task.linkUrl && (
            <a
              href={task.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-indigo-500 hover:underline"
            >
              🔗 lesson
            </a>
          )}
        </div>
      </div>

      <div className={`shrink-0 text-sm font-black ${theme.accent}`}>+{task.points}</div>
    </li>
  )
}
