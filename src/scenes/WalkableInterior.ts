// WalkableInterior.ts — reusable builder for walk-in interior spaces.
// Used by abandoned house, future barns, etc. Unlike the panel-based interiors,
// this renders a mini room with a walkable player sprite, item pickups, and
// an exit hitbox near the door.
//
// Item state persists across visits via state.walkableInteriors, keyed by
// `stateKey` (e.g. "abandoned_house:3"). The first visit seeds state from
// the spawn config; later visits read from state directly. Picked-up items
// are spliced out and never respawn.

import Phaser from 'phaser'
import { COLORS } from '../colors'
import { state, PLAYER_BASE_SPEED, CHEST_SLOTS, type WalkableInteriorItemInstance } from '../game/state'
import { ITEMS, type ItemType, type ItemStack } from '../items/types'
import { buildInteriorBackdrop, SIDE_WALL_INSET } from './InteriorBackdrop'
import { UI_INVENTORY_BAR_HEIGHT, UI } from './UI'
import { makeRng } from '../world/gen'
import { grabHover } from '../ui/hover'

// ---- config shape ----

// Spawn-config item: only used to seed state on the first visit to a given
// walkable interior. After that, state is the source of truth.
export interface WalkableInteriorItem {
  x: number   // 0..1 fraction of floor width
  y: number   // 0..1 fraction of floor height
  type: ItemType
  count?: number   // stack size, defaults to 1
}

export interface WalkableInteriorConfig {
  // Unique identifier for this specific interior (e.g. "abandoned_house:3").
  // State lookup key — items in state.walkableInteriors[stateKey] persist
  // across visits.
  stateKey: string
  floorColor: number
  wallColor: number
  floorTexture?: string         // optional repeating floor texture key
  floorTextureScale?: number    // tile pixel scale; defaults to 2
  wallHeightFraction: number   // e.g. 0.33 → top third is wall
  // Initial item layout. Only used to seed state on the first visit.
  initialItems?: WalkableInteriorItem[]
  openSide?: 'left' | 'right'
  // Optional lootable crate. On first visit a seeded roll decides whether the
  // crate exists; if it does, its slots are filled from crateContents. The
  // result persists in state.walkableInteriorCrates[stateKey].
  crateSeed?: number          // deterministic seed for the spawn roll
  crateSpawnChance?: number   // 0..1 probability the crate exists (default 1)
  crateContents?: WalkableInteriorItem[]   // items placed into the crate's slots
  cratePos?: { x: number; y: number }      // 0..1 floor-fraction position
  crateItem?: ItemType                     // container sprite/item; defaults to 'chest'
}

export interface WalkableInteriorHandle {
  update: (dt: number) => void
  onCleanup: () => void
}

// ---- constants ----

const INTERIOR_SCALE = 2           // player renders 2x overworld scale
const PLAYER_SCALE = 2 * INTERIOR_SCALE   // overworld is 2, interior is 4
const ITEM_SCALE_MULT = 1.5               // items scale up slightly, not tied to player
// How fast the interior chest yields when pushed, as a fraction of the player's
// speed. Low = super heavy (grinds forward slowly). 1.0 ≈ keeps pace with player.
const INTERIOR_CHEST_PUSH_FACTOR = 0.25
const PLAYER_HALF = 5 * INTERIOR_SCALE   // collision half-extent, scaled to the 2x interior render
const PICKUP_RADIUS = 18
const PICKUP_ATTRACT_RADIUS = 40
const PICKUP_ATTRACT_EASE = 0.25
const EXIT_ZONE_H = 22

// ---- builder ----

export function buildWalkableInterior(
  scene: Phaser.Scene,
  config: WalkableInteriorConfig,
  exitFn: () => void,
): WalkableInteriorHandle {
  // ---- backdrop (wall, windows, floor, side walls) ----
  const { floorTop, floorH, w } = buildInteriorBackdrop(scene, {
    floorColor: config.floorColor,
    wallColor: config.wallColor,
    wallHeightFraction: config.wallHeightFraction,
    openSide: config.openSide,
    floorTexture: config.floorTexture,
    floorTextureScale: config.floorTextureScale,
  })

  if (config.openSide) {
    const floorBottom = floorTop + floorH
    const bottomWallH = floorH * 0.25
    scene.add.rectangle(w / 2, floorBottom - bottomWallH / 2, w, bottomWallH, config.wallColor).setDepth(-5)
  }

  // ---- seed state on first visit, then read from state ----
  if (state.walkableInteriors[config.stateKey] === undefined) {
    state.walkableInteriors[config.stateKey] = (config.initialItems ?? []).map<WalkableInteriorItemInstance>(it => ({
      x: it.x,
      y: it.y,
      type: it.type,
      count: it.count ?? 1,
    }))
  }
  const liveItems = state.walkableInteriors[config.stateKey]

  // ---- seed the crate on first visit, then read from state ----
  // undefined = never visited. After seeding it is either null (rolled no crate)
  // or an object with a contents grid.
  if (state.walkableInteriorCrates[config.stateKey] === undefined) {
    const rng = makeRng(config.crateSeed ?? 0)
    const chance = config.crateSpawnChance ?? 1
    const contents: (ItemStack | null)[] = Array.from({ length: CHEST_SLOTS }, () => null)
    if (rng() < chance && config.crateContents !== undefined) {
      config.crateContents.forEach((it, i) => {
        if (i < CHEST_SLOTS) contents[i] = { type: it.type, count: it.count ?? 1 }
      })
    }
    state.walkableInteriorCrates[config.stateKey] = { contents }
  }
  const crateState = state.walkableInteriorCrates[config.stateKey]

  // Sloped side-wall lines as a function of world-Y. Single source of truth for
  // where the angled walls sit at a given depth — used to clamp both the player
  // and the crate so they share one wall definition. null = that side is open.
  const wallX = (yPx: number): { left: number | null; right: number | null } => {
    const yFrac = (yPx - floorTop) / floorH
    const inset = w * SIDE_WALL_INSET * (1 - yFrac)
    if (config.openSide === 'left') {
      return { left: null, right: w * (1 - 0.35) - inset }
    } else if (config.openSide === 'right') {
      return { left: w * 0.35 + inset, right: null }
    }
    return { left: inset, right: w - inset }
  }

  // ---- player ----
  const playerStartX = config.openSide === 'left' ? EXIT_ZONE_H + PLAYER_HALF + 20
    : config.openSide === 'right' ? w - EXIT_ZONE_H - PLAYER_HALF - 20
    : w / 2
  const playerStartY = config.openSide
    ? floorTop + floorH / 2
    : floorTop + floorH - UI_INVENTORY_BAR_HEIGHT - 30
  const player = scene.add.sprite(playerStartX, playerStartY, 'player')
    .setScale(PLAYER_SCALE)
    .setDepth(900)

  // ---- input ----
  const wasd = scene.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>
  const arrows = scene.input.keyboard!.createCursorKeys()
  const eKey = scene.input.keyboard!.addKey('E')

  // ---- floor item sprites — one per live item, sharing index with state ----
  // We keep a parallel sprite array indexed alongside liveItems. When a state
  // entry is picked up, we splice both arrays at the same index.
  const floorSprites: (Phaser.GameObjects.Sprite | null)[] = []
  for (const item of liveItems) {
    const ix = Math.round(w * item.x)
    const iy = Math.round(floorTop + floorH * item.y)
    const def = ITEMS[item.type]
    const sprite = scene.add.sprite(ix, iy, def.sprite)
      .setScale(def.scale * ITEM_SCALE_MULT)
      .setDepth(800)
    floorSprites.push(sprite)
  }

  // ---- crate sprite ----
  // Rendered only when this interior was seeded with a crate. Clicking it opens
  // the shared crate panel against the crate's persisted contents.
  let crateSprite: Phaser.GameObjects.Sprite | null = null
  let crateBody: MatterJS.BodyType | null = null
  let crateHalfW = 0
  let crateHalfH = 0
  let crateHovered = false
  if (crateState) {
    const pos = config.cratePos ?? { x: 0.5, y: 0.5 }
    const cx = Math.round(w * pos.x)
    const cy = Math.round(floorTop + floorH * pos.y)
    const crateDef = ITEMS[config.crateItem ?? 'chest']
    crateSprite = scene.add.sprite(cx, cy, crateDef.sprite)
      .setScale(crateDef.scale * ITEM_SCALE_MULT)
      .setDepth(cy)
      .setInteractive()
    // Collision box derived from the rendered sprite footprint (not a magic
    // number) so blocking matches what the player sees at interior scale.
    crateHalfW = crateSprite.displayWidth / 2
    crateHalfH = crateSprite.displayHeight / 2
    // Dynamic Matter body: pushable and decays after a shove, like overworld crates.
    crateBody = scene.matter.add.rectangle(cx, cy, crateSprite.displayWidth, crateSprite.displayHeight, { frictionAir: 0.2 })
    crateSprite.on('pointerdown', () => {
      const ddx = player.x - crateBody!.position.x
      const ddy = player.y - crateBody!.position.y
      if (ddx * ddx + ddy * ddy <= 80 * 80) {
        scene.registry.events.emit('open-interior-crate', crateState.contents)
      }
    })
    // Grab cursor on hover, matching the overworld crate. Sets an explicit flag
    // (not the cross-scene hit-test) so the hot zone lines up with the sprite.
    crateSprite.on('pointerover', () => { crateHovered = true })
    crateSprite.on('pointerout', () => { crateHovered = false; grabHover.active = false })
  }

  // ---- floating "E" prompt above the crate when player is in range ----
  let ePrompt: Phaser.GameObjects.Container | null = null
  if (crateSprite) {
    const E_SIZE = 20
    const shadow = scene.add.bitmapText(1.5, 1.5, 'main', 'E', E_SIZE).setOrigin(0.5, 1)
      .setTint(0x303030).setBlendMode(Phaser.BlendModes.MULTIPLY)
    const main = scene.add.bitmapText(0, 0, 'main', 'E', E_SIZE).setOrigin(0.5, 1)
      .setTint(COLORS.uiText)
    ePrompt = scene.add.container(0, 0, [shadow, main]).setDepth(100000).setVisible(false)
  }

  // ---- update loop ----
  const update = (dt: number) => {
    const owBase = (state.playerSpeedOverride ?? PLAYER_BASE_SPEED) + 60
    const buffed = state.gameTime < state.speedBuffEndsAt
    const owSpeed = owBase + (buffed ? state.speedBuffAmount : 0)
    const step = (owSpeed * dt) / 1000
    let dx = 0
    let dy = 0
    if (wasd.A.isDown || arrows.left!.isDown) dx -= 1
    if (wasd.D.isDown || arrows.right!.isDown) dx += 1
    if (wasd.W.isDown || arrows.up!.isDown) dy -= 1
    if (wasd.S.isDown || arrows.down!.isDown) dy += 1
    if (dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2 }

    // clamp to floor bounds
    const minX = PLAYER_HALF
    const maxX = w - PLAYER_HALF
    const minY = floorTop + PLAYER_HALF
const maxY = floorTop + floorH - PLAYER_HALF
    // Crate collision: player (center+half) vs crate body (center+half), both
    // axis-aligned. Uses the body's live position so a shoved crate blocks from
    // its new spot.
    const crateBlocks = (px: number, py: number): boolean => {
      if (!crateBody) return false
      const bx = crateBody.position.x
      const by = crateBody.position.y
      return px + PLAYER_HALF > bx - crateHalfW
        && px - PLAYER_HALF < bx + crateHalfW
        && py + PLAYER_HALF > by - crateHalfH
        && py - PLAYER_HALF < by + crateHalfH
    }

    // Push: if the next position would enter the crate, shove its Matter body
    // in the move direction (velocity only — never write the body's position).
    if (crateBody && (dx !== 0 || dy !== 0)) {
      const npx = player.x + dx * step
      const npy = player.y + dy * step
      if (crateBlocks(npx, npy)) {
        if (crateBody.isSleeping) { crateBody.isSleeping = false; (crateBody as any).sleepCounter = 0 }
        // Super heavy: the chest yields only a fraction of the player's speed, so
        // it grinds forward slowly and feels weighty to shove around the room.
        const pushSpeed = (owSpeed / 60) * INTERIOR_CHEST_PUSH_FACTOR
        scene.matter.body.setVelocity(crateBody, { x: dx * pushSpeed, y: dy * pushSpeed })
      }
    }

    // Axis-separated commit so the player slides along the crate edge instead
    // of sticking. Each axis is rejected independently if it enters the crate.
    const tryX = Phaser.Math.Clamp(player.x + dx * step, 0, w)
    if (!crateBlocks(tryX, player.y)) player.x = tryX
    const tryY = Phaser.Math.Clamp(player.y + dy * step, minY, maxY)
    if (!crateBlocks(player.x, tryY)) player.y = tryY

    const pWalls = wallX(player.y)
    if (pWalls.left !== null) player.x = Math.max(player.x, pWalls.left + PLAYER_HALF)
    if (pWalls.right !== null) player.x = Math.min(player.x, pWalls.right - PLAYER_HALF)

    if (config.openSide) {
      const bottomWallTop = floorTop + floorH - floorH * 0.25
      player.y = Math.min(player.y, bottomWallTop - PLAYER_HALF - 10)
    }

    // ---- E prompt above crate when player is in range ----
    if (ePrompt && crateBody) {
      const ddx = player.x - crateBody.position.x
      const ddy = player.y - crateBody.position.y
      const inRange = ddx * ddx + ddy * ddy <= 80 * 80
      const ui = scene.scene.get('UI') as UI
      if (inRange && !ui.isCrateOpen()) {
        ePrompt.setPosition(crateBody.position.x, crateBody.position.y - crateHalfH - 8).setVisible(true)
      } else {
        ePrompt.setVisible(false)
      }
    }

    // pickup items — walk through liveItems in reverse so splice indexing
    // stays safe within the loop.
    const pickSq = PICKUP_RADIUS * PICKUP_RADIUS
    const attractSq = PICKUP_ATTRACT_RADIUS * PICKUP_ATTRACT_RADIUS
    for (let i = liveItems.length - 1; i >= 0; i--) {
      const it = liveItems[i]
      const sprite = floorSprites[i]
      if (!sprite) continue
      const ddx = player.x - sprite.x
      const ddy = player.y - sprite.y
      const distSq = ddx * ddx + ddy * ddy
      if (distSq > pickSq) {
        if (distSq <= attractSq && state.roomFor(it) > 0) {
          sprite.x += ddx * PICKUP_ATTRACT_EASE
          sprite.y += ddy * PICKUP_ATTRACT_EASE
        }
        continue
      }
      const added = state.inventoryAddAnywhere({ type: it.type, count: it.count })
      if (added > 0) {
        sprite.destroy()
        liveItems.splice(i, 1)
        floorSprites.splice(i, 1)
        scene.registry.events.emit('inventory-changed')
      }
    }

    // Bound the crate to the floor and the angled side walls. The side walls are
    // diagonal, so a violation can come from horizontal OR vertical motion (push
    // straight up and the receding wall would otherwise slip past the crate). We
    // remove the velocity component pointing *out* through the wall along the
    // wall's inward normal — handling both axes. Velocity only; never repositioned.
    if (crateBody) {
      const v = crateBody.velocity
      const bx = crateBody.position.x
      const by = crateBody.position.y
      const walls = wallX(by)
      let nvx = v.x
      let nvy = v.y
      // dWallX/dy: the side wall insets by k*(1 - yFrac), so x_wall changes by
      // -k/floorH (left) or +k/floorH (right) per unit y. Used to build the
      // wall's inward normal.
      const slope = (w * SIDE_WALL_INSET) / floorH
      // Left wall: inward normal points right-and-down ~ (1, slope), normalized.
      if (walls.left !== null && bx - crateHalfW <= walls.left) {
        const nx = 1, ny = slope
        const len = Math.hypot(nx, ny)
        const outward = -(nvx * nx + nvy * ny) / len   // >0 = moving out through wall
        if (outward > 0) { nvx += outward * nx / len; nvy += outward * ny / len }
      }
      // Right wall: inward normal points left-and-down ~ (-1, slope), normalized.
      if (walls.right !== null && bx + crateHalfW >= walls.right) {
        const nx = -1, ny = slope
        const len = Math.hypot(nx, ny)
        const outward = -(nvx * nx + nvy * ny) / len
        if (outward > 0) { nvx += outward * nx / len; nvy += outward * ny / len }
      }
      // Top/bottom against the real floor extents and the crate's own half-height
      // (not the player's inset, which would leave a gap at the back wall).
      const crateMinY = floorTop + crateHalfH
      const crateMaxY = (config.openSide ? floorTop + floorH - floorH * 0.25 : floorTop + floorH) - crateHalfH
      if (by <= crateMinY && nvy < 0) nvy = 0
      if (by >= crateMaxY && nvy > 0) nvy = 0
      if (nvx !== v.x || nvy !== v.y) {
        scene.matter.body.setVelocity(crateBody, { x: nvx, y: nvy })
      }
    }

    if (crateBody && crateHovered) {
      const ddx = player.x - crateBody.position.x
      const ddy = player.y - crateBody.position.y
      grabHover.active = ddx * ddx + ddy * ddy <= 80 * 80
    }

    // Toggle the crate with E when the player is near it (UI closes if already open).
      if (crateBody && Phaser.Input.Keyboard.JustDown(eKey)) {
      const ddx = player.x - crateBody.position.x
      const ddy = player.y - crateBody.position.y
      const nearSq = 80 * 80
      if (ddx * ddx + ddy * ddy <= nearSq) {
        scene.registry.events.emit('open-interior-crate', crateState!.contents)
      }
    }

    if (crateBody) {
      const ui = scene.scene.get('UI') as UI
      if (ui.isCrateOpen()) {
        const ddx = player.x - crateBody.position.x
        const ddy = player.y - crateBody.position.y
        const closeSq = 80 * 80
        if (ddx * ddx + ddy * ddy > closeSq) ui.closeCrate()
      }
    }

    // Sync crate sprite to its body (body is the mover; sprite follows).
    if (crateSprite && crateBody) {
      crateSprite.x = crateBody.position.x
      crateSprite.y = crateBody.position.y
      crateSprite.setDepth(crateBody.position.y)
    }

    const exiting = config.openSide === 'left' ? player.x <= EXIT_ZONE_H
      : config.openSide === 'right' ? player.x >= w - EXIT_ZONE_H
      : player.y >= floorTop + floorH - EXIT_ZONE_H
    if (exiting) {
      exitFn()
    }
  }

  // ---- cleanup ----
  // Sprites still in floorSprites belong to items the player didn't pick up.
  // They get destroyed when the scene shuts down; state.walkableInteriors
  // keeps the corresponding entries so they re-spawn next visit.
  const onCleanup = () => {
    player.destroy()
    if (crateSprite) crateSprite.destroy()
    // On full scene shutdown Phaser tears down the Matter world before this
    // runs (scene.matter.world is null), and the body goes with it — only
    // remove manually when the world still exists.
    if (crateBody && scene.matter && scene.matter.world) scene.matter.world.remove(crateBody)
    grabHover.active = false   // clear hover flag so it can't stick after exit
    for (const s of floorSprites) {
      if (s) s.destroy()
    }
  }

  return { update, onCleanup }
}
