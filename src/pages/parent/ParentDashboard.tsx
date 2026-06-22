import { useAuth } from '../../context/AuthContext'
import { useChildCompletions, useChildren, useTasks } from '../../hooks/data'
import { todayKey, formatLong } from '../../lib/dates'
import { tasksForChildOn } from '../../lib/schedule'
import { earnedOn, totalEarned } from '../../lib/points'
import { computeStreak } from '../../lib/streak'
import { getTheme } from '../../config'
import type { Child, FamilyId, Task } from '../../types'
import { EmptyState, PageHeader, Spinner } from '../../components/ui'

export default function ParentDashboard() {
  const { familyId } = useAuth()
  const { children, loading: childrenLoading } = useChildren(familyId)
  const { tasks, loading: tasksLoading } = useTasks(familyId)
  const today = todayKey()

  if (childrenLoading || tasksLoading) return <Spinner label="Loading today…" />

  return (
    <>
      <PageHeader title="Today" subtitle={formatLong(today)} />
      {children.length === 0 ? (
        <EmptyState
          emoji="🧒"
          title="No kids yet"
          hint="Add your children from the Kids tab to get started."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {children.map((child) => (
            <ChildToday key={child.id} familyId={familyId!} child={child} tasks={tasks} today={today} />
          ))}
        </div>
      )}
    </>
  )
}

function ChildToday({
  familyId,
  child,
  tasks,
  today,
}: {
  familyId: FamilyId
  child: Child
  tasks: Task[]
  today: string
}) {
  const { completions, loading } = useChildCompletions(familyId, child.id)

  const todays = tasksForChildOn(tasks, child.id, today)
  const done = new Set(completions.filter((c) => c.date === today).map((c) => c.taskId))
  const completed = todays.filter((t) => done.has(t.id)).length
  const total = todays.length
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
  const streak = computeStreak(tasks, completions, child.id, today)
  const theme = getTheme(child.theme)

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {child.emoji}
          </span>
          <h2 className="text-lg font-black text-slate-900">{child.name}</h2>
        </div>
        <div className="flex items-center gap-3 text-sm font-bold">
          <span className={theme.accent}>{earnedOn(completions, child.id, today)} pts today</span>
          <span className="text-slate-400">{totalEarned(completions, child.id)} total</span>
          <span title="Daily streak">{streak}🔥</span>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-bold text-slate-500">
          {completed}/{total}
        </span>
      </div>

      {loading ? (
        <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
      ) : total === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">No tasks scheduled today.</p>
      ) : (
        <ul className="space-y-1.5">
          {todays.map((task) => {
            const isDone = done.has(task.id)
            return (
              <li key={task.id} className="flex items-center gap-2 text-sm">
                <span className={isDone ? 'text-emerald-500' : 'text-slate-300'}>
                  {isDone ? '✓' : '○'}
                </span>
                <span className={isDone ? 'text-slate-400 line-through' : 'text-slate-700'}>
                  {task.title}
                </span>
                <span className="ml-auto text-xs text-slate-400">+{task.points}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
