import Phaser from 'phaser'
import { COLORS } from '../colors'
import { BUILDINGS, state, getUpgradeCost, getEffectiveTickMs, getStorageCap, MODIFIER_SLOTS_PER_PLOT, FIELD_COLS, FIELD_ROWS, makeEmptyFieldCells, type BuiltType } from '../game/state'
import { ITEMS, type ItemStack } from '../items/types'
import { consumeCraft, previewCraft } from '../items/recipes'
import { type WorldStructureType } from '../world/structures'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from './UI'
import type { UI } from './UI'
import type { SlotBinding } from '../ui/SlotBinding'
import type { SlotVisual } from './InteriorTypes'
import { registerGrabbable } from '../ui/hover'
import { makeSlotImage, makeStorageBinding, distributeIntoBindings } from '../ui/slotFactory'
import { buildProducerInterior } from './ProducerInterior'
import { buildWorkshopInterior } from './WorkshopInterior'
import { buildShopInterior } from './ShopInterior'
import { buildGeneralStoreInterior } from './GeneralStoreInterior'
import { buildWalkableInterior } from './WalkableInterior'
import { buildLandOfficeInterior } from './LandOfficeInterior'
import { buildChurchInterior } from './ChurchInterior'
import { buildNurseryInterior } from './NurseryInterior'
import { buildTannerInterior } from './TannerInterior'
import { buildInteriorBackdrop, INTERIOR_PALETTES } from './InteriorBackdrop'

export type InteriorData =
  | { source: 'plot'; buildingType: BuiltType; plotIndex: number }
  | { source: 'world'; buildingType: WorldStructureType; structureIndex: number }

// Panel layout constants
const PANEL_W = 440
const PANEL_PAD = 24
const SLOT = 48
const SLOT_GAP = 4

export class Interior extends Phaser.Scene {
  private interiorData!: InteriorData

  // Read-only access for systems outside the scene (e.g. CursorController
  // checking which kind of interior is active).
  getInteriorData(): InteriorData {
    return this.interiorData
  }

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
      this.load.bitmapFont('main', 'minecraftbm.png', 'minecraftbm.xml')
    }
    if (!this.cache.bitmapFont.exists('mainSmall')) {
      this.load.bitmapFont('mainSmall', 'minecraftbmsmall.png', 'minecraftbmsmall.xml')
    }
    if (!this.textures.exists('menu-bg')) this.load.image('menu-bg', 'menu.png')
    if (!this.textures.exists('menu-slot')) this.load.image('menu-slot', 'slot.png')
    if (!this.textures.exists('menu-longslot')) this.load.image('menu-longslot', 'longslot.png')
  }

  create() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height

    // ---- background ----
    // Plot buildings use the shared backdrop system, same as world structures.
    // Each building type maps to a named palette in INTERIOR_PALETTES.
    // Exception: field uses a full-art PNG instead.
    const plotPalettes: Partial<Record<string, typeof INTERIOR_PALETTES[keyof typeof INTERIOR_PALETTES]>> = {
      mill: INTERIOR_PALETTES.mill,
      well: INTERIOR_PALETTES.well,
      workshop: INTERIOR_PALETTES.workshop,
    }
    if (this.interiorData.source === 'plot') {
      if (this.interiorData.buildingType === 'field') {
        const fieldPlotIndex = this.interiorData.plotIndex
        const fieldPlot = state.plots[fieldPlotIndex]
        // safety: existing fields built before fieldCells existed get one now
        if (!fieldPlot.fieldCells) fieldPlot.fieldCells = makeEmptyFieldCells()
        const fieldCells = fieldPlot.fieldCells

        const playArea = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT
        // cream background fills the whole play area
        this.add.rectangle(w / 2, UI_BAR_HEIGHT + playArea / 2, w, playArea, COLORS.worldBg)

        const baseTex = this.textures.get('field_bg')
        const srcW = baseTex.getSourceImage().width
        const srcH = baseTex.getSourceImage().height
        const scale = Math.min(w / srcW, playArea / srcH) * 0.85
        const cx = w / 2
        const cy = UI_BAR_HEIGHT + playArea / 2

        // Bottom layer — fully patched field
        this.add.image(cx, cy, 'field_bg_patched').setScale(scale)
        // Sprout layer — visible only where cells are sprouting
        const sproutImg = this.add.image(cx, cy, 'field_sprouts').setScale(scale)
        // Growing layer — visible only where cells are growing
        const growingImg = this.add.image(cx, cy, 'field_growing').setScale(scale)
        // Mature layer — visible only where cells are mature
        const matureImg = this.add.image(cx, cy, 'field_mature').setScale(scale)
        // Top layer — empty holes
        const topImg = this.add.image(cx, cy, 'field_bg').setScale(scale)

        // Cell grid coords (screen space) — positions only; the state lives
        // on the plot and is what determines what's visible.
        const cellNativeStartX = 600 - 80 / scale
        const cellNativeStartY = 415 + 10 / scale
        const cellNativeStep   = 95
        const fieldLeftScreen = cx - (srcW * scale) / 2
        const fieldTopScreen  = cy - (srcH * scale) / 2
        const cellW = 90 * scale
        const cellH = 100 * scale
        const cellPositions: { x: number; y: number; w: number; h: number }[] = []
        for (let r = 0; r < FIELD_ROWS; r++) {
          for (let c = 0; c < FIELD_COLS; c++) {
            const cellScreenX = fieldLeftScreen + (cellNativeStartX + c * cellNativeStep) * scale
            const cellScreenY = fieldTopScreen  + (cellNativeStartY + r * cellNativeStep) * scale
            cellPositions.push({
              x: cellScreenX - cellW / 2,
              y: cellScreenY - cellH / 2,
              w: cellW, h: cellH,
            })
          }
        }

        // Phaser 4 Filter-based mask. Inverted: filled regions = HIDDEN.
        // Cells in any non-empty state get their region added (hole revealed).
        const maskG = this.add.graphics()
        maskG.setVisible(false)
        // Sprout mask — only sprouting cells are revealed
        const sproutMaskG = this.add.graphics()
        sproutMaskG.setVisible(false)
        // Growing mask — only growing cells are revealed
        const growingMaskG = this.add.graphics()
        growingMaskG.setVisible(false)
        // Mature mask — only mature cells are revealed
        const matureMaskG = this.add.graphics()
        matureMaskG.setVisible(false)
        const rebuildMask = () => {
          maskG.clear()
          maskG.fillStyle(0xffffff, 1)
          sproutMaskG.clear()
          sproutMaskG.fillStyle(0xffffff, 1)
          growingMaskG.clear()
          growingMaskG.fillStyle(0xffffff, 1)
          matureMaskG.clear()
          matureMaskG.fillStyle(0xffffff, 1)
          for (let i = 0; i < cellPositions.length; i++) {
            if (fieldCells[i].state === 'empty') continue
            const p = cellPositions[i]
            maskG.fillRect(p.x, p.y, p.w, p.h)
            if (fieldCells[i].state === 'sprouting') {
              sproutMaskG.fillRect(p.x, p.y, p.w, p.h)
            }
            if (fieldCells[i].state === 'growing') {
              growingMaskG.fillRect(p.x, p.y, p.w, p.h)
            }
            if (fieldCells[i].state === 'mature') {
              matureMaskG.fillRect(p.x, p.y - 15, p.w, p.h)
            }
          }
        }
        topImg.enableFilters()
        topImg.filters!.external.addMask(maskG, true)
        sproutImg.enableFilters()
        sproutImg.filters!.external.addMask(sproutMaskG, false)
        growingImg.enableFilters()
        growingImg.filters!.external.addMask(growingMaskG, false)
        matureImg.enableFilters()
        matureImg.filters!.external.addMask(matureMaskG, false)

        // Cell hitboxes
        const cellHits: Phaser.GameObjects.Rectangle[] = []
        for (let i = 0; i < cellPositions.length; i++) {
          const p = cellPositions[i]
          const hit = this.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 0xFF00FF, 0)
            .setInteractive()
          cellHits.push(hit)
          hit.on('pointerdown', () => {
            const cell = fieldCells[i]
            const slot = state.selectedInventorySlot
            const stack = state.inventory[slot]
            if (!stack) return

            // shovel — dig up a planted cell, return one seed to inventory
            // OR harvest a mature cell, return one hemp
            if (stack.type === 'shovel') {
              if (cell.state === 'empty') return
              if (cell.state === 'mature') {
                const hempStack: ItemStack = { type: 'hemp', count: 1 }
                const hempAdded = state.inventoryAddAnywhere(hempStack)
                if (hempAdded <= 0) return  // no room — don't harvest
                cell.state = 'empty'
                cell.plantedAt = 0
                rebuildMask()
                this.registry.events.emit('inventory-changed')
                return
              }
              cell.state = 'empty'
              cell.plantedAt = 0
              rebuildMask()
              const seedStack: ItemStack = { type: 'hemp_seed', count: 1 }
              const seedAdded = state.inventoryAddAnywhere(seedStack)
              if (seedAdded <= 0) {
                // no room — undo the dig so nothing is lost
                cell.state = 'planted'
                cell.plantedAt = Date.now()
                rebuildMask()
                return
              }
              this.registry.events.emit('inventory-changed')
              return
            }

            // hemp seed — plant the cell, consume one seed
            if (stack.type === 'hemp_seed' && stack.count > 0) {
              if (cell.state !== 'empty') return
              stack.count -= 1
              if (stack.count <= 0) state.inventory[slot] = null
              this.registry.events.emit('inventory-changed')
              cell.state = 'planted'
              cell.plantedAt = Date.now()
              rebuildMask()
            }
          })
        }
        // Advance cells to current growth stage before first render
        const STAGE_TIME_MS = 25_000
        const now = Date.now()
        for (const cell of fieldCells) {
          const elapsed = now - cell.plantedAt
          if (cell.state === 'planted' && elapsed >= STAGE_TIME_MS) cell.state = 'sprouting'
          if (cell.state === 'sprouting' && elapsed >= STAGE_TIME_MS * 2) cell.state = 'growing'
          if (cell.state === 'growing' && elapsed >= STAGE_TIME_MS * 3) cell.state = 'mature'
        }
        rebuildMask()

        // Growth timer — check every second, advance stages after 25s each
        const growthTimer = this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            const now = Date.now()
            let changed = false
            for (const cell of fieldCells) {
              const elapsed = now - cell.plantedAt
              if (cell.state === 'planted' && elapsed >= STAGE_TIME_MS) {
                cell.state = 'sprouting'
                changed = true
              }
              if (cell.state === 'sprouting' && elapsed >= STAGE_TIME_MS * 2) {
                cell.state = 'growing'
                changed = true
              }
              if (cell.state === 'growing' && elapsed >= STAGE_TIME_MS * 3) {
                cell.state = 'mature'
                changed = true
              }
            }
            if (changed) rebuildMask()
          },
        })
        this.events.on('shutdown', () => growthTimer.remove(false))
      } else {
        const palette = plotPalettes[this.interiorData.buildingType]
        if (palette) buildInteriorBackdrop(this, palette)
      }
    }

    // ---- back button + keyboard exits ----
    // Walkable interiors (abandoned house, future barns) require the player
    // to physically walk out — no back button, no ESC/E exits.
    const isWalkable = this.interiorData.source === 'world' && this.interiorData.buildingType === 'abandoned_house'
    if (!isWalkable) {
      const back = this.add.rectangle(50, UI_BAR_HEIGHT + 30, 80, 32, COLORS.uiBarBg)
        .setInteractive()
      registerGrabbable(back)
      this.add.bitmapText(50, UI_BAR_HEIGHT + 30, 'main', 'Back', 16)
        .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
      back.on('pointerdown', () => this.exit())
      this.input.keyboard!.on('keydown-ESC', () => this.exit())
      this.input.keyboard!.on('keydown-E', () => this.exit())
    }

    const onSlotShiftClick = (b: SlotBinding) => this.shiftTakeToInventory(b)
    const onCraftAllShiftClick = () => this.craftAllToInventory()

    if (this.interiorData.source === 'plot') {
      // field has its own art background and no panel yet — just the room.
      if (this.interiorData.buildingType !== 'field') {
        this.buildPlotPanel(w, h, onSlotShiftClick, onCraftAllShiftClick)
      }
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
        stateKey: `abandoned_house:${this.interiorData.structureIndex}`,
        ...INTERIOR_PALETTES.abandonedHouse,
        wallHeightFraction: 0.45,
        initialItems: [
          { x: 0.3, y: 0.35, type: 'hemp', count: 2 },
          { x: 0.65, y: 0.55, type: 'hemp', count: 2 },
          { x: 0.75, y: 0.3, type: 'hemp', count: 2 },
          { x: 0.4, y: 0.7, type: 'hemp', count: 2 },
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
    } else if (this.interiorData.buildingType === 'tanner') {
      const handle = buildTannerInterior(this)
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

    // ---- panel dimensions ----
    const TAB_BAR_H = 36
    const TITLE_H = 44
    const CONTENT_H = 160
    const panelH = PANEL_PAD + TITLE_H + TAB_BAR_H + CONTENT_H + PANEL_PAD

    const playAreaTop = UI_BAR_HEIGHT
    const playAreaH = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT
    const panelX = w / 2
    const panelY = playAreaTop + playAreaH / 2 - 50

    // ---- panel background ----
    this.add.nineslice(panelX, panelY, 'menu-bg', undefined, PANEL_W, panelH, 16, 16, 16, 16)
      .setTint(COLORS.interiorPanel)

    // ---- title ----
    const titleY = panelY - panelH / 2 + PANEL_PAD + 14
    this.add.bitmapText(panelX, titleY, 'main', def.name, 28)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
    const titleLevelText = this.add.bitmapText(panelX, titleY + 22, 'mainSmall', `Level ${plot.level}`, 16)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiText)

    // ---- tab bar ----
    // Workshops skip Upgrades and Modifiers — those tabs are hidden for them.
    const tabNames = buildingType === 'workshop'
      ? ['Production', 'Info']
      : ['Production', 'Upgrades', 'Modifiers', 'Info']
    const tabY = panelY - panelH / 2 + PANEL_PAD + TITLE_H + TAB_BAR_H / 2
    const tabW = (PANEL_W - PANEL_PAD * 2) / tabNames.length
    const tabLabels: Phaser.GameObjects.BitmapText[] = []
    const tabUnderlines: Phaser.GameObjects.Rectangle[] = []
    const tabContainers: Phaser.GameObjects.Container[] = []

    // content area center
    const contentY = tabY + TAB_BAR_H / 2 + CONTENT_H / 2

    // build tab labels + underlines
    const tabStartX = panelX - PANEL_W / 2 + PANEL_PAD + tabW / 2
    for (let i = 0; i < tabNames.length; i++) {
      const tx = tabStartX + i * tabW
      const label = this.add.bitmapText(tx, tabY, 'mainSmall', tabNames[i], 16)
        .setOrigin(0.5, 0.5).setTint(COLORS.uiText).setInteractive()
      registerGrabbable(label)
      tabLabels.push(label)
      const underline = this.add.rectangle(tx, tabY + 12, tabW - 8, 2, COLORS.uiGold)
        .setVisible(false)
      tabUnderlines.push(underline)
    }

    // ---- tab content containers ----
    // Each container holds that tab's content. We show/hide by toggling visibility.

    // -- PRODUCTION tab (0) --
    const productionContainer = this.add.container(0, 0)
    tabContainers.push(productionContainer)
    if (buildingType === 'workshop') {
      const handle = buildWorkshopInterior(this, plotIndex, panelX, contentY, onSlotShiftClick, onCraftAllShiftClick, productionContainer)
      this.bindings.push(...handle.bindings)
      this.slotVisuals.push(...handle.slotVisuals)
      this.moduleCleanups.push(handle.onCleanup)
    } else if (buildingType === 'mill' || buildingType === 'well') {
      const handle = buildProducerInterior(this, buildingType, plotIndex, panelX, contentY, onSlotShiftClick, productionContainer)
      this.bindings.push(...handle.bindings)
      this.slotVisuals.push(...handle.slotVisuals)
      this.moduleUpdates.push(handle.update)
    }

    // -- UPGRADES tab (1) -- skipped for workshops
    if (buildingType !== 'workshop') {
      const upgradesContainer = this.add.container(0, 0).setVisible(false)
      tabContainers.push(upgradesContainer)
      const contentTop = contentY - CONTENT_H / 2
      const lineH = 26
      const startY = contentTop + 20
      const leftX = panelX - PANEL_W / 2 + PANEL_PAD + 12

      const levelText = this.add.bitmapText(panelX, startY, 'mainSmall', '', 20)
        .setOrigin(0.5, 0.5).setTint(COLORS.uiGold)
      const levelNextText = this.add.bitmapText(panelX, startY, 'mainSmall', '', 20)
        .setOrigin(0.5, 0.5).setTint(0x44CC44)

      const speedStatText = this.add.bitmapText(panelX, startY + lineH, 'mainSmall', '', 18)
        .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
      const speedNextText = this.add.bitmapText(panelX, startY + lineH, 'mainSmall', '', 18)
        .setOrigin(0.5, 0.5).setTint(0x44CC44)

      const storageStatText = this.add.bitmapText(panelX, startY + lineH * 2, 'mainSmall', '', 18)
        .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
      const storageNextText = this.add.bitmapText(panelX, startY + lineH * 2, 'mainSmall', '', 18)
        .setOrigin(0.5, 0.5).setTint(0x44CC44)

      const btnY = startY + lineH * 3 + 12
      const coinSprite = this.add.sprite(panelX - 80, btnY, 'gold_coin').setScale(2)
      const costText = this.add.bitmapText(panelX - 64, btnY, 'mainSmall', '', 18)
        .setOrigin(0, 0.5).setTint(COLORS.uiGold)
      const btn = this.add.rectangle(panelX + 60, btnY, 140, 36, COLORS.uiBarBg).setInteractive()
      registerGrabbable(btn)
      const btnLabel = this.add.bitmapText(panelX + 60, btnY, 'mainSmall', 'UPGRADE', 20)
        .setOrigin(0.5, 0.5).setTint(COLORS.uiGold)

      upgradesContainer.add([
        levelText, levelNextText, speedStatText, speedNextText,
        storageStatText, storageNextText, coinSprite, costText, btn, btnLabel,
      ])

      const refreshUpgradeText = () => {
        const lvl = plot.level
        const next = lvl + 1

        levelText.setText(`Level ${lvl}  ->  `)
        levelNextText.setText(`${next}`)
        const totalW = levelText.width + levelNextText.width
        const sx = panelX - totalW / 2
        levelText.setOrigin(0, 0.5).setX(sx)
        levelNextText.setOrigin(0, 0.5).setX(sx + levelText.width)

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
    }

    // -- MODIFIERS tab (2) -- skipped for workshops
    if (buildingType !== 'workshop') {
      const modifiersContainer = this.add.container(0, 0).setVisible(false)
      tabContainers.push(modifiersContainer)
      const MOD_COLS = 4
      const MOD_ROWS = 2
      const modGridW = MOD_COLS * SLOT + (MOD_COLS - 1) * SLOT_GAP
      const modGridH = MOD_ROWS * SLOT + (MOD_ROWS - 1) * SLOT_GAP
      const modStartX = panelX - modGridW / 2 + SLOT / 2
      const modStartY = contentY - modGridH / 2 + SLOT / 2

      const ui = this.scene.get('UI') as UI
      const dc = ui.getDragController()

      for (let i = 0; i < MODIFIER_SLOTS_PER_PLOT; i++) {
        const col = i % MOD_COLS
        const row = Math.floor(i / MOD_COLS)
        const slotX = modStartX + col * (SLOT + SLOT_GAP)
        const slotY = modStartY + row * (SLOT + SLOT_GAP)
        const getStack = () => state.plots[plotIndex].modifiers[i]
        const slotImg = makeSlotImage(this, { x: slotX, y: slotY, peek: getStack, tooltipOffsetY: -44 })
        const setStack = (s: ItemStack | null) => { state.plots[plotIndex].modifiers[i] = s }
        this.slotVisuals.push({ x: slotX, y: slotY, getStack, icon: null, count: null, lastType: null, lastCount: 0, container: modifiersContainer })

        const binding = makeStorageBinding({ x: slotX, y: slotY }, getStack, setStack, { onChange: () => {} })
        this.bindings.push(binding)
        dc.register(binding)

        modifiersContainer.add(slotImg)

        slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
          if ((p.event as MouseEvent).shiftKey) { onSlotShiftClick(binding); return }
          dc.handleSlotClick(binding, p)
        })
      }
    }

    // -- INFO tab (3) --
    const infoContainer = this.add.container(0, 0).setVisible(false)
    tabContainers.push(infoContainer)
    {
      const contentTop = contentY - CONTENT_H / 2
      const lineH = 24
      const startY = contentTop + 16
      const leftX = panelX - PANEL_W / 2 + PANEL_PAD + 12

      // building art
      const artSprite = this.add.sprite(panelX, startY + 10, buildingType).setScale(4)
      infoContainer.add(artSprite)

      const descY = startY + 46
      const descText = this.add.bitmapText(leftX, descY, 'mainSmall', def.description, 16)
        .setOrigin(0, 0.5).setTint(COLORS.uiText).setMaxWidth(PANEL_W - PANEL_PAD * 2 - 24)
      infoContainer.add(descText)

      if (def.itemTickMs) {
        const cycleText = this.add.bitmapText(leftX, descY + lineH, 'mainSmall',
          `Cycle Time: ${(getEffectiveTickMs(def.itemTickMs, plot.level) / 1000).toFixed(1)}s`, 16)
          .setOrigin(0, 0.5).setTint(COLORS.uiText)
        infoContainer.add(cycleText)
        this.moduleUpdates.push(() => {
          const ms = getEffectiveTickMs(def.itemTickMs!, plot.level)
          cycleText.setText(`Cycle Time: ${(ms / 1000).toFixed(1)}s`)
        })
      }

      const storageCount = () => plot.output?.count ?? 0
      const storageCap = () => getStorageCap(plot.level)
      const storageText = this.add.bitmapText(leftX, descY + lineH * 2, 'mainSmall',
        `Storage: ${storageCount()}/${storageCap()}`, 16)
        .setOrigin(0, 0.5).setTint(COLORS.uiText)
      infoContainer.add(storageText)
      this.moduleUpdates.push(() => {
        storageText.setText(`Storage: ${storageCount()}/${storageCap()}`)
      })
    }

    // ---- tab switching ----
    const setActiveTab = (idx: number) => {
      for (let i = 0; i < tabNames.length; i++) {
        tabContainers[i].setVisible(i === idx)
        tabUnderlines[i].setVisible(i === idx)
        tabLabels[i].setTint(i === idx ? COLORS.uiGold : COLORS.uiText)
      }
    }
    for (let i = 0; i < tabNames.length; i++) {
      tabLabels[i].on('pointerdown', () => setActiveTab(i))
    }
    setActiveTab(0)
  }

  placeFromInventory(stack: ItemStack) {
    distributeIntoBindings(stack, this.bindings)
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
      v.container?.add(v.icon)
      if (stack.count > 1) {
        v.count = this.add.bitmapText(v.x + 23, v.y + 23, 'main', String(stack.count), 20)
          .setOrigin(1, 1).setTint(COLORS.uiText)
        v.container?.add(v.count)
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
    // If the player is holding an item on the cursor when the interior closes,
    // restore it to the slot it came from so it doesn't vanish into limbo.
    dc.restoreHeld()
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
