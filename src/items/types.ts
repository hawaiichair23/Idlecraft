// Items in the game. Each ItemType is a string id; ITEMS maps id → metadata.
// New items: add an entry to ItemType, ITEMS, and (if needed) a sprite.

export type ItemType = 'flour' | 'water' | 'bread'

export interface ItemDef {
  name: string
  sprite: string        // sprite key (registered in sprites/data.ts)
  maxStack: number
}

export const ITEMS: Record<ItemType, ItemDef> = {
  flour: { name: 'Flour', sprite: 'item_flour', maxStack: 64 },
  water: { name: 'Water', sprite: 'item_water', maxStack: 64 },
  bread: { name: 'Bread', sprite: 'item_bread', maxStack: 64 },
}

// A stack of a single item type. Slots hold one of these (or null).
export interface ItemStack {
  type: ItemType
  count: number
}
