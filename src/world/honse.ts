// Honses — wild and tamed horses living in the overworld.
//
// Data shape stays minimal: position + velocity + idle-mode timer + a home
// point so she drifts around a range rather than wandering to infinity.
// Real AI states (graze, flee) will be added as more modes alongside 'idle'.
// Sprites and obstacle hitboxes remain a scene concern.

export type HonseMode = 'idle'

export interface Honse {
  x: number          // visual center
  y: number          // visual center (depth-sorts by feet elsewhere)
  vx: number         // px/sec
  vy: number         // px/sec
  facingRight: boolean    // sprite is drawn facing left; this flips the X axis
  // ms timestamp before which facing can't change again. Prevents the sprite
  // from strobing left/right when vx oscillates near zero (e.g. rope-tug fights
  // with a perpendicular AI walk).
  facingLockedUntil: number
  homeX: number      // anchor for her wander range — she drifts back toward this
  homeY: number
  mode: HonseMode
  // ms timestamp at which the current sub-behavior expires and a new one
  // should be picked. Zero on a fresh honse means "decide immediately".
  modeUntil: number
}

// ---- tuning ----
const WALK_SPEED = 25
// Idle = mostly standing still, occasionally a short walk in a random
// direction. Long pauses, short walks. McCarthy unhurried.
const IDLE_PAUSE_MIN_MS = 3000
const IDLE_PAUSE_MAX_MS = 6000
const IDLE_WALK_MIN_MS = 1000
const IDLE_WALK_MAX_MS = 3000
const IDLE_WALK_CHANCE = 0.3   // each decision: chance she walks vs. pauses
// Home range: outside this radius she biases her walk angle toward home.
// Inside, she picks any direction. Soft fence, no hard barrier.
const HOME_RADIUS = 200
// Half-angle (radians) around the home-ward direction when biased.
// PI/2 = anywhere in the half-circle facing home (gentle). Smaller = more
// determined return.
const HOME_BIAS_HALF_ANGLE = Math.PI / 2
// Rope pull: when the rope is attached to a honse and the distance from her
// neck to the player exceeds this taut threshold, she gets pulled toward the
// player with strength proportional to how far past taut she is.
const ROPE_TAUT_DIST = 70
const ROPE_PULL_PER_PX = 1.2   // px/sec of pull per px past taut
const ROPE_PULL_MAX = 60       // cap on the tug velocity so far-pulls don't yank her at runaway speed
// Minimum ms between facing flips. Stops the sprite from strobing when vx
// oscillates near zero. She commits to a direction for at least this long.
const FACING_LOCK_MS = 400

// Offset from a honse's center to its neck — where ropes catch and where the
// rope visibly attaches. Tuned for the 26x15 left-facing sprite at scale 2:
// head/neck sits on the left side of the sprite, slightly above center.
export const HONSE_CATCH_OFFSET_X = -16
export const HONSE_CATCH_OFFSET_Y = -5

// World-space point on the honse where ropes attach. Used by both catch
// detection (distance check) and anchor lookup (where to pin the rope tip).
// The offset is mirrored when she's facing right so the rope stays on her
// neck rather than chasing the visual position from the left-facing sprite.
export function getHonseNeckAnchor(h: Honse): { x: number; y: number } {
  const dx = h.facingRight ? -HONSE_CATCH_OFFSET_X : HONSE_CATCH_OFFSET_X
  return { x: h.x + dx, y: h.y + HONSE_CATCH_OFFSET_Y }
}

// Body collision footprint for a honse — used to block player movement (and
// honse-vs-world movement). Tighter than the visible sprite: the head sticks
// forward, the tail hangs, neither blocks. This rect covers only the chunky
// body+legs area.
export function getHonseBodyAABB(h: Honse): { x: number; y: number; w: number; h: number } {
  const W = 30
  const H = 12
  // Centered horizontally; vertical center slightly below honse.y so the
  // rect sits over the body+legs rather than the head/back.
  return { x: h.x - W / 2, y: h.y - H / 2 + 3, w: W, h: H }
}

// Roll a fresh idle sub-behavior — pause or short walk. When she walks,
// the angle is uniform-random inside her home range, biased toward home
// when she's drifted too far.
function pickIdleBehavior(h: Honse, now: number) {
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

// Per-frame: tick each honse's state machine, then integrate position from
// velocity. dt in ms. `collidesAt(px, py, ignoreHonseIndex)` is a callback
// supplied by the scene — when a step would put the honse inside an obstacle
// (or another honse), the step is skipped for that frame.
//
// If a honse is roped to the player, pass `ropedHonseIndex` + `playerPos`
// so the rope tension can tug her toward the player when the rope goes taut.
// The tug is additive to her current AI velocity for this frame only — it
// doesn't permanently override her wander.
export function updateHonses(
  honses: Honse[],
  dt: number,
  collidesAt: (px: number, py: number, ignoreHonseIndex: number) => boolean,
  ropedHonseIndex: number | null = null,
  playerPos: { x: number; y: number } | null = null,
) {
  const now = Date.now()
  const step = dt / 1000

  for (let i = 0; i < honses.length; i++) {
    const h = honses[i]

    // mode tick: if the current sub-behavior has expired, pick a new one
    if (now >= h.modeUntil) {
      pickIdleBehavior(h, now)
    }

    // start with her AI velocity, then add the rope-pull this frame if any
    let vx = h.vx
    let vy = h.vy
    if (i === ropedHonseIndex && playerPos) {
      const neck = getHonseNeckAnchor(h)
      const dx = playerPos.x - neck.x
      const dy = playerPos.y - neck.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > ROPE_TAUT_DIST && dist > 0.0001) {
        // pull strength grows with how far past taut, capped so she doesn't run
        const pull = Math.min((dist - ROPE_TAUT_DIST) * ROPE_PULL_PER_PX, ROPE_PULL_MAX)
        vx += (dx / dist) * pull
        vy += (dy / dist) * pull
      }
    }

    // face the direction she's actually moving this frame (covers both AI
    // walks and rope-tugs). Zero vx leaves the last facing alone. A short
    // cooldown after each flip stops the sprite from strobing back and forth.
    if (now >= h.facingLockedUntil) {
      let newFacing = h.facingRight
      if (vx > 0.001) newFacing = true
      else if (vx < -0.001) newFacing = false
      if (newFacing !== h.facingRight) {
        h.facingRight = newFacing
        h.facingLockedUntil = now + FACING_LOCK_MS
      }
    }

    // integrate velocity. Axis-separated so she can slide along walls.
    if (vx !== 0) {
      const nextX = h.x + vx * step
      if (!collidesAt(nextX, h.y, i)) h.x = nextX
    }
    if (vy !== 0) {
      const nextY = h.y + vy * step
      if (!collidesAt(h.x, nextY, i)) h.y = nextY
    }
  }
}
