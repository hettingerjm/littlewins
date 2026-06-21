/**
 * Lightweight canvas confetti — no dependencies. Spawns a one-shot burst on a
 * full-screen, pointer-transparent canvas that removes itself when done.
 */

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rot: number
  vrot: number
  color: string
  shape: 'rect' | 'circle'
}

const DEFAULT_COLORS = [
  '#ec4899', // pink
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#a855f7', // purple
]

interface BurstOptions {
  /** Origin in viewport fractions (0–1). Defaults to top-center. */
  originX?: number
  originY?: number
  count?: number
  colors?: string[]
  /** Spread of initial velocity. */
  power?: number
}

let activeCanvas: HTMLCanvasElement | null = null

export function confetti(opts: BurstOptions = {}) {
  if (typeof window === 'undefined') return
  // Respect users who prefer reduced motion.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const {
    originX = 0.5,
    originY = 0.28,
    count = 130,
    colors = DEFAULT_COLORS,
    power = 1,
  } = opts

  const canvas = activeCanvas ?? document.createElement('canvas')
  if (!activeCanvas) {
    canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;'
    document.body.appendChild(canvas)
    activeCanvas = canvas
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const resize = () => {
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()

  const W = window.innerWidth
  const H = window.innerHeight
  const ox = W * originX
  const oy = H * originY

  const pieces: Piece[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = (4 + Math.random() * 8) * power
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: 6 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }
  })

  const gravity = 0.18
  const drag = 0.992
  let frame = 0
  const maxFrames = 220

  let raf = 0
  const tick = () => {
    frame++
    ctx.clearRect(0, 0, W, H)
    let alive = false
    for (const p of pieces) {
      p.vy += gravity
      p.vx *= drag
      p.vy *= drag
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vrot
      const fade = Math.max(0, 1 - frame / maxFrames)
      if (p.y < H + 40 && fade > 0) alive = true
      ctx.save()
      ctx.globalAlpha = fade
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    if (alive && frame < maxFrames) {
      raf = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(raf)
      canvas.remove()
      activeCanvas = null
    }
  }
  raf = requestAnimationFrame(tick)
}
