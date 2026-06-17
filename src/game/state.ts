// Single source of game state. Scenes read this and mutate via the methods.
// Updates emit events on Phaser's global registry so the UI can react.

import Phaser from 'phaser'
import type { ItemStack, ItemType, ItemDef } from '../items/types'
import { ITEMS } from '../items/types'
import type { WorldStructure } from '../world/structures'
import type { Honse } from '../world/honse'
import type { Coyote } from '../world/coyote'
import type { Bandit } from '../world/bandit'

export type BuildingType = 'empty' | 'mill' | 'workshop' | 'well' | 'field' | 'storage'
export type BuiltType = Exclude<BuildingType, 'empty'>

export const MAX_GOLD = 999_999
export const MAX_HEALTH = 3

// Terrain grid. One byte per TERRAIN_TILE-square cell covering the world, the
// ground-truth map every system reads and writes: gen seeds it, the renderer
// draws from it, planting reads it, fertilizing writes it. Salt=0 so a zeroed
// array is an all-salt basin by default; other terrains are written in.
export const Terrain = { Salt: 0, Grass: 1, Water: 2, CrackedDirt: 3, PathDirt: 4 } as const
export type Terrain = (typeof Terrain)[keyof typeof Terrain]
export const TERRAIN_TILE = 16
export const WOOD_TILE = 24
// Initial world size in pixels. This is the ONLY place the starting size is
// written — worldBounds and the terrain grid derive from it, and growWorld()
// resizes them at runtime.
const INITIAL_WORLD_PX = 576 * 8

export const PLAYER_BASE_SPEED = 1135

export interface WorldBounds {
  minX: number
  minY: number
  width: number
  height: number
}

// General store sell-grid: 6 columns × 4 rows.
export const GENERAL_STORE_SLOTS = 24

// World-placed crate storage: 6 columns × 2 rows.
export const CRATE_SLOTS = 12
// Chest storage (interior container): 6 columns × 4 rows — twice the crate.
export const CHEST_SLOTS = 24

// Standalone world well water capacity — fills to this, then idles.
export const WORLD_WELL_CAP = 4

// Storage building: base 24 slots (6×4), grows with level.
export const STORAGE_BASE_SLOTS = 24
export const STORAGE_COLS = 6

// Field grid: 5×2 plantable cells per field plot.
export const FIELD_COLS = 5
export const FIELD_ROWS = 2
export const FIELD_CELLS_PER_PLOT = FIELD_COLS * FIELD_ROWS

// Per-cell state in a field plot.
//   empty     — bare hole, ready to receive a seed
//   planted   — seed in dirt, no visible growth yet
//   sprouting — visible sprout sprite
//   mature    — full plant, harvestable
export type FieldCellState = 'empty' | 'planted' | 'sprouting' | 'growing' | 'mature'
export interface FieldCell {
  state: FieldCellState
  plantedAt: number   // state.gameTime when planted; 0 for empty cells
}

export function makeEmptyFieldCells(): FieldCell[] {
  return Array.from({ length: FIELD_CELLS_PER_PLOT }, () => ({ state: 'empty' as FieldCellState, plantedAt: 0 }))
}

// One pickupable item inside a walkable interior (abandoned house, future barns).
// Position is stored as 0..1 fractions of floor width/height so the same data
// works regardless of screen size when the interior re-renders.
export interface WalkableInteriorItemInstance {
  x: number       // 0..1 fraction of floor width
  y: number       // 0..1 fraction of floor height
  type: ItemType
  count: number
}

export interface PlotState {
  built: BuildingType
  level: number          // building upgrade level, starts at 1
  lastTickAt: number   // state.gameTime ms of the last completed gold tick
  lastItemTickAt: number  // state.gameTime ms of the last completed item tick (for producers)
  output: ItemStack | null   // producer output: mill→flour, well→water
  // workshop-only: 2 input slots and 1 output slot. null for non-workshop plots.
  craftInputs?: (ItemStack | null)[]
  // Parallel to craftInputs: which source plot index feeds each input slot, so
  // each pipe source keeps its own slot (1st source -> slot 0, 2nd -> slot 1).
  // null = slot not claimed by any source.
  craftInputSources?: (number | null)[]
  craftOutput?: ItemStack | null
  // workshop-only: when true, the workshop crafts on its own timer and the
  // result buffers in craftOutput (for pipes or the player's hand to drain).
  // When false it's a plain crafting table — each craft is pulled by hand.
  // Toggled by the player in the workshop interior.
  autoCraft?: boolean
  // field-only: per-cell state for the 5×5 planting grid. undefined for
  // non-field plots; initialized when a field is built.
  fieldCells?: FieldCell[]
  // storage-only: item grid contents. undefined for non-storage plots;
  // initialized when a storage building is built. Size grows with level.
  storageContents?: (ItemStack | null)[]
}

export interface BuildingDef {
  name: string
  description: string
  cost: number
  tickMs: number
  goldPerTick: number
  producesItem?: ItemType    // mill: 'flour', well: 'water', workshop: undefined
  itemTickMs?: number        // how often it produces 1 of producesItem
}

export const BUILDINGS: Record<BuiltType, BuildingDef> = {
  mill:    { name: 'Mill',    description: 'Grinds grains into flour.',     cost: 15, tickMs: 4000, goldPerTick: 0, producesItem: 'flour', itemTickMs: 8000 },
  well:    { name: 'Well',    description: 'Extracts groundwater.',     cost: 30, tickMs: 8000, goldPerTick: 0, producesItem: 'water', itemTickMs: 16000 },
  workshop: { name: 'Workshop', description: 'Crafts materials into products.', cost: 50, tickMs: 6000, goldPerTick: 0 },
  field:   { name: 'Field',   description: 'Plant and harvest crops.', cost: 100, tickMs: 0, goldPerTick: 0 },
  storage: { name: 'Storage', description: 'Stores items.', cost: 100, tickMs: 0, goldPerTick: 0 },
}

export const BUILDING_LIST: BuiltType[] = ['mill', 'well', 'workshop', 'field', 'storage']

// Upgrade cost: 25, 50, 100, 200, …
export function getUpgradeCost(level: number): number {
  return 25 * Math.pow(2, level - 1)
}

// Effective tick speed after leveling: 18% faster per level.
// Divided by the dev-only time multiplier on the state singleton (default 1).
export function getEffectiveTickMs(base: number, level: number): number {
  const leveled = base * Math.pow(0.82, level - 1)
  const divisor = Math.max(0.01, state.timeMultiplier)   // avoid divide-by-zero
  return Math.max(1, Math.round(leveled / divisor))
}

// Building output slot capacity: 16, 32, 64, 128, …
export function getStorageCap(level: number): number {
  return 16 * Math.pow(2, level - 1)
}

// Storage building slot count by level: 24, 30, 36, 42, …  (+6 per level = one extra row)
export function getStorageSlotCount(level: number): number {
  return STORAGE_BASE_SLOTS + (level - 1) * STORAGE_COLS
}

export const INVENTORY_SIZE = 15
export const HOTBAR_SIZE = 5
export const MAX_BAGS = 2

// True when the given item type is a bag (any tier).
export function isBag(type: ItemType): boolean {
  const def = ITEMS[type]
  return def.bagCols !== undefined && def.bagRows !== undefined
}

// Create the contents array for a bag based on its ItemDef dimensions.
export function createBagContents(type: ItemType): (ItemStack | null)[] {
  const def = ITEMS[type]
  const size = (def.bagCols ?? 0) * (def.bagRows ?? 0)
  return Array.from({ length: size }, () => null)
}

// Create the contents array for a placed crate — a flat fixed-size grid,
// independent of any ItemDef (crates are world objects, not carried bags).
export function createCrateContents(): (ItemStack | null)[] {
  return Array.from({ length: CRATE_SLOTS }, () => null)
}

// Slot count for a placed container by item type. Chests hold twice a crate.
export function containerSlotCount(item: ItemType): number {
  return item === 'chest' ? CHEST_SLOTS : CRATE_SLOTS
}

// Empty contents grid sized to the container's item type.
export function createContainerContents(item: ItemType): (ItemStack | null)[] {
  return Array.from({ length: containerSlotCount(item) }, () => null)
}

class GameState {
  gold = 20
  health = MAX_HEALTH
  plots: PlotState[] = []
  // Fixed world buildings (shop, church, etc.) — not owned, not bought, no ticks.
  worldStructures: WorldStructure[] = []
  // Discovered towns. ID matches an entry in TOWNS from world/structures.ts.
  discoveredTowns: Set<string> = new Set()
  // Plot building types the player can build. Defaults to the starter set;
  // others (field, etc.) are unlocked by purchasing at the Land Office.
  unlockedBuildings: Set<BuiltType> = new Set(['mill', 'well', 'workshop'])
  // Dirt patches left by the shovel — visual scars in the world that persist
  // across the play session.
  dugSpots: { x: number; y: number }[] = []
  // Invisible buried items, placed by world gen. Each entry is consumed when
  // the player digs within reveal radius.
  buriedItems: { x: number; y: number; reward: number }[] = []
  // Invisible buried gems, placed by world gen. Seeded fresh each load from the
  // layout (deterministic from seed), like buriedItems. Consumed on dig.
  buriedGems: { x: number; y: number; type: string }[] = []
  // Item stacks buried by the player. Stored when a dropped item is buried
  // by a shovel-click on a dirt patch. Revealed when the spot is dug again.
  buriedStacks: { x: number; y: number; stack: ItemStack }[] = []
  // Per-walkable-interior state. Keyed by "<buildingType>:<structureIndex>"
  // (e.g. "abandoned_house:3"). Each entry is the live list of items still
  // on the floor — items get spliced out when picked up and never respawn.
  // Initialized lazily on first entry from the spawn config.
  walkableInteriors: Record<string, WalkableInteriorItemInstance[]> = {}
  // Per-walkable-interior crate. Keyed like walkableInteriors. null = this
  // interior was rolled to have no crate. Otherwise a contents grid the open-UI
  // reads, seeded once on first visit and persisted across visits.
  walkableInteriorCrates: Record<string, { contents: (ItemStack | null)[] } | null> = {}
  // Revealed but not yet collected — sprite drawn at position, walk over to claim.
  revealedItems: { x: number; y: number; reward: number }[] = []
  // Items dropped by the player into the world — walk over them to pick up.
  droppedItems: { x: number; y: number; stack: ItemStack }[] = []
  // Trees and saplings planted by the player. Each entry persists as a sprite
  // in the world. `stage` distinguishes a walk-through sapling (diggable, no
  // collision) from a mature tree (solid trunk obstacle, felled with an axe).
  // `plantedAt` is the state.gameTime stamp set when a sapling is planted; the
  // overworld grows it to mature once enough time has elapsed. Only saplings
  // carry it — mature/stump and hand-placed trees leave it undefined.
  plantedTrees: { x: number; y: number; kind: 'cottonwood'; stage: 'sapling' | 'mature' | 'stump' | 'dead'; plantedAt?: number }[] = []
  // Hitching posts placed by the player. Each entry is a sprite in the world
  // and an obstacle in collision. `species` chooses which sprite to render —
  // 'post' (weathered cottonwood gray) or 'cedar_post' (warm cedar brown).
  // Mechanically identical otherwise.
  placedPosts: { x: number; y: number; species?: 'post' | 'cedar_post' | 'iron_post' }[] = []
  placedGates: { x: number; y: number; vertical: boolean; open: boolean; swingX: number; swingY: number }[] = []
  // Containers placed by the player (crates and chests). Each is a sprite +
  // obstacle in the world (like a post) plus its own storage grid in `contents`.
  // `item` is the container's item type ('crate' or 'chest'), driving its sprite,
  // footprint, and slot count. Contents persist for the play session.
  placedCrates: { x: number; y: number; item: ItemType; contents: (ItemStack | null)[]; unlocked?: boolean }[] = []
  // Standalone world wells (e.g. the one in the north town). Each produces
  // water up to WORLD_WELL_CAP, then idles until the player takes some. Unlike
  // plot wells these have no level/upgrades — a fixed-rate water bucket you
  // walk up to and open like a plot well.
  worldWells: { x: number; y: number; water: number; lastTickAt: number }[] = []
  // Pipe connections between plots. Each pipe links a source plot's output
  // to a destination plot's input. Items flow automatically on tick.
  // fromPlot/toPlot are indices into the plots array.
  pipes: { fromPlot: number; toPlot: number }[] = []
  // Honses in the world. Position is the visual center; sprite/collision/rope
  // hitboxes derive from this. Stationary for now — movement comes later.
  honses: Honse[] = []
  coyotes: Coyote[] = []
  bandits: Bandit[] = []
  // Dead coyotes left lying in the world as carcasses. Inert (no AI, no damage,
  // not targetable). Later: vultures clean these up, then they're removed.
  carcasses: { x: number; y: number }[] = []
  // Index into `honses` of the honse the player is currently riding, or null.
  // While set, the honse's AI is suppressed and player input moves the honse;
  // the player sprite is locked to the honse position each frame.
  mounted: number | null = null
  inventory: (ItemStack | null)[] = Array.from({ length: INVENTORY_SIZE }, () => null)
  // currently-selected inventory slot, set by scroll wheel
  selectedInventorySlot = 0

  // Seed for this world's procedural generation. Rolled once in init() and
  // read by generateWorld — the whole world layout is a pure function of it.
  // Stored here (rather than inline at the gen call) so it's recoverable: a
  // future menu can display it for sharing or set it before init() to replay
  // a specific world. 0 until init() runs.
  worldSeed = 0

  // The world's size and position — the single source of truth for how big
  // the world is and where its corners sit. World coordinates may go negative
  // (after growing west/north); the terrain array is always indexed from this
  // rectangle's top-left via terrainAt/setTerrainAt. growWorld() mutates these.
  worldBounds: WorldBounds = { minX: 0, minY: 0, width: INITIAL_WORLD_PX, height: INITIAL_WORLD_PX }
  // Terrain grid dimensions in tiles, derived from worldBounds / TERRAIN_TILE.
  // Separate cols (width) and rows (height) so the grid can be non-square.
  terrainCols = INITIAL_WORLD_PX / TERRAIN_TILE
  terrainRows = INITIAL_WORLD_PX / TERRAIN_TILE

  terrain: Uint8Array = new Uint8Array(this.terrainCols * this.terrainRows)

  woodCols = Math.ceil(INITIAL_WORLD_PX / WOOD_TILE)
  woodRows = Math.ceil(INITIAL_WORLD_PX / WOOD_TILE)
  wood: Uint8Array = new Uint8Array(this.woodCols * this.woodRows)



  // General store sell-grid contents — items dragged in here are sold on click.
  // Persists across closing the menu so the player can leave/return mid-trade.
  generalStoreSlots: (ItemStack | null)[] = Array.from({ length: GENERAL_STORE_SLOTS }, () => null)

  // ms timestamp when the speed buff ends. 0 = no buff active.
  // NOTE: this is a GAME-TIME stamp (state.gameTime), not Date.now(). See below.
  speedBuffEndsAt = 0
  // Bonus amount granted by the currently-active buff.
  speedBuffAmount = 0

  // ---- pausable game clock ----
  // Accumulated unpaused gameplay time in ms. Advanced once per frame at the
  // top of Overworld.update (the only always-running update loop — it keeps
  // ticking with its camera hidden while an interior scene runs on top), and
  // only while !paused. This is the single source of truth for "how much
  // gameplay time has elapsed" and the clock ALL gameplay timers key off:
  // food buff, sapling growth, crop growth, producer/workshop/pipe ticks,
  // chop cooldown, pickup delay, honse idle wander. Cosmetic timers (drop
  // bob, sprite facing) stay on Date.now()/scene time. Starts at 0; reset in
  // init(). Do NOT compare a gameTime value against a Date.now() value.
  gameTime = 0
  // When true, gameTime stops advancing and every gameplay timer freezes.
  paused = false

  // True while the player is present in the overworld; false while inside an
  // interior. Written only by the interior enter/exit paths. Every enemy system
  // reads this and freezes (no AI, no damage) when it's false, so enemies can't
  // act against the absent player. New enemy types must respect it.
  playerInWorld = true

  // Set to true the first time rope is crafted. Unlocks the rope listing in
  // the Tool Shop — the player must discover the recipe before they can buy.
  hasCraftedRope = false
  // Set to true the first time hemp is harvested from a field. Triggers honse
  // spawns in the overworld.
  hasHarvestedHemp = false
  // Set to true the first time a post is crafted. Unlocks the post listing
  // in the Tool Shop.
  hasCraftedPost = false
  // Set to true the first time a bag is crafted. Unlocks the bag listing
  // in the Tool Shop.
  hasCraftedBag = false
  hasPipeUnlock = false

  // ---- developer overrides ----
  // Multiplier on production tick speed. 1 = normal, 2 = twice as fast.
  // Applied inside getEffectiveTickMs. Set via window.speed() in devtools.
  timeMultiplier = 1
  // If set, overrides the default player movement speed. null = use default.
  // Set via window.playerSpeed() in devtools.
  playerSpeedOverride: number | null = null

  // Convenience: true when the player has the shovel selected in the hotbar.
  // Used by overworld click handlers to disable normal clicks (gold farming,
  // opening the build menu) so a shovel-click only triggers digging.
  isShovelSelected(): boolean {
    const s = this.inventory[this.selectedInventorySlot]
    return s !== null && s.type === 'shovel'
  }

  // Returns the ItemDef of the scroll-selected hotbar item if it's an active
  // tool (shovel, rope, axe, pickaxe, etc.), else null. The CursorController
  // uses this to swap the cursor to the tool's sprite in the overworld.
  getSelectedTool(): ItemDef | null {
    const s = this.inventory[this.selectedInventorySlot]
    if (!s) return null
    const def = ITEMS[s.type]
    return def.activeTool ? def : null
  }

  // Returns the bag ItemStacks in the player's inventory, in slot order.
  // Each bag carries its own contents array; this is the access point.
  getBags(): ItemStack[] {
    const out: ItemStack[] = []
    for (const s of this.inventory) {
      if (s !== null && isBag(s.type)) out.push(s)
    }
    return out
  }

  // True when the player has at least one bag in inventory.
  hasBag(): boolean {
    return this.inventory.some(s => s !== null && isBag(s.type))
  }

  // Count of bags currently in inventory. Used to gate picking up a third bag.
  bagCount(): number {
    let n = 0
    for (const s of this.inventory) if (s !== null && isBag(s.type)) n++
    return n
  }

  // Read the terrain type at a world-pixel position. Out-of-bounds reads as Salt.
  terrainAt(x: number, y: number): Terrain {
    const c = Math.floor((x - this.worldBounds.minX) / TERRAIN_TILE)
    const r = Math.floor((y - this.worldBounds.minY) / TERRAIN_TILE)
    if (c < 0 || r < 0 || c >= this.terrainCols || r >= this.terrainRows) return Terrain.Salt
    return this.terrain[r * this.terrainCols + c] as Terrain
  }

  // Write the terrain type at a world-pixel position. Out-of-bounds is a no-op.
  setTerrainAt(x: number, y: number, t: Terrain) {
    const c = Math.floor((x - this.worldBounds.minX) / TERRAIN_TILE)
    const r = Math.floor((y - this.worldBounds.minY) / TERRAIN_TILE)
    if (c < 0 || r < 0 || c >= this.terrainCols || r >= this.terrainRows) return
    this.terrain[r * this.terrainCols + c] = t
  }

  woodAt(x: number, y: number): number {
    const c = Math.floor((x - this.worldBounds.minX) / WOOD_TILE)
    const r = Math.floor((y - this.worldBounds.minY) / WOOD_TILE)
    if (c < 0 || r < 0 || c >= this.woodCols || r >= this.woodRows) return 0
    return this.wood[r * this.woodCols + c]
  }

  setWoodAt(x: number, y: number, v: number) {
    const c = Math.floor((x - this.worldBounds.minX) / WOOD_TILE)
    const r = Math.floor((y - this.worldBounds.minY) / WOOD_TILE)
    if (c < 0 || r < 0 || c >= this.woodCols || r >= this.woodRows) return
    this.wood[r * this.woodCols + c] = v
  }

  init(plotCount: number) {
    this.gold = 2000
    this.health = MAX_HEALTH
    // Roll this world's seed. generateWorld reads state.worldSeed, so the
    // whole layout derives from this one number. Random per new game today;
    // a future menu can set worldSeed before calling init() to replay a world.
    this.worldSeed = Math.floor(Math.random() * 1e9)
    // Reset the pausable game clock for the new game.
    this.gameTime = 0
    this.paused = false
    this.playerInWorld = true
    this.plots = Array.from({ length: plotCount }, () => ({
      built: 'empty' as BuildingType,
      level: 1,
      lastTickAt: 0,
      lastItemTickAt: 0,
      output: null
    }))
    // seed the fixed world buildings — these are hardcoded, not procedurally placed
    this.worldStructures = [
      { type: 'shop', x: 2400, y: 504, townId: 'northern_town' },
      { type: 'church', x: 2330, y: 504, townId: 'northern_town' },
      { type: 'general_store', x: 2700, y: 2304, townId: null },
      { type: 'land_office', x: 3030, y: 204, townId: 'northern_town' },
      { type: 'nursery', x: 3100, y: 204, townId: 'northern_town' },
      { type: 'tanner', x: 3235, y: 355, townId: 'northern_town' },
      { type: 'gunsmith', x: 3170, y: 204, townId: 'northern_town' },
    ]
    this.discoveredTowns = new Set()
    this.unlockedBuildings = new Set(['mill', 'well', 'workshop'])
    this.dugSpots = []
    this.buriedItems = []
    this.buriedGems = []
    this.buriedStacks = []
    this.walkableInteriors = {}
    this.walkableInteriorCrates = {}
    this.revealedItems = []
    this.droppedItems = []
    this.plantedTrees = []
    this.worldBounds = { minX: 0, minY: 0, width: INITIAL_WORLD_PX, height: INITIAL_WORLD_PX }
    this.terrainCols = INITIAL_WORLD_PX / TERRAIN_TILE
    this.terrainRows = INITIAL_WORLD_PX / TERRAIN_TILE
    this.terrain = new Uint8Array(this.terrainCols * this.terrainRows)
    this.woodCols = Math.ceil(INITIAL_WORLD_PX / WOOD_TILE)
    this.woodRows = Math.ceil(INITIAL_WORLD_PX / WOOD_TILE)
    this.wood = new Uint8Array(this.woodCols * this.woodRows)
    this.placedPosts = []
    this.placedGates = []
    this.placedCrates = []
    this.worldWells = []
    this.pipes = []
    // honses spawn dynamically when twine is first crafted — start empty
    this.honses = []
    this.mounted = null
    this.generalStoreSlots = Array.from({ length: GENERAL_STORE_SLOTS }, () => null)
    //this.inventory[0] = { type: 'gold_lockbox', count: 1 }
    this.inventory[2] = { type: 'colt', count: 1 }
    //this.inventory[3] = { type: 'shovel', count: 1 }
    this.inventory[1] = { type: 'axe', count: 1 }
    this.inventory[4] = { type: 'colt_ammo', count: 100 }
  }

  // Try to put `stack` into a specific inventory slot. Does NOT mutate `stack`.
  // Returns the number of items accepted. Same-type merges up to maxStack;
  // empty slot takes the whole stack (clamped to maxStack). Bags are rejected
  // if the player already has MAX_BAGS in inventory.
  inventoryOffer(slotIndex: number, stack: Readonly<ItemStack>): number {
    const existing = this.inventory[slotIndex]
    const cap = ITEMS[stack.type].maxStack
    if (!existing) {
      const moved = Math.min(cap, stack.count)
      const placed: ItemStack = { type: stack.type, count: moved }
      if (isBag(stack.type)) {
        placed.contents = stack.contents ?? createBagContents(stack.type)
      }
      this.inventory[slotIndex] = placed
      return moved
    }
    if (existing.type !== stack.type) return 0
    if (isBag(stack.type)) return 0   // bags don't stack
    const room = cap - existing.count
    if (room <= 0) return 0
    const moved = Math.min(room, stack.count)
    existing.count += moved
    return moved
  }

  // Try to add an item stack anywhere the player has room. Priority:
  // 1) top up matching stacks (hotbar then bags) — keeps like items together
  // 2) place into empty hotbar slots
  // 3) place into empty bag slots
  // Returns the total amount added. Bag items can nest into other bags.
  inventoryAddAnywhere(stack: ItemStack): number {
    const cap = ITEMS[stack.type].maxStack
    let added = 0

    // PHASE 1 — top up matching hotbar stacks
    for (const s of this.inventory) {
      if (stack.count <= 0) break
      if (s && s.type === stack.type && s.count < cap) {
        const room = cap - s.count
        const moved = Math.min(room, stack.count)
        s.count += moved
        stack.count -= moved
        added += moved
      }
    }
    // PHASE 2 — top up matching bag stacks
    if (stack.count > 0) {
      for (const bag of this.getBags()) {
        if (stack.count <= 0) break
        const contents = bag.contents!
        for (const s of contents) {
          if (stack.count <= 0) break
          if (s && s.type === stack.type && s.count < cap) {
            const room = cap - s.count
            const moved = Math.min(room, stack.count)
            s.count += moved
            stack.count -= moved
            added += moved
          }
        }
      }
    }
    // PHASE 3 — place into empty hotbar slots
    for (let i = 0; i < this.inventory.length; i++) {
      if (stack.count <= 0) break
      if (this.inventory[i] === null) {
        if (isBag(stack.type) && this.bagCount() >= MAX_BAGS) break
        const moved = Math.min(cap, stack.count)
        const placed: ItemStack = { type: stack.type, count: moved }
        if (isBag(stack.type)) {
          placed.contents = stack.contents ?? createBagContents(stack.type)
        }
        // Lockboxes carry their own contents + unlocked state on the instance,
        // so a picked-up box stays the same box when re-placed.
        if (stack.type === 'silver_lockbox' || stack.type === 'gold_lockbox') {
          if (stack.contents) placed.contents = stack.contents
          placed.unlocked = stack.unlocked
        }
        this.inventory[i] = placed
        stack.count -= moved
        added += moved
      }
    }
    // PHASE 4 — place into empty bag slots
    if (stack.count > 0) {
      for (const bag of this.getBags()) {
        if (stack.count <= 0) break
        const contents = bag.contents!
        for (let i = 0; i < contents.length; i++) {
          if (stack.count <= 0) break
          if (contents[i] === null) {
            const moved = Math.min(cap, stack.count)
            contents[i] = { type: stack.type, count: moved }
            stack.count -= moved
            added += moved
          }
        }
      }
    }
    return added
  }

  // Read-only twin of inventoryAddAnywhere: returns how many of `stack` would
  // be accepted right now, without moving anything. Mirrors the same four
  // phases (top-up hotbar, top-up bags, empty hotbar, empty bags) so the
  // answer always matches what an actual add would do. Used by the loot magnet
  // to decide whether a drop is collectable before dragging it to the player.
  roomFor(stack: Readonly<ItemStack>): number {
    const cap = ITEMS[stack.type].maxStack
    let remaining = stack.count
    let room = 0

    // PHASE 1 — matching hotbar stacks
    for (const s of this.inventory) {
      if (remaining <= 0) break
      if (s && s.type === stack.type && s.count < cap) {
        const moved = Math.min(cap - s.count, remaining)
        room += moved
        remaining -= moved
      }
    }
    // PHASE 2 — matching bag stacks
    if (remaining > 0) {
      for (const bag of this.getBags()) {
        if (remaining <= 0) break
        for (const s of bag.contents!) {
          if (remaining <= 0) break
          if (s && s.type === stack.type && s.count < cap) {
            const moved = Math.min(cap - s.count, remaining)
            room += moved
            remaining -= moved
          }
        }
      }
    }
    // PHASE 3 — empty hotbar slots
    for (const s of this.inventory) {
      if (remaining <= 0) break
      if (s === null) {
        if (isBag(stack.type) && this.bagCount() >= MAX_BAGS) break
        const moved = Math.min(cap, remaining)
        room += moved
        remaining -= moved
      }
    }
    // PHASE 4 — empty bag slots
    if (remaining > 0) {
      for (const bag of this.getBags()) {
        if (remaining <= 0) break
        for (const s of bag.contents!) {
          if (remaining <= 0) break
          if (s === null) {
            const moved = Math.min(cap, remaining)
            room += moved
            remaining -= moved
          }
        }
      }
    }
    return room
  }

  addGold(n: number, registry: Phaser.Data.DataManager) {
    this.gold = Math.min(MAX_GOLD, this.gold + n)
    registry.set('gold', this.gold)
  }

  changeHealth(n: number, registry: Phaser.Data.DataManager) {
    this.health = Math.max(0, Math.min(MAX_HEALTH, this.health + n))
    registry.set('playerHealth', this.health)
    return this.health
  }

  healToFull(registry: Phaser.Data.DataManager) {
    this.health = MAX_HEALTH
    registry.set('playerHealth', this.health)
    return this.health
  }

  // Total count of an item type across the hotbar inventory.
  countItem(type: ItemType): number {
    let n = 0
    for (const s of this.inventory) if (s && s.type === type) n += s.count
    return n
  }

  // Remove up to `want` of an item type from the inventory, emptying stacks as it
  // goes. Returns how many were actually removed (may be less if you had fewer).
  consumeItem(type: ItemType, want: number): number {
    let removed = 0
    for (let i = 0; i < this.inventory.length && removed < want; i++) {
      const s = this.inventory[i]
      if (!s || s.type !== type) continue
      const take = Math.min(s.count, want - removed)
      s.count -= take
      removed += take
      if (s.count <= 0) this.inventory[i] = null
    }
    return removed
  }

  trySpend(n: number, registry: Phaser.Data.DataManager): boolean {
    if (this.gold < n) return false
    this.gold -= n
    registry.set('gold', this.gold)
    return true
  }

  placeBuilding(plotIndex: number, type: BuiltType, registry: Phaser.Data.DataManager): boolean {
    const plot = this.plots[plotIndex]
    if (!plot || plot.built !== 'empty') return false
    const def = BUILDINGS[type]
    if (!this.trySpend(def.cost, registry)) return false
    plot.built = type
    // Both timers stamp from the game clock — one clock for all gameplay state.
    // lastItemTickAt drives the producer/workshop tick in Overworld.update,
    // which compares against state.gameTime, so it must be game-time or a fresh
    // plot would never tick. lastTickAt ("last gold tick") currently has no
    // reader, but it stays on gameTime too: no gameplay stamp is ever wall-clock.
    plot.lastItemTickAt = this.gameTime
    plot.lastTickAt = this.gameTime
    plot.output = null
    if (type === 'workshop') {
      plot.craftInputs = [null, null]
      plot.craftInputSources = [null, null]
      plot.craftOutput = null
      plot.autoCraft = false   // starts as a hand table; player opts into auto
    }
    if (type === 'field') {
      plot.fieldCells = makeEmptyFieldCells()
    }
    if (type === 'storage') {
      plot.storageContents = Array.from({ length: getStorageSlotCount(1) }, () => null)
    }
    return true
  }
  clearPlot(plotIndex: number): ItemStack[] {
    const plot = this.plots[plotIndex]
    if (!plot || plot.built === 'empty') return []

    const spill: ItemStack[] = []
    if (plot.output) spill.push(plot.output)
    if (plot.craftInputs) for (const s of plot.craftInputs) if (s) spill.push(s)
    if (plot.craftOutput) spill.push(plot.craftOutput)
    if (plot.storageContents) for (const s of plot.storageContents) if (s) spill.push(s)

    plot.built = 'empty'
    plot.level = 1
    plot.lastTickAt = 0
    plot.lastItemTickAt = 0
    plot.output = null
    plot.craftInputs = undefined
    plot.craftOutput = undefined
    plot.autoCraft = undefined
    plot.fieldCells = undefined
    plot.storageContents = undefined

    return spill
  }

  // Grow the world outward in one direction by `amount` pixels (snapped up to a
  // whole number of tiles so the grid stays aligned). Extends worldBounds, then
  // allocates a larger terrain grid and copies every existing tile into its new
  // position — so nothing already in the world moves in WORLD space; only the
  // array indices shift. New tiles default to Salt (0); the new region is left
  // bare for a caller to fill. Returns the pixels actually added (a multiple of
  // TERRAIN_TILE), or 0 if amount was non-positive.
  growWorld(direction: 'west' | 'east' | 'north' | 'south', amount: number): number {
    if (amount <= 0) return 0
    const addTiles = Math.ceil(amount / TERRAIN_TILE)
    const addPx = addTiles * TERRAIN_TILE
    const oldCols = this.terrainCols
    const oldRows = this.terrainRows
    const old = this.terrain

    let newCols = oldCols
    let newRows = oldRows
    let colShift = 0   // columns existing tiles move right (west grow)
    let rowShift = 0   // rows existing tiles move down (north grow)

    switch (direction) {
      case 'east':
        newCols = oldCols + addTiles
        this.worldBounds.width += addPx
        break
      case 'west':
        newCols = oldCols + addTiles
        colShift = addTiles
        this.worldBounds.minX -= addPx
        this.worldBounds.width += addPx
        break
      case 'south':
        newRows = oldRows + addTiles
        this.worldBounds.height += addPx
        break
      case 'north':
        newRows = oldRows + addTiles
        rowShift = addTiles
        this.worldBounds.minY -= addPx
        this.worldBounds.height += addPx
        break
    }

    // Allocate the bigger grid and copy each old row into its shifted slot. The
    // stride changes when growing east/west (newCols !== oldCols), so the copy
    // is row-by-row rather than one contiguous block.
    const next = new Uint8Array(newCols * newRows)
    for (let r = 0; r < oldRows; r++) {
      const srcStart = r * oldCols
      const destStart = (r + rowShift) * newCols + colShift
      next.set(old.subarray(srcStart, srcStart + oldCols), destStart)
    }

    const addWoodTiles = Math.ceil(addPx / WOOD_TILE)
    const oldWoodCols = this.woodCols
    const oldWoodRows = this.woodRows
    let newWoodCols = oldWoodCols
    let newWoodRows = oldWoodRows
    let woodColShift = 0
    let woodRowShift = 0
    switch (direction) {
      case 'east':  newWoodCols = oldWoodCols + addWoodTiles; break
      case 'west':  newWoodCols = oldWoodCols + addWoodTiles; woodColShift = addWoodTiles; break
      case 'south': newWoodRows = oldWoodRows + addWoodTiles; break
      case 'north': newWoodRows = oldWoodRows + addWoodTiles; woodRowShift = addWoodTiles; break
    }
    const nextWood = new Uint8Array(newWoodCols * newWoodRows)
    for (let r = 0; r < oldWoodRows; r++) {
      const srcStart = r * oldWoodCols
      const destStart = (r + woodRowShift) * newWoodCols + woodColShift
      nextWood.set(this.wood.subarray(srcStart, srcStart + oldWoodCols), destStart)
    }

    this.terrain = next
    this.wood = nextWood
    this.terrainCols = newCols
    this.terrainRows = newRows
    this.woodCols = newWoodCols
    this.woodRows = newWoodRows
    return addPx
  }
}

export const state = new GameState()

