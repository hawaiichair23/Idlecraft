// Single source of game state. Scenes read this and mutate via the methods.
// Updates emit events on Phaser's global registry so the UI can react.

import Phaser from 'phaser'
import type { ItemStack, ItemType, ItemDef } from '../items/types'
import { ITEMS } from '../items/types'
import type { WorldStructure } from '../world/structures'
import type { Honse } from '../world/honse'

export type BuildingType = 'empty' | 'mill' | 'workshop' | 'well' | 'field' | 'storage'
export type BuiltType = Exclude<BuildingType, 'empty'>

export const MAX_GOLD = 999_999

// Terrain grid. One byte per TERRAIN_TILE-square cell covering the world, the
// ground-truth map every system reads and writes: gen seeds it, the renderer
// draws from it, planting reads it, fertilizing writes it. Salt=0 so a zeroed
// array is an all-salt basin by default; other terrains are written in.
export const Terrain = { Salt: 0, Grass: 1, Water: 2, CrackedDirt: 3 } as const
export type Terrain = (typeof Terrain)[keyof typeof Terrain]
export const TERRAIN_TILE = 16
// World is 576*8 = 4608px square (mirror of WORLD_PX in Overworld) → 288 tiles.
export const TERRAIN_COLS = (576 * 8) / TERRAIN_TILE

export const MODIFIER_SLOTS_PER_PLOT = 8

// General store sell-grid: 6 columns × 4 rows.
export const GENERAL_STORE_SLOTS = 24

// World-placed crate storage: 6 columns × 4 rows, same grid as the store.
export const CRATE_SLOTS = 24

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
  plantedAt: number   // Date.now() when planted; 0 for empty cells
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
  lastTickAt: number   // ms timestamp of the last completed gold tick
  lastItemTickAt: number  // ms timestamp of the last completed item tick (for producers)
  output: ItemStack | null   // producer output: mill→flour, well→water
  // workshop-only: 2 input slots and 1 output slot. null for non-workshop plots.
  craftInputs?: (ItemStack | null)[]
  craftOutput?: ItemStack | null
  // modifier rack — every building has one; items here will eventually affect
  // production but right now just store anything the player drops in.
  modifiers: (ItemStack | null)[]
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

export const INVENTORY_SIZE = 5
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

class GameState {
  gold = 9999
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
  // Item stacks buried by the player. Stored when a dropped item is buried
  // by a shovel-click on a dirt patch. Revealed when the spot is dug again.
  buriedStacks: { x: number; y: number; stack: ItemStack }[] = []
  // Per-walkable-interior state. Keyed by "<buildingType>:<structureIndex>"
  // (e.g. "abandoned_house:3"). Each entry is the live list of items still
  // on the floor — items get spliced out when picked up and never respawn.
  // Initialized lazily on first entry from the spawn config.
  walkableInteriors: Record<string, WalkableInteriorItemInstance[]> = {}
  // Revealed but not yet collected — sprite drawn at position, walk over to claim.
  revealedItems: { x: number; y: number; reward: number }[] = []
  // Items dropped by the player into the world — walk over them to pick up.
  droppedItems: { x: number; y: number; stack: ItemStack }[] = []
  // Trees and saplings planted by the player. Each entry persists as a sprite
  // in the world. `stage` distinguishes a walk-through sapling (diggable, no
  // collision) from a mature tree (solid trunk obstacle, felled with an axe).
  // `plantedAt` is the Date.now() stamp set when a sapling is planted; the
  // overworld grows it to mature once enough time has elapsed. Only saplings
  // carry it — mature/stump and hand-placed trees leave it undefined.
  plantedTrees: { x: number; y: number; kind: 'cottonwood'; stage: 'sapling' | 'mature' | 'stump' | 'dead'; plantedAt?: number }[] = []
  // Hitching posts placed by the player. Each entry is a sprite in the world
  // and an obstacle in collision. `species` chooses which sprite to render —
  // 'post' (weathered cottonwood gray) or 'cedar_post' (warm cedar brown).
  // Mechanically identical otherwise.
  placedPosts: { x: number; y: number; species?: 'post' | 'cedar_post' }[] = []
  // Crates placed by the player. Each is a sprite + obstacle in the world (like
  // a post) plus its own storage grid in `contents` (CRATE_SLOTS long). The
  // contents persist for the play session — open the crate to take/put items.
  placedCrates: { x: number; y: number; contents: (ItemStack | null)[] }[] = []
  // Pipe connections between plots. Each pipe links a source plot's output
  // to a destination plot's input. Items flow automatically on tick.
  // fromPlot/toPlot are indices into the plots array.
  pipes: { fromPlot: number; toPlot: number }[] = []
  // Honses in the world. Position is the visual center; sprite/collision/rope
  // hitboxes derive from this. Stationary for now — movement comes later.
  honses: Honse[] = []
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

  // Terrain grid (see Terrain/TERRAIN_TILE above). Allocated in init().
  terrain: Uint8Array = new Uint8Array(TERRAIN_COLS * TERRAIN_COLS)


  // General store sell-grid contents — items dragged in here are sold on click.
  // Persists across closing the menu so the player can leave/return mid-trade.
  generalStoreSlots: (ItemStack | null)[] = Array.from({ length: GENERAL_STORE_SLOTS }, () => null)

  // ms timestamp when the speed buff ends. 0 = no buff active.
  speedBuffEndsAt = 0
  // Bonus amount granted by the currently-active buff.
  speedBuffAmount = 0

  // NPC dialogue progression — each flag flips true the first time its line
  // is shown, and the corresponding line is never shown again.
  workshopFirstLineSeen = false
  workshopSecondLineSeen = false
  // Set to true the first time bread is crafted. Used to trigger the workshop
  // NPC's second line.
  hasMadeBread = false
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
    const c = Math.floor(x / TERRAIN_TILE)
    const r = Math.floor(y / TERRAIN_TILE)
    if (c < 0 || r < 0 || c >= TERRAIN_COLS || r >= TERRAIN_COLS) return Terrain.Salt
    return this.terrain[r * TERRAIN_COLS + c] as Terrain
  }

  // Write the terrain type at a world-pixel position. Out-of-bounds is a no-op.
  setTerrainAt(x: number, y: number, t: Terrain) {
    const c = Math.floor(x / TERRAIN_TILE)
    const r = Math.floor(y / TERRAIN_TILE)
    if (c < 0 || r < 0 || c >= TERRAIN_COLS || r >= TERRAIN_COLS) return
    this.terrain[r * TERRAIN_COLS + c] = t
  }

  init(plotCount: number) {
    this.gold = 9999
    // Roll this world's seed. generateWorld reads state.worldSeed, so the
    // whole layout derives from this one number. Random per new game today;
    // a future menu can set worldSeed before calling init() to replay a world.
    this.worldSeed = Math.floor(Math.random() * 1e9)
    this.plots = Array.from({ length: plotCount }, () => ({
      built: 'empty' as BuildingType,
      level: 1,
      lastTickAt: 0,
      lastItemTickAt: 0,
      output: null,
      modifiers: Array.from({ length: MODIFIER_SLOTS_PER_PLOT }, () => null),
    }))
    // seed the fixed world buildings — these are hardcoded, not procedurally placed
    this.worldStructures = [
      { type: 'shop', x: 2400, y: 504, townId: 'northern_town' },
      { type: 'church', x: 2330, y: 504, townId: 'northern_town' },
      { type: 'general_store', x: 2700, y: 2304, townId: null },
      { type: 'abandoned_house', x: 2100, y: 3400, townId: null },
      { type: 'land_office', x: 3030, y: 204, townId: 'northern_town' },
      { type: 'nursery', x: 3100, y: 204, townId: 'northern_town' },
      { type: 'tanner', x: 3235, y: 355, townId: 'northern_town' },
    ]
    this.discoveredTowns = new Set()
    this.unlockedBuildings = new Set(['mill', 'well', 'workshop'])
    this.dugSpots = []
    this.buriedItems = []
    this.buriedStacks = []
    this.walkableInteriors = {}
    this.revealedItems = []
    this.droppedItems = []
    this.plantedTrees = []
    this.terrain = new Uint8Array(TERRAIN_COLS * TERRAIN_COLS)
    this.placedPosts = []
    this.placedCrates = []
    this.pipes = []
    // honses spawn dynamically when twine is first crafted — start empty
    this.honses = []
    this.mounted = null
    this.generalStoreSlots = Array.from({ length: GENERAL_STORE_SLOTS }, () => null)
    // DEV: seed items for testing
    const bag: ItemStack = { type: 'bag', count: 1, contents: [
      { type: 'rope', count: 32 },
      { type: 'post', count: 32 },
      { type: 'pipe', count: 32 },
      null,
    ]}
    this.inventory[0] = { type: 'pickaxe', count: 1 }
    this.inventory[1] = { type: 'crate', count: 1 }
    this.inventory[2] = bag
  }

  // Try to put `stack` into a specific inventory slot. Does NOT mutate `stack`.
  // Returns the number of items accepted. Same-type merges up to maxStack;
  // empty slot takes the whole stack (clamped to maxStack). Bags are rejected
  // if the player already has MAX_BAGS in inventory.
  inventoryOffer(slotIndex: number, stack: Readonly<ItemStack>): number {
    const existing = this.inventory[slotIndex]
    const cap = ITEMS[stack.type].maxStack
    if (!existing) {
      if (isBag(stack.type) && this.bagCount() >= MAX_BAGS) return 0
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
    const now = Date.now()
    plot.lastTickAt = now
    plot.lastItemTickAt = now
    plot.output = null
    if (type === 'workshop') {
      plot.craftInputs = [null, null]
      plot.craftOutput = null
    }
    if (type === 'field') {
      plot.fieldCells = makeEmptyFieldCells()
    }
    if (type === 'storage') {
      plot.storageContents = Array.from({ length: getStorageSlotCount(1) }, () => null)
    }
    return true
  }

  // Inverse of placeBuilding: tear a built plot back down to 'empty'. Returns
  // every item stack that was sitting in the plot (producer output + workshop
  // craft slots) so the caller can spill them back to the player — destroying
  // a plot refunds its contents but not its build cost. Field growth state is
  // not items, so it's simply discarded. Modifiers aren't built out yet, so
  // they're reset but not spilled. No-op (returns []) on an empty plot.
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
    plot.fieldCells = undefined
    plot.storageContents = undefined
    plot.modifiers = Array.from({ length: MODIFIER_SLOTS_PER_PLOT }, () => null)

    return spill
  }
}

export const state = new GameState()
