// Chip-dot colors — every tech chip carries a colored dot drawn from the /bp/
// "phoneme palette" (green / lime / coral / magenta / violet), echoing Word
// Wiz's color-coded sound feedback. See Portfolio Website/design-system/HANDOFF.md
// §2: "colored dot ties tech → a phoneme."
//
// Known tools get a fixed, intentional color so the same tech reads the same
// everywhere. Anything unlisted (archive combo-tags, year pills, award labels)
// falls back to a deterministic hash pick, so the rail of chips always lands as
// a thematic mix rather than a wall of green.

// The full palette, in display order. `accent` is the phosphor green primary.
export const CHIP_PALETTE = ['bg-accent', 'bg-lime', 'bg-coral', 'bg-magenta', 'bg-violet']

// Raw hex for the same palette, for the canvas-drawn cards in the 3D scene
// (which can't use Tailwind classes). Keyed by the class names above.
export const CHIP_HEX = {
  'bg-accent': '#57d36a',
  'bg-lime': '#c7ee5e',
  'bg-coral': '#ec9576',
  'bg-magenta': '#e63b6d',
  'bg-violet': '#9b8cff',
}

// Intentional assignments for the recurring tools across the work.
const CHIP_DOT = {
  // languages
  Java: 'bg-accent',
  Python: 'bg-lime',
  TypeScript: 'bg-coral',
  JS: 'bg-lime',
  'C#': 'bg-magenta',

  // frameworks / runtimes
  React: 'bg-violet',
  FastAPI: 'bg-coral',
  Vite: 'bg-violet',
  Tailwind: 'bg-coral',
  WPILib: 'bg-violet',
  Unity: 'bg-magenta',

  // ml / vision
  PyTorch: 'bg-magenta',
  OpenCV: 'bg-lime',
  TF: 'bg-lime',
  AdvantageKit: 'bg-coral',
  'GPT-4o': 'bg-violet',
  Gemini: 'bg-violet',

  // infra / data
  AWS: 'bg-coral',
  MySQL: 'bg-lime',
  Firebase: 'bg-coral',
  Supabase: 'bg-accent',
  ESP32: 'bg-magenta',
  Blender: 'bg-coral',

  // misc
  'Physics sim': 'bg-violet',
}

// Stable string hash → palette index, so unlisted labels keep a consistent
// (and varied) color across renders.
function hashIndex(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(h) % CHIP_PALETTE.length
}

// Resolve a chip label to its dot color class. Multi-token archive tags (e.g.
// "React · Firebase") key off their first recognizable token before falling
// back to the hash so the leading tech still drives the color.
export function chipDot(label) {
  if (!label) return 'bg-accent'
  if (CHIP_DOT[label]) return CHIP_DOT[label]

  const first = label.split('·')[0].trim()
  if (CHIP_DOT[first]) return CHIP_DOT[first]

  return CHIP_PALETTE[hashIndex(label)]
}

// Same resolution as chipDot(), but returns a raw hex string for canvas drawing.
export function chipDotHex(label) {
  return CHIP_HEX[chipDot(label)]
}
