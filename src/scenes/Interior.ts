import Phaser from 'phaser'
import { COLORS } from '../colors'
import { BUILDINGS, state, getUpgradeCost, getEffectiveTickMs, getStorageCap, MODIFIER_SLOTS_PER_PLOT, type BuiltType } from '../game/state'
import { ITEMS, type ItemStack } from '../items/types'
import { consumeCraft, previewCraft } from '../items/recipes'
import { type WorldStructureType } from '../world/structures'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from './UI'
import type { UI } from './UI'
import type { SlotBinding } from '../ui/SlotBinding'
import type { SlotVisual } from './InteriorTypes'
import { registerGrabbable } from '../ui/hover'
import { makeSlotImage, makeStorageBinding } from '../ui/slotFactory'
import { buildProducerInterior } from './ProducerInterior'
import { buildCrafterInterior } from './CrafterInterior'
import { buildShopInterior } from './ShopInterior'
import { buildGeneralStoreInterior } from './GeneralStoreInterior'
import { buildWalkableInterior } from './WalkableInterior'
import { buildLandOfficeInterior } from './LandOfficeInterior'
import { buildChurchInterior } from './ChurchInterior'
import { buildNurseryInterior } from './NurseryInterior'
import { buildInteriorBackdrop, INTERIOR_PALETTES } from './InteriorBackdrop'

export type InteriorData =
  | { source: 'plot'; buildingType: BuiltType; plotIndex: number }
  | { source: 'world'; buildingType: WorldStructureType; structureIndex: number }

// Panel layout constants
const PANEL_W = 700
const PANEL_PAD = 36
const SLOT = 48
const SLOT_GAP = 4
const SECTION_GAP = 20

export class Interior extends Phaser.Scene {
  private interiorData!: InteriorData

  private bindings: SlotBinding[] = []
  private slotVisuals: SlotVisual[] = []
  private moduleUpdates: (() => void)[] = []
  private moduleCleanups: (() => void)[] = []

  constructor() { super('Interior') }

  init(data: InteriorData) {
    this.interiorData = data
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
    if (!this.textures.exists('menu-bg')) this.load.image('menu-bg', '/menu.png')
    if (!this.textures.exists('menu-slot')) this.load.image('menu-slot', '/slot.png')
    if (!this.textures.exists('menu-longslot')) this.load.image('menu-longslot', '/longslot.png')
  }

  create() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height

    // ---- background ----
    // Plot buildings use the shared backdrop system, same as world structures.
    // Each building type maps to a named palette in INTERIOR_PALETTES.
    const plotPalettes: Partial<Record<string, typeof INTERIOR_PALETTES[keyof typeof INTERIOR_PALETTES]>> = {
      mill: INTERIOR_PALETTES.mill,
      well: INTERIOR_PALETTES.well,
      crafter: INTERIOR_PALETTES.crafter,
    }
    if (this.interiorData.source === 'plot') {
      const palette = plotPalettes[this.interiorData.buildingType]
      if (palette) buildInteriorBackdrop(this, palette)
    }

    // ---- back button ----
    const back = this.add.rectangle(50, UI_BAR_HEIGHT + 30, 80, 32, COLORS.uiBarBg)
      .setInteractive()
    registerGrabbable(back)
    this.add.bitmapText(50, UI_BAR_HEIGHT + 30, 'main', 'Back', 16)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
    back.on('pointerdown', () => this.exit())
    this.input.keyboard!.on('keydown-ESC', () => this.exit())
    this.input.keyboard!.on('keydown-E', () => this.exit())

    const onSlotShiftClick = (b: SlotBinding) => this.shiftTakeToInventory(b)
    const onCraftAllShiftClick = () => this.craftAllToInventory()

    if (this.interiorData.source === 'plot') {
      this.buildPlotPanel(w, h, onSlotShiftClick, onCraftAllShiftClick)
    } else if (this.interiorData.buildingType === 'general_store') {
      const handle = buildGeneralStoreInterior(this, onSlotShiftClick)
      this.bindings.push(...handle.bindings)
      this.slotVisuals.push(...handle.slotVisuals)
      this.moduleCleanups.push(handle.onCleanup)
    } else if (this.interiorData.buildingType === 'shop') {
      const handle = buildShopInterior(this, this.interiorData.structureIndex)
      this.moduleCleanups.push(handle.onCleanup)
    } else if (this.interiorData.buildingType === 'abandoned_house') {
      const handle = buildWalkableInterior(this, {
        ...INTERIOR_PALETTES.abandonedHouse,
        wallHeightFraction: 0.45,
        items: [
          { x: 0.3, y: 0.35, type: 'hemp' },
          { x: 0.65, y: 0.55, type: 'hemp' },
        ],
      }, () => this.exit())
      this.moduleUpdates.push(() => handle.update(this.game.loop.delta))
      this.moduleCleanups.push(handle.onCleanup)
    } else if (this.interiorData.buildingType === 'land_office') {
      const handle = buildLandOfficeInterior(this)
      this.moduleCleanups.push(handle.onCleanup)
    } else if (this.interiorData.buildingType === 'church') {
      const handle = buildChurchInterior(this)
      this.moduleCleanups.push(handle.onCleanup)
    } else if (this.interiorData.buildingType === 'nursery') {
      const handle = buildNurseryInterior(this)
      this.moduleCleanups.push(handle.onCleanup)
    }

    this.events.on('shutdown', () => this.cleanup())
  }

  private buildPlotPanel(
    w: number, h: number,
    onSlotShiftClick: (b: SlotBinding) => void,
    onCraftAllShiftClick: () => void,
  ) {
    const plotIndex = this.interiorData.source === 'plot' ? this.interiorData.plotIndex : 0
    const buildingType = this.interiorData.source === 'plot' ? this.interiorData.buildingType : 'mill'
    const plot = state.plots[plotIndex]
    const def = BUILDINGS[buildingType]
    const title = def.name

    // ---- panel dimensions ----
    const titleSectionH = 50
    const quadrantH = 140
    const modRowH = SLOT
    const panelH = PANEL_PAD + titleSectionH + SECTION_GAP + quadrantH + SECTION_GAP + quadrantH + SECTION_GAP + modRowH + PANEL_PAD

    const playAreaTop = UI_BAR_HEIGHT
    const playAreaH = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT
    const panelX = w / 2
    const panelY = playAreaTop + playAreaH / 2 - 40

    // ---- panel background ----
    this.add.nineslice(panelX, panelY, 'menu-bg', undefined, PANEL_W, panelH, 16, 16, 16, 16)
      .setTint(COLORS.interiorPanel)

    // ---- title (centered at top) ----
    const titleY = panelY - panelH / 2 + PANEL_PAD + 16
    this.add.bitmapText(panelX, titleY, 'main', title, 32)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
    const titleLevelText = this.add.bitmapText(panelX, titleY + 28, 'mainSmall', `Level ${plot.level}`, 18)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiText)

    // ---- quadrant positions ----
    const leftColX = panelX - PANEL_W / 4 + 10
    const rightColX = panelX + PANEL_W / 4 - 10
    const topRowY = panelY - panelH / 2 + PANEL_PAD + titleSectionH + SECTION_GAP + quadrantH / 2
    const botRowY = topRowY + quadrantH + SECTION_GAP
    const quadW = PANEL_W / 2 - PANEL_PAD - SECTION_GAP / 2

    // ---- quadrant backgrounds ----
    this.add.nineslice(leftColX, topRowY, 'menu-bg', undefined, quadW, quadrantH, 16, 16, 16, 16)
      .setTint(0x4A4648)
    this.add.nineslice(rightColX, topRowY, 'menu-bg', undefined, quadW, quadrantH, 16, 16, 16, 16)
      .setTint(0x4A4648)
    this.add.nineslice(leftColX, botRowY, 'menu-bg', undefined, quadW, quadrantH, 16, 16, 16, 16)
      .setTint(0x4A4648)
    this.add.nineslice(rightColX, botRowY, 'menu-bg', undefined, quadW, quadrantH, 16, 16, 16, 16)
      .setTint(0x4A4648)

    // ---- TOP LEFT: building art (placeholder — uses overworld sprite for now) ----
    this.add.sprite(leftColX, topRowY, buildingType).setScale(4)

    // ---- TOP RIGHT: description, cycle time, storage ----
    const infoStartY = topRowY - quadrantH / 2 + 16
    const infoLineH = 24

    this.add.bitmapText(rightColX, infoStartY, 'mainSmall', 'DESCRIPTION', 18)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiGold)

    this.add.bitmapText(rightColX - quadW / 2 + 12, infoStartY + infoLineH + 4, 'mainSmall', def.description, 18)
      .setOrigin(0, 0.5).setTint(COLORS.uiText).setMaxWidth(quadW - 24)

    if (def.itemTickMs) {
      const cycleMs = getEffectiveTickMs(def.itemTickMs, plot.level)
      const cycleText = this.add.bitmapText(rightColX - quadW / 2 + 12, infoStartY + infoLineH * 2 + 8, 'mainSmall',
        `Cycle Time: ${(cycleMs / 1000).toFixed(1)}s`, 18)
        .setOrigin(0, 0.5).setTint(COLORS.uiText)
      // store for update after upgrade
      this.moduleUpdates.push(() => {
        const ms = getEffectiveTickMs(def.itemTickMs!, plot.level)
        cycleText.setText(`Cycle Time: ${(ms / 1000).toFixed(1)}s`)
      })
    }

    const storageCount = () => plot.output?.count ?? 0
    const storageCap = () => getStorageCap(plot.level)
    const storageText = this.add.bitmapText(rightColX - quadW / 2 + 12, infoStartY + infoLineH * 3 + 12, 'mainSmall',
      `Storage: ${storageCount()}/${storageCap()}`, 18)
      .setOrigin(0, 0.5).setTint(COLORS.uiText)
    this.moduleUpdates.push(() => {
      storageText.setText(`Storage: ${storageCount()}/${storageCap()}`)
    })

    // ---- BOTTOM LEFT: production ----
    if (buildingType === 'crafter') {
      const handle = buildCrafterInterior(this, plotIndex, leftColX, botRowY, onSlotShiftClick, onCraftAllShiftClick)
      this.bindings.push(...handle.bindings)
      this.slotVisuals.push(...handle.slotVisuals)
      this.moduleCleanups.push(handle.onCleanup)
    } else if (buildingType === 'mill' || buildingType === 'well') {
      const handle = buildProducerInterior(this, buildingType, plotIndex, leftColX, botRowY, onSlotShiftClick)
      this.bindings.push(...handle.bindings)
      this.slotVisuals.push(...handle.slotVisuals)
      this.moduleUpdates.push(handle.update)
    }

    // ---- BOTTOM RIGHT: upgrade panel ----
    const upgradeLineH = 26
    const upgradeStartY = botRowY - quadrantH / 2 + 16

    const levelText = this.add.bitmapText(rightColX, upgradeStartY, 'mainSmall', '', 20)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiGold)
    const levelNextText = this.add.bitmapText(rightColX, upgradeStartY, 'mainSmall', '', 20)
      .setOrigin(0.5, 0.5).setTint(0x44CC44)

    const speedStatText = this.add.bitmapText(rightColX, upgradeStartY + upgradeLineH + 2, 'mainSmall', '', 18)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
    const speedNextText = this.add.bitmapText(rightColX, upgradeStartY + upgradeLineH + 2, 'mainSmall', '', 18)
      .setOrigin(0.5, 0.5).setTint(0x44CC44)

    const storageStatText = this.add.bitmapText(rightColX, upgradeStartY + upgradeLineH * 2 + 2, 'mainSmall', '', 18)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
    const storageNextText = this.add.bitmapText(rightColX, upgradeStartY + upgradeLineH * 2 + 2, 'mainSmall', '', 18)
      .setOrigin(0.5, 0.5).setTint(0x44CC44)

    const btnY = upgradeStartY + upgradeLineH * 3 + 8

    // Cost: coin + gold amount on the left of center
    const coinSprite = this.add.sprite(rightColX - 80, btnY, 'gold_coin').setScale(2)
    const costText = this.add.bitmapText(rightColX - 64, btnY, 'mainSmall', '', 18)
      .setOrigin(0, 0.5).setTint(COLORS.uiGold)

    // Upgrade button on the right of center
    const btn = this.add.rectangle(rightColX + 60, btnY, 140, 36, COLORS.uiBarBg).setInteractive()
    registerGrabbable(btn)
    const btnLabel = this.add.bitmapText(rightColX + 60, btnY, 'mainSmall', 'UPGRADE', 20)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiGold)

    const refreshUpgradeText = () => {
      const lvl = plot.level
      const next = lvl + 1
      const leftX = rightColX - quadW / 2 + 12

      levelText.setText(`Level ${lvl}  ->  `)
      levelNextText.setText(`${next}`)
      const totalW = levelText.width + levelNextText.width
      const startX = rightColX - totalW / 2
      levelText.setOrigin(0, 0.5).setX(startX)
      levelNextText.setOrigin(0, 0.5).setX(startX + levelText.width)

      const baseTickMs = def.itemTickMs ?? def.tickMs
      const curSpeed = (getEffectiveTickMs(baseTickMs, lvl) / 1000).toFixed(1)
      const nextSpeed = (getEffectiveTickMs(baseTickMs, next) / 1000).toFixed(1)
      speedStatText.setText(`Speed: ${curSpeed}s  ->  `).setOrigin(0, 0.5).setX(leftX)
      speedNextText.setText(`${nextSpeed}s`).setOrigin(0, 0.5).setX(leftX + speedStatText.width)

      const curCap = getStorageCap(lvl)
      const nextCap = getStorageCap(next)
      storageStatText.setText(`Storage: ${curCap}  ->  `).setOrigin(0, 0.5).setX(leftX)
      storageNextText.setText(`${nextCap}`).setOrigin(0, 0.5).setX(leftX + storageStatText.width)

      costText.setText(`${getUpgradeCost(lvl)}g`)
    }

    refreshUpgradeText()

    btn.on('pointerdown', () => {
      const cost = getUpgradeCost(plot.level)
      if (state.trySpend(cost, this.registry)) {
        plot.level++
        titleLevelText.setText(`Level ${plot.level}`)
        refreshUpgradeText()
      }
    })

    // ---- BOTTOM: modifier row ----
    const modY = panelY + panelH / 2 - PANEL_PAD - SLOT / 2
    const modRowW = MODIFIER_SLOTS_PER_PLOT * SLOT + (MODIFIER_SLOTS_PER_PLOT - 1) * SLOT_GAP
    const modStartX = panelX - modRowW / 2 + SLOT / 2

    const ui = this.scene.get('UI') as UI
    const dc = ui.getDragController()

    for (let i = 0; i < MODIFIER_SLOTS_PER_PLOT; i++) {
      const slotX = modStartX + i * (SLOT + SLOT_GAP)
      const getStack = () => state.plots[plotIndex].modifiers[i]
      const slotImg = makeSlotImage(this, { x: slotX, y: modY, peek: getStack, tooltipOffsetY: -44 })
      const setStack = (s: ItemStack | null) => { state.plots[plotIndex].modifiers[i] = s }
      this.slotVisuals.push({ x: slotX, y: modY, getStack, icon: null, count: null, lastType: null, lastCount: 0 })

      const binding = makeStorageBinding({ x: slotX, y: modY }, getStack, setStack, { onChange: () => {} })
      this.bindings.push(binding)
      dc.register(binding)

      slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if ((p.event as MouseEvent).shiftKey) { onSlotShiftClick(binding); return }
        dc.handleSlotClick(binding, p)
      })
    }
  }

  placeFromInventory(stack: ItemStack) {
    // Pass 1: merge into existing stacks of the same type
    for (const b of this.bindings) {
      if (stack.count <= 0) break
      const existing = b.peek()
      if (!existing || existing.type !== stack.type) continue
      const accepted = b.offer(stack)
      stack.count -= accepted
    }
    // Pass 2: place into empty slots
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
    if (this.interiorData.source !== 'plot') return
    let madeAny = false
    while (true) {
      const preview = previewCraft(this.interiorData.plotIndex)
      if (!preview) break
      const tentative: ItemStack = { type: preview.type, count: preview.count }
      const added = state.inventoryAddAnywhere(tentative)
      if (added <= 0) break
      consumeCraft(this.interiorData.plotIndex)
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
