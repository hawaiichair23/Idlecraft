// Items in the game. Each ItemType is a string id; ITEMS maps id → metadata.
// New items: add an entry to ItemType, ITEMS, and (if needed) a sprite.

export type ItemType = 'flour' | 'water' | 'bread' | 'shovel'

export interface ItemDef {
  name: string
  sprite: string        // sprite key (registered in sprites/data.ts or loaded as PNG)
  maxStack: number
  // Render scale. Generated 8×8 pixel sprites use 2. Larger real-art PNGs use
  // smaller values so the icon fits the 48px slot frame.
  scale: number
}

// Visual budget for slot icons: ~36px on screen leaves room for the slot frame.
// scale = TARGET_PX / native source size in px.
export const ITEMS: Record<ItemType, ItemDef> = {
  flour: { name: 'Flour', sprite: 'item_flour', maxStack: 64, scale: 36 / 67 },
  water: { name: 'Water', sprite: 'item_water', maxStack: 64, scale: 36 / 88 },
  bread: { name: 'Bread', sprite: 'item_bread', maxStack: 64, scale: 2 },
  shovel: { name: 'Shovel', sprite: 'item_shovel', maxStack: 1, scale: 3 },
}

// A stack of a single item type. Slots hold one of these (or null).
export interface ItemStack {
  type: ItemType
  count: number
}
