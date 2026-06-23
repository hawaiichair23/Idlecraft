import { state, WOOD_TILE } from './state'
import { ITEMS } from '../items/types'

export const TOOL_RANGE = 150
export const CRATE_RANGE = 80

export type ActionKind =
  | 'untie-rope'
  | 'destroy-post'
  | 'destroy-crate'
  | 'destroy-plot'
  | 'destroy-pipe'
  | 'destroy-wood'
  | 'destroy-gate'
  | 'chop-tree'
  | 'mine-rock'
  | 'dig'
  | 'plant-sapling'
  | 'place-post'
  | 'place-crate'
  | 'place-plank'
  | 'place-water'
  | 'place-gate'
  | 'throw-rope'
  | 'tool-generic'
  | 'quirt'
  | 'aim'
  | 'eat-food'
  | 'mount'
  | 'dismount'
  | 'open-crate'
  | 'toggle-gate'

export type ItemAction =
  | { kind: 'untie-rope' }
  | { kind: 'destroy-post' }
  | { kind: 'destroy-crate' }
  | { kind: 'destroy-plot' }
  | { kind: 'destroy-pipe' }
  | { kind: 'destroy-wood' }
  | { kind: 'destroy-gate' }
  | { kind: 'chop-tree'; sprite: string; scale: number }
  | { kind: 'mine-rock'; sprite: string; scale: number }
  | { kind: 'dig'; sprite: string; scale: number }
  | { kind: 'plant-sapling'; sprite: string; scale: number }
  | { kind: 'place-post'; sprite: string; scale: number }
  | { kind: 'place-crate'; sprite: string; scale: number }
  | { kind: 'place-plank'; sprite: string; scale: number }
  | { kind: 'place-water'; sprite: string; scale: number }
  | { kind: 'place-gate'; sprite: string; scale: number }
  | { kind: 'throw-rope'; sprite: string; scale: number }
  | { kind: 'tool-generic'; sprite: string; scale: number }
  | { kind: 'quirt'; sprite: string; scale: number; gear: number }
  | { kind: 'aim'; sprite: string; scale: number; bullets?: string }
  | { kind: 'eat-food'; sprite: string; scale: number }
  | { kind: 'mount'; sprite: string; scale: number; tint: number | null }
  | { kind: 'dismount'; sprite: string; scale: number; tint: number | null }
  | { kind: 'open-crate' }
  | { kind: 'toggle-gate' }

export const ACTION_CURSOR: Record<ActionKind, { texture: string; scale: number } | 'tool'> = {
  'untie-rope':    { texture: 'cursor_x', scale: 2 },
  'destroy-post':  { texture: 'cursor_x', scale: 2 },
  'destroy-crate': { texture: 'cursor_x', scale: 2 },
  'destroy-plot':  { texture: 'cursor_x', scale: 2 },
  'destroy-pipe':  { texture: 'cursor_x', scale: 2 },
  'destroy-wood':  { texture: 'cursor_x', scale: 2 },
  'destroy-gate':  { texture: 'cursor_x', scale: 2 },
  'chop-tree':     'tool',
  'mine-rock':     'tool',
  'dig':           'tool',
  'plant-sapling': 'tool',
  'place-post':    'tool',
  'place-crate':   'tool',
  'place-plank':   'tool',
  'place-water':   'tool',
  'place-gate':    'tool',
  'throw-rope':    'tool',
  'tool-generic':  'tool',
  'quirt':         'tool',
  'aim':           'tool',
  'eat-food':      'tool',
  'mount':         'tool',
  'dismount':      'tool',
  'open-crate':    { texture: 'cursor_grab', scale: 2 },
  'toggle-gate':   { texture: 'item_fence_gate', scale: 2 },
}

export interface WorldContext {
  playerX(): number
  playerY(): number

  canDestroyCrate(wx: number, wy: number): number | null
  canDestroyPost(wx: number, wy: number): number | null
  canDestroyGate(wx: number, wy: number): number | null
  canDestroyPlot(wx: number, wy: number): number | null
  canDestroyPipe(wx: number, wy: number): number | null
  canDestroyWood(wx: number, wy: number): boolean
  canChopTree(wx: number, wy: number): boolean
  canMineRock(wx: number, wy: number): boolean
  canMount(): number | null
  canDismount(wx: number, wy: number): number | null
  canOpenCrate(wx: number, wy: number): number | null
  canToggleGate(wx: number, wy: number): number | null
  findPlantableDirtSpot(wx: number, wy: number): boolean
  isNearTiedRope(wx: number, wy: number): boolean
  isRopeAttached(): boolean
  crateReach(): number

  gunAmmo: number
  lastFireAt: number
  gunFullReloadUntil: number
  lastGunSlot: number
  horseGear: number
}

export interface ClickHandlers {
  untieRope(wx: number, wy: number): boolean
  setAxeSwung(swung: boolean): void
  eatFromSlot(): boolean
  spawnCrumbs(x: number, y: number, color: number): void
  fireBullet(tx: number, ty: number, spread: number): boolean
  throwRope(tx: number, ty: number): boolean
  tryDestroyCrate(wx: number, wy: number): boolean
  tryDestroyPost(wx: number, wy: number): boolean
  tryDestroyGate(wx: number, wy: number): boolean
  tryDestroyPlot(wx: number, wy: number): boolean
  tryDestroyPipe(wx: number, wy: number): boolean
  tryDestroyWood(wx: number, wy: number): boolean
  tryChop(wx: number, wy: number): boolean
  tryMine(wx: number, wy: number): boolean
  tryDig(wx: number, wy: number): boolean
  tryAxeEnemy(wx: number, wy: number): boolean
  tryPlaceCrate(wx: number, wy: number): boolean
  tryOpenCrate(wx: number, wy: number): boolean
  tryToggleGate(wx: number, wy: number): boolean
}

export function dispatchClick(
  ctx: WorldContext,
  handlers: ClickHandlers,
  clickX: number,
  clickY: number,
): boolean {
  if (handlers.untieRope(clickX, clickY)) return true

  const sel = state.inventory[state.selectedInventorySlot]
  const heldType = sel?.type ?? null

  if (heldType !== null && ITEMS[heldType].edible) {
    if (handlers.eatFromSlot()) {
      const def = ITEMS[heldType]
      if (def.crumbColor != null) handlers.spawnCrumbs(ctx.playerX(), ctx.playerY(), def.crumbColor)
      return true
    }
    return false
  }

  if (heldType === 'axe') {
    handlers.setAxeSwung(true)
    if (handlers.tryAxeEnemy(clickX, clickY)) return true
    if (handlers.tryChop(clickX, clickY)) return true
    if (handlers.tryDestroyPost(clickX, clickY)) return true
    if (handlers.tryDestroyCrate(clickX, clickY)) return true
    if (handlers.tryDestroyGate(clickX, clickY)) return true
    if (handlers.tryDestroyPlot(clickX, clickY)) return true
    if (handlers.tryDestroyPipe(clickX, clickY)) return true
    if (handlers.tryDestroyWood(clickX, clickY)) return true
    return false
  }

  if (heldType === 'pickaxe') {
    handlers.setAxeSwung(true)
    if (handlers.tryMine(clickX, clickY)) return true
    if (handlers.tryDestroyPost(clickX, clickY)) return true
    if (handlers.tryDestroyCrate(clickX, clickY)) return true
    if (handlers.tryDestroyGate(clickX, clickY)) return true
    if (handlers.tryDestroyPlot(clickX, clickY)) return true
    if (handlers.tryDestroyPipe(clickX, clickY)) return true
    if (handlers.tryDestroyWood(clickX, clickY)) return true
    return false
  }

  if (heldType === 'rope') {
    return handlers.throwRope(clickX, clickY)
  }

  const selDef = sel ? ITEMS[sel.type] : null
  if (selDef && selDef.gunSpread != null) {
    // The GunController behind the handler owns ammo, cadence, and reload.
    return handlers.fireBullet(clickX, clickY, selDef.gunSpread)
  }

  if (heldType === 'shovel') {
    return handlers.tryDig(clickX, clickY)
  }

  if (handlers.tryPlaceCrate(clickX, clickY)) return true
  if (handlers.tryOpenCrate(clickX, clickY)) return true
  if (handlers.tryToggleGate(clickX, clickY)) return true

  return false
}

export function resolveAction(
  ctx: WorldContext,
  worldX: number,
  worldY: number,
  isDragHolding: boolean,
): ItemAction | null {
  if (isDragHolding) return null

  const sel = state.inventory[state.selectedInventorySlot]
  const heldType = sel?.type ?? null
  const tool = state.getSelectedTool()
  const isDestroyTool = heldType === 'axe' || heldType === 'pickaxe'

  if (ctx.isNearTiedRope(worldX, worldY)) {
    return { kind: 'untie-rope' }
  }

  if (heldType !== null && ITEMS[heldType].edible) {
    return { kind: 'eat-food', sprite: ITEMS[heldType].sprite, scale: ITEMS[heldType].scale }
  }

  if (isDestroyTool) {
    if (ctx.canDestroyPost(worldX, worldY) !== null) return { kind: 'destroy-post' }
    if (ctx.canDestroyCrate(worldX, worldY) !== null) return { kind: 'destroy-crate' }
    if (ctx.canDestroyGate(worldX, worldY) !== null) return { kind: 'destroy-gate' }
    if (ctx.canDestroyPlot(worldX, worldY) !== null) return { kind: 'destroy-plot' }
    if (ctx.canDestroyPipe(worldX, worldY) !== null) return { kind: 'destroy-pipe' }
    if (ctx.canDestroyWood(worldX, worldY)) return { kind: 'destroy-wood' }
    if (heldType === 'axe' && ctx.canChopTree(worldX, worldY)) return { kind: 'chop-tree', sprite: tool!.sprite, scale: tool!.scale }
  }

  if (heldType === 'pickaxe' && ctx.canMineRock(worldX, worldY)) {
    return { kind: 'mine-rock', sprite: tool!.sprite, scale: tool!.scale }
  }

  if (tool) {
    const dx = worldX - ctx.playerX()
    const dy = worldY - ctx.playerY()
    const reach = (heldType === 'crate' || heldType === 'chest' || heldType === 'silver_lockbox' || heldType === 'gold_lockbox') ? ctx.crateReach() : TOOL_RANGE
    const inRange = dx * dx + dy * dy <= reach * reach

    if (heldType === 'shovel' && inRange) {
      return { kind: 'dig', sprite: tool.sprite, scale: tool.scale }
    }
    if (heldType === 'cottonwood_sapling') {
      if (inRange && ctx.findPlantableDirtSpot(worldX, worldY)) {
        return { kind: 'plant-sapling', sprite: tool.sprite, scale: tool.scale }
      }
      return null
    }
    if ((heldType === 'post' || heldType === 'cedar_post' || heldType === 'iron_post' || heldType === 'wood_wall') && inRange) {
      return { kind: 'place-post', sprite: tool.sprite, scale: tool.scale }
    }
    if ((heldType === 'crate' || heldType === 'chest') && inRange) {
      return { kind: 'place-crate', sprite: tool.sprite, scale: tool.scale }
    }
    if ((heldType === 'plank' || heldType === 'flagstone' || heldType === 'sandstone') && inRange) {
      return { kind: 'place-plank', sprite: tool.sprite, scale: tool.scale }
    }
    if (heldType === 'water' && inRange) {
      const T = WOOD_TILE
      const wb = state.worldBounds
      const cx = Math.floor((worldX - wb.minX) / T) * T + wb.minX + T / 2
      const cy = Math.floor((worldY - wb.minY) / T) * T + wb.minY + T / 2
      if (!state.placedWaters.some(w => w.x === cx && w.y === cy)) {
        return { kind: 'place-water', sprite: tool.sprite, scale: tool.scale }
      }
    }
    if (heldType === 'fence_gate' && inRange) {
      return { kind: 'place-gate', sprite: tool.sprite, scale: tool.scale }
    }
    if (heldType === 'rope') {
      return { kind: 'throw-rope', sprite: tool.sprite, scale: tool.scale }
    }
    if (heldType === 'quirt') {
      return { kind: 'quirt', sprite: tool.sprite, scale: tool.scale, gear: ctx.horseGear }
    }
    if (tool.gunSpread != null) {
      if (state.selectedInventorySlot !== ctx.lastGunSlot) {
        ctx.lastFireAt = 0
        ctx.gunFullReloadUntil = 0
        ctx.gunAmmo = tool.gunAmmo ?? 1
        ctx.lastGunSlot = state.selectedInventorySlot
      }
      const reloading = state.gameTime < ctx.gunFullReloadUntil
        || state.gameTime - ctx.lastFireAt < (tool.gunReloadMs ?? 0)
      const reticle = reloading ? 'crosshair_empty' : 'crosshair'
      if (tool.gunAmmo != null) {
        const shown = reloading && state.gameTime < ctx.gunFullReloadUntil ? 0 : ctx.gunAmmo
        return { kind: 'aim', sprite: reticle, scale: 3, bullets: `bullets_${shown}` }
      }
      return { kind: 'aim', sprite: reticle, scale: 3 }
    }
    if (inRange) {
      return { kind: 'tool-generic', sprite: tool.sprite, scale: tool.scale }
    }
    return null
  }

  if (state.mounted !== null) {
    const di = ctx.canDismount(worldX, worldY)
    if (di !== null) {
      const h = state.honses[di]
      return { kind: 'dismount', sprite: h.sprite, scale: 1, tint: h.tinted ? h.tint : null }
    }
  }

  if (state.mounted === null && !ctx.isRopeAttached()) {
    const mi = ctx.canMount()
    if (mi !== null) {
      const h = state.honses[mi]
      return { kind: 'mount', sprite: h.sprite, scale: 1, tint: h.tinted ? h.tint : null }
    }
  }

  if (state.mounted === null) {
    if (ctx.canOpenCrate(worldX, worldY) !== null) return { kind: 'open-crate' }
    if (ctx.canToggleGate(worldX, worldY) !== null) return { kind: 'toggle-gate' }
  }

  return null
}