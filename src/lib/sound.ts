/**
 * Tiny synthesized sound engine built on the Web Audio API.
 *
 * No audio files, no network requests, no dependencies — every sound is
 * generated on the fly. This keeps the bundle small, works offline, and plays
 * nicely with a strict Content-Security-Policy. Sounds are muted-respecting
 * (persisted in localStorage) and the AudioContext is created lazily on the
 * first user gesture, as browsers require.
 */

const STORAGE_KEY = 'lw_muted'

type SoundName =
  | 'tap'
  | 'check'
  | 'celebrate'
  | 'sparkle'
  | 'reward'
  | 'error'
  | 'unlock'

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private muted: boolean

  constructor() {
    this.muted =
      typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1'
  }

  isMuted() {
    return this.muted
  }

  setMuted(muted: boolean) {
    this.muted = muted
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0')
    } catch {
      /* ignore */
    }
    if (!muted) void this.ensure()
  }

  toggleMuted() {
    this.setMuted(!this.muted)
    return this.muted
  }

  /** Lazily build / resume the audio graph. Safe to call repeatedly. */
  private async ensure(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return false
    if (!this.ctx) {
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.5
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume()
      } catch {
        /* ignore */
      }
    }
    return this.ctx.state === 'running'
  }

  /** Call once from a user gesture to "warm up" audio for the session. */
  unlock() {
    void this.ensure()
  }

  private note(
    freq: number,
    start: number,
    duration: number,
    {
      type = 'sine',
      gain = 0.3,
      glideTo,
    }: { type?: OscillatorType; gain?: number; glideTo?: number } = {},
  ) {
    if (!this.ctx || !this.master) return
    const t0 = this.ctx.currentTime + start
    const osc = this.ctx.createOscillator()
    const env = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration)

    // Quick attack, smooth exponential decay.
    env.gain.setValueAtTime(0.0001, t0)
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

    osc.connect(env)
    env.connect(this.master)
    osc.start(t0)
    osc.stop(t0 + duration + 0.05)
  }

  async play(name: SoundName) {
    if (this.muted) return
    const ok = await this.ensure()
    if (!ok) return

    switch (name) {
      case 'tap':
        this.note(420, 0, 0.08, { type: 'sine', gain: 0.18, glideTo: 620 })
        break
      case 'check':
        // Bright two-note "ding" that pops upward.
        this.note(660, 0, 0.12, { type: 'triangle', gain: 0.25 })
        this.note(988, 0.07, 0.18, { type: 'triangle', gain: 0.28 })
        break
      case 'unlock':
        this.note(523.25, 0, 0.12, { type: 'sine', gain: 0.22 })
        this.note(659.25, 0.09, 0.14, { type: 'sine', gain: 0.22 })
        this.note(783.99, 0.18, 0.22, { type: 'sine', gain: 0.22 })
        break
      case 'reward':
        // Shimmery sparkle for requesting a reward.
        this.note(880, 0, 0.1, { type: 'sine', gain: 0.2 })
        this.note(1318.5, 0.06, 0.12, { type: 'sine', gain: 0.18 })
        this.note(1760, 0.13, 0.16, { type: 'sine', gain: 0.16 })
        break
      case 'sparkle':
        for (let i = 0; i < 5; i++) {
          this.note(1200 + i * 220, 0.04 * i, 0.1, { type: 'sine', gain: 0.12 })
        }
        break
      case 'celebrate': {
        // Triumphant ascending arpeggio + sparkle tail for finishing the day.
        const arp = [523.25, 659.25, 783.99, 1046.5, 1318.5]
        arp.forEach((f, i) => this.note(f, i * 0.09, 0.3, { type: 'triangle', gain: 0.26 }))
        for (let i = 0; i < 6; i++) {
          this.note(1568 + Math.sin(i) * 300, 0.5 + i * 0.05, 0.18, {
            type: 'sine',
            gain: 0.1,
          })
        }
        break
      }
      case 'error':
        this.note(311.13, 0, 0.14, { type: 'sawtooth', gain: 0.14, glideTo: 220 })
        break
    }
  }
}

export const sound = new SoundEngine()
