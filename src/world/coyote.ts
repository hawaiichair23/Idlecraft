export interface Coyote {
  x: number
  y: number
  vx: number
  vy: number
  facingRight: boolean
  facingLockedUntil: number
  state: 'roam' | 'lunge' | 'retreat'
  locusAngle: number   // angle on the standoff ring where it currently orbits
  locusInit: boolean   // false until the first orbit spot is chosen
  nextOrbitAt: number  // gameTime ms to step the angle clockwise
  locusX: number       // derived ring point (player + locusAngle), the roam center
  locusY: number
  targetX: number      // current short-range wander target near the locus
  targetY: number
  paceLeft: boolean    // which way the next roam pace leg goes
  rage: number         // 0..1, builds while roaming; shrinks the standoff ring
  stuckFrames: number  // consecutive frames blocked while trying to move
  slowFrames: number   // consecutive frames moving far slower than intended
  orbitDir: 1 | -1     // orbit direction; flips when the circle path is obstructed
  lastBiteAt: number   // gameTime ms of last bite, for cooldown
  homeX: number        // territory anchor; roams here when the player is safe
  homeY: number
  health: number       // remaining hit points; coyote despawns at <= 0
  hurtUntil: number    // gameTime ms until which the hit (red) flash shows
  knockbackUntil: number // gameTime ms until which AI movement yields to knockback
  dying: boolean
}

export const COYOTE_MAX_HEALTH = 15
const WALK_SPEED = 130
const FACING_LOCK_MS = 120

// The coyote orbits the player: it holds a locus — a point on an ellipse around
// the player at locusAngle (shorter vertically so it stays on a wide screen when
// north/south) — and roams loosely within ROAM_RADIUS of it. On a timer it steps
// locusAngle clockwise to the next orbit spot. The locus point is re-derived from
// the player's current position each frame so it tracks them.
const STANDOFF_RADIUS_X = 660
const STANDOFF_RADIUS_Y = 350   // ~60% of X to match the screen aspect
const MOUNTED_STANDOFF_MULT = 1.3   // coyotes hang back a little further when player is mounted
const ROAM_RADIUS = 60     // how far it wanders around the locus
const ARRIVE_DIST = 16      // close enough to a target; pick a new one
const STUCK_LIMIT = 5       // frames blocked before abandoning the target
const SLOW_LIMIT = 6        // frames creeping (well below intended speed) before reversing orbit
const SLOW_FRAC = 0.7       // actual/intended speed below this counts as "barely moving"
const ORBIT_STEP = 0.2      // radians stepped clockwise per orbit hop (~11°)
const ORBIT_MIN_MS = 1500   // time between orbit hops
const ORBIT_MAX_MS = 3000
const LUNGE_TRIGGER = 205  // within this of the player, it lunges to attack
const LUNGE_SPEED = WALK_SPEED + 90
const LUNGE_REACH = 14      // this close counts as the lunge landing; peel off
const RETREAT_DIST = 270    // back off to here before returning to roam
const RAGE_BUILD_MS = 12000 // time roaming to build full rage (closes the ring)
const CATCHUP_DIST = 160    // farther than this from its spot = chasing, rage resets
const RAGE_SHRINK = 0.62    // at full rage the standoff ring shrinks by this much

// Body box for collision/shove against the player. Lower and leaner than a honse.
export function getCoyoteBodyAABB(c: Coyote): { x: number; y: number; w: number; h: number } {
  const W = 13
  const H = 5
  return { x: c.x - W / 2, y: c.y - H / 2 + 3, w: W, h: H }
}

// Where a thrown rope catches the coyote — slightly ahead of its center.
const COYOTE_CATCH_OFFSET_X = -10
const COYOTE_CATCH_OFFSET_Y = -2
export function getCoyoteNeckAnchor(c: Coyote): { x: number; y: number } {
  const dx = c.facingRight ? -COYOTE_CATCH_OFFSET_X : COYOTE_CATCH_OFFSET_X
  return { x: c.x + dx, y: c.y + COYOTE_CATCH_OFFSET_Y }
}

// The mouth — a bit further forward than the neck. Tracks facing, so the bite
// point follows the snout when the sprite flips direction.
const COYOTE_MOUTH_OFFSET_X = 15
const COYOTE_MOUTH_OFFSET_Y = -1
export function getCoyoteMouthAnchor(c: Coyote): { x: number; y: number } {
  const dx = c.facingRight ? COYOTE_MOUTH_OFFSET_X : -COYOTE_MOUTH_OFFSET_X
  return { x: c.x + dx, y: c.y + COYOTE_MOUTH_OFFSET_Y }
}

// Distance from the coyote's mouth to the player — used so the lunge's "reached
// you" check and the bite check key off the same point.
function mouthDist(c: Coyote, player: { x: number; y: number }): number {
  const m = getCoyoteMouthAnchor(c)
  const dx = player.x - m.x
  const dy = player.y - m.y
  return Math.sqrt(dx * dx + dy * dy)
}

// Bite: player within this radius of the mouth takes damage, at most once per
// COYOTE_BITE_COOLDOWN_MS. Damage amount lives with the scene's changeHealth call.
export const COYOTE_BITE_RADIUS = 14
export const COYOTE_BITE_COOLDOWN_MS = 900
export const COYOTE_BITE_DAMAGE = 0.75

// Additive velocity from the rope this frame. Zero when slack or untethered.
const ROPE_TAUT_DIST = 60
const ROPE_PULL_PER_PX = 1.2
const ROPE_PULL_MAX = 70
const ROPED_FLEE_SPEED = 150   // how hard a roped coyote bolts from the player
const ROPED_LEASH_MAX = 160    // never travels past this from the tether
export function getCoyoteRopePull(
  c: Coyote,
  tether: { x: number; y: number } | null,
): { vx: number; vy: number } {
  if (!tether) return { vx: 0, vy: 0 }
  const a = getCoyoteNeckAnchor(c)
  const dx = tether.x - a.x
  const dy = tether.y - a.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist <= ROPE_TAUT_DIST || dist <= 0.0001) return { vx: 0, vy: 0 }
  const pull = Math.min((dist - ROPE_TAUT_DIST) * ROPE_PULL_PER_PX, ROPE_PULL_MAX)
  return { vx: (dx / dist) * pull, vy: (dy / dist) * pull }
}

export function createCoyote(x: number, y: number): Coyote {
  return {
    x, y, vx: 0, vy: 0,
    facingRight: true, facingLockedUntil: 0,
    state: 'roam',
    locusAngle: 0, locusInit: false, nextOrbitAt: 0,
    locusX: x, locusY: y,
    targetX: x, targetY: y,
    paceLeft: false,
    rage: 0,
    stuckFrames: 0,
    slowFrames: 0,
    orbitDir: 1,
    lastBiteAt: 0,
    homeX: x, homeY: y,
    health: COYOTE_MAX_HEALTH,
    hurtUntil: 0,
    knockbackUntil: 0,
    dying: false,
  }
}

// Recompute the locus point from the player's current position and the orbit
// angle, so the orbit center tracks the player as they move.
function deriveLocus(c: Coyote, player: { x: number; y: number }, mounted: boolean) {
  const shrink = 1 - c.rage * RAGE_SHRINK
  const mult = mounted ? MOUNTED_STANDOFF_MULT : 1
  c.locusX = player.x + Math.cos(c.locusAngle) * STANDOFF_RADIUS_X * shrink * mult
  c.locusY = player.y + Math.sin(c.locusAngle) * STANDOFF_RADIUS_Y * shrink * mult
}

function scheduleOrbit(c: Coyote, now: number) {
  c.nextOrbitAt = now + ORBIT_MIN_MS + Math.random() * (ORBIT_MAX_MS - ORBIT_MIN_MS)
}

function pickTarget(c: Coyote) {
  // pace left and right: alternate the target to one side of the locus then the
  // other, so it walks a visible horizontal leg each time.
  c.paceLeft = !c.paceLeft
  c.targetX = c.locusX + (c.paceLeft ? -ROAM_RADIUS : ROAM_RADIUS)
  c.targetY = c.locusY
}

export function updateCoyotes(
  coyotes: Coyote[],
  dt: number,
  gameTime: number,
  collidesAt: (px: number, py: number) => boolean,
  player: { x: number; y: number },
  tetherFor: (index: number) => { x: number; y: number } | null,
  playerMounted: boolean,
  playerSafe: boolean,
) {
  const step = dt / 1000
  for (let ci = 0; ci < coyotes.length; ci++) {
    const c = coyotes[ci]

    if (c.dying) continue

    // Knockback window: skip AI steering entirely and just carry the impulse
    // velocity (set by the hit) into position, so the coyote is visibly shoved
    // back before its AI resumes.
    if (gameTime < c.knockbackUntil) {
      const nx = c.x + c.vx * step
      if (!collidesAt(nx, c.y)) c.x = nx
      const ny = c.y + c.vy * step
      if (!collidesAt(c.x, ny)) c.y = ny
      continue
    }



    // Roped: the coyote fights the leash like a wild honse — it bolts away from
    // the player, and the rope pull is ADDED on top (not replacing it). The
    // tension is what strains the rope and drags whatever's on the other end.
    const tether = tetherFor(ci)
    if (tether) {
      const fdx = c.x - player.x
      const fdy = c.y - player.y
      const fdist = Math.sqrt(fdx * fdx + fdy * fdy) || 0.0001
      let vx = (fdx / fdist) * ROPED_FLEE_SPEED
      let vy = (fdy / fdist) * ROPED_FLEE_SPEED
      const pull = getCoyoteRopePull(c, tether)
      vx += pull.vx
      vy += pull.vy

      if (gameTime >= c.facingLockedUntil) {
        let f = c.facingRight
        if (vx > 0.001) f = true
        else if (vx < -0.001) f = false
        if (f !== c.facingRight) {
          c.facingRight = f
          c.facingLockedUntil = gameTime + FACING_LOCK_MS
        }
      }
      if (vx !== 0) {
        const nx = c.x + vx * step
        if (!collidesAt(nx, c.y)) c.x = nx
      }
      if (vy !== 0) {
        const ny = c.y + vy * step
        if (!collidesAt(c.x, ny)) c.y = ny
      }
      // hard leash cap: never past ROPED_LEASH_MAX from the tether
      const rx = c.x - tether.x
      const ry = c.y - tether.y
      const dsq = rx * rx + ry * ry
      if (dsq > ROPED_LEASH_MAX * ROPED_LEASH_MAX) {
        const d = Math.sqrt(dsq)
        c.x = tether.x + (rx / d) * ROPED_LEASH_MAX
        c.y = tether.y + (ry / d) * ROPED_LEASH_MAX
      }
      c.rage = 0
      continue
    }

    // When the player is in a safe zone, the coyote ignores them and roams its
    // own territory — orbit/roam around home instead of the player.
    const anchor = playerSafe ? { x: c.homeX, y: c.homeY } : player
    if (playerSafe && c.state !== 'roam') {
      c.state = 'roam'
      c.locusInit = false
    }

    const pdx = player.x - c.x
    const pdy = player.y - c.y
    const playerDist = Math.sqrt(pdx * pdx + pdy * pdy) || 0.0001

    // Player on horseback: coyotes lose their nerve. Snap out of any attack
    // back to roaming, hold no rage, and hang back at a wider distance.
    if (playerMounted && c.state !== 'roam') {
      c.state = 'roam'
      c.locusInit = false
    }

    // state transitions
    if (!playerMounted && !playerSafe && c.state === 'roam' && playerDist <= LUNGE_TRIGGER) {
      c.state = 'lunge'
    } else if (c.state === 'lunge' && mouthDist(c, player) <= LUNGE_REACH) {
      c.state = 'retreat'
      c.rage = 0   // spent: back to patient distance
    } else if (c.state === 'retreat' && playerDist >= RETREAT_DIST) {
      c.state = 'roam'
      c.locusInit = false   // re-establish an orbit spot around the player
    }

    if (c.state === 'lunge') {
      // drive the MOUTH at the player (not the center), so it noses in
      // mouth-first instead of shoving with its body
      const m = getCoyoteMouthAnchor(c)
      const mdx = player.x - m.x
      const mdy = player.y - m.y
      const md = Math.sqrt(mdx * mdx + mdy * mdy) || 0.0001
      c.vx = (mdx / md) * LUNGE_SPEED
      c.vy = (mdy / md) * LUNGE_SPEED
    } else if (c.state === 'retreat') {
      // peel off: drive directly away from the player
      c.vx = -(pdx / playerDist) * LUNGE_SPEED
      c.vy = -(pdy / playerDist) * LUNGE_SPEED
    } else {
      // rage builds only while it's settled near its spot. If the player moved
      // and it's having to travel to catch up, it isn't patiently stalking —
      // reset rage so it has to re-earn the close-in.
      const ldx = c.locusX - c.x
      const ldy = c.locusY - c.y
      const fromLocus = Math.sqrt(ldx * ldx + ldy * ldy)
      if (playerMounted || playerSafe || fromLocus > CATCHUP_DIST) {
        c.rage = 0
      } else {
        c.rage = Math.min(1, c.rage + dt / RAGE_BUILD_MS)
      }
      if (!c.locusInit) {
        // start orbiting from the coyote's current bearing, so it doesn't snap
        c.locusAngle = Math.atan2(c.y - anchor.y, c.x - anchor.x)
        c.locusInit = true
        scheduleOrbit(c, gameTime)
        deriveLocus(c, anchor, playerMounted)
        pickTarget(c)
      } else if (gameTime >= c.nextOrbitAt) {
        c.locusAngle += ORBIT_STEP * c.orbitDir   // step around the ring (dir may be reversed)
        scheduleOrbit(c, gameTime)
        deriveLocus(c, anchor, playerMounted)
        pickTarget(c)
      } else {
        deriveLocus(c, anchor, playerMounted)
      }

      const dx = c.targetX - c.x
      const dy = c.targetY - c.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001
      if (dist <= ARRIVE_DIST) {
        pickTarget(c)
        c.vx = 0
        c.vy = 0
      } else {
        c.vx = (dx / dist) * WALK_SPEED
        c.vy = (dy / dist) * WALK_SPEED
      }
    }



    if (gameTime >= c.facingLockedUntil) {
      let f = c.facingRight
      if (c.vx > 0.001) f = true
      else if (c.vx < -0.001) f = false
      if (f !== c.facingRight) {
        c.facingRight = f
        c.facingLockedUntil = gameTime + FACING_LOCK_MS
      }
    }

    const preX = c.x
    const preY = c.y
    let moved = false
    if (c.vx !== 0) {
      const nx = c.x + c.vx * step
      if (!collidesAt(nx, c.y)) { c.x = nx; moved = true }
    }
    if (c.vy !== 0) {
      const ny = c.y + c.vy * step
      if (!collidesAt(c.x, ny)) { c.y = ny; moved = true }
    }

    // If it's trying to move but an obstacle keeps blocking it, give up on this
    // target and wander elsewhere instead of grinding against the rock.
    if ((c.vx !== 0 || c.vy !== 0) && !moved) {
      if (++c.stuckFrames >= STUCK_LIMIT) {
        pickTarget(c)
        c.stuckFrames = 0
      }
    } else {
      c.stuckFrames = 0
    }

    // While orbiting (roam state, not lunge/retreat): if the coyote wants to
    // move but is creeping along far slower than intended — scraping an obstacle
    // rather than fully blocked — flip the orbit direction so it circles the
    // other way around the obstruction instead of grinding into it.
    if (c.state === 'roam') {
      const intended = Math.sqrt(c.vx * c.vx + c.vy * c.vy) * step
      if (intended > 0.001) {
        const actual = Math.sqrt((c.x - preX) * (c.x - preX) + (c.y - preY) * (c.y - preY))
        if (actual < intended * SLOW_FRAC) {
          if (++c.slowFrames >= SLOW_LIMIT) {
            // It slowed against something. Reverse the circling direction and
            // step the orbit NOW (don't wait for the scheduled hop) so the
            // locus + target move back the way it came — the clear side.
            c.orbitDir = c.orbitDir === 1 ? -1 : 1
            c.locusAngle += ORBIT_STEP * c.orbitDir
            scheduleOrbit(c, gameTime)
            deriveLocus(c, anchor, playerMounted)
            pickTarget(c)
            c.slowFrames = 0
          }
        } else {
          c.slowFrames = 0
        }
      } else {
        c.slowFrames = 0
      }
    } else {
      c.slowFrames = 0
    }
  }
}
