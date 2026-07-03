# Plot Rules

Five rules for adding a new plot type. Skip any of these and you create the same tech debt that bit smithy, workshop, and the inventory.

---

## 1. Reuse inventory helpers

Slot bindings come from `src/ui/slotFactory.ts`. Never write a bespoke `take`/`offer`/`accepts` block inside an interior file.

Available builders:

- `makeStorageBinding(pos, get, set, cb)` — generic stack slot. Any item type. Same-type+rarity stacks.
- `makeFilteredStorageBinding(pos, get, set, cb, filter)` — storage gated by a type filter. Example: smithy fuel slot uses `isFuel`, ore slot uses `isSmeltable`.
- `makeProducerBinding(pos, get, set, cb, produces)` — produces a single fixed item type. Accepts deposits of that same type (for bounce-back).
- `makeReadOnlyBinding(pos, get, set, cb)` — externally-written slot. Accepts deposits of whatever type/rarity is currently in it (or whatever the slot's filter allows). Used when the producer's output type varies (smithy, workshop).
- `makeCrafterInputBinding(pos, get, set, cb)` — storage + rejects bags.

If none fit, **add a new builder to slotFactory**. Don't inline a one-off in your interior file.

Anti-pattern (the bug we hit twice):

```ts
// BAD — bespoke binding in the interior file
const binding: SlotBinding = {
  take: (n) => { const taken = { type: cur.type, count: n }; ... },
  ...
}
```

That `{ type: cur.type, count: n }` drops `rarity`, `contents`, `unlocked`. Use `cloneStack` and the shared helpers.

---

## 2. Allow placing the same object type back into the slot

The smithy/workshop output slot is "read-only" in the sense that the player can't deposit arbitrary stuff into it. But the player **must** be able to drop back the bar they just picked up. Two requirements:

- `accepts(itemType)` returns `true` for the type currently in the slot (and for an empty slot, if the slot has a clear "produces" notion — see how `SmithyInterior` wraps `makeReadOnlyBinding` with a `SMELT_OUTPUTS` filter).
- `offer(stack)` accepts items matching the slot's current type + rarity. Falls through if empty per the slot's filter.

If you make `accepts: () => false` and `offer: () => 0`, the player can't put a picked-up item back — the cursor stays held forever. This was the "WHY CAN'T I PUT THE BAR BACK" bug.

`makeReadOnlyBinding` already does this correctly. Use it.

---

## 3. Update on world time

Plot logic ticks in **the world loop**, not the interior `update()` closure.

The world loop is in `Overworld.ts` around line ~6024:

```ts
for (let i = 0; i < state.plots.length; i++) {
  const plot = state.plots[i]
  if (plot.built === 'empty') continue
  const def = BUILDINGS[plot.built]
  // ... mill/well/producer logic ticks here every frame
}
```

If your plot has any logic that should happen while the player isn't looking at it (smelt cycles, crafting, fuel consumption, output production), it runs here.

The interior `update()` closure is **visuals only** — progress bars, fuel meters, slot icon refreshes. It reads the same state the world tick mutates.

Pattern:

```ts
// src/scenes/MyInterior.ts
export function tickMyPlot(plotIndex: number, now: number) {
  // pure logic — mutates state.plots[plotIndex], no Phaser objects
}

export function buildMyInterior(scene, plotIndex, ...) {
  // visual setup
  const update = () => {
    // read state.plots[plotIndex], paint bars and icons
    // do NOT mutate plot logic state here
  }
  return { bindings, slotVisuals, update }
}

// src/scenes/Overworld.ts, world tick loop
if (plot.built === 'my_plot') tickMyPlot(i, now)
```

Anti-pattern: `update` closure mutates timers, consumes fuel, produces items. The plot stops working when nobody's looking.

---

## 4. Integrate with pipe transfer logic

Pipes use two functions in `Overworld.ts`:

- `pipePeekSource(plotIndex)` returns the source plot's outgoing stack (or null).
- `pipePushToPlot(plotIndex, source, count, fromPlot)` accepts up to `count` items from `source` into the destination plot.

When adding a new plot type, add cases to both:

**Peek** — return the ACTUAL stack, not `{ type, count }`. Rarity/contents/unlocked must ride along:

```ts
// BAD — drops rarity
return { type: plot.myOutput.type, count: plot.myOutput.count }

// GOOD — passes the stack reference
return plot.myOutput ?? null
```

**Push** — take a `Readonly<ItemStack>` source. Construct destination stacks with `cloneStack(source, move)`. Check rarity in compatibility tests:

```ts
// BAD — destination slot type-checks pass but rarity differs, silent loss
if (existing && existing.type !== source.type) return 0

// GOOD
if (existing && (existing.type !== source.type || existing.rarity !== source.rarity)) return 0

// BAD — drops rarity
inputs[slot] = { type: source.type, count: move }

// GOOD
inputs[slot] = cloneStack(source, move)
```

---

## 5. No duplication

Symptoms:

- You're writing a `take`/`offer`/`accepts` block in an interior file → use a slotFactory helper.
- You're writing `{ type: src.type, count: n }` → use `cloneStack(src, n)`.
- You're writing a tick loop with timestamps and burn timers → look at how `mill`/`well` already do it.
- You're writing `if (s.type === stack.type && s.count < cap)` to test stack compatibility → that's now `s.type === stack.type && s.rarity === stack.rarity && s.count < cap`. Extract a helper if you write it twice.

When you add a stack-level field (like `rarity` was), the change should touch ONE place: `cloneStack` in `src/items/types.ts`. Plus any explicit equality checks that need to compare the new field. Nothing else.

If you find yourself touching more than two files to add a stack field, something is duplicating logic that should be centralized.

---

## Quick reference

- New plot type → world tick in `Overworld.ts`, interior visuals in `MyInterior.ts`.
- Slot bindings → `slotFactory.ts` helpers, never inline.
- Stack construction from existing stack → `cloneStack`, never `{ type, count }`.
- Stack compatibility → type + rarity (+ future fields), not just type.
- Pipe integration → `pipePeekSource` + `pipePushToPlot`, pass the stack itself.

---

## Next plot: drying rack

Builds on the smithy pattern with simpler shape:

- **1 input slot** — normal stacking storage, filtered by a `DRY_RECIPES` map (initially just `hemp`).
- **1 output slot** — `makeReadOnlyBinding` wrapped to filter on output types (initially just `hay`). Same wrapping pattern as smithy uses for `SMELT_OUTPUTS`.
- **1 progress bar** — single dry cycle timer (`plot.dryEndAt`). Same shape as smithy's smelt timer.
- **No fuel.** The dry cycle runs whenever input + output-slot-has-room exists.
- **Recipe table** in `items/types.ts`:
  ```ts
  export const DRY_RECIPES: Record<string, ItemType> = { hemp: 'hay' }
  export const DRY_OUTPUTS: Set<ItemType> = new Set(Object.values(DRY_RECIPES))
  ```
- **No rarity rolling.** Drying is deterministic.
- **State fields** on `Plot` (smithy mirror):
  - `dryInput?: ItemStack | null`
  - `dryOutput?: ItemStack | null`
  - `dryEndAt?: number`
- **`tickDryRackPlot(plotIndex, now)`** exported from `DryRackInterior.ts` — pure logic, called from Overworld's world tick loop. Same shape as `tickSmithyPlot`.
- **Pipe integration** — extend `pipePeekSource` to return `plot.dryOutput`; extend `pipePushToPlot` to accept input into `plot.dryInput` (filter on `DRY_RECIPES` keys).
- **Interior `update()`** — paints progress bar only. Calls `tickDryRackPlot` to keep ticking when the player has it open.

Future expansion (skin → leather) is a one-line addition to `DRY_RECIPES`. No code changes elsewhere.

