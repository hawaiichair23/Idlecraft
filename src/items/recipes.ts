import { state } from '../game/state'
import { type ItemType, type ItemStack } from './types'

export interface Recipe {
  // Shapeless ingredients: matched against the set of filled slots regardless
  // of position. Each entry needs a distinct slot holding >= count of its type.
  inputs: { type: ItemType; count: number }[]
  // Optional shaped layout (row-major, length === grid slot count). When set,
  // the recipe is SHAPED: each slot must match the pattern cell exactly
  // (null = that cell must be empty), consuming 1 from each non-null cell.
  // `inputs` is ignored for matching when a pattern is present, but is still
  // used as documentation of the net ingredients.
  pattern?: (ItemType | null)[]
  // Shaped only: also accept the horizontal mirror of the pattern.
  mirror?: boolean
  output: ItemType
  outputCount?: number          // defaults to 1
}

export const RECIPES: Recipe[] = [
  { inputs: [{ type: 'flour', count: 2 }, { type: 'water', count: 1 }], output: 'bread' },
  { inputs: [{ type: 'bread', count: 1 }, { type: 'sausage', count: 1 }], output: 'kolache' },
  // Level 2 (4 slots): 2 canvas + 2 twine in any arrangement -> bag. Shapeless,
  // so position doesn't matter, but all four slots must hold exactly this set.
  // Four inputs need four filled slots, which only the level-2 grid has.
  { inputs: [{ type: 'canvas', count: 1 }, { type: 'canvas', count: 1 }, { type: 'twine', count: 1 }, { type: 'twine', count: 1 }], output: 'bag' },
  { inputs: [{ type: 'leather', count: 1 }, { type: 'twine', count: 1 }], output: 'quirt' },
  { inputs: [{ type: 'sugar_cane', count: 1 }, { type: 'sugar_cane', count: 1 }], output: 'sugar', outputCount: 2 },
  // Two crates combine into one chest (double-width container, 24 slots).
  { inputs: [{ type: 'crate', count: 1 }, { type: 'crate', count: 1 }], output: 'chest' },
  { inputs: [{ type: 'sugar', count: 1 }, { type: 'bread', count: 1 }], output: 'tart' },
  { inputs: [{ type: 'hemp', count: 1 }, { type: 'hemp', count: 1 }], output: 'twine', outputCount: 2 },
  { inputs: [{ type: 'twine', count: 1 }, { type: 'twine', count: 1 }], output: 'rope' },
  { inputs: [{ type: 'iron_bar', count: 1 }, { type: 'wood', count: 1 }], output: 'brand' },
  { inputs: [{ type: 'iron_bar', count: 1 }, { type: 'clay', count: 1 }], output: 'pipe' },
  { inputs: [{ type: 'iron_bar', count: 1 }, { type: 'post', count: 1 }], output: 'iron_post' },
  {
    inputs: [{ type: 'iron_bar', count: 4 }],
    pattern: ['iron_bar', 'iron_bar', 'iron_bar', 'iron_bar'],
    output: 'manacles',
  },
  { inputs: [{ type: 'steel', count: 1 }, { type: 'pickaxe', count: 1 }], output: 'tempered_pick' },
  { inputs: [{ type: 'steel', count: 1 }, { type: 'axe', count: 1 }], output: 'tempered_axe' },
  { inputs: [{ type: 'steel', count: 1 }, { type: 'shovel', count: 1 }], output: 'tempered_shovel' },
  { inputs: [{ type: 'wood', count: 1 }, { type: 'wood', count: 1 }], output: 'post' },
  // Level 2 (2x2 shaped): wood in all four slots -> 8 planks.
  {
    inputs: [{ type: 'wood', count: 4 }],
    pattern: ['wood', 'wood', 'wood', 'wood'],
    output: 'plank',
    outputCount: 8,
  },
  // 1 plank + 1 stone -> wheel (level 2: planks are level-2 only).
  { inputs: [{ type: 'plank', count: 1 }, { type: 'stone', count: 1 }], output: 'wheel' },
  // Level 2 (2x2 shaped): twine in all four slots -> canvas.
  {
    inputs: [{ type: 'twine', count: 4 }],
    pattern: ['twine', 'twine', 'twine', 'twine'],
    output: 'canvas',
  },
  // Level 2 (2x2 shaped): canvas in all four slots -> sack (8-slot bag).
  {
    inputs: [{ type: 'canvas', count: 4 }],
    pattern: ['canvas', 'canvas', 'canvas', 'canvas'],
    output: 'sack',
  },
  // 2 planks + 2 wheels -> cart. Wheels on bottom, planks on top.
  {
    inputs: [{ type: 'plank', count: 2 }, { type: 'wheel', count: 2 }],
    pattern: ['plank', 'plank', 'wheel', 'wheel'],
    output: 'crafting_cart',
  },
  // Planks in all four slots -> crate.
  {
    inputs: [{ type: 'plank', count: 4 }],
    pattern: ['plank', 'plank', 'plank', 'plank'],
    output: 'crate',
  },
  // Level 2 (2x2 shaped): stone in all four slots -> 4 flagstones.
  {
    inputs: [{ type: 'stone', count: 4 }],
    pattern: ['stone', 'stone', 'stone', 'stone'],
    output: 'flagstone',
    outputCount: 4,
  },
  // Level 2 (2x2 shaped): clay in all four slots -> 4 sandstones.
  {
    inputs: [{ type: 'clay', count: 4 }],
    pattern: ['clay', 'clay', 'clay', 'clay'],
    output: 'sandstone',
    outputCount: 4,
  },
]

// A successful match: the recipe plus how much to consume from each slot index.
// findRecipe and consumeCraft both use this so the slot→amount mapping is
// computed exactly once and never re-derived (no drift between preview/consume).
interface RecipeMatch {
  recipe: Recipe
  consume: Map<number, number>   // slot index -> amount to remove
}

// Horizontal mirror of a row-major grid. Assumes a square grid (2x2, 3x3...).
function mirrorPattern(pattern: (ItemType | null)[]): (ItemType | null)[] {
  const n = Math.round(Math.sqrt(pattern.length))
  if (n * n !== pattern.length) return pattern   // non-square: leave as-is
  const out: (ItemType | null)[] = new Array(pattern.length).fill(null)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[r * n + c] = pattern[r * n + (n - 1 - c)]
    }
  }
  return out
}

// Try to match a SHAPED recipe against the slot grid at exact positions.
function matchShaped(recipe: Recipe, stacks: (ItemStack | null)[], pattern: (ItemType | null)[]): RecipeMatch | null {
  if (pattern.length !== stacks.length) return null
  const consume = new Map<number, number>()
  for (let i = 0; i < stacks.length; i++) {
    const want = pattern[i]
    const have = stacks[i]
    if (want === null) {
      if (have !== null && have.count > 0) return null   // cell must be empty
    } else {
      if (!have || have.count < 1 || have.type !== want) return null
      consume.set(i, 1)
    }
  }
  return { recipe, consume }
}

// Try to match a SHAPELESS recipe: the set of filled slots must exactly satisfy
// the recipe's inputs — each input to a distinct slot with enough count, and no
// filled slot left unused (so junk in an extra slot blocks the craft).
function matchShapeless(recipe: Recipe, stacks: (ItemStack | null)[]): RecipeMatch | null {
  const filledIdx = stacks
    .map((s, i) => ({ s, i }))
    .filter((e): e is { s: ItemStack; i: number } => e.s !== null && e.s.count > 0)
  if (filledIdx.length !== recipe.inputs.length) return null

  const consume = new Map<number, number>()
  const usedSlot = new Set<number>()
  // assign each recipe input to a distinct unused slot of the right type/count
  for (const input of recipe.inputs) {
    const hit = filledIdx.find(e => !usedSlot.has(e.i) && e.s.type === input.type && e.s.count >= input.count)
    if (!hit) return null
    usedSlot.add(hit.i)
    consume.set(hit.i, (consume.get(hit.i) ?? 0) + input.count)
  }
  return { recipe, consume }
}

// Find the first recipe that matches the given slot grid, returning the match
// (recipe + per-slot consumption). Order-agnostic for shapeless; positional for
// shaped. Works for any grid size (2 slots at level 1, 4 at level 2).
function findMatch(stacks: (ItemStack | null)[]): RecipeMatch | null {
  for (const recipe of RECIPES) {
    if (recipe.pattern) {
      const m = matchShaped(recipe, stacks, recipe.pattern)
      if (m) return m
      if (recipe.mirror) {
        const fm = matchShaped(recipe, stacks, mirrorPattern(recipe.pattern))
        if (fm) return fm
      }
    } else {
      const m = matchShapeless(recipe, stacks)
      if (m) return m
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
  const match = findMatch(inputs)
  if (!match) return null
  return { type: match.recipe.output, count: match.recipe.outputCount ?? 1 }
}

// Destructive: consume the matched amount from each slot, return the output
// stack. Called when the player takes from the output slot.
export function consumeCraft(plotIndex: number): ItemStack | null {
  const plot = state.plots[plotIndex]
  if (plot.built !== 'workshop') return null
  const inputs = plot.craftInputs
  if (!inputs) return null
  const match = findMatch(inputs)
  if (!match) return null

  for (const [slot, amount] of match.consume) {
    const stack = inputs[slot]
    if (!stack) continue
    stack.count -= amount
    if (stack.count <= 0) inputs[slot] = null
  }

  const output = { type: match.recipe.output, count: match.recipe.outputCount ?? 1 }

  // dialogue flag — the workshop NPC reacts the first time bread is made
  if (output.type === 'bread') state.hasMadeBread = true
  // unlock flag — first rope craft adds rope to the Tool Shop's listings
  if (output.type === 'rope') state.hasCraftedRope = true
  if (output.type === 'post') state.hasCraftedPost = true
  if (output.type === 'bag') state.hasCraftedBag = true
  return output
}
