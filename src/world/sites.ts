// sites.ts — trail-side point-of-interest "modules".
//
// A SITE is a placed instance of a SITE TEMPLATE somewhere along the trail.
// A TEMPLATE is authored data describing a formation of buildings: a lone
// abandoned house today, a 3–5 building ghost town with a church later, a
// bandit camp eventually. The system is three layers, mirroring how the rest
// of the world works (catalog → seeded placement → instantiation):
//
//   1. SITE_TEMPLATES (this file)      — the catalog: pure data, no logic.
//   2. scatterSites (this file)        — seeded placement: picks where each
//                                        site goes along the trail and which
//                                        template it is. Returns plain data.
//   3. Overworld.instantiateSite       — builds a placed site into the world:
//                                        walkable buildings become enterable
//                                        worldStructures, decor buildings get
//                                        sprite + collision only.
//
// Adding variety later = adding TEMPLATES (and fields like `enemies`), NOT
// touching placement or instantiation. That's the property that lets this
// grow from "more houses" into "villages and camps" without a rewrite.

import type { WorldStructureType } from './structures'
import type { ItemType } from '../items/types'
import type { DecorType } from './decor'

// One building within a template, positioned relative to the site origin.
// `sprite` and `walkable` are INDEPENDENT: any sprite can be an enterable
// building or a sealed decor shell. Walkable buildings route to the interior
// system and carry their own loot; decor buildings are just sprite+collision
// (the empty husks that make a ghost town read as mostly-dead).
export interface SiteBuilding {
  type: WorldStructureType
  dx: number
  dy: number
  walkable: boolean
  flipX?: boolean
  tint?: number
  loot?: { x: number; y: number; type: ItemType; count?: number }[]
}

export interface SiteTemplate {
  id: string
  name: string
  buildings: SiteBuilding[]
  decor?: { dx: number; dy: number; sprite: string; scale: number; depth?: number }[]
  // Solid decor placed relative to the site origin. Unlike `decor` (pure visual,
  // walk-through), each entry gets a collider from its DECOR catalog hitbox via
  // the shared placeNonEnterable path. Sprite/scale/hitbox resolve from DECOR and
  // ITEMS, so an entry only names a type and position.
  solidDecor?: { dx: number; dy: number; type: DecorType }[]
  // Wells placed relative to the site origin. A working well (dry omitted/false)
  // produces water and is walk-up enterable; a dry well is decor + collision.
  wells?: { dx: number; dy: number; dry?: boolean }[]
  posts?: { dx: number; dy: number; species: 'post' | 'cedar_post' | 'iron_post' }[]
  // Buyable building plots placed relative to the site origin. Each becomes a
  // real plot (same as the starter farm) the player can build on. Pure data —
  // instantiation creates them via the shared createPlotAt path.
  plots?: { dx: number; dy: number }[]
  path?: { startDy: number; endDy: number; width: number }
  tintTypes?: WorldStructureType[]
  // Forces which side of the trail this site sits on. Omitted = random side.
  side?: 'north' | 'south'
  // Per-template perpendicular distance from the trail. Omitted = shared
  // SITE_OFFSET_MIN/MAX. Lets towns sit farther out without moving lone houses.
  offsetMin?: number
  offsetMax?: number
  scatterTrees?: { count: number; radius: number; minDist: number }
  scatterGrass?: { count: number; radius: number; dy?: number }
}

// A placed site: which template, and where its origin sits in the world.
export interface PlacedSite {
  templateId: string
  x: number
  y: number
}

// ---- catalog ----
// Today: just the lone abandoned house (one walkable building, no loot — the
// scattered frontier houses are empty husks, unlike the authored hemp house
// in town). Ghost-town and camp templates get added here later.
export const SITE_TEMPLATES: Record<string, SiteTemplate> = {
  lone_house: {
    id: 'lone_house',
    name: 'Abandoned House',
    tintTypes: ['abandoned_house'],
    buildings: [
      { type: 'abandoned_house', dx: 0, dy: 0, walkable: true, loot: [] },
    ],
  },
  settlement_small: {
    id: 'settlement_small',
    name: 'Small Settlement',
    tintTypes: ['abandoned_house', 'long_house'],
    buildings: [
      { type: 'house_roof',      dx: 150, dy: -10, walkable: false, loot: [] },
      { type: 'abandoned_house', dx: -102, dy: -95, walkable: true, loot: [] },
      { type: 'abandoned_house', dx:  72, dy: -65, walkable: true, loot: [] },
      { type: 'long_house',      dx: -72, dy:  63, walkable: true, loot: [] },
      { type: 'long_house',      dx:  63, dy:  63, walkable: true, flipX: true, loot: [] },
      { type: 'church_bell_back', dx:   0, dy: 200, walkable: true, loot: [] },
    ],
    // Small graveyard behind (south of) the church at dy 200. A 5x3 grid of
    // tiny wooden crosses, spread wide — pure decor, no collision. Low fixed
    // depth so the player always walks in front of them (ground markers).
    decor: [
      { dx: -48, dy: 246, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx: -24, dy: 246, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx:   0, dy: 246, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx:  24, dy: 246, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx:  48, dy: 246, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx: -48, dy: 268, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx: -24, dy: 268, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx:   0, dy: 268, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx:  24, dy: 268, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx:  48, dy: 268, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx: -48, dy: 290, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx: -24, dy: 290, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx:   0, dy: 290, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx:  24, dy: 290, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx:  48, dy: 290, sprite: 'grave_cross', scale: 2, depth: 1 },
      { dx: -68, dy: 204, sprite: 'bush', scale: 2 },
      { dx:  86, dy: -120, sprite: 'bush', scale: 2 },
      { dx: -54, dy: -168, sprite: 'bush', scale: 2 },
    ],
    side: 'south',
    offsetMin: 250,
    offsetMax: 250,
    wells: [{ dx: -120, dy: -164, dry: true }],
    path: { startDy: -60, endDy: 195, width: 14 },
    posts: [
      { dx: -127, dy: -105, species: 'post' },
      { dx: -147, dy: -105, species: 'post' },
      { dx: -137, dy: -105, species: 'post' },
      { dx: -147, dy: -95, species: 'post' },
      { dx: -147, dy: -85, species: 'post' },
      { dx: -137, dy: -85, species: 'post' },
      { dx: -127, dy: -85, species: 'post' },
      { dx: 40, dy: 226, species: 'iron_post' },
      { dx: 50, dy: 226, species: 'iron_post' },
      { dx: 60, dy: 226, species: 'iron_post' },
      { dx: 70, dy: 226, species: 'iron_post' },
      { dx: 80, dy: 226, species: 'iron_post' },
      { dx: 90, dy: 226, species: 'iron_post' },
      { dx: 90, dy: 216, species: 'iron_post' },
      { dx: 90, dy: 206, species: 'iron_post' },
      { dx: -40, dy: 226, species: 'iron_post' },
      { dx: -50, dy: 226, species: 'iron_post' },
      { dx: -60, dy: 226, species: 'iron_post' },
      { dx: -70, dy: 226, species: 'iron_post' },
      { dx: -80, dy: 226, species: 'iron_post' },
      { dx: -90, dy: 226, species: 'iron_post' },
      { dx: -90, dy: 216, species: 'iron_post' },
      { dx: -90, dy: 206, species: 'iron_post' },
    ],
    scatterTrees: { count: 3, radius: 180, minDist: 10 },
    scatterGrass: { count: 12, radius: 230, dy: 30 },
    plots: [{ dx: -160, dy: 60 }],
  },
  settlement_small_north: {
    id: 'settlement_small_north',
    name: 'Small Settlement',
    tintTypes: ['abandoned_house', 'long_house'],
    buildings: [
      { type: 'church_bell', dx:   0, dy: -200, walkable: true, loot: [] },
      { type: 'house_roof',      dx: 150, dy:  10, walkable: false, loot: [] },
      { type: 'long_house',      dx: -72, dy:  -63, walkable: true, loot: [] },
      { type: 'long_house',      dx:  63, dy:  -63, walkable: true, flipX: true, loot: [] },
      { type: 'abandoned_house', dx: -72, dy:   70, walkable: true, loot: [] },
      { type: 'house_roof', dx:  72, dy:   70, walkable: false, loot: [] },
    ],
    decor: [
      { dx: -73, dy: -151, sprite: 'bush', scale: 2 },
      { dx: -59, dy: -151, sprite: 'bush', scale: 2 },
      { dx:  71, dy: -151, sprite: 'bush', scale: 2 },
      { dx:  56, dy: -151, sprite: 'bush', scale: 2 },
      { dx: -101, dy: -2, sprite: 'bush', scale: 2 },
      { dx: -84, dy: 17, sprite: 'bush', scale: 2 },
      { dx: -78, dy: -1, sprite: 'bush', scale: 2 },
      { dx: -61, dy: 159, sprite: 'bush', scale: 2 },
      { dx: 164, dy: -96, sprite: 'bush', scale: 2 },
    ],
    solidDecor: [
      { dx: 121, dy: 16, type: 'barrel' },
    ],
    side: 'north',
    offsetMin: 250,
    offsetMax: 250,
    wells: [{ dx: -120, dy: -160 }],
    path: { startDy: -195, endDy: 60, width: 14 },
    posts: [
      { dx: -90, dy: 84, species: 'post' },
      { dx: -100, dy: 84, species: 'post' },
      { dx: -110, dy: 84, species: 'post' },
      { dx: -110, dy: 74, species: 'post' },
      { dx: -110, dy: 64, species: 'post' },
      { dx: -100, dy: 64, species: 'post' },
      { dx: -90, dy: 64, species: 'post' },
      { dx: 40, dy: -166, species: 'iron_post' },
      { dx: 50, dy: -166, species: 'iron_post' },
      { dx: 60, dy: -166, species: 'iron_post' },
      { dx: 70, dy: -166, species: 'iron_post' },
      { dx: 80, dy: -166, species: 'iron_post' },
      { dx: 90, dy: -166, species: 'iron_post' },
      { dx: 90, dy: -156, species: 'iron_post' },
      { dx: 90, dy: -146, species: 'iron_post' },
      { dx: -40, dy: -166, species: 'iron_post' },
      { dx: -50, dy: -166, species: 'iron_post' },
      { dx: -60, dy: -166, species: 'iron_post' },
      { dx: -70, dy: -166, species: 'iron_post' },
      { dx: -80, dy: -166, species: 'iron_post' },
      { dx: -90, dy: -166, species: 'iron_post' },
      { dx: -90, dy: -156, species: 'iron_post' },
      { dx: -90, dy: -146, species: 'iron_post' },
    ],
    scatterTrees: { count: 3, radius: 180, minDist: 10 },
    scatterGrass: { count: 12, radius: 230, dy: -20 },
    plots: [{ dx: -165, dy: -10 }],
  },
}

// Mulberry32 — same deterministic PRNG family the rest of gen uses, so a given
// seed always lays the sites out identically (and a different world differs).
function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Interpolate the trail's Y at a given X (trail runs east→west, monotonic-ish
// in X). Mirrors the herd-site helper so sites sit on the trail's actual line.
// Exported so instantiation can extend a town's path to meet the trail.
export function trailYAtX(waypoints: { x: number; y: number }[], x: number): number {
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]
    const b = waypoints[i + 1]
    const loX = Math.min(a.x, b.x)
    const hiX = Math.max(a.x, b.x)
    if (x >= loX && x <= hiX) {
      const span = b.x - a.x
      if (Math.abs(span) < 0.0001) return a.y
      return a.y + (b.y - a.y) * ((x - a.x) / span)
    }
  }
  return Math.abs(x - waypoints[0].x) < Math.abs(x - waypoints[waypoints.length - 1].x)
    ? waypoints[0].y
    : waypoints[waypoints.length - 1].y
}

// Site placement tuning.
const SITE_X_MARGIN = 2500        // keep sites this far from the trail's start/end
const SITE_OFFSET_MIN = 140       // perpendicular distance from the trail line — off
const SITE_OFFSET_MAX = 280       // the path, but within sight of a traveller on it
const SITE_MIN_SPACING = 6000     // min X-distance between sites, so they're spread out

// Pick `count` sites spread along the WHOLE trail, each assigned a template.
// Seeded → reproducible per world. Sites are spaced at least SITE_MIN_SPACING
// apart in X and set a short perpendicular distance off the trail (so a tree
// can still grow between the buildings and the path — exclusions are per-
// building, handled at instantiation, not a big per-site keep-out).
export function scatterSites(
  waypoints: { x: number; y: number }[],
  seed: number,
  count: number,
  templateIds: string[],
  avoidXs: number[] = [],
  required = false,
  minSiteX?: number,
): PlacedSite[] {
  const rng = makeRng(seed)
  const startX = waypoints[0].x
  const endX = waypoints[waypoints.length - 1].x
  let loX = Math.min(startX, endX) + SITE_X_MARGIN
  const hiX = Math.max(startX, endX) - SITE_X_MARGIN
  // Keep sites east of the western grass/fort zone if a floor is given.
  if (minSiteX !== undefined && loX < minSiteX) loX = minSiteX
  const span = hiX - loX
  if (span <= 0 || templateIds.length === 0) return []

  const sites: PlacedSite[] = []
  // Seed the spacing check with positions from prior calls so sites placed by
  // separate scatter passes (e.g. houses then towns) still spread apart.
  const chosenXs: number[] = [...avoidXs]
  // Spacing the new sites must keep from each other and from avoidXs. For a
  // required scatter, this relaxes on each pass below so the full count always
  // places even on a crowded trail.
  let spacing = SITE_MIN_SPACING
  let attempts = 0
  const maxAttempts = count * 40
  while (sites.length < count && attempts < maxAttempts) {
    attempts++
    const x = loX + rng() * span
    // enforce spacing from already-placed sites
    let tooClose = false
    for (const cx of chosenXs) {
      if (Math.abs(x - cx) < spacing) { tooClose = true; break }
    }
    if (tooClose) continue

    const trailY = trailYAtX(waypoints, x)
    const templateId = templateIds[Math.floor(rng() * templateIds.length)]
    const tpl = SITE_TEMPLATES[templateId]
    // North = smaller Y (offset -1), south = larger Y (+1). A template can pin
    // its side; otherwise pick randomly.
    const forcedSide = tpl?.side
    const randomSide = rng() < 0.5 ? -1 : 1
    const side = forcedSide === 'north' ? -1 : forcedSide === 'south' ? 1 : randomSide
    // Per-template offset overrides the shared default (so towns can sit farther
    // from the trail without moving lone houses, which use the shared values).
    const offMin = tpl?.offsetMin ?? SITE_OFFSET_MIN
    const offMax = tpl?.offsetMax ?? SITE_OFFSET_MAX
    const offset = offMin + rng() * (offMax - offMin)
    sites.push({ templateId, x: Math.floor(x), y: Math.floor(trailY + side * offset) })
    chosenXs.push(x)
  }

  // A required scatter must place its full count. If spacing crowded it out,
  // halve the spacing and try again for the remainder (down to a small floor),
  // so a guaranteed town never silently fails to generate.
  while (required && sites.length < count && spacing > 500) {
    spacing = Math.floor(spacing / 2)
    attempts = 0
    while (sites.length < count && attempts < maxAttempts) {
      attempts++
      const x = loX + rng() * span
      let tooClose = false
      for (const cx of chosenXs) {
        if (Math.abs(x - cx) < spacing) { tooClose = true; break }
      }
      if (tooClose) continue
      const trailY = trailYAtX(waypoints, x)
      const templateId = templateIds[Math.floor(rng() * templateIds.length)]
      const tpl = SITE_TEMPLATES[templateId]
      const forcedSide = tpl?.side
      const randomSide = rng() < 0.5 ? -1 : 1
      const side = forcedSide === 'north' ? -1 : forcedSide === 'south' ? 1 : randomSide
      const offMin = tpl?.offsetMin ?? SITE_OFFSET_MIN
      const offMax = tpl?.offsetMax ?? SITE_OFFSET_MAX
      const offset = offMin + rng() * (offMax - offMin)
      sites.push({ templateId, x: Math.floor(x), y: Math.floor(trailY + side * offset) })
      chosenXs.push(x)
    }
  }
  return sites
}
