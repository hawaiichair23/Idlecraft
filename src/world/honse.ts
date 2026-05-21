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
  // Once she's been ridden, she's tame: she ignores the player's proximity
  // instead of trying to keep her distance (wild behavior comes later).
  tame: boolean
}

// ---- tuning ----
const WALK_SPEED = 25
// Wild honses keep their distance from the player. While the player is
// inside AVOID_RADIUS, an untamed honse walks directly away. Speed scales
// linearly with proximity: AVOID_SPEED_MIN at the edge of the radius,
// AVOID_SPEED_MAX when the player is right on top of her. Faster than idle
// so a strolling player can't close the gap; slower than a running player
// so she can still be caught on foot.
const AVOID_RADIUS = 400
const AVOID_SPEED_MIN = 40
const AVOID_SPEED_MAX = 170
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
// Hard wall: she can never end a frame farther than this from her tether
// anchor. Slightly past the player's leash (140) so the honse side reads as
// the softer constraint, but still a real cap — without it, a fast-avoiding
// wild honse can outrun the tug indefinitely.
const ROPE_LEASH_MAX = 160
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

// Returns the additive velocity contribution from the rope this frame.
// Zero vector when no tether or when slack (within ROPE_TAUT_DIST). Past taut,
// pull strength grows linearly with overshoot, capped at ROPE_PULL_MAX.
// Used by both the AI tick in updateHonses and the mounted-movement branch
// in the Overworld scene so both feel the same tug.
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

// Per-frame: tick each honse's state machine, then integrate position from
// velocity. dt in ms. `collidesAt(px, py, ignoreHonseIndex)` is a callback
// supplied by the scene — when a step would put the honse inside an obstacle
// (or another honse), the step is skipped for that frame.
//
// `getTether(honseIndex)` returns the world position of the other end of any
// rope this honse is tied to (post, player, another honse) — or null if she
// isn't tethered. When tethered, the rope tension tugs her toward that point
// once the distance exceeds ROPE_TAUT_DIST. The tug is additive to her AI
// velocity for this frame only.
export function updateHonses(
  honses: Honse[],
  dt: number,
  collidesAt: (px: number, py: number, ignoreHonseIndex: number) => boolean,
  getTether: (honseIndex: number) => { x: number; y: number } | null = () => null,
  mountedIndex: number | null = null,
  playerPos: { x: number; y: number } | null = null,
) {
  const now = Date.now()
  const step = dt / 1000

  for (let i = 0; i < honses.length; i++) {
    // The mounted honse is driven by player input in the scene; skip her AI
    // entirely so she doesn't fight the rider's movement.
    if (i === mountedIndex) continue
    const h = honses[i]

    // Wild-avoidance: untamed honses keep their distance from the player.
    // While the player is inside AVOID_RADIUS, her velocity points directly
    // away at a proximity-scaled speed — overrides idle AI for this frame.
    // Still runs while tethered: she yanks against the rope trying to get
    // away from you, and the rope-pull below fights her back.
    const tether = getTether(i)
    let avoiding = false
    if (!h.tame && playerPos && !(tether && mountedIndex !== null)) {
      const ax = h.x - playerPos.x
      const ay = h.y - playerPos.y
      const distSq = ax * ax + ay * ay
      if (distSq < AVOID_RADIUS * AVOID_RADIUS && distSq > 0.0001) {
        const dist = Math.sqrt(distSq)
        // proximity 0 = at edge, 1 = right on her
        const proximity = 1 - dist / AVOID_RADIUS
        const speed = AVOID_SPEED_MIN + (AVOID_SPEED_MAX - AVOID_SPEED_MIN) * proximity
        h.vx = (ax / dist) * speed
        h.vy = (ay / dist) * speed
        avoiding = true
      }
    }

    // mode tick: if the current sub-behavior has expired, pick a new one.
    // Suppressed while avoiding so her walk/pause timer doesn't expire
    // mid-flight and snap her into a random direction.
    if (!avoiding && now >= h.modeUntil) {
      pickIdleBehavior(h, now)
    }

    // start with her AI (or avoidance) velocity, then add the rope-pull this frame if any
    let vx = h.vx
    let vy = h.vy
    const pull = getHonseRopePull(h, tether)
    vx += pull.vx
    vy += pull.vy

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

    // hard leash cap: if she ended the frame past the leash, snap her back
    // to the boundary along the radial line. The pull-tug above is soft and
    // can be outrun by a fast avoidance velocity — this guarantees she's
    // never actually beyond the rope.
    if (tether) {
      const rx = h.x - tether.x
      const ry = h.y - tether.y
      const distSq = rx * rx + ry * ry
      const maxSq = ROPE_LEASH_MAX * ROPE_LEASH_MAX
      if (distSq > maxSq) {
        const dist = Math.sqrt(distSq)
        h.x = tether.x + (rx / dist) * ROPE_LEASH_MAX
        h.y = tether.y + (ry / dist) * ROPE_LEASH_MAX
      }
    }
  }
}
