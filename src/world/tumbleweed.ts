// Tumbleweeds — atmospheric objects that roll west→east on wind and bounce on
// a real floor, all resolved by the Matter physics engine. Each weed is a
// dynamic circle body. Each weed also gets its own invisible STATIC floor body
// — a long thin bar at the weed's spawn Y, spanning its eastward path. Gravity
// is a real downward force applied every frame (the world's shared gravity is
// off and points screen-south, so we apply our own downward force per body);
// the engine handles the fall and the bounce off the floor via the body's
// restitution. Wind is a steady eastward force. The player and all obstacles
// collide with the weed natively because it's a normal physics body — nothing
// is hand-placed or teleported.

import Phaser from 'phaser'
import { depthForY } from '../game/state'

// Forces (per frame). Matter forces are tiny — scaled by body mass.
// The wind FLUCTUATES: its eastward push rises and falls over time (gusts),
// and at the peak of each gust it adds an upward kick. The weed is a real
// physics body, so the engine takes these forces and does everything else —
// lifts it on a gust, arcs it under gravity, lands and bounces it off the
// floor. No timer, no hand-rolled vertical motion: just varying wind in,
// physics out.
const WIND_BASE = 0.00003     // baseline eastward push
const WIND_GUST = 0.000022    // how much the gust adds/removes on top of base
const GUST_LIFT = 0.000052     // upward kick at the peak of a gust
const GUST_SPEED = 0.0003     // radians/ms — how fast gusts come and go
const GRAVITY_FORCE = 0.00005 // downward push (our own per-body gravity)

// Body tuning
const RADIUS = 6
const DENSITY = 0.0008
const FRICTION_AIR = 0.04     // air drag
const RESTITUTION = 0.7       // bounciness off the floor + obstacles
const SPRITE_SCALE = 2
const SPIN_FACTOR = 0.015     // visual roll per unit of horizontal speed

// Floor body: a long thin static bar at the weed's spawn Y that it bounces on.
const FLOOR_THICKNESS = 20
const FLOOR_LENGTH = 6000     // long enough to span the weed's whole eastward run

// Collision categories. These mirror the rope's scheme (world = 0x0001,
// honse = 0x0002); the tumbleweed gets its own bit so its private floor bar can
// be made to collide with ONLY tumbleweeds. Without this the static floor body
// defaults to "collide with everything" and becomes a 6000px invisible wall
// that snags honses, the player, and rope — which it must never touch.
const CAT_WORLD = 0x0001
const CAT_TUMBLEWEED = 0x0004

// Spawn tuning
const SPAWN_INTERVAL = 350000
const MAX_ALIVE = 3
const DESPAWN_MARGIN = 800
// Weeds enter this far left of the view, across a band extending this far above
// and below it, so they roll in from off-screen and from off-latitude.
const SPAWN_LEFT_MARGIN = 300
const SPAWN_VERTICAL_MARGIN = 540

interface Tumbleweed {
  sprite: Phaser.GameObjects.Sprite
  body: MatterJS.BodyType
  floor: MatterJS.BodyType   // this weed's private static floor
  angle: number
  gustPhase: number          // offsets this weed's gust cycle so they vary
}

const tumbleweeds: Tumbleweed[] = []
let nextSpawnAt = 0

function rollNextSpawn(now: number) {
  nextSpawnAt = now + SPAWN_INTERVAL
}

export function spawnTumbleweed(scene: Phaser.Scene, atX?: number, atY?: number, bypassCap = false) {
  if (!bypassCap && tumbleweeds.length >= MAX_ALIVE) return

  let x: number, y: number

  if (atX !== undefined && atY !== undefined) {
    // Explicit placement (dev console).
    x = atX
    y = atY
  } else {
    // Automatic spawn: enter just off the LEFT of the screen and roll in,
    // across a vertical band taller than the view so some weeds drift through
    // from above/below the player's latitude rather than only dead-centre.
    // Camera-relative, so it's independent of the world's size.
    const v = scene.cameras.main.worldView
    x = v.x - SPAWN_LEFT_MARGIN
    y = (v.y - SPAWN_VERTICAL_MARGIN) + Math.random() * (v.height + SPAWN_VERTICAL_MARGIN * 2)
  }

  const sprite = scene.add.sprite(x, y, 'tumbleweed')
    .setScale(SPRITE_SCALE)
    .setDepth(depthForY(y))

  // The weed: a normal dynamic circle. The engine owns its motion entirely.
  // It keeps colliding with the world (rocks/buildings) and with its own floor.
  const body = scene.matter.add.circle(x, y, RADIUS, {
    density: DENSITY,
    frictionAir: FRICTION_AIR,
    restitution: RESTITUTION,
    friction: 0.01,
    label: 'tumbleweed',
    collisionFilter: { category: CAT_TUMBLEWEED, mask: CAT_WORLD | CAT_TUMBLEWEED },
  })

  // A real STATIC floor body just below the spawn point, spanning the eastward
  // path. The engine bounces the weed off this — no hand-rolled ground check.
  // Centered FLOOR_LENGTH/2 to the east so it covers where the weed will roll.
  // Filtered to collide with ONLY tumbleweeds (mask = CAT_TUMBLEWEED), so this
  // long invisible bar is intangible to honses, the player, rope — everything
  // except the weed it exists to catch.
  const floorY = y + RADIUS + FLOOR_THICKNESS / 2
  const floor = scene.matter.add.rectangle(
    x + FLOOR_LENGTH / 2,
    floorY,
    FLOOR_LENGTH,
    FLOOR_THICKNESS,
    {
      isStatic: true,
      label: 'tumbleweed-floor',
      collisionFilter: { category: CAT_TUMBLEWEED, mask: CAT_TUMBLEWEED },
    },
  )

  // Give it a small eastward nudge so it enters moving; gravity + wind take over.
  scene.matter.body.setVelocity(body, { x: 1 + Math.random(), y: -2 - Math.random() * 2 })

  tumbleweeds.push({ sprite, body, floor, angle: Math.random() * Math.PI * 2, gustPhase: Math.random() * Math.PI * 2 })
}

export function updateTumbleweeds(
  scene: Phaser.Scene,
  playerX: number,
  playerY: number,
  playerHalf: number,
) {
  const now = scene.time.now

  // ---- spawn timer ----
  if (nextSpawnAt === 0) rollNextSpawn(now)
  if (now >= nextSpawnAt) {
    spawnTumbleweed(scene)
    rollNextSpawn(now)
  }

  const worldBounds = scene.cameras.main.worldView

  for (let i = tumbleweeds.length - 1; i >= 0; i--) {
    const tw = tumbleweeds[i]

    // ---- fluctuating wind + gravity, all as engine forces ----
    // The steady east wind (WIND_BASE) always drifts the weed right. When a
    // gust kicks in (positive half of the sine) it shoves the weed NORTH-WEST
    // — up and back-left — against that drift, then eases off and the weed
    // resumes drifting east. Only the gusts push NW. The engine does the rest.
    const gust = Math.sin(now * (GUST_SPEED) + tw.gustPhase)   // −1..1
    const gustStrength = Math.max(0, gust)   // only the positive half gusts
    const windX = (WIND_BASE - gustStrength * WIND_GUST)   // west during gust
    const liftY = -gustStrength * GUST_LIFT                            // north during gust
    scene.matter.body.applyForce(tw.body, tw.body.position, {
      x: windX,
      y: (GRAVITY_FORCE + liftY),
    })

    const bx = tw.body.position.x
    const by = tw.body.position.y

    // ---- spin proportional to horizontal speed ----
    tw.angle += SPIN_FACTOR * Math.abs(tw.body.velocity.x)

    // ---- sprite tracks the body (one position) ----
    tw.sprite.x = bx
    tw.sprite.y = by
    tw.sprite.rotation = tw.angle
    tw.sprite.setDepth(depthForY(by))

    // ---- player bounce: the player isn't a Matter body, so push the weed
    // away manually with a velocity impulse. The engine carries it from there.
    const dx = bx - playerX
    const dy = by - playerY
    const distSq = dx * dx + dy * dy
    const touchDist = RADIUS * SPRITE_SCALE + playerHalf
    if (distSq < touchDist * touchDist && distSq > 0.01) {
      const dist = Math.sqrt(distSq)
      scene.matter.body.setVelocity(tw.body, {
        x: (dx / dist) * 4,
        y: (dy / dist) * 4,
      })
    }

    // ---- despawn once well past the right edge of the view; remove body AND its floor ----
    const rightEdge = worldBounds.right + DESPAWN_MARGIN
    if (bx > rightEdge) {
      tw.sprite.destroy()
      scene.matter.world.remove(tw.body)
      scene.matter.world.remove(tw.floor)
      tumbleweeds.splice(i, 1)
    }
  }
}

export function clearTumbleweeds(scene: Phaser.Scene) {
  for (const tw of tumbleweeds) {
    tw.sprite.destroy()
    scene.matter.world.remove(tw.body)
    scene.matter.world.remove(tw.floor)
  }
  tumbleweeds.length = 0
  nextSpawnAt = 0
}
