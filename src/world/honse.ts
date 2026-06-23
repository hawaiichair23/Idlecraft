
export type HonseMode = 'idle' | 'flee'

export interface Honse {
  x: number         
  y: number          
  vx: number      
  vy: number        
  facingRight: boolean    // Prevents the sprite from strobing left/right when vx oscillates near zero 
  facingLockedUntil: number
  homeX: number      // anchor for her wander range — she drifts back toward this
  homeY: number
  mode: HonseMode
  // ms timestamp at which the current sub-behavior expires and a new one
  // should be picked. 
  modeUntil: number
  tame: boolean
  speedMul: number   // per-honse speed multiplier (flee + ride), rolled at spawn
  tint: number       // body tint color, rolled at spawn (independent of speed)
  sprite: string     // texture key for this honse
  tinted: boolean    // whether `tint` is applied to the sprite (false for special coats)
  spacing: number    // personal-space radius for herd separation, rolled at spawn
  health: number       // remaining hit points; becomes a carcass at <= 0
  hurtUntil: number    // gameTime ms until which the hit (red) flash shows
  knockbackUntil: number
  dying: boolean
  fleeDirX: number
  fleeDirY: number
  fleeSpeed: number
  spookCooldownUntil: number
}

export const HONSE_MAX_HEALTH = 30

// Natural coat colors with spawn weights. Tint is independent of speed — you
// can't judge a honse by its color. Higher weight = more common; grey/white is
// deliberately rare.
const HONSE_COLORS: [number, number][] = [
  [0x7A4A2E, 8],    // bay (warm mid-brown)
  [0x1A1A1E, 5],    // black
  [0x4F5359, 5],    // dark steel grey (cool)
  [0xDCE1E6, 1],    // grey / white (rare)
]
const HONSE_COLOR_TOTAL = HONSE_COLORS.reduce((s, c) => s + c[1], 0)

// Speed multiplier roll. Most honses fall in a normal band (0.7..1.3), but rare
// outliers roll super-slow or super-fast — the prize/dud catches.
function rollSpeed(rng: () => number): number {
  const r = rng()
  if (r < 0.10) return 1.40 + rng() * 0.30   // super fast: 1.40 .. 1.70
  return 0.95 + rng() * 0.35                 // normal: 0.95 .. 1.30
}

function pickCoat(rng: () => number): number {
  let r = rng() * HONSE_COLOR_TOTAL
  for (const [color, weight] of HONSE_COLORS) {
    r -= weight
    if (r < 0) return color
  }
  return HONSE_COLORS[0][0]
}

export function createHonse(x: number, y: number, rng: () => number): Honse {
  // pick a coat: special untinted sprites roll first, otherwise a tinted base coat
  let sprite = 'honse'
  let tinted = true
  const roll = rng()
  if (roll < 0.12) {
    sprite = rng() < 0.5 ? 'honse_spotted' : 'honse_spotted_brown'
    tinted = false
  } else if (roll < 0.24) {
    sprite = 'honse_palomino'
    tinted = false
  } else if (roll < 0.33) {
    sprite = 'honse_sorrel_socks'
    tinted = false
  } else if (roll < 0.55) {
    sprite = 'honse_brown'
    tinted = false
  } else if (roll < 0.68) {
    sprite = 'honse_chestnut'
    tinted = false
  } else if (roll < 0.80) {
    sprite = 'honse_sorrel'
    tinted = false
  }
  return {
    x, y,
    vx: 0, vy: 0,
    facingRight: false,
    facingLockedUntil: 0,
    homeX: x, homeY: y,
    mode: 'idle', modeUntil: 0,
    tame: false,
    speedMul: rollSpeed(rng),
    tint: pickCoat(rng),
    sprite,
    tinted,
    spacing: 32 + rng() * 38,   // personal space: 32..70px
    health: HONSE_MAX_HEALTH,
    hurtUntil: 0,
    knockbackUntil: 0,
    dying: false,
    fleeDirX: 0,
    fleeDirY: 0,
    fleeSpeed: 0,
    spookCooldownUntil: 0,
  }
}

// ---- tuning ----
const WALK_SPEED = 75
// Wild honses keep their distance from the player. 
const AVOID_RADIUS = 360
const AVOID_SPEED_MIN = 140
const AVOID_SPEED_MAX = 480

const SPOOK_BOOST = 220
const SPOOK_MIN_SPEED = 420
const SPOOK_RADIUS = 460
const SPOOK_FLEE_MIN_MS = 1500
const SPOOK_FLEE_MAX_MS = 2400
const SPOOK_EASE_MS = 1100
const SPOOK_COOLDOWN_MS = 2500

export function spookHonse(h: Honse, fromX: number, fromY: number, gameTime: number, force = false) {
  if (h.dying) return
  if (!force && gameTime < h.spookCooldownUntil) return
  if (!force && h.mode === 'flee' && gameTime < h.modeUntil) return
  let dx = h.x - fromX
  let dy = h.y - fromY
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  h.fleeDirX = dx / dist
  h.fleeDirY = dy / dist
  const curSpeed = Math.sqrt(h.vx * h.vx + h.vy * h.vy)
  h.fleeSpeed = Math.max(SPOOK_MIN_SPEED, curSpeed + SPOOK_BOOST)
  h.mode = 'flee'
  const fleeMs = SPOOK_FLEE_MIN_MS + Math.random() * (SPOOK_FLEE_MAX_MS - SPOOK_FLEE_MIN_MS)
  h.modeUntil = gameTime + fleeMs
  h.spookCooldownUntil = gameTime + fleeMs + SPOOK_COOLDOWN_MS
}

export function spookHonsesFromShot(
  honses: Honse[],
  sx: number,
  sy: number,
  gameTime: number,
  mountedIndex: number | null = null,
) {
  for (let i = 0; i < honses.length; i++) {
    if (i === mountedIndex) continue
    const h = honses[i]
    const dx = h.x - sx
    const dy = h.y - sy
    if (dx * dx + dy * dy > SPOOK_RADIUS * SPOOK_RADIUS) continue
    spookHonse(h, sx, sy, gameTime)
  }
}

const IDLE_PAUSE_MIN_MS = 3000
const IDLE_PAUSE_MAX_MS = 6000
const IDLE_WALK_MIN_MS = 1000
const IDLE_WALK_MAX_MS = 3000
const IDLE_WALK_CHANCE = 0.3  
const HOME_RADIUS = 200

// ---- loose herd grouping ----
// Wild honses band up loosely (not tight like cattle). Each idle honse steers
// gently toward the average position of other honses within HERD_RADIUS, and
// pushes off any closer than its own personal-space radius so a band spreads
// rather than stacks. Both forces are added under player-avoidance — a spooked
// honse bolts first and regroups after. Weights are deliberately low to keep it
// loose; each honse's separation distance is its rolled `spacing` field.
const HERD_RADIUS = 220          // who counts as "nearby" for grouping
const HERD_COHESION_STRENGTH = 14   // px/s pull toward the local group center
const HERD_SEPARATION_STRENGTH = 90 // px/s push off a too-close neighbor

const HOME_BIAS_HALF_ANGLE = Math.PI / 2

const ROPE_TAUT_DIST = 70
const ROPE_PULL_PER_PX = 1.2   
const ROPE_PULL_MAX = 60       
const ROPE_LEASH_MAX = 160
const FOLLOW_DEADZONE = 90   // standoff distance a follower holds behind its leader
const FOLLOW_RAMP_BAND = 40  // distance past the deadzone over which follow speed eases up to full

const FACING_LOCK_MS = 400

export const HONSE_CATCH_OFFSET_X = -16
export const HONSE_CATCH_OFFSET_Y = -5

// World-space point on the honse where ropes attach. 
export function getHonseNeckAnchor(h: Honse): { x: number; y: number } {
  const dx = h.facingRight ? -HONSE_CATCH_OFFSET_X : HONSE_CATCH_OFFSET_X
  return { x: h.x + dx, y: h.y + HONSE_CATCH_OFFSET_Y }
}

// Body collision footprint for a honse 
export function getHonseBodyAABB(h: Honse): { x: number; y: number; w: number; h: number } {
  const W = 30
  const H = 12
  // Centered horizontally; vertical center slightly below honse.y so the
  // rect sits over the body+legs rather than the head/back.
  return { x: h.x - W / 2, y: h.y - H / 2 + 3, w: W, h: H }
}

// Roll a fresh idle sub-behavior 
function pickIdleBehavior(h: Honse, now: number) {
  h.mode = 'idle'
  if (Math.random() < IDLE_WALK_CHANCE) {
    const dx = h.homeX - h.x
    const dy = h.homeY - h.y
    const distFromHome = Math.sqrt(dx * dx + dy * dy)

    let angle: number
    if (distFromHome < HOME_RADIUS) {
      // close to home: any direction
      angle = Math.random() * Math.PI * 2
    } else {
      // far from home: pick a direction within ±HOME_BIAS_HALF_ANGLE of home-ward
      const homeAngle = Math.atan2(dy, dx)
      angle = homeAngle + (Math.random() * 2 - 1) * HOME_BIAS_HALF_ANGLE
    }
    h.vx = Math.cos(angle) * WALK_SPEED
    h.vy = Math.sin(angle) * WALK_SPEED
    h.modeUntil = now + IDLE_WALK_MIN_MS + Math.random() * (IDLE_WALK_MAX_MS - IDLE_WALK_MIN_MS)
  } else {
    // pause: stand still for a long beat
    h.vx = 0
    h.vy = 0
    h.modeUntil = now + IDLE_PAUSE_MIN_MS + Math.random() * (IDLE_PAUSE_MAX_MS - IDLE_PAUSE_MIN_MS)
  }
}

// Returns the additive velocity contribution from the rope this frame.
// Zero vector when no tether or when slack (within ROPE_TAUT_DIST). 
export function getHonseRopePull(
  h: Honse,
  tether: { x: number; y: number } | null,
): { vx: number; vy: number } {
  if (!tether) return { vx: 0, vy: 0 }
  const neck = getHonseNeckAnchor(h)
  const dx = tether.x - neck.x
  const dy = tether.y - neck.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist <= ROPE_TAUT_DIST || dist <= 0.0001) return { vx: 0, vy: 0 }
  const pull = Math.min((dist - ROPE_TAUT_DIST) * ROPE_PULL_PER_PX, ROPE_PULL_MAX)
  return { vx: (dx / dist) * pull, vy: (dy / dist) * pull }
}

// `getTether(honseIndex)` returns the world position of the other end of any
// rope this honse is tied to 
// Loose herd steering for one honse: a gentle pull toward the average position
// of nearby honses (cohesion) plus a push off any that are too close
// (separation). Scans the herd for neighbors within HERD_RADIUS. Skips the
// honse itself, the mounted honse, and tamed honses (only the wild band groups
// up). Returns the additive velocity contribution; zero when it has no
// neighbors. Pure — reads positions only.
// ---- herd spatial grid ----
// getHerdSteer only ever cares about other honses within HERD_RADIUS. Scanning
// every honse for every honse is O(n²) — fine for a handful, but it squares as
// herds grow. Instead we bucket the herd-eligible honses (untamed, not mounted)
// into a grid of HERD_RADIUS-sized cells once per frame, then each honse only
// looks at its own cell + the 8 touching cells. Because a neighbor must be
// within HERD_RADIUS to matter and a cell is HERD_RADIUS wide, that 3×3 block
// provably contains every honse that could be in range — anything outside is
// too far by construction. The per-neighbor math is unchanged; only the set of
// honses examined shrinks, so the steering output is identical.
const HERD_CELL = HERD_RADIUS

// Map from "cellX,cellY" → list of honse indices in that cell. Only includes
// honses eligible to participate in herding (untamed, not the mount).
type HerdGrid = Map<string, number[]>

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`
}

function buildHerdGrid(honses: Honse[], mountedIndex: number | null): HerdGrid {
  const grid: HerdGrid = new Map()
  for (let i = 0; i < honses.length; i++) {
    if (i === mountedIndex) continue
    const h = honses[i]
    if (h.tame) continue
    const cx = Math.floor(h.x / HERD_CELL)
    const cy = Math.floor(h.y / HERD_CELL)
    const key = cellKey(cx, cy)
    const bucket = grid.get(key)
    if (bucket) bucket.push(i)
    else grid.set(key, [i])
  }
  return grid
}

function getHerdSteer(
  honses: Honse[],
  selfIndex: number,
  grid: HerdGrid,
): { vx: number; vy: number } {
  const self = honses[selfIndex]
  let sumX = 0, sumY = 0, count = 0
  let sepX = 0, sepY = 0
  const radiusSq = HERD_RADIUS * HERD_RADIUS
  const sep = self.spacing
  const sepSq = sep * sep

  // Only scan the 3×3 block of cells around self. Any honse close enough to
  // herd with is guaranteed to fall inside it; the rest are skipped for free.
  const selfCX = Math.floor(self.x / HERD_CELL)
  const selfCY = Math.floor(self.y / HERD_CELL)
  for (let gx = selfCX - 1; gx <= selfCX + 1; gx++) {
    for (let gy = selfCY - 1; gy <= selfCY + 1; gy++) {
      const bucket = grid.get(cellKey(gx, gy))
      if (!bucket) continue
      for (const j of bucket) {
        if (j === selfIndex) continue
        // (tame / mounted honses were never added to the grid, so there's no
        // need to re-check them here.)
        const o = honses[j]
        const dx = o.x - self.x
        const dy = o.y - self.y
        const dSq = dx * dx + dy * dy
        if (dSq > radiusSq || dSq < 0.0001) continue

        // cohesion: accumulate neighbor positions to average later
        sumX += o.x; sumY += o.y; count++

        // separation: push directly away from any neighbor that's too close,
        // stronger the closer it is
        if (dSq < sepSq) {
          const d = Math.sqrt(dSq)
          const push = (sep - d) / sep   // 0 at edge → 1 when touching
          sepX -= (dx / d) * push
          sepY -= (dy / d) * push
        }
      }
    }
  }

  let vx = 0, vy = 0
  if (count > 0) {
    // steer toward the local group center
    const cx = sumX / count
    const cy = sumY / count
    let dx = cx - self.x
    let dy = cy - self.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d > 0.0001) {
      vx += (dx / d) * HERD_COHESION_STRENGTH
      vy += (dy / d) * HERD_COHESION_STRENGTH
    }
  }
  vx += sepX * HERD_SEPARATION_STRENGTH
  vy += sepY * HERD_SEPARATION_STRENGTH
  return { vx, vy }
}

export function updateHonses(
  honses: Honse[],
  dt: number,
  gameTime: number,
  collidesAt: (px: number, py: number, ignoreHonseIndex: number) => boolean,
  getTethers: (honseIndex: number) => { x: number; y: number }[] = () => [],
  mountedIndex: number | null = null,
  playerPos: { x: number; y: number } | null = null,
  getLeaderPos: (honseIndex: number) => { x: number; y: number } | null = () => null,
  caravanSpeed: number = WALK_SPEED,
) {
  const now = gameTime
  const step = dt / 1000

  // Bucket the herd-eligible honses once per frame so each honse's herd scan
  // only touches its local neighborhood instead of every other honse.
  const herdGrid = buildHerdGrid(honses, mountedIndex)

  for (let i = 0; i < honses.length; i++) {
    // The mounted honse is driven by player input in the scene; skip her AI
    // entirely so she doesn't fight the rider's movement.
    if (i === mountedIndex) continue
    const h = honses[i]

    // Dying or mid-knockback: the Matter body in the scene owns the honse's
    // motion (it carries the knockback impulse and collides). Skip AI entirely
    // so we don't fight the impulse; position is driven from the body in update().
    if (h.dying || now < h.knockbackUntil) continue

    // Wild-avoidance: untamed honses keep their distance from the player.
    const tethers = getTethers(i)
    const tether = tethers.length > 0 ? tethers[0] : null

    // --- movement branches: exactly one runs per frame ---
    let moved = false

    // Tamed + roped honse with a leader: cooperative follower.
    if (h.tame && tether) {
      const leaderPos = getLeaderPos(i)
      if (leaderPos) {
        const neck = getHonseNeckAnchor(h)
        const dx = leaderPos.x - neck.x
        const dy = leaderPos.y - neck.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        let vx = 0, vy = 0
        if (dist > FOLLOW_DEADZONE) {
          const ramp = Math.min((dist - FOLLOW_DEADZONE) / FOLLOW_RAMP_BAND, 1)
          const speed = caravanSpeed * h.speedMul * ramp
          vx = (dx / dist) * speed
          vy = (dy / dist) * speed
        }
        if (now >= h.facingLockedUntil) {
          const newFacing = vx > 0.001 ? true : vx < -0.001 ? false : h.facingRight
          if (newFacing !== h.facingRight) {
            h.facingRight = newFacing
            h.facingLockedUntil = now + FACING_LOCK_MS
          }
        }
        h.vx = vx
        h.vy = vy
        moved = true
      }
    }

    let avoiding = false
    if (!moved && !h.tame && playerPos && !(tether && mountedIndex !== null)) {
      const ax = h.x - playerPos.x
      const ay = h.y - playerPos.y
      const distSq = ax * ax + ay * ay
      if (distSq < AVOID_RADIUS * AVOID_RADIUS && distSq > 0.0001) {
        const dist = Math.sqrt(distSq)
        const proximity = 1 - dist / AVOID_RADIUS
        const speed = (AVOID_SPEED_MIN + (AVOID_SPEED_MAX - AVOID_SPEED_MIN) * proximity) * h.speedMul
        h.vx = (ax / dist) * speed
        h.vy = (ay / dist) * speed
        avoiding = true
      }
    }

    if (!moved && h.mode === 'flee' && now < h.modeUntil) {
      const remaining = h.modeUntil - now
      const ease = remaining < SPOOK_EASE_MS ? remaining / SPOOK_EASE_MS : 1
      const speed = h.fleeSpeed * h.speedMul * ease
      const vx = h.fleeDirX * speed
      const vy = h.fleeDirY * speed
      if (now >= h.facingLockedUntil) {
        const newFacing = vx > 0.001 ? true : vx < -0.001 ? false : h.facingRight
        if (newFacing !== h.facingRight) {
          h.facingRight = newFacing
          h.facingLockedUntil = now + FACING_LOCK_MS
        }
      }
      if (vx !== 0) {
        const nextX = h.x + vx * step
        if (!collidesAt(nextX, h.y, i)) h.x = nextX
      }
      if (vy !== 0) {
        const nextY = h.y + vy * step
        if (!collidesAt(h.x, nextY, i)) h.y = nextY
      }
      h.vx = vx
      h.vy = vy
      moved = true
    }

    if (!moved) {
      if (!avoiding && now >= h.modeUntil) {
        pickIdleBehavior(h, now)
      }

      let vx = h.vx
      let vy = h.vy

      if (!avoiding && !h.tame) {
        const steer = getHerdSteer(honses, i, herdGrid)
        vx += steer.vx
        vy += steer.vy
      }
      const pull = getHonseRopePull(h, tether)
      vx += pull.vx
      vy += pull.vy

      if (now >= h.facingLockedUntil) {
        let newFacing = h.facingRight
        if (vx > 0.001) newFacing = true
        else if (vx < -0.001) newFacing = false
        if (newFacing !== h.facingRight) {
          h.facingRight = newFacing
          h.facingLockedUntil = now + FACING_LOCK_MS
        }
      }

      if (vx !== 0) {
        const nextX = h.x + vx * step
        if (!collidesAt(nextX, h.y, i)) h.x = nextX
      }
      if (vy !== 0) {
        const nextY = h.y + vy * step
        if (!collidesAt(h.x, nextY, i)) h.y = nextY
      }
    }

    // Leash cap moved to Overworld body sync (runs after the Matter body
    // overwrites h.x/h.y, so it gets the final word on position).
  }
}
