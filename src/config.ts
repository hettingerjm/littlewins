import type { ThemeKey } from './types'

/**
 * Per-child color themes. Each child stores a `theme` key (assigned at
 * provisioning); these classes drive their screens. Tailwind needs the full
 * class strings present at build time, so they're written out literally here.
 */
export interface Theme {
  /** Gradient for the big profile button. */
  profile: string
  /** Progress / accent bar background. */
  bar: string
  /** Accent text color. */
  accent: string
  /** Soft tinted background for completed rows. */
  soft: string
  /** Ring color for highlighted/done states. */
  ring: string
}

export const THEMES: Record<ThemeKey, Theme> = {
  pink: { profile: 'from-pink-400 to-pink-600 ring-pink-200', bar: 'bg-pink-500', accent: 'text-pink-600', soft: 'bg-pink-50', ring: 'ring-pink-300' },
  indigo: { profile: 'from-indigo-400 to-indigo-600 ring-indigo-200', bar: 'bg-indigo-500', accent: 'text-indigo-600', soft: 'bg-indigo-50', ring: 'ring-indigo-300' },
  emerald: { profile: 'from-emerald-400 to-emerald-600 ring-emerald-200', bar: 'bg-emerald-500', accent: 'text-emerald-600', soft: 'bg-emerald-50', ring: 'ring-emerald-300' },
  amber: { profile: 'from-amber-400 to-amber-600 ring-amber-200', bar: 'bg-amber-500', accent: 'text-amber-600', soft: 'bg-amber-50', ring: 'ring-amber-300' },
  sky: { profile: 'from-sky-400 to-sky-600 ring-sky-200', bar: 'bg-sky-500', accent: 'text-sky-600', soft: 'bg-sky-50', ring: 'ring-sky-300' },
  violet: { profile: 'from-violet-400 to-violet-600 ring-violet-200', bar: 'bg-violet-500', accent: 'text-violet-600', soft: 'bg-violet-50', ring: 'ring-violet-300' },
  rose: { profile: 'from-rose-400 to-rose-600 ring-rose-200', bar: 'bg-rose-500', accent: 'text-rose-600', soft: 'bg-rose-50', ring: 'ring-rose-300' },
  teal: { profile: 'from-teal-400 to-teal-600 ring-teal-200', bar: 'bg-teal-500', accent: 'text-teal-600', soft: 'bg-teal-50', ring: 'ring-teal-300' },
}

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[]

/** Fun, kid-friendly emoji choices for the profile customizer. */
export const KID_EMOJIS = [
  '🦄', '🌸', '🚀', '🦊', '🐱', '🐶', '🐢', '🐯',
  '🦁', '🐼', '🦋', '🐝', '🐙', '🦕', '🦖', '🐉',
  '⚽', '🏀', '🎸', '🎹', '🎨', '⭐', '🌈', '🍕',
  '🍦', '🦔', '🐨', '🦒', '🐬', '🦩', '👑', '🔥',
]

export function getTheme(key: ThemeKey): Theme {
  return THEMES[key] ?? THEMES.indigo
}
