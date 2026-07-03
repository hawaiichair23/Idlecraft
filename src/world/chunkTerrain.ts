import Phaser from 'phaser'
import { state, Terrain, TERRAIN_TILE, WOOD_TILE } from '../game/state'
import { makeRng } from './gen'

const CHUNK_TILES = 18
const CHUNK_PX = CHUNK_TILES * TERRAIN_TILE

const CHUNK_BAKE_MARGIN = CHUNK_PX
const CHUNK_DESTROY_MARGIN = CHUNK_PX * 3
const MAX_BAKES_PER_FRAME = 2

// Cosmetic grass banding: alternating diagonal stripes of a slightly bluer,
// darker grass, with noise-perturbed edges so the band boundaries wobble
// organically instead of running ruler-straight. Painted from world position +
// a seeded noise field — deterministic, continuous across chunk seams, no effect
// on terrain type or gameplay. Tune: band thickness in tiles, the stripe
// direction (angle; (1,1) = 45deg), how far the edges wobble, and the tint.
const GRASS_BAND_TILES = 90
const GRASS_BAND_DIR = { nx: 1, ny: 6 }
const GRASS_EDGE_WOBBLE = 900         // px the band edges wander from straight
const GRASS_WOBBLE_CELL = 1100        // scale of the big lazy edge swings
const GRASS_ALT_TINT = 0xEEF4FF

// Wildflowers baked into the grass. Sparse and clumped: candidates per chunk is
// the upper bound, but the patch gate (noise field above threshold) is what makes
// them sparse — most candidates are rejected, blooms cluster where noise is high.
const FLOWERS_PER_CHUNK = 14
const FLOWER_PATCH_CELL = 340          // size of flower patches (bigger = broader)
const FLOWER_PATCH_THRESHOLD = 0.85    // higher = sparser (fewer, tighter patches)
const FLOWER_FIREWHEEL_CHANCE = 0.28   // share of blooms that are the larger firewheel
const FLOWER_BLUEBONNET_CHANCE = 0.22  // share of blooms that are bluebonnets
function grassCellVal(cx: number, cy: number): number {
  const seed = (state.worldSeed + 7727) >>> 0
  let h = (Math.imul(cx | 0, 374761393) ^ Math.imul(cy | 0, 668265263) ^ seed) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return (h >>> 0) / 4294967296
}
function grassSample(x: number, y: number, cell: number): number {
  const fx = x / cell, fy = y / cell
  const x0 = Math.floor(fx), y0 = Math.floor(fy)
  const sx = fx - x0, sy = fy - y0
  const n00 = grassCellVal(x0, y0), n10 = grassCellVal(x0 + 1, y0)
  const n01 = grassCellVal(x0, y0 + 1), n11 = grassCellVal(x0 + 1, y0 + 1)
  const ix0 = n00 + (n10 - n00) * sx
  const ix1 = n01 + (n11 - n01) * sx
  return ix0 + (ix1 - ix0) * sy
}
function isGrassAltBand(wx: number, wy: number): boolean {
  // Multi-octave wobble: a big lazy swing plus finer jitter so band edges have no
  // single regular frequency — kills the staircase look.
  const wobble =
    (grassSample(wx, wy, GRASS_WOBBLE_CELL) - 0.5) * 2 * GRASS_EDGE_WOBBLE
    + (grassSample(wx + 5113, wy + 2207, GRASS_WOBBLE_CELL / 3) - 0.5) * 2 * (GRASS_EDGE_WOBBLE * 0.5)
    + (grassSample(wx + 1289, wy + 7901, GRASS_WOBBLE_CELL / 9) - 0.5) * 2 * (GRASS_EDGE_WOBBLE * 0.22)
  const proj = wx * GRASS_BAND_DIR.nx + wy * GRASS_BAND_DIR.ny + wobble
  const band = Math.floor(proj / (GRASS_BAND_TILES * TERRAIN_TILE))
  return (((band % 2) + 2) % 2) === 0
}

// Terrain sits far below every entity. Entity depths are y-based and the world
// extends to large negative y (grown north), so a low fixed value here keeps
// terrain under the player/buildings no matter how far north they go.
const CHUNK_DEPTH = -100000
const STAMP_SCALE = 2
const TUFTS_PER_CHUNK = 40
const TUFT_MIN_SPACING_SQ = 24 * 24

interface Chunk { rt: Phaser.GameObjects.RenderTexture | null; dirty: boolean }

// Chunked terrain renderer. Bakes the terrain grid into per-chunk RenderTextures
// near the camera and frees far ones, so VRAM and draw calls stay bounded as the
// world grows. Chunk coords derive from absolute world pixels (negatives allowed)
// anchored to worldBounds, so a growWorld — which shifts grid indices but never
// moves a tile in world space — leaves resident chunks valid.
export class ChunkTerrain {
  private scene: Phaser.Scene
  private chunks: Map<string, Chunk> = new Map()

  constructor(scene: Phaser.Scene) { this.scene = scene }

  private key(cc: number, cr: number): string { return `${cc},${cr}` }

  private chunkColAt(worldX: number): number {
    return Math.floor((worldX - state.worldBounds.minX) / CHUNK_PX)
  }

  private chunkRowAt(worldY: number): number {
    return Math.floor((worldY - state.worldBounds.minY) / CHUNK_PX)
  }

  // Mark the chunk owning this tile dirty, plus any neighbor chunk whose edge
  // feathering reads across the seam — a tile near a chunk border affects the
  // up-to-3 adjacent chunks (orthogonal + diagonal at a corner).
  markTileDirty(worldX: number, worldY: number) {
    const cc = this.chunkColAt(worldX)
    const cr = this.chunkRowAt(worldY)
    this.markChunkDirty(cc, cr)
    const lx = worldX - (state.worldBounds.minX + cc * CHUNK_PX)
    const ly = worldY - (state.worldBounds.minY + cr * CHUNK_PX)
    const nearW = lx < TERRAIN_TILE
    const nearE = lx > CHUNK_PX - TERRAIN_TILE
    const nearN = ly < TERRAIN_TILE
    const nearS = ly > CHUNK_PX - TERRAIN_TILE
    if (nearW) this.markChunkDirty(cc - 1, cr)
    if (nearE) this.markChunkDirty(cc + 1, cr)
    if (nearN) this.markChunkDirty(cc, cr - 1)
    if (nearS) this.markChunkDirty(cc, cr + 1)
    if (nearW && nearN) this.markChunkDirty(cc - 1, cr - 1)
    if (nearE && nearN) this.markChunkDirty(cc + 1, cr - 1)
    if (nearW && nearS) this.markChunkDirty(cc - 1, cr + 1)
    if (nearE && nearS) this.markChunkDirty(cc + 1, cr + 1)
  }

  private markChunkDirty(cc: number, cr: number) {
    const c = this.chunks.get(this.key(cc, cr))
    if (c) c.dirty = true
  }

  // Bake every chunk whose area is within the bake margin of the view, and any
  // resident chunk marked dirty. Runs EVERY frame, uncapped: a chunk is baked
  // the first frame its margin touches the camera, so it can never scroll into
  // view unbaked regardless of camera speed. Baking is cheap (flat 2D stamps
  // onto a RenderTexture), so there is no per-frame cap to defer it.
  bakeVisible() {
    const view = this.scene.cameras.main.worldView
    const m = CHUNK_BAKE_MARGIN
    const minCC = this.chunkColAt(view.x - m)
    const maxCC = this.chunkColAt(view.right + m)
    const minCR = this.chunkRowAt(view.y - m)
    const maxCR = this.chunkRowAt(view.bottom + m)

    let baked = 0
    for (let cr = minCR; cr <= maxCR; cr++) {
      for (let cc = minCC; cc <= maxCC; cc++) {
        const k = this.key(cc, cr)
        let chunk = this.chunks.get(k)
        if (!chunk) {
          chunk = { rt: null, dirty: true }
          this.chunks.set(k, chunk)
        }
        if (!chunk.rt || chunk.dirty) {
          if (baked >= MAX_BAKES_PER_FRAME) continue
          this.bake(cc, cr, chunk)
          baked++
        }
      }
    }
  }

  // Free chunks whose area is beyond the destroy margin, releasing their RT.
  // Runs on a throttle (called less often than bakeVisible) because being late
  // to free a far, off-screen chunk costs nothing visible — only memory, briefly.
  freeFar() {
    const view = this.scene.cameras.main.worldView
    const dm = CHUNK_DESTROY_MARGIN
    for (const [k, chunk] of this.chunks) {
      const comma = k.indexOf(',')
      const cc = Number(k.slice(0, comma))
      const cr = Number(k.slice(comma + 1))
      const ox = state.worldBounds.minX + cc * CHUNK_PX
      const oy = state.worldBounds.minY + cr * CHUNK_PX
      const keep = ox + CHUNK_PX >= view.x - dm && ox <= view.right + dm &&
                   oy + CHUNK_PX >= view.y - dm && oy <= view.bottom + dm
      if (!keep) {
        if (chunk.rt) chunk.rt.destroy()
        this.chunks.delete(k)
      }
    }
  }

  stampFootprint(worldX: number, worldY: number, color: number, alpha: number) {
    const cc = this.chunkColAt(worldX)
    const cr = this.chunkRowAt(worldY)
    const k = this.key(cc, cr)
    const chunk = this.chunks.get(k)
    if (!chunk?.rt) return
    const ox = state.worldBounds.minX + cc * CHUNK_PX
    const oy = state.worldBounds.minY + cr * CHUNK_PX
    const lx = worldX - ox
    const ly = worldY - oy
    chunk.rt.fill(color, alpha, lx - 1, ly - 1, 3, 3)
  }

  // Stamp every tile of one chunk onto its RenderTexture. Reads state.terrainAt
  // for tile type and for neighbor checks, so edge feathering spans chunk seams
  // for free. Salt tiles stamp nothing — the worldBg shows through.
  private bake(cc: number, cr: number, chunk: Chunk) {
    const T = TERRAIN_TILE
    const ox = state.worldBounds.minX + cc * CHUNK_PX
    const oy = state.worldBounds.minY + cr * CHUNK_PX

    if (!chunk.rt) {
      chunk.rt = this.scene.add.renderTexture(ox, oy, CHUNK_PX, CHUNK_PX).setOrigin(0, 0).setDepth(CHUNK_DEPTH)
      chunk.rt.renderMode = 'render'
    } else {
      chunk.rt.clear()
    }
    const rt = chunk.rt
    const stamp = (key: string, lx: number, ly: number) => rt.stamp(key, undefined, lx, ly, { scale: STAMP_SCALE })

    // Pass 1: base ground fill
    for (let ty = 0; ty < CHUNK_TILES; ty++) {
      for (let tx = 0; tx < CHUNK_TILES; tx++) {
        const wx = ox + tx * T + T / 2
        const wy = oy + ty * T + T / 2
        if (state.terrainAt(wx, wy) !== Terrain.Grass) continue
        const lx = tx * T + T / 2, ly = ty * T + T / 2
        if (isGrassAltBand(wx, wy)) rt.stamp('brush_ground', undefined, lx, ly, { scale: STAMP_SCALE, tint: GRASS_ALT_TINT })
        else stamp('brush_ground', lx, ly)
      }
    }

    // Pass 2: feathered edges
    for (let ty = 0; ty < CHUNK_TILES; ty++) {
      for (let tx = 0; tx < CHUNK_TILES; tx++) {
        const wx = ox + tx * T + T / 2
        const wy = oy + ty * T + T / 2
        if (state.terrainAt(wx, wy) !== Terrain.Grass) continue
        const lx = tx * T + T / 2
        const ly = ty * T + T / 2
        if (state.terrainAt(wx, wy - T) !== Terrain.Grass) stamp('brush_edge_top', lx, ly - 4)
        if (state.terrainAt(wx - T, wy) !== Terrain.Grass) stamp('brush_edge_left', lx - 4, ly)
        if (state.terrainAt(wx + T, wy) !== Terrain.Grass) stamp('brush_edge_right', lx + 4, ly)
        if (state.terrainAt(wx, wy + T) !== Terrain.Grass) stamp('brush_edge_bottom', lx, ly + 6)
      }
    }

    // Pass 2.5: path dirt fill (trail worn through grass)
    for (let ty = 0; ty < CHUNK_TILES; ty++) {
      for (let tx = 0; tx < CHUNK_TILES; tx++) {
        const wx = ox + tx * T + T / 2
        const wy = oy + ty * T + T / 2
        if (state.terrainAt(wx, wy) !== Terrain.PathDirt) continue
        stamp('path_dirt', tx * T + T / 2, ty * T + T / 2)
      }
    }

    // Pass 2.6: tilled dirt fill (moist worked soil — fields)
    for (let ty = 0; ty < CHUNK_TILES; ty++) {
      for (let tx = 0; tx < CHUNK_TILES; tx++) {
        const wx = ox + tx * T + T / 2
        const wy = oy + ty * T + T / 2
        if (state.terrainAt(wx, wy) !== Terrain.TilledDirt) continue
        stamp('tilled_dirt', tx * T + T / 2, ty * T + T / 2)
      }
    }


    // Pass 3: grass tufts at random positions across the chunk
    const tuftRng = makeRng((state.worldSeed ^ cc ^ (cr << 16)) >>> 0)
    const placed: { x: number; y: number }[] = []
    const inset = 8
    for (let i = 0; i < TUFTS_PER_CHUNK; i++) {
      const lx = inset + tuftRng() * (CHUNK_PX - inset * 2)
      const ly = inset + tuftRng() * (CHUNK_PX - inset * 2)
      if (state.terrainAt(ox + lx, oy + ly) !== Terrain.Grass) continue
      let tooClose = false
      for (const p of placed) {
        const dx = lx - p.x
        const dy = ly - p.y
        if (dx * dx + dy * dy < TUFT_MIN_SPACING_SQ) { tooClose = true; break }
      }
      if (tooClose) continue
      placed.push({ x: lx, y: ly })
      stamp('brush_speck', lx, ly)
    }

    // Pass 4: sparse wildflowers baked into the grass. Seeded per-chunk, grass-only,
    // and noise-gated so they cluster into occasional patches rather than evenly
    // dotting the whole field. Two kinds: tiny orange dots (common) and the larger
    // firewheel (rarer). Purely cosmetic — baked into the chunk RT, no live sprites.
    const flowerRng = makeRng((state.worldSeed ^ (cc << 8) ^ (cr << 20) ^ 0x9e37) >>> 0)
    for (let i = 0; i < FLOWERS_PER_CHUNK; i++) {
      const lx = inset + flowerRng() * (CHUNK_PX - inset * 2)
      const ly = inset + flowerRng() * (CHUNK_PX - inset * 2)
      const wx = ox + lx, wy = oy + ly
      if (state.terrainAt(wx, wy) !== Terrain.Grass) continue
      // patch gate: only bloom where the flower-noise field is high → sparse clumps
      const patch = grassSample(wx + 3300, wy + 9100, FLOWER_PATCH_CELL)
      if (patch < FLOWER_PATCH_THRESHOLD) continue
      const roll = flowerRng()
      const key = roll < FLOWER_BLUEBONNET_CHANCE ? 'flower_bluebonnet'
        : roll < FLOWER_BLUEBONNET_CHANCE + FLOWER_FIREWHEEL_CHANCE ? 'flower_firewheel'
        : 'flower_dot'
      stamp(key, lx, ly)
    }


    const WT = WOOD_TILE
    const woodTilesX = Math.ceil(CHUNK_PX / WT)
    const woodTilesY = Math.ceil(CHUNK_PX / WT)
    for (let ty = 0; ty < woodTilesY; ty++) {
      for (let tx = 0; tx < woodTilesX; tx++) {
        const wx = ox + tx * WT + WT / 2
        const wy = oy + ty * WT + WT / 2
        const wv = state.woodAt(wx, wy)
        if (!wv) continue
        stamp(wv === 3 ? 'item_sandstone' : wv === 2 ? 'item_flagstone' : 'item_plank', tx * WT + WT / 2, ty * WT + WT / 2)
      }
    }

    rt.render()
    chunk.dirty = false
  }
}
