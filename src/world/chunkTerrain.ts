import Phaser from 'phaser'
import { state, Terrain, TERRAIN_TILE, WOOD_TILE } from '../game/state'
import { makeRng } from './gen'

const CHUNK_TILES = 18
const CHUNK_PX = CHUNK_TILES * TERRAIN_TILE

const CHUNK_BAKE_MARGIN = CHUNK_PX
const CHUNK_DESTROY_MARGIN = CHUNK_PX * 3
const MAX_BAKES_PER_FRAME = 2

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
        stamp('brush_ground', tx * T + T / 2, ty * T + T / 2)
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

    const WT = WOOD_TILE
    const woodTilesX = Math.ceil(CHUNK_PX / WT)
    const woodTilesY = Math.ceil(CHUNK_PX / WT)
    for (let ty = 0; ty < woodTilesY; ty++) {
      for (let tx = 0; tx < woodTilesX; tx++) {
        const wx = ox + tx * WT + WT / 2
        const wy = oy + ty * WT + WT / 2
        if (!state.woodAt(wx, wy)) continue
        stamp('item_plank', tx * WT + WT / 2, ty * WT + WT / 2)
      }
    }

    rt.render()
    chunk.dirty = false
  }
}
