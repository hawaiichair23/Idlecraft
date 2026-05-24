// Items in the game. Each ItemType is a string id; ITEMS maps id → metadata.
// New items: add an entry to ItemType, ITEMS, and (if needed) a sprite.

export type ItemType = 'flour' | 'water' | 'bread' | 'shovel' | 'axe' | 'bag' | 'medium_bag' | 'sausage' | 'kolache' | 'leather' | 'twine' | 'sugar_cane' | 'sugar' | 'pastry' | 'cottonwood_sapling' | 'hemp' | 'hemp_seed' | 'rope' | 'post' | 'cedar_post' | 'wood' | 'stone' | 'pickaxe' | 'coal' | 'iron' | 'copper' | 'silver' | 'gold' | 'crate'

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
  // True for active tools (shovel, rope, axe, pickaxe). When scroll-selected
  // in the hotbar, the cursor changes to this item's sprite — but only in
  // the contexts listed in cursorContexts.
  activeTool?: boolean
  // Which scene contexts the tool's cursor should appear in. Defaults to
  // ['overworld'] when activeTool is true. Use 'field' for items only usable
  // inside a field interior. Each tool's cursor only appears where it works.
  cursorContexts?: ('overworld' | 'field')[]
}

// Visual budget for slot icons: ~36px on screen leaves room for the slot frame.
// scale = TARGET_PX / native source size in px.
export const ITEMS: Record<ItemType, ItemDef> = {
  flour:   { name: 'Flour',   sprite: 'item_flour',   maxStack: 64, scale: 36 / 67, sellPrice: 1 },
  water:   { name: 'Water',   sprite: 'item_water',   maxStack: 64, scale: 36 / 88, sellPrice: 2 },
  bread:   { name: 'Bread',   sprite: 'item_bread',   maxStack: 64, scale: 2, edible: true, crumbColor: 0xD4A574, speedBuff: 25, sellPrice: 7 },
  shovel:  { name: 'Shovel',  sprite: 'item_shovel',  maxStack: 1,  scale: 3, sellPrice: 40, activeTool: true, cursorContexts: ['overworld', 'field'] },
  axe:     { name: 'Axe',     sprite: 'item_axe',     maxStack: 1,  scale: 3, sellPrice: 200, activeTool: true, cursorContexts: ['overworld'] },
  bag:     { name: 'Bag',     sprite: 'item_bag',     maxStack: 1,  scale: 2, bagCols: 2, bagRows: 2, sellPrice: 100 },
  medium_bag: { name: 'War Bag', sprite: 'item_medium_bag', maxStack: 1,  scale: 2, bagCols: 3, bagRows: 2, sellPrice: 100 },
  sausage: { name: 'Sausage', sprite: 'item_sausage', maxStack: 64, scale: 2, edible: true, crumbColor: 0xA03828, speedBuff: 25, sellPrice: 3 },
  kolache: { name: 'Kolache', sprite: 'item_kolache', maxStack: 64, scale: 2, edible: true, crumbColor: 0xC49043, speedBuff: 35, sellPrice: 8 },
  leather:    { name: 'Leather',    sprite: 'item_leather',    maxStack: 64, scale: 2, sellPrice: 6 },
  twine:      { name: 'Twine',      sprite: 'item_twine',      maxStack: 64, scale: 2, sellPrice: 15 },
  sugar_cane: { name: 'Sugar Cane', sprite: 'item_sugar_cane', maxStack: 64, scale: 2, sellPrice: 2 },
  sugar:      { name: 'Sugar',      sprite: 'item_sugar',      maxStack: 64, scale: 2, sellPrice: 4 },
  pastry:             { name: 'Tart',                sprite: 'item_pastry',             maxStack: 64, scale: 2, edible: true, crumbColor: 0xD8A848, speedBuff: 25, sellPrice: 10 },
  cottonwood_sapling: { name: 'Cottonwood Sapling',  sprite: 'item_cottonwood_sapling', maxStack: 64, scale: 2, sellPrice: 30, activeTool: true, cursorContexts: ['overworld'] },
  hemp:               { name: 'Hemp',                sprite: 'item_hemp',               maxStack: 64, scale: 2, sellPrice: 10 },
  hemp_seed:          { name: 'Hemp Seed',           sprite: 'item_hemp_seed',          maxStack: 64, scale: 2, sellPrice: 5, activeTool: true, cursorContexts: ['field'] },
  rope:               { name: 'Rope',                sprite: 'item_rope',               maxStack: 64, scale: 2, sellPrice: 25, activeTool: true },
  post:               { name: 'Post',                sprite: 'item_post',               maxStack: 64, scale: 2, sellPrice: 30, activeTool: true, cursorContexts: ['overworld'] },
  cedar_post:         { name: 'Cedar Post',          sprite: 'item_cedar_post',         maxStack: 64, scale: 2, sellPrice: 30, activeTool: true, cursorContexts: ['overworld'] },
  wood:               { name: 'Wood',                sprite: 'item_wood',               maxStack: 64, scale: 2, sellPrice: 6 },
  stone:              { name: 'Stone',               sprite: 'item_stone',              maxStack: 64, scale: 2, sellPrice: 2 },
  crate:              { name: 'Crate',               sprite: 'item_crate',              maxStack: 64, scale: 2, sellPrice: 30, activeTool: true, cursorContexts: ['overworld'] },
  pickaxe:            { name: 'Pickaxe',             sprite: 'item_pickaxe',            maxStack: 1,  scale: 3, sellPrice: 400, activeTool: true, cursorContexts: ['overworld'] },
  coal:               { name: 'Coal',                sprite: 'item_coal',               maxStack: 64, scale: 2 },
  iron:               { name: 'Iron Ore',            sprite: 'item_iron',               maxStack: 64, scale: 2 },
  copper:             { name: 'Copper Ore',          sprite: 'item_copper',             maxStack: 64, scale: 2 },
  silver:             { name: 'Silver Ore',          sprite: 'item_silver',             maxStack: 64, scale: 2 },
  gold:               { name: 'Gold Ore',            sprite: 'item_gold',               maxStack: 64, scale: 2 },
}

// A stack of a single item type. Slots hold one of these (or null).
// `contents` is bag-only — each bag instance carries its own storage.
export interface ItemStack {
  type: ItemType
  count: number
  contents?: (ItemStack | null)[]
}
