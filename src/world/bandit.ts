export interface Bandit {
  x: number
  y: number
  vx: number
  vy: number
  facingRight: boolean
  facingLockedUntil: number  // gameTime ms; facing won't flip again until past this
  active: boolean            // false until the player crosses the aggro radius (or he's shot); holds at spawn while dormant
  lastPlayerSide: number     // sign of (player.x - b.x) last frame; a flip while dormant means the player crossed his vertical line → wake (he was lying in wait)
  wakeDelayUntil: number     // gameTime ms; set only on a line-crossing wake — he does nothing until past this, then engages
  // gameTime ms of the last shot, for fire-rate cooldown
  lastFireAt: number
  fireDelay: number          // randomized interval until the next shot, re-rolled each shot
  ammo: number               // rounds left in the magazine; reloads at 0
  reloadUntil: number        // gameTime ms reload finishes; 0 when not reloading
  homeX: number              // spawn anchor — fallback retreat when no cover is found
  homeY: number
  stuckFrames: number        // consecutive frames blocked while trying to move
  health: number
  hurtUntil: number          // gameTime ms until which the hit (red) flash shows
  knockbackUntil: number     // gameTime ms until which AI movement yields to knockback
  dodgeUntil: number         // gameTime ms; while set he commits to a sidestep
  nextDodgeAt: number        // gameTime ms; can't start another dodge until past this
  dodgeX: number             // unit dodge direction, held for the dodge window
  dodgeY: number
  retreatUntil: number       // gameTime ms; while set he backs away from a melee attacker
  retreatX: number           // unit retreat direction, held for the retreat window
  retreatY: number
  dying: boolean
}

export const BANDIT_MAX_HEALTH = 20
// Time between individual shots within a magazine — the base interval. Each shot
// adds up to BANDIT_FIRE_JITTER_MS of random extra delay so his cadence isn't a
// metronome.
export const BANDIT_FIRE_COOLDOWN_MS = 900
export const BANDIT_FIRE_JITTER_MS = 500
// Bandit only shoots when the player is within this distance.
export const BANDIT_RANGE = 520
// He stays dormant at his spawn until the player first crosses this radius (or he
// takes a hit). Tighter than BANDIT_RANGE so he lets you approach before engaging.
export const BANDIT_AGGRO_RANGE = 250
// After waking by the player crossing his vertical line, he holds for this long
// (does nothing) before he starts moving/shooting — a beat as he commits to the chase.
const LINE_WAKE_DELAY_MS = 900
// Aim error (radians) added to each shot's angle, same cone as the derringer.
// The lead solver stays exact; this hand-shake is what makes the bandit beatable.
export const BANDIT_SPREAD = 0.43
// A bandit holds his ground — a hit staggers him a step, it doesn't launch him.
// Much lighter than the coyote's dart-back knockback.
export const BANDIT_KNOCKBACK = 130
export const BANDIT_KNOCKBACK_MS = 120

// Magazine + reload: fires this many rounds, then is exposed for a long reload
// during which he wants to be behind cover.
export const BANDIT_MAG_SIZE = 5
export const BANDIT_RELOAD_MS = 5000

// Movement.
const WALK_SPEED = 120
// Preferred firing distance: holds a ring this far from the player, like the
// coyote's standoff. Closes in if farther, backs off if closer.
const STANDOFF = 300
const STANDOFF_BAND = 40    // dead zone around STANDOFF so he isn't twitchy
const STRAFE_SPEED = 70     // sideways drift while holding the ring (keeps a live angle)
const ARRIVE = 8            // close enough to a steer target
const STUCK_LIMIT = 6
const FACING_LOCK_MS = 120

// Cover probing: step along a line in this many samples; if any sample is inside
// an obstacle the far end is considered shielded from the near end.
const LOS_SAMPLES = 14
// When hunting for cover, sample this many directions around the bandit at this
// radius and test whether standing there would put an obstacle on the line to
// the player.
const COVER_SCAN_DIRS = 8
const COVER_SCAN_DIST = 120
// How close he must be to his chosen cover spot before he'll stop and hold there.
// Small, so he presses right up against the obstacle rather than loitering near it.
const COVER_HUG_DIST = 14

// Dodging player bullets. He sidesteps shots whose path is bearing at his body —
// but only when the player is far enough away. Up close, shots cross the gap too
// fast to react to, so rushing him denies the dodge entirely.
const DODGE_MIN_PLAYER_DIST = 250  // player nearer than this → no dodge (rush him)
const DODGE_TRIGGER_DIST = 130     // bullet must close to within this of him before he reacts (no flinching at the muzzle)
const DODGE_THREAT_RADIUS = 16     // how near the bullet's path must come to count as aimed
const DODGE_SPEED = 150        // sidestep speed
const DODGE_COMMIT_MS = 180    // once he commits to a sidestep, he holds it this long
const DODGE_COOLDOWN_MS = 650  // after a sidestep, he won't dodge again for this long (one decisive step per threat, no stutter)
const DODGE_CHANCE = 0.85      // fraction of dodgeable threats he actually reacts to

// Melee retreat: a swing at him sends him scrambling away under his own power
// (he steers, so he rounds obstacles) — distinct from the brief knockback shove.
const MELEE_RETREAT_MS = 450    // how long he commits to backing off after a swing
const MELEE_RETREAT_SPEED = 120 // a deliberate backpedal away from the axe



// Muzzle height above the bandit's center (px). Bullets spawn here AND the lead
// solver aims from here — one source of truth so the spawn point and the aim
// origin can never disagree (which biased every shot by this offset before).
export const BANDIT_MUZZLE_DY = -8

// Where a thrown rope catches the bandit and how the leash constrains him. Mirrors
// the coyote's rope model: a pull toward the tether once the rope goes taut, capped
// so it's a tug, not a yank. Velocity only — no teleporting a roped body.
const BANDIT_CATCH_OFFSET_Y = -6   // rope wraps just above center (chest/neck)
const ROPE_TAUT_DIST = 60
const ROPE_PULL_PER_PX = 1.2
const ROPE_PULL_MAX = 70
const ROPED_FLEE_SPEED = 150   // how hard a roped bandit bolts from the player
const ROPED_LEASH_MAX = 160    // never travels past this from the tether
export function getBanditNeckAnchor(b: Bandit): { x: number; y: number } {
  return { x: b.x, y: b.y + BANDIT_CATCH_OFFSET_Y }
}
export function getBanditRopePull(
  b: Bandit,
  tether: { x: number; y: number } | null,
): { vx: number; vy: number } {
  if (!tether) return { vx: 0, vy: 0 }
  const a = getBanditNeckAnchor(b)
  const dx = tether.x - a.x
  const dy = tether.y - a.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist <= ROPE_TAUT_DIST || dist <= 0.0001) return { vx: 0, vy: 0 }
  const pull = Math.min((dist - ROPE_TAUT_DIST) * ROPE_PULL_PER_PX, ROPE_PULL_MAX)
  return { vx: (dx / dist) * pull, vy: (dy / dist) * pull }
}




// Body box for melee/bullet hit-testing and shove. Roughly the standing man's
// footprint; centered on x, dropped slightly so it sits over the feet/torso.
export function getBanditBodyAABB(b: Bandit): { x: number; y: number; w: number; h: number } {
  const W = 12
  const H = 18
  return { x: b.x - W / 2, y: b.y - H / 2, w: W, h: H }
}

export function createBandit(x: number, y: number): Bandit {
  return {
    x, y, vx: 0, vy: 0,
    facingRight: true, facingLockedUntil: 0,
    active: false,
    lastPlayerSide: 0,
    wakeDelayUntil: 0,
    lastFireAt: 0,
    fireDelay: BANDIT_FIRE_COOLDOWN_MS,
    ammo: BANDIT_MAG_SIZE,
    reloadUntil: 0,
    homeX: x, homeY: y,
    stuckFrames: 0,
    health: BANDIT_MAX_HEALTH,
    hurtUntil: 0,
    knockbackUntil: 0,
    dodgeUntil: 0, nextDodgeAt: 0, dodgeX: 0, dodgeY: 0,
    retreatUntil: 0, retreatX: 0, retreatY: 0,
    dying: false,
  }
}

// Kick off a melee retreat: he commits to moving directly away from the attacker
// for MELEE_RETREAT_MS. Wakes him too — getting swung at is provocation. The AI
// loop honors retreatUntil and steers him along this held direction.
export function startBanditRetreat(b: Bandit, fromX: number, fromY: number, gameTime: number) {
  let rx = b.x - fromX
  let ry = b.y - fromY
  const len = Math.sqrt(rx * rx + ry * ry) || 1
  b.retreatX = rx / len
  b.retreatY = ry / len
  b.retreatUntil = gameTime + MELEE_RETREAT_MS
  b.active = true
}

// Intercept solve: given a shooter at (bx,by), a target at (px,py) moving at
// (pvx,pvy), and a bullet of fixed speed `s`, return the unit aim direction that
// makes the bullet and the target arrive at the same point at the same time.
// Returns null when no real positive solution exists (target outrunning the
// bullet directly away) — caller should hold fire or aim at the current spot.
//
// Derivation: we want time t > 0 where |(P - B) + Vp*t| = s*t. Squaring gives a
// quadratic a*t^2 + b*t + c = 0 with:
//   a = Vp·Vp - s^2
//   b = 2 * (D·Vp)        (D = P - B)
//   c = D·D
// The earliest positive root is the soonest intercept.
export function computeLeadDir(
  bx: number, by: number,
  px: number, py: number,
  pvx: number, pvy: number,
  s: number,
): { x: number; y: number } | null {
  const dx = px - bx
  const dy = py - by

  const a = pvx * pvx + pvy * pvy - s * s
  const b = 2 * (dx * pvx + dy * pvy)
  const c = dx * dx + dy * dy

  let t: number
  if (Math.abs(a) < 1e-6) {
    // Target speed ~= bullet speed: quadratic collapses to linear b*t + c = 0.
    if (Math.abs(b) < 1e-6) return null
    t = -c / b
  } else {
    const disc = b * b - 4 * a * c
    if (disc < 0) return null
    const sq = Math.sqrt(disc)
    const t1 = (-b - sq) / (2 * a)
    const t2 = (-b + sq) / (2 * a)
    // smallest strictly-positive root
    t = Math.min(
      t1 > 0 ? t1 : Infinity,
      t2 > 0 ? t2 : Infinity,
    )
    if (!isFinite(t)) return null
  }
  if (t <= 0) return null

  // Future target position, then the unit direction to it.
  const aimX = px + pvx * t
  const aimY = py + pvy * t
  const ax = aimX - bx
  const ay = aimY - by
  const len = Math.sqrt(ax * ax + ay * ay)
  if (len < 1e-6) return null
  return { x: ax / len, y: ay / len }
}

// Line-of-sight probe: walk from (ax,ay) to (bx,by) in LOS_SAMPLES steps and
// return the first blocked point, or null if the line is clear. A blocked point
// means something sits between the two ends — i.e. it's cover relative to (bx,by).
function blockedPointOnLine(
  ax: number, ay: number,
  bx: number, by: number,
  collidesAt: (px: number, py: number) => boolean,
): { x: number; y: number } | null {
  for (let i = 1; i < LOS_SAMPLES; i++) {
    const t = i / LOS_SAMPLES
    const x = ax + (bx - ax) * t
    const y = ay + (by - ay) * t
    if (collidesAt(x, y)) return { x, y }
  }
  return null
}

// Does standing at (x,y) put an obstacle between that spot and the player?
export function hasCoverAt(
  x: number, y: number,
  player: { x: number; y: number },
  collidesAt: (px: number, py: number) => boolean,
): boolean {
  return blockedPointOnLine(x, y, player.x, player.y, collidesAt) !== null
}

// Given a cover point (an obstacle sample between bandit and player), the spot to
// stand is just past it on the side away from the player.
// Given a cover point (an obstacle sample on the line between bandit and player),
// return the spot to stand: pressed up against the obstacle's far face, hugging it
// to cut off the player's angle — the way a person actually takes cover, rather
// than loitering near it. We step from the obstacle surface back toward the
// bandit's own side just enough to clear the obstacle, then probe outward to sit
// as close to it as he can without being inside it.
function behindSpot(
  coverX: number, coverY: number,
  b: Bandit,
  player: { x: number; y: number },
  collidesAt: (px: number, py: number) => boolean,
): { x: number; y: number } {
  // direction from player toward the obstacle (the "away from player" axis)
  let ax = coverX - player.x
  let ay = coverY - player.y
  const alen = Math.sqrt(ax * ax + ay * ay) || 1
  ax /= alen; ay /= alen

  // Walk outward from the obstacle surface, away from the player, and stop at the
  // first clear spot — that's the closest standable point hugging the far face.
  for (let d = 4; d <= 40; d += 4) {
    const sx = coverX + ax * d
    const sy = coverY + ay * d
    if (!collidesAt(sx, sy)) return { x: sx, y: sy }
  }
  // Fallback: a fixed step past the obstacle if the whole sweep was blocked.
  return { x: coverX + ax * 16, y: coverY + ay * 16 }
}

// Pick a cover destination: prefer cover already between us; otherwise scan a
// ring of directions for a standable spot that WOULD give cover. Returns the spot
// to move to, or null when nothing usable is near (caller falls back to home).
function findCoverSpot(
  b: Bandit,
  player: { x: number; y: number },
  collidesAt: (px: number, py: number) => boolean,
  los: (px: number, py: number) => boolean,
): { x: number; y: number } | null {
  // Already shielded? Tuck behind the obstacle that's doing it. (LOS ignores honses.)
  const onLine = blockedPointOnLine(b.x, b.y, player.x, player.y, los)
  if (onLine) return behindSpot(onLine.x, onLine.y, b, player, collidesAt)

  // Otherwise look around for a spot that would put something on the line.
  for (let i = 0; i < COVER_SCAN_DIRS; i++) {
    const a = (i / COVER_SCAN_DIRS) * Math.PI * 2
    const sx = b.x + Math.cos(a) * COVER_SCAN_DIST
    const sy = b.y + Math.sin(a) * COVER_SCAN_DIST
    if (collidesAt(sx, sy)) continue            // can't stand inside an obstacle (honse included)
    if (hasCoverAt(sx, sy, player, los)) return { x: sx, y: sy }
  }
  return null
}

// A bullet threat the bandit can see: position + velocity, straight-line travel.
export interface Threat {
  x: number
  y: number
  vx: number
  vy: number
}

// Decide whether the bandit should dodge an incoming bullet, and which way to
// step. Returns a unit sidestep direction, or null if nothing warrants a dodge.
//
// For each threat we work in the bullet's frame: the bandit's position relative
// to the bullet, and his closing along the bullet's travel direction. The closest
// the bullet's path comes to him (perp distance) tells us if it's aimed at him;
// the along-track distance tells us how far out it still is (his reaction gate)
// and when it would arrive (lookahead). The dodge is perpendicular to the
// bullet's travel, toward whichever side he already is relative to its line.
function pickDodge(
  b: Bandit,
  threats: Threat[],
  rng: () => number,
): { x: number; y: number } | null {
  for (const t of threats) {
    const speed = Math.sqrt(t.vx * t.vx + t.vy * t.vy)
    if (speed < 1e-3) continue
    const dirX = t.vx / speed
    const dirY = t.vy / speed

    // bandit relative to the bullet
    const rx = b.x - t.x
    const ry = b.y - t.y

    // along-track: how far ahead of the bullet he is (negative = behind it, safe)
    const along = rx * dirX + ry * dirY
    if (along <= 0) continue                      // bullet already past him
    // Don't react until the bullet has actually closed in. `along` is how far the
    // bullet still has to travel to reach his level — a fresh shot from across the
    // map has a huge `along`, so this stops him flinching the instant you fire.
    if (along > DODGE_TRIGGER_DIST) continue

    // perpendicular miss distance of the bullet's path from his body
    const perp = rx * (-dirY) + ry * (dirX)
    if (Math.abs(perp) > DODGE_THREAT_RADIUS) continue   // it'll miss anyway

    // It's aimed at him and he has time. Maybe react.
    if (rng() > DODGE_CHANCE) continue

    // Step perpendicular to the bullet, away from its line (toward his side).
    let sx = -dirY
    let sy = dirX
    if (perp < 0) { sx = -sx; sy = -sy }   // flip to push him further off the line
    return { x: sx, y: sy }
  }
  return null
}

// Steer the bandit toward (tx,ty) at `speed`, with axis-separated collision and
// stuck detection. Returns whether it actually moved this frame.
function steerTo(
  b: Bandit,
  tx: number, ty: number,
  speed: number,
  step: number,
  collidesAt: (px: number, py: number) => boolean,
): boolean {
  let dx = tx - b.x
  let dy = ty - b.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist <= ARRIVE) { b.vx = 0; b.vy = 0; return false }
  dx /= dist; dy /= dist
  b.vx = dx * speed
  b.vy = dy * speed

  let moved = false
  if (b.vx !== 0) {
    const nx = b.x + b.vx * step
    if (!collidesAt(nx, b.y)) { b.x = nx; moved = true }
  }
  if (b.vy !== 0) {
    const ny = b.y + b.vy * step
    if (!collidesAt(b.x, ny)) { b.y = ny; moved = true }
  }
  return moved
}

function updateFacing(b: Bandit, gameTime: number, towardX: number) {
  if (gameTime < b.facingLockedUntil) return
  const want = towardX >= b.x
  if (want !== b.facingRight) {
    b.facingRight = want
    b.facingLockedUntil = gameTime + FACING_LOCK_MS
  }
}

export function updateBandits(
  bandits: Bandit[],
  dt: number,
  gameTime: number,
  collidesAt: (px: number, py: number) => boolean,
  // Like collidesAt but ignores honses — used for shooting line-of-sight and cover
  // checks so a horse is never treated as cover (he'll fire through/at it). Movement
  // still uses collidesAt, so he won't walk through a horse.
  blocksLineOfSight: (px: number, py: number) => boolean,
  player: { x: number; y: number; vx: number; vy: number },
  bulletSpeed: number,
  fire: (banditIndex: number, dirX: number, dirY: number) => void,
  threats: Threat[],
  rng: () => number,
  getTetherAnchor: (banditIndex: number) => { x: number; y: number } | null,
) {
  const step = dt / 1000
  for (let i = 0; i < bandits.length; i++) {
    const b = bandits[i]
    if (b.dying) continue



    // Knockback window: carry the impulse velocity into position, skip AI.
    if (gameTime < b.knockbackUntil) {
      const nx = b.x + b.vx * step
      if (!collidesAt(nx, b.y)) b.x = nx
      const ny = b.y + b.vy * step
      if (!collidesAt(b.x, ny)) b.y = ny
      continue
    }

    // Roped: he fights the leash like the coyote — bolts away from the player with
    // the rope pull added on top, capped so he can't cross the leash. This replaces
    // his combat AI (a roped man is struggling, not shooting). Velocity-integrated,
    // never teleported; knockback above still interrupts.
    const tether = getTetherAnchor(i)
    if (tether) {
      const fdx = b.x - player.x
      const fdy = b.y - player.y
      const fdist = Math.sqrt(fdx * fdx + fdy * fdy) || 0.0001
      let vx = (fdx / fdist) * ROPED_FLEE_SPEED
      let vy = (fdy / fdist) * ROPED_FLEE_SPEED
      const pull = getBanditRopePull(b, tether)
      vx += pull.vx
      vy += pull.vy
      if (vx !== 0) {
        const nx = b.x + vx * step
        if (!collidesAt(nx, b.y)) b.x = nx
      }
      if (vy !== 0) {
        const ny2 = b.y + vy * step
        if (!collidesAt(b.x, ny2)) b.y = ny2
      }
      // hard leash cap: never past ROPED_LEASH_MAX from the tether
      const rx = b.x - tether.x
      const ry = b.y - tether.y
      const dsq = rx * rx + ry * ry
      if (dsq > ROPED_LEASH_MAX * ROPED_LEASH_MAX) {
        const d = Math.sqrt(dsq)
        b.x = tether.x + (rx / d) * ROPED_LEASH_MAX
        b.y = tether.y + (ry / d) * ROPED_LEASH_MAX
      }
      updateFacing(b, gameTime, player.x)
      continue
    }

    const dx = player.x - b.x
    const dy = player.y - b.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // ---- Dormant: hold at spawn until provoked ----
    // Wakes when the player comes within BANDIT_AGGRO_RANGE, OR when the player
    // crosses his vertical line (his X) from either side at any distance — he's
    // lying in wait and breaks cover the moment someone slips past him. Once active
    // he stays active. Taking a hit also wakes him (see the damage path).
    if (!b.active) {
      const side = Math.sign(dx)   // which side of his X the player is on this frame
      // A crossing: the player was on one side last frame and the opposite side now.
      const crossedLine = b.lastPlayerSide !== 0 && side !== 0 && side !== b.lastPlayerSide
      b.lastPlayerSide = side
      if (dist <= BANDIT_AGGRO_RANGE || crossedLine) {
        b.active = true
        // Only a line-crossing wake gets the hold; a proximity wake engages at once.
        if (crossedLine && dist > BANDIT_AGGRO_RANGE) b.wakeDelayUntil = gameTime + LINE_WAKE_DELAY_MS
      } else {
        updateFacing(b, gameTime, player.x)   // watch the player, but don't move or shoot
        b.vx = 0; b.vy = 0
        continue
      }
    }

    // ---- Line-wake hold: just woken by a crossing → do nothing for the delay ----
    // Frozen completely (no facing, no move, no fire) until the beat passes, then
    // normal AI resumes. Knockback (handled above) still interrupts this.
    if (gameTime < b.wakeDelayUntil) {
      b.vx = 0; b.vy = 0
      continue
    }

    // ---- Melee retreat: swung at → scramble away (overrides other movement) ----
    // He moves under his own power via steerTo along the held away-direction, so
    // he rounds obstacles instead of being shoved through them. Outlasts the brief
    // knockback shove, which is handled above.
    if (gameTime < b.retreatUntil) {
      updateFacing(b, gameTime, player.x)
      const tx = b.x + b.retreatX * 1000
      const ty = b.y + b.retreatY * 1000
      steerTo(b, tx, ty, MELEE_RETREAT_SPEED, step, collidesAt)
      continue
    }

    // ---- Dodge incoming player bullets (reflex; overrides other movement) ----
    // Spot a fresh threat → commit to a sidestep for a short window. While that
    // window is live, the sidestep is the only movement; his aim/cover logic
    // resumes once it lapses. He still can't act during knockback (handled above).
    // He can ONLY dodge when the player is far enough away — up close, shots are on
    // him too fast to react to, so rushing him denies the dodge.
    if (gameTime >= b.dodgeUntil && gameTime >= b.nextDodgeAt && dist > DODGE_MIN_PLAYER_DIST) {
      const d = pickDodge(b, threats, rng)
      if (d) {
        b.dodgeX = d.x; b.dodgeY = d.y
        b.dodgeUntil = gameTime + DODGE_COMMIT_MS
        b.nextDodgeAt = gameTime + DODGE_COMMIT_MS + DODGE_COOLDOWN_MS
      }
    }
    if (gameTime < b.dodgeUntil) {
      updateFacing(b, gameTime, player.x)
      const nx = b.x + b.dodgeX * DODGE_SPEED * step
      if (!collidesAt(nx, b.y)) b.x = nx
      const ny = b.y + b.dodgeY * DODGE_SPEED * step
      if (!collidesAt(b.x, ny)) b.y = ny
      continue
    }

    // ---- Reloading: seek cover, then hold ----
    if (b.reloadUntil !== 0) {
      if (gameTime >= b.reloadUntil) {
        // reload done
        b.reloadUntil = 0
        b.ammo = BANDIT_MAG_SIZE
      } else {
        updateFacing(b, gameTime, player.x)
        const spot = findCoverSpot(b, player, collidesAt, blocksLineOfSight)
        const target = spot ?? { x: b.homeX, y: b.homeY }
        // Keep closing on the cover target until he's actually pressed up against
        // it — not just the moment he first has any line-of-sight block. This is
        // what makes him hug the obstacle and cut the angle instead of loitering.
        const tdx = target.x - b.x
        const tdy = target.y - b.y
        const atCover = (tdx * tdx + tdy * tdy) <= COVER_HUG_DIST * COVER_HUG_DIST
        if (!(atCover && hasCoverAt(b.x, b.y, player, blocksLineOfSight))) {
          const moved = steerTo(b, target.x, target.y, WALK_SPEED, step, collidesAt)
          if (!moved && (b.vx !== 0 || b.vy !== 0)) {
            // wedged; nudge so he doesn't grind a corner forever
            if (++b.stuckFrames >= STUCK_LIMIT) b.stuckFrames = 0
          } else {
            b.stuckFrames = 0
          }
        } else {
          b.vx = 0; b.vy = 0
        }
        continue
      }
    }

    // ---- Out of range: close the distance toward the player ----
    const inRange = dist <= BANDIT_RANGE
    if (!inRange) {
      updateFacing(b, gameTime, player.x)
      steerTo(b, player.x, player.y, WALK_SPEED, step, collidesAt)
      continue
    }

    // ---- In range: hold the standoff ring, strafe to keep a live angle ----
    updateFacing(b, gameTime, player.x)
    if (dist > STANDOFF + STANDOFF_BAND) {
      // too far — move in
      steerTo(b, player.x, player.y, WALK_SPEED, step, collidesAt)
    } else if (dist < STANDOFF - STANDOFF_BAND) {
      // too close — back straight off, away from the player
      const tx = b.x - (dx / (dist || 1)) * 50
      const ty = b.y - (dy / (dist || 1)) * 50
      steerTo(b, tx, ty, WALK_SPEED, step, collidesAt)
    } else {
      // in the band — strafe perpendicular to the player to keep moving
      const nx = -(dy / (dist || 1))
      const ny = (dx / (dist || 1))
      const tx = b.x + nx * STRAFE_SPEED
      const ty = b.y + ny * STRAFE_SPEED
      const moved = steerTo(b, tx, ty, STRAFE_SPEED, step, collidesAt)
      if (!moved) { b.vx = 0; b.vy = 0 }
    }

    // ---- Fire ----
    if (gameTime - b.lastFireAt < b.fireDelay) continue
    // only shoot if there's a clear line to the player (honses don't count as cover)
    if (hasCoverAt(b.x, b.y, player, blocksLineOfSight)) continue
    // Aim from the muzzle (where the bullet actually spawns), not his center, so
    // the computed lead matches the real shot origin.
    const dir = computeLeadDir(b.x, b.y + BANDIT_MUZZLE_DY, player.x, player.y, player.vx, player.vy, bulletSpeed)
    if (!dir) continue

    b.lastFireAt = gameTime
    b.fireDelay = BANDIT_FIRE_COOLDOWN_MS + rng() * BANDIT_FIRE_JITTER_MS
    b.ammo -= 1
    fire(i, dir.x, dir.y)
    if (b.ammo <= 0) b.reloadUntil = gameTime + BANDIT_RELOAD_MS
  }
}
