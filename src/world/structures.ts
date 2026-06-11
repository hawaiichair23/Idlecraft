// World structures — fixed buildings that aren't part of the plot grid.
// Shop, church, future NPC houses, dungeon entrances, etc. The player walks
// into them but doesn't own them, doesn't pay for them, and they don't tick
// gold or produce items.
//
// Compare with src/game/state.ts BUILDINGS for the plot-building registry.
// Same split: this file is the catalog (types + metadata); state holds the
// instances (where they're placed in the world).

export type WorldStructureType = 'shop' | 'church' | 'church_bell' | 'church_bell_back' | 'general_store' | 'abandoned_house' | 'house_roof' | 'long_house' | 'land_office' | 'nursery' | 'tanner'   // future: 'npc_house', ...

export interface WorldStructureDef {
  name: string
  sprite: string
  scale: number
  interiorBg?: string
  tint?: number   // applied to the (white) base sprite when no per-instance tint is set
}

export const WORLD_STRUCTURES: Record<WorldStructureType, WorldStructureDef> = {
  shop: { name: 'Tool Shop', sprite: 'shop', scale: 3, tint: 0xA5805F },
  church: { name: 'Church', sprite: 'church', scale: 3 },
  church_bell: { name: 'Bell Church', sprite: 'church_bell', scale: 3 },
  church_bell_back: { name: 'Bell Church', sprite: 'church_bell_back', scale: 3 },
  general_store: { name: 'General Store', sprite: 'shop', scale: 3, tint: 0xA6BC78 },
  abandoned_house: { name: 'Abandoned House', sprite: 'abandoned_house', scale: 3 },
  house_roof: { name: 'House', sprite: 'house_roof', scale: 3 },
  long_house: { name: 'Long House', sprite: 'long_house', scale: 3 },
  land_office: { name: 'Land Office', sprite: 'shop', scale: 3, tint: 0xC8A86A },
  nursery: { name: 'Nursery', sprite: 'shop', scale: 3, tint: 0x9CB592 },
  tanner: { name: 'Tanner', sprite: 'shop', scale: 3, tint: 0x9C6B43 },
}

// A single placed instance in the world.
export interface WorldStructure {
  type: WorldStructureType
  x: number
  y: number
  townId: string | null
  flipX?: boolean
  tint?: number
  loot?: { x: number; y: number; type: string; count?: number }[]
}

// A town is a logical grouping of structures plus discovery state.
// Walking near any of its structures will "discover" the town and can
// unlock NPC dialogue, map markers, etc.
export interface Town {
  id: string
  name: string
  // Center used for the discovery proximity check.
  x: number
  y: number
  radius: number   // discovery radius
}

// Catalog of towns. For now: one in the north containing the shop. The
// church will land in this same town later.
export const TOWNS: Town[] = [
  { id: 'northern_town', name: 'Northern Town', x: 2400, y: 504, radius: 240 },
]
