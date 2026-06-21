import { FormEvent, useState } from 'react'
import { CHILDREN } from '../../config'
import { useTasks } from '../../hooks/data'
import {
  createTask,
  deleteTask,
  reorderTasks,
  setTaskActive,
  updateTask,
  type TaskInput,
} from '../../lib/db'
import { scheduleLabel } from '../../lib/schedule'
import type { ChildId, ScheduleType, Task } from '../../types'
import { Badge, EmptyState, PageHeader, Spinner } from '../../components/ui'

const SCHEDULES: ScheduleType[] = ['daily', 'weekdays', 'weekends']

const emptyDraft = (order: number): TaskInput => ({
  title: '',
  category: '',
  minutes: 10,
  points: 1,
  scheduleType: 'daily',
  active: true,
  order,
  assignedTo: ['emma', 'sophia'],
  linkUrl: '',
})

export default function ManageTasks() {
  const { tasks, loading } = useTasks()
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= tasks.length) return
    const ids = tasks.map((t) => t.id)
    ;[ids[index], ids[next]] = [ids[next], ids[index]]
    await reorderTasks(ids)
  }

  if (loading) return <Spinner label="Loading tasks…" />

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Add, edit, reorder, and activate the daily tasks."
        right={
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Add task
          </button>
        }
      />

      {tasks.length === 0 ? (
        <EmptyState emoji="📝" title="No tasks yet" hint="Add your first task to get started." />
      ) : (
        <ul className="space-y-2">
          {tasks.map((task, i) => (
            <li
              key={task.id}
              className={`card flex items-center gap-3 p-4 ${task.active ? '' : 'opacity-60'}`}
            >
              <div className="flex flex-col">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === tasks.length - 1}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-800">{task.title}</span>
                  {!task.active && <Badge tone="rose">Inactive</Badge>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                  <span>{task.category || 'Uncategorized'}</span>
                  <span>•</span>
                  <span>{task.minutes} min</span>
                  <span>•</span>
                  <span>+{task.points} pts</span>
                  <span>•</span>
                  <span>{scheduleLabel(task.scheduleType)}</span>
                  <span>•</span>
                  <span>
                    {task.assignedTo
                      .map((id) => CHILDREN.find((c) => c.id === id)?.name ?? id)
                      .join(' & ')}
                  </span>
                  {task.linkUrl && <span className="text-indigo-500">🔗</span>}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setTaskActive(task.id, !task.active)}
                  className="btn-ghost text-sm"
                >
                  {task.active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => setEditing(task)} className="btn-ghost text-sm">
                  Edit
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(creating || editing) && (
        <TaskForm
          task={editing}
          defaultOrder={tasks.length}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

function TaskForm({
  task,
  defaultOrder,
  onClose,
}: {
  task: Task | null
  defaultOrder: number
  onClose: () => void
}) {
  const [draft, setDraft] = useState<TaskInput>(
    task
      ? {
          title: task.title,
          category: task.category,
          minutes: task.minutes,
          points: task.points,
          scheduleType: task.scheduleType,
          active: task.active,
          order: task.order,
          assignedTo: task.assignedTo,
          linkUrl: task.linkUrl ?? '',
        }
      : emptyDraft(defaultOrder),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleChild = (id: ChildId) => {
    setDraft((d) => {
      const has = d.assignedTo.includes(id)
      const next = has ? d.assignedTo.filter((c) => c !== id) : [...d.assignedTo, id]
      return { ...d, assignedTo: next }
    })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim()) return setError('Please enter a title.')
    if (draft.assignedTo.length === 0) return setError('Assign the task to at least one child.')
    setBusy(true)
    setError(null)
    try {
      const clean: TaskInput = {
        ...draft,
        title: draft.title.trim(),
        category: draft.category.trim(),
        minutes: Math.max(0, Math.round(draft.minutes)),
        points: Math.max(0, Math.round(draft.points)),
        linkUrl: draft.linkUrl?.trim() || undefined,
      }
      if (task) await updateTask(task.id, clean)
      else await createTask(clean)
      onClose()
    } catch (err) {
      console.error(err)
      setError('Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async () => {
    if (!task) return
    if (!confirm(`Delete "${task.title}" permanently? Past history is kept.`)) return
    setBusy(true)
    try {
      await deleteTask(task.id)
      onClose()
    } catch (err) {
      console.error(err)
      setError('Could not delete.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-6">
      <form
        onSubmit={onSubmit}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
      >
        <h2 className="mb-5 text-xl font-black text-slate-900">
          {task ? 'Edit task' : 'New task'}
        </h2>

        <label className="label" htmlFor="t-title">
          Title
        </label>
        <input
          id="t-title"
          className="input mb-4"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          autoFocus
        />

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="t-cat">
              Category
            </label>
            <input
              id="t-cat"
              className="input"
              placeholder="Music, Exercise…"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="t-sched">
              Schedule
            </label>
            <select
              id="t-sched"
              className="input"
              value={draft.scheduleType}
              onChange={(e) =>
                setDraft({ ...draft, scheduleType: e.target.value as ScheduleType })
              }
            >
              {SCHEDULES.map((s) => (
                <option key={s} value={s}>
                  {scheduleLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="t-min">
              Minutes
            </label>
            <input
              id="t-min"
              type="number"
              min={0}
              className="input"
              value={draft.minutes}
              onChange={(e) => setDraft({ ...draft, minutes: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label" htmlFor="t-pts">
              Points
            </label>
            <input
              id="t-pts"
              type="number"
              min={0}
              className="input"
              value={draft.points}
              onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })}
            />
          </div>
        </div>

        <span className="label">Applies to</span>
        <div className="mb-4 flex gap-2">
          {CHILDREN.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => toggleChild(c.id)}
              className={`btn ${
                draft.assignedTo.includes(c.id) ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>

        <label className="label" htmlFor="t-link">
          Link URL (optional)
        </label>
        <input
          id="t-link"
          type="url"
          className="input mb-4"
          placeholder="https://…"
          value={draft.linkUrl ?? ''}
          onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
        />

        <label className="mb-2 flex items-center gap-2 font-bold text-slate-600">
          <input
            type="checkbox"
            className="h-5 w-5 rounded"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />
          Active
        </label>

        {error && <p className="mt-2 text-sm font-bold text-rose-500">{error}</p>}

        <div className="mt-6 flex items-center gap-2">
          <button type="submit" disabled={busy} className="btn-primary flex-1">
            {busy ? 'Saving…' : 'Save task'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          {task && (
            <button type="button" onClick={onDelete} disabled={busy} className="btn-danger">
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
