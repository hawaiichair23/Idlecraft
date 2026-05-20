// Single source of game state. Scenes read this and mutate via the methods.
// Updates emit events on Phaser's global registry so the UI can react.

import Phaser from 'phaser'
import type { ItemStack, ItemType, ItemDef } from '../items/types'
import { ITEMS } from '../items/types'
import type { WorldStructure } from '../world/structures'
import type { Honse } from '../world/honse'

export type BuildingType = 'empty' | 'mill' | 'workshop' | 'well' | 'field'
export type BuiltType = Exclude<BuildingType, 'empty'>

export const MAX_GOLD = 999_999

export const MODIFIER_SLOTS_PER_PLOT = 8

// General store sell-grid: 6 columns × 4 rows.
export const GENERAL_STORE_SLOTS = 24

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
}

export const BUILDING_LIST: BuiltType[] = ['mill', 'well', 'workshop', 'field']

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

class GameState {
  gold = 500
  plots: PlotState[] = []
  // Fixed world buildings (shop, church, etc.) — not owned, not bought, no ticks.
  worldStructures: WorldStructure[] = []
  // Discovered towns. ID matches an entry in TOWNS from world/structures.ts.
  discoveredTowns: Set<string> = new Set()
  // Plot building types the player can build. Defaults to the starter set;
  // others (field, etc.) are unlocked by purchasing at the Land Office.
  unlockedBuildings: Set<BuiltType> = new Set(['mill', 'well', 'workshop', 'field'])
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
  // in the world. Stage advances over time (future feature).
  plantedTrees: { x: number; y: number; kind: 'cottonwood' }[] = []
  // Hitching posts placed by the player. Each entry is a sprite in the world
  // and an obstacle in collision. Future: rope-throw target for catching honse.
  placedPosts: { x: number; y: number }[] = []
  // Honses in the world. Position is the visual center; sprite/collision/rope
  // hitboxes derive from this. Stationary for now — movement comes later.
  honses: Honse[] = []
  inventory: (ItemStack | null)[] = Array.from({ length: INVENTORY_SIZE }, () => null)
  // currently-selected inventory slot, set by scroll wheel
  selectedInventorySlot = 0

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

  init(plotCount: number) {
    this.gold = 1500
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
    ]
    this.discoveredTowns = new Set()
    this.unlockedBuildings = new Set(['mill', 'well', 'workshop', 'field'])
    this.dugSpots = []
    this.buriedItems = []
    this.buriedStacks = []
    this.walkableInteriors = {}
    this.revealedItems = []
    this.droppedItems = []
    this.plantedTrees = []
    this.placedPosts = []
    // seed: one test honse above the General Store. Her spawn point is her
    // home — she'll drift around it within HOME_RADIUS rather than wander off.
    this.honses = [{
      x: 2700, y: 2240,
      vx: 0, vy: 0,
      facingRight: false,
      facingLockedUntil: 0,
      homeX: 2700, homeY: 2240,
      mode: 'idle', modeUntil: 0,
    }]
    this.generalStoreSlots = Array.from({ length: GENERAL_STORE_SLOTS }, () => null)
    // dev seed: 3 posts in the first inventory slot for testing placement.
    this.inventory[0] = { type: 'post', count: 3 }
    // dev seed: rope in slot 1 for testing the rope-throw physics.
    this.inventory[1] = { type: 'rope', count: 10 }
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
    return true
  }
}

export const state = new GameState()
