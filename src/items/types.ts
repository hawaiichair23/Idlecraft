// Items in the game. Each ItemType is a string id; ITEMS maps id → metadata.
// New items: add ONE entry to the ITEMS object below. ItemType is derived from
// its keys automatically — there is no separate list to keep in sync.

export interface ItemDef {
  name: string
  desc?: string           // short flavor/info line shown in the E-inventory tooltip
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
  // Hearts restored when consumed (0.5 = half a heart). Snake oil heals a full 1.
  healHearts?: number
  // When true, consuming restores the player to full health regardless of max.
  healFull?: boolean
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
  gunSpread?: number
  gunReloadMs?: number
  gunAmmo?: number
  gunFullReloadMs?: number
}

// Visual budget for slot icons: ~36px on screen leaves room for the slot frame.
// scale = TARGET_PX / native source size in px.
const ITEMS_RAW = {
  flour:   { name: 'Flour',   sprite: 'item_flour',   maxStack: 64, scale: 36 / 67, sellPrice: 1 },
  water:   { name: 'Water',   sprite: 'item_water',   maxStack: 64, scale: 36 / 88, sellPrice: 2 },
  bread:   { name: 'Bread',   sprite: 'item_bread',   maxStack: 64, scale: 2, edible: true, crumbColor: 0xD4A574, speedBuff: 25, healHearts: 0.5, sellPrice: 7, desc: 'Restores half a heart.' },
  snake_oil: { name: 'Snake Oil', sprite: 'item_snake_oil', maxStack: 64, scale: 2, edible: true, crumbColor: 0xCAA24A, speedBuff: 25, healFull: true, sellPrice: 15, desc: 'Cures what ails you. Restores full health.' },
  shovel:  { name: 'Shovel',  sprite: 'item_shovel',  maxStack: 1,  scale: 3, sellPrice: 40, activeTool: true, cursorContexts: ['overworld', 'field'], desc: 'For digging and burying.' },
  axe:     { name: 'Axe',     sprite: 'item_axe',     maxStack: 1,  scale: 3, sellPrice: 200, activeTool: true, cursorContexts: ['overworld'], desc: 'For felling trees into wood.' },
  bag:     { name: 'Bag',     sprite: 'item_bag',     maxStack: 1,  scale: 2, bagCols: 2, bagRows: 2, sellPrice: 100, desc: 'Extra storage.' },
  medium_bag: { name: 'War Bag', sprite: 'item_medium_bag', maxStack: 1,  scale: 2, bagCols: 3, bagRows: 2, sellPrice: 100, desc: 'Extra storage. Wider than a bag.' },
  sack:    { name: 'Sack',    sprite: 'item_sack',    maxStack: 1,  scale: 2, bagCols: 4, bagRows: 2, sellPrice: 120, desc: 'Extra storage. Wider still.' },
  sausage: { name: 'Sausage', sprite: 'item_sausage', maxStack: 64, scale: 2, edible: true, crumbColor: 0xA03828, speedBuff: 25, healHearts: 0.75, sellPrice: 3, desc: 'Restores three-quarters of a heart.' },
  kolache: { name: 'Kolache', sprite: 'item_kolache', maxStack: 64, scale: 2, edible: true, crumbColor: 0xC49043, speedBuff: 35, healHearts: 1, sellPrice: 8, desc: 'Restores a full heart. A Czech pastry.' },
  leather:    { name: 'Leather',    sprite: 'item_leather',    maxStack: 64, scale: 2, sellPrice: 6, desc: 'Tanned animal hide.' },
  twine:      { name: 'Twine',      sprite: 'item_twine',      maxStack: 64, scale: 2, sellPrice: 15 },
  canvas:     { name: 'Canvas',     sprite: 'item_canvas',     maxStack: 64, scale: 2, sellPrice: 40, desc: 'Woven from twine.' },
  quirt:      { name: 'Quirt',      sprite: 'item_quirt',      maxStack: 1,  scale: 2, sellPrice: 25, activeTool: true, cursorContexts: ['overworld'] },
  sugar_cane: { name: 'Sugar Cane', sprite: 'item_sugar_cane', maxStack: 64, scale: 2, sellPrice: 2 },
  sugar:      { name: 'Sugar',      sprite: 'item_sugar',      maxStack: 64, scale: 2, sellPrice: 4 },
  tart:               { name: 'Tart',                sprite: 'item_tart',               maxStack: 64, scale: 2, edible: true, crumbColor: 0xD8A848, speedBuff: 25, healHearts: 0.25, sellPrice: 10, desc: 'Restores a quarter heart. Sweet.' },
  cottonwood_sapling: { name: 'Cottonwood Sapling',  sprite: 'item_cottonwood_sapling', maxStack: 64, scale: 2, sellPrice: 20, activeTool: true, cursorContexts: ['overworld'], desc: 'Plant in arable ground. Grows a cottonwood.' },
  hemp:               { name: 'Hemp',                sprite: 'item_hemp',               maxStack: 64, scale: 2, sellPrice: 10, desc: 'Harvested fiber. Used in crafting.' },
  hemp_seed:          { name: 'Hemp Seed',           sprite: 'item_hemp_seed',          maxStack: 64, scale: 2, sellPrice: 5, activeTool: true, cursorContexts: ['field'], desc: 'Plant in a field. Grows hemp.' },
  rope:               { name: 'Rope',                sprite: 'item_rope',               maxStack: 64, scale: 2, sellPrice: 35, activeTool: true, desc: 'A grouping of twine.' },
  post:               { name: 'Post',                sprite: 'item_post',               maxStack: 64, scale: 2, sellPrice: 16, activeTool: true, cursorContexts: ['overworld'], desc: 'For tying leads and building fences.' },
  cedar_post:         { name: 'Cedar Post',          sprite: 'item_cedar_post',         maxStack: 64, scale: 2, sellPrice: 16, activeTool: true, cursorContexts: ['overworld'] },
  iron_post:          { name: 'Iron Post',           sprite: 'item_iron_post',          maxStack: 64, scale: 2, sellPrice: 20, activeTool: true, cursorContexts: ['overworld'] },
  wood:               { name: 'Wood',                sprite: 'item_wood',               maxStack: 64, scale: 2, sellPrice: 6 },
  plank:              { name: 'Plank',               sprite: 'item_plank',              maxStack: 64, scale: 2, sellPrice: 4, activeTool: true, cursorContexts: ['overworld'] },
  flagstone:          { name: 'Flagstone',          sprite: 'item_flagstone',          maxStack: 64, scale: 2, sellPrice: 4, activeTool: true, cursorContexts: ['overworld'] },
  sandstone:          { name: 'Sandstone',          sprite: 'item_sandstone',          maxStack: 64, scale: 2, sellPrice: 4, activeTool: true, cursorContexts: ['overworld'] },
  stone:              { name: 'Stone',               sprite: 'item_stone',              maxStack: 64, scale: 2, sellPrice: 2 },
  clay:               { name: 'Clay',                sprite: 'item_clay',               maxStack: 64, scale: 2, sellPrice: 2, desc: 'Found near riverbanks.' },
  crate:              { name: 'Crate',               sprite: 'item_crate',              maxStack: 64, scale: 2, sellPrice: 30, activeTool: true, cursorContexts: ['overworld'] },
  silver_lockbox:     { name: 'Silver Lockbox',      sprite: 'item_silver_lockbox',     maxStack: 64, scale: 2, sellPrice: 80, activeTool: true, cursorContexts: ['overworld'] },
  gold_lockbox:       { name: 'Gold Lockbox',        sprite: 'item_gold_lockbox',       maxStack: 64, scale: 2, sellPrice: 150, activeTool: true, cursorContexts: ['overworld'] },
  chest:              { name: 'Chest',               sprite: 'item_chest',              maxStack: 64, scale: 2, sellPrice: 60, activeTool: true, cursorContexts: ['overworld'] },
  pickaxe:            { name: 'Pickaxe',             sprite: 'item_pickaxe',            maxStack: 1,  scale: 3, sellPrice: 400, activeTool: true, cursorContexts: ['overworld'], desc: 'For breaking, prying, and digging.' },
  coal:               { name: 'Coal',                sprite: 'item_coal',               maxStack: 64, scale: 2 },
  iron:               { name: 'Iron Ore',            sprite: 'item_iron',               maxStack: 64, scale: 2 },
  copper:             { name: 'Copper Ore',          sprite: 'item_copper',             maxStack: 64, scale: 2 },
  silver:             { name: 'Silver Ore',          sprite: 'item_silver',             maxStack: 64, scale: 2 },
  gold:               { name: 'Gold Ore',            sprite: 'item_gold',               maxStack: 64, scale: 2 },
  pipe:               { name: 'Pipe',                sprite: 'item_pipe',               maxStack: 64, scale: 2, sellPrice: 20, activeTool: true, cursorContexts: ['overworld'], desc: 'Connects two plots for manufacturing.' },
  wheel:              { name: 'Wheel',               sprite: 'item_wheel',              maxStack: 64, scale: 2, sellPrice: 12 },
  crafting_cart:      { name: 'Cart',                sprite: 'item_crafting_cart',      maxStack: 1,  scale: 2, sellPrice: 80 },
  fence_gate:         { name: 'Fence Gate',          sprite: 'item_fence_gate',         maxStack: 64, scale: 2, sellPrice: 20, activeTool: true, cursorContexts: ['overworld'], desc: 'To open and close a fence line.' },
  derringer:          { name: 'Derringer',           sprite: 'item_derringer',          maxStack: 1,  scale: 2, sellPrice: 300, activeTool: true, cursorContexts: ['overworld'], desc: `A small gambler's pistol.`, gunSpread: 0.3, gunReloadMs: 1300 },
  colt:               { name: 'Colt',                sprite: 'item_colt',               maxStack: 1,  scale: 2, sellPrice: 500, activeTool: true, cursorContexts: ['overworld'], desc: 'A reliable six-shooter.', gunSpread: 0, gunReloadMs: 600, gunAmmo: 5, gunFullReloadMs: 2000 },
  ammo:               { name: 'Ammo',                sprite: 'item_ammo',               maxStack: 100, scale: 2, sellPrice: 1, desc: 'Cartridges for pistols. Sold by the box.' },
  colt_ammo:          { name: '.36 Colt',            sprite: 'item_ammo',               maxStack: 100, scale: 2, sellPrice: 1, desc: '.36 caliber cartridges for the Colt.' },
  silver_key:         { name: 'Silver Key',          sprite: 'item_silver_key',         maxStack: 1,  scale: 2, sellPrice: 50, desc: 'Unlocks a silver lockbox.' },
  gold_key:           { name: 'Gold Key',            sprite: 'item_gold_key',           maxStack: 1,  scale: 2, sellPrice: 100, desc: 'Unlocks a gold lockbox.' },
  gem_agate:          { name: 'Gem',             sprite: 'item_gem_agate',          maxStack: 64, scale: 2, sellPrice: 0, desc: 'Unknown' },
  gem_turquoise:      { name: 'Gem',             sprite: 'item_gem_turquoise',      maxStack: 64, scale: 2, sellPrice: 0, desc: 'Unknown' },
  gem_chalcedony:     { name: 'Gem',             sprite: 'item_gem_chalcedony',     maxStack: 64, scale: 2, sellPrice: 0, desc: 'Unknown' },
  gem_topaz:          { name: 'Gem',             sprite: 'item_gem_topaz',          maxStack: 64, scale: 2, sellPrice: 0, desc: 'Unknown' },
  gem_amethyst:       { name: 'Gem',             sprite: 'item_gem_amethyst',       maxStack: 64, scale: 2, sellPrice: 0, desc: 'Unknown' },
  gem_diamond:        { name: 'Gem',             sprite: 'item_gem_diamond',        maxStack: 64, scale: 2, sellPrice: 0, desc: 'Unknown' },
  gem_ruby:           { name: 'Gem',             sprite: 'item_gem_ruby',           maxStack: 64, scale: 2, sellPrice: 0, desc: 'Unknown' },
} satisfies Record<string, ItemDef>

// ItemType is derived from the ITEMS_RAW keys — the registry is the single
// source of truth. Adding an entry above automatically extends this union.
export type ItemType = keyof typeof ITEMS_RAW

// Exported widened to ItemDef values so optional fields (edible, bagCols, etc.)
// are accessible on any ITEMS[type] lookup. ITEMS_RAW keeps the literal keys
// that drive ItemType; this is the same object, just typed for consumers.
export const ITEMS: Record<ItemType, ItemDef> = ITEMS_RAW

// A stack of a single item type. Slots hold one of these (or null).
// `contents` is bag-only — each bag instance carries its own storage.
export interface ItemStack {
  type: ItemType
  count: number
  contents?: (ItemStack | null)[]
  // Lockbox-only: carried on the item instance so a placed-then-picked-up
  // lockbox is the *same* box — keeps whether it's been unlocked.
  unlocked?: boolean
}
