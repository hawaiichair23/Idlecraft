export type DecorType = 'cow_skull' | 'pebbles' | 'grass'

export interface DecorItem {
  x: number
  y: number
  type: DecorType
  scale: number
}

export interface BuriedItem {
  x: number
  y: number
  reward: number
}

export interface WorldLayout {
  decor: DecorItem[]
  buried: BuriedItem[]
}

// Mulberry32 — small deterministic seeded RNG.
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
  exclusions: { x: number; y: number; radius: number }[]       // wide buffer (skulls, coins)
  tightExclusions: { x: number; y: number; radius: number }[]  // plot footprint only (pebbles, grass)
}

// Densities = items per world-px², so counts scale with world size.
// Spacing = physical px between items, constant regardless of world size.
// Reference: 4608² ≈ 21.2M px².
const SKULL_DENSITY = 0.00000094     // ~20 at reference size
const SKULL_SPACING = 64
const PEBBLE_DENSITY = 0.0000094     // ~200
const PEBBLE_SPACING = 12
const GRASS_DENSITY = 0.0000094      // ~200
const GRASS_SPACING = 16
const BURIED_COIN_DENSITY = 0.000057 // ~785

const DECOR_EDGE_MARGIN_FRACTION = 0.017   // ~80px at reference size
const DECOR_SCALE = 2

// Weighted buried-coin rewards. 40 / 30 / 20 / 10.
const COIN_REWARD_TABLE: { amount: number; weight: number }[] = [
  { amount: 20, weight: 40 },
  { amount: 15, weight: 30 },
  { amount: 5,  weight: 20 },
  { amount: 50, weight: 10 },
]

function pickReward(rng: () => number): number {
  const total = COIN_REWARD_TABLE.reduce((s, e) => s + e.weight, 0)
  let r = rng() * total
  for (const e of COIN_REWARD_TABLE) {
    r -= e.weight
    if (r <= 0) return e.amount
  }
  return COIN_REWARD_TABLE[0].amount
}

const BURIED_MIN_SPACING = 32

function scatterBuried(
  out: BuriedItem[],
  rng: () => number,
  opts: GenOpts,
  count: number,
  exclusions: { x: number; y: number; radius: number }[],
) {
  const maxAttempts = count * 30
  const minSq = BURIED_MIN_SPACING * BURIED_MIN_SPACING
  const margin = opts.worldSize * DECOR_EDGE_MARGIN_FRACTION
  let attempts = 0
  let placed = 0
  while (placed < count && attempts < maxAttempts) {
    attempts++
    const x = margin + rng() * (opts.worldSize - margin * 2)
    const y = margin + rng() * (opts.worldSize - margin * 2)
    let blocked = false
    for (const ex of exclusions) {
      const dx = x - ex.x
      const dy = y - ex.y
      if (dx * dx + dy * dy < ex.radius * ex.radius) { blocked = true; break }
    }
    if (blocked) continue
    for (const b of out) {
      const dx = x - b.x
      const dy = y - b.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue
    out.push({ x: Math.floor(x), y: Math.floor(y), reward: pickReward(rng) })
    placed++
  }
}

function scatter(
  decor: DecorItem[],
  rng: () => number,
  opts: GenOpts,
  type: DecorType,
  count: number,
  exclusions: { x: number; y: number; radius: number }[],
  minSpacing: number,
) {
  const maxAttempts = count * 30
  const minSq = minSpacing * minSpacing
  const margin = opts.worldSize * DECOR_EDGE_MARGIN_FRACTION
  let attempts = 0
  let placed = 0
  while (placed < count && attempts < maxAttempts) {
    attempts++
    const x = margin + rng() * (opts.worldSize - margin * 2)
    const y = margin + rng() * (opts.worldSize - margin * 2)

    let blocked = false
    for (const ex of exclusions) {
      const dx = x - ex.x
      const dy = y - ex.y
      if (dx * dx + dy * dy < ex.radius * ex.radius) { blocked = true; break }
    }
    if (blocked) continue
    for (const d of decor) {
      if (d.type !== type) continue
      const dx = x - d.x
      const dy = y - d.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue

    decor.push({ x: Math.floor(x), y: Math.floor(y), type, scale: DECOR_SCALE })
    placed++
  }
}

// Gravel paths between named areas. Absolute world pixels.
// Wilderness → northern town (south of town up to its center).
const PATH_WILDERNESS_TO_TOWN = { sx: 2400, sy: 1504, ex: 2390, ey: 550 }

const PATH_SNAKE_AMPLITUDE = 30    // how far it wobbles side-to-side
const PATH_SNAKE_PERIOD = 600      // length of one wobble cycle
const PATH_PEBBLE_SPACING = 6      // lower = denser
const PATH_WIDTH = 14              // random scatter perpendicular to path

function buildPath(
  decor: DecorItem[],
  rng: () => number,
  startX: number, startY: number,
  endX: number, endY: number,
) {
  const dx = endX - startX
  const dy = endY - startY
  const len = Math.hypot(dx, dy)
  const tx = dx / len
  const ty = dy / len
  const nx = -ty
  const ny = tx
  const steps = Math.floor(len / PATH_PEBBLE_SPACING)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const cx = startX + dx * t
    const cy = startY + dy * t
    const snake = Math.sin((i * PATH_PEBBLE_SPACING) / PATH_SNAKE_PERIOD * Math.PI * 2) * PATH_SNAKE_AMPLITUDE
    const spread = (rng() - 0.5) * PATH_WIDTH
    const px = cx + nx * (snake + spread)
    const py = cy + ny * (snake + spread)
    decor.push({ x: Math.floor(px), y: Math.floor(py), type: 'pebbles', scale: DECOR_SCALE })
  }
}

export function generateWorld(opts: GenOpts): WorldLayout {
  const rng = makeRng(opts.seed)
  const decor: DecorItem[] = []
  const buried: BuriedItem[] = []

  const worldArea = opts.worldSize * opts.worldSize
  const skullCount = Math.floor(SKULL_DENSITY * worldArea)
  const pebbleCount = Math.floor(PEBBLE_DENSITY * worldArea)
  const grassCount = Math.floor(GRASS_DENSITY * worldArea)
  const coinCount = Math.floor(BURIED_COIN_DENSITY * worldArea)

  scatter(decor, rng, opts, 'cow_skull', skullCount, opts.exclusions, SKULL_SPACING)
  scatter(decor, rng, opts, 'pebbles', pebbleCount, opts.tightExclusions, PEBBLE_SPACING)
  scatter(decor, rng, opts, 'grass', grassCount, opts.tightExclusions, GRASS_SPACING)
  buildPath(decor, rng, PATH_WILDERNESS_TO_TOWN.sx, PATH_WILDERNESS_TO_TOWN.sy, PATH_WILDERNESS_TO_TOWN.ex, PATH_WILDERNESS_TO_TOWN.ey)
  scatterBuried(buried, rng, opts, coinCount, opts.exclusions)

  return { decor, buried }
}
