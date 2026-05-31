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

// One building within a template, positioned relative to the site origin.
// `sprite` and `walkable` are INDEPENDENT: any sprite can be an enterable
// building or a sealed decor shell. Walkable buildings route to the interior
// system and carry their own loot; decor buildings are just sprite+collision
// (the empty husks that make a ghost town read as mostly-dead).
export interface SiteBuilding {
  // Which structure type / sprite this building uses. Reuses the existing
  // WorldStructureType catalog (abandoned_house, church, shop, ...) so it
  // renders and (if walkable) enters through machinery that already exists.
  type: WorldStructureType
  // Offset from the site origin, in world px. Authored so a formation reads
  // as a deliberate place (church here, houses around it), not random scatter.
  dx: number
  dy: number
  // Enterable (own interior + loot) vs decor (sealed shell, collision only).
  walkable: boolean
  // Loot for a walkable building's interior, seeded on first visit. Omit/empty
  // for no loot. Ignored for decor buildings. (Wiring of per-building loot into
  // the interior is a later step; today the lone-house template carries none so
  // scattered houses spawn empty, distinct from the authored hemp house.)
  loot?: { x: number; y: number; type: ItemType; count?: number }[]
}

export interface SiteTemplate {
  id: string
  name: string
  buildings: SiteBuilding[]
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
    buildings: [
      { type: 'abandoned_house', dx: 0, dy: 0, walkable: true, loot: [] },
    ],
  },
}

// ---- seeded placement ----

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
function trailYAtX(waypoints: { x: number; y: number }[], x: number): number {
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
const SITE_OFFSET_MIN = 220       // perpendicular distance from the trail line — off
const SITE_OFFSET_MAX = 520       // the path, but within sight of a traveller on it
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
): PlacedSite[] {
  const rng = makeRng(seed)
  const startX = waypoints[0].x
  const endX = waypoints[waypoints.length - 1].x
  const loX = Math.min(startX, endX) + SITE_X_MARGIN
  const hiX = Math.max(startX, endX) - SITE_X_MARGIN
  const span = hiX - loX
  if (span <= 0 || templateIds.length === 0) return []

  const sites: PlacedSite[] = []
  const chosenXs: number[] = []
  let attempts = 0
  const maxAttempts = count * 40
  while (sites.length < count && attempts < maxAttempts) {
    attempts++
    const x = loX + rng() * span
    // enforce spacing from already-placed sites
    let tooClose = false
    for (const cx of chosenXs) {
      if (Math.abs(x - cx) < SITE_MIN_SPACING) { tooClose = true; break }
    }
    if (tooClose) continue

    const trailY = trailYAtX(waypoints, x)
    const side = rng() < 0.5 ? -1 : 1
    const offset = SITE_OFFSET_MIN + rng() * (SITE_OFFSET_MAX - SITE_OFFSET_MIN)
    const templateId = templateIds[Math.floor(rng() * templateIds.length)]
    sites.push({ templateId, x: Math.floor(x), y: Math.floor(trailY + side * offset) })
    chosenXs.push(x)
  }
  return sites
}
