import { state } from '../game/state'
import { type ItemType, type ItemStack } from './types'

export interface Recipe {
  inputs: { type: ItemType; count: number }[]  // any number of ingredients, each with a quantity
  output: ItemType
  outputCount?: number          // defaults to 1
}

export const RECIPES: Recipe[] = [
  { inputs: [{ type: 'flour', count: 2 }, { type: 'water', count: 1 }], output: 'bread' },
  { inputs: [{ type: 'bread', count: 1 }, { type: 'sausage', count: 1 }], output: 'kolache' },
  { inputs: [{ type: 'leather', count: 5 }, { type: 'twine', count: 10 }], output: 'bag' },
  { inputs: [{ type: 'sugar_cane', count: 1 }, { type: 'sugar_cane', count: 1 }], output: 'sugar', outputCount: 2 },
  { inputs: [{ type: 'sugar', count: 1 }, { type: 'bread', count: 1 }], output: 'pastry' },
  { inputs: [{ type: 'hemp', count: 1 }, { type: 'hemp', count: 1 }], output: 'twine', outputCount: 2 },
  { inputs: [{ type: 'twine', count: 1 }, { type: 'twine', count: 1 }], output: 'rope' },
  { inputs: [{ type: 'wood', count: 1 }, { type: 'wood', count: 1 }], output: 'post' },
]

// Returns the matching recipe for the given input stacks (order doesn't
// matter). Each recipe input must be satisfied by a distinct slot — a recipe
// needing two different types requires two slots, and a recipe needing the
// same type twice requires two slots both holding that type. Each slot must
// have at least the recipe's required count.
function findRecipe(stacks: (ItemStack | null)[]): Recipe | null {
  const filled = stacks.filter((s): s is ItemStack => s !== null && s.count > 0)
  if (filled.length < 2) return null

  for (const recipe of RECIPES) {
    if (recipe.inputs.length !== 2) continue  // workshop has 2 slots
    const [ra, rb] = recipe.inputs
    // try both orderings: slot0=ra,slot1=rb or slot0=rb,slot1=ra
    if (
      (filled[0].type === ra.type && filled[0].count >= ra.count &&
       filled[1].type === rb.type && filled[1].count >= rb.count) ||
      (filled[0].type === rb.type && filled[0].count >= rb.count &&
       filled[1].type === ra.type && filled[1].count >= ra.count)
    ) {
      return recipe
    }
  }
  return null
}

// Non-destructive: what would crafting on this plot produce right now?
// Returns the output stack or null. Does not modify state.
export function previewCraft(plotIndex: number): ItemStack | null {
  const plot = state.plots[plotIndex]
  if (plot.built !== 'workshop') return null
  const inputs = plot.craftInputs
  if (!inputs) return null
  const recipe = findRecipe(inputs)
  if (!recipe) return null
  return { type: recipe.output, count: recipe.outputCount ?? 1 }
}

// Destructive: consume the required count of each input, return the output
// stack. Called when the player takes from the output slot.
export function consumeCraft(plotIndex: number): ItemStack | null {
  const plot = state.plots[plotIndex]
  if (plot.built !== 'workshop') return null
  const inputs = plot.craftInputs
  if (!inputs) return null
  const recipe = findRecipe(inputs)
  if (!recipe) return null

  // figure out which slot maps to which recipe input (order-agnostic)
  const [ra, rb] = recipe.inputs
  let slotA: number, slotB: number
  if (inputs[0]?.type === ra.type && inputs[1]?.type === rb.type) {
    slotA = 0; slotB = 1
  } else {
    slotA = 1; slotB = 0
  }

  inputs[slotA]!.count -= ra.count
  inputs[slotB]!.count -= rb.count
  if (inputs[slotA]!.count <= 0) inputs[slotA] = null
  if (inputs[slotB]!.count <= 0) inputs[slotB] = null

  const output = { type: recipe.output, count: recipe.outputCount ?? 1 }

  // dialogue flag — the workshop NPC reacts the first time bread is made
  if (output.type === 'bread') state.hasMadeBread = true
  // unlock flag — first rope craft adds rope to the Tool Shop's listings
  if (output.type === 'rope') state.hasCraftedRope = true
  // unlock flag — first twine craft spawns honses in the overworld
  if (output.type === 'twine') state.hasCraftedTwine = true
  if (output.type === 'post') state.hasCraftedPost = true
  if (output.type === 'bag') state.hasCraftedBag = true
  return output
}
