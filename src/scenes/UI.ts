import Phaser from 'phaser'
import { COLORS, FONT } from '../colors'
import { BUILDINGS, BUILDING_LIST, INVENTORY_SIZE, CRATE_SLOTS, isBag, state, type BuiltType } from '../game/state'
import { ITEMS, type ItemStack } from '../items/types'
import { DragController } from '../ui/DragController'
import { CursorController } from '../ui/CursorController'
import type { SlotBinding } from '../ui/SlotBinding'
import { attachSlotHover, attachSlotTooltip } from '../ui/hover'
import { makeStorageBinding, distributeIntoBindings, makeCountLabel } from '../ui/slotFactory'
import type { Interior } from './Interior'

const BAR_HEIGHT = 40

export class UI extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.BitmapText
  private hearts: Phaser.GameObjects.Sprite[] = []
  private dragController!: DragController
  private cursorController!: CursorController

  // inventory visuals — one entry per slot, with refs we redraw on change
  private invIcons: (Phaser.GameObjects.Sprite | null)[] = []
  private invCounts: (Phaser.GameObjects.GameObject | null)[] = []
  private invSlotPos: { x: number; y: number }[] = []
  // hotbar teardown tracking — every object and drag-binding the bar creates,
  // so a resize can destroy + rebuild the bar cleanly (mirrors BagPanel).
  private hotbarObjects: Phaser.GameObjects.GameObject[] = []
  private hotbarBindings: SlotBinding[] = []
  // top bar + menu shade kept as refs so resize can re-stretch them.
  private topBar!: Phaser.GameObjects.Rectangle
  // persistent hotbar selection indicator
  private selectionIndicator!: Phaser.GameObjects.Sprite
  // Minecraft-style item-name label that appears above the selected slot and
  // fades out after a moment. Reused across selections.
  private selectionLabel!: Phaser.GameObjects.BitmapText
  private selectionLabelBg!: Phaser.GameObjects.Rectangle
  private selectionLabelTween: Phaser.Tweens.Tween | null = null

  // bag panels — one per bag in inventory, sized to its bag's dimensions.
  // Created on bag pickup, destroyed on bag removal. Position determined by
  // which slot (0 = left of hotbar, 1 = right) the panel was assigned.
  private bagPanels: (BagPanel | null)[] = [null, null]

  // build menu (hidden by default)
  private menuContainer!: Phaser.GameObjects.Container
  private menuShade!: Phaser.GameObjects.Rectangle
  private menuPlotIndex: number = -1

  // ---- crate panel (on-field overlay) ----
  // Index into state.placedCrates for the currently open crate, or -1.
  private openCrateIndex = -1
  // All Phaser objects created for the current crate panel — destroyed on close.
  private crateObjects: Phaser.GameObjects.GameObject[] = []
  // Bindings registered with the drag controller for this panel — unregistered on close.
  private crateBindings: SlotBinding[] = []
  // Per-slot icon and count refs for redraw.
  private crateIcons: (Phaser.GameObjects.Sprite | null)[] = []
  private crateCounts: (Phaser.GameObjects.GameObject | null)[] = []
  // Shade behind the crate panel — blocks clicks and closes on click.
  private crateShade: Phaser.GameObjects.Rectangle | null = null
  // per-row text refs, so we can re-tint them when affordability changes
  private menuRowTexts: Record<string, Phaser.GameObjects.BitmapText[]> = {}

  constructor() {
    super('UI')
  }

  getDragController(): DragController {
    return this.dragController
  }

  // True while a crate storage panel is open. Overworld reads this to suppress
  // its own click/E open logic so the same keypress that closes the panel
  // doesn't immediately reopen it.
  isCrateOpen(): boolean {
    return this.openCrateIndex >= 0
  }

  // True if the screen-space point is over inventory UI (the bottom bar strip
  // or any open bag panel). The Overworld checks this before dropping a held
  // item to the world, so a miss between slots keeps the item in hand instead
  // of falling through to the ground.
  isPointerOverInventory(px: number, py: number): boolean {
    const h = this.scale.height
    // Bottom bar strip, extended up a little so the area just above the hotbar
    // slots (where they poke past UI_BAR_HEIGHT) also catches missed drops.
    if (py >= h - UI_BAR_HEIGHT - 34) return true
    for (const panel of this.bagPanels) {
      if (panel && panel.containsPoint(px, py)) return true
    }
    return false
  }

  // Position of the currently open crate, or null if none is open. Lets the
  // Overworld range-check the player against it each frame to auto-close.
  openCratePos(): { x: number; y: number } | null {
    const c = state.placedCrates[this.openCrateIndex]
    return c ? { x: c.x, y: c.y } : null
  }

  preload() {
    this.load.bitmapFont('main', 'minecraftbm.png', 'minecraftbm.xml')
    this.load.bitmapFont('mainSmall', 'minecraftbmsmall.png', 'minecraftbmsmall.xml')
    this.load.image('menu-bg', 'menu.png')
    this.load.image('menu-slot', 'slot.png')
    this.load.image('menu-longslot', 'longslot.png')
  }

  create() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height

    // drag controller — must exist before any slot registers with it
    this.dragController = new DragController(this)
    // cursor controller — pixel-art cursor that follows the pointer
    this.cursorController = new CursorController(this)

    // top bar
    this.topBar = this.add.rectangle(0, 0, w, BAR_HEIGHT, COLORS.black).setOrigin(0, 0).setAlpha(0.95)
    const initialGold = (this.registry.get('gold') as number | undefined) ?? 0
    this.goldText = this.add.bitmapText(12, BAR_HEIGHT / 2 + 2, 'main', `gold: ${initialGold.toLocaleString()}`, FONT.gold)
      .setOrigin(0, 0.5)
      .setTint(COLORS.uiGold)

    this.registry.events.on('changedata-gold', (_p: unknown, value: number) => {
      this.goldText.setText(`gold: ${value.toLocaleString()}`)
      if (this.menuContainer && this.menuContainer.visible) this.refreshMenuAffordability()
    })

    // hearts — shown only outside a safe zone (combat). Overworld sets 'inCombat'.
    const heartsStartX = this.goldText.x + this.goldText.width + 34
    const startInCombat = (this.registry.get('inCombat') as boolean | undefined) ?? false
    for (let i = 0; i < 3; i++) {
      const heart = this.add.sprite(heartsStartX + i * 28, BAR_HEIGHT / 2, 'heart_full')
        .setOrigin(0, 0.5)
        .setScale(3)
        .setVisible(startInCombat)
      this.hearts.push(heart)
    }
    this.refreshHearts()
    this.registry.events.on('changedata-playerHealth', () => this.refreshHearts())
    this.registry.events.on('changedata-inCombat', (_p: unknown, value: boolean) => {
      for (const h of this.hearts) h.setVisible(value)
    })


    // any code path that changed inventory en-masse fires this — redraw all
    this.registry.events.on('inventory-changed', () => {
      for (let i = 0; i < this.invSlotPos.length; i++) {
        const p = this.invSlotPos[i]
        this.redrawInventorySlot(i, p.x, p.y)
      }
      for (const panel of this.bagPanels) panel?.redrawAll()
      this.syncBagPanels()
    })

    // ---- inventory bar (bottom, always visible) ----
    this.buildInventoryBar(w, h)

    // ---- bag panels (created on-demand when a bag enters inventory) ----
    this.syncBagPanels()

    // mouse wheel cycles selected slot (Minecraft hotbar) — registered once
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
      const dir = dy > 0 ? 1 : -1
      const next = (state.selectedInventorySlot + dir + INVENTORY_SIZE) % INVENTORY_SIZE
      this.setSelectedSlot(next)
    })

    // number keys 1-5 select hotbar slots directly
    const kb = this.input.keyboard!
    const slotKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE']
    for (let i = 0; i < slotKeys.length; i++) {
      kb.on(`keydown-${slotKeys[i]}`, () => this.setSelectedSlot(i))
    }


    // ---- build menu ----
    // full-screen click shade behind menu, blocks pointers + closes on click
    this.menuShade = this.add.rectangle(0, 0, w, h, COLORS.black, 0.4)
      .setOrigin(0, 0)
      .setInteractive()
      .setVisible(false)
    this.menuShade.on('pointerdown', () => this.closeMenu())

    // Esc closes the build menu or crate panel if open. (E is owned by the
    // Overworld, which toggles the crate open/closed — kept there to avoid a
    // two-handler race that would reopen the crate on the same keypress.)
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.menuContainer.visible) this.closeMenu()
      else if (this.openCrateIndex >= 0) this.closeCrate()
    })
    this.input.keyboard!.on('keydown-E', () => {
      if (this.menuContainer.visible) this.closeMenu()
    })

    this.menuContainer = this.add.container(w / 2, h / 2).setVisible(false)
    // Menu contents are built each time the menu opens (in rebuildBuildMenu),
    // so the row list always reflects the player's current unlocked buildings.

    // listen for plot clicks coming from Overworld
    this.registry.events.on('open-build-menu', (plotIndex: number) => {
      this.openMenu(plotIndex)
    })

    // listen for crate clicks/E from Overworld
    this.registry.events.on('open-crate', (crateIndex: number) => {
      this.openCrate(crateIndex)
    })

    // close the build menu or crate panel when entering any building interior
    this.registry.events.on('interior-entered', () => {
      if (this.menuContainer.visible) this.closeMenu()
      if (this.openCrateIndex >= 0) this.closeCrate()
    })

    // Under RESIZE scale mode the canvas tracks the window, so these hand-placed
    // UI elements must re-anchor to the new dimensions. The hotbar is fully torn
    // down and rebuilt (its drag closures capture coords by value, so they have
    // to be recreated, not just moved); bag panels follow via syncBagPanels.
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const nw = gameSize.width
      const nh = gameSize.height
      this.topBar.setSize(nw, BAR_HEIGHT)
      this.menuShade.setSize(nw, nh)
      this.menuContainer.setPosition(nw / 2, nh / 2)
      this.teardownInventoryBar()
      this.buildInventoryBar(nw, nh)
      // bag panels are positioned from the old size too — destroy them so
      // syncBagPanels recreates each at the new dimensions.
      for (let i = 0; i < this.bagPanels.length; i++) {
        this.bagPanels[i]?.destroy()
        this.bagPanels[i] = null
      }
      this.syncBagPanels()
    })
  }

  // Build (or rebuild) the build-menu rows based on the player's currently
  // unlocked buildings. Called from openMenu so newly-unlocked types appear
  // immediately. Destroys any previously-built rows before redrawing.
  private rebuildBuildMenu() {
    // tear down old children
    this.menuContainer.removeAll(true)
    this.menuRowTexts = {} as Record<BuiltType, Phaser.GameObjects.BitmapText[]>

    const unlocked = BUILDING_LIST.filter(t => state.unlockedBuildings.has(t))
    const rowCount = Math.max(1, unlocked.length)

    // Row layout: [icon slot 48] [gap] [longslot 330] [gap] [cost slot 48]
    const ICON_W = 48
    const NAME_W = 330
    const COST_W = 48
    const GAP = 4
    const ROW_W = ICON_W + GAP + NAME_W + GAP + COST_W
    const ROW_H = 48
    const ROW_GAP = 8

    // Menu panel sizing
    const MENU_PAD_X = 24
    const MENU_PAD_Y = 24
    const TITLE_BAND = 36
    const rowStackH = rowCount * ROW_H + (rowCount - 1) * ROW_GAP
    const MENU_W = ROW_W + MENU_PAD_X * 2
    const MENU_H = TITLE_BAND + rowStackH + MENU_PAD_Y * 2

    this.menuContainer.add(
      this.add.nineslice(0, 0, 'menu-bg', undefined, MENU_W, MENU_H, 16, 16, 16, 16),
    )

    // Title above the row list
    const topRowY = -((rowCount - 1) / 2) * (ROW_H + ROW_GAP)
    const title = this.add.bitmapText(0, topRowY - ROW_H / 2 - 18, 'main', 'Build', 20)
      .setOrigin(0.5, 0.5)
      .setTint(COLORS.white)
    this.menuContainer.add(title)

    const iconX = -ROW_W / 2 + ICON_W / 2
    const nameX = iconX + ICON_W / 2 + GAP + NAME_W / 2
    const costX = nameX + NAME_W / 2 + GAP + COST_W / 2

    unlocked.forEach((type, i) => {
      const def = BUILDINGS[type]
      const rowY = topRowY + i * (ROW_H + ROW_GAP)

      const iconSlot = this.add.image(iconX, rowY, 'menu-slot').setInteractive()
      const nameSlot = this.add.image(nameX, rowY, 'menu-longslot').setInteractive()
      const costSlot = this.add.image(costX, rowY, 'menu-slot').setInteractive()
      const iconHover = attachSlotHover(this, iconSlot, iconX, rowY, ICON_W, ROW_H)
      const nameHover = attachSlotHover(this, nameSlot, nameX, rowY, NAME_W, ROW_H)
      const costHover = attachSlotHover(this, costSlot, costX, rowY, COST_W, ROW_H)

      // building icon centered in its slot
      const icon = this.add.sprite(iconX, rowY, type).setScale(2)
      // building name (top) + description (bottom), both left-aligned inside long slot
      const labelX = nameX - NAME_W / 2 + 12
      const label = this.add.bitmapText(labelX, rowY - 8, 'main', def.name, 18)
        .setOrigin(0, 0.5)
        .setTint(COLORS.uiText)
      const desc = this.add.bitmapText(labelX, rowY + 10, 'mainSmall', def.description, 14)
        .setOrigin(0, 0.5)
        .setTint(COLORS.uiText)
      // cost in the cost slot — number, then a coin icon next to it
      const cost = this.add.bitmapText(costX - 6, rowY + 3, 'main', `${def.cost}`, 16)
        .setOrigin(0.5, 0.5)
        .setTint(COLORS.uiText)
      const coin = this.add.sprite(costX + 12, rowY, 'gold_coin').setScale(2)

      this.menuRowTexts[type] = [label, desc, cost]
      this.menuContainer.add([iconSlot, nameSlot, costSlot, icon, label, desc, cost, coin, iconHover, nameHover, costHover])

      const onClick = (p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
        if (!p.leftButtonDown()) return        // buy on left-click only
        ev.stopPropagation()
        if (this.registry.get('gold') < def.cost) return  // can't afford — block
        this.attemptBuy(type)
      }
      iconSlot.on('pointerdown', onClick)
      nameSlot.on('pointerdown', onClick)
      costSlot.on('pointerdown', onClick)
    })
  }

  private openMenu(plotIndex: number) {
    this.menuPlotIndex = plotIndex
    this.rebuildBuildMenu()
    this.menuShade.setVisible(true)
    this.menuContainer.setVisible(true)
    this.refreshMenuAffordability()
  }

  private refreshHearts() {
    const health = (this.registry.get('playerHealth') as number | undefined) ?? this.hearts.length
    for (let i = 0; i < this.hearts.length; i++) {
      const fill = Math.max(0, Math.min(1, health - i))
      const key =
        fill >= 1 ? 'heart_full' :
        fill >= 0.75 ? 'heart_3q' :
        fill >= 0.5 ? 'heart_half' :
        fill >= 0.25 ? 'heart_1q' :
        'heart_empty'
      this.hearts[i].setTexture(key)
    }
  }

  private refreshMenuAffordability() {
    const gold = this.registry.get('gold') as number
    for (const type of Object.keys(this.menuRowTexts) as BuiltType[]) {
      const def = BUILDINGS[type]
      const tint = gold >= def.cost ? COLORS.uiText : COLORS.menuDisabled
      for (const t of this.menuRowTexts[type]) t.setTint(tint)
    }
  }

  private closeMenu() {
    this.menuPlotIndex = -1
    this.menuShade.setVisible(false)
    this.menuContainer.setVisible(false)
  }

  private attemptBuy(type: BuiltType) {
    if (this.menuPlotIndex < 0) return
    // ask Overworld to handle the actual placement
    this.registry.events.emit('buy-building', this.menuPlotIndex, type)
    this.closeMenu()
  }

  private buildInventoryBar(w: number, h: number) {
    const SLOT = 48
    const GAP = 4
    const PAD_X = 16
    const PAD_Y = 12
    const layoutW = INVENTORY_SIZE * SLOT + (INVENTORY_SIZE - 1) * GAP

    const barW = layoutW + PAD_X * 2
    const barH = SLOT + PAD_Y * 2
    const barY = h - barH / 2

    // 9-sliced menu background as the bar. Depth 150 keeps the hotbar above the
    // crate blocker (depth 100) so it stays clickable while a crate is open.
    const barBg = this.add.nineslice(w / 2, barY, 'menu-bg', undefined, barW, barH, 16, 16, 16, 16).setDepth(150)
    this.hotbarObjects.push(barBg)

    const startX = w / 2 - layoutW / 2 + SLOT / 2
    for (let i = 0; i < INVENTORY_SIZE; i++) {
      const slotIndex = i
      const x = startX + i * (SLOT + GAP)
      const slotImg = this.add.image(x, barY, 'menu-slot').setInteractive().setDepth(200)
      const hoverObj = attachSlotHover(this, slotImg, x, barY)
      attachSlotTooltip(this, slotImg, x, barY, () => state.inventory[slotIndex])
      this.hotbarObjects.push(slotImg, hoverObj)

      this.invIcons[slotIndex] = null
      this.invCounts[slotIndex] = null
      this.invSlotPos[slotIndex] = { x, y: barY }

      // register as a drag-and-drop slot
      const binding: SlotBinding = {
        getScreenPos: () => ({ x, y: barY }),
        peek: () => state.inventory[slotIndex],
        accepts: (itemType) => {
          const cur = state.inventory[slotIndex]
          return cur === null || cur.type === itemType
        },
        take: (count: number) => {
          const cur = state.inventory[slotIndex]
          if (!cur) return null
          const n = Math.min(count, cur.count)
          if (n <= 0) return null
          const taken: ItemStack = { type: cur.type, count: n }
          // preserve bag contents on the taken stack
          if (isBag(cur.type) && cur.contents) taken.contents = cur.contents
          cur.count -= n
          if (cur.count <= 0) state.inventory[slotIndex] = null
          this.redrawInventorySlot(slotIndex, x, barY)
          this.syncBagPanels()
          return taken
        },
        offer: (stack) => {
          const accepted = state.inventoryOffer(slotIndex, stack)
          if (accepted > 0) {
            this.redrawInventorySlot(slotIndex, x, barY)
            this.syncBagPanels()
          }
          return accepted
        },
        restore: (stack) => {
          const accepted = state.inventoryOffer(slotIndex, stack)
          if (accepted > 0) this.redrawInventorySlot(slotIndex, x, barY)
          return accepted
        },
      }
      this.dragController.register(binding)
      this.hotbarBindings.push(binding)

      slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if ((p.event as MouseEvent).shiftKey) {
          if (!state.inventory[slotIndex]) return
          this.shiftSendFromInventory(slotIndex, binding)
          return
        }
        this.dragController.handleSlotClick(binding, p)
      })

      // initial render in case state was pre-seeded
      this.redrawInventorySlot(slotIndex, x, barY)
    }

    // persistent hotbar selection indicator — rounded hollow frame sprite
    const SELECTION_DEPTH = 9999
    const first = this.invSlotPos[state.selectedInventorySlot]
    this.selectionIndicator = this.add.sprite(first.x, first.y, 'select_frame')
      .setScale(2)
      .setTint(COLORS.white)
      .setDepth(SELECTION_DEPTH)

    // Minecraft-style item name label — shown briefly when selection changes.
    // Matches the slot tooltip style for visual consistency.
    this.selectionLabelBg = this.add.rectangle(first.x, first.y - 48, 10, 10, COLORS.black, 0.75)
      .setDepth(10000)
      .setVisible(false)
    this.selectionLabel = this.add.bitmapText(first.x, first.y - 48, 'main', '', FONT.desc)
      .setOrigin(0.5, 0.5)
      .setTint(COLORS.white)
      .setDepth(10001)
      .setVisible(false)

    this.hotbarObjects.push(this.selectionIndicator, this.selectionLabelBg, this.selectionLabel)
  }

  // Destroy every object and unregister every binding the hotbar created, so
  // buildInventoryBar can run again on resize without leaking or leaving stale
  // closures. Slot icons/counts live in invIcons/invCounts and are cleared too.
  private teardownInventoryBar() {
    for (const b of this.hotbarBindings) this.dragController.unregister(b)
    this.hotbarBindings = []
    for (const obj of this.hotbarObjects) obj.destroy()
    this.hotbarObjects = []
    for (const icon of this.invIcons) icon?.destroy()
    for (const count of this.invCounts) count?.destroy()
    this.invIcons = []
    this.invCounts = []
  }

  // Create panels for new bags, destroy panels for removed bags. Each panel
  // sticks to its assigned side until its bag leaves inventory.
  private syncBagPanels() {
    const bags = state.getBags()
    // first pass: destroy panels whose bound bag is no longer in inventory
    for (let i = 0; i < this.bagPanels.length; i++) {
      const panel = this.bagPanels[i]
      if (panel && !bags.includes(panel.getBag())) {
        panel.destroy()
        this.bagPanels[i] = null
      }
    }
    // second pass: assign any unbound bags to empty panel slots
    const w = this.cameras.main.width
    const h = this.cameras.main.height
    for (const bag of bags) {
      const alreadyBound = this.bagPanels.some(p => p?.getBag() === bag)
      if (alreadyBound) continue
      const emptyIdx = this.bagPanels.findIndex(p => p === null)
      if (emptyIdx === -1) continue
      this.bagPanels[emptyIdx] = new BagPanel(this, emptyIdx, w, h, bag)
    }
  }

  private setSelectedSlot(i: number) {
    state.selectedInventorySlot = i
    const pos = this.invSlotPos[i]
    this.selectionIndicator.setPosition(pos.x, pos.y)
    this.showSelectionLabel(i, pos)
  }

  // Show the item name above the selected slot, then fade out after a beat.
  // Subsequent calls cancel the in-progress fade and start fresh. Skipped
  // if the pointer is currently over the selected slot (hover tooltip is
  // already showing the same info — no duplicate).
  private showSelectionLabel(slotIndex: number, pos: { x: number; y: number }) {
    const stack = state.inventory[slotIndex]
    this.selectionLabelTween?.stop()
    this.selectionLabelTween = null

    // skip if pointer is over this slot — hover tooltip is already there
    const p = this.input.activePointer
    if (Math.abs(p.x - pos.x) < 24 && Math.abs(p.y - pos.y) < 24) {
      this.selectionLabel.setVisible(false)
      this.selectionLabelBg.setVisible(false)
      return
    }

    if (!stack) {
      this.selectionLabel.setVisible(false)
      this.selectionLabelBg.setVisible(false)
      return
    }

    const name = ITEMS[stack.type].name
    this.selectionLabel.setText(name)
    this.selectionLabel.setPosition(pos.x, pos.y - 48)
    this.selectionLabel.setAlpha(1).setVisible(true)
    this.selectionLabelBg.setSize(this.selectionLabel.width + 12, this.selectionLabel.height + 6)
    this.selectionLabelBg.setPosition(pos.x, pos.y - 48)
    this.selectionLabelBg.setAlpha(1).setVisible(true)

    this.selectionLabelTween = this.tweens.add({
      targets: [this.selectionLabel, this.selectionLabelBg],
      alpha: 0,
      duration: 600,
      delay: 1000,
      onComplete: () => {
        this.selectionLabel.setVisible(false)
        this.selectionLabelBg.setVisible(false)
      },
    })
  }

  update() {
    this.cursorController.refresh()
  }

  private redrawInventorySlot(i: number, x: number, y: number) {
    const stack = state.inventory[i]
    // clear previous visuals for this slot
    this.invIcons[i]?.destroy()
    this.invCounts[i]?.destroy()
    this.invIcons[i] = null
    this.invCounts[i] = null
    if (!stack) return
    this.invIcons[i] = this.add.sprite(x, y, ITEMS[stack.type].sprite).setScale(ITEMS[stack.type].scale).setDepth(200)
    if (stack.count > 1) {
      this.invCounts[i] = makeCountLabel(this, x, y, stack.count, 201)
    }
  }

  // ---- Crate panel ----

  private openCrate(crateIndex: number) {
    // close any already-open crate first
    if (this.openCrateIndex >= 0) this.closeCrate()
    // also close the build menu if open
    if (this.menuContainer.visible) this.closeMenu()

    this.openCrateIndex = crateIndex
    const crate = state.placedCrates[crateIndex]
    if (!crate) return

    const COLS = 6
    const ROWS = 4
    const SLOT = 48
    const SLOT_GAP = 4
    const PANEL_PAD = 36
    const TITLE_H = 40

    const w = this.cameras.main.width
    const h = this.cameras.main.height

    // Invisible click-blocker over the play area only (NOT the hotbar). Closes
    // the crate on click and absorbs the click so it doesn't reach the world.
    // The hotbar strip below stays live so items can be dragged/shift-clicked
    // between inventory and crate.
    // Full play-area-to-bottom blocker. It sits at a low depth (below the
    // hotbar and bag panels, which are bumped above it), so those stay
    // clickable while every empty spot — including the bottom strip beside
    // the hotbar — hits the blocker and closes the crate.
    const blockerH = h - UI_BAR_HEIGHT
    this.crateShade = this.add.rectangle(0, UI_BAR_HEIGHT, w, blockerH, COLORS.black, 0.45)
      .setOrigin(0, 0)
      .setInteractive()
      .setDepth(100)
    this.crateShade.on('pointerdown', () => this.closeCrate())
    this.crateObjects.push(this.crateShade)

    // panel dimensions
    const gridW = COLS * SLOT + (COLS - 1) * SLOT_GAP
    const gridH = ROWS * SLOT + (ROWS - 1) * SLOT_GAP
    const panelW = gridW + PANEL_PAD * 2
    const panelH = PANEL_PAD + TITLE_H + gridH + PANEL_PAD

    const playAreaTop = UI_BAR_HEIGHT
    const playAreaH = h - UI_BAR_HEIGHT - (h - this.invSlotPos[0].y + SLOT / 2 + 12)
    const panelX = w / 2
    const panelY = playAreaTop + playAreaH / 2

    // 9-slice panel background
    const bg = this.add.nineslice(panelX, panelY, 'menu-bg', undefined, panelW, panelH, 16, 16, 16, 16)
      .setTint(COLORS.interiorPanel)
      .setDepth(9001)
    this.crateObjects.push(bg)

    // title
    const titleY = panelY - panelH / 2 + PANEL_PAD + 16
    const title = this.add.bitmapText(panelX, titleY, 'main', 'Crate', FONT.title)
      .setOrigin(0.5, 0.5)
      .setTint(COLORS.uiText)
      .setDepth(9002)
    this.crateObjects.push(title)

    // slot grid
    const gridTop = titleY + TITLE_H / 2 + SLOT_GAP
    const gridLeft = panelX - gridW / 2 + SLOT / 2

    this.crateIcons = Array.from({ length: CRATE_SLOTS }, () => null)
    this.crateCounts = Array.from({ length: CRATE_SLOTS }, () => null)

    const dc = this.dragController

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c
        const x = gridLeft + c * (SLOT + SLOT_GAP)
        const y = gridTop + SLOT / 2 + r * (SLOT + SLOT_GAP)

        const getStack = () => crate.contents[i]
        const setStack = (s: ItemStack | null) => { crate.contents[i] = s }

        const slotImg = this.add.image(x, y, 'menu-slot')
          .setTint(COLORS.interiorPanel)
          .setInteractive()
          .setDepth(9002)
        const hoverObj = attachSlotHover(this, slotImg, x, y)
        ;(hoverObj as Phaser.GameObjects.Rectangle).setDepth(9003)
        attachSlotTooltip(this, slotImg, x, y, getStack, -44)
        this.crateObjects.push(slotImg, hoverObj)

        const binding = makeStorageBinding({ x, y }, getStack, setStack, {
          onChange: () => {
            this.redrawCrateSlot(i, x, y)
            // a bag may have moved into/out of this slot — resync bag panels
            // (destroys the panel for a bag stored in the crate) and hotbar.
            this.registry.events.emit('inventory-changed')
          },
        })
        this.crateBindings.push(binding)
        dc.register(binding)

        slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
          if ((p.event as MouseEvent).shiftKey) {
            // shift-click: move crate slot → inventory
            const peek = binding.peek()
            if (!peek) return
            const stack = binding.take(peek.count)
            if (!stack) return
            state.inventoryAddAnywhere(stack)
            if (stack.count > 0) binding.restore(stack)
            this.registry.events.emit('inventory-changed')
            return
          }
          dc.handleSlotClick(binding, p)
        })

        // initial render
        this.redrawCrateSlot(i, x, y)
      }
    }
  }

  // Public so the Overworld E-key (single owner of the crate toggle) can close.
  closeCrate() {
    // unregister all crate bindings from the drag controller
    const dc = this.dragController
    for (const b of this.crateBindings) dc.unregister(b)
    this.crateBindings = []
    // destroy all crate icons and counts
    for (const icon of this.crateIcons) icon?.destroy()
    for (const count of this.crateCounts) count?.destroy()
    this.crateIcons = []
    this.crateCounts = []
    // destroy all panel objects (shade, bg, slots, title)
    for (const obj of this.crateObjects) obj.destroy()
    this.crateObjects = []
    this.crateShade = null
    this.openCrateIndex = -1
  }

  private redrawCrateSlot(i: number, x: number, y: number) {
    this.crateIcons[i]?.destroy()
    this.crateCounts[i]?.destroy()
    this.crateIcons[i] = null
    this.crateCounts[i] = null
    if (this.openCrateIndex < 0) return
    const crate = state.placedCrates[this.openCrateIndex]
    if (!crate) return
    const stack = crate.contents[i]
    if (!stack) return
    this.crateIcons[i] = this.add.sprite(x, y, ITEMS[stack.type].sprite)
      .setScale(ITEMS[stack.type].scale)
      .setDepth(9003)
    if (stack.count > 1) {
      this.crateCounts[i] = makeCountLabel(this, x, y, stack.count, 9004)
    }
  }

  // Shift-click from inventory: if a building interior is open, ask it to place
  // the stack into its slots. Otherwise nothing happens (no building to send to).
  private shiftSendFromInventory(slotIndex: number, _source: SlotBinding) {
    const stack = state.inventory[slotIndex]
    if (!stack) return

    // crate panel open → distribute into the crate's slots
    if (this.openCrateIndex >= 0) {
      state.inventory[slotIndex] = null
      distributeIntoBindings(stack, this.crateBindings)
      if (stack.count > 0) state.inventoryAddAnywhere(stack)
    } else if (this.scene.isActive('Interior')) {
      // building interior open → ask it to place the stack
      state.inventory[slotIndex] = null
      const interior = this.scene.get('Interior') as unknown as Interior
      interior.placeFromInventory(stack)
      if (stack.count > 0) state.inventoryAddAnywhere(stack)
    } else {
      return   // nothing open to send to
    }

    for (let i = 0; i < this.invSlotPos.length; i++) {
      const p = this.invSlotPos[i]
      this.redrawInventorySlot(i, p.x, p.y)
    }
  }

  // Shift-click from a bag slot: send to the open interior. Called by BagPanel.
  shiftSendFromBagPanel(panel: BagPanel, slotIndex: number) {
    const bag = panel.getBag()
    if (!bag.contents) return
    const stack = bag.contents[slotIndex]
    if (!stack) return

    // crate panel open → distribute into the crate's slots
    if (this.openCrateIndex >= 0) {
      bag.contents[slotIndex] = null
      distributeIntoBindings(stack, this.crateBindings)
      if (stack.count > 0) state.inventoryAddAnywhere(stack)
    } else if (this.scene.isActive('Interior')) {
      bag.contents[slotIndex] = null
      const interior = this.scene.get('Interior') as unknown as Interior
      interior.placeFromInventory(stack)
      if (stack.count > 0) state.inventoryAddAnywhere(stack)
    } else {
      return
    }

    for (const p of this.bagPanels) p?.redrawAll()
    for (let i = 0; i < this.invSlotPos.length; i++) {
      const p = this.invSlotPos[i]
      this.redrawInventorySlot(i, p.x, p.y)
    }
  }
}

// ---------------------------------------------------------------------------
// BagPanel — one panel per bag. Built on bag pickup, destroyed on bag removal.
// Reads dimensions from the bag's ItemDef (bagCols × bagRows) so different
// bag sizes get correctly-sized panels. Position determined by panelIndex
// (0 = left of hotbar, 1 = right).
// ---------------------------------------------------------------------------

class BagPanel {
  private ui: UI
  private bag: ItemStack
  private objects: Phaser.GameObjects.GameObject[] = []
  private icons: (Phaser.GameObjects.Sprite | null)[] = []
  private counts: (Phaser.GameObjects.GameObject | null)[] = []
  private slotPos: { x: number; y: number }[] = []
  private bindings: SlotBinding[] = []
  // top edge Y of this panel (set in constructor) — read by the crate blocker.
  private topY = 0
  // Full panel bounds (set in constructor) — read by isPointerOverInventory so
  // a missed drop over the panel doesn't fall through to the world.
  private bounds = { x: 0, y: 0, w: 0, h: 0 }
  containsPoint(px: number, py: number): boolean {
    const b = this.bounds
    return px >= b.x - b.w / 2 && px <= b.x + b.w / 2 && py >= b.y - b.h / 2 && py <= b.y + b.h / 2
  }

  constructor(ui: UI, panelIndex: number, w: number, h: number, bag: ItemStack) {
    this.ui = ui
    this.bag = bag

    const def = ITEMS[bag.type]
    const COLS = def.bagCols!
    const ROWS = def.bagRows!

    const SLOT = 48
    const GAP = 4
    const PAD_X = 12
    const PAD_Y = 10
    const panelW = COLS * SLOT + (COLS - 1) * GAP + PAD_X * 2
    const panelH = ROWS * SLOT + (ROWS - 1) * GAP + PAD_Y * 2

    const invLayoutW = INVENTORY_SIZE * SLOT + (INVENTORY_SIZE - 1) * GAP + 16 * 2
    const invLeft = w / 2 - invLayoutW / 2
    const invRight = w / 2 + invLayoutW / 2

    const panelCenterX = panelIndex === 0
      ? invLeft - 8 - panelW / 2
      : invRight + 8 + panelW / 2

    const barH = SLOT + 12 * 2
    const barY = h - barH / 2
    const panelCenterY = barY + barH / 2 - panelH / 2
    // top edge of this panel — the crate blocker clips above this so it never
    // covers (and steals clicks from) the bag panels poking up into the play area.
    this.topY = panelCenterY - panelH / 2


    const scene = ui as unknown as Phaser.Scene
    const bg = scene.add.nineslice(panelCenterX, panelCenterY, 'menu-bg', undefined, panelW, panelH, 16, 16, 16, 16).setDepth(150)
    this.bounds = { x: panelCenterX, y: panelCenterY, w: panelW, h: panelH }
    // Swallow clicks that land on the panel (e.g. gaps between slots) so a held
    // item isn't dropped into the world when you miss a slot. Slots sit above
    // this and still get the click first; only the gaps fall through to here.
    bg.setInteractive()
    bg.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation()
    })
    this.objects.push(bg)

    const startX = panelCenterX - (COLS - 1) * (SLOT + GAP) / 2
    const startY = panelCenterY - (ROWS - 1) * (SLOT + GAP) / 2

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const i = row * COLS + col
        const x = startX + col * (SLOT + GAP)
        const y = startY + row * (SLOT + GAP)
        this.slotPos[i] = { x, y }
        this.icons[i] = null
        this.counts[i] = null

        const slotImg = scene.add.image(x, y, 'menu-slot').setInteractive().setDepth(200)
        const hoverObj = attachSlotHover(scene, slotImg, x, y)
        attachSlotTooltip(scene, slotImg, x, y, () => this.peekSlot(i))
        this.objects.push(slotImg, hoverObj)

        const binding: SlotBinding = {
          getScreenPos: () => ({ x, y }),
          peek: () => this.peekSlot(i),
          accepts: (itemType) => {
            const cur = this.peekSlot(i)
            return cur === null || cur.type === itemType
          },
          take: (count: number) => {
            const cur = this.peekSlot(i)
            if (!cur || !this.bag.contents) return null
            const n = Math.min(count, cur.count)
            if (n <= 0) return null
            const taken: ItemStack = { type: cur.type, count: n }
            cur.count -= n
            if (cur.count <= 0) this.bag.contents[i] = null
            this.redrawSlot(i)
            return taken
          },
          offer: (stack) => {
            const accepted = this.offerSlot(i, stack)
            if (accepted > 0) this.redrawSlot(i)
            return accepted
          },
          restore: (stack) => {
            const accepted = this.offerSlot(i, stack)
            if (accepted > 0) this.redrawSlot(i)
            return accepted
          },
        }
        this.bindings.push(binding)
        ui.getDragController().register(binding)

        slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
          if ((p.event as MouseEvent).shiftKey) {
            if (!this.peekSlot(i)) return
            // figure out which panel index we are now (caller wants 0 or 1)
            ui.shiftSendFromBagPanel(this, i)
            return
          }
          ui.getDragController().handleSlotClick(binding, p)
        })
      }
    }

    this.redrawAll()
  }

  // Read a specific slot's stack from the bound bag.
  private peekSlot(i: number): ItemStack | null {
    if (!this.bag.contents) return null
    return this.bag.contents[i]
  }

  // Same offer rules as state.inventoryOffer but for this bag's slot.
  // Bags can nest — a nested bag is inert storage (no panel pops up for it).
  private offerSlot(i: number, stack: Readonly<ItemStack>): number {
    if (!this.bag.contents) return 0
    const existing = this.bag.contents[i]
    const cap = ITEMS[stack.type].maxStack
    if (!existing) {
      const moved = Math.min(cap, stack.count)
      const placed: ItemStack = { type: stack.type, count: moved }
      // carry bag contents into the destination slot (nested bag storage)
      if (stack.contents) placed.contents = stack.contents
      this.bag.contents[i] = placed
      return moved
    }
    if (existing.type !== stack.type) return 0
    const room = cap - existing.count
    if (room <= 0) return 0
    const moved = Math.min(room, stack.count)
    existing.count += moved
    return moved
  }

  getBag(): ItemStack {
    return this.bag
  }

  // Top edge Y of this panel — used to clip the crate blocker above it.
  getTopY(): number {
    return this.topY
  }

  redrawAll() {
    for (let i = 0; i < this.slotPos.length; i++) this.redrawSlot(i)
  }

  private redrawSlot(i: number) {
    const stack = this.peekSlot(i)
    const pos = this.slotPos[i]
    this.icons[i]?.destroy()
    this.counts[i]?.destroy()
    this.icons[i] = null
    this.counts[i] = null
    if (!stack) return
    const scene = this.ui as unknown as Phaser.Scene
    this.icons[i] = scene.add.sprite(pos.x, pos.y, ITEMS[stack.type].sprite).setScale(ITEMS[stack.type].scale).setDepth(200)
    if (stack.count > 1) {
      this.counts[i] = makeCountLabel(scene, pos.x, pos.y, stack.count, 201)
    }
  }

  // Tear down the panel completely: destroy all game objects, unregister
  // all bindings from the drag controller.
  destroy() {
    const dc = this.ui.getDragController()
    for (const b of this.bindings) dc.unregister(b)
    this.bindings = []
    for (const obj of this.objects) obj.destroy()
    for (const icon of this.icons) icon?.destroy()
    for (const count of this.counts) count?.destroy()
    this.objects = []
    this.icons = []
    this.counts = []
  }
}

export const UI_BAR_HEIGHT = BAR_HEIGHT
// height the inventory bar takes at the bottom of the screen
// (kept in sync with buildInventoryBar — SLOT + PAD_Y * 2)
export const UI_INVENTORY_BAR_HEIGHT = 48 + 12 * 2
