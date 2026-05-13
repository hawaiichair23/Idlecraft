import type { ItemStack, ItemType } from '../items/types'

// A slot is anything the drag controller can pick up from or drop into.
// Implementers (inventory slot, building output, crafter input/output) wire
// take/place to their own state.
export interface SlotBinding {
  // Screen-space center of the slot. Used to render the slot's visual position
  // and to snap held items back on cancel.
  getScreenPos(): { x: number; y: number }

  // Can the player pick up from here right now?
  canTake(): boolean
  // Can the player drop `item` here right now?
  canPlace(item: ItemType): boolean

  // Pull one stack out (e.g. all of a single-stack slot, or 1 unit — caller's
  // choice; for now, take returns the entire stack). Returns null if empty.
  take(): ItemStack | null
  // Place a stack here. Return true if it was accepted; false to bounce back.
  place(stack: ItemStack): boolean
}
