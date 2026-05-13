import Phaser from 'phaser'
import { COLORS } from '../colors'
import { BUILDINGS, state, type BuiltType } from '../game/state'
import { ITEMS, type ItemStack } from '../items/types'
import { consumeCraft, previewCraft } from '../items/recipes'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from './UI'
import type { UI } from './UI'
import type { SlotBinding } from '../ui/SlotBinding'

export interface InteriorData {
  buildingType: BuiltType
  plotIndex: number
}

// Per-building background image keys. Buildings without an entry fall back to a plain cream backdrop.
export const INTERIOR_BGS: Partial<Record<BuiltType, string>> = {
  mill: 'millbg',
  well: 'wellbg',
  crafter: 'crafterbg',
}

// path used by both Interior and Overworld preloads
export const INTERIOR_BG_PATHS: Record<string, string> = {
  millbg: '/millbg.png',
  wellbg: '/wellbg.png',
  crafterbg: '/crafterbg.png',
}

export class Interior extends Phaser.Scene {
  private buildingType!: BuiltType
  private plotIndex!: number
  // bindings we registered with the UI's DragController, so we can unregister on shutdown
  private bindings: SlotBinding[] = []
  // per-slot visuals so we can redraw on take/place
  private slotVisuals: {
    x: number
    y: number
    getStack: () => ItemStack | null
    icon: Phaser.GameObjects.Sprite | null
    count: Phaser.GameObjects.BitmapText | null
  }[] = []
  // producer panel: arrow sprite we tint each frame to show progress
  private producerArrow: Phaser.GameObjects.Sprite | null = null

  constructor() {
    super('Interior')
  }

  init(data: InteriorData) {
    this.buildingType = data.buildingType
    this.plotIndex = data.plotIndex
    this.bindings = []
    this.slotVisuals = []
  }

  preload() {
    if (!this.cache.bitmapFont.exists('main')) {
      this.load.bitmapFont('main', '/minecraftbm.png', '/minecraftbm.xml')
    }
    if (!this.cache.bitmapFont.exists('mainSmall')) {
      this.load.bitmapFont('mainSmall', '/minecraftbmsmall.png', '/minecraftbmsmall.xml')
    }
    // backgrounds are normally preloaded by Overworld; this is a fallback safety net
    for (const [key, path] of Object.entries(INTERIOR_BG_PATHS)) {
      if (!this.textures.exists(key)) this.load.image(key, path)
    }
    // shared menu UI assets
    if (!this.textures.exists('menu-bg')) this.load.image('menu-bg', '/menu.png')
    if (!this.textures.exists('menu-slot')) this.load.image('menu-slot', '/slot.png')
  }

  create() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height
    const def = BUILDINGS[this.buildingType]

    // background
    const bgKey = INTERIOR_BGS[this.buildingType]
    if (bgKey && this.textures.exists(bgKey)) {
      const playArea = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT
      const img = this.add.image(w / 2, UI_BAR_HEIGHT + playArea / 2, bgKey)
      const scale = Math.max(w / img.width, playArea / img.height)
      img.setScale(scale)
    } else {
      this.add.rectangle(0, 0, w, h, COLORS.worldBg).setOrigin(0, 0)
    }

    // building name + back
    this.add.bitmapText(w / 2, UI_BAR_HEIGHT + 30, 'main', def.name, 24)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
    const back = this.add.rectangle(60, UI_BAR_HEIGHT + 30, 80, 32, COLORS.uiBarBg)
      .setInteractive({ useHandCursor: true })
    this.add.bitmapText(60, UI_BAR_HEIGHT + 30, 'main', 'Back', 16)
      .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
    back.on('pointerdown', () => this.exit())
    this.input.keyboard!.on('keydown-ESC', () => this.exit())
    this.input.keyboard!.on('keydown-E', () => this.exit())

    if (this.buildingType === 'crafter') {
      this.buildCrafterPanel(w, h)
    } else if (this.buildingType === 'mill' || this.buildingType === 'well') {
      this.buildProducerPanel(w, h)
    }

    // unregister drag bindings when the scene shuts down (Back button, ESC)
    this.events.on('shutdown', () => this.cleanup())
  }

  private buildCrafterPanel(w: number, h: number) {
    const playAreaTop = UI_BAR_HEIGHT
    const playAreaH = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT
    const panelY = playAreaTop + playAreaH / 2

    const SLOT = 48
    const GAP = 16
    const SYMBOL = 16
    const PAD_X = 24
    const PAD_Y = 28
    const layoutW = SLOT * 3 + (GAP + SYMBOL + GAP) * 2

    const panelW = layoutW + PAD_X * 2
    const panelH = SLOT + PAD_Y * 2

    this.add.nineslice(w / 2, panelY, 'menu-bg', undefined, panelW, panelH, 16, 16, 16, 16)

    const startX = w / 2 - layoutW / 2
    const slot1X = startX + SLOT / 2
    const plusX = slot1X + SLOT / 2 + GAP + SYMBOL / 2
    const slot2X = plusX + SYMBOL / 2 + GAP + SLOT / 2
    const arrowX = slot2X + SLOT / 2 + GAP + SYMBOL / 2
    const slot3X = arrowX + SYMBOL / 2 + GAP + SLOT / 2

    this.add.bitmapText(plusX, panelY + 4, 'main', '+', 24).setOrigin(0.5, 0.5).setTint(COLORS.craftSymbol)
    this.add.sprite(arrowX, panelY, 'arrow_right').setScale(2).setTint(COLORS.craftSymbol)

    // 3 slot images + their drag bindings
    this.makeCraftSlot(slot1X, panelY, 'input', 0)
    this.makeCraftSlot(slot2X, panelY, 'input', 1)
    this.makeCraftSlot(slot3X, panelY, 'output', 0)
  }

  private buildProducerPanel(w: number, h: number) {
    const def = BUILDINGS[this.buildingType]
    if (!def.producesItem) return

    const playAreaTop = UI_BAR_HEIGHT
    const playAreaH = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT
    const panelY = playAreaTop + playAreaH / 2

    const SLOT = 48
    const GAP = 16
    const SYMBOL = 16
    const PAD_X = 24
    const PAD_Y = 28
    const layoutW = SLOT * 2 + GAP * 2 + SYMBOL
    const panelW = layoutW + PAD_X * 2
    const panelH = SLOT + PAD_Y * 2

    this.add.nineslice(w / 2, panelY, 'menu-bg', undefined, panelW, panelH, 16, 16, 16, 16)

    const startX = w / 2 - layoutW / 2
    const buildingX = startX + SLOT / 2
    const arrowX = buildingX + SLOT / 2 + GAP + SYMBOL / 2
    const outputX = arrowX + SYMBOL / 2 + GAP + SLOT / 2

    // building icon, framed in a slot
    this.add.image(buildingX, panelY, 'menu-slot')
    this.add.sprite(buildingX, panelY, this.buildingType).setScale(2)

    // arrow — tinted each frame in update() to show item-tick progress
    this.producerArrow = this.add.sprite(arrowX, panelY, 'arrow_right').setScale(2)

    // output slot — read-only, drag-takeable
    this.makeProducerOutputSlot(outputX, panelY)
  }

  private makeProducerOutputSlot(x: number, y: number) {
    const slotImg = this.add.image(x, y, 'menu-slot').setInteractive({ useHandCursor: true })
    const getStack = (): ItemStack | null => state.plots[this.plotIndex].output
    this.slotVisuals.push({ x, y, getStack, icon: null, count: null })

    const binding: SlotBinding = {
      getScreenPos: () => ({ x, y }),
      canTake: () => getStack() !== null,
      // bounce-back only: accept the same item type (we don't allow the player to *initiate* a place here)
      canPlace: (itemType) => {
        const cur = getStack()
        return cur !== null && cur.type === itemType
      },
      take: () => {
        const s = getStack()
        if (!s) return null
        state.plots[this.plotIndex].output = null
        this.redrawAllCraftSlots()
        return s
      },
      place: (stack: ItemStack) => {
        // restore the stack to plot.output (bounce-back path)
        const cur = getStack()
        if (!cur) {
          state.plots[this.plotIndex].output = { type: stack.type, count: stack.count }
          stack.count = 0
          this.redrawAllCraftSlots()
          return true
        }
        if (cur.type !== stack.type) return false
        cur.count += stack.count
        stack.count = 0
        this.redrawAllCraftSlots()
        return true
      },
    }
    this.bindings.push(binding)
    const ui = this.scene.get('UI') as UI
    ui.getDragController().register(binding)

    slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if ((p.event as MouseEvent).shiftKey) {
        this.shiftTakeToInventory(binding)
        return
      }
      if (!binding.canTake()) return
      ui.getDragController().startDrag(binding, p)
    })

    this.redrawAllCraftSlots()
  }

  // Called by UI scene on inventory shift-click. Try to place the stack into
  // this building's slots (input slots, output if applicable). Mutates the
  // stack's count down as it's consumed; caller bounces any leftover back.
  placeFromInventory(stack: ItemStack) {
    for (const b of this.bindings) {
      if (stack.count <= 0) break
      if (!b.canPlace(stack.type)) continue
      b.place(stack)
    }
    this.redrawAllCraftSlots()
  }

  // Shift-click handler: take from this slot and push as much as possible into inventory.
  // Whatever doesn't fit is bounced back to the source.
  private shiftTakeToInventory(binding: SlotBinding) {
    if (!binding.canTake()) return
    const stack = binding.take()
    if (!stack) return
    state.inventoryAddAnywhere(stack)
    if (stack.count > 0) binding.place(stack)  // bounce leftover
    this.redrawAllCraftSlots()
    this.registry.events.emit('inventory-changed')
  }

  // Shift-click handler for the crafter output: repeat consume → inventory until full or empty.
  private craftAllToInventory() {
    let madeAny = false
    while (true) {
      const preview = previewCraft(this.plotIndex)
      if (!preview) break
      const tentative: ItemStack = { type: preview.type, count: preview.count }
      const added = state.inventoryAddAnywhere(tentative)
      if (added <= 0) break
      consumeCraft(this.plotIndex)
      madeAny = true
    }
    if (madeAny) {
      this.redrawAllCraftSlots()
      this.registry.events.emit('inventory-changed')
    }
  }
  private makeCraftSlot(x: number, y: number, role: 'input' | 'output', inputIndex: number) {
    const slotImg = this.add.image(x, y, 'menu-slot').setInteractive({ useHandCursor: true })

    const getStack = (): ItemStack | null => {
      const plot = state.plots[this.plotIndex]
      if (role === 'input') return plot.craftInputs?.[inputIndex] ?? null
      // output slot shows the live recipe preview, not stored state
      return previewCraft(this.plotIndex)
    }
    const setStack = (s: ItemStack | null) => {
      const plot = state.plots[this.plotIndex]
      if (role === 'input') {
        if (!plot.craftInputs) plot.craftInputs = [null, null]
        plot.craftInputs[inputIndex] = s
      } else {
        plot.craftOutput = s
      }
    }
    this.slotVisuals.push({ x, y, getStack, icon: null, count: null })

    const binding: SlotBinding = {
      getScreenPos: () => ({ x, y }),
      canTake: () => {
        if (role === 'output') return previewCraft(this.plotIndex) !== null
        return getStack() !== null
      },
      // outputs never accept placement.
      // inputs accept if empty OR if same type (merge up to maxStack).
      canPlace: (itemType) => {
        if (role !== 'input') return false
        const cur = getStack()
        if (!cur) return true
        return cur.type === itemType
      },
      take: () => {
        if (role === 'output') {
          const stack = consumeCraft(this.plotIndex)
          if (stack) this.redrawAllCraftSlots()
          return stack
        }
        const s = getStack()
        if (!s) return null
        setStack(null)
        this.redrawAllCraftSlots()
        return s
      },
      place: (stack: ItemStack) => {
        if (role !== 'input') return false
        const cur = getStack()
        if (!cur) {
          // consume the incoming stack into a new owned stack on this slot
          setStack({ type: stack.type, count: stack.count })
          stack.count = 0
          this.redrawAllCraftSlots()
          return true
        }
        if (cur.type !== stack.type) return false
        const cap = ITEMS[cur.type].maxStack
        const room = cap - cur.count
        if (room <= 0) return false
        const moved = Math.min(room, stack.count)
        cur.count += moved
        stack.count -= moved
        this.redrawAllCraftSlots()
        return stack.count === 0
      },
    }
    this.bindings.push(binding)
    const ui = this.scene.get('UI') as UI
    ui.getDragController().register(binding)

    slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // shift-click on the crafter output: craft as many as inputs + inventory allow
      if (role === 'output' && (p.event as MouseEvent).shiftKey) {
        this.craftAllToInventory()
        return
      }
      // shift-click on a crafter input: move it to inventory
      if (role === 'input' && (p.event as MouseEvent).shiftKey) {
        this.shiftTakeToInventory(binding)
        return
      }
      if (!binding.canTake()) return
      ui.getDragController().startDrag(binding, p)
    })

    this.redrawAllCraftSlots()
  }

  private redrawAllCraftSlots() {
    for (const v of this.slotVisuals) {
      v.icon?.destroy(); v.count?.destroy()
      v.icon = null; v.count = null
      const stack = v.getStack()
      if (!stack) continue
      v.icon = this.add.sprite(v.x, v.y, ITEMS[stack.type].sprite).setScale(2)
      if (stack.count > 1) {
        v.count = this.add.bitmapText(v.x + 23, v.y + 23, 'main', String(stack.count), 20)
          .setOrigin(1, 1).setTint(COLORS.uiText)
      }
    }
  }

  private cleanup() {
    const ui = this.scene.get('UI') as UI
    const dc = ui.getDragController()
    for (const b of this.bindings) dc.unregister(b)
    this.bindings = []
    this.slotVisuals = []
  }

  update() {
    // continuously refresh visible slot contents (Overworld ticks may add items while we're in here)
    this.redrawAllCraftSlots()

    // tint the producer arrow based on item-tick progress
    if (this.producerArrow) {
      const def = BUILDINGS[this.buildingType]
      if (def.itemTickMs) {
        const plot = state.plots[this.plotIndex]
        const frac = ((Date.now() - plot.lastItemTickAt) % def.itemTickMs) / def.itemTickMs
        // lerp each channel from dim (0x55,0x4a,0x3e) to bright (0xFF,0xD7,0x00)
        const r = Math.floor(Phaser.Math.Linear(0x55, 0xFF, frac))
        const g = Math.floor(Phaser.Math.Linear(0x4a, 0xD7, frac))
        const b = Math.floor(Phaser.Math.Linear(0x3e, 0x00, frac))
        this.producerArrow.setTint((r << 16) | (g << 8) | b)
      }
    }
  }

  private exit() {
    this.registry.events.emit('interior-exited', this.plotIndex)
    this.scene.stop('Interior')
  }
}
