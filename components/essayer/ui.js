// Shared Tailwind class strings for /essayer, following the design system:
// violet for actions, radius-xl (12px) buttons, 2px violet focus outline 2px out,
// colour transitions only, switched off under prefers-reduced-motion.

export const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet'

const BASE =
  `inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium
   transition-colors duration-150 motion-reduce:transition-none disabled:opacity-60 ${FOCUS}`

export const BUTTON_PRIMARY = `${BASE} bg-violet text-white hover:bg-violet-dark`

export const BUTTON_SECONDARY = `${BASE} border border-gray-200 bg-white text-violet hover:border-violet hover:bg-violet-light`

export const BUTTON_DANGER = `${BASE} bg-red-700 text-white hover:bg-red-800`

export const BUTTON_DANGER_OUTLINE = `${BASE} border border-gray-200 bg-white text-red-700 hover:border-red-700 hover:bg-red-50`

export const LINK = `rounded text-violet underline underline-offset-2 hover:text-violet-dark ${FOCUS}`
