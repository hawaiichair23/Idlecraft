// Shared smelting logic for fuel-driven crafter plots (smithy, blast furnace,
// and any future smelter-class plot). One state shape, one tick function,
// one pipe-push function. Per-building differences (recipes, fuel burn rate,
// cycle duration) live in the SmeltingConfig attached to each BuildingDef.

import { state } from './state'
import { getPlotSlotCap } from './state'
import type { PlotState } from './state'
import { ITEMS, cloneStack, type ItemStack, type ItemType, type Rarity } from '../items/types'
import { makeRng } from '../world/gen'

export interface SmeltingState {
  fuel: ItemStack | null
  input: ItemStack | null
  outputs: (ItemStack | null)[]
  burnEndAt: number
  burnDuration: number
  cycleEndAt: number
}

export interface SmeltingConfig {
  recipes: Record<string, ItemType>
  outputs: Set<ItemType>
  burnMs: (fuelType: string) => number | undefined
  isFuel: (type: string) => boolean
  cycleDurationMs: number
}

export function ensureSmelt(plot: PlotState): SmeltingState {
  if (!plot.smelt) {
    plot.smelt = { fuel: null, input: null, outputs: [null], burnEndAt: 0, burnDuration: 0, cycleEndAt: 0 }
  } else if (!plot.smelt.outputs) {
    // Legacy single-output saves get migrated up to the array shape.
    const legacy = (plot.smelt as any).output as ItemStack | null | undefined
    plot.smelt.outputs = [legacy ?? null]
    delete (plot.smelt as any).output
  }
  return plot.smelt
}

// Pick the slot the next produced item should land in: prefer a slot already
// holding the same type+rarity with room, otherwise the first empty slot.
// Returns -1 if no slot can accept it (all slots claimed by other types and
// none have room).
function chooseOutputSlot(outputs: (ItemStack | null)[], outType: ItemType, rolledRarity: Rarity | undefined, cap: number): number {
  let firstEmpty = -1
  for (let i = 0; i < outputs.length; i++) {
    const slot = outputs[i]
    if (!slot) {
      if (firstEmpty === -1) firstEmpty = i
      continue
    }
    if (slot.type === outType && slot.rarity === rolledRarity && slot.count < cap) {
      return i
    }
  }
  return firstEmpty
}

export function tickSmeltingPlot(plot: PlotState, plotIndex: number, now: number, cfg: SmeltingConfig): void {
  const s = ensureSmelt(plot)
  const fuel = s.fuel
  const input = s.input

  if (!input || !fuel) {
    s.cycleEndAt = 0
  } else if (s.cycleEndAt === 0) {
    s.cycleEndAt = now + cfg.cycleDurationMs
    if (s.burnEndAt <= now) {
      const burnMs = cfg.burnMs(fuel.type)
      if (burnMs) {
        s.burnEndAt = now + burnMs
        s.burnDuration = burnMs
      }
    }
  }

  if (s.cycleEndAt > 0 && now >= s.cycleEndAt) {
    const currentInput = s.input
    const currentFuel = s.fuel
    if (currentInput && currentFuel) {
      const outType = cfg.recipes[currentInput.type]
      if (outType) {
        const cap = getPlotSlotCap(plot, outType)
        const rng = makeRng(state.worldSeed + plotIndex * 7919 + Math.floor(s.cycleEndAt))
        const r = rng()
        const rolledRarity: Rarity | undefined = ITEMS[outType].noRarity
          ? undefined
          : (r < 0.02 ? 'pure_quill' : r < 0.11 ? 'rare' : 'common')
        const slotIdx = chooseOutputSlot(s.outputs, outType, rolledRarity, cap)
        if (slotIdx !== -1) {
          currentInput.count -= 1
          if (currentInput.count <= 0) s.input = null
          const targetSlot = s.outputs[slotIdx]
          if (!targetSlot) {
            s.outputs[slotIdx] = { type: outType, count: 1, rarity: rolledRarity }
          } else {
            targetSlot.count += 1
          }
          if (s.burnEndAt <= now) {
            currentFuel.count -= 1
            if (currentFuel.count <= 0) s.fuel = null
            const nextFuel = s.fuel
            if (nextFuel) {
              const burnMs = cfg.burnMs(nextFuel.type)
              if (burnMs) {
                s.burnEndAt = now + burnMs
                s.burnDuration = burnMs
              }
            }
          }
          if (s.input && s.fuel) {
            s.cycleEndAt = now + cfg.cycleDurationMs
          } else {
            s.cycleEndAt = 0
          }
        }
      }
    }
  }
}

export function pushToSmeltingPlot(
  plot: PlotState,
  source: Readonly<ItemStack>,
  count: number,
  cfg: SmeltingConfig,
): number {
  const type = source.type
  const cap = ITEMS[type].maxStack
  const s = ensureSmelt(plot)

  if (cfg.isFuel(type)) {
    const slot = s.fuel
    if (slot && (slot.type !== type || slot.rarity !== source.rarity)) return 0
    const have = slot ? slot.count : 0
    const room = cap - have
    if (room <= 0) return 0
    const move = Math.min(room, count)
    if (slot) slot.count += move
    else s.fuel = cloneStack(source, move)
    return move
  }

  if (type in cfg.recipes) {
    const slot = s.input
    if (slot && (slot.type !== type || slot.rarity !== source.rarity)) return 0
    const have = slot ? slot.count : 0
    const room = cap - have
    if (room <= 0) return 0
    const move = Math.min(room, count)
    if (slot) slot.count += move
    else s.input = cloneStack(source, move)
    return move
  }

  return 0
}

// Peek the first non-empty output stack. Used by pipes asking "what can you
// give me?". Returns null if every output slot is empty.
export function peekSmeltingOutput(plot: PlotState): ItemStack | null {
  const s = plot.smelt
  if (!s || !s.outputs) return null
  for (const slot of s.outputs) {
    if (slot && slot.count > 0) return slot
  }
  return null
}

// Drain `n` items off the smelter's output stacks. Used by pipes after they
// peek + decide how many to take. Drains from the first non-empty slot first.
export function takeSmeltingOutput(plot: PlotState, n: number): void {
  const s = plot.smelt
  if (!s || !s.outputs) return
  let remaining = n
  for (let i = 0; i < s.outputs.length && remaining > 0; i++) {
    const slot = s.outputs[i]
    if (!slot || slot.count <= 0) continue
    const take = Math.min(slot.count, remaining)
    slot.count -= take
    remaining -= take
    if (slot.count <= 0) s.outputs[i] = null
  }
}
