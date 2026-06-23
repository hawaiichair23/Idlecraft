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
  // Mining power for tools. Shown in the inspect tooltip. Higher = fewer hits to
  // break a rock (base 12 hits, reduced by this value).
  mining?: number
  // Melee combat power for tools used as weapons. Shown in the inspect tooltip.
  combat?: number
  // Chopping power for axes. Shown in the inspect tooltip. Higher = fewer swings
  // to fell a tree.
  chopping?: number
  // Trait label shown to the right of the item name in the inspect tooltip, in a
  // dimmer color. A reusable keyword flagging a special property (e.g. 'Lucky').
  attribute?: string
}

// Visual budget for slot icons: ~36px on screen leaves room for the slot frame.
// scale = TARGET_PX / native source size in px.
const ITEMS_RAW = {
  flour:   { name: 'Flour',   sprite: 'item_flour',   maxStack: 64, scale: 36 / 67, sellPrice: 1 },
  water:   { name: 'Water',   sprite: 'item_water',   maxStack: 64, scale: 2, sellPrice: 2, activeTool: true, cursorContexts: ['overworld'] },
  bread:   { name: 'Bread',   sprite: 'item_bread',   maxStack: 64, scale: 2, edible: true, crumbColor: 0xD4A574, healHearts: 0.5, sellPrice: 7, desc: 'A baked food product.' },
  snake_oil: { name: 'Snake Oil', sprite: 'item_snake_oil', maxStack: 64, scale: 2, edible: true, crumbColor: 0xCAA24A, healFull: true, sellPrice: 15, desc: 'Patent medicine.' },
  shovel:  { name: 'Shovel',  sprite: 'item_shovel',  maxStack: 1,  scale: 3, sellPrice: 40, activeTool: true, cursorContexts: ['overworld', 'field'], desc: 'For digging and burying.' },
  axe:     { name: 'Axe',     sprite: 'item_axe',     maxStack: 1,  scale: 3, sellPrice: 200, activeTool: true, cursorContexts: ['overworld'], chopping: 1, desc: 'For felling trees into wood.' },
  bag:     { name: 'Bag',     sprite: 'item_bag',     maxStack: 1,  scale: 2, bagCols: 2, bagRows: 2, sellPrice: 100, desc: 'Extra storage.' },
  medium_bag: { name: 'War Bag', sprite: 'item_medium_bag', maxStack: 1,  scale: 2, bagCols: 3, bagRows: 2, sellPrice: 100, desc: 'Extra storage.' },
  sack:    { name: 'Sack',    sprite: 'item_sack',    maxStack: 1,  scale: 2, bagCols: 4, bagRows: 2, sellPrice: 120, desc: 'A lot of storage.' },
  sausage: { name: 'Sausage', sprite: 'item_sausage', maxStack: 64, scale: 2, edible: true, crumbColor: 0xA03828, healHearts: 0.75, sellPrice: 3, desc: 'A meat product made from pork.' },
  kolache: { name: 'Kolache', sprite: 'item_kolache', maxStack: 64, scale: 2, edible: true, crumbColor: 0xC49043, healHearts: 1, sellPrice: 8, desc: 'Pig in a blanket.' },
  leather:    { name: 'Leather',    sprite: 'item_leather',    maxStack: 64, scale: 2, sellPrice: 6, desc: 'Tanned animal hide.' },
  twine:      { name: 'Twine',      sprite: 'item_twine',      maxStack: 64, scale: 2, sellPrice: 15 },
  canvas:     { name: 'Canvas',     sprite: 'item_canvas',     maxStack: 64, scale: 2, sellPrice: 40, desc: 'Woven from twine.' },
  quirt: {
    name: 'Quirt', sprite: 'item_quirt', maxStack: 1, scale: 2, sellPrice: 25, desc: `A horseman's whip for controlling speed.`, activeTool: true, cursorContexts: ['overworld'] },
  sugar_cane: { name: 'Sugar Cane', sprite: 'item_sugar_cane', maxStack: 64, scale: 2, sellPrice: 2 },
  sugar:      { name: 'Sugar',      sprite: 'item_sugar',      maxStack: 64, scale: 2, sellPrice: 4 },
  tart:               { name: 'Tart',                sprite: 'item_tart',               maxStack: 64, scale: 2, edible: true, crumbColor: 0xD8A848, healHearts: 0.25, sellPrice: 10, desc: 'Shortcrust pastry.' },
  cottonwood_sapling: { name: 'Cottonwood Sapling',  sprite: 'item_cottonwood_sapling', maxStack: 64, scale: 2, sellPrice: 20, activeTool: true, cursorContexts: ['overworld'], desc: 'Plant in arable ground. Grows a cottonwood.' },
  hemp:               { name: 'Hemp',                sprite: 'item_hemp',               maxStack: 64, scale: 2, sellPrice: 10, desc: 'Harvested fiber. Used in crafting.' },
  hemp_seed:          { name: 'Hemp Seed',           sprite: 'item_hemp_seed',          maxStack: 64, scale: 2, sellPrice: 5, activeTool: true, cursorContexts: ['field'], desc: 'Plant in a field. Grows hemp.' },
  rope:               { name: 'Rope',                sprite: 'item_rope',               maxStack: 64, scale: 2, sellPrice: 35, activeTool: true, desc: 'A grouping of twine.' },
  post:               { name: 'Post',                sprite: 'item_post',               maxStack: 64, scale: 2, sellPrice: 16, activeTool: true, cursorContexts: ['overworld'], desc: 'For tying leads and building fences.' },
  cedar_post:         { name: 'Cedar Post',          sprite: 'item_cedar_post',         maxStack: 64, scale: 2, sellPrice: 16, activeTool: true, cursorContexts: ['overworld'] },
  iron_post:          { name: 'Iron Post',           sprite: 'item_iron_post',          maxStack: 64, scale: 2, sellPrice: 20, activeTool: true, cursorContexts: ['overworld'] },
  wood:               { name: 'Wood',                sprite: 'item_wood',               maxStack: 64, scale: 2, sellPrice: 6 },
  plank:              { name: 'Plank',               sprite: 'item_plank',              maxStack: 64, scale: 2, sellPrice: 4, activeTool: true, cursorContexts: ['overworld'] },
  flagstone:          { name: 'Flagstone',           sprite: 'item_flagstone',          maxStack: 64, scale: 2, sellPrice: 4, activeTool: true, cursorContexts: ['overworld'] },
  sandstone:          { name: 'Sandstone',           sprite: 'item_sandstone',          maxStack: 64, scale: 2, sellPrice: 4, activeTool: true, cursorContexts: ['overworld'] },
  wood_wall:          { name: 'Wood Wall',           sprite: 'wood_wall',               maxStack: 64, scale: 2, sellPrice: 8, activeTool: true, cursorContexts: ['overworld'], desc: 'Wooden wall section.' },
  stone:              { name: 'Stone',               sprite: 'item_stone',              maxStack: 64, scale: 2, sellPrice: 2 },
  clay:               { name: 'Clay',                sprite: 'item_clay',               maxStack: 64, scale: 2, sellPrice: 2, desc: 'Found near riverbanks.' },
  crate:              { name: 'Crate',               sprite: 'item_crate',              maxStack: 64, scale: 2, sellPrice: 30, activeTool: true, cursorContexts: ['overworld'] },
  silver_lockbox:     { name: 'Silver Lockbox',      sprite: 'item_silver_lockbox',     maxStack: 64, scale: 2, sellPrice: 80, activeTool: true, cursorContexts: ['overworld'] },
  gold_lockbox:       { name: 'Gold Lockbox',        sprite: 'item_gold_lockbox',       maxStack: 64, scale: 2, sellPrice: 150, activeTool: true, cursorContexts: ['overworld'] },
  chest:              { name: 'Chest',               sprite: 'item_chest',              maxStack: 64, scale: 2, sellPrice: 60, activeTool: true, cursorContexts: ['overworld'] },
  pickaxe:            { name: 'Pickaxe',             sprite: 'item_pickaxe',            maxStack: 1,  scale: 3, sellPrice: 400, activeTool: true, cursorContexts: ['overworld'], mining: 1, combat: 1, desc: 'For breaking, prying, and digging.' },
  damascus_pick:      { name: 'Damascus Steel Pick', sprite: 'item_damascus_pick',      maxStack: 1,  scale: 3, sellPrice: 800, activeTool: true, cursorContexts: ['overworld'], mining: 2, combat: 1, desc: 'Layered steel that shreds stone.' },
  greedy:             { name: 'Greedy',              sprite: 'item_greedy',             maxStack: 1,  scale: 3, sellPrice: 800, activeTool: true, cursorContexts: ['overworld'], mining: 1, combat: 1, attribute: 'Lucky', desc: 'Takes more than its share from every rock.' },
  double_jack:        { name: 'Double Jack',         sprite: 'item_double_jack',        maxStack: 1,  scale: 3, sellPrice: 800, activeTool: true, cursorContexts: ['overworld'], mining: 1, combat: 1, attribute: 'Lucky', desc: 'Strikes twice every so often.' },
  toledo_pick:        { name: 'Toledo Pick',         sprite: 'item_toledo',             maxStack: 1,  scale: 3, sellPrice: 800, activeTool: true, cursorContexts: ['overworld'], mining: 1, combat: 1, attribute: 'Odd', desc: 'Fine steel that mines several deposits at once.' },
  paul_bunyan:        { name: 'Paul Bunyan',         sprite: 'item_paul_bunyan',        maxStack: 1,  scale: 3, sellPrice: 800, activeTool: true, cursorContexts: ['overworld'], chopping: 2, combat: 1, attribute: 'Odd', desc: 'Chops nearby trees in one swing.' },
  wild_bill:          { name: 'Wild Bill',           sprite: 'item_wild_bill',          maxStack: 1,  scale: 3, sellPrice: 800, activeTool: true, cursorContexts: ['overworld'], chopping: 1, combat: 2, desc: 'An axe that has seen more men than trees.' },
  coal:               { name: 'Coal',                sprite: 'item_coal',               maxStack: 64, scale: 2 },
  iron:               { name: 'Iron Ore',            sprite: 'item_iron',               maxStack: 64, scale: 2 },
  copper:             { name: 'Copper Ore',          sprite: 'item_copper',             maxStack: 64, scale: 2 },
  silver:             { name: 'Silver Ore',          sprite: 'item_silver',             maxStack: 64, scale: 2 },
  gold:               { name: 'Gold Ore',            sprite: 'item_gold',               maxStack: 64, scale: 2 },
  iron_bar:           { name: 'Iron Bar',            sprite: 'item_iron_bar',           maxStack: 64, scale: 2, sellPrice: 12 },
  copper_bar:         { name: 'Copper Bar',          sprite: 'item_copper_bar',         maxStack: 64, scale: 2, sellPrice: 18 },
  silver_bar:         { name: 'Silver Bar',          sprite: 'item_silver_bar',         maxStack: 64, scale: 2, sellPrice: 30 },
  gold_bar:           { name: 'Gold Bar',            sprite: 'item_gold_bar',           maxStack: 64, scale: 2, sellPrice: 50 },
  brand:              { name: 'Brand',               sprite: 'item_brand',              maxStack: 1,  scale: 2, sellPrice: 25, activeTool: true, cursorContexts: ['overworld'], desc: 'A branding iron.' },
  pipe:               { name: 'Pipe',                sprite: 'item_pipe',               maxStack: 64, scale: 2, sellPrice: 20, activeTool: true, cursorContexts: ['overworld'], desc: 'Connects two plots for manufacturing.' },
  wheel:              { name: 'Wheel',               sprite: 'item_wheel',              maxStack: 64, scale: 2, sellPrice: 12, desc: `Accoutrements to a cart.` },
  crafting_cart:      { name: 'Cart',                sprite: 'item_crafting_cart',      maxStack: 1,  scale: 2, sellPrice: 80 },
  fence_gate:         { name: 'Fence Gate',          sprite: 'item_fence_gate',         maxStack: 64, scale: 2, sellPrice: 20, activeTool: true, cursorContexts: ['overworld'], desc: 'To open and close a fence line.' },
  derringer:          { name: 'Derringer',           sprite: 'item_derringer',          maxStack: 1,  scale: 2, sellPrice: 300, activeTool: true, cursorContexts: ['overworld'], desc: `A small gambler's pistol.`, gunSpread: 0.3, gunReloadMs: 1300, combat: 3 },
  colt:               { name: 'Colt',                sprite: 'item_colt',               maxStack: 1,  scale: 2, sellPrice: 500, activeTool: true, cursorContexts: ['overworld'], desc: 'A reliable six-shooter.', gunSpread: 0, gunReloadMs: 600, gunAmmo: 5, gunFullReloadMs: 2000, combat: 5 },
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

export interface ContainerPhysics {
  mass: number
  frictionAir: number
  pushForce: number
  ropeStiffness: number
}

export const CONTAINER_PHYSICS: Record<string, ContainerPhysics> = {
  crate:          { mass: 0.8, frictionAir: 0.06, pushForce: 0.00014, ropeStiffness: 0.5 },
  chest:          { mass: 1.2, frictionAir: 0.1,  pushForce: 0.0001,  ropeStiffness: 0.15 },
  silver_lockbox: { mass: 1.2, frictionAir: 0.1,  pushForce: 0.0001,  ropeStiffness: 0.15 },
  gold_lockbox:   { mass: 1.2, frictionAir: 0.1,  pushForce: 0.0001,  ropeStiffness: 0.15 },
}

export const DEFAULT_CONTAINER_PHYSICS: ContainerPhysics = CONTAINER_PHYSICS.crate

export const SMELT_RECIPES: Record<string, ItemType> = {
  iron: 'iron_bar',
  copper: 'copper_bar',
  silver: 'silver_bar',
  gold: 'gold_bar',
}

export const FUEL_BURN_MS: Record<string, number> = {
  coal: 30000,
  wood: 15000,
}

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
