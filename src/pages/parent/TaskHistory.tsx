import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useChildCompletions, useChildren, useTasks } from '../../hooks/data'
import { completionId, removeCompletion } from '../../lib/db'
import { todayKey, formatLong } from '../../lib/dates'
import { tasksForChildOn } from '../../lib/schedule'
import { isDayComplete } from '../../lib/streak'
import type { ChildId } from '../../types'
import { Badge, EmptyState, PageHeader, Spinner } from '../../components/ui'

export default function TaskHistory() {
  const { familyId } = useAuth()
  const { children, loading: childrenLoading } = useChildren(familyId)
  const [childId, setChildId] = useState<ChildId>('')
  const [date, setDate] = useState<string>(todayKey())

  // Default to the first child once loaded.
  useEffect(() => {
    if (!childId && children.length > 0) setChildId(children[0].id)
  }, [children, childId])

  const { tasks, loading: tasksLoading } = useTasks(familyId)
  const { completions, loading: compLoading } = useChildCompletions(familyId, childId || null)

  const dayCompletions = useMemo(
    () => completions.filter((c) => c.date === date),
    [completions, date],
  )
  const scheduled = useMemo(
    () => (childId ? tasksForChildOn(tasks, childId, date) : []),
    [tasks, childId, date],
  )

  if (childrenLoading) return <Spinner label="Loading…" />
  if (children.length === 0) {
    return (
      <>
        <PageHeader title="Task history" />
        <EmptyState emoji="🧒" title="No kids yet" hint="Add children from the Kids tab first." />
      </>
    )
  }

  const doneIds = new Set(dayCompletions.map((c) => c.taskId))
  const points = dayCompletions.reduce((s, c) => s + (c.points ?? 0), 0)
  const allComplete =
    !tasksLoading && !compLoading && !!childId && isDayComplete(tasks, completions, childId, date)

  const onUndo = async (id: string) => {
    if (!familyId) return
    if (!confirm('Remove this completion from history?')) return
    try {
      await removeCompletion(familyId, id)
    } catch (err) {
      console.error(err)
      alert('Could not remove that record.')
    }
  }

  return (
    <>
      <PageHeader title="Task history" subtitle="Look back at any child and any day." />

      <div className="card mb-6 flex flex-wrap items-end gap-4 p-4">
        <div>
          <span className="label">Child</span>
          <div className="flex flex-wrap gap-2">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setChildId(c.id)}
                className={`btn ${childId === c.id ? 'btn-primary' : 'btn-ghost'}`}
              >
                {c.emoji} {c.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="historyDate">
            Date
          </label>
          <input
            id="historyDate"
            type="date"
            className="input"
            value={date}
            max={todayKey()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-black text-slate-900">{points} pts</div>
          <div className="text-xs font-bold uppercase text-slate-400">{formatLong(date)}</div>
        </div>
      </div>

      {tasksLoading || compLoading ? (
        <Spinner label="Loading history…" />
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            {allComplete ? (
              <Badge tone="green">✓ Day complete</Badge>
            ) : scheduled.length === 0 ? (
              <Badge tone="slate">No tasks scheduled</Badge>
            ) : (
              <Badge tone="amber">
                {doneIds.size}/{scheduled.length} done
              </Badge>
            )}
          </div>

          {scheduled.length === 0 && dayCompletions.length === 0 ? (
            <div className="card px-6 py-10 text-center text-slate-400">
              Nothing scheduled or completed on this day.
            </div>
          ) : (
            <ul className="space-y-2">
              {scheduled.map((task) => {
                const isDone = doneIds.has(task.id)
                const compId = completionId(childId, task.id, date)
                return (
                  <li key={task.id} className="card flex items-center gap-3 p-3.5">
                    <span className={isDone ? 'text-emerald-500' : 'text-slate-300'}>
                      {isDone ? '✓' : '○'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={isDone ? 'font-bold text-slate-700' : 'font-bold text-slate-400'}>
                        {task.title}
                      </div>
                      <div className="text-xs text-slate-400">
                        {task.category} • {task.minutes} min • +{task.points}
                      </div>
                    </div>
                    {isDone ? (
                      <button onClick={() => onUndo(compId)} className="btn-danger text-sm">
                        Undo
                      </button>
                    ) : (
                      <Badge tone="slate">Missed</Badge>
                    )}
                  </li>
                )
              })}

              {dayCompletions
                .filter((c) => !scheduled.some((t) => t.id === c.taskId))
                .map((c) => (
                  <li key={c.id} className="card flex items-center gap-3 p-3.5 opacity-80">
                    <span className="text-emerald-500">✓</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-700">{c.title ?? c.taskId}</div>
                      <div className="text-xs text-slate-400">
                        {c.category ?? 'task'} • +{c.points} (not in current schedule)
                      </div>
                    </div>
                    <button onClick={() => onUndo(c.id)} className="btn-danger text-sm">
                      Undo
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
