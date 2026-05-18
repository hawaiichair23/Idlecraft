// WalkableInterior.ts — reusable builder for walk-in interior spaces.
// Used by abandoned house, future barns, etc. Unlike the panel-based interiors,
// this renders a mini room with a walkable player sprite, item pickups, and
// an exit hitbox near the door.

import Phaser from 'phaser'
import { state } from '../game/state'
import { ITEMS, type ItemType } from '../items/types'
import { buildInteriorBackdrop } from './InteriorBackdrop'

// ---- config shape ----

export interface WalkableInteriorItem {
  x: number   // 0..1 fraction of floor width
  y: number   // 0..1 fraction of floor height
  type: ItemType
}

export interface WalkableInteriorConfig {
  floorColor: number
  wallColor: number
  wallHeightFraction: number   // e.g. 0.33 → top third is wall
  items?: WalkableInteriorItem[]
}

export interface WalkableInteriorHandle {
  update: (dt: number) => void
  onCleanup: () => void
}

// ---- constants ----

const INTERIOR_SCALE = 2           // player renders 2x overworld scale
const PLAYER_SCALE = 2 * INTERIOR_SCALE   // overworld is 2, interior is 4
const ITEM_SCALE_MULT = 1.5               // items scale up slightly, not tied to player
const PLAYER_SPEED = 130
const PLAYER_HALF = 5
const PICKUP_RADIUS = 18
const EXIT_ZONE_H = 12          // thin strip at bottom of floor

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
  })

  // ---- player ----
  const playerStartX = w / 2
  const playerStartY = floorTop + floorH - 30  // near the door
  const player = scene.add.sprite(playerStartX, playerStartY, 'player')
    .setScale(PLAYER_SCALE)
    .setDepth(900)

  // ---- input ----
  const wasd = scene.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>
  const arrows = scene.input.keyboard!.createCursorKeys()

  // ---- floor items ----
  interface FloorItem {
    sprite: Phaser.GameObjects.Sprite
    type: ItemType
    x: number
    y: number
    picked: boolean
  }
  const floorItems: FloorItem[] = []

  if (config.items) {
    for (const item of config.items) {
      const ix = Math.round(w * item.x)
      const iy = Math.round(floorTop + floorH * item.y)
      const def = ITEMS[item.type]
      const sprite = scene.add.sprite(ix, iy, def.sprite)
        .setScale(def.scale * ITEM_SCALE_MULT)
        .setDepth(800)
      floorItems.push({ sprite, type: item.type, x: ix, y: iy, picked: false })
    }
  }

  // ---- update loop ----
  const update = (dt: number) => {
    // movement
    const step = (PLAYER_SPEED * dt) / 1000
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
    player.x = Phaser.Math.Clamp(player.x + dx * step, minX, maxX)
    player.y = Phaser.Math.Clamp(player.y + dy * step, minY, maxY)

    // pickup items
    const pickSq = PICKUP_RADIUS * PICKUP_RADIUS
    for (const fi of floorItems) {
      if (fi.picked) continue
      const ddx = fi.x - player.x
      const ddy = fi.y - player.y
      if (ddx * ddx + ddy * ddy > pickSq) continue
      const stack = { type: fi.type, count: 1 }
      const added = state.inventoryAddAnywhere(stack)
      if (added > 0) {
        fi.picked = true
        fi.sprite.destroy()
        scene.registry.events.emit('inventory-changed')
      }
    }

    // exit zone — player walked to the bottom edge
    if (player.y >= floorTop + floorH - EXIT_ZONE_H) {
      exitFn()
    }
  }

  // ---- cleanup ----
  const onCleanup = () => {
    player.destroy()
    for (const fi of floorItems) {
      if (!fi.picked) fi.sprite.destroy()
    }
  }

  return { update, onCleanup }
}
