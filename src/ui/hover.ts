import Phaser from 'phaser'

// Tracks slot frames + buttons that should trigger the grab cursor.
// CursorController reads this set each frame and switches to the grab sprite
// when the pointer is hovering one of these.
export const grabbableSlots = new Set<Phaser.GameObjects.GameObject>()

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
  const overlay = scene.add.rectangle(x, y, width, height, HOVER_COLOR, HOVER_ALPHA)
    .setDepth(HOVER_DEPTH)
    .setVisible(false)
  slotFrame.on('pointerover', () => overlay.setVisible(true))
  slotFrame.on('pointerout', () => overlay.setVisible(false))
  registerGrabbable(slotFrame)
  return overlay
}
