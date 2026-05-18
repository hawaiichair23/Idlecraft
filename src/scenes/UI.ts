import Phaser from 'phaser'
import { COLORS } from '../colors'
import { BUILDINGS, BUILDING_LIST, INVENTORY_SIZE, isBag, state, type BuiltType } from '../game/state'
import { ITEMS, type ItemStack } from '../items/types'
import { DragController } from '../ui/DragController'
import { CursorController } from '../ui/CursorController'
import type { SlotBinding } from '../ui/SlotBinding'
import { attachSlotHover, attachSlotTooltip } from '../ui/hover'
import type { Interior } from './Interior'

const BAR_HEIGHT = 40

export class UI extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.BitmapText
  private dragController!: DragController
  private cursorController!: CursorController

  // inventory visuals — one entry per slot, with refs we redraw on change
  private invIcons: (Phaser.GameObjects.Sprite | null)[] = []
  private invCounts: (Phaser.GameObjects.BitmapText | null)[] = []
  private invSlotPos: { x: number; y: number }[] = []
  // persistent hotbar selection indicator
  private selectionIndicator!: Phaser.GameObjects.Rectangle
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
  // per-row text refs, so we can re-tint them when affordability changes
  private menuRowTexts: Record<string, Phaser.GameObjects.BitmapText[]> = {}

  constructor() {
    super('UI')
  }

  getDragController(): DragController {
    return this.dragController
  }

  preload() {
    this.load.bitmapFont('main', '/minecraftbm.png', '/minecraftbm.xml')
    this.load.bitmapFont('mainSmall', '/minecraftbmsmall.png', '/minecraftbmsmall.xml')
    this.load.image('menu-bg', '/menu.png')
    this.load.image('menu-slot', '/slot.png')
    this.load.image('menu-longslot', '/longslot.png')
  }

  create() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height

    // drag controller — must exist before any slot registers with it
    this.dragController = new DragController(this)
    // cursor controller — pixel-art cursor that follows the pointer
    this.cursorController = new CursorController(this)

    // top bar
    this.add.rectangle(0, 0, w, BAR_HEIGHT, COLORS.uiBarBg).setOrigin(0, 0)
    const initialGold = (this.registry.get('gold') as number | undefined) ?? 0
    this.goldText = this.add.bitmapText(12, BAR_HEIGHT / 2, 'main', `gold: ${initialGold.toLocaleString()}`, 20)
      .setOrigin(0, 0.5)
      .setTint(COLORS.uiGold)

    this.registry.events.on('changedata-gold', (_p: unknown, value: number) => {
      this.goldText.setText(`gold: ${value.toLocaleString()}`)
      if (this.menuContainer && this.menuContainer.visible) this.refreshMenuAffordability()
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


    // ---- build menu ----
    // full-screen click shade behind menu, blocks pointers + closes on click
    this.menuShade = this.add.rectangle(0, 0, w, h, 0x000000, 0.4)
      .setOrigin(0, 0)
      .setInteractive()
      .setVisible(false)
    this.menuShade.on('pointerdown', () => this.closeMenu())

    // Esc or E closes the build menu if it's open
    this.input.keyboard!.on('keydown-ESC', () => { if (this.menuContainer.visible) this.closeMenu() })
    this.input.keyboard!.on('keydown-E', () => { if (this.menuContainer.visible) this.closeMenu() })

    this.menuContainer = this.add.container(w / 2, h / 2).setVisible(false)
    // Menu contents are built each time the menu opens (in rebuildBuildMenu),
    // so the row list always reflects the player's current unlocked buildings.

    // listen for plot clicks coming from Overworld
    this.registry.events.on('open-build-menu', (plotIndex: number) => {
      this.openMenu(plotIndex)
    })

    // close the build menu when entering any building interior
    this.registry.events.on('interior-entered', () => {
      if (this.menuContainer.visible) this.closeMenu()
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
      .setTint(0xFFFFFF)
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

      const onClick = (_p: any, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
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
    const barY = h - barH / 2   // bottom of bar flush with bottom of screen

    // 9-sliced menu background as the bar
    this.add.nineslice(w / 2, barY, 'menu-bg', undefined, barW, barH, 16, 16, 16, 16)

    const startX = w / 2 - layoutW / 2 + SLOT / 2
    for (let i = 0; i < INVENTORY_SIZE; i++) {
      const slotIndex = i
      const x = startX + i * (SLOT + GAP)
      const slotImg = this.add.image(x, barY, 'menu-slot').setInteractive()
      attachSlotHover(this, slotImg, x, barY)
      attachSlotTooltip(this, slotImg, x, barY, () => state.inventory[slotIndex])

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

    // persistent hotbar selection indicator — hollow square over the selected slot
    const SELECTION_SIZE = 56
    const SELECTION_STROKE = 3
    const SELECTION_COLOR = 0xffffff
    const SELECTION_DEPTH = 9999
    const first = this.invSlotPos[state.selectedInventorySlot]
    this.selectionIndicator = this.add.rectangle(first.x, first.y, SELECTION_SIZE, SELECTION_SIZE)
      .setStrokeStyle(SELECTION_STROKE, SELECTION_COLOR)
      .setFillStyle()
      .setDepth(SELECTION_DEPTH)

    // Minecraft-style item name label — shown briefly when selection changes.
    // Matches the slot tooltip style for visual consistency.
    this.selectionLabelBg = this.add.rectangle(first.x, first.y - 48, 10, 10, 0x000000, 0.75)
      .setDepth(10000)
      .setVisible(false)
    this.selectionLabel = this.add.bitmapText(first.x, first.y - 48, 'main', '', 14)
      .setOrigin(0.5, 0.5)
      .setTint(0xFFFFFF)
      .setDepth(10001)
      .setVisible(false)
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
    this.invIcons[i] = this.add.sprite(x, y, ITEMS[stack.type].sprite).setScale(ITEMS[stack.type].scale)
    if (stack.count > 1) {
      this.invCounts[i] = this.add.bitmapText(x + 23, y + 23, 'main', String(stack.count), 20)
        .setOrigin(1, 1)
        .setTint(COLORS.uiText)
    }
  }

  // Shift-click from inventory: if a building interior is open, ask it to place
  // the stack into its slots. Otherwise nothing happens (no building to send to).
  private shiftSendFromInventory(slotIndex: number, _source: SlotBinding) {
    const stack = state.inventory[slotIndex]
    if (!stack) return
    if (!this.scene.isActive('Interior')) return

    state.inventory[slotIndex] = null
    const interior = this.scene.get('Interior') as unknown as Interior
    interior.placeFromInventory(stack)
    // bounce leftover back into inventory
    if (stack.count > 0) state.inventoryAddAnywhere(stack)

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
    if (!this.scene.isActive('Interior')) return

    bag.contents[slotIndex] = null
    const interior = this.scene.get('Interior') as unknown as Interior
    interior.placeFromInventory(stack)
    // bounce leftover back anywhere there's room
    if (stack.count > 0) state.inventoryAddAnywhere(stack)

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
  private counts: (Phaser.GameObjects.BitmapText | null)[] = []
  private slotPos: { x: number; y: number }[] = []
  private bindings: SlotBinding[] = []

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

    const scene = ui as unknown as Phaser.Scene
    const bg = scene.add.nineslice(panelCenterX, panelCenterY, 'menu-bg', undefined, panelW, panelH, 16, 16, 16, 16)
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

        const slotImg = scene.add.image(x, y, 'menu-slot').setInteractive()
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
      this.bag.contents[i] = { type: stack.type, count: moved }
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
    this.icons[i] = scene.add.sprite(pos.x, pos.y, ITEMS[stack.type].sprite).setScale(ITEMS[stack.type].scale)
    if (stack.count > 1) {
      this.counts[i] = scene.add.bitmapText(pos.x + 23, pos.y + 23, 'main', String(stack.count), 20)
        .setOrigin(1, 1)
        .setTint(COLORS.uiText)
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
