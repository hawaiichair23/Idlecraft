// Single source of game state. Scenes read this and mutate via the methods.
// Updates emit events on Phaser's global registry so the UI can react.

import Phaser from 'phaser'
import type { ItemStack, ItemType } from '../items/types'
import { ITEMS } from '../items/types'
import type { WorldStructure } from '../world/structures'

export type BuildingType = 'empty' | 'mill' | 'crafter' | 'well'
export type BuiltType = Exclude<BuildingType, 'empty'>

export const MAX_GOLD = 999_999

export const MODIFIER_SLOTS_PER_PLOT = 8

export interface PlotState {
  built: BuildingType
  lastTickAt: number   // ms timestamp of the last completed gold tick
  lastItemTickAt: number  // ms timestamp of the last completed item tick (for producers)
  output: ItemStack | null   // producer output: mill→flour, well→water
  // crafter-only: 2 input slots and 1 output slot. null for non-crafter plots.
  craftInputs?: (ItemStack | null)[]
  craftOutput?: ItemStack | null
  // modifier rack — every building has one; items here will eventually affect
  // production but right now just store anything the player drops in.
  modifiers: (ItemStack | null)[]
}

export interface BuildingDef {
  name: string
  description: string
  cost: number
  tickMs: number
  goldPerTick: number
  producesItem?: ItemType    // mill: 'flour', well: 'water', crafter: undefined
  itemTickMs?: number        // how often it produces 1 of producesItem
}

export const BUILDINGS: Record<BuiltType, BuildingDef> = {
  mill:    { name: 'Mill',    description: 'Generates Flour and 1 Gold.',     cost: 15, tickMs: 4000, goldPerTick: 1, producesItem: 'flour', itemTickMs: 8000 },
  well:    { name: 'Well',    description: 'Generates Water and 5 Gold.',     cost: 30, tickMs: 8000, goldPerTick: 5, producesItem: 'water', itemTickMs: 16000 },
  crafter: { name: 'Crafter', description: 'Crafts materials into products.', cost: 50, tickMs: 6000, goldPerTick: 0 },
}

export const BUILDING_LIST: BuiltType[] = ['mill', 'well', 'crafter']

export const INVENTORY_SIZE = 5

class GameState {
  gold = 100
  plots: PlotState[] = []
  // Fixed world buildings (shop, church, etc.) — not owned, not bought, no ticks.
  worldStructures: WorldStructure[] = []
  // Discovered towns. ID matches an entry in TOWNS from world/structures.ts.
  discoveredTowns: Set<string> = new Set()
  // Dirt patches left by the shovel — visual scars in the world that persist
  // across the play session. Items dug up will live alongside these later.
  dugSpots: { x: number; y: number }[] = []
  // Invisible buried items, placed by world gen. Each entry is consumed when
  // the player digs within reveal radius.
  buriedItems: { x: number; y: number; reward: number }[] = []
  // Revealed but not yet collected — sprite drawn at position, walk over to claim.
  revealedItems: { x: number; y: number; reward: number }[] = []
  inventory: (ItemStack | null)[] = Array.from({ length: INVENTORY_SIZE }, () => null)
  // currently-selected inventory slot (0..INVENTORY_SIZE-1), set by scroll wheel
  selectedInventorySlot = 0

  // NPC dialogue progression — each flag flips true the first time its line
  // is shown, and the corresponding line is never shown again.
  crafterFirstLineSeen = false
  crafterSecondLineSeen = false
  // Set to true the first time bread is crafted. Used to trigger the crafter
  // NPC's second line.
  hasMadeBread = false

  // Convenience: true when the player has the shovel selected in the hotbar.
  // Used by overworld click handlers to disable normal clicks (gold farming,
  // opening the build menu) so a shovel-click only triggers digging.
  isShovelSelected(): boolean {
    const s = this.inventory[this.selectedInventorySlot]
    return s !== null && s.type === 'shovel'
  }

  init(plotCount: number) {
    this.plots = Array.from({ length: plotCount }, () => ({
      built: 'empty' as BuildingType,
      lastTickAt: 0,
      lastItemTickAt: 0,
      output: null,
      modifiers: Array.from({ length: MODIFIER_SLOTS_PER_PLOT }, () => null),
    }))
    // seed the fixed world buildings — these are hardcoded, not procedurally placed
    this.worldStructures = [
      { type: 'shop', x: 2400, y: 504, townId: 'northern_town' },
      { type: 'church', x: 2330, y: 504, townId: 'northern_town' },
    ]
    this.discoveredTowns = new Set()
    this.dugSpots = []
    this.buriedItems = []
    this.revealedItems = []
    // mock-seed so we can test drag-and-drop right away
    this.inventory[0] = { type: 'flour', count: 3 }
    this.inventory[1] = { type: 'water', count: 1 }
    this.inventory[2] = { type: 'shovel', count: 1 }
  }

  // Try to put `stack` into a specific inventory slot. Does NOT mutate `stack`.
  // Returns the number of items accepted. Same-type merges up to maxStack;
  // empty slot takes the whole stack (clamped to maxStack).
  inventoryOffer(slotIndex: number, stack: Readonly<ItemStack>): number {
    const existing = this.inventory[slotIndex]
    const cap = ITEMS[stack.type].maxStack
    if (!existing) {
      const moved = Math.min(cap, stack.count)
      this.inventory[slotIndex] = { type: stack.type, count: moved }
      return moved
    }
    if (existing.type !== stack.type) return 0
    const room = cap - existing.count
    if (room <= 0) return 0
    const moved = Math.min(room, stack.count)
    existing.count += moved
    return moved
  }

  // Try to add an item stack anywhere in inventory: stack onto matching slots
  // first, then fill empty slots. Returns the amount actually added.
  inventoryAddAnywhere(stack: ItemStack): number {
    const cap = ITEMS[stack.type].maxStack
    let added = 0
    // first pass: top up existing matching stacks
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
    // second pass: place into empty slots
    for (let i = 0; i < this.inventory.length; i++) {
      if (stack.count <= 0) break
      if (this.inventory[i] === null) {
        const moved = Math.min(cap, stack.count)
        this.inventory[i] = { type: stack.type, count: moved }
        stack.count -= moved
        added += moved
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
    if (type === 'crafter') {
      plot.craftInputs = [null, null]
      plot.craftOutput = null
    }
    return true
  }
}

export const state = new GameState()
