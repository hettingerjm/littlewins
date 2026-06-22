import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useChildCompletions, useChildren, useTasks } from '../hooks/data'
import { completeTask, completionId } from '../lib/db'
import { todayKey, formatLong } from '../lib/dates'
import { tasksForChildOn, scheduleLabel } from '../lib/schedule'
import { earnedOn, totalEarned } from '../lib/points'
import { computeStreak } from '../lib/streak'
import { getTheme } from '../config'
import { sound } from '../lib/sound'
import { confetti } from '../lib/confetti'
import type { ChildId, FamilyId, Task } from '../types'
import { Spinner, StatCard } from '../components/ui'
import { SoundToggle } from '../components/SoundToggle'

export default function ChildHome() {
  const { childId = '' } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { familyId } = useAuth()

  const { children, loading: childrenLoading } = useChildren(familyId)
  const { tasks, loading: tasksLoading } = useTasks(familyId)
  const { completions, loading: compLoading } = useChildCompletions(familyId, childId)

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
  const allDone = total > 0 && completed === total
  const progressPct = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <div className="mb-5 flex items-center justify-between">
        <button onClick={() => navigate('/who')} className="text-2xl" aria-label="Switch profile">
          ‹
        </button>
        <div className="flex items-center gap-2">
          <span className="text-3xl" aria-hidden>
            {child.emoji}
          </span>
          <div>
            <h1 className="text-xl font-black leading-none text-slate-900">{child.name}</h1>
            <p className="text-xs text-slate-400">{formatLong(today)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <Link to={`/kid/${child.id}/rewards`} className="text-2xl" aria-label="Rewards">
            🎁
          </Link>
        </div>
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
