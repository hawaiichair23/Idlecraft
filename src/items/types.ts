// Items in the game. Each ItemType is a string id; ITEMS maps id → metadata.
// New items: add an entry to ItemType, ITEMS, and (if needed) a sprite.

export type ItemType = 'flour' | 'water' | 'bread' | 'shovel' | 'bag' | 'medium_bag' | 'sausage' | 'kolache' | 'leather' | 'twine' | 'sugar_cane' | 'sugar' | 'pastry' | 'cottonwood_sapling' | 'hemp' | 'hemp_seed'

export interface ItemDef {
  name: string
  sprite: string        // sprite key (registered in sprites/data.ts or loaded as PNG)
  maxStack: number
  // Render scale. Generated 8×8 pixel sprites use 2. Larger real-art PNGs use
  // smaller values so the icon fits the 48px slot frame.
  scale: number
  // True for food items — right-click while selected or held consumes 1.
  edible?: boolean
  // Particle color for eating crumbs. Required when edible.
  crumbColor?: number
  // Speed bonus granted for FOOD_BUFF_MS when this food is eaten. Required when edible.
  speedBuff?: number
  // Sell price at the general store in gold per item. 0 (or undefined) = not sellable.
  sellPrice?: number
  // Bag grid dimensions. Defined for bag-family items only.
  bagCols?: number
  bagRows?: number
}

// Visual budget for slot icons: ~36px on screen leaves room for the slot frame.
// scale = TARGET_PX / native source size in px.
export const ITEMS: Record<ItemType, ItemDef> = {
  flour:   { name: 'Flour',   sprite: 'item_flour',   maxStack: 64, scale: 36 / 67, sellPrice: 1 },
  water:   { name: 'Water',   sprite: 'item_water',   maxStack: 64, scale: 36 / 88, sellPrice: 2 },
  bread:   { name: 'Bread',   sprite: 'item_bread',   maxStack: 64, scale: 2, edible: true, crumbColor: 0xD4A574, speedBuff: 25, sellPrice: 5 },
  shovel:  { name: 'Shovel',  sprite: 'item_shovel',  maxStack: 1,  scale: 3, sellPrice: 80 },
  bag:     { name: 'Bag',     sprite: 'item_bag',     maxStack: 1,  scale: 2, bagCols: 2, bagRows: 2, sellPrice: 100 },
  medium_bag: { name: 'War Bag', sprite: 'item_medium_bag', maxStack: 1,  scale: 2, bagCols: 3, bagRows: 2, sellPrice: 100 },
  sausage: { name: 'Sausage', sprite: 'item_sausage', maxStack: 64, scale: 2, edible: true, crumbColor: 0xA03828, speedBuff: 25, sellPrice: 3 },
  kolache: { name: 'Kolache', sprite: 'item_kolache', maxStack: 64, scale: 2, edible: true, crumbColor: 0xC49043, speedBuff: 35, sellPrice: 8 },
  leather:    { name: 'Leather',    sprite: 'item_leather',    maxStack: 64, scale: 2, sellPrice: 6 },
  twine:      { name: 'Twine',      sprite: 'item_twine',      maxStack: 64, scale: 2, sellPrice: 10 },
  sugar_cane: { name: 'Sugar Cane', sprite: 'item_sugar_cane', maxStack: 64, scale: 2, sellPrice: 2 },
  sugar:      { name: 'Sugar',      sprite: 'item_sugar',      maxStack: 64, scale: 2, sellPrice: 4 },
  pastry:             { name: 'Tart',                sprite: 'item_pastry',             maxStack: 64, scale: 2, edible: true, crumbColor: 0xD8A848, speedBuff: 25, sellPrice: 10 },
  cottonwood_sapling: { name: 'Cottonwood Sapling',  sprite: 'item_cottonwood_sapling', maxStack: 64, scale: 2, sellPrice: 1 },
  hemp:               { name: 'Hemp',                sprite: 'item_hemp',               maxStack: 64, scale: 2 },
  hemp_seed:          { name: 'Hemp Seed',           sprite: 'item_hemp_seed',          maxStack: 64, scale: 2 },
}

// A stack of a single item type. Slots hold one of these (or null).
// `contents` is bag-only — each bag instance carries its own storage.
export interface ItemStack {
  type: ItemType
  count: number
  contents?: (ItemStack | null)[]
}
