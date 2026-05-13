import Phaser from 'phaser'
import { ITEMS, type ItemStack } from '../items/types'
import type { SlotBinding } from './SlotBinding'

// One DragController lives in the UI scene. Every slot in the game registers
// with it. The controller renders the held item following the cursor and
// resolves drops by hit-testing against registered slots.
//
// Slots from different scenes can all register with this single controller —
// they just have to translate their local coords into screen coords in
// getScreenPos().
export class DragController {
  private scene: Phaser.Scene
  private slots: SlotBinding[] = []
  private held: { stack: ItemStack; source: SlotBinding } | null = null
  private heldSprite: Phaser.GameObjects.Sprite | null = null
  private heldCount: Phaser.GameObjects.BitmapText | null = null
  // hit-test radius around a slot center (slots are 48x48 by default)
  private hitRadius = 24

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    // global pointer listeners on the controller's scene (UI scene = always on top)
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => this.resolveDrop(p))
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.updateHeldPos(p))
  }

  register(slot: SlotBinding) { this.slots.push(slot) }
  unregister(slot: SlotBinding) {
    const i = this.slots.indexOf(slot)
    if (i >= 0) this.slots.splice(i, 1)
  }

  // Start a drag from the given slot. Called by a slot when it receives
  // pointerdown.
  startDrag(slot: SlotBinding, pointer: Phaser.Input.Pointer) {
    if (this.held) return  // already holding something — ignore
    if (!slot.canTake()) return
    const stack = slot.take()
    if (!stack) return
    this.held = { stack, source: slot }
    this.renderHeld(pointer.x, pointer.y)
  }

  // Internal: build/update the held visual.
  private renderHeld(x: number, y: number) {
    if (!this.held) return
    const def = ITEMS[this.held.stack.type]
    if (!this.heldSprite) {
      this.heldSprite = this.scene.add.sprite(x, y, def.sprite).setScale(2).setDepth(10000)
    } else {
      this.heldSprite.setTexture(def.sprite).setPosition(x, y).setVisible(true)
    }
    if (this.held.stack.count > 1) {
      const txt = String(this.held.stack.count)
      if (!this.heldCount) {
        this.heldCount = this.scene.add.bitmapText(x + 10, y + 10, 'mainSmall', txt, 12)
          .setOrigin(1, 1).setDepth(10001)
      } else {
        this.heldCount.setText(txt).setPosition(x + 10, y + 10).setVisible(true)
      }
    } else if (this.heldCount) {
      this.heldCount.setVisible(false)
    }
  }

  private updateHeldPos(p: Phaser.Input.Pointer) {
    if (!this.held || !this.heldSprite) return
    this.heldSprite.setPosition(p.x, p.y)
    if (this.heldCount) this.heldCount.setPosition(p.x + 10, p.y + 10)
  }

  private resolveDrop(p: Phaser.Input.Pointer) {
    if (!this.held) return
    const stack = this.held.stack
    const source = this.held.source

    // find a slot under the pointer that can accept this item
    let target: SlotBinding | null = null
    for (const s of this.slots) {
      if (s === source) continue
      const { x, y } = s.getScreenPos()
      if (Math.abs(p.x - x) <= this.hitRadius && Math.abs(p.y - y) <= this.hitRadius) {
        if (s.canPlace(stack.type)) { target = s; break }
      }
    }

    let accepted = false
    if (target) accepted = target.place(stack)
    if (!accepted) source.place(stack)  // bounce back to source

    this.clearHeld()
  }

  private clearHeld() {
    this.held = null
    if (this.heldSprite) this.heldSprite.setVisible(false)
    if (this.heldCount) this.heldCount.setVisible(false)
  }

  isHolding(): boolean { return this.held !== null }
}
