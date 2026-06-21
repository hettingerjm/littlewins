import { useSoundControls } from '../hooks/useSound'

export function SoundToggle({ className = '' }: { className?: string }) {
  const { muted, toggle } = useSoundControls()
  return (
    <button
      onClick={toggle}
      aria-label={muted ? 'Turn sounds on' : 'Turn sounds off'}
      title={muted ? 'Sounds off' : 'Sounds on'}
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-xl shadow-sm ring-1 ring-slate-200 transition hover:bg-white active:scale-90 ${className}`}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
