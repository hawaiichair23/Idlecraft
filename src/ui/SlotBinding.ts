import type { ItemStack, ItemType } from '../items/types'

// A slot is anything the drag controller can pick up from or drop into.
// Implementers wire these methods to their own state (inventory array, plot
// output field, crafter input array, etc.).
//
// Design rules:
// - peek() is read-only. No side effects. Safe to call any time.
// - take(count) and offer(stack) return what actually happened as a number.
//   Slots manage their own state. The controller does not pre-validate with
//   separate "can I?" calls — it just tries the operation and reads the result.
// - restore(stack) is the bounce-back path: "put this back where it came from."
//   Conceptually different from offer(); some slots (e.g. read-only previews)
//   reject offer but must accept restore.
export interface SlotBinding {
  // Screen-space center of the slot. Used to render the held visual's bounce
  // origin and the selection indicator.
  getScreenPos(): { x: number; y: number }

  // What's currently here, or null if empty. Read-only view; do not mutate.
  peek(): Readonly<ItemStack> | null

  // Try to take up to `count` items. Returns the stack actually removed (count
  // <= requested), or null if nothing could be taken.
  take(count: number): ItemStack | null

  // Try to put `stack` here. Returns the number of items accepted (0 if the
  // slot rejected the offer, e.g. type mismatch or full or read-only).
  // Does NOT mutate the incoming stack. The controller subtracts the accepted
  // count from what it's holding.
  offer(stack: Readonly<ItemStack>): number

  // Put a stack back into this slot during bounce-back. Distinct from offer()
  // so that read-only slots (e.g. crafter output preview) can still accept
  // their own items being returned. Returns the number accepted.
  restore(stack: Readonly<ItemStack>): number

  // Item-type filter for hover preview and the can-I-swap decision. Returns
  // true if this slot would accept *any* amount of this item type via offer().
  // Used only for swap detection in the controller; a false here tells the
  // controller "different item type — try a swap instead of merge."
  accepts(item: ItemType): boolean
}
