import Phaser from 'phaser'
import { COLORS } from '../colors'
import { BUILDINGS, state, type BuiltType } from '../game/state'
import { ITEMS, type ItemStack } from '../items/types'
import { consumeCraft, previewCraft } from '../items/recipes'
import { WORLD_STRUCTURES, type WorldStructureType } from '../world/structures'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from './UI'
import type { UI } from './UI'
import type { SlotBinding } from '../ui/SlotBinding'
import type { SlotVisual } from './InteriorTypes'
import { registerGrabbable } from '../ui/hover'
import { buildProducerInterior } from './ProducerInterior'
import { buildCrafterInterior } from './CrafterInterior'
import { buildModifierRack } from './ModifierRack'
import { buildShopInterior } from './ShopInterior'

// InteriorData. `source` distinguishes plot buildings (mill/well/crafter,
// owned by the player) from world structures (shop, church, etc., part of
// the world). Each source has a different index field.
export type InteriorData =
  | { source: 'plot'; buildingType: BuiltType; plotIndex: number }
  | { source: 'world'; buildingType: WorldStructureType; structureIndex: number }

// Per-building background image keys + paths. Buildings without an entry fall
// back to a plain cream backdrop.
export const INTERIOR_BGS: Partial<Record<BuiltType, string>> = {
  mill: 'millbg',
  well: 'wellbg',
  crafter: 'crafterbg',
}
export const INTERIOR_BG_PATHS: Record<string, string> = {
  millbg: '/millbg.png',
  wellbg: '/wellbg.png',
  crafterbg: '/crafterbg.png',
}

// ---------------------------------------------------------------------------
// Interior — thin router scene. Loads background, title, back button, and
// dispatches to a building-specific module. Plot buildings (mill, well,
// crafter) get a modifier rack; world structures (shop) don't.
// ---------------------------------------------------------------------------

export class Interior extends Phaser.Scene {
  private data!: InteriorData

  private bindings: SlotBinding[] = []
  private slotVisuals: SlotVisual[] = []
  private moduleUpdates: (() => void)[] = []
  private moduleCleanups: (() => void)[] = []

  constructor() { super('Interior') }

  init(data: InteriorData) {
    this.data = data
    this.bindings = []
    this.slotVisuals = []
    this.moduleUpdates = []
    this.moduleCleanups = []
  }

  preload() {
    if (!this.cache.bitmapFont.exists('main')) {
      this.load.bitmapFont('main', '/minecraftbm.png', '/minecraftbm.xml')
    }
    if (!this.cache.bitmapFont.exists('mainSmall')) {
      this.load.bitmapFont('mainSmall', '/minecraftbmsmall.png', '/minecraftbmsmall.xml')
    }
    for (const [key, path] of Object.entries(INTERIOR_BG_PATHS)) {
      if (!this.textures.exists(key)) this.load.image(key, path)
    }
    if (!this.textures.exists('menu-bg')) this.load.image('menu-bg', '/menu.png')
    if (!this.textures.exists('menu-slot')) this.load.image('menu-slot', '/slot.png')
  }

  create() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height

    // ---- title text + background — different sources, same surface ----
    const title = this.data.source === 'plot'
      ? BUILDINGS[this.data.buildingType].name
      : WORLD_STRUCTURES[this.data.buildingType].name

    // ---- background ----
    const bgKey = this.data.source === 'plot' ? INTERIOR_BGS[this.data.buildingType] : undefined
    if (bgKey && this.textures.exists(bgKey)) {
      const playArea = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT
      const img = this.add.image(w / 2, UI_BAR_HEIGHT + playArea / 2, bgKey)
      const scale = Math.max(w / img.width, playArea / img.height)
      img.setScale(scale)
    } else {
      this.add.rectangle(0, 0, w, h, COLORS.worldBg).setOrigin(0, 0)
    }

    // ---- title + back button ----
    this.add.bitmapText(w / 2, UI_BAR_HEIGHT + 30, 'main', title, 24)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
    // "Level 1" is for plot buildings only — world structures don't level up
    if (this.data.source === 'plot') {
      this.add.bitmapText(w / 2, UI_BAR_HEIGHT + 52, 'mainSmall', 'Level 1', 14)
        .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
    }
    const back = this.add.rectangle(50, UI_BAR_HEIGHT + 30, 80, 32, COLORS.uiBarBg)
      .setInteractive()
    registerGrabbable(back)
    this.add.bitmapText(50, UI_BAR_HEIGHT + 30, 'main', 'Back', 16)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
    back.on('pointerdown', () => this.exit())
    this.input.keyboard!.on('keydown-ESC', () => this.exit())
    this.input.keyboard!.on('keydown-E', () => this.exit())

    // ---- building-specific module ----
    const onSlotShiftClick = (b: SlotBinding) => this.shiftTakeToInventory(b)
    const onCraftAllShiftClick = () => this.craftAllToInventory()

    if (this.data.source === 'plot') {
      const plotIndex = this.data.plotIndex
      if (this.data.buildingType === 'crafter') {
        const handle = buildCrafterInterior(this, plotIndex, onSlotShiftClick, onCraftAllShiftClick)
        this.bindings.push(...handle.bindings)
        this.slotVisuals.push(...handle.slotVisuals)
        this.moduleCleanups.push(handle.onCleanup)
      } else if (this.data.buildingType === 'mill' || this.data.buildingType === 'well') {
        const handle = buildProducerInterior(this, this.data.buildingType, plotIndex, onSlotShiftClick)
        this.bindings.push(...handle.bindings)
        this.slotVisuals.push(...handle.slotVisuals)
        this.moduleUpdates.push(handle.update)
      }
      // modifier rack — plot buildings only
      const rack = buildModifierRack(this, plotIndex, onSlotShiftClick)
      this.bindings.push(...rack.bindings)
      this.slotVisuals.push(...rack.slotVisuals)
    } else {
      // world structures — shop, church, etc. Currently both use the shop's
      // "COMING SOON" placeholder. Replace this branch with per-structure
      // builders when you design the shop UI / church interior.
      const handle = buildShopInterior(this, this.data.structureIndex)
      this.moduleCleanups.push(handle.onCleanup)
    }

    this.events.on('shutdown', () => this.cleanup())
  }

  // Inventory dispatch from UI scene's shift-click on an inventory slot.
  placeFromInventory(stack: ItemStack) {
    for (const b of this.bindings) {
      if (stack.count <= 0) break
      if (!b.accepts(stack.type)) continue
      const accepted = b.offer(stack)
      stack.count -= accepted
    }
  }

  private shiftTakeToInventory(binding: SlotBinding) {
    const peek = binding.peek()
    if (!peek) return
    const stack = binding.take(peek.count)
    if (!stack) return
    state.inventoryAddAnywhere(stack)
    if (stack.count > 0) binding.restore(stack)
    this.registry.events.emit('inventory-changed')
  }

  private craftAllToInventory() {
    if (this.data.source !== 'plot') return
    let madeAny = false
    while (true) {
      const preview = previewCraft(this.data.plotIndex)
      if (!preview) break
      const tentative: ItemStack = { type: preview.type, count: preview.count }
      const added = state.inventoryAddAnywhere(tentative)
      if (added <= 0) break
      consumeCraft(this.data.plotIndex)
      madeAny = true
    }
    if (madeAny) {
      this.registry.events.emit('inventory-changed')
      this.events.emit('bread-crafted')
    }
  }

  private redrawAllCraftSlots() {
    for (const v of this.slotVisuals) {
      const stack = v.getStack()
      const curType = stack?.type ?? null
      const curCount = stack?.count ?? 0
      if (curType === v.lastType && curCount === v.lastCount) continue

      v.icon?.destroy(); v.count?.destroy()
      v.icon = null; v.count = null
      v.lastType = curType
      v.lastCount = curCount

      if (!stack) continue
      v.icon = this.add.sprite(v.x, v.y, ITEMS[stack.type].sprite).setScale(ITEMS[stack.type].scale)
      if (stack.count > 1) {
        v.count = this.add.bitmapText(v.x + 23, v.y + 23, 'main', String(stack.count), 20)
          .setOrigin(1, 1).setTint(COLORS.uiText)
      }
    }
  }

  update() {
    this.redrawAllCraftSlots()
    for (const fn of this.moduleUpdates) fn()
  }

  private cleanup() {
    const ui = this.scene.get('UI') as UI
    const dc = ui.getDragController()
    for (const b of this.bindings) dc.unregister(b)
    this.bindings = []
    this.slotVisuals = []
    for (const fn of this.moduleCleanups) fn()
    this.moduleCleanups = []
    this.moduleUpdates = []
  }

  private exit() {
    this.registry.events.emit('interior-exited')
    this.scene.stop('Interior')
  }
}
