import type { ReactNode } from 'react'

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
      {label && <p className="text-sm font-semibold">{label}</p>}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  emoji,
  accent = 'text-slate-900',
}: {
  label: string
  value: ReactNode
  emoji: string
  accent?: string
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="text-3xl" aria-hidden>
        {emoji}
      </div>
      <div className="min-w-0">
        <div className={`text-2xl font-extrabold leading-none ${accent}`}>{value}</div>
        <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
          {label}
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ emoji, title, hint }: { emoji: string; title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="text-5xl" aria-hidden>
        {emoji}
      </div>
      <p className="text-lg font-bold text-slate-700">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-400">{hint}</p>}
    </div>
  )
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode
  tone?: 'slate' | 'green' | 'amber' | 'rose' | 'indigo'
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    indigo: 'bg-indigo-100 text-indigo-700',
  }
  return <span className={`chip ${tones[tone]}`}>{children}</span>
}
