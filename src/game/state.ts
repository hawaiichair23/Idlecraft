// Single source of game state. Scenes read this and mutate via the methods.
// Updates emit events on Phaser's global registry so the UI can react.

import Phaser from 'phaser'
import type { ItemStack, ItemType, ItemDef } from '../items/types'
import { ITEMS, cloneStack, SMELT_RECIPES, SMELT_OUTPUTS, FUEL_BURN_MS } from '../items/types'
import type { SmeltingState, SmeltingConfig } from './smelting'
import type { WorldStructure } from '../world/structures'
import type { DecorType } from '../world/decor'
import type { Honse } from '../world/honse'
import type { Coyote } from '../world/coyote'
import type { Bandit } from '../world/bandit'
import type { TroughKind } from '../world/troughs'
import { TROUGH_PER_TILE_CAP, TROUGH_FILL_LEVELS } from '../world/troughs'
import { PLACES } from '../world/places'

export type BuildingType = 'empty' | 'mill' | 'workshop' | 'well' | 'field' | 'storage' | 'smelter' | 'blast_furnace'
export type BuiltType = Exclude<BuildingType, 'empty'>

export const MAX_GOLD = 999_999
export const BASE_MAX_HEALTH = 3

// Terrain grid. One byte per TERRAIN_TILE-square cell covering the world, the
// ground-truth map every system reads and writes: gen seeds it, the renderer
// draws from it, planting reads it, fertilizing writes it. Salt=0 so a zeroed
// array is an all-salt basin by default; other terrains are written in.
export const Terrain = { Salt: 0, Grass: 1, Water: 2, CrackedDirt: 3, PathDirt: 4, TilledDirt: 5 } as const
export type Terrain = (typeof Terrain)[keyof typeof Terrain]
export const TERRAIN_TILE = 16
export const WOOD_TILE = 24
// Initial world size in pixels. This is the ONLY place the starting size is
// written — worldBounds and the terrain grid derive from it, and growWorld()
// resizes them at runtime.
const INITIAL_WORLD_PX = 576 * 8

export const PLAYER_BASE_SPEED = 11135

export interface WorldBounds {
  minX: number
  minY: number
  width: number
  height: number
}

// General store sell-grid: 6 columns × 3 rows.
export const GENERAL_STORE_SLOTS = 18

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
  // Smelter-class plots (smelter, blast furnace, future smelters). Lazy-init
  // on first tick. Shape is identical regardless of which smelter type.
  smelt?: SmeltingState
}

export interface BuildingDef {
  name: string
  description: string
  cost: number
  tickMs: number
  goldPerTick: number
  producesItem?: ItemType    // mill: 'flour', well: 'water', workshop: undefined
  itemTickMs?: number        // how often it produces 1 of producesItem
  // Smelter-class plots fill this in. Anywhere the engine asks "is this a
  // smelter and how does it behave?" it reads this single field.
  smelting?: SmeltingConfig
}

// Recipe table for the blast furnace. Iron bar -> steel, coal -> coke. Coke
// is the only accepted fuel.
const BLAST_RECIPES: Record<string, ItemType> = {
  iron_bar: 'steel',
  coal: 'coke',
}
const BLAST_OUTPUTS: Set<ItemType> = new Set(Object.values(BLAST_RECIPES))
const COKE_BURN_MS = 30000

const SMELTER_SMELTING: SmeltingConfig = {
  recipes: SMELT_RECIPES,
  outputs: SMELT_OUTPUTS,
  burnMs: (type: string) => FUEL_BURN_MS[type],
  isFuel: (type: string) => type in FUEL_BURN_MS,
  cycleDurationMs: 5000,
}

const BLAST_SMELTING: SmeltingConfig = {
  recipes: BLAST_RECIPES,
  outputs: BLAST_OUTPUTS,
  burnMs: (type: string) => (type === 'coke' ? COKE_BURN_MS : undefined),
  isFuel: (type: string) => type === 'coke',
  cycleDurationMs: 8000,
}

export const BUILDINGS: Record<BuiltType, BuildingDef> = {
  mill:    { name: 'Mill',    description: 'Grinds grains into flour.',     cost: 15, tickMs: 4000, goldPerTick: 0, producesItem: 'flour', itemTickMs: 8000 },
  well:    { name: 'Well',    description: 'Extracts groundwater.',     cost: 30, tickMs: 8000, goldPerTick: 0, producesItem: 'water', itemTickMs: 16000 },
  workshop: { name: 'Workshop', description: 'Crafts materials into products.', cost: 50, tickMs: 6000, goldPerTick: 0 },
  field:   { name: 'Field',   description: 'Plant and harvest crops.', cost: 100, tickMs: 0, goldPerTick: 0 },
  storage: { name: 'Storage', description: 'Stores items.', cost: 100, tickMs: 0, goldPerTick: 0 },
  smelter: { name: 'Smelter', description: 'Smelts ores into bars.', cost: 100, tickMs: 0, goldPerTick: 0, smelting: SMELTER_SMELTING },
  blast_furnace: { name: 'Blast Furnace', description: 'Refines iron into steel using coke.', cost: 250, tickMs: 0, goldPerTick: 0, smelting: BLAST_SMELTING },
}

export const BUILDING_LIST: BuiltType[] = ['mill', 'well', 'workshop', 'field', 'storage', 'smelter', 'blast_furnace']

// Upgrade cost: 25, 50, 100, 200, …
export function getUpgradeCost(level: number, buildingType?: BuildingType): number {
  if (buildingType === 'workshop') return 500
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

// Per-slot cap for an output slot on an upgradable plot. Stack-limit-1 items
// (tools, axes) still respect their own maxStack so they can't be stacked.
export function getPlotSlotCap(plot: PlotState, itemType: ItemType): number {
  return Math.min(getStorageCap(plot.level), ITEMS[itemType].maxStack)
}

// Storage building slot count by level: 12, 24, 36, 48, …  (+12 per level = two extra rows)
export function getStorageSlotCount(level: number): number {
  return 12 * level
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
  maxHealth = BASE_MAX_HEALTH
  health = BASE_MAX_HEALTH
  plots: PlotState[] = []
  // Fixed world buildings (shop, church, etc.) — not owned, not bought, no ticks.
  worldStructures: WorldStructure[] = []
  // Fixed authored solid decor (barrels, etc.) — sprite/scale/hitbox resolve from
  // the DECOR/ITEMS catalogs; placed with collision via placeNonEnterable. The
  // spawn-area sibling of a site template's solidDecor.
  worldSolidDecor: { type: DecorType; x: number; y: number }[] = []
  // Fixed authored visual decor (grave crosses, etc.) — drawn with no collision,
  // low depth so the player walks in front. The authored-world sibling of a site
  // template's visual `decor` array.
  worldDecor: { sprite: string; x: number; y: number; scale: number; depth?: number }[] = []
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
  // Invisible buried lockboxes, placed by world gen. The contents inside are
  // pre-rolled at gen time (seeded) so the same world always yields the same
  // prizes from the same box. Slots 0-2 are tools (up to 3, no repeats, null
  // for empty); slots 3+ are side loot (bars/gems/ammo/etc, null for empty).
  // Consumed on dig.
  buriedLockboxes: {
    x: number
    y: number
    lockboxType: 'silver_lockbox' | 'gold_lockbox'
    tools: (string | null)[]
    side: ({ type: string; count: number } | null)[]
  }[] = []
  // Invisible buried keys, placed by world gen at the same density and tier
  // split as lockboxes. Dug up, drops as the corresponding key item.
  buriedKeys: { x: number; y: number; keyType: 'silver_key' | 'gold_key' }[] = []
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
  // Scattered grass bushes (seeded worldgen). Visual-only, no collision; ride the
  // same camera-cull lifecycle as trees. Data persists here; sprites are transient.
  scatteredBushes: { x: number; y: number }[] = []
  // Hitching posts placed by the player. Each entry is a sprite in the world
  // and an obstacle in collision. `species` chooses which sprite to render —
  // 'post' (weathered cottonwood gray) or 'cedar_post' (warm cedar brown).
  // Mechanically identical otherwise.
  placedPosts: { x: number; y: number; species?: 'post' | 'cedar_post' | 'iron_post' | 'wood_wall' }[] = []
  // Troughs placed by the player (water and future palette-swapped kinds).
  // Position + kind; grid-snapped. Kind is the held item's type at place time.
  placedTroughs: { x: number; y: number; kind: TroughKind; fill: number; displayLevel: number }[] = []
  placedGates: { x: number; y: number; vertical: boolean; open: boolean; swingX: number; swingY: number }[] = []
  // Containers placed by the player (crates and chests). Each is a sprite +
  // obstacle in the world (like a post) plus its own storage grid in `contents`.
  // `item` is the container's item type ('crate' or 'chest'), driving its sprite,
  // footprint, and slot count. Contents persist for the play session.
  placedCrates: { x: number; y: number; item: ItemType; contents: (ItemStack | null)[]; unlocked?: boolean; interior?: string }[] = []
  lockboxRollSeq = 0
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
  nextHerdId: number = 1
  coyotes: Coyote[] = []
  bandits: Bandit[] = []
  // Dead coyotes left lying in the world as carcasses. Inert (no AI, no damage,
  // not targetable). Later: vultures clean these up, then they're removed.
  carcasses: { x: number; y: number }[] = []
  // Dead bandits left in the world. Distinct from coyote carcasses because these
  // are meant to be looted/carried for bounty later — each needs a stable id and a
  // carried flag so a specific body can be picked up, hauled, and turned in.
  banditBodies: { id: number; x: number; y: number; carried: boolean; contents: (ItemStack | null)[]; name: string; bounty: number }[] = []
  nextBanditBodyId = 1
  carriedBandit: { name: string; bounty: number; contents: (ItemStack | null)[] } | null = null
  honseBanditRiders: Map<number, { name: string; bounty: number; contents: (ItemStack | null)[] }> = new Map()
  npcs: { x: number; y: number; name: string; lines: { text: string; speaker?: string; options?: { label: string; act: () => void }[] }[] }[] = []
  // Index into `honses` of the honse the player is currently riding, or null.
  // While set, the honse's AI is suppressed and player input moves the honse;
  // the player sprite is locked to the honse position each frame.
  mounted: number | null = null
  inventory: (ItemStack | null)[] = Array.from({ length: INVENTORY_SIZE }, () => null)
  // currently-selected inventory slot, set by scroll wheel
  selectedInventorySlot = 0

  // Gun magazine state — shared across every scene so the same clip persists
  // whether you're in the overworld or an interior. The GunController operates
  // on these fields rather than holding its own copy.
  gunAmmo = 0
  lastFireAt = 0
  gunFullReloadUntil = 0
  lastGunSlot = -1
  pendingReloadAmount = 0

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



  // General store sell-grid contents, keyed per store instance (by world
  // structure index) so each town's store keeps its own counter. Persists
  // across closing the menu so the player can leave/return mid-trade.
  generalStoreSlots = new Map<number, (ItemStack | null)[]>()

  getGeneralStoreSlots(key: number): (ItemStack | null)[] {
    let slots = this.generalStoreSlots.get(key)
    if (!slots) {
      slots = Array.from({ length: GENERAL_STORE_SLOTS }, () => null)
      this.generalStoreSlots.set(key, slots)
    }
    return slots
  }


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
    return s !== null && (ITEMS[s.type]?.digging ?? 0) > 0
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

  // Plots start empty and are created by the scene via createPlotAt — the
  // starter farm grid plus any town/site plots — so the count isn't fixed here
  // and grows as the map expands.
  init() {
    this.gold = 2000
    this.maxHealth = BASE_MAX_HEALTH
    this.health = this.maxHealth
    // Roll this world's seed. generateWorld reads state.worldSeed, so the
    // whole layout derives from this one number. Random per new game today;
    // a future menu can set worldSeed before calling init() to replay a world.
    this.worldSeed = Math.floor(Math.random() * 1e9)
    // Reset the pausable game clock for the new game.
    this.gameTime = 0
    this.paused = false
    this.playerInWorld = true
    this.plots = []
    this.worldStructures = []
    this.worldSolidDecor = []
    this.worldDecor = []
    this.discoveredTowns = new Set()
    this.unlockedBuildings = new Set(['mill', 'well', 'workshop'])
    this.dugSpots = []
    this.buriedItems = []
    this.buriedGems = []
    this.buriedLockboxes = []
    this.buriedKeys = []
    this.buriedStacks = []
    this.walkableInteriors = {}
    this.walkableInteriorCrates = {}
    this.revealedItems = []
    this.droppedItems = []
    this.plantedTrees = []
    this.scatteredBushes = []
    this.worldBounds = { minX: 0, minY: 0, width: INITIAL_WORLD_PX, height: INITIAL_WORLD_PX }
    this.terrainCols = INITIAL_WORLD_PX / TERRAIN_TILE
    this.terrainRows = INITIAL_WORLD_PX / TERRAIN_TILE
    this.terrain = new Uint8Array(this.terrainCols * this.terrainRows)
    this.woodCols = Math.ceil(INITIAL_WORLD_PX / WOOD_TILE)
    this.woodRows = Math.ceil(INITIAL_WORLD_PX / WOOD_TILE)
    this.wood = new Uint8Array(this.woodCols * this.woodRows)
    this.placedPosts = []
    this.placedTroughs = []
    this.placedGates = []
    this.placedCrates = []
    this.lockboxRollSeq = 0
    this.worldWells = []
    this.pipes = []
    this.buildAuthoredPlaces()
    // honses spawn dynamically when twine is first crafted — start empty
    this.honses = []
    this.nextHerdId = 1
    this.mounted = null
    this.generalStoreSlots = new Map()
    //this.inventory[0] = { type: 'bush', count: 64 }
    this.inventory[1] = { type: 'tempered_axe', count: 1 }
    //this.inventory[2] = { type: 'gold_lockbox', count: 5 }
    this.inventory[3] = { type: 'post', count: 964 }
    this.inventory[4] = { type: 'fence_gate', count: 96 }
  }

  // Fan the state-backed authored content (structures, troughs, posts, solid +
  // visual decor) out of the single PLACES source into their arrays. Honses and
  // gates are scene-built in Overworld since they need scene-only helpers.
  private buildAuthoredPlaces() {
    for (const place of Object.values(PLACES)) {
      for (const s of place.structures) this.worldStructures.push({ type: s.type, x: s.x, y: s.y, flipX: s.flipX, sprite: s.sprite, interior: s.interior })
      for (const t of place.troughs) this.placedTroughs.push({ x: t.x, y: t.y, kind: t.kind, fill: TROUGH_PER_TILE_CAP[t.kind], displayLevel: TROUGH_FILL_LEVELS })
      for (const p of place.posts) this.placedPosts.push({ x: p.x, y: p.y, species: p.species })
      for (const d of place.solidDecor) this.worldSolidDecor.push({ type: d.type, x: d.x, y: d.y })
      for (const d of place.decor) this.worldDecor.push({ sprite: d.sprite, x: d.x, y: d.y, scale: d.scale, depth: d.depth })
    }
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
      const placed = cloneStack(stack as ItemStack, moved)
      if (isBag(stack.type) && !placed.contents) {
        placed.contents = createBagContents(stack.type)
      }
      this.inventory[slotIndex] = placed
      return moved
    }
    if (existing.type !== stack.type) return 0
    if (existing.rarity !== stack.rarity) return 0
    if (isBag(stack.type)) return 0
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
  inventoryAddAnywhere(stack: ItemStack, opts: { dryRun?: boolean } = {}): number {
    const cap = ITEMS[stack.type].maxStack
    const dryRun = opts.dryRun === true
    let added = 0

    const matches = (s: ItemStack | null) =>
      s !== null && s.type === stack.type && s.rarity === stack.rarity && s.count < cap

    const mergeInto = (s: ItemStack) => {
      const room = cap - s.count
      const moved = Math.min(room, stack.count)
      if (!dryRun) s.count += moved
      stack.count -= moved
      added += moved
    }

    const placeIntoEmpty = (write: (placed: ItemStack) => void) => {
      const moved = Math.min(cap, stack.count)
      if (!dryRun) {
        const placed = cloneStack(stack, moved)
        if (isBag(stack.type) && !placed.contents) {
          placed.contents = createBagContents(stack.type)
        }
        write(placed)
      }
      stack.count -= moved
      added += moved
      return true
    }

    for (const s of this.inventory) {
      if (stack.count <= 0) break
      if (matches(s)) mergeInto(s!)
    }
    for (const bag of this.getBags()) {
      if (stack.count <= 0) break
      for (const s of bag.contents!) {
        if (stack.count <= 0) break
        if (matches(s)) mergeInto(s!)
      }
    }
    for (let i = 0; i < this.inventory.length; i++) {
      if (stack.count <= 0) break
      if (this.inventory[i] === null) {
        if (!placeIntoEmpty(p => { this.inventory[i] = p })) break
      }
    }
    for (const bag of this.getBags()) {
      if (stack.count <= 0) break
      const contents = bag.contents!
      for (let i = 0; i < contents.length; i++) {
        if (stack.count <= 0) break
        if (contents[i] === null) {
          if (!placeIntoEmpty(p => { contents[i] = p })) break
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
    return this.inventoryAddAnywhere(cloneStack(stack as ItemStack), { dryRun: true })
  }

  addGold(n: number, registry: Phaser.Data.DataManager) {
    this.gold = Math.min(MAX_GOLD, this.gold + n)
    registry.set('gold', this.gold)
  }

  changeHealth(n: number, registry: Phaser.Data.DataManager) {
    this.health = Math.max(0, Math.min(this.maxHealth, this.health + n))
    registry.set('playerHealth', this.health)
    return this.health
  }

  healToFull(registry: Phaser.Data.DataManager) {
    this.health = this.maxHealth
    registry.set('playerHealth', this.health)
    return this.health
  }

  increaseMaxHealth(hearts: number, registry: Phaser.Data.DataManager) {
    this.maxHealth += hearts
    registry.set('playerMaxHealth', this.maxHealth)
    this.changeHealth(hearts, registry)
    return this.maxHealth
  }

  applyFoodEffects(def: ItemDef, registry: Phaser.Data.DataManager) {
    if (def.maxHeartsBonus) this.increaseMaxHealth(def.maxHeartsBonus, registry)
    if (def.healFull) this.healToFull(registry)
    else if (def.healHearts) this.changeHealth(def.healHearts, registry)
  }

  // Consume one edible from a hotbar slot and apply its effects. Returns the
  // eaten item's def (so the caller can play visuals), or null if not edible.
  eatFromSlot(slot: number, registry: Phaser.Data.DataManager): ItemDef | null {
    const stack = this.inventory[slot]
    if (!stack) return null
    const def = ITEMS[stack.type]
    if (!def.edible) return null
    stack.count -= 1
    if (stack.count <= 0) this.inventory[slot] = null
    this.applyFoodEffects(def, registry)
    registry.events.emit('inventory-changed')
    return def
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

