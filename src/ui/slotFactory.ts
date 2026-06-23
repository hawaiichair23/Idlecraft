import Phaser from 'phaser'
import { COLORS } from '../colors'
import { ITEMS, type ItemStack, type ItemType } from '../items/types'
import { isBag } from '../game/state'
import { type SlotBinding } from './SlotBinding'
import { attachSlotHover, attachSlotTooltip } from './hover'

// ---------------------------------------------------------------------------
// slotFactory — shared helpers for building drag-and-drop slots.
//
// All interior slots (inventory, crafter inputs, producer output, modifier
// rack) follow the same pattern: a tinted slot image, a hover overlay, and a
// SlotBinding wired to closures that read/write some piece of state. These
// helpers package that pattern.
// ---------------------------------------------------------------------------

export interface SlotCallbacks {
  // Called whenever this slot's underlying state changes (take/offer). The
  // scene uses it to refresh its slotVisuals redraw bookkeeping.
  onChange: () => void
}

export interface SlotImageOptions {
  x: number
  y: number
  // Defaults to the standard menu-slot tint used inside building interiors.
  tint?: number
  // If provided, a tooltip showing the item name appears on hover.
  peek?: () => ItemStack | null
  // Override the tooltip's vertical offset (negative = above slot).
  tooltipOffsetY?: number
}

// Adds the slot frame + hover overlay + interactive flag, returns the image.
export function makeSlotImage(scene: Phaser.Scene, opts: SlotImageOptions): Phaser.GameObjects.Image {
  const slotImg = scene.add.image(opts.x, opts.y, 'menu-slot')
    .setTint(opts.tint ?? COLORS.interiorPanel)
    .setInteractive()
  attachSlotHover(scene, slotImg, opts.x, opts.y)
  if (opts.peek) attachSlotTooltip(slotImg, opts.peek)
  return slotImg
}

// Stack-count label with a dark drop-shadow, like Minecraft. Anchored to the
// bottom-right of a slot centered at (x, y). Returns a container holding the
// shadow + main number so callers store/destroy one object. Used everywhere a
// stack count is drawn so the size and shadow stay identical across all slots.
export const COUNT_SIZE = 20
export function makeCountLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count: number,
  depth?: number,
): Phaser.GameObjects.Container {
  const shadow = scene.add.bitmapText(x + 25, y + 25, 'main', String(count), COUNT_SIZE)
    .setOrigin(1, 1)
    .setTint(COLORS.countShadow)
    .setBlendMode(Phaser.BlendModes.MULTIPLY)
  const main = scene.add.bitmapText(x + 23, y + 23, 'main', String(count), COUNT_SIZE)
    .setOrigin(1, 1)
    .setTint(COLORS.uiText)
  const group = scene.add.container(0, 0, [shadow, main])
  if (depth !== undefined) group.setDepth(depth)
  return group
}

// Generic storage slot — accepts any item, stacks same-type up to maxStack.
// Used by inventory slots and modifier rack slots. Bounce-back (restore) is
// the same as offer.
export function makeStorageBinding(
  pos: { x: number; y: number },
  getStack: () => ItemStack | null,
  setStack: (s: ItemStack | null) => void,
  cb: SlotCallbacks,
): SlotBinding {
  const binding: SlotBinding = {
    getScreenPos: () => pos,
    peek: () => getStack(),
    accepts: (itemType) => {
      const cur = getStack()
      return cur === null || cur.type === itemType
    },
    take: (count) => {
      const cur = getStack()
      if (!cur) return null
      const n = Math.min(count, cur.count)
      if (n <= 0) return null
      const taken: ItemStack = { type: cur.type, count: n }
      // preserve bag contents on the taken stack so moving a bag never drops
      // its items (bags are maxStack 1, so taking always moves the whole bag)
      if (cur.contents) taken.contents = cur.contents
      cur.count -= n
      if (cur.count <= 0) setStack(null)
      cb.onChange()
      return taken
    },
    offer: (stack) => {
      const cur = getStack()
      const cap = ITEMS[stack.type].maxStack
      if (!cur) {
        const moved = Math.min(cap, stack.count)
        const placed: ItemStack = { type: stack.type, count: moved }
        // carry bag contents into the destination slot
        if (stack.contents) placed.contents = stack.contents
        setStack(placed)
        cb.onChange()
        return moved
      }
      if (cur.type !== stack.type) return 0
      const room = cap - cur.count
      if (room <= 0) return 0
      const moved = Math.min(room, stack.count)
      cur.count += moved
      cb.onChange()
      return moved
    },
    restore: (stack) => binding.offer(stack),
  }
  return binding
}

// Producer output binding — like a storage slot but only accepts a specific
// item type (the one this building produces). Used by mill/well output.
export function makeProducerOutputBinding(
  pos: { x: number; y: number },
  produces: ItemType,
  getStack: () => ItemStack | null,
  setStack: (s: ItemStack | null) => void,
  cb: SlotCallbacks,
): SlotBinding {
  const binding: SlotBinding = {
    getScreenPos: () => pos,
    peek: () => getStack(),
    accepts: (itemType) => itemType === produces,
    take: (count) => {
      const cur = getStack()
      if (!cur) return null
      const n = Math.min(count, cur.count)
      if (n <= 0) return null
      const taken: ItemStack = { type: cur.type, count: n }
      cur.count -= n
      if (cur.count <= 0) setStack(null)
      cb.onChange()
      return taken
    },
    offer: (stack) => {
      if (stack.type !== produces) return 0
      const cur = getStack()
      const cap = ITEMS[produces].maxStack
      if (!cur) {
        const moved = Math.min(cap, stack.count)
        setStack({ type: produces, count: moved })
        cb.onChange()
        return moved
      }
      const room = cap - cur.count
      if (room <= 0) return 0
      const moved = Math.min(room, stack.count)
      cur.count += moved
      cb.onChange()
      return moved
    },
    restore: (stack) => binding.offer(stack),
  }
  return binding
}

// Crafter input slot binding — same-type stacking, used for the two input
// slots of a crafter. (Crafter output is a virtual preview and uses its own
// binding, defined in CrafterInterior.)
export function makeCrafterInputBinding(
  pos: { x: number; y: number },
  getStack: () => ItemStack | null,
  setStack: (s: ItemStack | null) => void,
  cb: SlotCallbacks,
): SlotBinding {
  // Crafter input is identical to a storage slot: any type, stack same-type.
  // Bags are rejected — you can't craft with a bag.
  const binding = makeStorageBinding(pos, getStack, setStack, cb)
  const baseAccepts = binding.accepts
  binding.accepts = (itemType) => !isBag(itemType) && baseAccepts(itemType)
  return binding
}

// Distribute a stack across a set of slot bindings, Minecraft-style: first
// merge into existing stacks of the same type, then fill empty/accepting slots.
// Mutates `stack` (subtracts what was placed). Shared by interior shift-click
// and the crate panel so both behave identically.
export function distributeIntoBindings(stack: ItemStack, bindings: SlotBinding[]) {
  // Pass 1: merge into existing stacks of the same type
  for (const b of bindings) {
    if (stack.count <= 0) break
    const existing = b.peek()
    if (!existing || existing.type !== stack.type) continue
    stack.count -= b.offer(stack)
  }
  // Pass 2: place into empty/accepting slots
  for (const b of bindings) {
    if (stack.count <= 0) break
    if (!b.accepts(stack.type)) continue
    stack.count -= b.offer(stack)
  }
}
