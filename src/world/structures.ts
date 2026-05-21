// World structures — fixed buildings that aren't part of the plot grid.
// Shop, church, future NPC houses, dungeon entrances, etc. The player walks
// into them but doesn't own them, doesn't pay for them, and they don't tick
// gold or produce items.
//
// Compare with src/game/state.ts BUILDINGS for the plot-building registry.
// Same split: this file is the catalog (types + metadata); state holds the
// instances (where they're placed in the world).

export type WorldStructureType = 'shop' | 'church' | 'general_store' | 'abandoned_house' | 'land_office' | 'nursery' | 'tanner'   // future: 'npc_house', ...

export interface WorldStructureDef {
  name: string
  sprite: string         // texture key registered in sprites/data.ts
  scale: number          // on-screen render scale
  // The interior background texture key, or undefined for a flat backdrop.
  interiorBg?: string
}

export const WORLD_STRUCTURES: Record<WorldStructureType, WorldStructureDef> = {
  shop: { name: 'Tool Shop', sprite: 'shop', scale: 3 },
  church: { name: 'Church', sprite: 'church', scale: 3 },
  general_store: { name: 'General Store', sprite: 'general_store', scale: 3 },
  abandoned_house: { name: 'Abandoned House', sprite: 'abandoned_house', scale: 3 },
  land_office: { name: 'Land Office', sprite: 'land_office', scale: 3 },
  nursery: { name: 'Nursery', sprite: 'nursery', scale: 3 },
  tanner: { name: 'Tanner', sprite: 'nursery', scale: 3 },
}

// A single placed instance in the world.
export interface WorldStructure {
  type: WorldStructureType
  x: number
  y: number
  // Which town this structure belongs to. null = unaffiliated.
  townId: string | null
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
