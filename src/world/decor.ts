// Solid decor — small placeable objects with no interior, not owned. Sprite
// plus an optional base-anchored collision footprint. Render scale comes from
// the item def (ITEMS[type].scale) so the placed object always matches its
// inventory icon — single source of truth.
//
// solid: true  → blocks movement; hitbox is the base box (w/h in world px, dy
//                nudges it down from the sprite anchor so you can stand behind it).
// solid: false → pure visual decor, walk-through, no collision.

export type DecorType = 'barrel' | 'bush' | 'rock_small'

export interface DecorDef {
  sprite: string
  solid: boolean
  hitbox?: { w: number; h: number; dy: number }
}

export const DECOR: Record<DecorType, DecorDef> = {
  barrel:     { sprite: 'barrel',     solid: true, hitbox: { w: 14, h: 12, dy: 2 } },
  bush:       { sprite: 'bush',       solid: false },
  rock_small: { sprite: 'rock_small', solid: false },
}

export function isDecorType(t: string): t is DecorType {
  return t in DECOR
}
