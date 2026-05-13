// World generation. Seeded so layout is stable across reloads.
// Anything procedurally placed in the world lives here.

export type DecorType = 'cow_skull'

export interface DecorItem {
  x: number
  y: number
  type: DecorType
  scale: number
}

export interface WorldLayout {
  decor: DecorItem[]
  // future: trees, rocks, fields, biome tiles, etc.
}

// Mulberry32 — small, fast, deterministic seeded RNG.
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface GenOpts {
  seed: number
  worldSize: number
  // areas to keep clear (plots, structures, spawn point, etc.)
  exclusions: { x: number; y: number; radius: number }[]
}

const DECOR_COUNT = 20
const DECOR_EDGE_MARGIN = 80
const DECOR_SCALE = 2

export function generateWorld(opts: GenOpts): WorldLayout {
  const rng = makeRng(opts.seed)
  const decor: DecorItem[] = []
  const maxAttempts = DECOR_COUNT * 30

  let attempts = 0
  while (decor.length < DECOR_COUNT && attempts < maxAttempts) {
    attempts++
    const x = DECOR_EDGE_MARGIN + rng() * (opts.worldSize - DECOR_EDGE_MARGIN * 2)
    const y = DECOR_EDGE_MARGIN + rng() * (opts.worldSize - DECOR_EDGE_MARGIN * 2)

    // skip if too close to any exclusion zone
    let blocked = false
    for (const ex of opts.exclusions) {
      const dx = x - ex.x
      const dy = y - ex.y
      if (dx * dx + dy * dy < ex.radius * ex.radius) { blocked = true; break }
    }
    if (blocked) continue

    decor.push({ x: Math.floor(x), y: Math.floor(y), type: 'cow_skull', scale: DECOR_SCALE })
  }

  return { decor }
}
