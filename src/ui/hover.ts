import Phaser from 'phaser'
import { type ItemStack } from '../items/types'

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

// Shared registry of slot frames that show the inspect tooltip on hover. The UI
// scene's inspect-panel tick iterates this set, hit-tests each frame against the
// pointer, and renders the hovered item's name + description. Any slot built
// through this registry gets the tooltip with no per-interface wiring.
export interface SlotTooltipEntry {
  frame: Phaser.GameObjects.Image
  peek: () => ItemStack | null
}
export const slotTooltips = new Set<SlotTooltipEntry>()

export function attachSlotTooltip(
  slotFrame: Phaser.GameObjects.Image,
  peek: () => ItemStack | null,
) {
  const entry: SlotTooltipEntry = { frame: slotFrame, peek }
  slotTooltips.add(entry)
  slotFrame.once('destroy', () => slotTooltips.delete(entry))
  return entry
}
