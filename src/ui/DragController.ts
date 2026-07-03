import Phaser from 'phaser'
import { ITEMS, cloneStack, type ItemStack, type ItemDef } from '../items/types'
import { COLORS } from '../colors'
import type { SlotBinding } from './SlotBinding'

// One DragController lives in the UI scene. Slots route their pointerdown to
// handleSlotClick(); the controller owns the held-state machine.
//
// Click model matches Minecraft:
//   cursor empty + left   = take whole stack
//   cursor empty + right  = take ceil(half), leave floor(half)
//   cursor full  + left   = drop all / merge / swap
//   cursor full  + right  = drop 1, keep holding the rest
//   click in empty space = nothing. The held item stays on the cursor until
//   you click it onto a slot.

const HELD_DEPTH = 10000

export class DragController {
  private scene: Phaser.Scene
  private slots: SlotBinding[] = []
  private held: { stack: ItemStack; source: SlotBinding | null } | null = null
  private heldContainer: Phaser.GameObjects.Container | null = null
  private heldSprite: Phaser.GameObjects.Sprite | null = null
  private heldCount: Phaser.GameObjects.BitmapText | null = null
  private heldCountShadow: Phaser.GameObjects.BitmapText | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.updateHeldPos(p))
  }

  register(slot: SlotBinding) { this.slots.push(slot) }
  unregister(slot: SlotBinding) {
    const i = this.slots.indexOf(slot)
    if (i >= 0) this.slots.splice(i, 1)
    // The hand owns the held item outright. If the slot it came from is being
    // destroyed (e.g. the E-inventory panel closing), just sever the source
    // reference — the item stays in hand instead of being thrown away.
    if (this.held && this.held.source === slot) this.held.source = null
  }

  isHolding(): boolean { return this.held !== null }

  tryAddToHeld(stack: ItemStack): number {
    if (!this.held) {
      this.held = { stack: { type: stack.type, count: stack.count }, source: null }
      this.renderHeld()
      return stack.count
    }
    if (this.held.stack.type !== stack.type) return 0
    const cap = ITEMS[stack.type].maxStack
    const room = cap - this.held.stack.count
    if (room <= 0) return 0
    const added = Math.min(room, stack.count)
    this.held.stack.count += added
    this.renderHeld()
    return added
  }


  // Take the held stack and clear the held state. Returns null if not holding.
  // Used when dropping the held stack outside the slot system (e.g. into the
  // world, or into the inventory when a panel closes).
  takeHeld(): ItemStack | null {
    if (!this.held) return null
    const stack = this.held.stack
    this.clearHeld()
    return stack
  }


  // Consume 1 of the held stack if it's edible. Returns true if eaten.
  tryEatHeld(): boolean {
    if (!this.held) return false
    const stack = this.held.stack
    if (!ITEMS[stack.type].edible) return false
    stack.count -= 1
    if (stack.count <= 0) this.clearHeld()
    else this.renderHeld()
    return true
  }

  // Returns the held stack itself (NOT a copy) so callers can read its type
  // and mutate its count. Use sparingly — most callers should use peekEdibleDef.
  peekHeldStack(): ItemStack | null {
    return this.held ? this.held.stack : null
  }

  // Re-render the held visual after the stack count was mutated externally.
  // Caller is responsible for clearing held if count hit 0.
  refreshHeldVisual() {
    this.renderHeld()
  }

  // Returns the ItemDef of the held stack if edible, else undefined.
  peekEdibleDef(): ItemDef | undefined {
    if (!this.held) return undefined
    const def = ITEMS[this.held.stack.type]
    if (!def.edible) return undefined
    return def
  }

  // Called by a slot's own pointerdown handler. Shift-clicks are intercepted
  // by the slot first; this method handles non-shift left or right click.
  handleSlotClick(slot: SlotBinding, p: Phaser.Input.Pointer) {
    const isRight = p.rightButtonDown()

    if (!this.held) {
      if (isRight) this.pickUpHalf(slot)
      else this.pickUpAll(slot)
      return
    }

    if (isRight) this.placeOne(slot)
    else this.placeOrSwap(slot)
  }

  private pickUpAll(slot: SlotBinding) {
    const peek = slot.peek()
    if (!peek) return
    const stack = slot.take(peek.count)
    if (!stack) return
    this.held = { stack, source: slot }
    this.renderHeld()
  }

  private pickUpHalf(slot: SlotBinding) {
    const peek = slot.peek()
    if (!peek) return
    const halfUp = Math.ceil(peek.count / 2)
    const stack = slot.take(halfUp)
    if (!stack) return
    this.held = { stack, source: slot }
    this.renderHeld()
  }

  private placeOrSwap(slot: SlotBinding) {
    if (!this.held) return
    const stack = this.held.stack

    // same-type merge (or empty slot accepting)
    if (slot.accepts(stack.type)) {
      const accepted = slot.offer(stack)
      if (accepted > 0) {
        stack.count -= accepted
        if (stack.count <= 0) this.clearHeld()
        else this.renderHeld()
        return
      }
      // offer rejected (e.g. rarity mismatch) — fall through to swap
    }

    // read-only output slot (e.g. crafter preview): if it has the same type
    // we're already holding, take from it and merge into the held stack.
    const existing = slot.peek()
    if (existing && existing.type === stack.type && existing.rarity === stack.rarity) {
      const cap = ITEMS[stack.type].maxStack
      const room = cap - stack.count
      if (room <= 0) return
      const lifted = slot.take(Math.min(room, existing.count))
      if (!lifted) return
      stack.count += lifted.count
      this.renderHeld()
      return
    }

    // different type or rarity — swap, but only if the slot has something to lift
    // AND can accept everything we're holding (no item loss)
    if (!existing) return
    const lifted = slot.take(existing.count)
    if (!lifted) return
    const accepted = slot.offer(stack)
    if (accepted < stack.count) {
      slot.restore(lifted)
      return
    }
    stack.count -= accepted
    this.held = { stack: lifted, source: slot }
    this.renderHeld()
  }

  private placeOne(slot: SlotBinding) {
    if (!this.held) return
    const stack = this.held.stack
    if (!slot.accepts(stack.type)) return
    const one = cloneStack(stack, 1)
    const accepted = slot.offer(one)
    if (accepted <= 0) return
    stack.count -= accepted
    if (stack.count <= 0) this.clearHeld()
    else this.renderHeld()
  }

  private renderHeld() {
    if (!this.held) return
    const def = ITEMS[this.held.stack.type]
    const p = this.scene.input.activePointer

    if (!this.heldContainer) {
      this.heldSprite = this.scene.add.sprite(0, 0, def.sprite).setScale(def.scale)
      // Drop shadow behind the count, matching the hotbar count labels.
      this.heldCountShadow = this.scene.add.bitmapText(25, 25, 'main', '', 20)
        .setOrigin(1, 1)
        .setTint(COLORS.countShadow)
        .setBlendMode(Phaser.BlendModes.MULTIPLY)
      this.heldCount = this.scene.add.bitmapText(23, 23, 'main', '', 20)
        .setOrigin(1, 1)
        .setTint(COLORS.uiText)
      this.heldContainer = this.scene.add.container(p.x, p.y, [this.heldSprite, this.heldCountShadow, this.heldCount])
        .setDepth(HELD_DEPTH)
    } else {
      this.heldSprite!.setTexture(def.sprite).setScale(def.scale)
      this.heldContainer.setPosition(p.x, p.y).setVisible(true)
    }

    if (this.held.stack.count > 1) {
      const txt = String(this.held.stack.count)
      this.heldCount!.setText(txt).setVisible(true)
      this.heldCountShadow!.setText(txt).setVisible(true)
    } else {
      this.heldCount!.setVisible(false)
      this.heldCountShadow!.setVisible(false)
    }
  }

  private updateHeldPos(p: Phaser.Input.Pointer) {
    if (!this.held || !this.heldContainer) return
    this.heldContainer.setPosition(p.x, p.y)
  }

  private clearHeld() {
    this.held = null
    if (this.heldContainer) this.heldContainer.setVisible(false)
  }
}
