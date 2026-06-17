import Phaser from 'phaser'
import { ITEMS, type ItemStack } from '../items/types'

// Tracks slot frames + buttons that should trigger the grab cursor.
// CursorController reads this set each frame and switches to the grab sprite
// when the pointer is hovering one of these.
export const grabbableSlots = new Set<Phaser.GameObjects.GameObject>()

// Explicit grab-cursor flag for objects that drive their own hover via
// pointerover/pointerout (e.g. the interior crate), bypassing the cross-scene
// hit-test. CursorController treats this as equivalent to hovering a slot.
export const grabHover = { active: false }

// Reject-cursor flag: set while the pointer hovers a sell slot that won't
// accept the currently-held item (e.g. an ore over the general store). The
// CursorController shows the red X cursor when this is active.
export const rejectHover = { active: false }

// Register any interactive game object (slot frame, button, link, etc.) as
// a grab-cursor trigger. Auto-unregisters when the object is destroyed.
export function registerGrabbable(obj: Phaser.GameObjects.GameObject) {
  grabbableSlots.add(obj)
  obj.on('destroy', () => grabbableSlots.delete(obj))
}

// Adds a hollow translucent white square that shows over a slot frame on
// hover and hides on pointer-out. No animation.
const HOVER_COLOR = 0xffffff
const HOVER_ALPHA = 0.25
const HOVER_DEPTH = 9998

export function attachSlotHover(
  scene: Phaser.Scene,
  slotFrame: Phaser.GameObjects.Image,
  x: number,
  y: number,
  width: number = 48,
  height: number = 48,
) {
  const radius = 6
  const gfx = scene.add.graphics()
    .fillStyle(HOVER_COLOR, HOVER_ALPHA)
    .fillRoundedRect(x - width / 2, y - height / 2, width, height + 0.5, radius)
    .setDepth(HOVER_DEPTH)
    .setVisible(false)
  slotFrame.on('pointerover', () => gfx.setVisible(true))
  slotFrame.on('pointerout', () => gfx.setVisible(false))
  registerGrabbable(slotFrame)
  return gfx
}

// Attach a hover tooltip showing the slot's current item name. Reads the
// stack lazily via the `peek` callback so dynamic slot contents stay accurate.
const TOOLTIP_OFFSET_Y = -48   // pixels above the slot center
const TOOLTIP_DEPTH = 10001    // above held items
const TOOLTIP_PAD_X = 6
const TOOLTIP_PAD_Y = 3
const TOOLTIP_BG_COLOR = 0x000000
const TOOLTIP_BG_ALPHA = 0.75
const TOOLTIP_TEXT_COLOR = 0xFFFFFF

export function attachSlotTooltip(
  scene: Phaser.Scene,
  slotFrame: Phaser.GameObjects.Image,
  x: number,
  y: number,
  peek: () => ItemStack | null,
  offsetY: number = TOOLTIP_OFFSET_Y,
) {
  const text = scene.add.bitmapText(x, y + offsetY, 'main', '', 14)
    .setOrigin(0.5, 0.5)
    .setTint(TOOLTIP_TEXT_COLOR)
    .setDepth(TOOLTIP_DEPTH)
    .setVisible(false)
  const bg = scene.add.rectangle(x, y + offsetY, 10, 10, TOOLTIP_BG_COLOR, TOOLTIP_BG_ALPHA)
    .setDepth(TOOLTIP_DEPTH - 1)
    .setVisible(false)

  slotFrame.on('pointerover', () => {
    const stack = peek()
    if (!stack) return
    text.setText(ITEMS[stack.type].name)
    bg.setSize(text.width + TOOLTIP_PAD_X * 2, text.height + TOOLTIP_PAD_Y * 2)
    text.setVisible(true)
    bg.setVisible(true)
  })
  slotFrame.on('pointerout', () => {
    text.setVisible(false)
    bg.setVisible(false)
  })

  slotFrame.once('destroy', () => {
    text.destroy()
    bg.destroy()
  })

  return { text, bg }
}
