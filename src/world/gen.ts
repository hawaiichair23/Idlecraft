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

export interface RockFormation {
  x: number
  y: number
}

export interface WorldLayout {
  decor: DecorItem[]
  buried: BuriedItem[]
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
const BURIED_COIN_DENSITY = 0.00007125 

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
  const rocks: RockFormation[] = []

  const worldArea = opts.worldSize * opts.worldSize
  const skullCount = Math.floor(SKULL_DENSITY * worldArea)
  const pebbleCount = Math.floor(PEBBLE_DENSITY * worldArea)
  const grassCount = Math.floor(GRASS_DENSITY * worldArea)
  const coinCount = Math.floor(BURIED_COIN_DENSITY * worldArea)

  const margin = opts.worldSize * DECOR_EDGE_MARGIN_FRACTION
  const fullArea: GenRect = { x: margin, y: margin, w: opts.worldSize - margin * 2, h: opts.worldSize - margin * 2 }

  scatter(decor, rng, fullArea, 'cow_skull', skullCount, opts.exclusions, SKULL_SPACING)
  scatter(decor, rng, fullArea, 'pebbles', pebbleCount, opts.tightExclusions, PEBBLE_SPACING)
  scatter(decor, rng, fullArea, 'grass', grassCount, opts.tightExclusions, GRASS_SPACING)
  buildPath(decor, rng, PATH_WILDERNESS_TO_TOWN.sx, PATH_WILDERNESS_TO_TOWN.sy, PATH_WILDERNESS_TO_TOWN.ex, PATH_WILDERNESS_TO_TOWN.ey, PATH_SNAKE_AMPLITUDE)
  scatterBuried(buried, rng, opts, coinCount, opts.exclusions)
  scatterRockCluster(rocks, rng, opts, opts.exclusions)

  return { decor, buried, rocks }
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
