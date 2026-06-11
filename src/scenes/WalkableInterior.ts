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
import { state, PLAYER_BASE_SPEED, type WalkableInteriorItemInstance } from '../game/state'
import { ITEMS, type ItemType } from '../items/types'
import { buildInteriorBackdrop, SIDE_WALL_INSET } from './InteriorBackdrop'
import { UI_INVENTORY_BAR_HEIGHT } from './UI'

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
  wallHeightFraction: number   // e.g. 0.33 → top third is wall
  // Initial item layout. Only used to seed state on the first visit.
  initialItems?: WalkableInteriorItem[]
  openSide?: 'left' | 'right'
}

export interface WalkableInteriorHandle {
  update: (dt: number) => void
  onCleanup: () => void
}

// ---- constants ----

const INTERIOR_SCALE = 2           // player renders 2x overworld scale
const PLAYER_SCALE = 2 * INTERIOR_SCALE   // overworld is 2, interior is 4
const ITEM_SCALE_MULT = 1.5               // items scale up slightly, not tied to player
const PLAYER_HALF = 5
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
    player.x = Phaser.Math.Clamp(player.x + dx * step, 0, w)
    player.y = Phaser.Math.Clamp(player.y + dy * step, minY, maxY)

    const yFrac = (player.y - floorTop) / floorH
    const wallInsetPx = w * SIDE_WALL_INSET
    if (config.openSide === 'left') {
      const rightInset = 0.35
      const rEdge = w * (1 - rightInset)
      const rWallX = rEdge - wallInsetPx * (1 - yFrac)
      player.x = Math.min(player.x, rWallX - PLAYER_HALF)
    } else if (config.openSide === 'right') {
      const leftInset = 0.35
      const lEdge = w * leftInset
      const lWallX = lEdge + wallInsetPx * (1 - yFrac)
      player.x = Math.max(player.x, lWallX + PLAYER_HALF)
    } else {
      const lWallX = wallInsetPx * (1 - yFrac)
      const rWallX = w - wallInsetPx * (1 - yFrac)
      player.x = Phaser.Math.Clamp(player.x, lWallX + PLAYER_HALF, rWallX - PLAYER_HALF)
    }

    if (config.openSide) {
      const bottomWallTop = floorTop + floorH - floorH * 0.25
      player.y = Math.min(player.y, bottomWallTop - PLAYER_HALF - 10)
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
    for (const s of floorSprites) {
      if (s) s.destroy()
    }
  }

  return { update, onCleanup }
}
