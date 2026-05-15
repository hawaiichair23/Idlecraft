import { state } from '../game/state'
import { type ItemType, type ItemStack } from './types'

export interface Recipe {
  inputs: [ItemType, ItemType]  // order-agnostic
  output: ItemType
}

export const RECIPES: Recipe[] = [
  { inputs: ['flour', 'water'], output: 'bread' },
]

// Returns the matching recipe for the given two inputs (order doesn't matter),
// or null if none match.
function findRecipe(a: ItemType, b: ItemType): Recipe | null {
  for (const r of RECIPES) {
    const [x, y] = r.inputs
    if ((x === a && y === b) || (x === b && y === a)) return r
  }
  return null
}

// Non-destructive: what would crafting on this plot produce right now?
// Returns the output stack or null. Does not modify state.
export function previewCraft(plotIndex: number): ItemStack | null {
  const plot = state.plots[plotIndex]
  if (plot.built !== 'crafter') return null
  const inputs = plot.craftInputs
  if (!inputs) return null
  const a = inputs[0]
  const b = inputs[1]
  if (!a || !b) return null
  const recipe = findRecipe(a.type, b.type)
  if (!recipe) return null
  return { type: recipe.output, count: 1 }
}

// Destructive: consume one of each input, return the output stack.
// Called when the player takes from the output slot.
export function consumeCraft(plotIndex: number): ItemStack | null {
  const preview = previewCraft(plotIndex)
  if (!preview) return null
  const plot = state.plots[plotIndex]
  const inputs = plot.craftInputs!
  const a = inputs[0]!
  const b = inputs[1]!
  a.count--
  b.count--
  if (a.count <= 0) inputs[0] = null
  if (b.count <= 0) inputs[1] = null
  // dialogue flag — the crafter NPC reacts the first time bread is made
  if (preview.type === 'bread') state.hasMadeBread = true
  return preview
}
