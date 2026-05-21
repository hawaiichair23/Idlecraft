import Phaser from 'phaser'
import { ITEMS, type ItemStack, type ItemDef } from '../items/types'
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
  private held: { stack: ItemStack; source: SlotBinding } | null = null
  private heldContainer: Phaser.GameObjects.Container | null = null
  private heldSprite: Phaser.GameObjects.Sprite | null = null
  private heldCount: Phaser.GameObjects.BitmapText | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.updateHeldPos(p))
  }

  register(slot: SlotBinding) { this.slots.push(slot) }
  unregister(slot: SlotBinding) {
    const i = this.slots.indexOf(slot)
    if (i >= 0) this.slots.splice(i, 1)
    if (this.held && this.held.source === slot) this.clearHeld()
  }

  isHolding(): boolean { return this.held !== null }

  // Take the held stack and clear the held state. Returns null if not holding.
  // Used when dropping the held stack outside the slot system (e.g. into the world).
  takeHeld(): ItemStack | null {
    if (!this.held) return null
    const stack = this.held.stack
    this.clearHeld()
    return stack
  }

  // Return the held item to the slot it was picked up from. Used when the
  // interior closes while the player is holding something — the item goes
  // back where it came from instead of vanishing.
  restoreHeld(): void {
    if (!this.held) return
    this.held.source.restore(this.held.stack)
    this.clearHeld()
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
      stack.count -= accepted
      if (stack.count <= 0) this.clearHeld()
      else this.renderHeld()
      return
    }

    // read-only output slot (e.g. crafter preview): if it has the same type
    // we're already holding, take from it and merge into the held stack.
    const existing = slot.peek()
    if (existing && existing.type === stack.type) {
      const cap = ITEMS[stack.type].maxStack
      const room = cap - stack.count
      if (room <= 0) return
      const lifted = slot.take(Math.min(room, existing.count))
      if (!lifted) return
      stack.count += lifted.count
      this.renderHeld()
      return
    }

    // different type — swap, but only if the slot has something to lift
    // AND can accept everything we're holding (no item loss)
    if (!existing) return
    const lifted = slot.take(existing.count)
    if (!lifted) return
    const accepted = slot.offer(stack)
    if (accepted < stack.count) {
      // swap would lose items — undo and bail
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
    const one: ItemStack = { type: stack.type, count: 1 }
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
      this.heldCount = this.scene.add.bitmapText(23, 23, 'main', '', 20)
        .setOrigin(1, 1)
      this.heldContainer = this.scene.add.container(p.x, p.y, [this.heldSprite, this.heldCount])
        .setDepth(HELD_DEPTH)
    } else {
      this.heldSprite!.setTexture(def.sprite).setScale(def.scale)
      this.heldContainer.setPosition(p.x, p.y).setVisible(true)
    }

    if (this.held.stack.count > 1) {
      this.heldCount!.setText(String(this.held.stack.count)).setVisible(true)
    } else {
      this.heldCount!.setVisible(false)
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
