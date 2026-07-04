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
import { state, PLAYER_BASE_SPEED, CHEST_SLOTS, createContainerContents, type WalkableInteriorItemInstance } from '../game/state'
import { ITEMS, CONTAINER_PHYSICS, DEFAULT_CONTAINER_PHYSICS, type ItemType, type ItemStack } from '../items/types'
import { UI } from './UI'
import { makeRng } from '../world/gen'
import { grabHover } from '../ui/hover'
import { outlineIcon } from '../ui/iconOutline'
import { spriteColors } from '../sprites/data'
import { type WorldContext, type ClickHandlers, TOOL_RANGE, CRATE_RANGE, dispatchClick } from '../game/ItemActionController'
import { GunController, spawnCrumbs, spawnParticles, tryAxeEnemy, WEAPON_DAMAGE } from '../game/combat'
import { RopeController, CAT_CRATE, CAT_WORLD } from '../world/ropeController'

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
  stateKey: string
  floorColor: number
  wallColor: number
  floorTexture?: string
  floorTextureScale?: number
  roomWidth?: number
  roomHeight?: number
  wallThickness?: number
  doorSide?: 'top' | 'bottom' | 'left' | 'right'
  initialItems?: WalkableInteriorItem[]
  crateSeed?: number
  crateSpawnChance?: number
  crateContents?: WalkableInteriorItem[]
  cratePos?: { x: number; y: number }
  crateItem?: ItemType
  carpet?: boolean
  wallTrim?: boolean
  wallTrimVariant?: 'default' | 'mission'
  pews?: boolean
  brickTrim?: boolean
  floorBorder?: boolean
}

export interface WalkableInteriorHandle {
  update: (dt: number) => void
  onCleanup: () => void
}

// ---- constants ----

const INTERIOR_SCALE = 2           // player renders 2x overworld scale
const PLAYER_SCALE = 2 * INTERIOR_SCALE   // overworld is 2, interior is 4
const ITEM_SCALE_MULT = 1.5
const PLAYER_HALF = 5 * INTERIOR_SCALE   // collision half-extent, scaled to the 2x interior render
const PICKUP_RADIUS = 18
const PICKUP_ATTRACT_RADIUS = 40
const PICKUP_ATTRACT_EASE = 0.25
const EXIT_ZONE_H = 22
const DROP_JUMP_HEIGHT = 14
const DROP_JUMP_MS = 360
const DROP_BOB_AMP = 3
const DROP_BOB_SPEED = 0.004
const PICKUP_DELAY_MS = 500

function darkenColor(hex: number, factor: number): number {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return (Math.round(r * factor) << 16) | (Math.round(g * factor) << 8) | Math.round(b * factor)
}

// ---- builder ----

function spawnDroppedInteriorSprite(
  scene: Phaser.Scene, x: number, y: number, type: ItemType, scaleMult: number,
): Phaser.GameObjects.Sprite {
  const def = ITEMS[type]
  const sprite = scene.add.sprite(x, y, def.sprite)
    .setScale(def.scale * scaleMult)
    .setDepth(y - 12)
  sprite.setData('baseY', y)
  sprite.setData('bobPhase', -state.gameTime * DROP_BOB_SPEED - Math.PI / 2)
  sprite.setData('pickupAt', state.gameTime + PICKUP_DELAY_MS)
  sprite.setData('settled', false)
  sprite.y = y - DROP_JUMP_HEIGHT
  scene.tweens.add({
    targets: sprite,
    y,
    duration: DROP_JUMP_MS,
    ease: 'Bounce.easeOut',
    onComplete: () => {
      sprite.setData('baseY', y + DROP_BOB_AMP)
      sprite.setData('bobPhase', -state.gameTime * DROP_BOB_SPEED - Math.PI / 2)
      sprite.setData('settled', true)
    },
  })
  return sprite
}

export function buildWalkableInterior(
  scene: Phaser.Scene,
  config: WalkableInteriorConfig,
  exitFn: () => void,
): WalkableInteriorHandle {
  const screenW = scene.cameras.main.width
  const screenH = scene.cameras.main.height
  const roomFracW = config.roomWidth ?? 0.65
  const roomFracH = config.roomHeight ?? 0.7
  const wallT = config.wallThickness ?? 60
  const doorSide = config.doorSide ?? 'bottom'

  const roomOuterW = Math.round(screenW * roomFracW)
  const roomOuterH = Math.round(screenH * roomFracH)
  const worldW = Math.max(screenW, roomOuterW + 200)
  const worldH = Math.max(screenH, roomOuterH + 200)
  const roomCX = Math.round(worldW / 2)
  const roomCY = Math.round(worldH / 2)
  scene.cameras.main.setBounds(0, 0, worldW, worldH)
  const roomLeft = roomCX - Math.round(roomOuterW / 2)
  const roomTop = roomCY - Math.round(roomOuterH / 2)
  const roomRight = roomLeft + roomOuterW
  const roomBottom = roomTop + roomOuterH

  const floorLeft = roomLeft + wallT
  const floorTop = roomTop + wallT
  const floorRight = roomRight - wallT
  const floorBottom = roomBottom - wallT
  const floorW = floorRight - floorLeft
  const floorH = floorBottom - floorTop
  const w = screenW

  scene.add.rectangle(worldW / 2, worldH / 2, worldW, worldH, 0x000000).setDepth(-50)

  scene.add.rectangle(roomCX, roomCY, roomOuterW, roomOuterH, config.wallColor).setDepth(-40)

  if (config.floorTexture && scene.textures.exists(config.floorTexture)) {
    const tile = scene.add.tileSprite(floorLeft + floorW / 2, floorTop + floorH / 2, floorW, floorH, config.floorTexture).setDepth(-30)
    const ts = config.floorTextureScale ?? 2
    tile.setTileScale(ts, ts)
  } else {
    scene.add.rectangle(floorLeft + floorW / 2, floorTop + floorH / 2, floorW, floorH, config.floorColor).setDepth(-30)
  }

  if (config.brickTrim && scene.textures.exists('brick_row')) {
    const brickPx = 10
    const brickScale = 3
    const brickT = brickPx * brickScale
    scene.add.tileSprite(floorLeft + floorW / 2, floorTop + brickT / 2, floorW, brickT, 'brick_row').setTileScale(brickScale, brickScale).setDepth(-27)
    scene.add.tileSprite(floorLeft + floorW / 2, floorBottom - brickT / 2, floorW, brickT, 'brick_row').setTileScale(brickScale, brickScale).setDepth(-27)
    scene.add.tileSprite(floorLeft + brickT / 2, floorTop + floorH / 2, floorH, brickT, 'brick_row').setTileScale(brickScale, brickScale).setDepth(-27).setAngle(90)
    scene.add.tileSprite(floorRight - brickT / 2, floorTop + floorH / 2, floorH, brickT, 'brick_row').setTileScale(brickScale, brickScale).setDepth(-27).setAngle(-90)
  }

  const trimKey = config.wallTrimVariant === 'mission' ? 'wall_trim_mission' : 'wall_trim'
  const trimCornerKey = config.wallTrimVariant === 'mission' ? 'wall_trim_mission_corner' : 'wall_trim_corner'
  if ((config.wallTrim ?? true) && scene.textures.exists(trimKey)) {
    const trimPx = 7
    const trimScale = 2
    const trimT = trimPx * trimScale
    scene.add.tileSprite(roomCX, roomTop + trimT / 2, roomOuterW, trimT, trimKey).setTileScale(trimScale, trimScale).setDepth(-38).setFlipY(true)
    scene.add.tileSprite(roomCX, roomBottom - trimT / 2, roomOuterW, trimT, trimKey).setTileScale(trimScale, trimScale).setDepth(-38)
    scene.add.tileSprite(roomLeft + trimT / 2, roomCY, roomOuterH, trimT, trimKey).setTileScale(trimScale, trimScale).setDepth(-38).setAngle(90)
    scene.add.tileSprite(roomRight - trimT / 2, roomCY, roomOuterH, trimT, trimKey).setTileScale(trimScale, trimScale).setDepth(-38).setAngle(-90)
    if (scene.textures.exists(trimCornerKey)) {
      scene.add.image(roomLeft + trimT / 2, roomTop + trimT / 2, trimCornerKey).setScale(trimScale).setDepth(-37)
      scene.add.image(roomRight - trimT / 2, roomTop + trimT / 2, trimCornerKey).setScale(trimScale).setDepth(-37).setAngle(90)
      scene.add.image(roomRight - trimT / 2, roomBottom - trimT / 2, trimCornerKey).setScale(trimScale).setDepth(-37).setAngle(180)
      scene.add.image(roomLeft + trimT / 2, roomBottom - trimT / 2, trimCornerKey).setScale(trimScale).setDepth(-37).setAngle(-90)
    }
  }

  {
    const seamT = 4
    const seamOuter = seamT
    const seamInset = 30
    const boxLeft = floorLeft + seamInset
    const boxTop = floorTop + seamInset
    const boxRight = floorRight - seamInset
    const boxBottom = floorBottom - seamInset
    const boxW = boxRight - boxLeft
    const boxH = boxBottom - boxTop
    const seamG = scene.add.graphics().setDepth(-26)
    seamG.fillStyle(0x3a1c10, 1)
    seamG.fillRect(boxLeft, boxTop, boxW, seamOuter)
    seamG.fillRect(boxLeft, boxBottom - seamOuter, boxW, seamOuter)
    seamG.fillRect(boxLeft, boxTop, seamOuter, boxH)
    seamG.fillRect(boxRight - seamOuter, boxTop, seamOuter, boxH)
  }

  if ((config.floorBorder ?? true) && scene.textures.exists('floor_border')) {
    const borderPx = 16
    const borderScale = 2
    const stripT = borderPx * borderScale
    scene.add.tileSprite(floorLeft + floorW / 2, floorTop + stripT / 2, floorW, stripT, 'floor_border').setTileScale(borderScale, borderScale).setDepth(-28)
    scene.add.tileSprite(floorLeft + floorW / 2, floorBottom - stripT / 2, floorW, stripT, 'floor_border').setTileScale(borderScale, borderScale).setDepth(-28)
    scene.add.tileSprite(floorLeft + stripT / 2, floorTop + floorH / 2, floorH, stripT, 'floor_border').setTileScale(borderScale, borderScale).setDepth(-28).setAngle(90)
    scene.add.tileSprite(floorRight - stripT / 2, floorTop + floorH / 2, floorH, stripT, 'floor_border').setTileScale(borderScale, borderScale).setDepth(-28).setAngle(90)
    if (scene.textures.exists('floor_corner')) {
      scene.add.image(floorLeft + stripT / 2, floorTop + stripT / 2, 'floor_corner').setScale(borderScale).setDepth(-27)
      scene.add.image(floorRight - stripT / 2, floorTop + stripT / 2, 'floor_corner').setScale(borderScale).setDepth(-27).setAngle(90)
      scene.add.image(floorRight - stripT / 2, floorBottom - stripT / 2, 'floor_corner').setScale(borderScale).setDepth(-27).setAngle(180)
      scene.add.image(floorLeft + stripT / 2, floorBottom - stripT / 2, 'floor_corner').setScale(borderScale).setDepth(-27).setAngle(270)
    }
  }

  const pewObstacles: Array<{ minX: number; maxX: number; minY: number; maxY: number }> = []
  if (config.pews && scene.textures.exists('pew')) {
    const pewScale = 3
    const pewSpriteW = 64
    const pewSpriteH = 22
    const pewW = pewSpriteW * pewScale
    const pewH = pewSpriteH * pewScale
    const pewCount = 8
    const aisleGap = pewW * 0.35
    const usableH = floorH - 120
    const spacingY = usableH / pewCount
    const leftCX = floorLeft + floorW / 2 - aisleGap / 2 - pewW / 2
    const rightCX = floorLeft + floorW / 2 + aisleGap / 2 + pewW / 2
    const startY = floorTop + 60 + spacingY / 2
    for (let i = 2; i < pewCount; i++) {
      const cy = startY + i * spacingY
      const leftPew = scene.add.image(leftCX, cy, 'pew').setScale(pewScale).setDepth(cy).setTint(0xd8d8d8)
      const rightPew = scene.add.image(rightCX, cy, 'pew').setScale(pewScale).setDepth(cy).setTint(0xd8d8d8)
      pewObstacles.push({ minX: leftPew.x - pewW / 2, maxX: leftPew.x + pewW / 2, minY: leftPew.y - pewH / 2, maxY: leftPew.y + pewH / 2 })
      pewObstacles.push({ minX: rightPew.x - pewW / 2, maxX: rightPew.x + pewW / 2, minY: rightPew.y - pewH / 2, maxY: rightPew.y + pewH / 2 })
    }
  }

  if (config.pews) {
    const shaftCount = 3
    const shaftW = 180
    const shaftLen = floorW * 0.35
    const shaftSkew = 40
    const usableH = floorH - 200
    const spacingY = usableH / shaftCount
    const startY = floorTop + 140 + spacingY / 2
    for (let i = 0; i < shaftCount; i++) {
      const cy = startY + i * spacingY
      if (scene.textures.exists('window')) {
        scene.add.image(roomRight - wallT / 2, cy - shaftW / 2 + 50, 'window').setScale(4).setDepth(2100)
      }
      const g = scene.add.graphics().setDepth(2000).setBlendMode(Phaser.BlendModes.ADD)
      g.fillStyle(0xfff4c8, 0.35)
      const x0 = roomRight
      const x1 = floorRight - shaftLen
      const yTop = cy - shaftW / 2
      const yBot = cy + shaftW / 2
      const topCap = shaftW * 0.3
      g.beginPath()
      g.moveTo(x0-14, yTop+5)              // top left
      g.lineTo(x0-14, yTop + 65)         // top right
      g.lineTo(x0 - 120, yBot)        // bottom right
      g.lineTo(x1, yBot)              // bottom left light shaft on the floor
      g.lineTo(x1, yBot - topCap)     // upper left light shaft on the floor
      g.closePath()
      g.fillPath()

      if (!scene.textures.exists('dust_mote')) {
        const tex = scene.textures.createCanvas('dust_mote', 2, 2)
        if (tex) {
          const ctx = tex.getContext()
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, 2, 2)
          tex.refresh()
        }
      }
      scene.add.particles(0, 0, 'dust_mote', {
        x: { min: x1, max: x0 },
        y: { min: yTop, max: yBot },
        lifespan: 3200,
        speedY: { min: 6, max: 14 },
        speedX: { min: -4, max: 4 },
        scale: { start: 1.5, end: 0.4 },
        alpha: { start: 0.35, end: 0 },
        frequency: 220,
        tint: 0xfff4c8,
        blendMode: Phaser.BlendModes.ADD,
      }).setDepth(2001)
    }
  }

  if (config.carpet && scene.textures.exists('carpet')) {
    const carpetScale = 3
    const carpetSpriteW = 19
    const carpetW = carpetSpriteW * carpetScale
    if (doorSide === 'top' || doorSide === 'bottom') {
      scene.add.tileSprite(floorLeft + floorW / 2, floorTop + floorH / 2, carpetW, floorH, 'carpet').setTileScale(carpetScale, carpetScale).setDepth(-29)
    } else {
      scene.add.tileSprite(floorLeft + floorW / 2, floorTop + floorH / 2, floorW, carpetW, 'carpet').setTileScale(carpetScale, carpetScale).setDepth(-29).setAngle(90)
    }
  }

  if (config.wallTrim ?? true) {
    const cornerShade = 0x624636
    const pxSize = 4
    const cornerG = scene.add.graphics().setDepth(-25)
    cornerG.fillStyle(cornerShade, 1)
    const inset = 5
    const cornerLen = wallT - inset
    for (let d = 0; d < cornerLen; d += pxSize) {
      const dx = inset + d
      const dy = inset + d
      cornerG.fillRect(roomLeft + dx, roomTop + dy, pxSize, pxSize)
      cornerG.fillRect(roomRight - dx - pxSize, roomTop + dy, pxSize, pxSize)
      cornerG.fillRect(roomLeft + dx, roomBottom - dy - pxSize, pxSize, pxSize)
      cornerG.fillRect(roomRight - dx - pxSize, roomBottom - dy - pxSize, pxSize, pxSize)
    }
  }

  const doorScale = 4
  const doorSpriteW = 26
  const doorSpriteH = 19
  const doorHalfW = (doorSpriteW * doorScale) / 2
  const doorHalfLen = (doorSpriteH * doorScale) / 2
  const doorTrimOffset = 14
  let doorCX = 0
  let doorCY = 0
  const doorTint = config.wallTrimVariant === 'mission' ? 0xd4c8b0 : 0xffffff
  if (doorSide === 'bottom') {
    doorCX = roomCX
    doorCY = roomBottom - doorHalfLen - doorTrimOffset
    scene.add.image(doorCX, doorCY, 'door').setScale(doorScale).setDepth(-33).setAngle(180).setTint(doorTint)
  } else if (doorSide === 'top') {
    doorCX = roomCX
    doorCY = roomTop + doorHalfLen + doorTrimOffset
    scene.add.image(doorCX, doorCY, 'door').setScale(doorScale).setDepth(-33).setTint(doorTint)
  } else if (doorSide === 'left') {
    doorCX = roomLeft + doorHalfLen + doorTrimOffset
    doorCY = roomCY
    scene.add.image(doorCX, doorCY, 'door').setScale(doorScale).setDepth(-33).setAngle(-90).setTint(doorTint)
  } else if (doorSide === 'right') {
    doorCX = roomRight - doorHalfLen - doorTrimOffset
    doorCY = roomCY
    scene.add.image(doorCX, doorCY, 'door').setScale(doorScale).setDepth(-33).setAngle(90).setTint(doorTint)
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

  // ---- seed crate into state.placedCrates on first visit ----
  if (state.walkableInteriorCrates[config.stateKey] === undefined) {
    const rng = makeRng(config.crateSeed ?? 0)
    const chance = config.crateSpawnChance ?? 1
    if (rng() < chance && config.crateContents !== undefined) {
      const contents: (ItemStack | null)[] = Array.from({ length: CHEST_SLOTS }, () => null)
      config.crateContents.forEach((it, i) => {
        if (i < CHEST_SLOTS) contents[i] = { type: it.type, count: it.count ?? 1 }
      })
      const pos = config.cratePos ?? { x: 0.5, y: 0.5 }
      const cx = Math.round(floorLeft + floorW * pos.x)
      const cy = Math.round(floorTop + floorH * pos.y)
      const crateItem = (config.crateItem ?? 'chest') as ItemType
      state.placedCrates.push({ x: cx, y: cy, item: crateItem, contents, unlocked: true, interior: config.stateKey })
    }
    state.walkableInteriorCrates[config.stateKey] = 'seeded' as any
  }

  // Crates belonging to this interior — parallel sprite/body arrays indexed by
  // their position in state.placedCrates. Rebuilt on each visit.
  const interiorCrateIndices: number[] = []
  const interiorCrateSprites: (Phaser.GameObjects.Sprite | null)[] = []
  const interiorCrateBodies: (MatterJS.BodyType | null)[] = []

  const spawnInteriorCrate = (idx: number) => {
    const c = state.placedCrates[idx]
    const def = ITEMS[c.item as keyof typeof ITEMS]
    const sprite = scene.add.sprite(c.x, c.y, def.sprite)
      .setScale(def.scale * ITEM_SCALE_MULT)
      .setDepth(c.y)
      .setInteractive()
    const phys = CONTAINER_PHYSICS[c.item] ?? DEFAULT_CONTAINER_PHYSICS
    const interiorMassScale = INTERIOR_SCALE * ITEM_SCALE_MULT
    const body = scene.matter.add.rectangle(c.x, c.y, sprite.displayWidth, sprite.displayHeight, { frictionAir: phys.frictionAir, mass: phys.mass * interiorMassScale, collisionFilter: { category: CAT_CRATE, mask: CAT_WORLD | CAT_CRATE } })
    scene.matter.body.setInertia(body, Infinity)
    interiorCrateIndices.push(idx)
    interiorCrateSprites.push(sprite)
    interiorCrateBodies.push(body)
  }

  for (let i = 0; i < state.placedCrates.length; i++) {
    if (state.placedCrates[i].interior === config.stateKey) spawnInteriorCrate(i)
  }

  const spawnInset = EXIT_ZONE_H + PLAYER_HALF + 4
  const floorCX = floorLeft + floorW / 2
  const floorCY = floorTop + floorH / 2
  const playerStartX = doorSide === 'left' ? floorLeft + spawnInset
    : doorSide === 'right' ? floorRight - spawnInset
    : floorCX
  const playerStartY = doorSide === 'top' ? floorTop + spawnInset
    : doorSide === 'bottom' ? floorBottom - spawnInset
    : floorCY
  const player = scene.add.sprite(playerStartX, playerStartY, 'player')
    .setScale(PLAYER_SCALE)
    .setDepth(900)
  outlineIcon(player, COLORS.black)
  scene.cameras.main.startFollow(player, true, 0.15, 0.15)

  const floor = scene.add.rectangle(floorLeft + floorW / 2, floorTop + floorH / 2, floorW, floorH, 0x000000, 0)
    .setInteractive()
    .setDepth(-10)

  const gun = new GunController(state.worldSeed + 1234, 9, 4)
  const rope = new RopeController(scene, player, 0x5C3A1A)
  rope.onRopeConsumed = () => {
    for (let i = 0; i < state.inventory.length; i++) {
      const s = state.inventory[i]
      if (s && s.type === 'rope') {
        s.count -= 1
        if (s.count <= 0) state.inventory[i] = null
        scene.registry.events.emit('inventory-changed')
        break
      }
    }
  }
  let lastChopAt = 0
  const interiorHorseGear = { value: 0 }
  const walkableCtx: WorldContext = {
    playerX: () => player.x,
    playerY: () => player.y,
    canDestroyCrate: (wx, wy) => {
      const dx = wx - player.x
      const dy = wy - player.y
      if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return null
      const hitSq = 26 * 26
      for (let i = 0; i < interiorCrateIndices.length; i++) {
        const body = interiorCrateBodies[i]
        if (!body) continue
        const cdx = wx - body.position.x
        const cdy = wy - body.position.y
        if (cdx * cdx + cdy * cdy <= hitSq) return interiorCrateIndices[i]
      }
      return null
    },
    canDestroyPost: () => null,
    canDestroyGate: () => null,
    canDestroyPlot: () => null,
    canDestroyPipe: () => null,
    canDestroyWood: () => false,
    canChopTree: () => false,
    canMineRock: () => false,
    canMount: () => null,
    canDismount: () => null,
    canOpenCrate: (wx, wy) => {
      const hitSq = 26 * 26
      for (let i = 0; i < interiorCrateIndices.length; i++) {
        const body = interiorCrateBodies[i]
        if (!body) continue
        const cdx = wx - body.position.x
        const cdy = wy - body.position.y
        if (cdx * cdx + cdy * cdy > hitSq) continue
        const pdx = player.x - body.position.x
        const pdy = player.y - body.position.y
        if (pdx * pdx + pdy * pdy <= CRATE_RANGE * CRATE_RANGE) return interiorCrateIndices[i]
      }
      return null
    },
    canToggleGate: () => null,
    canTalkToNpc: () => null,
    findPlantableDirtSpot: () => false,
    isNearTiedRope: (wx, wy) => rope.isNearTiedRope(wx, wy, player.x, player.y, TOOL_RANGE),
    isRopeAttached: () => rope.isAttached(),
    crateReach: () => TOOL_RANGE,
    get gunAmmo() { return gun.gunAmmo },
    set gunAmmo(v) { gun.gunAmmo = v },
    get lastFireAt() { return gun.lastFireAt },
    set lastFireAt(v) { gun.lastFireAt = v },
    get gunFullReloadUntil() { return gun.gunFullReloadUntil },
    set gunFullReloadUntil(v) { gun.gunFullReloadUntil = v },
    get lastGunSlot() { return gun.lastGunSlot },
    set lastGunSlot(v) { gun.lastGunSlot = v },
    get horseGear() { return interiorHorseGear.value },
    set horseGear(v) { interiorHorseGear.value = v },
  }
  const interiorScene = scene.scene.get('Interior') as any
  interiorScene.walkableCtx = walkableCtx
  ;(scene as any).getCrateBody = (index: number): MatterJS.BodyType | null => {
    const localIdx = interiorCrateIndices.indexOf(index)
    if (localIdx < 0) return null
    return interiorCrateBodies[localIdx] ?? null
  }

  const destroyInteriorCrate = (clickX: number, clickY: number): boolean => {
    const dx = clickX - player.x
    const dy = clickY - player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false
    const hitSq = 26 * 26
    for (let i = 0; i < interiorCrateIndices.length; i++) {
      const body = interiorCrateBodies[i]
      const sprite = interiorCrateSprites[i]
      if (!body || !sprite) continue
      const cdx = clickX - body.position.x
      const cdy = clickY - body.position.y
      if (cdx * cdx + cdy * cdy > hitSq) continue

      const bx = body.position.x
      const by = body.position.y
      const stateIdx = interiorCrateIndices[i]
      const crate = state.placedCrates[stateIdx]
      const crateItem = crate.item

      spawnParticles(scene, bx, by, spriteColors(ITEMS[crateItem as keyof typeof ITEMS].sprite))

      const isLockbox = crateItem === 'silver_lockbox' || crateItem === 'gold_lockbox'
      if (isLockbox) {
        liveItems.push({ x: (bx - floorLeft) / floorW, y: (by - floorTop) / floorH, type: crateItem, count: 1 })
        floorSprites.push(spawnDroppedInteriorSprite(scene, bx, by, crateItem, ITEM_SCALE_MULT))
      } else {
        liveItems.push({ x: (bx - floorLeft) / floorW, y: (by - floorTop) / floorH, type: crateItem, count: 1 })
        floorSprites.push(spawnDroppedInteriorSprite(scene, bx, by, crateItem, ITEM_SCALE_MULT))
        const spillRng = makeRng(Math.floor(bx * 1000 + by))
        for (const stack of crate.contents) {
          if (!stack) continue
          const landX = bx + (spillRng() - 0.5) * 48
          const landY = by + (spillRng() - 0.5) * 48
          liveItems.push({ x: (landX - floorLeft) / floorW, y: (landY - floorTop) / floorH, type: stack.type, count: stack.count })
          floorSprites.push(spawnDroppedInteriorSprite(scene, landX, landY, stack.type, ITEM_SCALE_MULT))
        }
      }

      sprite.destroy()
      interiorCrateSprites[i] = null
      if (body) scene.matter.world.remove(body)
      interiorCrateBodies[i] = null
      state.placedCrates.splice(stateIdx, 1)
      interiorCrateIndices.splice(i, 1)
      interiorCrateSprites.splice(i, 1)
      interiorCrateBodies.splice(i, 1)
      // Fix up remaining indices after the splice
      for (let j = 0; j < interiorCrateIndices.length; j++) {
        if (interiorCrateIndices[j] > stateIdx) interiorCrateIndices[j]--
      }
      if (ePrompt) ePrompt.setVisible(false)
      return true
    }
    return false
  }

  const interiorHandlers: ClickHandlers = {
    untieRope: (wx, wy) => rope.untieAtClick(wx, wy, player.x, player.y, TOOL_RANGE),
    setAxeSwung: (swung) => { const u = scene.scene.get('UI') as UI; u.getCursorController()?.setAxeSwung(swung) },
    eatFromSlot: () => !!state.eatFromSlot(state.selectedInventorySlot, scene.registry),
    spawnCrumbs: (x, y, color) => spawnCrumbs(scene, x, y, color),
    fireBullet: (tx, ty) => gun.fire(scene, player.x, player.y, tx, ty),
    tryDestroyCrate: (wx, wy) => destroyInteriorCrate(wx, wy),
    tryDestroyPost: () => false,
    tryDestroyGate: () => false,
    tryDestroyPlot: () => false,
    tryDestroyPipe: () => false,
    tryDestroyWood: () => false,
    tryChop: () => false,
    tryMine: () => false,
    tryDig: () => false,
    tryToggleGate: () => false,

    tryAxeEnemy: (wx, wy) => {
      const dmg = WEAPON_DAMAGE['axe'] ?? 3
      const result = tryAxeEnemy(player.x, player.y, wx, wy, dmg, lastChopAt)
      lastChopAt = result.newChopAt
      return result.hit
    },
    tryPlaceCrate: (wx, wy) => {
      const slotIdx = state.selectedInventorySlot
      const stack = state.inventory[slotIdx]
      if (!stack || (stack.type !== 'crate' && stack.type !== 'chest' && stack.type !== 'silver_lockbox' && stack.type !== 'gold_lockbox')) return false
      const dx = wx - player.x
      const dy = wy - player.y
      if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false
      const GRID = 10
      const cx = Math.round(wx / GRID) * GRID
      const cy = Math.round(wy / GRID) * GRID
      if (state.placedCrates.some(c => c.interior === config.stateKey && c.x === cx && c.y === cy)) return false
      const isLockbox = stack.type === 'silver_lockbox' || stack.type === 'gold_lockbox'
      const contents = isLockbox && stack.contents ? stack.contents : createContainerContents(stack.type)
      const unlocked = isLockbox ? (stack.unlocked ?? false) : true
      const newIdx = state.placedCrates.length
      state.placedCrates.push({ x: cx, y: cy, item: stack.type, contents, unlocked, interior: config.stateKey })
      spawnInteriorCrate(newIdx)
      attachCrateHandlers(interiorCrateSprites[interiorCrateSprites.length - 1]!)
      stack.count -= 1
      if (stack.count <= 0) state.inventory[slotIdx] = null
      scene.registry.events.emit('inventory-changed')
      return true
    },
    tryOpenCrate: (wx, wy) => {
      const ui = scene.scene.get('UI') as UI
      if (ui.isCrateOpen()) return false
      const hitSq = 26 * 26
      for (let i = 0; i < interiorCrateIndices.length; i++) {
        const body = interiorCrateBodies[i]
        if (!body) continue
        const cdx = wx - body.position.x
        const cdy = wy - body.position.y
        if (cdx * cdx + cdy * cdy > hitSq) continue
        const pdx = player.x - body.position.x
        const pdy = player.y - body.position.y
        if (pdx * pdx + pdy * pdy > CRATE_RANGE * CRATE_RANGE) continue
        scene.registry.events.emit('open-crate', interiorCrateIndices[i])
        return true
      }
      return false
    },
    throwRope: (tx, ty) => {
      const sel = state.inventory[state.selectedInventorySlot]
      if (!sel || sel.type !== 'rope') return false
      return rope.throw(tx, ty)
    },
  }

  scene.input.on('pointerup', () => {
    const ui = scene.scene.get('UI') as UI
    ui.getCursorController()?.setAxeSwung(false)
  })

  floor.on('pointerdown', (p: Phaser.Input.Pointer) => {
    const ui = scene.scene.get('UI') as UI
    const drag = ui.getDragController()

    if (drag && drag.isHolding()) {
      if (p.rightButtonDown()) return
      if (ui.isPointerOverInventory(p.x, p.y)) return
      const stack = drag.takeHeld()
      if (stack) {
        const dropX = p.x
        const dropY = p.y
        liveItems.push({ x: (dropX - floorLeft) / floorW, y: (dropY - floorTop) / floorH, type: stack.type, count: stack.count })
        floorSprites.push(spawnDroppedInteriorSprite(scene, dropX, dropY, stack.type, ITEM_SCALE_MULT))
      }
      return
    }

    if (p.rightButtonDown()) {
      const heldDef = drag.isHolding() ? drag.peekEdibleDef() : undefined
      if (heldDef && drag.tryEatHeld()) {
        state.applyFoodEffects(heldDef, scene.registry)
        if (heldDef.crumbColor != null) spawnCrumbs(scene, player.x, player.y, heldDef.crumbColor)
        return
      }
      const eaten = state.eatFromSlot(state.selectedInventorySlot, scene.registry)
      if (eaten && eaten.crumbColor != null) {
        spawnCrumbs(scene, player.x, player.y, eaten.crumbColor)
      }
      return
    }

    dispatchClick(walkableCtx, interiorHandlers, p.x, p.y)
  })

  // ---- input ----
  const wasd = scene.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>
  const arrows = scene.input.keyboard!.createCursorKeys()
  const eKey = scene.input.keyboard!.addKey('E')
  const rKey = scene.input.keyboard!.addKey('R')

  // ---- floor item sprites — one per live item, sharing index with state ----
  // We keep a parallel sprite array indexed alongside liveItems. When a state
  // entry is picked up, we splice both arrays at the same index.
  const floorSprites: (Phaser.GameObjects.Sprite | null)[] = []
  for (const item of liveItems) {
    const ix = Math.round(floorLeft + floorW * item.x)
    const iy = Math.round(floorTop + floorH * item.y)
    const def = ITEMS[item.type]
    const sprite = scene.add.sprite(ix, iy, def.sprite)
      .setScale(def.scale * ITEM_SCALE_MULT)
      .setDepth(800)
    sprite.setData('baseY', iy)
    sprite.setData('bobPhase', iy * 0.7)
    sprite.setData('pickupAt', 0)
    sprite.setData('settled', true)
    floorSprites.push(sprite)
  }

  // ---- crate pointerdown + hover for every spawned crate ----
  let crateHovered = false
  const attachCrateHandlers = (sprite: Phaser.GameObjects.Sprite) => {
    sprite.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!p.leftButtonDown()) return
      const heldType = state.inventory[state.selectedInventorySlot]?.type
      const isDestroy = heldType === 'axe' || heldType === 'pickaxe'
      const range = isDestroy ? TOOL_RANGE : CRATE_RANGE
      const ddx = p.x - player.x
      const ddy = p.y - player.y
      if (ddx * ddx + ddy * ddy > range * range) return
      if (isDestroy) {
        interiorHandlers.setAxeSwung(true)
        destroyInteriorCrate(p.x, p.y)
        return
      }
      const tool = state.getSelectedTool()
      if (tool) return
      interiorHandlers.tryOpenCrate(p.x, p.y)
    })
    sprite.on('pointerover', () => { crateHovered = true })
    sprite.on('pointerout', () => { crateHovered = false; grabHover.active = false })
  }
  for (const s of interiorCrateSprites) { if (s) attachCrateHandlers(s) }

  // ---- floating "E" prompt above the crate when player is in range ----
  let ePrompt: Phaser.GameObjects.Container | null = null
  {
    const E_SIZE = 20
    const shadow = scene.add.bitmapText(1.5, 1.5, 'main', 'E', E_SIZE).setOrigin(0.5, 1)
      .setTint(0x303030).setBlendMode(Phaser.BlendModes.MULTIPLY)
    const main = scene.add.bitmapText(0, 0, 'main', 'E', E_SIZE).setOrigin(0.5, 1)
      .setTint(COLORS.uiText)
    ePrompt = scene.add.container(0, 0, [shadow, main]).setDepth(100000).setVisible(false)
  }

  // ---- update loop ----
  const update = (dt: number) => {
    const owSpeed = (state.playerSpeedOverride ?? PLAYER_BASE_SPEED) + 60
    const step = (owSpeed * dt) / 1000
    let dx = 0
    let dy = 0
    if (wasd.A.isDown || arrows.left!.isDown) dx -= 1
    if (wasd.D.isDown || arrows.right!.isDown) dx += 1
    if (wasd.W.isDown || arrows.up!.isDown) dy -= 1
    if (wasd.S.isDown || arrows.down!.isDown) dy += 1
    if (dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2 }
    const leash = rope.dampenLeash(player.x, player.y, dx, dy)
    dx = leash.dx
    dy = leash.dy

    const minX = floorLeft + PLAYER_HALF
    const maxX = floorRight - PLAYER_HALF
    const minY = floorTop + PLAYER_HALF
    const maxY = floorBottom - PLAYER_HALF
    // Crate collision: player (center+half) vs crate body (center+half), both
    // axis-aligned. Uses the body's live position so a shoved crate blocks from
    // its new spot.
    const crateBlocks = (px: number, py: number): boolean => {
      for (let ci = 0; ci < interiorCrateBodies.length; ci++) {
        const cb = interiorCrateBodies[ci]
        if (!cb) continue
        const cs = interiorCrateSprites[ci]
        if (!cs) continue
        const hw = cs.displayWidth / 2
        const hh = cs.displayHeight / 2
        const bx = cb.position.x
        const by = cb.position.y
        if (px + PLAYER_HALF > bx - hw && px - PLAYER_HALF < bx + hw
          && py + PLAYER_HALF > by - hh && py - PLAYER_HALF < by + hh) return true
      }
      for (const o of pewObstacles) {
        if (px + PLAYER_HALF > o.minX && px - PLAYER_HALF < o.maxX
          && py + PLAYER_HALF > o.minY && py - PLAYER_HALF < o.maxY) return true
      }
      return false
    }

    // Push: if the next position would enter the crate, shove its Matter body
    // in the move direction (velocity only — never write the body's position).
    if (dx !== 0 || dy !== 0) {
      const npx = player.x + dx * step
      const npy = player.y + dy * step
      if (crateBlocks(npx, npy)) {
        for (let ci = 0; ci < interiorCrateBodies.length; ci++) {
          const cb = interiorCrateBodies[ci]
          const cs = interiorCrateSprites[ci]
          if (!cb || !cs) continue
          const hw = cs.displayWidth / 2
          const hh = cs.displayHeight / 2
          const bx = cb.position.x
          const by = cb.position.y
          if (npx + PLAYER_HALF > bx - hw && npx - PLAYER_HALF < bx + hw
            && npy + PLAYER_HALF > by - hh && npy - PLAYER_HALF < by + hh) {
            if (cb.isSleeping) { cb.isSleeping = false; (cb as any).sleepCounter = 0 }
            const cidx = interiorCrateIndices[ci]
            const sc = state.placedCrates[cidx]
            const phys = CONTAINER_PHYSICS[sc?.item ?? 'crate'] ?? DEFAULT_CONTAINER_PHYSICS
            const f = phys.pushForce * cb.mass
            scene.matter.body.applyForce(cb, cb.position, { x: dx * f, y: dy * f })
          }
        }
      }
    }

    const tryX = Phaser.Math.Clamp(player.x + dx * step, minX, maxX)
    if (!crateBlocks(tryX, player.y)) player.x = tryX
    const tryY = Phaser.Math.Clamp(player.y + dy * step, minY, maxY)
    if (!crateBlocks(player.x, tryY)) player.y = tryY

    // ---- E prompt above crate when player is in range ----
    if (ePrompt) {
      let nearestBody: MatterJS.BodyType | null = null
      let nearestHH = 0
      let nearestDistSq = 80 * 80
      for (let ci = 0; ci < interiorCrateBodies.length; ci++) {
        const cb = interiorCrateBodies[ci]
        const cs = interiorCrateSprites[ci]
        if (!cb || !cs) continue
        const ddx = player.x - cb.position.x
        const ddy = player.y - cb.position.y
        const dSq = ddx * ddx + ddy * ddy
        if (dSq <= nearestDistSq) { nearestBody = cb; nearestHH = cs.displayHeight / 2; nearestDistSq = dSq }
      }
      const ui = scene.scene.get('UI') as UI
      if (nearestBody && !ui.isCrateOpen()) {
        ePrompt.setPosition(nearestBody.position.x, nearestBody.position.y - nearestHH - 8).setVisible(true)
      } else {
        ePrompt.setVisible(false)
      }
    }



    rope.update()
    gun.tick(dt, { left: floorLeft, right: floorRight, top: floorTop, bottom: floorBottom }, rKey, scene.registry, (b) => {
      for (let ci = 0; ci < interiorCrateBodies.length; ci++) {
        const cb = interiorCrateBodies[ci]
        const cs = interiorCrateSprites[ci]
        if (!cb || !cs) continue
        const hw = cs.displayWidth / 2
        const hh = cs.displayHeight / 2
        const cx = cb.position.x
        const cy = cb.position.y
        if (b.x >= cx - hw && b.x <= cx + hw && b.y >= cy - hh && b.y <= cy + hh) {
          return true
        }
      }
      return false
    })

    // pickup items — walk through liveItems in reverse so splice indexing
    // stays safe within the loop.
    const pickSq = PICKUP_RADIUS * PICKUP_RADIUS
    const attractSq = PICKUP_ATTRACT_RADIUS * PICKUP_ATTRACT_RADIUS
    const now = state.gameTime
    for (let i = liveItems.length - 1; i >= 0; i--) {
      const it = liveItems[i]
      const sprite = floorSprites[i]
      if (!sprite) continue
      if (now < (sprite.getData('pickupAt') as number ?? 0)) continue
      const ddx = player.x - sprite.x
      const ddy = player.y - sprite.y
      const distSq = ddx * ddx + ddy * ddy
      if (distSq > attractSq) {
        sprite.setData('attracting', false)
        continue
      }
      if (distSq > pickSq) {
        if (state.roomFor(it) <= 0) {
          sprite.setData('attracting', false)
          continue
        }
        sprite.setData('attracting', true)
        sprite.x += ddx * PICKUP_ATTRACT_EASE
        sprite.y += ddy * PICKUP_ATTRACT_EASE
        continue
      }
      const added = state.inventoryAddAnywhere({ type: it.type, count: it.count })
      if (added > 0) {
        sprite.destroy()
        liveItems.splice(i, 1)
        floorSprites.splice(i, 1)
        scene.registry.events.emit('inventory-changed')
        scene.registry.events.emit('item-picked-up', { type: it.type, count: added })
      }
    }

    for (let ci = 0; ci < interiorCrateBodies.length; ci++) {
      const ccb = interiorCrateBodies[ci]
      const ccs = interiorCrateSprites[ci]
      if (!ccb || !ccs) continue
      const chw = ccs.displayWidth / 2
      const chh = ccs.displayHeight / 2
      const v = ccb.velocity
      const bx = ccb.position.x
      const by = ccb.position.y
      let nvx = v.x
      let nvy = v.y
      if (bx - chw <= floorLeft && nvx < 0) nvx = 0
      if (bx + chw >= floorRight && nvx > 0) nvx = 0
      if (by - chh <= floorTop && nvy < 0) nvy = 0
      if (by + chh >= floorBottom && nvy > 0) nvy = 0
      if (nvx !== v.x || nvy !== v.y) {
        scene.matter.body.setVelocity(ccb, { x: nvx, y: nvy })
      }
    }

    if (crateHovered) {
      let hoverActive = false
      for (const cb of interiorCrateBodies) {
        if (!cb) continue
        const ddx = player.x - cb.position.x
        const ddy = player.y - cb.position.y
        if (ddx * ddx + ddy * ddy <= 80 * 80) { hoverActive = true; break }
      }
      grabHover.active = hoverActive
    }

    if (Phaser.Input.Keyboard.JustDown(eKey)) {
      const ui = scene.scene.get('UI') as UI
      if (ui.isCrateOpen()) {
        ui.closeCrate()
      } else if (ui.isUpperInventoryOpen()) {
        scene.registry.events.emit('toggle-inventory')
      } else {
        let nearestIdx = -1
        let nearestDistSq = 80 * 80
        for (let ci = 0; ci < interiorCrateBodies.length; ci++) {
          const cb = interiorCrateBodies[ci]
          if (!cb) continue
          const ddx = player.x - cb.position.x
          const ddy = player.y - cb.position.y
          const dSq = ddx * ddx + ddy * ddy
          if (dSq <= nearestDistSq) { nearestIdx = ci; nearestDistSq = dSq }
        }
        if (nearestIdx >= 0) {
          scene.registry.events.emit('open-crate', interiorCrateIndices[nearestIdx])
        } else {
          scene.registry.events.emit('toggle-inventory')
        }
      }
    }

    {
      const ui = scene.scene.get('UI') as UI
      if (ui.isCrateOpen()) {
        let tooFar = true
        for (const cb of interiorCrateBodies) {
          if (!cb) continue
          const ddx = player.x - cb.position.x
          const ddy = player.y - cb.position.y
          if (ddx * ddx + ddy * ddy <= 80 * 80) { tooFar = false; break }
        }
        if (tooFar) ui.closeCrate()
      }
    }

    // Sync crate sprite to its body (body is the mover; sprite follows).
    for (let ci = 0; ci < interiorCrateSprites.length; ci++) {
      const cs = interiorCrateSprites[ci]
      const cb = interiorCrateBodies[ci]
      if (cs && cb) {
        cs.x = cb.position.x
        cs.y = cb.position.y
        cs.setDepth(cb.position.y)
        const sc = state.placedCrates[interiorCrateIndices[ci]]
        if (sc) { sc.x = cb.position.x; sc.y = cb.position.y }
      }
    }

    const bobNow = state.gameTime
    for (const s of floorSprites) {
      if (!s || !s.getData('settled') || s.getData('attracting')) continue
      const baseY = s.getData('baseY') as number
      const phase = s.getData('bobPhase') as number
      if (phase == null) continue
      s.y = baseY + Math.sin(bobNow * DROP_BOB_SPEED + phase) * DROP_BOB_AMP
    }

    const exiting = doorSide === 'bottom' ? (player.y >= floorBottom - EXIT_ZONE_H && Math.abs(player.x - doorCX) <= doorHalfW)
      : doorSide === 'top' ? (player.y <= floorTop + EXIT_ZONE_H && Math.abs(player.x - doorCX) <= doorHalfW)
      : doorSide === 'left' ? (player.x <= floorLeft + EXIT_ZONE_H && Math.abs(player.y - doorCY) <= doorHalfW)
      : (player.x >= floorRight - EXIT_ZONE_H && Math.abs(player.y - doorCY) <= doorHalfW)
    if (exiting) {
      exitFn()
    }
  }

  // ---- cleanup ----
  // Sprites still in floorSprites belong to items the player didn't pick up.
  // They get destroyed when the scene shuts down; state.walkableInteriors
  // keeps the corresponding entries so they re-spawn next visit.
  const onCleanup = () => {
    if (scene.cameras && scene.cameras.main) {
      scene.cameras.main.stopFollow()
      scene.cameras.main.setBounds(0, 0, screenW, screenH)
      scene.cameras.main.scrollX = 0
      scene.cameras.main.scrollY = 0
    }
    player.destroy()
    floor.destroy()
    gun.destroyAll()
    if (scene.matter && scene.matter.world) rope.clearAll()
    const intScene = scene.scene.get('Interior') as any
    if (intScene) intScene.walkableCtx = null
    delete (scene as any).getCrateBody
    for (const s of interiorCrateSprites) { if (s) s.destroy() }
    if (scene.matter && scene.matter.world) {
      for (const b of interiorCrateBodies) { if (b) scene.matter.world.remove(b) }
    }
    grabHover.active = false
    for (const s of floorSprites) { if (s) s.destroy() }
  }

  return { update, onCleanup }
}
