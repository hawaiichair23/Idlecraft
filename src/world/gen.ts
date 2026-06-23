import { pointToPolylineDist } from './geometry'

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

export interface BuriedGem {
  x: number
  y: number
  type: string
}

// Buried lockbox: a silver or gold lockbox in the ground. The contents are
// rolled at world-gen time (seeded), so the same world always yields the same
// prizes from the same box. Slots 0-2 are tool slots (up to 3 tools, no
// repeats within a box); slots 3+ are side-loot (bars, gems, ammo, materials),
// each rolled independently from the matching tier table. Any slot may be
// null/empty. Dug up via the shovel; the resulting placed lockbox carries
// this contents preloaded into a locked box.
export interface BuriedLockbox {
  x: number
  y: number
  lockboxType: 'silver_lockbox' | 'gold_lockbox'
  tools: (string | null)[]                                 // length 3
  side: ({ type: string; count: number } | null)[]         // length 9 (slots 3..11)
}

// Buried key: a silver or gold key in the ground. Same density as lockboxes,
// same gold/silver split — so finding a matched pair (key + box of same tier)
// is the proper jackpot. Dug up via the shovel.
export interface BuriedKey {
  x: number
  y: number
  keyType: 'silver_key' | 'gold_key'
}

export interface RockFormation {
  x: number
  y: number
}

export interface WorldLayout {
  decor: DecorItem[]
  buried: BuriedItem[]
  buriedGems: BuriedGem[]
  buriedLockboxes: BuriedLockbox[]
  buriedKeys: BuriedKey[]
  rocks: RockFormation[]
}

// Mulberry32 — small deterministic seeded RNG.
export function makeRng(seed: number) {
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

// A rectangle in world pixels to scatter within. scatter() places items inside
// this; the full world is just one big rect, a grown strip is a smaller one.
export interface GenRect {
  x: number
  y: number
  w: number
  h: number
}

const SKULL_DENSITY = 0.00000064    
const SKULL_SPACING = 64
const PEBBLE_DENSITY = 0.0000094    
const PEBBLE_SPACING = 12
const GRASS_DENSITY = 0.0000094     
const GRASS_SPACING = 16
const BURIED_COIN_DENSITY = 0.0000655  

const SCATTER_TUNING: Record<DecorType, { density: number; spacing: number }> = {
  cow_skull: { density: SKULL_DENSITY, spacing: SKULL_SPACING },
  pebbles:   { density: PEBBLE_DENSITY, spacing: PEBBLE_SPACING },
  grass:     { density: GRASS_DENSITY, spacing: GRASS_SPACING },
}

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

// Buried gem frequency, independent of coins. Weighted common→rare.
const BURIED_GEM_DENSITY = 0.00002375
// Buried lockbox frequency. Rarer than gems — these are the prize containers.
const BURIED_LOCKBOX_DENSITY = 0.0000045
// Chance a buried lockbox is GOLD vs silver. Gold is the rarer, bigger prize.
const LOCKBOX_GOLD_CHANCE = 0.25
// Tool pools inlined here (not imported from lootTables) to avoid a circular
// import — gen.ts is upstream of lootTables.ts. Kept in sync with that file.
const SILVER_LOCKBOX_POOL: string[] = ['double_jack', 'paul_bunyan']
const GOLD_LOCKBOX_POOL: string[] = ['toledo_pick', 'wild_bill', 'damascus_pick', 'greedy']
// Same fall-through rule as lootTables.rollLockboxContents.
const GOLD_PRIMARY_CHANCE = 0.7
// Per-slot chance a tool slot in a lockbox rolls empty. Slots 0 and 1 use
// LOCKBOX_SLOT_EMPTY_CHANCE (generous — most boxes give two tools). Slot 2 uses
// LOCKBOX_THIRD_SLOT_EMPTY_CHANCE, which is higher, so a third tool is the
// rarer jackpot rather than scaling with the other two.
const LOCKBOX_SLOT_EMPTY_CHANCE = 0.35
const LOCKBOX_THIRD_SLOT_EMPTY_CHANCE = 0.6
const LOCKBOX_TOOL_SLOTS = 3
// Tool kind classification — used by the roll to bias subsequent slots toward
// the kind not already in the box, so "two of the same kind" is rarer than
// "one of each kind" when a lockbox gives multiple tools.
const TOOL_KIND: Record<string, 'pick' | 'axe'> = {
  double_jack: 'pick',
  toledo_pick: 'pick',
  damascus_pick: 'pick',
  greedy: 'pick',
  paul_bunyan: 'axe',
  wild_bill: 'axe',
}
// Weight applied to candidates whose kind is OPPOSITE to a kind already in the
// box. Same-kind candidates keep weight 1. So with one pick already in the
// box, an axe candidate is 3x as likely to be picked as another pick of equal
// pool standing. Doesn't forbid two-of-a-kind, just makes it less common.
const OPPOSITE_KIND_BIAS = 3

// Side-loot tables for the slots AFTER the 3 tool slots. Each remaining slot
// rolls independently with a per-slot empty chance; non-empty slots draw a
// weighted item from the matching tier table. Gold gets the richer table.
const LOCKBOX_SIDE_EMPTY_CHANCE = 0.05

interface LockboxLootEntry {
  type: string   // ItemType key
  min: number
  max: number
  weight: number
}

const SILVER_SIDE_TABLE: LockboxLootEntry[] = [
  // bars dominate — every box should show multiple types
  { type: 'iron_bar',   min: 3, max: 8, weight: 30 },
  { type: 'copper_bar', min: 2, max: 6, weight: 25 },
  // building materials — the cozy-builder staples, a real reason to crack a box
  { type: 'wood',       min: 4, max: 10, weight: 10 },
  { type: 'clay',       min: 3, max: 8, weight: 6 },
  { type: 'flagstone',  min: 2, max: 6, weight: 2 },
  { type: 'sandstone',  min: 2, max: 6, weight: 2 },
  // utility / consumables
  { type: 'colt_ammo',  min: 5, max: 15, weight: 7 },
  { type: 'rope',       min: 1, max: 3, weight: 6 },
  { type: 'leather',    min: 3, max: 8, weight: 6 },
  { type: 'canvas',     min: 1, max: 3, weight: 4 },
  { type: 'wheel',      min: 1, max: 2, weight: 3 },
  { type: 'quirt',      min: 1, max: 1, weight: 2 },
  { type: 'tart',       min: 1, max: 2, weight: 3 },
  { type: 'kolache',    min: 1, max: 2, weight: 3 },
  { type: 'snake_oil',  min: 1, max: 1, weight: 10 },
  // common gems
  { type: 'gem_agate',      min: 1, max: 1, weight: 6 },
  { type: 'gem_chalcedony', min: 1, max: 1, weight: 4 },
  { type: 'gem_turquoise',  min: 1, max: 1, weight: 4 },
]

const GOLD_SIDE_TABLE: LockboxLootEntry[] = [
  // bars dominate — every box should show multiple types
  { type: 'silver_bar', min: 3, max: 6, weight: 28 },
  { type: 'gold_bar',   min: 2, max: 4, weight: 22 },
  { type: 'iron_bar',   min: 4, max: 8, weight: 20 },
  { type: 'copper_bar', min: 3, max: 6, weight: 18 },
  // building materials in bigger stacks — cozy-builder payday
  { type: 'wood',       min: 6, max: 14, weight: 8 },
  { type: 'flagstone',  min: 4, max: 10, weight: 2 },
  { type: 'sandstone',  min: 4, max: 10, weight: 2 },
  { type: 'clay',       min: 5, max: 12, weight: 5 },
  // storage upgrades — the headline-grade utility drops
  { type: 'medium_bag', min: 1, max: 1, weight: 3 },
  { type: 'sack',       min: 1, max: 1, weight: 2 },
  // utility / consumables
  { type: 'colt_ammo',  min: 10, max: 25, weight: 5 },
  { type: 'rope',       min: 2, max: 4, weight: 4 },
  { type: 'leather',    min: 5, max: 12, weight: 4 },
  { type: 'canvas',     min: 2, max: 5, weight: 3 },
  { type: 'wheel',      min: 2, max: 3, weight: 2 },
  { type: 'quirt',      min: 1, max: 1, weight: 2 },
  { type: 'tart',       min: 1, max: 3, weight: 2 },
  { type: 'snake_oil',  min: 1, max: 2, weight: 12 },
  { type: 'kolache',    min: 1, max: 2, weight: 2 },
  // gems
  { type: 'gem_topaz',     min: 1, max: 1, weight: 8 },
  { type: 'gem_amethyst',  min: 1, max: 1, weight: 6 },
  { type: 'gem_diamond',   min: 1, max: 1, weight: 3 },
  { type: 'gem_ruby',      min: 1, max: 1, weight: 3 },
]

function rollLockboxSide(rng: () => number, table: LockboxLootEntry[]): { type: string; count: number } {
  const total = table.reduce((s, e) => s + e.weight, 0)
  let t = rng() * total
  for (const e of table) {
    t -= e.weight
    if (t <= 0) {
      const span = e.max - e.min
      const count = e.min + Math.floor(rng() * (span + 1))
      return { type: e.type, count }
    }
  }
  const last = table[table.length - 1]
  return { type: last.type, count: last.min }
}

// Roll the side-loot array for a lockbox. 9 slots, each rolls independently:
// chance empty, otherwise a weighted draw from the tier table.
export function rollLockboxSideSlots(rng: () => number, lockboxType: 'silver_lockbox' | 'gold_lockbox'): ({ type: string; count: number } | null)[] {
  const table = lockboxType === 'gold_lockbox' ? GOLD_SIDE_TABLE : SILVER_SIDE_TABLE
  const out: ({ type: string; count: number } | null)[] = []
  for (let i = 0; i < 9; i++) {
    if (rng() < LOCKBOX_SIDE_EMPTY_CHANCE) { out.push(null); continue }
    out.push(rollLockboxSide(rng, table))
  }
  return out
}

// Roll the tool array for a lockbox. 3 slots, each independent: chance empty,
// otherwise a tool from the appropriate pool — but no tool already in this box
// can be rolled again (no repeats within a box).
export function rollLockboxTools(rng: () => number, lockboxType: 'silver_lockbox' | 'gold_lockbox'): (string | null)[] {
  const tools: (string | null)[] = []
  for (let i = 0; i < LOCKBOX_TOOL_SLOTS; i++) {
    const emptyChance = i === 2 ? LOCKBOX_THIRD_SLOT_EMPTY_CHANCE : LOCKBOX_SLOT_EMPTY_CHANCE
    if (rng() < emptyChance) { tools.push(null); continue }
    // pick pool
    let pool: string[]
    if (lockboxType === 'gold_lockbox') {
      pool = rng() < GOLD_PRIMARY_CHANCE ? GOLD_LOCKBOX_POOL : SILVER_LOCKBOX_POOL
    } else {
      pool = SILVER_LOCKBOX_POOL
    }
    // remove tools already in this box from the candidate list
    const candidates = pool.filter(t => !tools.includes(t))
    if (candidates.length === 0) { tools.push(null); continue }
    // Kind bias: weight candidates whose kind is opposite to any kind already
    // in the box. So if a pick is already in, axe candidates get higher weight
    // (but picks are still possible — just less likely).
    const presentKinds = new Set(tools.filter((t): t is string => !!t).map(t => TOOL_KIND[t]))
    const weights = candidates.map(c => {
      const kind = TOOL_KIND[c]
      // opposite kind = the box has the other kind already → boost this one
      const opposite = kind === 'pick' ? presentKinds.has('axe') : presentKinds.has('pick')
      return opposite ? OPPOSITE_KIND_BIAS : 1
    })
    const total = weights.reduce((s, w) => s + w, 0)
    let r = rng() * total
    let chosen = candidates[candidates.length - 1]
    for (let k = 0; k < candidates.length; k++) {
      r -= weights[k]
      if (r <= 0) { chosen = candidates[k]; break }
    }
    tools.push(chosen)
  }
  return tools
}
const GEM_RARITY_TABLE: { type: string; weight: number }[] = [
  { type: 'gem_agate',      weight: 30 },
  { type: 'gem_chalcedony', weight: 24 },
  { type: 'gem_turquoise',  weight: 18 },
  { type: 'gem_topaz',      weight: 13 },
  { type: 'gem_amethyst',   weight: 9 },
  { type: 'gem_ruby',       weight: 4 },
  { type: 'gem_diamond',    weight: 2 },
]

function pickGem(rng: () => number): string {
  const total = GEM_RARITY_TABLE.reduce((s, e) => s + e.weight, 0)
  let r = rng() * total
  for (const e of GEM_RARITY_TABLE) {
    r -= e.weight
    if (r <= 0) return e.type
  }
  return GEM_RARITY_TABLE[0].type
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

function scatterBuriedGems(
  out: BuriedGem[],
  rng: () => number,
  opts: GenOpts,
  count: number,
  exclusions: { x: number; y: number; radius: number }[],
  avoid: BuriedItem[],
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
    for (const b of avoid) {
      const dx = x - b.x
      const dy = y - b.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue
    for (const g of out) {
      const dx = x - g.x
      const dy = y - g.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue
    out.push({ x: Math.floor(x), y: Math.floor(y), type: pickGem(rng) })
    placed++
  }
}

// Scatter buried lockboxes — same shape as scatterBuriedGems, but each carries
// a pre-rolled tool reward sealed into the world by the seed. Silver vs gold
// is rolled per box; the tool inside is rolled from the matching pool.
function scatterBuriedLockboxes(
  out: BuriedLockbox[],
  rng: () => number,
  opts: GenOpts,
  count: number,
  exclusions: { x: number; y: number; radius: number }[],
  avoid: BuriedItem[],
  avoidGems: BuriedGem[],
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
    for (const b of avoid) {
      const dx = x - b.x
      const dy = y - b.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue
    for (const g of avoidGems) {
      const dx = x - g.x
      const dy = y - g.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue
    for (const lb of out) {
      const dx = x - lb.x
      const dy = y - lb.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue
    const isGold = rng() < LOCKBOX_GOLD_CHANCE
    const lockboxType: 'silver_lockbox' | 'gold_lockbox' = isGold ? 'gold_lockbox' : 'silver_lockbox'
    const tools = rollLockboxTools(rng, lockboxType)
    const side = rollLockboxSideSlots(rng, lockboxType)
    out.push({ x: Math.floor(x), y: Math.floor(y), lockboxType, tools, side })
    placed++
  }
}

// Scatter buried keys — same shape as the lockbox scatter, same density and
// gold/silver split rate. A buried key is just a key item in the ground; dug
// up, it drops as the corresponding key ItemType.
function scatterBuriedKeys(
  out: BuriedKey[],
  rng: () => number,
  opts: GenOpts,
  count: number,
  exclusions: { x: number; y: number; radius: number }[],
  avoid: BuriedItem[],
  avoidGems: BuriedGem[],
  avoidLockboxes: BuriedLockbox[],
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
    for (const b of avoid) {
      const dx = x - b.x
      const dy = y - b.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue
    for (const g of avoidGems) {
      const dx = x - g.x
      const dy = y - g.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue
    for (const lb of avoidLockboxes) {
      const dx = x - lb.x
      const dy = y - lb.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue
    for (const k of out) {
      const dx = x - k.x
      const dy = y - k.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue
    const isGold = rng() < LOCKBOX_GOLD_CHANCE
    const keyType: 'silver_key' | 'gold_key' = isGold ? 'gold_key' : 'silver_key'
    out.push({ x: Math.floor(x), y: Math.floor(y), keyType })
    placed++
  }
}

function scatter(
  decor: DecorItem[],
  rng: () => number,
  area: GenRect,
  type: DecorType,
  count: number,
  exclusions: { x: number; y: number; radius: number }[],
  minSpacing: number,
) {
  const maxAttempts = count * 30
  const minSq = minSpacing * minSpacing
  let attempts = 0
  let placed = 0
  while (placed < count && attempts < maxAttempts) {
    attempts++
    const x = area.x + rng() * area.w
    const y = area.y + rng() * area.h

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

const PATH_DRIFT_STEP = 1.5        // random walk step size per pebble — how much the trail wanders
const PATH_DRIFT_DECAY = 0.995     // pull back toward center each step — keeps it near the straight line
const PATH_SNAKE_AMPLITUDE = 30    // sine wobble for the wilderness path (opt-in via buildPath arg)
const PATH_SNAKE_PERIOD = 600      // length of one wobble cycle
const PATH_PEBBLE_SPACING = 6      // lower = denser
const PATH_CENTERLINE_SAMPLE = 20  // emit one centerline point every N pebbles
const PATH_WIDTH = 14              // random scatter perpendicular to path
const PATH_VISUAL_OFFSET = 20      // shift stored centerline north so it matches where pebbles visually read

const ROCK_HEAPS_PER_CLUSTER = 8
const ROCK_CLUSTER_RADIUS = 600
const ROCK_HEAP_SPACING = 160
const ROCK_CLUSTER_MIN_Y_FRAC = 0.4

function scatterRockCluster(
  out: RockFormation[],
  rng: () => number,
  opts: GenOpts,
  exclusions: { x: number; y: number; radius: number }[],
) {
  const margin = opts.worldSize * DECOR_EDGE_MARGIN_FRACTION

  // roll a cluster center clear of exclusions (e.g. town); cap attempts
  let cx = 0, cy = 0
  let centerOk = false
  for (let i = 0; i < 60 && !centerOk; i++) {
    cx = margin + ROCK_CLUSTER_RADIUS + rng() * (opts.worldSize - (margin + ROCK_CLUSTER_RADIUS) * 2)
    // clamp to southern band — north is low Y (town), rocks belong further south
    const minY = opts.worldSize * ROCK_CLUSTER_MIN_Y_FRAC
    const yLow = Math.max(margin + ROCK_CLUSTER_RADIUS, minY)
    cy = yLow + rng() * (opts.worldSize - margin - ROCK_CLUSTER_RADIUS - yLow)
    centerOk = true
    for (const ex of exclusions) {
      const dx = cx - ex.x
      const dy = cy - ex.y
      // keep the whole cluster footprint clear of the exclusion, not just its center
      const clear = ex.radius + ROCK_CLUSTER_RADIUS
      if (dx * dx + dy * dy < clear * clear) { centerOk = false; break }
    }
  }
  if (!centerOk) return   // couldn't find a clear center; skip rocks this world

  const minSq = ROCK_HEAP_SPACING * ROCK_HEAP_SPACING
  const maxAttempts = ROCK_HEAPS_PER_CLUSTER * 30
  let attempts = 0
  let placed = 0
  while (placed < ROCK_HEAPS_PER_CLUSTER && attempts < maxAttempts) {
    attempts++
    const angle = rng() * Math.PI * 2
    const dist = ROCK_CLUSTER_RADIUS * Math.sqrt(rng())
    const x = cx + Math.cos(angle) * dist
    const y = cy + Math.sin(angle) * dist

    let blocked = false
    for (const ex of exclusions) {
      const dx = x - ex.x
      const dy = y - ex.y
      if (dx * dx + dy * dy < ex.radius * ex.radius) { blocked = true; break }
    }
    if (blocked) continue
    for (const r of out) {
      const dx = x - r.x
      const dy = y - r.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue

    out.push({ x: Math.floor(x), y: Math.floor(y) })
    placed++
  }
}

function buildPath(
  decor: DecorItem[],
  rng: () => number,
  startX: number, startY: number,
  endX: number, endY: number,
  snakeAmplitude = 0,   // 0 = random-walk only (trail). >0 = sine snake (wilderness path).
  centerline?: { x: number; y: number }[],   // optional: sampled drifted center, for clearance checks
) {
  const dx = endX - startX
  const dy = endY - startY
  const len = Math.hypot(dx, dy)
  const tx = dx / len
  const ty = dy / len
  const nx = -ty
  const ny = tx
  const steps = Math.floor(len / PATH_PEBBLE_SPACING)
  let drift = 0
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const cx = startX + dx * t
    const cy = startY + dy * t
    const snake = snakeAmplitude === 0
      ? 0
      : Math.sin((i * PATH_PEBBLE_SPACING) / PATH_SNAKE_PERIOD * Math.PI * 2) * snakeAmplitude
    drift += (rng() - 0.5) * PATH_DRIFT_STEP
    drift *= PATH_DRIFT_DECAY
    const spread = (rng() - 0.5) * PATH_WIDTH
    const px = cx + nx * (snake + drift + spread)
    const py = cy + ny * (snake + drift + spread)
    decor.push({ x: Math.floor(px), y: Math.floor(py), type: 'pebbles', scale: DECOR_SCALE })
    if (centerline && i % PATH_CENTERLINE_SAMPLE === 0) {
      centerline.push({ x: cx + nx * (snake + drift), y: cy + ny * (snake + drift) - PATH_VISUAL_OFFSET })
    }
  }
}

export function generateWorld(opts: GenOpts): WorldLayout {
  const rng = makeRng(opts.seed)
  const decor: DecorItem[] = []
  const buried: BuriedItem[] = []
  const buriedGems: BuriedGem[] = []
  const rocks: RockFormation[] = []

  const worldArea = opts.worldSize * opts.worldSize
  const skullCount = Math.floor(SKULL_DENSITY * worldArea)
  const pebbleCount = Math.floor(PEBBLE_DENSITY * worldArea)
  const grassCount = Math.floor(GRASS_DENSITY * worldArea)
  const coinCount = Math.floor(BURIED_COIN_DENSITY * worldArea)
  const gemCount = Math.floor(BURIED_GEM_DENSITY * worldArea)

  const margin = opts.worldSize * DECOR_EDGE_MARGIN_FRACTION
  const fullArea: GenRect = { x: margin, y: margin, w: opts.worldSize - margin * 2, h: opts.worldSize - margin * 2 }

  scatter(decor, rng, fullArea, 'cow_skull', skullCount, opts.exclusions, SKULL_SPACING)
  scatter(decor, rng, fullArea, 'pebbles', pebbleCount, opts.tightExclusions, PEBBLE_SPACING)
  scatter(decor, rng, fullArea, 'grass', grassCount, opts.tightExclusions, GRASS_SPACING)
  buildPath(decor, rng, PATH_WILDERNESS_TO_TOWN.sx, PATH_WILDERNESS_TO_TOWN.sy, PATH_WILDERNESS_TO_TOWN.ex, PATH_WILDERNESS_TO_TOWN.ey, PATH_SNAKE_AMPLITUDE)
  scatterBuried(buried, rng, opts, coinCount, opts.exclusions)
  scatterBuriedGems(buriedGems, rng, opts, gemCount, opts.exclusions, buried)
  const buriedLockboxes: BuriedLockbox[] = []
  const lockboxCount = Math.floor(BURIED_LOCKBOX_DENSITY * worldArea)
  scatterBuriedLockboxes(buriedLockboxes, rng, opts, lockboxCount, opts.exclusions, buried, buriedGems)
  const buriedKeys: BuriedKey[] = []
  // Keys use the same density as lockboxes so they scale together — a world
  // with N lockboxes has roughly N keys, with the same gold/silver split.
  const keyCount = Math.floor(BURIED_LOCKBOX_DENSITY * worldArea)
  scatterBuriedKeys(buriedKeys, rng, opts, keyCount, opts.exclusions, buried, buriedGems, buriedLockboxes)
  scatterRockCluster(rocks, rng, opts, opts.exclusions)

  return { decor, buried, buriedGems, buriedLockboxes, buriedKeys, rocks }
}

// Scatter decor into a sub-rectangle of the world at the SAME per-area densities
// as the full-world pass — used to populate newly-grown land (e.g. a west strip)
// without disturbing existing content.
export function generateRegionDecor(
  region: GenRect,
  seed: number,
  types: DecorType[],
  exclusions: { x: number; y: number; radius: number }[] = [],
): DecorItem[] {
  const rng = makeRng(seed)
  const decor: DecorItem[] = []
  const area = region.w * region.h
  for (const type of types) {
    const tuning = SCATTER_TUNING[type]
    const count = Math.floor(tuning.density * area)
    scatter(decor, rng, region, type, count, exclusions, tuning.spacing)
  }
  return decor
}

// Scatter buried coins and gems into an arbitrary region rect (world-pixel
// coords, may be negative). Used to fill grown world strips at the same
// densities as the original world, so treasure exists everywhere — not just
// the original spawn box.
export function generateRegionBuried(
  region: GenRect,
  seed: number,
  exclusions: { x: number; y: number; radius: number }[] = [],
): { buried: BuriedItem[]; buriedGems: BuriedGem[]; buriedLockboxes: BuriedLockbox[]; buriedKeys: BuriedKey[] } {
  const rng = makeRng(seed)
  const buried: BuriedItem[] = []
  const buriedGems: BuriedGem[] = []
  const buriedLockboxes: BuriedLockbox[] = []
  const buriedKeys: BuriedKey[] = []
  const area = region.w * region.h
  const coinCount = Math.floor(BURIED_COIN_DENSITY * area)
  const gemCount = Math.floor(BURIED_GEM_DENSITY * area)
  const lockboxCount = Math.floor(BURIED_LOCKBOX_DENSITY * area)
  const keyCount = Math.floor(BURIED_LOCKBOX_DENSITY * area)
  const minSq = BURIED_MIN_SPACING * BURIED_MIN_SPACING

  // Spatial hash so spacing checks stay O(1) per placement instead of O(n).
  // Cell size = spacing, so a point only conflicts with items in its own and
  // the 8 neighbouring cells.
  const cell = BURIED_MIN_SPACING
  const cols = Math.max(1, Math.ceil(region.w / cell))
  const grid = new Map<number, { x: number; y: number }[]>()
  const keyOf = (cx: number, cy: number) => cy * cols + cx

  const conflicts = (x: number, y: number): boolean => {
    const cx = Math.floor((x - region.x) / cell)
    const cy = Math.floor((y - region.y) / cell)
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const bucket = grid.get(keyOf(gx, gy))
        if (!bucket) continue
        for (const o of bucket) {
          const dx = x - o.x, dy = y - o.y
          if (dx * dx + dy * dy < minSq) return true
        }
      }
    }
    return false
  }
  const addToGrid = (x: number, y: number) => {
    const cx = Math.floor((x - region.x) / cell)
    const cy = Math.floor((y - region.y) / cell)
    const k = keyOf(cx, cy)
    let bucket = grid.get(k)
    if (!bucket) { bucket = []; grid.set(k, bucket) }
    bucket.push({ x, y })
  }

  const place = (maxItems: number, kind: 'coin' | 'gem' | 'lockbox' | 'key') => {
    let attempts = 0
    let placed = 0
    const maxAttempts = maxItems * 30
    while (placed < maxItems && attempts < maxAttempts) {
      attempts++
      const x = region.x + rng() * region.w
      const y = region.y + rng() * region.h
      let blocked = false
      for (const ex of exclusions) {
        const dx = x - ex.x, dy = y - ex.y
        if (dx * dx + dy * dy < ex.radius * ex.radius) { blocked = true; break }
      }
      if (blocked) continue
      if (conflicts(x, y)) continue
      const fx = Math.floor(x), fy = Math.floor(y)
      if (kind === 'gem') buriedGems.push({ x: fx, y: fy, type: pickGem(rng) })
      else if (kind === 'lockbox') {
        const isGold = rng() < LOCKBOX_GOLD_CHANCE
        const lockboxType: 'silver_lockbox' | 'gold_lockbox' = isGold ? 'gold_lockbox' : 'silver_lockbox'
        const tools = rollLockboxTools(rng, lockboxType)
        const side = rollLockboxSideSlots(rng, lockboxType)
        buriedLockboxes.push({ x: fx, y: fy, lockboxType, tools, side })
      }
      else if (kind === 'key') {
        const isGold = rng() < LOCKBOX_GOLD_CHANCE
        const keyType: 'silver_key' | 'gold_key' = isGold ? 'gold_key' : 'silver_key'
        buriedKeys.push({ x: fx, y: fy, keyType })
      }
      else buried.push({ x: fx, y: fy, reward: pickReward(rng) })
      addToGrid(x, y)
      placed++
    }
  }

  place(coinCount, 'coin')
  place(gemCount, 'gem')
  place(lockboxCount, 'lockbox')
  place(keyCount, 'key')
  return { buried, buriedGems, buriedLockboxes, buriedKeys }
}

// Build a pebble trail through a sequence of waypoints. Runs the existing
// buildPath snaking-pebble logic between each consecutive pair
export function buildTrail(
  waypoints: { x: number; y: number }[],
  seed: number,
): { decor: DecorItem[]; centerline: { x: number; y: number }[] } {
  const rng = makeRng(seed)
  const decor: DecorItem[] = []
  const centerline: { x: number; y: number }[] = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]
    const b = waypoints[i + 1]
    buildPath(decor, rng, a.x, a.y, b.x, b.y, 0, centerline)
  }
  return { decor, centerline }
}


const TREE_DENSITY = 0.00000016
const TREE_TRAIL_BUMP = 0.82         // extra keep-chance at the trail line itself
const TREE_BUMP_FALLOFF = 800        // px from the trail where the bump decays to ~1/e
// Per-candidate falloff jitter
const TREE_FALLOFF_JITTER_MIN = 0.4
const TREE_FALLOFF_JITTER_MAX = 1.8
const TREE_BASELINE_KEEP = 0.5       // keep-chance for a candidate far from the trail

// Scatter wild trees across the whole world, weighted toward a trail.
export function scatterTrailTrees(
  waypoints: { x: number; y: number }[],
  bounds: GenRect,
  seed: number,
  clearance: number,
  minSpacing: number,
): { x: number; y: number }[] {
  const rng = makeRng(seed)
  const out: { x: number; y: number }[] = []
  const minSq = minSpacing * minSpacing
  // Candidate count from density. Divide by the baseline keep-chance so the
  // EXPECTED kept count matches density × area despite rejections.
  const area = bounds.w * bounds.h
  const candidateCount = Math.floor((TREE_DENSITY * area) / TREE_BASELINE_KEEP)

  for (let i = 0; i < candidateCount; i++) {
    const x = bounds.x + rng() * bounds.w
    const y = bounds.y + rng() * bounds.h

    const trailDist = pointToPolylineDist(x, y, waypoints)
    if (trailDist < clearance) continue   // never on the path

    // Per-tree falloff jitter
    const jitterFalloff = TREE_BUMP_FALLOFF * (TREE_FALLOFF_JITTER_MIN + rng() * (TREE_FALLOFF_JITTER_MAX - TREE_FALLOFF_JITTER_MIN))
    const bump = TREE_TRAIL_BUMP * Math.exp(-(trailDist * trailDist) / (jitterFalloff * jitterFalloff))
    const keepProb = Math.min(1, TREE_BASELINE_KEEP + bump)
    if (rng() > keepProb) continue

    let blocked = false
    for (const t of out) {
      const dx = x - t.x
      const dy = y - t.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue

    out.push({ x: Math.floor(x), y: Math.floor(y) })
  }
  return out
}

// Herd site tuning.
const HERD_FIRST_HALF_FRAC = 0.5   // herd X is chosen within the first this-much of the trail's X span
const HERD_X_MARGIN = 1500         // keep the site this far from the very start/midpoint, so it's not jammed at an end
const HERD_OFFSET_MIN = 120        // perpendicular distance from the trail line — far enough off the path...
const HERD_OFFSET_MAX = 260        // ...but close enough to stay visible from it

// Interpolate the trail's Y at a given X by finding the waypoint segment that
// brackets X and lerping. Assumes waypoints are monotonic-ish in X (the trail
// runs east→west). Falls back to the nearest endpoint's Y outside the range.
function trailYAtX(waypoints: { x: number; y: number }[], x: number): number {
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]
    const b = waypoints[i + 1]
    const loX = Math.min(a.x, b.x)
    const hiX = Math.max(a.x, b.x)
    if (x >= loX && x <= hiX) {
      const span = b.x - a.x
      if (Math.abs(span) < 0.0001) return a.y
      const t = (x - a.x) / span
      return a.y + (b.y - a.y) * t
    }
  }
  // outside the polyline's X range — clamp to whichever end is nearer
  return Math.abs(x - waypoints[0].x) < Math.abs(x - waypoints[waypoints.length - 1].x)
    ? waypoints[0].y
    : waypoints[waypoints.length - 1].y
}

// Pick a wild-herd center near the trail, somewhere in the FIRST HALF of the
// journey (the X range nearer the settled start). Seeded, so a given world
// always places the herd in the same spot — but a different world puts it
// somewhere new. The site sits a short perpendicular distance off the trail
// (HERD_OFFSET_MIN..MAX), on a randomly-chosen side, so it's clearly off the
// path yet visible from it — same "near the trail" feel as the tree band.
export function pickHerdSite(
  waypoints: { x: number; y: number }[],
  seed: number,
): { x: number; y: number } {
  const rng = makeRng(seed)
  const startX = waypoints[0].x
  const endX = waypoints[waypoints.length - 1].x
  // first half of the X span (start → midpoint), inset by a margin at both ends
  const halfX = startX + (endX - startX) * HERD_FIRST_HALF_FRAC
  const loX = Math.min(startX, halfX) + HERD_X_MARGIN
  const hiX = Math.max(startX, halfX) - HERD_X_MARGIN
  const cx = loX + rng() * (hiX - loX)
  const trailY = trailYAtX(waypoints, cx)
  const side = rng() < 0.5 ? -1 : 1
  const offset = HERD_OFFSET_MIN + rng() * (HERD_OFFSET_MAX - HERD_OFFSET_MIN)
  return { x: Math.floor(cx), y: Math.floor(trailY + side * offset) }
}

const ROCK_CLUSTER_DENSITY = 0.000000022   // clusters per px² — expected count is density × area
const ROCK_CLUSTER_TRAIL_BUMP = 0.7        // extra keep-chance at the trail line itself
const ROCK_CLUSTER_BUMP_FALLOFF = 2500     // px from trail where the bump decays to ~1/e
const ROCK_CLUSTER_BASELINE_KEEP = 0.25    // keep-chance for a candidate far from the trail
const ROCK_CLUSTER_MIN_SPACING = 700       // min px between cluster centers

// Seeded rock-cluster centers paced westward along the trail, each offset to a
// random side at a random perpendicular distance — concentrated near the route
// but reaching into the wilds. Different per world seed, stable for a given one.
export function scatterTrailRockClusters(
  waypoints: { x: number; y: number }[],
  bounds: GenRect,
  seed: number,
  exclusions: { x: number; y: number; radius: number }[] = [],
): { x: number; y: number }[] {
  const rng = makeRng(seed)
  const out: { x: number; y: number }[] = []
  const minSq = ROCK_CLUSTER_MIN_SPACING * ROCK_CLUSTER_MIN_SPACING
  const area = bounds.w * bounds.h
  const candidateCount = Math.floor((ROCK_CLUSTER_DENSITY * area) / ROCK_CLUSTER_BASELINE_KEEP)

  for (let i = 0; i < candidateCount; i++) {
    const x = bounds.x + rng() * bounds.w
    const y = bounds.y + rng() * bounds.h

    let excluded = false
    for (const e of exclusions) {
      const dx = x - e.x
      const dy = y - e.y
      if (dx * dx + dy * dy < e.radius * e.radius) { excluded = true; break }
    }
    if (excluded) continue

    const trailDist = pointToPolylineDist(x, y, waypoints)
    const bump = ROCK_CLUSTER_TRAIL_BUMP * Math.exp(-(trailDist * trailDist) / (ROCK_CLUSTER_BUMP_FALLOFF * ROCK_CLUSTER_BUMP_FALLOFF))
    const keepProb = Math.min(1, ROCK_CLUSTER_BASELINE_KEEP + bump)
    if (rng() > keepProb) continue

    let blocked = false
    for (const c of out) {
      const dx = x - c.x
      const dy = y - c.y
      if (dx * dx + dy * dy < minSq) { blocked = true; break }
    }
    if (blocked) continue

    out.push({ x: Math.floor(x), y: Math.floor(y) })
  }
  return out
}
