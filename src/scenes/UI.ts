import Phaser from 'phaser'
import { COLORS } from '../colors'
import { BUILDINGS, BUILDING_LIST, INVENTORY_SIZE, state, type BuiltType } from '../game/state'
import { ITEMS, type ItemStack } from '../items/types'
import { DragController } from '../ui/DragController'
import type { SlotBinding } from '../ui/SlotBinding'
import type { Interior } from './Interior'

const BAR_HEIGHT = 40

export class UI extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.BitmapText
  private dragController!: DragController

  // inventory visuals — one entry per slot, with refs we redraw on change
  private invIcons: (Phaser.GameObjects.Sprite | null)[] = []
  private invCounts: (Phaser.GameObjects.BitmapText | null)[] = []
  private invSlotPos: { x: number; y: number }[] = []

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

    // top bar
    this.add.rectangle(0, 0, w, BAR_HEIGHT, COLORS.uiBarBg).setOrigin(0, 0)
    this.goldText = this.add.bitmapText(12, BAR_HEIGHT / 2, 'main', 'gold: 0', 20)
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
    })

    // ---- inventory bar (bottom, always visible) ----
    this.buildInventoryBar(w, h)


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
    this.menuContainer.add(this.add.image(0, 0, 'menu-bg'))

    // Row layout: [icon slot 48] [gap] [longslot 330] [gap] [cost slot 48]
    const ICON_W = 48
    const NAME_W = 330
    const COST_W = 48
    const GAP = 4
    const ROW_W = ICON_W + GAP + NAME_W + GAP + COST_W
    const ROW_H = 48
    const ROW_GAP = 8

    const iconX = -ROW_W / 2 + ICON_W / 2
    const nameX = iconX + ICON_W / 2 + GAP + NAME_W / 2
    const costX = nameX + NAME_W / 2 + GAP + COST_W / 2

    BUILDING_LIST.forEach((type, i) => {
      const def = BUILDINGS[type]
      const rowY = -((BUILDING_LIST.length - 1) / 2) * (ROW_H + ROW_GAP) + i * (ROW_H + ROW_GAP)

      const iconSlot = this.add.image(iconX, rowY, 'menu-slot').setInteractive({ useHandCursor: true })
      const nameSlot = this.add.image(nameX, rowY, 'menu-longslot').setInteractive({ useHandCursor: true })
      const costSlot = this.add.image(costX, rowY, 'menu-slot').setInteractive({ useHandCursor: true })

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
      this.menuContainer.add([iconSlot, nameSlot, costSlot, icon, label, desc, cost, coin])

      const onClick = (_p: any, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation()
        if (this.registry.get('gold') < def.cost) return  // can't afford — block
        this.attemptBuy(type)
      }
      iconSlot.on('pointerdown', onClick)
      nameSlot.on('pointerdown', onClick)
      costSlot.on('pointerdown', onClick)
    })

    // listen for plot clicks coming from Overworld
    this.registry.events.on('open-build-menu', (plotIndex: number) => {
      this.openMenu(plotIndex)
    })
  }

  private openMenu(plotIndex: number) {
    this.menuPlotIndex = plotIndex
    this.menuShade.setVisible(true)
    this.menuContainer.setVisible(true)
    this.refreshMenuAffordability()
  }

  private refreshMenuAffordability() {
    const gold = this.registry.get('gold') as number
    for (const type of BUILDING_LIST) {
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
      const slotImg = this.add.image(x, barY, 'menu-slot').setInteractive({ useHandCursor: true })

      this.invIcons[slotIndex] = null
      this.invCounts[slotIndex] = null
      this.invSlotPos[slotIndex] = { x, y: barY }

      // register as a drag-and-drop slot
      const binding: SlotBinding = {
        getScreenPos: () => ({ x, y: barY }),
        canTake: () => state.inventory[slotIndex] !== null,
        canPlace: () => {
          const cur = state.inventory[slotIndex]
          return cur === null
            ? true
            : true  // for now allow any place; stack-merging handled in inventoryPlace
        },
        take: () => {
          const s = state.inventoryTake(slotIndex)
          if (s) this.redrawInventorySlot(slotIndex, x, barY)
          return s
        },
        place: (stack: ItemStack) => {
          const ok = state.inventoryPlace(slotIndex, stack)
          this.redrawInventorySlot(slotIndex, x, barY)
          return ok
        },
      }
      this.dragController.register(binding)

      slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (!state.inventory[slotIndex]) return
        if ((p.event as MouseEvent).shiftKey) {
          this.shiftSendFromInventory(slotIndex, binding)
          return
        }
        this.dragController.startDrag(binding, p)
      })

      // initial render in case state was pre-seeded
      this.redrawInventorySlot(slotIndex, x, barY)
    }
  }

  private redrawInventorySlot(i: number, x: number, y: number) {
    const stack = state.inventory[i]
    // clear previous visuals for this slot
    this.invIcons[i]?.destroy()
    this.invCounts[i]?.destroy()
    this.invIcons[i] = null
    this.invCounts[i] = null
    if (!stack) return
    this.invIcons[i] = this.add.sprite(x, y, ITEMS[stack.type].sprite).setScale(2)
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
    const interior = this.scene.get('Interior') as Interior
    interior.placeFromInventory(stack)
    // bounce leftover back into inventory
    if (stack.count > 0) state.inventoryAddAnywhere(stack)

    for (let i = 0; i < this.invSlotPos.length; i++) {
      const p = this.invSlotPos[i]
      this.redrawInventorySlot(i, p.x, p.y)
    }
  }
}

export const UI_BAR_HEIGHT = BAR_HEIGHT
// height the inventory bar takes at the bottom of the screen
// (kept in sync with buildInventoryBar — SLOT + PAD_Y * 2)
export const UI_INVENTORY_BAR_HEIGHT = 48 + 12 * 2
