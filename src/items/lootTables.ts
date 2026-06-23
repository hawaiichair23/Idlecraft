// Seeded loot tables for world containers. Deterministic from a seed so a given
// chest in a given world always rolls the same contents, but differs per house
// and per world. Minecraft-style: weighted tiers, one of which is "empty".

import { makeRng } from '../world/gen'
import type { ItemType } from './types'

// A single possible drop: an item type, a stack-count range, and a weight.
// weight is relative within the table (not a percentage).
interface LootEntry {
  type: ItemType   // the item dropped
  min: number      // min stack count
  max: number      // max stack count
  weight: number   // relative likelihood
}

// Chance the whole chest is a dud (empty) — checked once, before rolling items.
const DUD_CHANCE = 0.1
// A non-dud chest holds this many item rolls (each its own slot).
const MIN_ITEMS = 1
const MAX_ITEMS = 3

// Abandoned-house item table (no empty entry — emptiness is the DUD_CHANCE
// above). Tiers, roughly: common food/material, uncommon ore/valuable, rare
// tool/storage, top-tier. Tune by editing weights.
const ABANDONED_HOUSE_TABLE: LootEntry[] = [
  // --- common: food ---
  { type: 'sausage',   min: 1, max: 3, weight: 9 },
  { type: 'bread',     min: 1, max: 2, weight: 8 },
  { type: 'kolache',   min: 1, max: 2, weight: 6 },
  { type: 'snake_oil', min: 1, max: 1, weight: 4 },   // best food, weighted low

  // --- common: materials ---
  { type: 'hemp',      min: 4, max: 6, weight: 6 },
  { type: 'wood',      min: 4, max: 6, weight: 6 },
  { type: 'stone',     min: 4, max: 6, weight: 5 },
  { type: 'clay',      min: 4, max: 6, weight: 4 },
  { type: 'leather',   min: 2, max: 4, weight: 4 },
  { type: 'twine',     min: 4, max: 6, weight: 3 },
  { type: 'post',      min: 4, max: 6, weight: 3 },
  { type: 'cedar_post', min: 4, max: 6, weight: 2 },

  // --- uncommon: ore / valuables ---
  { type: 'coal',      min: 1, max: 3, weight: 6 },
  { type: 'iron',      min: 1, max: 3, weight: 5 },
  { type: 'copper',    min: 1, max: 3, weight: 4 },
  { type: 'silver',    min: 1, max: 2, weight: 2 },
  { type: 'gold',      min: 1, max: 1, weight: 1 },
  { type: 'wheel',     min: 1, max: 1, weight: 2 },
  { type: 'canvas',    min: 2, max: 2, weight: 2 },

  // --- rare: tools / storage ---
  { type: 'shovel',    min: 1, max: 1, weight: 1 },
  { type: 'rope',      min: 2, max: 2, weight: 3 },
  { type: 'bag',       min: 1, max: 1, weight: 2 },
  { type: 'medium_bag', min: 1, max: 1, weight: 1 },
  { type: 'sack',      min: 1, max: 1, weight: 1 },
  { type: 'quirt',     min: 1, max: 1, weight: 1 },

  // --- top tier ---
  { type: 'axe',       min: 1, max: 1, weight: 1 },
  { type: 'pickaxe',   min: 1, max: 1, weight: 1 },
]

// Pick one entry from a table by weight, using the provided 0..1 roll.
function pickWeighted(table: LootEntry[], roll: number): LootEntry {
  const total = table.reduce((s, e) => s + e.weight, 0)
  let t = roll * total
  for (const e of table) {
    t -= e.weight
    if (t <= 0) return e
  }
  return table[table.length - 1]
}

// Roll the contents for an abandoned-house chest. Deterministic from `seed`.
// First a single dud check (empty chest); otherwise 1–3 weighted item rolls,
// each its own slot. Positions are { x: 0, y: 0 } — the interior places contents
// into slot order, so x/y are unused (kept for the WalkableInteriorItem shape).
export function rollAbandonedHouseChest(
  seed: number,
): { x: number; y: number; type: ItemType; count: number }[] {
  const rng = makeRng(seed)
  // Dud check: empty chest you open for nothing.
  if (rng() < DUD_CHANCE) return []
  // Otherwise pick how many items, then roll each from the (non-empty) table.
  const itemCount = MIN_ITEMS + Math.floor(rng() * (MAX_ITEMS - MIN_ITEMS + 1))
  const out: { x: number; y: number; type: ItemType; count: number }[] = []
  for (let i = 0; i < itemCount; i++) {
    const entry = pickWeighted(ABANDONED_HOUSE_TABLE, rng())
    const span = entry.max - entry.min
    const count = entry.min + Math.floor(rng() * (span + 1))
    out.push({ x: 0, y: 0, type: entry.type, count })
  }
  return out
}

// ---- LOCKBOX TOOL POOLS ----
// One tool per lockbox — opening it is the prize. Silver has the basic divergent
// tools; gold has the rarer ones AND can fall through to silver, so a gold box
// is never strictly worse than a silver one, only has the upside of the better
// pool. Weights are equal within each pool to start.

const SILVER_LOCKBOX_POOL: ItemType[] = ['double_jack', 'paul_bunyan']
const GOLD_LOCKBOX_POOL: ItemType[] = ['toledo_pick', 'wild_bill', 'damascus_pick', 'greedy']

// Probability a gold lockbox rolls from the gold pool (vs falling through to
// the silver pool). 0.7 = most gold pulls are gold-tier, but a silver-tier
// consolation can land.
const GOLD_PRIMARY_CHANCE = 0.7

export function rollLockboxContents(
  itemType: 'silver_lockbox' | 'gold_lockbox',
  seed: number,
): ItemType {
  const rng = makeRng(seed)
  if (itemType === 'silver_lockbox') {
    return SILVER_LOCKBOX_POOL[Math.floor(rng() * SILVER_LOCKBOX_POOL.length)]
  }
  // gold: chance to roll the gold pool, else the silver pool
  const pool = rng() < GOLD_PRIMARY_CHANCE ? GOLD_LOCKBOX_POOL : SILVER_LOCKBOX_POOL
  return pool[Math.floor(rng() * pool.length)]
}
