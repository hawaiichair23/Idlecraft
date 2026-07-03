import type { Sprite } from '../sprites/data'

export type TroughKind = 'water' | 'hay'

export interface TroughPalette {
  cap: string
  mid: string
  high: string
  surface: string
  seamColor: string
}

export const TROUGH_PALETTES: Record<TroughKind, TroughPalette> = {
  water: {
    cap: '#a06f49',
    mid: '#4d321c',
    high: '#5c3a23',
    surface: '#99bec6',
    seamColor: '#99bec6',
  },
  hay: {
    cap: '#a06f49',
    mid: '#4d321c',
    high: '#5c3a23',
    surface: '#f4c93b',
    seamColor: '#f4c93b',
  },
}

export type TroughVariantKey =
  | 'base'
  | 'below'
  | 'right'
  | 'left'
  | 'middle'
  | 'left_below'
  | 'right_below'
  | 'middle_below'

export function pickTroughVariantKey(
  hasNeighbor: (cx: number, cy: number) => boolean,
  x: number,
  y: number,
  T: number,
): TroughVariantKey {
  const right = hasNeighbor(x + T, y)
  const left = hasNeighbor(x - T, y)
  const below = hasNeighbor(x, y + T)
  if (left && right && below) return 'middle_below'
  if (left && right) return 'middle'
  if (right && below) return 'right_below'
  if (left && below) return 'left_below'
  if (right) return 'right'
  if (below) return 'below'
  if (left) return 'left'
  return 'base'
}

export const TROUGH_FILL_LEVELS = 4

export function troughSpriteKey(kind: TroughKind, variant: TroughVariantKey, level: number): string {
  const levelTag = level === TROUGH_FILL_LEVELS ? '' : `_l${level}`
  if (variant === 'base') return `item_${kind}${levelTag}`
  if (levelTag === '') return `item_${kind}_${variant}`
  return `item_${kind}${levelTag}_${variant}`
}

type Token = 'C' | 'M' | 'H' | 'S' | null
const C: Token = 'C'
const M: Token = 'M'
const H: Token = 'H'
const S: Token = 'S'

const BASE: Token[][] = [
  [C, M, M, M, M, M, M, M, M, M, M, C],
  [C, M, M, M, M, M, M, M, M, M, M, C],
  [C, S, S, S, S, S, S, S, S, S, S, C],
  [C, S, S, S, S, S, S, S, S, S, S, C],
  [C, S, S, S, S, S, S, S, S, S, S, C],
  [C, S, S, S, S, S, S, S, S, S, S, C],
  [C, C, C, C, C, C, C, C, C, C, C, C],
  [H, H, H, H, H, H, H, H, H, H, H, H],
  [M, M, M, M, M, M, M, M, M, M, M, M],
  [H, H, H, H, H, H, H, H, H, H, H, H],
  [M, M, M, M, M, M, M, M, M, M, M, M],
  [H, H, H, H, H, H, H, H, H, H, H, H],
]

function applyNeighbors(left: boolean, right: boolean, below: boolean): Token[][] {
  const out = BASE.map(row => row.slice())
  if (left) {
    out[0][0] = M
    out[1][0] = M
  }
  if (right) {
    out[0][11] = M
    out[1][11] = M
  }
  if (below) {
    for (let r = 7; r <= 11; r++) {
      out[r][0] = C
      out[r][11] = C
    }
  }
  return out
}

function resolve(grid: Token[][], palette: TroughPalette, level: number): Sprite {
  const surfaceTopRow = 6 - level
  return grid.map((row, rIdx) => row.map(t => {
    if (t === null) return null
    if (t === 'C') return palette.cap
    if (t === 'M') return palette.mid
    if (t === 'H') return palette.high
    return rIdx >= surfaceTopRow ? palette.surface : palette.mid
  }))
}

function makeTroughVariants(palette: TroughPalette, level: number): Record<TroughVariantKey, Sprite> {
  return {
    base:         resolve(applyNeighbors(false, false, false), palette, level),
    below:        resolve(applyNeighbors(false, false, true),  palette, level),
    right:        resolve(applyNeighbors(false, true,  false), palette, level),
    left:         resolve(applyNeighbors(true,  false, false), palette, level),
    middle:       resolve(applyNeighbors(true,  true,  false), palette, level),
    left_below:   resolve(applyNeighbors(true,  false, true),  palette, level),
    right_below:  resolve(applyNeighbors(false, true,  true),  palette, level),
    middle_below: resolve(applyNeighbors(true,  true,  true),  palette, level),
  }
}

export function getAllTroughSprites(): Record<string, Sprite> {
  const out: Record<string, Sprite> = {}
  const kinds = Object.keys(TROUGH_PALETTES) as TroughKind[]
  for (const kind of kinds) {
    for (let level = 0; level <= TROUGH_FILL_LEVELS; level++) {
      const variants = makeTroughVariants(TROUGH_PALETTES[kind], level)
      for (const v of Object.keys(variants) as TroughVariantKey[]) {
        out[troughSpriteKey(kind, v, level)] = variants[v]
      }
    }
  }
  return out
}

export function computeTroughFillLevel(group: TroughTile[]): number {
  if (group.length === 0) return 0
  let fill = 0
  for (const t of group) fill += t.fill
  return Math.round((fill / group.length) * TROUGH_FILL_LEVELS)
}

export const TROUGH_PER_TILE_CAP: Record<TroughKind, number> = {
  water: 1,
  hay: 1,
}

export interface TroughTile {
  x: number
  y: number
  kind: TroughKind
  fill: number
}

export function getTroughGroup<T extends TroughTile>(
  troughs: T[],
  x: number,
  y: number,
  kind: TroughKind,
  T_PX: number,
): T[] {
  const at = new Map<string, T>()
  for (const t of troughs) if (t.kind === kind) at.set(`${t.x},${t.y}`, t)
  const start = at.get(`${x},${y}`)
  if (!start) return []
  const out: T[] = []
  const seen = new Set<string>()
  const stack: T[] = [start]
  while (stack.length) {
    const t = stack.pop()!
    const key = `${t.x},${t.y}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
    const neighbors = [
      at.get(`${t.x + T_PX},${t.y}`),
      at.get(`${t.x - T_PX},${t.y}`),
      at.get(`${t.x},${t.y + T_PX}`),
      at.get(`${t.x},${t.y - T_PX}`),
    ]
    for (const n of neighbors) if (n) stack.push(n)
  }
  return out
}

export function getGroupFill(group: TroughTile[]): number {
  let sum = 0
  for (const t of group) sum += t.fill
  return sum
}

export function getGroupCapacity(group: TroughTile[]): number {
  let sum = 0
  for (const t of group) sum += TROUGH_PER_TILE_CAP[t.kind]
  return sum
}

