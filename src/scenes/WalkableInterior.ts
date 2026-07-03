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
import { buildInteriorBackdrop, SIDE_WALL_INSET } from './InteriorBackdrop'
import { UI_INVENTORY_BAR_HEIGHT, UI_BAR_HEIGHT, UI } from './UI'
import { makeRng } from '../world/gen'
import { grabHover } from '../ui/hover'
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
      const cx = Math.round(w * pos.x)
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

  // ---- interactive click surface — covers the whole play area (wall + floor)
  // so clicks aimed at the back wall still dispatch (e.g. shooting at it). ----
  const clickTop = UI_BAR_HEIGHT
  const clickH = floorTop + floorH - clickTop
  const floor = scene.add.rectangle(w / 2, clickTop + clickH / 2, w, clickH, 0x000000, 0)
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
        liveItems.push({ x: bx / w, y: (by - floorTop) / floorH, type: crateItem, count: 1 })
        floorSprites.push(spawnDroppedInteriorSprite(scene, bx, by, crateItem, ITEM_SCALE_MULT))
      } else {
        liveItems.push({ x: bx / w, y: (by - floorTop) / floorH, type: crateItem, count: 1 })
        floorSprites.push(spawnDroppedInteriorSprite(scene, bx, by, crateItem, ITEM_SCALE_MULT))
        const spillRng = makeRng(Math.floor(bx * 1000 + by))
        for (const stack of crate.contents) {
          if (!stack) continue
          const landX = bx + (spillRng() - 0.5) * 48
          const landY = by + (spillRng() - 0.5) * 48
          liveItems.push({ x: landX / w, y: (landY - floorTop) / floorH, type: stack.type, count: stack.count })
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
        liveItems.push({ x: dropX / w, y: (dropY - floorTop) / floorH, type: stack.type, count: stack.count })
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
    const ix = Math.round(w * item.x)
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

    // clamp to floor bounds
    const minX = PLAYER_HALF
    const maxX = w - PLAYER_HALF
    const minY = floorTop + PLAYER_HALF
const maxY = floorTop + floorH - PLAYER_HALF
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
    gun.tick(dt, { left: 0, right: w, top: floorTop, bottom: floorTop + floorH }, rKey, scene.registry, (b) => {
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

    // Bound the crate to the floor and the angled side walls. The side walls are
    // diagonal, so a violation can come from horizontal OR vertical motion (push
    // straight up and the receding wall would otherwise slip past the crate). We
    // remove the velocity component pointing *out* through the wall along the
    // wall's inward normal — handling both axes. Velocity only; never repositioned.
    for (let ci = 0; ci < interiorCrateBodies.length; ci++) {
      const ccb = interiorCrateBodies[ci]
      const ccs = interiorCrateSprites[ci]
      if (!ccb || !ccs) continue
      const chw = ccs.displayWidth / 2
      const chh = ccs.displayHeight / 2
      const v = ccb.velocity
      const bx = ccb.position.x
      const by = ccb.position.y
      const walls = wallX(by)
      let nvx = v.x
      let nvy = v.y
      const slope = (w * SIDE_WALL_INSET) / floorH
      if (walls.left !== null && bx - chw <= walls.left) {
        const nx = 1, ny = slope
        const len = Math.hypot(nx, ny)
        const outward = -(nvx * nx + nvy * ny) / len
        if (outward > 0) { nvx += outward * nx / len; nvy += outward * ny / len }
      }
      if (walls.right !== null && bx + chw >= walls.right) {
        const nx = -1, ny = slope
        const len = Math.hypot(nx, ny)
        const outward = -(nvx * nx + nvy * ny) / len
        if (outward > 0) { nvx += outward * nx / len; nvy += outward * ny / len }
      }
      const crateMinY = floorTop + chh
      const crateMaxY = (config.openSide ? floorTop + floorH - floorH * 0.25 : floorTop + floorH) - chh
      if (by <= crateMinY && nvy < 0) nvy = 0
      if (by >= crateMaxY && nvy > 0) nvy = 0
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
