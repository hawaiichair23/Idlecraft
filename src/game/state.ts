// Single source of game state. Scenes read this and mutate via the methods.
// Updates emit events on Phaser's global registry so the UI can react.

import Phaser from 'phaser'
import type { ItemStack, ItemType } from '../items/types'
import { ITEMS } from '../items/types'

export type BuildingType = 'empty' | 'mill' | 'crafter' | 'well'
export type BuiltType = Exclude<BuildingType, 'empty'>

export const MAX_GOLD = 999_999

export interface PlotState {
  built: BuildingType
  lastTickAt: number   // ms timestamp of the last completed gold tick
  lastItemTickAt: number  // ms timestamp of the last completed item tick (for producers)
  output: ItemStack | null   // producer output: mill→flour, well→water
  // crafter-only: 2 input slots and 1 output slot. null for non-crafter plots.
  craftInputs?: (ItemStack | null)[]
  craftOutput?: ItemStack | null
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
  inventory: (ItemStack | null)[] = Array.from({ length: INVENTORY_SIZE }, () => null)

  init(plotCount: number) {
    this.plots = Array.from({ length: plotCount }, () => ({ built: 'empty', lastTickAt: 0, lastItemTickAt: 0, output: null }))
    // mock-seed so we can test drag-and-drop right away
    this.inventory[0] = { type: 'flour', count: 3 }
    this.inventory[1] = { type: 'water', count: 1 }
  }

  // Inventory operations. Return true on success, false if nothing changed.
  inventoryTake(slotIndex: number): ItemStack | null {
    const s = this.inventory[slotIndex]
    if (!s) return null
    this.inventory[slotIndex] = null
    return s
  }

  inventoryPlace(slotIndex: number, stack: ItemStack): boolean {
    const existing = this.inventory[slotIndex]
    if (!existing) {
      // consume the incoming stack into a new owned stack
      this.inventory[slotIndex] = { type: stack.type, count: stack.count }
      stack.count = 0
      return true
    }
    // same item type → merge up to maxStack
    if (existing.type === stack.type) {
      const cap = ITEMS[existing.type].maxStack
      const room = cap - existing.count
      if (room <= 0) return false
      const moved = Math.min(room, stack.count)
      existing.count += moved
      stack.count -= moved
      // if any leftover stays held, caller's `place` returns false to bounce it
      return stack.count === 0
    }
    return false
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
