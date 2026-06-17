import Phaser from 'phaser'
import { loadSprites, spriteToTexture } from '../sprites/loader'
import { spriteColors, recolorHouseRoof } from '../sprites/data'
import { COLORS, FONT } from '../colors'
import { UI_BAR_HEIGHT, UI } from './UI'
import { state, BUILDINGS, getEffectiveTickMs, getStorageCap, createContainerContents, Terrain, TERRAIN_TILE, WOOD_TILE, PLAYER_BASE_SPEED, WORLD_WELL_CAP, type BuiltType } from '../game/state'
import { previewCraft, consumeCraft } from '../items/recipes'
import { ITEMS, type ItemStack, type ItemDef, type ItemType } from '../items/types'
import { generateWorld, generateRegionDecor, generateRegionBuried, buildTrail, scatterTrailTrees, scatterTrailRockClusters, pickHerdSite, makeRng, type GenRect, type DecorItem } from '../world/gen'
import { ChunkTerrain } from '../world/chunkTerrain'
import { WORLD_STRUCTURES, TOWNS, type WorldStructureType } from '../world/structures'
import { scatterSites, SITE_TEMPLATES, trailYAtX, type PlacedSite } from '../world/sites'
import { registerGrabbable } from '../ui/hover'
import { RopeController, CAT_HONSE } from '../world/ropeController'
import { updateHonses, getHonseBodyAABB, createHonse, spookHonse, spookHonsesFromShot } from '../world/honse'
import { updateCoyotes, createCoyote, getCoyoteBodyAABB, getCoyoteMouthAnchor, COYOTE_BITE_RADIUS, COYOTE_BITE_COOLDOWN_MS, COYOTE_BITE_DAMAGE } from '../world/coyote'
import { updateBandits, createBandit, startBanditRetreat, BANDIT_SPREAD, BANDIT_KNOCKBACK, BANDIT_KNOCKBACK_MS, BANDIT_MUZZLE_DY } from '../world/bandit'
import type { Bandit } from '../world/bandit'
import { listEnemies } from '../world/enemy'
import type { EnemyRef } from '../world/enemy'
import { updateTumbleweeds, clearTumbleweeds } from '../world/tumbleweed'
import { pointToSegmentDist, pointToPolylineDist, curveBetween } from '../world/geometry'


const PLAYER_SPEED = PLAYER_BASE_SPEED   // single source of truth lives in state.ts
const MOUNTED_SPEED_MIN = 140  
const MOUNTED_SPEED_MAX = 250   
const MOUNTED_RAMP_MS = 2200   
const HORSE_GEAR_SPEEDS = [130, 200, 320]                        
// Permanent westward expansion applied once at world start — the frontier leg
// toward Fort Worth. Snapped to whole tiles by growWorld. Tune here.
const PERMANENT_WEST_PX = 50000
// Vertical expansion applied once at world start, north and south of the
// original band. Same scatter fill as the rest. Snapped to tiles by growWorld.
const PERMANENT_VERTICAL_PX = 10000
// Trail waypoints: the westward route from the settled area to Fort Worth.
// Each entry is a bend in the trail — the path snakes between them with the
// same pebble wobble as the existing wilderness path. Authored positions.
const TRAIL_WAYPOINTS: { x: number; y: number }[] = [
  { x: 200, y: 2300 },

  // bend 1: north ~60px (generated)
  ...curveBetween({ x: -5400, y: 2300 }, { x: -7300, y: 2300 }, 60, 14),

  // bend 2: south ~70px (generated)
  ...curveBetween({ x: -13200, y: 2300 }, { x: -15300, y: 2300 }, -70, 14),

  // bend 3: north ~50px (generated)
  ...curveBetween({ x: -20200, y: 2300 }, { x: -22300, y: 2300 }, 50, 14),

  // bend 4: north ~110px (generated) — future river crossing
  ...curveBetween({ x: -27000, y: 2300 }, { x: -29200, y: 2300 }, 110, 16),

  // bend 5: south ~60px (generated)
  ...curveBetween({ x: -34200, y: 2300 }, { x: -36300, y: 2300 }, -60, 14),

  // bend 6: north ~50px (generated)
  ...curveBetween({ x: -41200, y: 2300 }, { x: -43300, y: 2300 }, 50, 14),

  { x: -49500, y: 2300 },
]

// Preston Road: a north-south route branching off the westward trail at ~25%
// from the west (Fort Worth) end, near x=-37075. Runs nearly the full vertical
// span of the world, crossing the trail at y=2300. Same gentle wander as the
// trail, authored with curveBetween — bulge here pushes EAST/WEST since the
// segments run vertically.
const PRESTON_JUNCTION_X = -37075
const PRESTON_WAYPOINTS: { x: number; y: number }[] = [
  { x: PRESTON_JUNCTION_X, y: -9000 },   // near the north edge
  ...curveBetween({ x: PRESTON_JUNCTION_X, y: -9000 }, { x: PRESTON_JUNCTION_X, y: -3000 }, 80, 14),
  ...curveBetween({ x: PRESTON_JUNCTION_X, y: -3000 }, { x: PRESTON_JUNCTION_X, y: 2300 }, -60, 14),
  { x: PRESTON_JUNCTION_X, y: 2300 },    // crosses the trail
  ...curveBetween({ x: PRESTON_JUNCTION_X, y: 2300 }, { x: PRESTON_JUNCTION_X, y: 7500 }, 70, 14),
  ...curveBetween({ x: PRESTON_JUNCTION_X, y: 7500 }, { x: PRESTON_JUNCTION_X, y: 13500 }, -80, 14),
]
// Decor culling: sprites only exist within this margin around the camera view.
// The margin provides hysteresis so decor at the screen edge doesn't thrash.
const DECOR_CULL_MARGIN = 400
// Ground scatter (tufts, pebbles, skulls) sits flat just above the baked terrain
// (chunk RTs render at 0.5) and below every y-sorted world object (their depth is
// the world y, which is >= 0 and far larger). It does not y-sort — painted ground dressing.
const DECOR_DEPTH = 0.6
const DECOR_CULL_INTERVAL_MS = 200   // cull runs 5x/second, not every frame   
// Tree culling: trees (sprite + trunk obstacle + rope-blocker body) only exist
// within this margin of the view. Create at TREE_CULL_MARGIN, destroy only past
// the larger TREE_CULL_DESTROY_MARGIN — the gap is hysteresis so a tree sitting
// at the boundary doesn't thrash create/destroy as the camera jitters. The
// create margin dwarfs the worst-case camera travel per cull tick (mounted top
// speed ~250px/s × 0.2s ≈ 50px, plus a tree's ~48px height), so a tree is
// always instantiated well before it can scroll into actual view — no pop-in.
const TREE_CULL_MARGIN = 400
const TREE_CULL_DESTROY_MARGIN = 600   
const MOUNT_RANGE = 40
const TOOL_RANGE = 150
const CRATE_RANGE = 80
const BODY_LOOT_RANGE = 80   // reach for picking up a dead bandit (E), like a crate
// Per-frame push force (× body mass) applied when the player shoves a container.
// Tuned with the body's frictionAir below: enough to move it at a heavy walk,
// not so much it rockets. Lower = heavier/harder to move.
const PUSH_FORCE = 0.0012

const ORE_ROLL_TABLE: { type: ItemType; weight: number }[] = [
  { type: 'stone',  weight: 69 },
  { type: 'coal',   weight: 10 },
  { type: 'iron',   weight: 6 },
  { type: 'copper', weight: 3 },
  { type: 'silver', weight: 2 },
  { type: 'gold',   weight: 1 },
]

// Roll the ore table once. Returns the dropped item type.
function rollOre(): ItemType {
  const total = ORE_ROLL_TABLE.reduce((s, e) => s + e.weight, 0)
  let r = Math.random() * total
  for (const e of ORE_ROLL_TABLE) {
    r -= e.weight
    if (r <= 0) return e.type
  }
  return ORE_ROLL_TABLE[0].type
}

// Player sprite offset above honse center while mounted (saddle position).
const MOUNT_SADDLE_Y = -10
const FOOD_BUFF_MS = 60000

const PLOT_COLS = 4
const PLOT_ROWS = 4
const PLOT_SIZE = 56
const PLOT_SPACING = 112
const PLOT_COUNT = PLOT_COLS * PLOT_ROWS

const SPRITE_SCALE = 3   
const PLAYER_SCALE = 2   

const ROPE_LEASH_LENGTH = 140
const ROPE_LEASH_SOFT_START = 0.9

type ObstacleKind = 'tree' | 'rock' | 'post' | 'building' | 'solid' | 'crate' | 'gate'

// True if two axis-aligned rectangles overlap. First rect is center+half-extent
// (px, py, half), second is origin+size (x, y, w, h).
function aabbOverlap(px: number, py: number, half: number, x: number, y: number, w: number, h: number): boolean {
  return px + half > x && px - half < x + w && py + half > y && py - half < y + h
}

// True if two origin+size AABBs overlap.
function boxOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax + aw > bx && ax < bx + bw && ay + ah > by && ay < by + bh
}

// resolveOverworldAction returns one of these, or null (= no action / default cursor).
// The `kind` drives both the click handler's dispatch and the cursor texture.
export type OverworldAction =
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
  | { kind: 'place-gate'; sprite: string; scale: number }
  | { kind: 'throw-rope'; sprite: string; scale: number }
  | { kind: 'tool-generic'; sprite: string; scale: number }
  | { kind: 'quirt'; sprite: string; scale: number; gear: number }
  | { kind: 'aim'; sprite: string; scale: number; bullets?: string }
  | { kind: 'eat-food'; sprite: string; scale: number }
  | { kind: 'mount'; sprite: string; scale: number; tint: number | null }
  | { kind: 'open-crate' }
  | { kind: 'toggle-gate' }

export const ACTION_CURSOR: Record<OverworldAction['kind'], { texture: string; scale: number } | 'tool'> = {
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
  'place-gate':    'tool',
  'throw-rope':    'tool',
  'tool-generic':  'tool',
  'quirt':         'tool',
  'aim':           'tool',
  'eat-food':      'tool',
  'mount':         'tool',
  'open-crate':    { texture: 'cursor_grab', scale: 2 },
  'toggle-gate':   { texture: 'item_fence_gate', scale: 2 },
}

interface PlotView {
  x: number
  y: number
  priceTag: Phaser.GameObjects.BitmapText
  building: Phaser.GameObjects.Sprite | null
  nameLabel: Phaser.GameObjects.BitmapText | null
}

export class Overworld extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite
  private playerShadow!: Phaser.GameObjects.Sprite
  private ePrompt!: Phaser.GameObjects.Container
  private inPopup = false
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private arrows!: Phaser.Types.Input.Keyboard.CursorKeys
  private eKey!: Phaser.Input.Keyboard.Key
  private rKey!: Phaser.Input.Keyboard.Key
  private mountedRampTime = 0
  private mountedLastDx = 0
  private mountedLastDy = 0
  private horseGear = 0
  private honsesSpawned = false
  private plotViews: PlotView[] = []
  // Non-enterable roofed houses; recorded so world gen keeps trees/rocks clear.
  private roofedHousePositions: { x: number; y: number }[] = []
  // Solid obstacles the player can't walk through. 
  private obstacles: { x: number; y: number; w: number; h: number; kind: ObstacleKind; originX?: number; originY?: number }[] = []
  private worldBg!: Phaser.GameObjects.Rectangle
  private chunkTerrain!: ChunkTerrain
  // Decor culling: decor lives as plain data; only items near the camera get
  // live sprites. Sprites are created/destroyed as the view moves.
  private decorData: DecorItem[] = []
  private activeDecor: Map<number, Phaser.GameObjects.Sprite> = new Map()
  private lastDecorCullAt = 0
  private revealedSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  // dirt patches left by digging, keyed by `x,y` so we can destroy on undo.
  private dugSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  // Player-dropped items in the world. Index in state.droppedItems → sprite.
  private droppedSprites: (Phaser.GameObjects.Sprite | null)[] = []
  // Planted trees/saplings in the world, keyed by `x,y` so we can destroy on dig-up.
  private plantedTreeSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  // Mature tree sprites, keyed by `x,y`, so chopping can find and fell them.
  private matureTreeSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  // Tree shadow sprites, keyed by `x,y`, so felling can destroy the shadow too.
  private treeShadowSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  // Axe hit counts per mature tree, keyed by `x,y`. Resets when the tree fells.
  // NOT cleared by tree culling — chop progress survives a tree going off-screen
  // and coming back, since it lives here and not on the (transient) sprite.
  private treeHits: Map<string, number> = new Map()
  // Live trunk obstacle + rope-blocker body per instantiated tree, keyed by
  // `x,y`. cullTrees adds an entry when a tree enters view, removes it (and
  // splices the obstacle, removes the body) when it leaves. Saplings have no
  // entry (no collision). The data lives in state.plantedTrees; this is only
  // the transient physics for trees currently near the camera.
  private activeTreeBodies: Map<string, { obs: { x: number; y: number; w: number; h: number; kind: ObstacleKind }; body: MatterJS.BodyType }> = new Map()
  // Rock tile sprites, keyed by `x,y` of each individual tile.
  private rockSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  // Rock formation containers, keyed by formation origin `x,y`. All tiles in
  // a formation live inside the container so shaking it moves them as one mass.
  private rockContainers: Map<string, Phaser.GameObjects.Container> = new Map()
  // Maps each tile key to its formation's container key.
  private rockTileToFormation: Map<string, string> = new Map()
  // Mining dependency: a tile here can't be mined until the tile it maps to is gone.
  private rockMineBlockedBy: Map<string, string> = new Map()
  // Pickaxe hit counts per rock tile, keyed by `x,y`. Resets on depletion.
  private rockHits: Map<string, number> = new Map()
  private rockBodies: Map<string, MatterJS.BodyType> = new Map()
  private rockCollision: Map<string, { x: number; y: number; w: number; h: number; kind: ObstacleKind }> = new Map()
  private rockTileCollision: Map<string, { obs: { x: number; y: number; w: number; h: number; kind: ObstacleKind }; body: MatterJS.BodyType }> = new Map()
  // Player-placed hitching posts, keyed by `x,y`. Future: rope-throw targets.
  private placedPostSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  private placedPostBodies: Map<string, MatterJS.BodyType> = new Map()
  private placedGateSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  private placedGateBodies: Map<string, MatterJS.BodyType> = new Map()
  // Static rope-blocker bodies for built plots, keyed by plot index. Stored so
  // destroying a plot can remove its blocker (posts/crates store theirs the
  // same way). Empty plots have no entry.
  private plotBlockerBodies: Map<number, MatterJS.BodyType> = new Map()
  private crateSprites: Phaser.GameObjects.Sprite[] = []
  // Dynamic Matter bodies for placed crates
  private crateBodies: MatterJS.BodyType[] = []
  // Public accessor so the rope controller can link a constraint to a crate body.
  getCrateBody(index: number): MatterJS.BodyType | null {
    return this.crateBodies[index] ?? null
  }
  // Honse sprites — parallel to state.honses by index. Position + depth are
  // synced from state each frame in update().
  private honseSprites: Phaser.GameObjects.Sprite[] = []
  private coyoteSprites: Phaser.GameObjects.Sprite[] = []
  private banditSprites: Phaser.GameObjects.Sprite[] = []
  // Player velocity (px/sec), derived each frame from position delta. Bandits
  // read this to lead their shots.
  private playerVX = 0
  private playerVY = 0
  private playerLastX = 0
  private playerLastY = 0
  // Active bullets fired from the derringer. Transient; move in a straight line
  // each frame, hit coyotes, and despawn off-screen. Not persisted to state.
  private bullets: { x: number; y: number; vx: number; vy: number; sprite: Phaser.GameObjects.Rectangle; fromBandit: boolean }[] = []
  private bulletRng: () => number = makeRng(0)
  // Separate seeded stream for bandit dodge decisions, so consuming randomness for
  // dodges doesn't desync the bullet-spread stream (determinism stays intact).
  private banditRng: () => number = makeRng(0)
  // Separate seeded stream for bandit loot rolls, kept off the dodge/spread streams
  // so drawing loot never shifts combat randomness.
  private lootRng: () => number = makeRng(0)
  private honseRng: () => number = makeRng(0)
  private lastFireAt = 0
  private gunAmmo = 5
  private gunFullReloadUntil = 0
  // Rounds the in-progress reload will add and charge when it completes. Set by
  // both reload triggers: a full mag on auto-reload (emptied clip), or just the
  // missing rounds on a manual R reload. Read once by refillGunIfReloaded.
  private pendingReloadAmount = 0
  private lastGunSlot = -1
  // Carcass sprites, parallel to state.carcasses by index.
  private carcassSprites: Phaser.GameObjects.Sprite[] = []
  // Bandit body sprites, parallel to state.banditBodies by index.
  private banditBodySprites: Phaser.GameObjects.Sprite[] = []
  // gameTime ms until which the player is invulnerable (i-frames after a hit)
  private invulnerableUntil = 0
  private honseLastPrint: Map<number, { x: number; y: number }> = new Map()
  // Dynamic Matter bodies for honses
  private honseBodies: MatterJS.BodyType[] = []
  // Position of the rope segment the mounted honse is touching
  private honseRopeContactPoint: { x: number; y: number } | null = null
  // time.now when the contact point was last refreshed. 
  private honseRopeContactAt = 0
  private honseRopeLine: { ax: number; ay: number; bx: number; by: number } | null = null
  private rope!: RopeController

  // Pipe placement: two-click flow. First click sets the source plot, second
  // click sets the destination and creates the connection.
  private pendingPipeFrom: number | null = null
  // Pipe placement ghosts. A single item_pipe sprite (the inventory picture)
  // sits on the side of a plot nearest the cursor: 0.65 alpha while hovering,
  // alpha 1 once the source plot is clicked. The source marker stays pinned on
  // the side it was clicked; the hover ghost tracks the cursor's current plot.
  private pipeHoverGhost: Phaser.GameObjects.Sprite | null = null
  private pipeSourceMarker: Phaser.GameObjects.Sprite | null = null
  // Locked side of the clicked source plot, so its solid pipe doesn't move.
  private pendingPipeSide: 'top' | 'bottom' | 'left' | 'right' | null = null

  private postDragAnchor: { x: number; y: number } | null = null
  private postDragSpecies: 'post' | 'cedar_post' | 'iron_post' | null = null
  // Drag preview composites into a single RenderTexture so overlapping post
  // sprites don't double up their alpha where they meet. Drawn at full opacity,
  // shown at 0.65 as one layer.
  private postDragRT: Phaser.GameObjects.RenderTexture | null = null
  // One off-display stamp sprite per texture key. draw() in Phaser 4 buffers the
  // command and renders at render() time using the object's CURRENT texture, so a
  // single shared stamp can't have its texture swapped mid-batch — each variant
  // needs its own sprite.
  private postDragStamps: Map<string, Phaser.GameObjects.Sprite> = new Map()
  private static PIPE_GHOST_ALPHA = 0.65
  // On-screen length of one item_pipe tile (12px native × scale 2).
  private static PIPE_TILE = 24
  // Pipe transfer timing. Every PIPE_TICK_MS, each pipe moves up to
  // PIPE_ITEMS_PER_TICK items from its source plot's output to its dest plot's
  // input. Stops early when the destination is full.
  private lastPipeTickAt = 0
  private static PIPE_TICK_MS = 2000
  private static PIPE_ITEMS_PER_TICK = 1
  // Visual pipe sprites drawn between connected plots, keyed by "fromPlot-toPlot".
  private pipeSprites: Map<string, Phaser.GameObjects.Sprite[]> = new Map()
  // Arrow sprites showing flow direction on each pipe, same key.
  private pipeArrows: Map<string, Phaser.GameObjects.Sprite> = new Map()

  constructor() {
    super('Overworld')
  }

  preload() {
    this.load.bitmapFont('main', 'minecraftbm.png', 'minecraftbm.xml')
    this.load.bitmapFont('mainSmall', 'minecraftbmsmall.png', 'minecraftbmsmall.xml')
    // real art assets — these take priority over the generated pixel sprites
    // (loadSprites in create() skips keys that already exist)
    this.load.image('item_flour', 'flour.png')
    this.load.image('item_water', 'water.png')
    this.load.image('field_bg', 'field.png')
    this.load.image('field_bg_patched', 'field_patched.png')
    this.load.image('field_sprouts', 'field_sprouts.png')
    this.load.image('field_growing', 'field_growing.png')
    this.load.image('field_mature', 'field_mature.png')
    this.load.image('field_patch', 'patch.png')
  }

  create() {
    loadSprites(this)
    state.init(PLOT_COUNT)
    this.registry.set('gold', state.gold)

    // world background — cream, clickable for +1 gold
    const wb = state.worldBounds
    this.worldBg = this.add.rectangle(wb.minX + wb.width / 2, wb.minY + wb.height / 2, wb.width, wb.height, COLORS.worldBg)
      .setStrokeStyle(2, COLORS.worldBorder)
      .setDepth(-200000)
      .setInteractive()
    this.input.on('pointerup', () => {
      const ui = this.scene.get('UI') as UI
      ui.getCursorController()?.setAxeSwung(false)
      if (this.postDragAnchor) {
        const path = this.computePostDragPath()
        if (path.length <= 1) {
          this.tryPlacePost(this.postDragAnchor.x, this.postDragAnchor.y)
        } else {
          for (const cell of path) this.tryPlacePost(cell.x, cell.y)
        }
        this.clearPostDragGhosts()
      }
    })
    this.worldBg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const ui = this.scene.get('UI') as UI
      const drag = ui.getDragController()
      if (!drag) return   // UI not fully initialized yet (early click during scene boot)
      const isRight = p.rightButtonDown()

      // A free-floating drag item owns this click. Handle it (drop to world, or
      // plant a held sapling) before any tool/mount/eat logic so nothing else
      // fires while something is in hand.
      if (drag.isHolding()) {
        if (isRight) return  // right-click while holding does nothing on the world
        // Over inventory UI (bottom bar or an open panel) → keep in hand.
        if (ui.isPointerOverInventory(p.x, p.y)) return
        const heldStack = drag.peekHeldStack()
        if (heldStack && heldStack.type === 'cottonwood_sapling') {
          if (this.tryPlantFromStack(p.worldX, p.worldY, heldStack)) {
            if (heldStack.count <= 0) drag.takeHeld()
            else drag.refreshHeldVisual()
            return
          }
        }
        const stack = drag.takeHeld()
        if (stack) this.dropStack(p.worldX, p.worldY, stack)
        return
      }


      // Left-click with food selected eats it (same as right-click). Skip while
      // dragging a stack — that click is a drop, not an eat.
      if (!isRight && !drag.isHolding() && this.peekSelectedEdibleDef()) {
        if (this.eatSelectedFood()) return
      }


      // While mounted: clicks normally dismount, but destructive actions
      // (untie rope, destroy post/crate/plot, chop, mine) take precedence —
      // they're targeted, intentional clicks that should work from horseback.
      if (state.mounted !== null) {
        const heldEdible = isRight && drag.isHolding() ? drag.peekEdibleDef() : undefined
        const selectedEdible = isRight ? this.peekSelectedEdibleDef() : undefined
        const rightClickEats = isRight && (heldEdible || selectedEdible)
        const leftClickDismounts = !isRight && !state.getSelectedTool() && !drag.isHolding()

        if (!isRight) {
          const action = this.resolveOverworldAction(p.worldX, p.worldY)
          if (action && (action.kind === 'untie-rope' || action.kind === 'destroy-post'
            || action.kind === 'destroy-crate' || action.kind === 'destroy-plot'
            || action.kind === 'destroy-pipe'
            || action.kind === 'chop-tree' || action.kind === 'mine-rock')) {
            // skip dismount — fall through to normal action dispatch
          } else if (leftClickDismounts) {
            this.dismount()
            return
          }
        } else if (!rightClickEats) {
          this.dismount()
          return
        }
      }
      // Not mounted: if the player is close enough to a honse, left-click mounts.
      // Refuse if a rope is in-flight/attached or a tool is selected (those
      // clicks have their own meaning).
      if (!isRight && state.mounted === null && !this.rope.isAttached() && !state.getSelectedTool()) {
        if (this.mountNearestHonse()) return
      }

      // right-click: eat from held cursor, or from selected hotbar slot
      if (isRight) {
        const heldDef = drag.isHolding() ? drag.peekEdibleDef() : undefined
        if (heldDef && drag.tryEatHeld()) {
          this.spawnCrumbs(this.player.x, this.player.y, heldDef.crumbColor!)
          state.speedBuffEndsAt = state.gameTime + FOOD_BUFF_MS
          state.speedBuffAmount = heldDef.speedBuff!
          if (heldDef.healFull) state.healToFull(this.registry)
          else if (heldDef.healHearts) state.changeHealth(heldDef.healHearts, this.registry)
          return
        }
        if (this.eatSelectedFood()) return
        return  // right-click with non-food does nothing on the world
      }

      // click on a tied rope to untie and destroy it
      if (this.rope.untieAtClick(p.worldX, p.worldY, this.player.x, this.player.y, TOOL_RANGE)) return
      // Pipe held: a click near a built plot (including the gap between plots)
      // places/connects; only a click away from any plot cancels a pending one.
      if (state.inventory[state.selectedInventorySlot]?.type === 'pipe' && p.leftButtonDown()) {
        if (this.handlePipeClick(p.worldX, p.worldY)) return
      }
      // cancel pending pipe placement if clicking empty ground
      if (this.pendingPipeFrom !== null) { this.clearPipeGhosts() }
      if (state.isShovelSelected()) {
        this.tryDig(p.worldX, p.worldY)
        return
      }
      // sapling selected? try to plant on a nearby dirt patch
      if (this.trySaplingPlant(p.worldX, p.worldY)) return
      // axe selected? try to chop a nearby mature tree, else destroy a post or crate
      if (state.inventory[state.selectedInventorySlot]?.type === 'axe') {
        ui.getCursorController().setAxeSwung(true)
        if (this.tryAxeEnemy(p.worldX, p.worldY, Overworld.WEAPON_DAMAGE.axe)) return
        if (this.tryChop(p.worldX, p.worldY)) return
        if (this.tryAxePost(p.worldX, p.worldY)) return
        if (this.tryAxeCrate(p.worldX, p.worldY)) return
        if (this.tryAxeGate(p.worldX, p.worldY)) return
        if (this.tryDestroyPlot(p.worldX, p.worldY)) return
        if (this.tryDestroyPipe(p.worldX, p.worldY)) return
        if (this.tryPickupWood(p.worldX, p.worldY)) return
      }
      // pickaxe selected? try to mine a nearby rock formation, then fall back
      // to the same destroy targets the axe handles (tree / post / crate).
      if (state.inventory[state.selectedInventorySlot]?.type === 'pickaxe') {
        ui.getCursorController().setAxeSwung(true)
        if (this.tryMine(p.worldX, p.worldY)) return
        if (this.tryAxePost(p.worldX, p.worldY)) return
        if (this.tryAxeCrate(p.worldX, p.worldY)) return
        if (this.tryAxeGate(p.worldX, p.worldY)) return
        if (this.tryDestroyPlot(p.worldX, p.worldY)) return
        if (this.tryDestroyPipe(p.worldX, p.worldY)) return
        if (this.tryPickupWood(p.worldX, p.worldY)) return
      }
      if (state.inventory[state.selectedInventorySlot]?.type === 'quirt' && state.mounted !== null) {
        this.horseGear = (this.horseGear + 1) % 3
        return
      }
      // post selected? start a drag to place a line of posts on release
      const postStack = state.inventory[state.selectedInventorySlot]
      if (postStack && (postStack.type === 'post' || postStack.type === 'cedar_post' || postStack.type === 'iron_post')) {
        const POST_GRID = Overworld.POST_GRID
        const sx = Math.round(p.worldX / POST_GRID) * POST_GRID
        const sy = Math.round(p.worldY / POST_GRID) * POST_GRID
        const dx = sx - this.player.x
        const dy = sy - this.player.y
        if (dx * dx + dy * dy <= TOOL_RANGE * TOOL_RANGE) {
          this.postDragAnchor = { x: sx, y: sy }
          this.postDragSpecies = postStack.type as 'post' | 'cedar_post' | 'iron_post'
          return
        }
      }
      // crate selected? try to place it in the world
      if (this.tryPlaceCrate(p.worldX, p.worldY)) return
      if (this.tryPlacePlank(p.worldX, p.worldY)) return
      if (this.tryPlaceGate(p.worldX, p.worldY)) return
      // rope selected? Throw goes through the rope controller, which consumes
      // one rope when the throw resolves (caught-and-thrown, or missed).
      const sel = state.inventory[state.selectedInventorySlot]
      if (sel && sel.type === 'rope' && this.rope.throw(p.worldX, p.worldY)) return
      const selDef = sel ? ITEMS[sel.type] : null
      if (selDef && selDef.gunSpread != null) {
        if (state.selectedInventorySlot !== this.lastGunSlot) {
          this.lastFireAt = 0
          this.gunFullReloadUntil = 0
          this.gunAmmo = selDef.gunAmmo ?? 1
          this.lastGunSlot = state.selectedInventorySlot
        }
        if (state.gameTime < this.gunFullReloadUntil) return
        const reloadMs = selDef.gunReloadMs ?? 0
        if (state.gameTime - this.lastFireAt < reloadMs) return
        if (selDef.gunAmmo != null && this.gunAmmo <= 0) return
        this.lastFireAt = state.gameTime
        this.fireBullet(p.worldX, p.worldY, selDef.gunSpread)
        if (selDef.gunAmmo != null) {
          this.gunAmmo--
          if (this.gunAmmo <= 0) {
            // Mag emptied — start the reload cooldown. The refill + ammo charge
            // happen when that cooldown expires (handled above), so the gun is
            // genuinely empty during the window.
            this.gunFullReloadUntil = state.gameTime + (selDef.gunFullReloadMs ?? 0)
            this.pendingReloadAmount = selDef.gunAmmo
          }
        }
        return
      }
      if (!state.getSelectedTool() && this.toggleGate(p.worldX, p.worldY)) return
    })

    // 16 plots, evenly spaced, centered on the world
    const cx = state.worldBounds.minX + state.worldBounds.width / 2
    const cy = state.worldBounds.minY + state.worldBounds.height / 2
    const totalW = (PLOT_COLS - 1) * PLOT_SPACING
    const totalH = (PLOT_ROWS - 1) * PLOT_SPACING
    const startX = cx - totalW / 2
    const startY = cy - totalH / 2

    let idx = 0
    for (let r = 0; r < PLOT_ROWS; r++) {
      for (let c = 0; c < PLOT_COLS; c++) {
        const x = startX + c * PLOT_SPACING
        const y = startY + r * PLOT_SPACING
        const plotIndex = idx++

        const rect = this.add.rectangle(x, y, PLOT_SIZE, PLOT_SIZE, COLORS.plotFill)
          .setStrokeStyle(2, COLORS.plotBorder)
          .setInteractive()
        registerGrabbable(rect)

        const priceTag = this.add.bitmapText(x, y, 'main', '$', FONT.cost)
          .setOrigin(0.5, 0.5)
          .setTint(COLORS.plotPriceTag)

        const view: PlotView = { x, y, priceTag, building: null, nameLabel: null }
        this.plotViews.push(view)

        rect.on('pointerdown', (p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
          const tool = state.getSelectedTool()
          const heldType = state.inventory[state.selectedInventorySlot]?.type

          // Pipe placement: two-click flow, resolved by cursor proximity.
          if (heldType === 'pipe' && p.leftButtonDown()) {
            ev.stopPropagation()
            this.handlePipeClick(p.worldX, p.worldY)
            return
          }

          if (tool && (tool.cursorContexts ?? ['overworld']).includes('overworld')) {
            if (heldType === 'axe' || heldType === 'pickaxe') {
              this.tryDestroyPlot(p.worldX, p.worldY)
            }
            return
          }
          if (!p.leftButtonDown()) return
          ev.stopPropagation()
          if (state.plots[plotIndex].built === 'empty') {
            this.registry.events.emit('open-build-menu', plotIndex)
          }
        })
      }
    }

    // Trail-side sites (houses + towns) and the authored lone house are
    // instantiated later — after the world grows west and after the fixed-
    // structure render loop — so their grass writes land and sprites draw once.

    // procedural world decor — scatter cow skulls (wide buffer), pebbles + grass (plot footprint only)
    const exclusions = this.plotViews.map(v => ({ x: v.x, y: v.y, radius: 100 }))
    exclusions.push({ x: cx, y: cy, radius: 60 })  // also clear the spawn point
    // world structures (shops, church, etc.) — rocks must keep clear of buildings
    for (const s of state.worldStructures) {
      exclusions.push({ x: s.x, y: s.y, radius: 120 })
    }
    // non-enterable roofed houses (not in worldStructures, tracked separately)
    for (const h of this.roofedHousePositions) {
      exclusions.push({ x: h.x, y: h.y, radius: 120 })
    }
    // authored trees, yuccas, grove, corral, decor posts, corral house — all at
    // fixed coordinates, so they're known before gen even though they render later.
    // Trees above abandoned house + nursery tree
    for (const [tx, ty] of [[2080,3340],[2120,3290],[3220,160]]) {
      exclusions.push({ x: tx, y: ty, radius: 60 })
    }
    // Oasis grove (10 cottonwoods)
    for (const [tx, ty] of [[3780,2240],[3880,2200],[3980,2260],[4060,2320],[3820,2340],[3940,2360],[4040,2400],[3800,2440],[3920,2460],[4000,2500]]) {
      exclusions.push({ x: tx, y: ty, radius: 60 })
    }
    // Yuccas by nursery
    for (const [yx, yy] of [[3120,210],[3136,208],[3128,224],[3144,222]]) {
      exclusions.push({ x: yx, y: yy, radius: 40 })
    }
    // Starter corral posts + corral house
    for (const [px, py] of [[3720,1460],[3730,1460],[3740,1460],[3750,1460],[3760,1460],[3770,1460],[3780,1460],[3720,1470],[3720,1480],[3720,1490],[3720,1500],[3720,1510],[3730,1510],[3740,1510],[3750,1510],[3760,1510],[3770,1510],[3780,1510]]) {
      exclusions.push({ x: px, y: py, radius: 40 })
    }
    exclusions.push({ x: 3790, y: 1480, radius: 120 })  // corral house
    // Decor posts
    for (const [px, py] of [[3280,1070],[3290,1070],[3330,1070],[3380,1070],[3410,1070],[2960,220],[2970,220],[2980,220],[2990,220]]) {
      exclusions.push({ x: px, y: py, radius: 40 })
    }
    // ground texture only avoids the plot footprint itself (so pebbles/grass appear right up to plot edges)
    const tightExclusions = this.plotViews.map(v => ({ x: v.x, y: v.y, radius: 61 }))
    const layout = generateWorld({
      seed: state.worldSeed,
      worldSize: state.worldBounds.width,
      exclusions,
      tightExclusions,
    })
    this.bulletRng = makeRng(state.worldSeed + 7777)
    this.banditRng = makeRng(state.worldSeed + 9001)
    this.lootRng = makeRng(state.worldSeed + 4242)
    this.honseRng = makeRng(state.worldSeed + 3737)
    this.decorData.push(...layout.decor)
    for (const r of layout.rocks) {
      this.spawnRockFormation(r.x, r.y)
    }
    // fixed landmark heap near spawn — NOT procedural. Always in the same spot
    // every world so the player has a known, reliable rock to mine once they
    // get the pickaxe. The seeded cluster above is the real deposit; this is
    // the tutorial anchor.
    this.spawnRockFormation(cx - 240, cy + 280)
    // seed buried items from the layout
    state.buriedItems = layout.buried.map(b => ({ x: b.x, y: b.y, reward: b.reward }))
    state.buriedGems = layout.buriedGems.map(g => ({ x: g.x, y: g.y, type: g.type }))
    // restore any dirt patches already in state
    for (const d of state.dugSpots) {
      const sprite = this.add.sprite(d.x, d.y, 'dirt_patch').setScale(2).setDepth(1)
      this.dugSprites.set(`${d.x},${d.y}`, sprite)
    }
    // restore any dropped items already in state — they were already on the
    // ground, so no jump; they just start floating.
    this.droppedSprites = state.droppedItems.map(d =>
      this.spawnDroppedSprite(d.x, d.y, d.stack.type, false)
    )
    // Planted trees in state are NOT instantiated here — cullTrees (run after
    // setup, then on a throttle in update) brings in only the ones near the
    // camera. They live as data in state.plantedTrees until then. This keeps
    // boot cheap no matter how many trees the world holds.
    // restore any placed posts already in state
    for (const p of state.placedPosts) {
      this.spawnPostSprite(p.x, p.y, p.species ?? 'post')
      const postObs = this.makePostObstacle(p.x, p.y)
      this.obstacles.push(postObs)
      this.placedPostBodies.set(`${p.x},${p.y}`, this.makePostBlocker(p.x, p.y))
    }
    for (const g of state.placedGates) {
      const tex = this.gateSpriteTex(g)
      const pos = this.gateSpritePos(g)
      const sprite = this.add.sprite(pos.sx, pos.sy, tex).setScale(2).setDepth(g.y - 8)
      if (pos.flip) sprite.setFlipX(true)
      this.placedGateSprites.set(`${g.x},${g.y}`, sprite)
      const obs = this.makeGateObstacle(g)
      this.obstacles.push(obs)
      this.placedGateBodies.set(`${g.x},${g.y}`, this.addBlocker(obs))
    }
    // restore any placed containers already in state (contents persist on the entry)
    for (const c of state.placedCrates) {
      this.spawnContainer(c.x, c.y, c.item ?? 'crate')
    }
    // restore any revealed-but-uncollected coins
    for (const r of state.revealedItems) {
      this.spawnRevealedCoinSprite(r.x, r.y)
    }

    // Trail-side sites already instantiated above (before exclusions).
    // Render loop below picks them up from state.worldStructures.

    // fixed world structures (shop, church, ...) — render at their hardcoded positions
    for (const s of state.worldStructures) {
      const def = WORLD_STRUCTURES[s.type]
      const bottomY = s.y + 24 - 16
      const spr = this.add.sprite(s.x, s.y, def.sprite).setScale(def.scale).setDepth(bottomY)
      if (s.flipX) spr.setFlipX(true)
      const tint = s.tint ?? def.tint
      if (tint !== undefined) spr.setTint(tint)
      // shops get a mirrored copy at the same position so the building reads wider
      if (s.type === 'shop' || s.type === 'general_store') {
        // mirror to the right, snug against the original. Sprite's right side
        // has 4px of native padding, so offset by content width not full width.
        const mirror = this.add.sprite(s.x + 24, s.y, def.sprite).setScale(def.scale).setFlipX(true).setDepth(bottomY)
        if (tint !== undefined) mirror.setTint(tint)
        // building footprint covers both halves: x ranges ~[-24, +48], y ~±24
        this.obstacles.push({ x: s.x - 24, y: s.y - 24, w: 72, h: 48, kind: 'building' as ObstacleKind })
      } else {
        this.obstacles.push({ x: s.x - 24, y: s.y - 24, w: 48, h: 48, kind: 'building' as ObstacleKind })
      }
    }

    // ---- TREES ABOVE ABANDONED HOUSE ---- 12px sprite at scale 3 = 36px tall.
    // House center is at (2100, 3400); two trees stacked vertically above it.
    {
      const treePositions: [number, number][] = [
        [2080, 3340],
        [2120, 3290],
      ]
      for (const [tx, ty] of treePositions) {
        this.placeTree(tx, ty)
      }
    }

    // ---- DECOR NEAR LAND OFFICE / NURSERY ---- yuccas grouped next to the Nursery
    // like potted stock for sale. Cottonwood to the side.
    // Land Office at (2930, 104), Nursery at (3000, 104).
    {
      const yuccaPositions: [number, number][] = [
        [3120, 210],
        [3136, 208],
        [3128, 224],
        [3144, 222],
      ]
      for (const [yx, yy] of yuccaPositions) {
        this.add.sprite(yx, yy, 'yucca').setScale(2).setDepth(yy)
        // small footprint so yuccas count as physical for placement systems
        // (they have no walk-collision by design, but should block gen scatter)
        this.obstacles.push({ x: yx - 8, y: yy - 8, w: 16, h: 16, kind: 'solid' as ObstacleKind })
      }
      this.placeTree(3220, 160)
    }

    // ---- OASIS GROVE ---- 10 cottonwoods clustered ~1600px east of plot
    // center on a patch of brush ground. Trees hand-placed (not grid) so it
    // reads as a grove, not a farm. Brush tiles painted underneath with a
    // feathered edge — perimeter tiles are randomly skipped so the patch
    // fades into the cream rather than ending in a hard square.
    {
      const gx = 3896
      const gy = 2376
      const TILE = 16
      const halfW = 14
      const halfH = 10
      const groveRng = makeRng(state.worldSeed + 9999)
      for (let ty = -halfH; ty <= halfH; ty++) {
        for (let tx = -halfW; tx <= halfW; tx++) {
          const ndx = tx / halfW
          const ndy = ty / halfH
          const d2 = ndx * ndx + ndy * ndy
          if (d2 > 1) continue
          const keepProb = d2 < 0.49 ? 1 : 1 - (d2 - 0.49) / 0.51
          if (groveRng() > keepProb) continue
          state.setTerrainAt(gx + tx * TILE, gy + ty * TILE, Terrain.Grass)
        }
      }
      // Trees on top of the brush.
      const grovePositions: [number, number][] = [
        [3780, 2240], [3880, 2200], [3980, 2260], [4060, 2320],
        [3820, 2340], [3940, 2360], [4040, 2400], [3800, 2440],
        [3920, 2460], [4000, 2500],
      ]
      for (const [tx, ty] of grovePositions) {
        this.placeTree(tx, ty)
      }
    }

    // ---- STARTER CORRAL ---- a pen of posts placed at game start. Open on the
    // right side (a house goes there). Coordinates surveyed in-game.
    {
      const postPositions: [number, number][] = [
        [3720, 1460], [3730, 1460], [3740, 1460], [3750, 1460],
        [3760, 1460], [3770, 1460], [3780, 1460],
        [3720, 1470], [3720, 1480], [3720, 1490], [3720, 1500],
        [3720, 1510], [3730, 1510], [3740, 1510], [3750, 1510],
        [3760, 1510], [3770, 1510], [3780, 1510],
      ]
      for (const [px, py] of postPositions) {
        this.placePost(px, py, 'post')
      }

      // ---- CORRAL HOUSE ---- decorative, non-enterable.
      this.placeRoofedHouse(3790, 1480, 3)
    }

    // ---- DECOR POSTS ---- surveyed in-game, permanent map furniture.
    {
      const decorPosts: [number, number][] = [
        [3280, 1070], [3290, 1070], [3330, 1070], [3380, 1070], [3410, 1070],
        [2960, 220], [2970, 220], [2980, 220], [2990, 220],
      ]
      for (const [px, py] of decorPosts) {
        this.placePost(px, py, 'post')
      }
    }

    // ---- HONSES ---- spawn from state. Position + depth resync each frame.
    this.honseSprites = state.honses.map(h => {
      const spr = this.add.sprite(h.x, h.y, h.sprite).setScale(2).setDepth(h.y - 8)
      if (h.tinted) spr.setTint(h.tint)
      return spr
    })

    state.coyotes.push(createCoyote(-24650, 2300))
    state.coyotes.push(createCoyote(PRESTON_JUNCTION_X, 7500))
    this.coyoteSprites = state.coyotes.map(c =>
      this.add.sprite(c.x, c.y, 'coyote').setScale(2).setDepth(c.y - 8)
    )
    this.carcassSprites = state.carcasses.map(k =>
      this.add.sprite(k.x, k.y, 'coyote_dead').setScale(2).setDepth(k.y - 8)
    )
    // Dynamic Matter bodies for honses, driven by velocity each frame so the
    // solver moves them — which lets strung ropes physically collide with and
    // block them. inertia:Infinity locks rotation (top-down sprite shouldn't
    // spin); frictionAir bleeds residual velocity; restitution adds slight bounce.
    // (inertia is a valid matter-js option but missing from Phaser's TS type.)
    this.honseBodies = state.honses.map(h =>
      this.matter.add.rectangle(h.x, h.y + 3, 30, 12, { inertia: Infinity, frictionAir: 0.05, restitution: 0.6, collisionFilter: { category: CAT_HONSE, mask: 0xFFFFFFFF, group: 0 } } as any)
    )

    // player at world center. Depth = y, so sprites south of the player render
    // in front and sprites north render behind (standard overhead y-sort).
    this.player = this.add.sprite(cx, cy, 'player').setScale(PLAYER_SCALE).setDepth(cy)
    this.playerShadow = this.add.sprite(cx + 4, cy + 10, 'tree_shadow').setScale(1.5).setDepth(cy - 1).setAlpha(0.25)
    // Floating "E" interact prompt — shadow + main letter, matching the hotbar
    // stack-count style. Reused: repositioned above the nearest E-target each
    // frame, hidden when there's nothing to interact with.
    {
      const E_SIZE = 14
      const shadow = this.add.bitmapText(1.5, 1.5, 'main', 'E', E_SIZE).setOrigin(0.5, 1)
        .setTint(0x303030).setBlendMode(Phaser.BlendModes.MULTIPLY)
      const main = this.add.bitmapText(0, 0, 'main', 'E', E_SIZE).setOrigin(0.5, 1)
        .setTint(COLORS.uiText)
      this.ePrompt = this.add.container(0, 0, [shadow, main]).setDepth(100000).setVisible(false)
    }
    this.rope = new RopeController(this, this.player)
    this.rope.onRopeConsumed = () => {
      // Remove one rope from inventory — search by type, not selected slot,
      // since the rope may resolve after the player has scrolled away.
      for (let i = 0; i < state.inventory.length; i++) {
        const s = state.inventory[i]
        if (s && s.type === 'rope') {
          s.count -= 1
          if (s.count <= 0) state.inventory[i] = null
          this.registry.events.emit('inventory-changed')
          break
        }
      }
    }
    // Track when the mounted honse's body touches a rope segment. While in
    // contact, the mounted branch stops forcing her velocity so the solver's
    // bounce off the rope can actually take effect (otherwise the per-frame
    // setVelocity overwrites the bounce and she grinds through). Rope segments
    // carry label 'rope-segment'; the honse is whichever body is in honseBodies.
    const isRope = (b: MatterJS.BodyType) => b.label === 'rope-segment'
    const isMountedHonse = (b: MatterJS.BodyType) =>
      state.mounted !== null && this.honseBodies[state.mounted] === b
    // Capture the contact normal (pointing roughly from the honse into the
    // rope) whenever the mounted honse is touching a rope segment. Stored as a
    // unit-ish vector or null. The mounted branch reads this to cancel only the
    // INTO-the-rope component of her input — so she bounces and can't push
    // through, but can always steer back out (no getting stuck inside).
    const capture = (pairs: any[]) => {
      for (const p of pairs) {
        const a = p.bodyA as MatterJS.BodyType
        const b = p.bodyB as MatterJS.BodyType
        const aRope = isRope(a), bRope = isRope(b)
        const aHonse = isMountedHonse(a), bHonse = isMountedHonse(b)
        if ((aRope && bHonse) || (bRope && aHonse)) {
          // Geometry, not the collision normal (whose sign is unreliable): the
          // direction from the rope segment to the honse IS "away from rope".
          // Store the segment's position; the mounted branch cancels only the
          // velocity component pointing from honse toward this segment.
          const rope = aRope ? a : b
          this.honseRopeContactPoint = { x: rope.position.x, y: rope.position.y }
          // Rope line endpoints stamped on the segment by the controller (strung
          // ropes only). Lets the mounted branch cancel across the rope LINE, not
          // just toward the segment. May be undefined if not yet stamped.
          const r = rope as any
          this.honseRopeLine = (r.ropeLineAx !== undefined)
            ? { ax: r.ropeLineAx, ay: r.ropeLineAy, bx: r.ropeLineBx, by: r.ropeLineBy }
            : null
          this.honseRopeContactAt = this.time.now
          return
        }
      }
    }
    this.matter.world.on('collisionstart', (e: any) => capture(e.pairs))
    this.matter.world.on('collisionactive', (e: any) => capture(e.pairs))
    // Static Matter bodies so rope segments and crates bounce off buildings.
    // Posts get their own blockers at placement time (see tryPlacePost / restore loop).
    for (const o of this.obstacles) if (o.kind === 'building') this.addBlocker(o)

    // camera — viewport starts below the top bar, extends to bottom of canvas
    const cam = this.cameras.main
    cam.setViewport(0, 0, cam.width, cam.height)
    cam.startFollow(this.player)
    cam.setBounds(state.worldBounds.minX, state.worldBounds.minY, state.worldBounds.width, state.worldBounds.height)
    cam.setZoom(1.08)

    // Safe zones: the original map bounds (captured before the permanent grows
    // below) are a no-combat area. Fort Worth will append a second zone later.
    this.safeZones = [{
      x: state.worldBounds.minX,
      y: state.worldBounds.minY,
      w: state.worldBounds.width,
      h: state.worldBounds.height,
    }]
    // initialize the key so the first real transition fires changedata (not setdata)
    this.registry.set('inCombat', false)
    this.registry.set('playerHealth', state.health)


    // Permanent westward expansion. Runs AFTER the player and plots were placed
    // at the original world center, so the spawn/town stays exactly where it is
    // and the new frontier extends west of it. growWorld re-syncs the camera
    // bounds, background, and fills the strip with scatter decor.
    this.growWorld('west', PERMANENT_WEST_PX)
    this.growWorld('north', PERMANENT_VERTICAL_PX)
    this.growWorld('south', PERMANENT_VERTICAL_PX)

    // Chunked terrain renderer. Instantiated after the permanent grows so its
    // chunk coords anchor to the final worldBounds. Reads the terrain grid that
    // grove + band gen above already wrote; the first scan bakes spawn-area
    // grass before frame one so there's no startup pop-in. startFollow won't
    // move the camera until the next update tick, so center it on the player
    // now to give the first scan the real spawn-area worldView.
    this.cameras.main.centerOn(this.player.x, this.player.y)
    this.chunkTerrain = new ChunkTerrain(this)
    this.chunkTerrain.bakeVisible()


    {
      const T = TERRAIN_TILE
      const wb = state.worldBounds
      const WIDTH = 2000
      const eastX = wb.minX + WIDTH
      const grassRng = makeRng(state.worldSeed + 5555)
      for (let y = wb.minY + T / 2; y < wb.minY + wb.height; y += T) {
        for (let x = wb.minX + T / 2; x < eastX; x += T) {
          const d = (x - wb.minX) / WIDTH
          const keepProb = d < 0.7 ? 1 : 1 - (d - 0.7) / 0.3
          if (grassRng() > keepProb) continue
          state.setTerrainAt(x, y, Terrain.Grass)
        }
      }
    }

    // Westward trail — a pebble path snaking through the waypoints from the
    // settled area to Fort Worth. Built after the grow so the strip exists.
    const { decor: trailDecor, centerline: trailCenterline } = buildTrail(TRAIL_WAYPOINTS, state.worldSeed + 7777)
    this.decorData.push(...trailDecor)
    this.cullDecor()

    // Trail-side sites: abandoned houses and settlements (towns). Each category
    // is guaranteed at least 2 and varies up to 4, scattered along the whole
    // trail. Towns avoid the houses' positions so everything stays spaced apart.
    // Placed HERE — after the westward grow — so the terrain grid covers the
    // trail and each site's grass/path writes actually land; and before the
    // trail rock clusters below so those avoid the site buildings.
    {
      // Towns are guaranteed features, so they're placed FIRST and houses fill
      // in around them — otherwise houses can eat the spacing slots and a
      // required town fails to place. Exactly one of each type per world (one
      // north, one south); a larger town type will be added later.
      const southCount = 1
      const northCount = 1
      const houseCount = 2 + Math.floor((((state.worldSeed >>> 0) % 1000) / 1000) * 3)          // 2–4
      const southTowns = scatterSites(
        TRAIL_WAYPOINTS,
        state.worldSeed + 8210,
        southCount,
        ['settlement_small'],
        [],
        true, // required — relax spacing before dropping any
      )
      const northTowns = scatterSites(
        TRAIL_WAYPOINTS,
        state.worldSeed + 9120,
        northCount,
        ['settlement_small_north'],
        southTowns.map(s => s.x),
        true, // required
      )
      const houses = scatterSites(
        TRAIL_WAYPOINTS,
        state.worldSeed + 5150,
        houseCount,
        ['lone_house'],
        [...southTowns, ...northTowns].map(s => s.x),
      )
      for (const site of southTowns) this.instantiateSite(site)
      for (const site of northTowns) this.instantiateSite(site)
      for (const site of houses) this.instantiateSite(site)

      // authored lone house south of spawn — via site so it gets a seeded tint
      // like every other house (can't exist untinted).
      this.instantiateSite({ templateId: 'lone_house', x: 2100, y: 3400 })
    }

    // Preston Road — north-south branch off the trail. Same pebble treatment;
    // its centerline joins the trail's for tree/rock clearance below.
    const { decor: prestonDecor, centerline: prestonCenterline } = buildTrail(PRESTON_WAYPOINTS, state.worldSeed + 8888)
    this.decorData.push(...prestonDecor)
    this.cullDecor()
    const roadCenterline = [...trailCenterline, ...prestonCenterline]

    // Wear dirt into grass under the trails: any grass terrain cell within the
    // trail's half-width of the centerline becomes PathDirt (sandy worn track).
    this.stampPathDirt(roadCenterline, 14)

    // Heavier pebble wear right at the crossing — a dense seeded patch within a
    // 15px radius of the junction so it reads as a well-trafficked intersection.
    {
      let jk = (state.worldSeed + 5252) >>> 0
      const jrand = () => { jk = (jk * 1664525 + 1013904223) >>> 0; return jk / 4294967296 }
      const JUNCTION_R = 20
      const JUNCTION_PEBBLES = 24
      for (let i = 0; i < JUNCTION_PEBBLES; i++) {
        const a = jrand() * Math.PI * 2
        const r = JUNCTION_R * (0.8 + jrand() * 0.2)   // ring: 80–100% of radius, hollow center
        const px = Math.floor(PRESTON_JUNCTION_X + Math.cos(a) * r)
        const py = Math.floor(2301 + Math.sin(a) * r)
        this.decorData.push({ x: px, y: py, type: 'pebbles', scale: 2 })
      }
      this.cullDecor()
    }

    // Wild herd grazing off the trail, at a seed-chosen spot in the first half
    // of the journey (near the trail, visible from it). Different world → herd
    // somewhere new; same world → same spot. Each honse mills around its own
    // spawn point (createHonse sets its home there), so spreading them around
    // the center reads as a loose grazing herd rather than a stack.
    const herdSite = pickHerdSite(TRAIL_WAYPOINTS, state.worldSeed + 9191)
    const herdCx = herdSite.x
    const herdCy = herdSite.y
    const herdSpread = 250
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const r = herdSpread * (0.4 + this.honseRng() * 0.6)
      this.spawnHonse(herdCx + Math.cos(a) * r, herdCy + Math.sin(a) * r)
    }

    // Seeded rock clusters paced along the trail, flanking it at varied distances
    // — concentrated near the route, some reaching into the wilds. Each center
    // spawns a few heaps spread around it.
    {
      const rwb = state.worldBounds
      const rockBounds: GenRect = { x: rwb.minX, y: rwb.minY, w: rwb.width, h: rwb.height }
      const startAreaCenter = { x: cx, y: cy, radius: 2000 }
      const centers = scatterTrailRockClusters(TRAIL_WAYPOINTS, rockBounds, state.worldSeed + 6464, [startAreaCenter])
      let rk = (state.worldSeed + 6464) >>> 0
      const rand = () => { rk = (rk * 1664525 + 1013904223) >>> 0; return rk / 4294967296 }
      const rockBlockers = this.getBlockers(40)
      // Story bandit anchor: as rocks are placed, find the first (easternmost) rock
      // within 100px of the trail in its eastern half. Prefer one NORTH of the trail
      // (best visibility — he hides on its far/north face); fall back to a SOUTH rock
      // (hides on its far/south face). Deterministic rule, seed-varied position.
      const trailStartX = TRAIL_WAYPOINTS[0].x
      const trailEndX = TRAIL_WAYPOINTS[TRAIL_WAYPOINTS.length - 1].x
      const trailMidX = (trailStartX + trailEndX) / 2   // eastern half is X >= this
      const BANDIT_ROCK_TRAIL_DIST = 100
      const BANDIT_HIDE_OFFSET = 20   // px from rock center to the bandit, far side from trail
      // Guarantee rock clusters hug the trail so it's never barren and the bandit
      // always has an anchor: 2 in the eastern half, 1 in the western. These are
      // prepended to the natural scatter and flow through the same heap/formation
      // code, so they look identical — any extra natural clusters still spawn too.
      const FORCED_OFFSET = 70   // px the forced center sits off the trail centerline
      const forcedAtX = (fx: number, north: boolean) => {
        const ty = trailYAtX(TRAIL_WAYPOINTS, fx)
        return { x: Math.floor(fx), y: Math.floor(ty + (north ? -FORCED_OFFSET : FORCED_OFFSET)) }
      }
      const eastSpan = trailStartX - trailMidX
      const westSpan = trailMidX - trailEndX
      const forcedCenters = [
        forcedAtX(trailMidX + eastSpan * 0.66, true),                 // eastern, NORTH → bandit anchor
        forcedAtX(trailMidX + eastSpan * 0.33, rand() < 0.5),         // eastern, either side
        forcedAtX(trailEndX + westSpan * 0.5, rand() < 0.5),          // western, either side
      ]
      centers.unshift(...forcedCenters)
      let northRock: { x: number; y: number } | null = null
      let southRock: { x: number; y: number } | null = null
      for (const c of centers) {
        const heaps = 2 + Math.floor(rand() * 6)
        const placed: { x: number; y: number }[] = []
        const MIN_GAP = 72
        const minSq = MIN_GAP * MIN_GAP
        let attempts = 0
        while (placed.length < heaps && attempts < heaps * 30) {
          attempts++
          const a = rand() * Math.PI * 2
          const r = rand() * 220
          const hx = Math.floor(c.x + Math.cos(a) * r)
          const hy = Math.floor(c.y + Math.sin(a) * r)
          let blocked = false
          for (const p of placed) {
            const dx = hx - p.x
            const dy = hy - p.y
            if (dx * dx + dy * dy < minSq) { blocked = true; break }
          }
          if (blocked) continue
          // reject near any physical obstacle or honse
          for (const b of rockBlockers) {
            const dx = hx - b.x
            const dy = hy - b.y
            if (dx * dx + dy * dy < b.radius * b.radius) { blocked = true; break }
          }
          if (blocked) continue
          // reject inside any plot footprint (plots aren't obstacles until built)
          for (const v of this.plotViews) {
            if (Math.abs(hx - v.x) < PLOT_SIZE / 2 && Math.abs(hy - v.y) < PLOT_SIZE / 2) { blocked = true; break }
          }
          if (blocked) continue
          if (pointToPolylineDist(hx, hy, roadCenterline) < 45) continue
          placed.push({ x: hx, y: hy })
          this.spawnRockFormation(hx, hy)
          // Story-bandit candidacy: eastern half, within 100px of the trail. Keep the
          // easternmost (highest X) on each side of the trail.
          if (hx >= trailMidX && pointToPolylineDist(hx, hy, roadCenterline) <= BANDIT_ROCK_TRAIL_DIST) {
            const trailY = trailYAtX(TRAIL_WAYPOINTS, hx)
            if (hy < trailY) {
              if (!northRock || hx > northRock.x) northRock = { x: hx, y: hy }
            } else {
              if (!southRock || hx > southRock.x) southRock = { x: hx, y: hy }
            }
          }
        }
      }
      // Place the story bandit behind his rock: prefer the north-of-trail rock
      // (hide on its north face), else the south rock (hide on its south face).
      // Same encounter every world; only the position varies with the seed.
      const bRock = northRock ?? southRock
      if (bRock) {
        const trailY = trailYAtX(TRAIL_WAYPOINTS, bRock.x)
        const by = bRock.y < trailY ? bRock.y - BANDIT_HIDE_OFFSET : bRock.y + BANDIT_HIDE_OFFSET
        // nudge right 15px — the rock's visual center sits left of its anchor x
        this.spawnBandit(bRock.x + 15, by)
      }
    }

    // ---- WILD TREES ---- scattered across the whole world, concentrated near
    // the westward trail. gen.scatterTrailTrees returns seeded candidate
    // positions weighted toward the trail; here we reject any that land on a
    // live obstacle (rocks, buildings, posts, crates, honses), inside a plot
    // footprint, or on the player spawn. placeTree handles stage from terrain.
    {
      const wb = state.worldBounds
      const treeBounds: GenRect = { x: wb.minX, y: wb.minY, w: wb.width, h: wb.height }
      const TREE_TRAIL_CLEARANCE = 25   // px kept clear of the path
      const TREE_MIN_SPACING = 90       // px between trees
      const candidates = scatterTrailTrees(
        roadCenterline, treeBounds, state.worldSeed + 4242,
        TREE_TRAIL_CLEARANCE, TREE_MIN_SPACING,
      )
      const blockers = this.getBlockers(40)
      for (const c of candidates) {
        // reject near any physical obstacle or honse
        let blocked = false
        for (const b of blockers) {
          const dx = c.x - b.x
          const dy = c.y - b.y
          if (dx * dx + dy * dy < b.radius * b.radius) { blocked = true; break }
        }
        if (blocked) continue
        // reject inside any plot footprint (plots aren't obstacles until built)
        for (const v of this.plotViews) {
          if (Math.abs(c.x - v.x) < PLOT_SIZE / 2 && Math.abs(c.y - v.y) < PLOT_SIZE / 2) { blocked = true; break }
        }
        if (blocked) continue
        // reject on the player spawn
        const pdx = c.x - this.player.x
        const pdy = c.y - this.player.y
        if (pdx * pdx + pdy * pdy < 40 * 40) continue
        this.placeTree(c.x, c.y)
      }
    }

    // ---- FORT WORTH GRASS TREES ---- extra cottonwoods scattered over the
    // western grass band. Seeded candidates across the band; only those landing
    // on grass take (placeTree makes grass trees mature), so density follows the
    // grass falloff for free. Respects spacing, road clearance, plots, blockers.
    {
      const wb = state.worldBounds
      const BAND_W = 2000
      const eastX = wb.minX + BAND_W
      const GRASS_TREE_SPACING = 110
      const treeRng = makeRng(state.worldSeed + 9191)
      const area = BAND_W * wb.height
      const candidateCount = Math.floor(area * 0.000018)   // moderate cluster
      const placed: { x: number; y: number }[] = []
      const spacingSq = GRASS_TREE_SPACING * GRASS_TREE_SPACING
      const blockers = this.getBlockers(40)
      for (let i = 0; i < candidateCount; i++) {
        const x = Math.floor(wb.minX + treeRng() * BAND_W)
        const y = Math.floor(wb.minY + treeRng() * wb.height)
        if (x >= eastX) continue
        if (state.terrainAt(x, y) !== Terrain.Grass) continue
        if (pointToPolylineDist(x, y, roadCenterline) < 25) continue
        let blocked = false
        for (const p of placed) {
          const dx = x - p.x
          const dy = y - p.y
          if (dx * dx + dy * dy < spacingSq) { blocked = true; break }
        }
        if (blocked) continue
        for (const b of blockers) {
          const dx = x - b.x
          const dy = y - b.y
          if (dx * dx + dy * dy < b.radius * b.radius) { blocked = true; break }
        }
        if (blocked) continue
        for (const v of this.plotViews) {
          if (Math.abs(x - v.x) < PLOT_SIZE / 2 && Math.abs(y - v.y) < PLOT_SIZE / 2) { blocked = true; break }
        }
        if (blocked) continue
        placed.push({ x, y })
        this.placeTree(x, y)
      }
    }


    // Under RESIZE scale mode the canvas matches the window, so cam.width/height
    // change whenever the window does. Re-set the viewport to the new size,
    // keeping the top-bar offset. Bounds/follow/zoom persist across this.
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      cam.setViewport(0, 0, gameSize.width, gameSize.height)
    })

    // Instantiate the trees near spawn now; the rest stream in via cullTrees in
    // update() as the camera moves. The camera is following the player (world
    // center), so worldView is valid here.
    this.cullTrees()

    // launch the UI scene on top
    this.scene.launch('UI')

    // input
    const kb = this.input.keyboard!
    this.wasd = kb.addKeys('W,A,S,D') as any
    this.arrows = kb.createCursorKeys()
    this.eKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this.rKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.R)

    // listen for buy events coming back from the UI build menu
    this.registry.events.on('buy-building', (plotIndex: number, type: BuiltType) => {
      this.tryBuyAtPlot(plotIndex, type)
    })

    // Every interior-enter path (plot, well, world structure) emits this, so it
    // is the one place to freeze the world for the player's absence. Enemies read
    // state.playerInWorld and stop acting until the matching exit event.
    this.registry.events.on('interior-entered', () => {
      state.playerInWorld = false
    })

    // when returning from Interior, put the player back exactly where they were
    // standing when they entered (saved in enterInterior).
    this.registry.events.on('interior-exited', () => {
      this.cameras.main.setVisible(true)
      this.inPopup = false
      state.playerInWorld = true
      this.player.setVisible(true)
      this.playerShadow.setVisible(true)
      // A workshop may have been upgraded inside; refresh its exterior sprite
      // so a level-2 workshop shows the upgraded building.
      this.refreshPlotBuildingSprites()
      // Consume the E press that closed the interior so this same keypress
      // can't bleed into update()'s E poll and immediately mount/open a crate.
      Phaser.Input.Keyboard.JustDown(this.eKey)
      if (this.preInteriorPos) {
        if (this.exitForceDir && this.preInteriorBuildingPos) {
          const bx = this.preInteriorBuildingPos.x
          const by = this.preInteriorBuildingPos.y
          if (this.exitForceDir === 'south') {
            this.player.x = bx
            this.player.y = by + 25
          } else if (this.exitForceDir === 'left') {
            this.player.x = bx - 25
            this.player.y = by
          } else {
            this.player.x = bx + 25
            this.player.y = by
          }
        } else {
          const bx = this.preInteriorBuildingPos?.x ?? this.preInteriorPos.x
          const by = this.preInteriorBuildingPos?.y ?? this.preInteriorPos.y
          let dx = this.preInteriorPos.x - bx
          let dy = this.preInteriorPos.y - by
          const len = Math.sqrt(dx * dx + dy * dy)
          if (len > 0) { dx /= len; dy /= len }
          else { dy = 1 }
          this.player.x = this.preInteriorPos.x + dx * 5
          this.player.y = this.preInteriorPos.y + dy * 5
        }
        this.player.setDepth(this.player.y - 8)
        this.preInteriorPos = null
        this.preInteriorBuildingPos = null
        this.exitForceDir = null
      }
      // ignore door detection until the player moves out of the current
      // door zone, so we don't immediately re-enter the building we just left.
      this.doorCheckBlocked = true
    })
  }

  private preInteriorPos: { x: number; y: number } | null = null
  private preInteriorBuildingPos: { x: number; y: number } | null = null
  private exitForceDir: 'south' | 'left' | 'right' | null = null
  private safeZones: GenRect[] = []
  private inCombat = false
  // true after exiting an interior; cleared once the player walks out of any door zone.
  private doorCheckBlocked = false

  private enterPlotInterior(plotIndex: number, type: BuiltType) {
    this.preInteriorPos = { x: this.player.x, y: this.player.y }
    const view = this.plotViews[plotIndex]
    this.preInteriorBuildingPos = { x: view.x, y: view.y }
    this.inPopup = true
    this.doorCheckBlocked = true
    this.player.setVisible(false)
    this.playerShadow.setVisible(false)
    this.registry.events.emit('interior-entered')
    this.scene.run('Interior', { source: 'plot', buildingType: type, plotIndex })
    this.scene.bringToTop('Interior')
    this.scene.bringToTop('UI')
  }

  private enterWorldWell(wellIndex: number) {
    const wl = state.worldWells[wellIndex]
    this.preInteriorPos = { x: this.player.x, y: this.player.y }
    this.preInteriorBuildingPos = { x: wl.x, y: wl.y }
    this.inPopup = true
    this.doorCheckBlocked = true
    this.player.setVisible(false)
    this.playerShadow.setVisible(false)
    this.registry.events.emit('interior-entered')
    this.scene.run('Interior', { source: 'worldWell', wellIndex })
    this.scene.bringToTop('Interior')
    this.scene.bringToTop('UI')
  }

  private enterWorldStructure(structureIndex: number, type: WorldStructureType) {
    this.preInteriorPos = { x: this.player.x, y: this.player.y }
    const s = state.worldStructures[structureIndex]
    this.preInteriorBuildingPos = { x: s.x, y: s.y }
    this.exitForceDir = type === 'abandoned_house' ? 'south'
      : type === 'long_house' ? (s.flipX ? 'left' : 'right')
      : null
    this.cameras.main.setVisible(false)
    this.registry.events.emit('interior-entered')
    // Pass this instance's loot (if any) so the interior seeds from it instead
    // of the hardcoded default. Cast: WorldStructure.loot uses string types;
    // the interior expects ItemType — they're the same item ids at runtime.
    this.scene.run('Interior', { source: 'world', buildingType: type, structureIndex, flipX: s.flipX, loot: s.loot as any })
    this.scene.bringToTop('UI')
  }

  // Re-skins built plots whose sprite depends on level (workshop L1 -> L2).
  // Called on returning to the overworld, since upgrades happen in the interior.
  private refreshPlotBuildingSprites() {
    for (let i = 0; i < state.plots.length; i++) {
      const plot = state.plots[i]
      if (plot.built !== 'workshop') continue
      const view = this.plotViews[i]
      if (!view || !view.building) continue
      const wantKey = plot.level >= 2 ? 'workshop_l2' : 'workshop'
      if (view.building.texture.key === wantKey) continue
      const depth = view.building.depth
      view.building.destroy()
      view.building = this.add.sprite(view.x, view.y, wantKey).setScale(SPRITE_SCALE).setDepth(depth)
    }
  }

  private tryBuyAtPlot(plotIndex: number, type: BuiltType) {
    const ok = state.placeBuilding(plotIndex, type, this.registry)
    if (!ok) return
    const view = this.plotViews[plotIndex]
    view.priceTag.destroy()
    view.building = this.add.sprite(view.x, view.y, type).setScale(SPRITE_SCALE).setDepth(view.y + 8)
    // honses can't walk through built plots; rope segments bounce off too
    const plotAABB = { x: view.x - 24, y: view.y - 24, w: 48, h: 48, kind: 'building' as ObstacleKind }
    this.obstacles.push(plotAABB)
    this.plotBlockerBodies.set(plotIndex, this.addBlocker(plotAABB))

    const def = BUILDINGS[type]
    // name label above the plot — high depth so pipes never draw over it
    view.nameLabel = this.add.bitmapText(view.x, view.y - PLOT_SIZE / 2 - 4, 'mainSmall', def.name, FONT.desc)
      .setOrigin(0.5, 1)
      .setTint(COLORS.plotPriceTag)
      .setDepth(100000)
  }

  // dig spacing: refuse if click is within this many pixels of an existing dig
  private static DIG_MIN_SPACING = 12
  // plant hit radius: dropping/clicking a sapling within this distance of a
  // dirt patch will plant on it. More generous than DIG_MIN_SPACING so
  // dropping doesn't require pixel-perfect aim.
  private static PLANT_HIT_RADIUS = 28
  // Axe hits required to fell a mature tree.
  private static CHOP_HITS_TO_FELL = 12
  // Pickaxe hits required to deplete a rock formation.
  private static MINE_HITS_TO_DEPLETE = 12
  // Axe hit-radius for destroying a placed post — matches CHOP_HIT_RADIUS.
  private static POST_HIT_RADIUS = 18
  // Dropped-item animation: a fresh drop pops up DROP_JUMP_HEIGHT px and
  // settles over DROP_JUMP_MS, then floats with a gentle sine bob of
  // DROP_BOB_AMP px at DROP_BOB_SPEED radians/ms. Bob is visual only —
  // pickup range and depth sorting read the logical position in state.
  private static DROP_JUMP_HEIGHT = 14
  private static DROP_JUMP_MS = 360
  private static DROP_BOB_AMP = 3
  private static DROP_BOB_SPEED = 0.004
  // Minimum time (ms) between axe swings.
  private static CHOP_COOLDOWN_MS = 0
  // Time (ms) for a planted sapling to grow into a mature tree. Divided by the
  // dev time multiplier in the growth check so window.speed() fast-forwards it.
  private static SAPLING_GROW_MS = 60000
  // state.gameTime of the last axe swing, for the cooldown.
  private lastChopAt = 0
  // dig offset: the shovel cursor's tip is at (0,0) but the blade is lower-left.
  // Offset the dirt patch so it appears at the blade, not the cursor tip.
  private static DIG_OFFSET_X = 0
  private static DIG_OFFSET_Y = 18
  // reveal radius: buried items within this distance of a dig get unearthed.
  private static DIG_REVEAL_RADIUS = 36
  // pickup radius: player walking within this distance of a revealed item collects it.
  private static PICKUP_RADIUS = 18
  // Fresh drops can't be picked up for this long after landing, so the player
  // sees the item on the ground (and the character collecting it) instead of
  // it vanishing the instant it's created underfoot.
  private static PICKUP_DELAY_MS = 500
  // Loot magnet: items within this (larger) radius slide toward the player and
  // get collected on arrival. Ease is the fraction of the gap closed per frame.
  private static PICKUP_ATTRACT_RADIUS = 30
  private static PICKUP_ATTRACT_EASE = 0.25
  // dig duration: shovel stays planted for this long before dirt appears. Also
  // gates further dig clicks so the player can't spam the shovel.
  private static DIG_DURATION_MS = 2000
  // dig shovel renders above all y-sorted world geometry so it never clips under rocks
  private static DIG_SPRITE_DEPTH = 100000
  // true while a dig is in progress — blocks new dig clicks until resolved.
  private digInProgress = false

  // Places a cottonwood — terrain decides stage: grass → mature, anything else → dead.
  private placeTree(tx: number, ty: number) {
    const stage = state.terrainAt(tx, ty) === Terrain.Grass ? 'mature' : 'dead'
    const entry = { x: tx, y: ty, kind: 'cottonwood' as const, stage: stage as 'mature' | 'dead' }
    state.plantedTrees.push(entry)
    if (this.treeInCullRange(tx, ty)) this.instantiateTree(entry)
  }

  // Build the live objects (sprite + shadow + trunk obstacle + rope-blocker
  // body) for a tree entry, and register them in the live-tree maps keyed by
  // position. Idempotent: if the tree is already live, does nothing. Reads the
  // entry's stage to pick the right sprite — so a culled-then-restored tree
  // comes back in whatever state it was chopped to (mature/dead/stump). Mature
  // and dead get a falling-canopy sprite (cottonwood / cottonwood_dead); a
  // felled stump uses the stump sprite. Saplings are handled separately (they
  // have their own sprite + no collision) — see instantiateSapling.
  private instantiateTree(entry: { x: number; y: number; stage: string }) {
    const { x: tx, y: ty } = entry
    const key = `${tx},${ty}`
    if (this.matureTreeSprites.has(key) || this.plantedTreeSprites.has(key)) return  // already live

    if (entry.stage === 'sapling') { this.instantiateSapling(entry); return }

    // shadow (mature/dead/stump all cast one; stump's is small but kept for parity)
    if (entry.stage !== 'stump') {
      const shadow = this.add.sprite(tx, ty + 26, 'tree_shadow').setScale(3).setDepth(ty + 17).setAlpha(0.3).setOrigin(0.3, 0.5)
      this.treeShadowSprites.set(key, shadow)
    }

    const tex = entry.stage === 'stump' ? 'cottonwood_stump'
      : entry.stage === 'dead' ? 'cottonwood_dead'
      : 'cottonwood'
    const sprite = this.add.sprite(tx, ty, tex).setScale(3).setDepth(ty + 8)
    this.matureTreeSprites.set(key, sprite)

    // trunk obstacle + rope-blocker body (stumps keep their trunk collision too,
    // matching the pre-cull behavior where felling never removed the obstacle)
    const trunk = this.makeTreeTrunkObstacle(tx, ty)
    this.obstacles.push(trunk)
    const body = this.addBlocker(trunk)
    this.activeTreeBodies.set(key, { obs: trunk, body })
  }

  // Sapling live objects: just the planted-sapling sprite. Saplings have no
  // collision by design (you can walk through them), so no obstacle/body.
  private instantiateSapling(entry: { x: number; y: number }) {
    const key = `${entry.x},${entry.y}`
    if (this.plantedTreeSprites.has(key)) return
    const sprite = this.add.sprite(entry.x, entry.y, 'planted_cottonwood_sapling').setScale(2).setDepth(2)
    this.plantedTreeSprites.set(key, sprite)
  }

  // Tear down a tree's live objects (sprite, shadow, obstacle, body) without
  // touching its data entry or its chop progress (treeHits) — so culling is
  // purely visual/physical and a re-instantiated tree resumes exactly where it
  // was. Used by cullTrees when a tree leaves the view margin.
  private deinstantiateTree(x: number, y: number) {
    const key = `${x},${y}`
    const mature = this.matureTreeSprites.get(key)
    if (mature) { mature.destroy(); this.matureTreeSprites.delete(key) }
    const sapling = this.plantedTreeSprites.get(key)
    if (sapling) { sapling.destroy(); this.plantedTreeSprites.delete(key) }
    const shadow = this.treeShadowSprites.get(key)
    if (shadow) { shadow.destroy(); this.treeShadowSprites.delete(key) }
    const bodyEntry = this.activeTreeBodies.get(key)
    if (bodyEntry) {
      const oi = this.obstacles.indexOf(bodyEntry.obs)
      if (oi !== -1) this.obstacles.splice(oi, 1)
      this.matter.world.remove(bodyEntry.body)
      this.activeTreeBodies.delete(key)
    }
  }

  // Promote a planted sapling to a mature tree. Updates the data entry's stage
  // first, then — only if the sapling is currently live (on-screen) — swaps its
  // sprite for the instantiated mature tree. If it's off-screen there are no
  // live objects to swap; cullTrees will instantiate it as mature (reading the
  // updated stage) whenever it next enters view.
  private growSapling(t: { x: number; y: number; stage: string; plantedAt?: number }) {
    const wasLive = this.plantedTreeSprites.has(`${t.x},${t.y}`)
    if (wasLive) this.deinstantiateTree(t.x, t.y)   // remove the sapling sprite

    t.stage = 'mature'
    t.plantedAt = undefined

    if (wasLive) this.instantiateTree(t as { x: number; y: number; stage: string })   // bring in the mature tree + collision
  }

  // Axe-click on a mature tree within range: shake it side to side as a hit
  // reaction. Returns true if a tree was hit. (Felling comes later.)
  private tryChop(clickX: number, clickY: number): boolean {
    const now = state.gameTime
    if (now - this.lastChopAt < Overworld.CHOP_COOLDOWN_MS) return false
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false

    // Elliptical hit area, biased DOWNWARD: same horizontal reach (RX), tall
    // (RY), and the center dropped by CHOP_HIT_DOWN so most of the vertical
    // reach is below the trunk center — clicks low on the tree register.
    const CHOP_HIT_RX = 18
    const CHOP_HIT_RY = 26
    const CHOP_HIT_DOWN = 14
    for (const t of state.plantedTrees) {
      if (t.stage !== 'mature' && t.stage !== 'dead') continue
      // trunk sits ~6px left of the sprite's stored center, so offset the hit test
      const tdx = clickX - (t.x - 6)
      const tdy = clickY - (t.y + CHOP_HIT_DOWN)
      if ((tdx * tdx) / (CHOP_HIT_RX * CHOP_HIT_RX) + (tdy * tdy) / (CHOP_HIT_RY * CHOP_HIT_RY) > 1) continue

      const key = `${t.x},${t.y}`
      const sprite = this.matureTreeSprites.get(key)
      if (sprite) this.shakeTree(sprite, t.x)
      this.lastChopAt = now   // start cooldown only on a landed hit

      // count the hit; fell on the 7th
      const hits = (this.treeHits.get(key) ?? 0) + 1
      if (hits >= Overworld.CHOP_HITS_TO_FELL) {
        this.treeHits.delete(key)
        this.fellTree(t, sprite)
      } else {
        this.treeHits.set(key, hits)
      }
      return true
    }
    return false
  }

  // Melee-click on a nearby coyote: deals `damage`, flashes it red, knocks it
  // back. Shares the axe swing cooldown + range gate with tryChop, so one swing
  // hits a tree OR an enemy. Returns true on a landed hit.
  private tryAxeEnemy(clickX: number, clickY: number, damage: number): boolean {
    const now = state.gameTime
    if (now - this.lastChopAt < Overworld.CHOP_COOLDOWN_MS) return false
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false

    // Hit area = each enemy's body AABB expanded by a margin, so a click anywhere
    // on the visible enemy lands (raw body boxes are smaller than the sprites).
    const M = 14
    for (const ref of listEnemies(state.coyotes, state.bandits)) {
      if (ref.enemy.dying) continue
      const b = ref.body
      if (clickX < b.x - M || clickX > b.x + b.w + M) continue
      if (clickY < b.y - M || clickY > b.y + b.h + M) continue
      // An enemy still in its i-frame flash can't be hit — skip it so a click can
      // still land on another valid enemy under the cursor instead of whiffing.
      if (!this.damageEnemy(ref, damage, this.player.x, this.player.y, false, true)) continue
      this.lastChopAt = now   // start cooldown only on a landed hit
      return true
    }
    return false
  }


  // Try to mine a nearby rock formation with the pickaxe. For now: shake
  // feedback only. Hit counting, depletion, and drops come later.
  private tryMine(clickX: number, clickY: number): boolean {
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false

    const HIT_RADIUS = 24
    const hitSq = HIT_RADIUS * HIT_RADIUS
    // pick the CLOSEST rock tile to the click, by sprite position. Mining is
    // independent of collision — rock tiles aren't in the obstacle array.
    let bestKey: string | null = null
    let bestDistSq = hitSq
    for (const k of this.rockSprites.keys()) {
      const [tx, ty] = k.split(',').map(Number)
      const odx = clickX - tx
      const ody = clickY - ty
      const dSq = odx * odx + ody * ody
      if (dSq <= bestDistSq) {
        bestDistSq = dSq
        bestKey = k
      }
    }
    if (bestKey) {
      let key = bestKey

      // if this tile is locked beneath another, redirect the hit to the
      // blocking tile (you're really hitting the piece on top). Only redirect
      // while the blocker still exists.
      const blocker = this.rockMineBlockedBy.get(key)
      if (blocker && this.rockSprites.has(blocker)) {
        key = blocker
      }

      // shake the whole formation as one rigid body via its container
      const formKey = this.rockTileToFormation.get(key)
      if (formKey) {
        const container = this.rockContainers.get(formKey)
        if (container) {
          this.tweens.killTweensOf(container)
          container.x = 0
          this.tweens.add({
            targets: container,
            x: 1,
            duration: 30,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.inOut',
            onComplete: () => { container.x = 0 },
          })
        }
      }

      // count hits on this tile; deplete on threshold
      const hits = (this.rockHits.get(key) ?? 0) + 1
      if (hits >= Overworld.MINE_HITS_TO_DEPLETE) {
        this.rockHits.delete(key)
        this.depleteTile(key)
      } else {
        this.rockHits.set(key, hits)
      }
      return true
    }
    return false
  }

  // Destroy a single mined-out rock tile: remove its sprite, obstacle, and
  // drop stone at its position. The formation shrinks piece by piece.
  private depleteTile(key: string) {
    const formKey = this.rockTileToFormation.get(key)

    const sprite = this.rockSprites.get(key)
    if (sprite) {
      const [tx, ty] = key.split(',').map(Number)
      // burst debris in the tile's own rock colors before it's gone
      this.spawnParticles(tx, ty, spriteColors(sprite.texture.key))
      sprite.destroy()
      this.rockSprites.delete(key)

      if (formKey) {
        // Remove the old formation-wide collision if it still exists.
        const rockBody = this.rockBodies.get(formKey)
        if (rockBody) this.matter.world.remove(rockBody)
        this.rockBodies.delete(formKey)
        const collObs = this.rockCollision.get(formKey)
        if (collObs) {
          const ci = this.obstacles.indexOf(collObs)
          if (ci !== -1) this.obstacles.splice(ci, 1)
        }
        this.rockCollision.delete(formKey)

        // Remove all existing per-tile collisions for this formation.
        for (const [tk, fk] of this.rockTileToFormation) {
          if (fk !== formKey) continue
          const existing = this.rockTileCollision.get(tk)
          if (existing) {
            const ci = this.obstacles.indexOf(existing.obs)
            if (ci !== -1) this.obstacles.splice(ci, 1)
            this.matter.world.remove(existing.body)
            this.rockTileCollision.delete(tk)
          }
        }

        // Rebuild per-tile collision for each surviving tile.
        const TILE = 24
        for (const [tk, fk] of this.rockTileToFormation) {
          if (fk !== formKey || !this.rockSprites.has(tk)) continue
          const [ttx, tty] = tk.split(',').map(Number)
          const tileObs = { x: ttx - TILE / 2, y: tty - TILE / 2, w: TILE, h: TILE, kind: 'rock' as ObstacleKind }
          this.obstacles.push(tileObs)
          const tileBody = this.addBlocker(tileObs)
          this.rockTileCollision.set(tk, { obs: tileObs, body: tileBody })
        }
      }

      let dir = 0   
      let dropY = ty   
      let centerBias = 0
      let isolated = false  
      if (formKey) {
        const originX = Number(formKey.split(',')[0])
        const baseY = Number(formKey.split(',')[1])
        const centerX = originX + 24   // origin + TILE
        if (tx < centerX - 1) dir = -1
        else if (tx > centerX + 1) dir = 1
        // always drop at the formation's base row, so the stacked top bump
        // piece deposits at ground level instead of spewing from mid-air
        dropY = baseY
        // which neighbor tiles are still standing? (this tile's own sprite is
        // already deleted above, so these reflect the remaining formation)
        const leftStands = this.rockSprites.has(`${originX},${baseY}`)
        const centerStands = this.rockSprites.has(`${centerX},${baseY}`)
          || this.rockSprites.has(`${centerX},${baseY - 24}`)   // base or top bump
        const rightStands = this.rockSprites.has(`${originX + 48},${baseY}`)
        if (dir === -1) {
          // left tile broke — neighbor is center
          isolated = !centerStands
        } else if (dir === 1) {
          // right tile broke — neighbor is center
          isolated = !centerStands
        } else {
          // center column broke — neighbors are left and right
          isolated = !leftStands && !rightStands
          if (!isolated) {
            if (!leftStands && rightStands) centerBias = -1
            else if (!rightStands && leftStands) centerBias = 1
          }
        }
      }

      // scatter 2–4 separate dropped items, each rolled independently. Each
      // flies outward from the rock so it doesn't clip into remaining tiles.
      const drops = 2 + Math.floor(Math.random() * 3)
      for (let d = 0; d < drops; d++) {
        // stagger each drop so they fly out one at a time — you can see each
        // ore appear in sequence and read what you pulled
        this.time.delayedCall(d * 50, () => {
          const fly = isolated
            ? 0
            : dir !== 0
              ? dir
              : centerBias !== 0
                ? centerBias
                : (Math.random() < 0.5 ? -1 : 1)
          const dist = 4 + Math.random() * 26         // wide random fly-out distance
          // isolated → spread out around the break point (no side offset).
          // otherwise → fly out to one side by dist.
          const landX = isolated
            ? tx + (Math.random() - 0.5) * 60
            : tx + fly * dist
          const landY = dropY + (Math.random() - 0.5) * 16
          // sprite starts at the break point (tx) and arcs out to landX
          this.dropStack(landX, landY, { type: rollOre(), count: 1 }, tx)
        })
      }
    }
  }

  // Non-destructive: is there a placed post within axe hit-radius of this
  // point? Mirrors tryAxePost's search so the cursor (which calls this) can
  // never disagree with whether a click would actually destroy a post.
  isNearPost(x: number, y: number): boolean {
    const hitSq = Overworld.POST_HIT_RADIUS * Overworld.POST_HIT_RADIUS
    for (const p of state.placedPosts) {
      const dx = x - p.x
      const dy = y - p.y
      if (dx * dx + dy * dy <= hitSq) return true
    }
    return false
  }

  // True if (x, y) is over a placed crate. Used by the cursor to show the
  // grab affordance when hovering a crate (gated on range by the caller).
  isNearCrate(x: number, y: number): boolean {
    const hitSq = 26 * 26
    for (const c of state.placedCrates) {
      const dx = x - c.x
      const dy = y - c.y
      if (dx * dx + dy * dy <= hitSq) return true
    }
    return false
  }

  // ---- Unified action resolver ----
  // Single source of truth for "what would a left-click at (worldX, worldY)
  // do right now?" Both the worldBg click handler and the cursor call this,
  // so the cursor can never show an affordance that disagrees with the click.
  //
  // Returns null when no action is feasible (→ default cursor). The `kind`
  // drives the cursor texture via ACTION_CURSOR below; the handler's
  // perform() dispatches on `kind` to fire the actual side effects.
  //
  // Pure — no side effects. Safe to call every frame from the cursor.

  // --- can* predicates (pure feasibility gates) ---

  canDestroyPost(wx: number, wy: number): number | null {
    const dx = wx - this.player.x
    const dy = wy - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return null
    const hitSq = Overworld.POST_HIT_RADIUS * Overworld.POST_HIT_RADIUS
    let best: number | null = null
    let bestDist = Infinity
    for (let i = 0; i < state.placedPosts.length; i++) {
      const p = state.placedPosts[i]
      const pdx = wx - p.x
      const pdy = wy - p.y
      const d = pdx * pdx + pdy * pdy
      if (d <= hitSq && d < bestDist) { best = i; bestDist = d }
    }
    return best
  }

  canDestroyCrate(wx: number, wy: number): number | null {
    const dx = wx - this.player.x
    const dy = wy - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return null
    const hitSq = 26 * 26
    let best: number | null = null
    let bestDist = Infinity
    for (let i = 0; i < state.placedCrates.length; i++) {
      const c = state.placedCrates[i]
      const cdx = wx - c.x
      const cdy = wy - c.y
      const d = cdx * cdx + cdy * cdy
      if (d <= hitSq && d < bestDist) { best = i; bestDist = d }
    }
    return best
  }

  // Which built plot is the point over, within tool range? Returns the plot
  // index or null. Mirrors the plot-footprint test used by tryDig/tryPlacePost.
  canDestroyPipe(wx: number, wy: number): number | null {
    const dx = wx - this.player.x
    const dy = wy - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return null
    let best: number | null = null
    let bestDist = Infinity
    for (let i = 0; i < state.pipes.length; i++) {
      const pipe = state.pipes[i]
      const a = this.plotViews[pipe.fromPlot]
      const b = this.plotViews[pipe.toPlot]
      const d = pointToSegmentDist(wx, wy, a.x, a.y, b.x, b.y)
      if (d <= 12 && d < bestDist) { best = i; bestDist = d }
    }
    return best
  }

  // Empty plots return null — only built plots are destroyable.
  canDestroyPlot(wx: number, wy: number): number | null {
    const dx = wx - this.player.x
    const dy = wy - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return null
    for (let i = 0; i < this.plotViews.length; i++) {
      if (state.plots[i].built === 'empty') continue
      const v = this.plotViews[i]
      if (Math.abs(wx - v.x) < PLOT_SIZE / 2 && Math.abs(wy - v.y) < PLOT_SIZE / 2) return i
    }
    return null
  }

  canOpenCrate(wx: number, wy: number): number | null {
    const hitSq = 26 * 26
    let best = -1
    let bestDistSq = hitSq
    for (let i = 0; i < state.placedCrates.length; i++) {
      const c = state.placedCrates[i]
      const dx = wx - c.x
      const dy = wy - c.y
      const dSq = dx * dx + dy * dy
      if (dSq <= bestDistSq) { bestDistSq = dSq; best = i }
    }
    if (best < 0) return null
    const c = state.placedCrates[best]
    const pdx = c.x - this.player.x
    const pdy = c.y - this.player.y
    if (pdx * pdx + pdy * pdy > CRATE_RANGE * CRATE_RANGE) return null
    return best
  }

  canChopTree(wx: number, wy: number): boolean {
    const dx = wx - this.player.x
    const dy = wy - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false
    // Must match tryChop's elliptical hit area exactly (incl. downward bias),
    // or the cursor would show "choppable" where a click wouldn't actually chop.
    const CHOP_HIT_RX = 18
    const CHOP_HIT_RY = 26
    const CHOP_HIT_DOWN = 14
    for (const t of state.plantedTrees) {
      if (t.stage !== 'mature' && t.stage !== 'dead') continue
      const tdx = wx - (t.x - 6)
      const tdy = wy - (t.y + CHOP_HIT_DOWN)
      if ((tdx * tdx) / (CHOP_HIT_RX * CHOP_HIT_RX) + (tdy * tdy) / (CHOP_HIT_RY * CHOP_HIT_RY) <= 1) return true
    }
    return false
  }

  canMineRock(wx: number, wy: number): boolean {
    const dx = wx - this.player.x
    const dy = wy - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false
    const hitSq = 24 * 24
    for (const k of this.rockSprites.keys()) {
      const [tx, ty] = k.split(',').map(Number)
      const odx = wx - tx
      const ody = wy - ty
      if (odx * odx + ody * ody <= hitSq) return true
    }
    return false
  }

  canMount(): number | null {
    const rangeSq = MOUNT_RANGE * MOUNT_RANGE
    for (let i = 0; i < state.honses.length; i++) {
      const h = state.honses[i]
      const dx = h.x - this.player.x
      const dy = h.y - this.player.y
      if (dx * dx + dy * dy <= rangeSq) return i
    }
    return null
  }

  // The resolver. Context: 'overworld' for world clicks/cursor, 'interior'
  // for field/workshop (currently only tools matter there — no position
  // predicates). worldX/worldY are the pointer's world-space coords.
  resolveOverworldAction(worldX: number, worldY: number): OverworldAction | null {
    // A free-floating drag item owns the cursor — suppress all tool/aim cursors
    // and world actions so there's only ever one thing on the cursor at a time.
    const ui = this.scene.get('UI') as UI
    if (ui.getDragController().isHolding()) return null

    const sel = state.inventory[state.selectedInventorySlot]
    const heldType = sel?.type ?? null
    const tool = state.getSelectedTool()
    const isDestroyTool = heldType === 'axe' || heldType === 'pickaxe'

    // 1. Untie rope (interior segments only — ends excluded elsewhere).
    // Works mounted or on foot.
    if (this.rope.isNearTiedRope(worldX, worldY, this.player.x, this.player.y, TOOL_RANGE)) {
      return { kind: 'untie-rope' }
    }

    // Selected food shows its sprite on the cursor (signals "click to eat").
    // No range — you're eating it, not aiming at the world.
    if (heldType !== null && ITEMS[heldType].edible) {
      return { kind: 'eat-food', sprite: ITEMS[heldType].sprite, scale: ITEMS[heldType].scale }
    }

    // 2. Destroy targets (axe or pickaxe held)
    if (isDestroyTool) {
      if (this.canDestroyPost(worldX, worldY) !== null) return { kind: 'destroy-post' }
      if (this.canDestroyCrate(worldX, worldY) !== null) return { kind: 'destroy-crate' }
      if (this.canDestroyGate(worldX, worldY) !== null) return { kind: 'destroy-gate' }
      if (this.canDestroyPlot(worldX, worldY) !== null) return { kind: 'destroy-plot' }
      if (this.canDestroyPipe(worldX, worldY) !== null) return { kind: 'destroy-pipe' }
      if (this.canDestroyWood(worldX, worldY)) return { kind: 'destroy-wood' }
      if (heldType === 'axe' && this.canChopTree(worldX, worldY)) return { kind: 'chop-tree', sprite: tool!.sprite, scale: tool!.scale }
    }

    // 3. Mine (pickaxe only)
    if (heldType === 'pickaxe' && this.canMineRock(worldX, worldY)) {
      return { kind: 'mine-rock', sprite: tool!.sprite, scale: tool!.scale }
    }

    // 4. Tool-range actions (shovel, sapling, post, crate, rope)
    if (tool) {
      const dx = worldX - this.player.x
      const dy = worldY - this.player.y
      const reach = (heldType === 'crate' || heldType === 'chest' || heldType === 'silver_lockbox' || heldType === 'gold_lockbox') ? CRATE_RANGE : TOOL_RANGE
      const inRange = dx * dx + dy * dy <= reach * reach

      if (heldType === 'shovel' && inRange) {
        return { kind: 'dig', sprite: tool.sprite, scale: tool.scale }
      }
      if (heldType === 'cottonwood_sapling') {
        if (inRange && this.findPlantableDirtSpot(worldX, worldY)) {
          return { kind: 'plant-sapling', sprite: tool.sprite, scale: tool.scale }
        }
        return null  // sapling held but not over dirt → default cursor
      }
      if ((heldType === 'post' || heldType === 'cedar_post' || heldType === 'iron_post') && inRange) {
        return { kind: 'place-post', sprite: tool.sprite, scale: tool.scale }
      }
      if ((heldType === 'crate' || heldType === 'chest') && inRange) {
        return { kind: 'place-crate', sprite: tool.sprite, scale: tool.scale }
      }
      if ((heldType === 'plank' || heldType === 'flagstone' || heldType === 'sandstone') && inRange) {
        return { kind: 'place-plank', sprite: tool.sprite, scale: tool.scale }
      }
      if (heldType === 'fence_gate' && inRange) {
        return { kind: 'place-gate', sprite: tool.sprite, scale: tool.scale }
      }
      if (heldType === 'rope') {
        return { kind: 'throw-rope', sprite: tool.sprite, scale: tool.scale }
      }
      if (heldType === 'quirt') {
        return { kind: 'quirt', sprite: tool.sprite, scale: tool.scale, gear: this.horseGear }
      }
      if (tool.gunSpread != null) {
        if (state.selectedInventorySlot !== this.lastGunSlot) {
          this.lastFireAt = 0
          this.gunFullReloadUntil = 0
          this.gunAmmo = tool.gunAmmo ?? 1
          this.lastGunSlot = state.selectedInventorySlot
        }
        const reloading = state.gameTime < this.gunFullReloadUntil
          || state.gameTime - this.lastFireAt < (tool.gunReloadMs ?? 0)
        const reticle = reloading ? 'crosshair_empty' : 'crosshair'
        if (tool.gunAmmo != null) {
          const shown = reloading && state.gameTime < this.gunFullReloadUntil ? 0 : this.gunAmmo
          return { kind: 'aim', sprite: reticle, scale: 3, bullets: `bullets_${shown}` }
        }
        return { kind: 'aim', sprite: reticle, scale: 3 }
      }
      // any other tool in range → show its cursor
      if (inRange) {
        return { kind: 'tool-generic', sprite: tool.sprite, scale: tool.scale }
      }
      return null  // tool held but out of range → default cursor
    }

    // 5. Mount honse (no tool held, not mounted, rope not attached)
    if (state.mounted === null && !this.rope.isAttached()) {
      const mi = this.canMount()
      if (mi !== null) {
        const h = state.honses[mi]
        // cursor shows the hovered honse's own sprite + coat color
        return { kind: 'mount', sprite: h.sprite, scale: 1, tint: h.tinted ? h.tint : null }
      }
    }

    // 6. Open crate (no tool held)
    if (state.mounted === null) {
      if (this.canOpenCrate(worldX, worldY) !== null) return { kind: 'open-crate' }
      if (this.canToggleGate(worldX, worldY) !== null) return { kind: 'toggle-gate' }
    }

    return null
  }

  // Axe-destroy a placed post: removes it from state, sprite, and collision,
  // bursts wood particles, and drops the post item where it stood. Returns
  // true if a post was destroyed.
  private tryAxePost(clickX: number, clickY: number): boolean {
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false

    const hitSq = Overworld.POST_HIT_RADIUS * Overworld.POST_HIT_RADIUS
    let bestIdx = -1
    let bestDist = Infinity
    for (let i = 0; i < state.placedPosts.length; i++) {
      const p = state.placedPosts[i]
      const pdx = clickX - p.x
      const pdy = clickY - p.y
      const d = pdx * pdx + pdy * pdy
      if (d <= hitSq && d < bestDist) { bestIdx = i; bestDist = d }
    }
    if (bestIdx === -1) return false

    const p = state.placedPosts[bestIdx]
    const species = p.species ?? 'post'
    const key = `${p.x},${p.y}`

    // remove the visual
    const sprite = this.placedPostSprites.get(key)
    if (sprite) sprite.destroy()
    this.placedPostSprites.delete(key)

    const postBody = this.placedPostBodies.get(key)
    if (postBody) this.matter.world.remove(postBody)
    this.placedPostBodies.delete(key)

    // remove the collision body — found by the origin stamped on it, so no
    // geometry has to be recomputed here.
    const obsIdx = this.obstacles.findIndex(
      o => o.kind === 'post' && o.originX === p.x && o.originY === p.y,
    )
    if (obsIdx !== -1) this.obstacles.splice(obsIdx, 1)

    // remove the data
    state.placedPosts.splice(bestIdx, 1)

    // update neighbor sprites (they may switch back from vertical)
    this.refreshPostNeighbors(p.x, p.y)

    this.spawnParticles(p.x, p.y, spriteColors(species))
    this.dropStack(p.x, p.y, { type: species, count: 1 })
    return true
  }

  // Axe-destroy a placed crate
  private tryAxeCrate(clickX: number, clickY: number): boolean {
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false

    const hitSq = 26 * 26
    let best = -1
    let bestDistSq = hitSq
    for (let i = 0; i < state.placedCrates.length; i++) {
      const c = state.placedCrates[i]
      const cdx = clickX - c.x
      const cdy = clickY - c.y
      const distSq = cdx * cdx + cdy * cdy
      if (distSq <= bestDistSq) {
        bestDistSq = distSq
        best = i
      }
    }
    if (best < 0) return false

    const i = best
    const c = state.placedCrates[i]

    // capture contents + position before we splice the entry away
    const contents = c.contents
    const cx = c.x
    const cy = c.y

    // remove the visual (crates are index-aligned to state.placedCrates)
    this.crateSprites[i]?.destroy()
    this.crateSprites.splice(i, 1)
    // remove the physics body
    const body = this.crateBodies[i]
    if (body) this.matter.world.remove(body)
    this.crateBodies.splice(i, 1)

    // remove the collision body (found by the stamped origin)
    const obsIdx = this.obstacles.findIndex(
      o => o.kind === 'crate' && o.originX === cx && o.originY === cy,
    )
    if (obsIdx !== -1) this.obstacles.splice(obsIdx, 1)

    // remove the data
    state.placedCrates.splice(i, 1)

    this.spawnParticles(cx, cy, spriteColors(ITEMS[(c.item ?? 'crate') as keyof typeof ITEMS].sprite))

    const itemType = (c.item ?? 'crate')
    const isLockbox = itemType === 'silver_lockbox' || itemType === 'gold_lockbox'
    if (isLockbox) {
      // A lockbox is picked up as the SAME box: it carries its unlocked state
      // and its stored contents on the item stack, and nothing spills out.
      this.dropStack(cx, cy, { type: itemType, count: 1, unlocked: c.unlocked, contents })
    } else {
      // Crates/chests: the empty container drops back and contents spill around it.
      this.dropStack(cx, cy, { type: itemType, count: 1 })
      for (const stack of contents) {
        if (!stack) continue
        const landX = cx + (Math.random() - 0.5) * 48
        const landY = cy + (Math.random() - 0.5) * 48
        this.dropStack(landX, landY, stack, cx)
      }
    }
    return true
  }

  // Axe/pickaxe-destroy a built plot: tears down the building and reverts the
  // plot to its empty, buildable state. Spills the plot's contents (producer
  // output + workshop craft slots) back to the player via state.clearPlot, but
  // refunds none of the build cost. Returns true if a plot was destroyed.
  private tryDestroyPlot(clickX: number, clickY: number): boolean {
    const plotIndex = this.canDestroyPlot(clickX, clickY)
    if (plotIndex === null) return false

    const view = this.plotViews[plotIndex]

    // capture the building's sprite key before clearPlot wipes it — the debris
    // particles are sampled from this sprite's own colors.
    const buildingType = state.plots[plotIndex].built

    // reset state first; it hands back the stacks that were in the plot
    const spill = state.clearPlot(plotIndex)

    // A destroyed building takes its pipes with it. removePipe handles the
    // visuals, the data, and the drop. Iterate descending so each splice only
    // shifts entries we've already passed.
    for (let i = state.pipes.length - 1; i >= 0; i--) {
      const p = state.pipes[i]
      if (p.fromPlot === plotIndex || p.toPlot === plotIndex) this.removePipe(i)
    }

    // remove the building sprite
    if (view.building) { view.building.destroy(); view.building = null }
    // remove the name label
    if (view.nameLabel) { view.nameLabel.destroy(); view.nameLabel = null }

    // remove the static rope-blocker Matter body
    const body = this.plotBlockerBodies.get(plotIndex)
    if (body) this.matter.world.remove(body)
    this.plotBlockerBodies.delete(plotIndex)

    // remove the collision obstacle — the plot's footprint is uniquely located
    // at (view.x - 24, view.y - 24); world structures share kind 'building' but
    // never sit at a plot's coordinates, so this matches exactly one obstacle.
    const obsIdx = this.obstacles.findIndex(
      o => o.kind === 'building' && o.x === view.x - 24 && o.y === view.y - 24,
    )
    if (obsIdx !== -1) this.obstacles.splice(obsIdx, 1)

    // bring the '$' price tag back so the plot reads as buildable again. The
    // plot's interactive rect (and its open-build-menu handler) was never
    // removed, so it works again the moment built is 'empty'.
    view.priceTag = this.add.bitmapText(view.x, view.y, 'main', '$', FONT.cost)
      .setOrigin(0.5, 0.5)
      .setTint(COLORS.plotPriceTag)

    this.spawnParticles(view.x, view.y, spriteColors(buildingType))

    // spill the plot's contents, scattered around it (same pattern as crates)
    for (const stack of spill) {
      const landX = view.x + (Math.random() - 0.5) * 48
      const landY = view.y + (Math.random() - 0.5) * 48
      this.dropStack(landX, landY, stack, view.x)
    }
    return true
  }
  private shakeTree(sprite: Phaser.GameObjects.Sprite, baseX: number) {
    this.tweens.killTweensOf(sprite)
    sprite.x = baseX
    this.tweens.add({
      targets: sprite,
      x: baseX + 2,
      duration: 40,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.inOut',
      onComplete: () => { sprite.x = baseX },
    })
  }

  // Fell a mature tree, stump revealed
  private fellTree(t: { x: number; y: number; stage: string }, sprite?: Phaser.GameObjects.Sprite) {
    const wasDead = t.stage === 'dead'
    if (sprite) {
      this.tweens.killTweensOf(sprite)
      sprite.x = t.x
      sprite.setTexture('cottonwood_stump')
    }
    t.stage = 'stump'
    const shadowKey = `${t.x},${t.y}`
    const shadow = this.treeShadowSprites.get(shadowKey)
    if (shadow) { shadow.destroy(); this.treeShadowSprites.delete(shadowKey) }


    // Falling top
    const dir = Math.random() < 0.5 ? -1 : 1   
    const CUT_ROW = 11
    const cutFrac = CUT_ROW / 16
    const falling = this.add.sprite(t.x, t.y + 9, wasDead ? 'cottonwood_dead' : 'cottonwood')
      .setScale(3)
      .setOrigin(0.5, cutFrac)        // pivot at the cut line
      .setCrop(0, 0, 12, CUT_ROW)     // show only the top 11 rows
      .setDepth(t.y + 19)             // just above the stump
    // Two phases: slide off the stump first, THEN tip over as it goes.
    this.tweens.chain({
      targets: falling,
      onComplete: () => {
        const lx = t.x + dir * 16
        const ly = t.y + 13
        const spread = [[-27, -2], [-9, 1], [9, -1], [27, 2]]
        // Stagger each log and fly it outward from the FALLEN TOP's resting
        // position (lx) — where the canopy half just landed — not the stump.
        // Matches how mined ore bursts from the rock: staggered, arcing out.
        spread.forEach(([ox, oy], d) => {
          this.time.delayedCall(d * 50, () => {
            this.dropStack(lx + ox, ly + oy, { type: 'wood', count: 1 }, lx)
          })
        })
        // rest on the ground a moment before clearing
        this.time.delayedCall(1200, () => falling.destroy())
      },
      tweens: [
        {
          // phase 1: small slide away from the stump
          x: t.x + dir * 6,
          duration: 200,
          ease: 'Quad.easeOut',
        },
        {
          // phase 2: tip over a little as it goes
          rotation: dir * Math.PI / 2,
          x: t.x + dir * 16,
          y: t.y + 9 + 4,
          duration: 500,
          ease: 'Quad.easeIn',
        },
      ],
    })
  }

  private makeTreeTrunkObstacle(tx: number, ty: number) {
    const TRUNK_W = 8
    const TRUNK_H = 2
    // Trunk foot — the sprite has root/padding below the visible trunk, so the
    // collision center sits above the sprite's bottom edge (ty + 24).
    const footY = ty + 18
    // Centered on the trunk foot so collision is even north/south.
    return {
      x: tx - TRUNK_W / 2,
      y: footY - TRUNK_H / 2,
      w: TRUNK_W,
      h: TRUNK_H,
      kind: 'tree' as ObstacleKind,
    }
  }

  private makePostObstacle(px: number, py: number) {
    const POST_W = 15
    const POST_H = 5
    const bottomY = py + 4
    return {
      x: px - POST_W / 2,
      y: bottomY - POST_H,
      w: POST_W,
      h: POST_H,
      kind: 'post' as ObstacleKind,
      originX: px,
      originY: py,
    }
  }

  // Collision body for a post. Deeper than the 5px visual footprint so a fast
  // honse can't step over the thin bar in one frame (vertical-fence tunneling).
  private static POST_BLOCKER_H = 12
  private makePostBlocker(px: number, py: number): MatterJS.BodyType {
    const obs = this.makePostObstacle(px, py)
    const cy = obs.y + obs.h / 2
    return this.addBlocker({
      x: obs.x,
      y: cy - Overworld.POST_BLOCKER_H / 2,
      w: obs.w,
      h: Overworld.POST_BLOCKER_H,
    })
  }

  private static PLAYER_HALF = 5

  // Shared post-placement grid. Player placement (tryPlacePost) and settlement
  // gen (instantiateSite) both snap to this, so authored fences always line up
  // with hand-placed posts no matter what offsets a template uses.
  private static POST_GRID = 10

  // Change dismount location if above/under it
  private solidBlockedAt(px: number, py: number, ignoreHonseIndex: number): boolean {
    const half = Overworld.PLAYER_HALF
    for (const o of this.obstacles) {
      if (o.kind === 'building') continue
      if (aabbOverlap(px, py, half, o.x, o.y, o.w, o.h)) return true
    }
    for (let i = 0; i < state.honses.length; i++) {
      if (i === ignoreHonseIndex) continue
      const b = getHonseBodyAABB(state.honses[i])
      if (aabbOverlap(px, py, half, b.x, b.y, b.w, b.h)) return true
    }
    return false
  }

  mountNearestHonse(): boolean {
    const rangeSq = MOUNT_RANGE * MOUNT_RANGE
    for (let i = 0; i < state.honses.length; i++) {
      const h = state.honses[i]
      const dx = h.x - this.player.x
      const dy = h.y - this.player.y
      if (dx * dx + dy * dy <= rangeSq) {
        state.mounted = i
        return true
      }
    }
    return false
  }

  dismount() {
    if (state.mounted === null) return
    this.horseGear = 0
    const dismountedIdx = state.mounted
    const h = state.honses[dismountedIdx]
    if (h) h.tame = true
    state.mounted = null
    const south = h ? h.y + 12 : this.player.y + 14
    const north = h ? h.y - 12 : this.player.y - 14
    this.player.y = this.solidBlockedAt(this.player.x, south, dismountedIdx) ? north : south
  }

  // Single gate for all damage to the player. Returns false (no effect) during
  // i-frames; otherwise applies damage, starts the 1s invuln window, and plays
  // the red-blink hurt animation. Every damage source routes through here.
  private static IFRAME_MS = 1000
  // Per-weapon melee damage to enemies. New weapons (tomahawk 5, etc.) slot in
  // here as data — the hit logic reads from this, nothing hardcoded per swing.
  private static WEAPON_DAMAGE: Record<string, number> = { axe: 3 }
  // Speed of the knockback impulse applied to an enemy on a melee hit.
  private static ENEMY_KNOCKBACK = 250
  // How long the enemy's AI yields to that impulse (the shove duration).
  private static ENEMY_KNOCKBACK_MS = 200
  // Knockback impulse speed for honses, in Matter body velocity units (the
  // body is driven by setVelocity, a different scale than coyote px/sec).
  private static HONSE_KNOCKBACK_V = 6
  // Peak height (px) of the little up-and-down hop on a hit, Minecraft-style.
  private static ENEMY_HOP_H = 8
  // How long the enemy's red hit-flash shows.
  private static ENEMY_HURT_MS = 400
  private static ENEMY_DEATH_MS = 200

  // Spawn a bullet from the player toward (tx, ty). Straight-line travel,
  // updated each frame in updateBullets. Damages coyotes on contact.
  private static BULLET_SPEED = 600   // px/sec
  private static BULLET_DAMAGE = 5    // 3 shots kill a 15-hp coyote
  private fireBullet(tx: number, ty: number, spread: number) {
    const dx = tx - this.player.x
    const dy = ty - this.player.y
    let angle = Math.atan2(dy, dx)
    if (spread > 0) angle += (this.bulletRng() - 0.5) * spread
    const vx = Math.cos(angle) * Overworld.BULLET_SPEED
    const vy = Math.sin(angle) * Overworld.BULLET_SPEED
    const sprite = this.add.rectangle(this.player.x, this.player.y, 8, 3, 0x2A2A2A)
      .setDepth(50000)
      .setRotation(angle)
    this.bullets.push({ x: this.player.x, y: this.player.y, vx, vy, sprite, fromBandit: false })
    spookHonsesFromShot(state.honses, this.player.x, this.player.y, state.gameTime, state.mounted)
  }

  // A bandit fires from its own position along a pre-computed unit aim direction
  // (already lead-solved). Same straight-line bullet as the player's, flagged as
  // hostile so updateBullets tests it against the player instead of enemies.
  private fireBanditBullet(bx: number, by: number, dirX: number, dirY: number) {
    // Perturb the exact lead angle by the bandit's spread cone, same seeded RNG
    // as the player's gun so shots stay deterministic with worldgen.
    const angle = Math.atan2(dirY, dirX) + (this.bulletRng() - 0.5) * BANDIT_SPREAD
    const vx = Math.cos(angle) * Overworld.BULLET_SPEED
    const vy = Math.sin(angle) * Overworld.BULLET_SPEED
    const sprite = this.add.rectangle(bx, by, 8, 3, 0x2A2A2A)
      .setDepth(50000)
      .setRotation(angle)
    this.bullets.push({ x: bx, y: by, vx, vy, sprite, fromBandit: true })
  }

  // Move bullets, check coyote hits, despawn off-screen. Called each frame.
  private updateBullets(dt: number) {
    if (this.bullets.length === 0) return
    const cam = this.cameras.main
    const margin = 80
    const viewLeft = cam.worldView.x - margin
    const viewRight = cam.worldView.x + cam.worldView.width + margin
    const viewTop = cam.worldView.y - margin
    const viewBottom = cam.worldView.y + cam.worldView.height + margin
    const hitSq = 24 * 24
    const sec = dt / 1000
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]
      b.x += b.vx * sec
      b.y += b.vy * sec
      b.sprite.setPosition(b.x, b.y)

      let hit = false

      if (b.fromBandit) {
        // Hostile bullet: only the player can be hit.
        const pdx = b.x - this.player.x
        const pdy = b.y - this.player.y
        if (pdx * pdx + pdy * pdy <= hitSq) {
          this.damagePlayer(Overworld.BULLET_DAMAGE)
          hit = true
        }
      } else {
        // Friendly bullet: any enemy, then (below) honses. Original radius test
        // around a point lifted 8px toward the sprite center — unchanged feel.
        for (const ref of listEnemies(state.coyotes, state.bandits)) {
          if (ref.enemy.dying) continue
          const cdx = b.x - ref.enemy.x
          const cdy = b.y - (ref.enemy.y - 8)
          if (cdx * cdx + cdy * cdy <= hitSq) {
            // Bullets bypass the i-frame (melee-only); they always land.
            // Knock back along the bullet's TRAVEL direction, not from its impact
            // point (which sits almost on the enemy's center, collapsing the
            // horizontal push and making him pop straight up). A point just behind
            // the bullet on its path gives a clean "shoved the way the shot flew".
            this.damageEnemy(ref, Overworld.BULLET_DAMAGE, b.x - b.vx, b.y - b.vy, true)
            hit = true
            break
          }
        }
      }

      // Obstacles block both teams.
      if (!hit) {
        for (const o of this.obstacles) {
          if (b.x >= o.x && b.x <= o.x + o.w && b.y >= o.y && b.y <= o.y + o.h) {
            hit = true
            break
          }
        }
      }

      // A bullet that hits a horse hurts it — it's a living thing, no matter who
      // fired. Only exception: your own bullets pass through the mount you're riding
      // (so you can't shoot your own horse); a bandit's bullet still hits that mount.
      if (!hit) {
        for (let hi = 0; hi < state.honses.length; hi++) {
          if (hi === state.mounted && !b.fromBandit) continue   // your shots don't hit your own mount
          if (state.honses[hi].dying) continue
          const hb = getHonseBodyAABB(state.honses[hi])
          if (b.x >= hb.x && b.x <= hb.x + hb.w && b.y >= hb.y && b.y <= hb.y + hb.h) {
            this.damageHonse(hi, Overworld.BULLET_DAMAGE, b.x, b.y)
            hit = true
            break
          }
        }
      }

      // Despawn on hit or once off-screen
      if (hit || b.x < viewLeft || b.x > viewRight || b.y < viewTop || b.y > viewBottom) {
        b.sprite.destroy()
        this.bullets.splice(i, 1)
      }
    }
  }

  // Damage any enemy: subtract hp, flash red, knock back away from (fromX,fromY),
  // and mark it dying at <= 0 hp. The per-type sprite-sync loops handle the death
  // tail (carcass, removal). Knockback magnitude is the one per-kind difference —
  // a coyote darts back, a bandit just staggers.
  // Returns true if the hit landed. An enemy still in its hurt-flash window is
  // invulnerable — the flash IS the i-frame window — so rapid repeat hits on the
  // same enemy are ignored until it stops flashing.
  // Returns true if the hit landed. An enemy still in its hurt-flash window is
  // invulnerable to MELEE (the flash IS the i-frame, stopping spam-clicks) — but
  // bullets bypass it via ignoreInvuln, since they're already rate-limited by the
  // gun's fire rate and travel time.
  private damageEnemy(ref: EnemyRef, amount: number, fromX: number, fromY: number, ignoreInvuln = false, melee = false): boolean {
    const e = ref.enemy
    if (e.dying) return false
    if (!ignoreInvuln && state.gameTime < e.hurtUntil) return false   // still flashing → melee can't hit
    e.health -= amount
    e.hurtUntil = state.gameTime + Overworld.ENEMY_HURT_MS
    let kx = e.x - fromX
    let ky = e.y - fromY
    const len = Math.sqrt(kx * kx + ky * ky) || 1
    kx /= len; ky /= len
    const kb = ref.kind === 'bandit' ? BANDIT_KNOCKBACK : Overworld.ENEMY_KNOCKBACK
    const kbMs = ref.kind === 'bandit' ? BANDIT_KNOCKBACK_MS : Overworld.ENEMY_KNOCKBACK_MS
    // A dormant bandit who gets shot wakes up — no free kills while he's holding.
    if (ref.kind === 'bandit') (e as Bandit).active = true
    e.vx = kx * kb
    e.vy = ky * kb
    e.knockbackUntil = state.gameTime + kbMs
    if (e.health <= 0) {
      e.dying = true
      e.hurtUntil = state.gameTime + Overworld.ENEMY_DEATH_MS
    } else if (melee && ref.kind === 'bandit') {
      // Swung at and survived → he scrambles away from the attacker.
      startBanditRetreat(e as Bandit, fromX, fromY, state.gameTime)
    }
    return true
  }

  private damageHonse(index: number, amount: number, fromX: number, fromY: number) {
    const h = state.honses[index]
    if (!h || h.dying) return
    h.health -= amount
    h.hurtUntil = state.gameTime + Overworld.ENEMY_HURT_MS
    spookHonse(h, fromX, fromY, state.gameTime, true)
    let kx = h.x - fromX
    let ky = h.y - fromY
    const len = Math.sqrt(kx * kx + ky * ky) || 1
    kx /= len; ky /= len
    h.knockbackUntil = state.gameTime + Overworld.ENEMY_KNOCKBACK_MS
    // Honses are Matter bodies — knock them back with an impulse on the body,
    // never by writing position. The body drives h.x/h.y back into state.
    const mb = this.honseBodies[index]
    if (mb) {
      if (mb.isSleeping) { mb.isSleeping = false; (mb as any).sleepCounter = 0 }
      this.matter.body.setVelocity(mb, { x: kx * Overworld.HONSE_KNOCKBACK_V, y: ky * Overworld.HONSE_KNOCKBACK_V })
    }
    if (h.health <= 0) {
      h.dying = true
      h.hurtUntil = state.gameTime + Overworld.ENEMY_DEATH_MS
    }
  }

  damagePlayer(amount: number): boolean {
    if (state.gameTime < this.invulnerableUntil) return false
    state.changeHealth(-amount, this.registry)
    this.invulnerableUntil = state.gameTime + Overworld.IFRAME_MS
    this.playHurtBlink()
    return true
  }

  private playHurtBlink() {
    const p = this.player
    p.setTexture('player_hurt')
    p.setVisible(false)   // first blink-off lands on the impact frame
    // red silhouette blinks in and out across the i-frame window (NES style):
    // visible-red, gone, visible-red, gone... then restore the normal sprite.
    const event = this.time.addEvent({
      delay: 100,
      repeat: 9,
      callback: () => {
        if (event.repeatCount === 0) {
          p.setVisible(true)
          p.setTexture('player')
        } else {
          p.setVisible(!p.visible)
        }
      },
    })
  }

  // True if the player is inside any safe zone (the original spawn area).
  private playerInSafeZone(): boolean {
    const px = this.player.x, py = this.player.y
    for (const z of this.safeZones) {
      if (px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) return true
    }
    return false
  }

  private collidesAt(px: number, py: number, ignoreHonseIndex?: number, checkBuildings = ignoreHonseIndex !== undefined, ignoreAllHonses = false): boolean {
    const half = Overworld.PLAYER_HALF
    for (const o of this.obstacles) {
      if (!checkBuildings && o.kind === 'building') continue
      if (aabbOverlap(px, py, half, o.x, o.y, o.w, o.h)) return true
    }
    if (!ignoreAllHonses) {
      for (let i = 0; i < state.honses.length; i++) {
        if (i === ignoreHonseIndex) continue
        const b = getHonseBodyAABB(state.honses[i])
        if (aabbOverlap(px, py, half, b.x, b.y, b.w, b.h)) return true
      }
    }
    return false
  }

  spawnRockFormation(x: number, y: number) {
    const TILE = 24
    const bottomY = y + TILE / 2   // bump sprite anchor (vertical position)
    const sortDepth = y + 8 // sort by the rock's ground line (its base)
    const formKey = `${x},${y}`
    const container = this.add.container(0, 0).setDepth(sortDepth)
    this.rockContainers.set(formKey, container)
    const register = (sprite: Phaser.GameObjects.Sprite, tx: number, ty: number) => {
      sprite.setDepth(sortDepth)
      container.add(sprite)
      const key = `${tx},${ty}`
      this.rockSprites.set(key, sprite)
      this.rockTileToFormation.set(key, formKey)
    }

    register(this.add.sprite(x, y, 'rock_tl').setScale(3), x, y)
    register(this.add.sprite(x + TILE * 2, y, 'rock_tr').setScale(3), x + TILE * 2, y)

    const midX = x + TILE
    const BUMP_W = 8, BUMP_H = 11, TOP_ROWS = 5  
    const base = this.add.sprite(midX, bottomY, 'rock_bump').setScale(3)
      .setOrigin(0.5, 1)
      .setCrop(0, TOP_ROWS, BUMP_W, BUMP_H - TOP_ROWS)
    register(base, midX, y)
    // top piece — top rows, SAME position and origin as base, different crop
    const top = this.add.sprite(midX, bottomY, 'rock_bump').setScale(3)
      .setOrigin(0.5, 1)
      .setCrop(0, 0, BUMP_W, TOP_ROWS)
    register(top, midX, y - TILE)   
    this.rockMineBlockedBy.set(`${midX},${y}`, `${midX},${y - TILE}`)
    this.rockBodies.set(formKey, this.addBlocker({ x: x - TILE / 2, y: y - TILE / 2, w: TILE * 3, h: TILE }))
    const collObs = { x: x - TILE / 2, y: y - TILE / 2, w: TILE * 3, h: TILE, kind: 'rock' as ObstacleKind }
    this.obstacles.push(collObs)
    this.rockCollision.set(formKey, collObs)
  }

  // Single source of truth for everything physical on the map
  getBlockers(pad = 40): { x: number; y: number; radius: number }[] {
    const out: { x: number; y: number; radius: number }[] = []
    for (const o of this.obstacles) {
      const cx = o.x + o.w / 2
      const cy = o.y + o.h / 2
      const radius = Math.hypot(o.w, o.h) / 2 + pad
      out.push({ x: cx, y: cy, radius })
    }
    for (const h of state.honses) {
      out.push({ x: h.x, y: h.y, radius: 20 + pad })
    }
    return out
  }

  private addBlocker(aabb: { x: number; y: number; w: number; h: number }): MatterJS.BodyType {
    return this.matter.add.rectangle(
      aabb.x + aabb.w / 2,
      aabb.y + aabb.h / 2,
      aabb.w,
      aabb.h,
      { isStatic: true },
    )
  }

  private logPlacement(label: string, x: number, y: number) {
    console.log(`[place] ${label} @ ${Math.round(x)}, ${Math.round(y)}`)
  }

  // Creates the sprite for a dropped item and returns it.
  private spawnDroppedSprite(x: number, y: number, type: ItemType, jump: boolean, flyFromX?: number): Phaser.GameObjects.Sprite {
    const sprite = this.add.sprite(x, y, ITEMS[type].sprite)
      .setScale(ITEMS[type].scale)
      .setDepth(y - 12)
    sprite.setData('baseY', y)
    sprite.setData('bobPhase', Math.random() * Math.PI * 2)
    // fresh drops are locked from pickup briefly so they don't vanish underfoot;
    // restored drops (from save) are immediately collectable.
    // pickupAt is a game-time stamp (read against state.gameTime in update),
    // so the post-drop delay freezes with everything else on pause.
    sprite.setData('pickupAt', jump ? state.gameTime + Overworld.PICKUP_DELAY_MS : 0)
    if (jump) {
      // not settled yet — the bob loop skips it so it can't fight the tween
      sprite.setData('settled', false)
      sprite.y = y - Overworld.DROP_JUMP_HEIGHT
      // optional horizontal fly-out: start at flyFromX and arc to the final x
      // (used by mining so ore visibly bursts away from the rock)
      if (flyFromX !== undefined) sprite.x = flyFromX
      // Horizontal fly-out eases smoothly to a stop (no sideways bounce).
      if (flyFromX !== undefined) {
        this.tweens.add({
          targets: sprite,
          x,
          duration: Overworld.DROP_JUMP_MS,
          ease: 'Quad.easeOut',
        })
      }
      // Vertical landing hop bounces, then hands off to the float bob.
      this.tweens.add({
        targets: sprite,
        y,
        duration: Overworld.DROP_JUMP_MS,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          // hand off at the bob's trough (sin = -1) so it starts at rest with
          // zero vertical velocity, then eases upward — no reversal jerk.
          sprite.setData('baseY', y + Overworld.DROP_BOB_AMP)
          // Seed the phase against the game clock (same clock the bob loop
          // reads) so sin() = -1 at this handoff instant: starts at the trough,
          // at rest, no reversal jerk — and freezes cleanly on pause.
          sprite.setData('bobPhase', -state.gameTime * Overworld.DROP_BOB_SPEED - Math.PI / 2)
          sprite.setData('settled', true)
        },
      })
    } else {
      sprite.setData('settled', true)
    }
    return sprite
  }

  private dropStack(x: number, y: number, stack: ItemStack, flyFromX?: number) {
    state.droppedItems.push({ x, y, stack })
    this.droppedSprites.push(this.spawnDroppedSprite(x, y, stack.type, true, flyFromX))
    this.logPlacement(stack.type, x, y)
  }

  // Consume 1 of the selected hotbar item if it's edible. Returns true if eaten.
  private tryEatSelected(): boolean {
    const slot = state.selectedInventorySlot
    const stack = state.inventory[slot]
    if (!stack) return false
    if (!ITEMS[stack.type].edible) return false
    stack.count -= 1
    if (stack.count <= 0) state.inventory[slot] = null
    this.registry.events.emit('inventory-changed')
    return true
  }

  // Eat the selected hotbar food (if any), applying crumbs + buffs + heal.
  // Returns true if something was eaten. Shared by left and right click so
  // either button consumes the held-in-hotbar food.
  private eatSelectedFood(): boolean {
    const def = this.peekSelectedEdibleDef()
    if (!def || !this.tryEatSelected()) return false
    this.spawnCrumbs(this.player.x, this.player.y, def.crumbColor!)
    state.speedBuffEndsAt = state.gameTime + FOOD_BUFF_MS
    state.speedBuffAmount = def.speedBuff!
    if (def.healFull) state.healToFull(this.registry)
    else if (def.healHearts) state.changeHealth(def.healHearts, this.registry)
    return true
  }

  // Returns the ItemDef of the selected hotbar item if edible, else undefined.
  private peekSelectedEdibleDef(): ItemDef | undefined {
    const stack = state.inventory[state.selectedInventorySlot]
    if (!stack) return undefined
    const def = ITEMS[stack.type]
    if (!def.edible) return undefined
    return def
  }

  // Four waves of food-colored crumbs spraying from the player. Pixel-art friendly:
  // no fade, just arc-and-snap-and-vanish like spawnParticles.
  private spawnCrumbs(x: number, y: number, color: number) {
    this.spawnCrumbWave(x, y, color)
    this.time.delayedCall(150, () => this.spawnCrumbWave(x, y, color))
    this.time.delayedCall(300, () => this.spawnCrumbWave(x, y, color))
    this.time.delayedCall(450, () => this.spawnCrumbWave(x, y, color))
  }

  private spawnCrumbWave(x: number, y: number, color: number) {
    const COUNT = 6
    for (let i = 0; i < COUNT; i++) {
      const angle = (Math.PI / 6) + Math.random() * (Math.PI * 2 / 3)
      const speed = 8 + Math.random() * 8
      const dx = Math.cos(angle) * speed
      const dy = -Math.sin(angle) * speed
      const p = this.add.rectangle(x, y - 2, 2, 2, color).setDepth(1001)
      const landX = Math.floor(x + dx)
      const landY = Math.floor(y + dy + 10)   // small gravity arc
      this.tweens.add({
        targets: p,
        x: landX,
        y: landY,
        duration: 300 + Math.random() * 80,
        ease: 'Quad.easeOut',
        onComplete: () => {
          p.setPosition(landX, landY)
          this.time.delayedCall(200, () => p.destroy())
        },
      })
    }
  }

  private trySaplingPlant(clickX: number, clickY: number): boolean {
    const slotIdx = state.selectedInventorySlot
    const stack = state.inventory[slotIdx]
    if (!stack || stack.type !== 'cottonwood_sapling') return false
    const planted = this.tryPlantFromStack(clickX, clickY, stack)
    if (planted) {
      if (stack.count <= 0) state.inventory[slotIdx] = null
      this.registry.events.emit('inventory-changed')
    }
    return planted
  }

  private tryPlacePost(clickX: number, clickY: number): boolean {
    const slotIdx = state.selectedInventorySlot
    const stack = state.inventory[slotIdx]
    if (!stack || (stack.type !== 'post' && stack.type !== 'cedar_post' && stack.type !== 'iron_post')) return false
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false
    const species = stack.type   // 'post' | 'cedar_post'

    const POST_GRID = Overworld.POST_GRID
    const x = Math.round(clickX / POST_GRID) * POST_GRID
    const y = Math.round(clickY / POST_GRID) * POST_GRID

    // refuse if a post already occupies this exact grid cell. 
    if (this.placedPostSprites.has(`${x},${y}`)) return false

    // refuse if inside any plot footprint
    for (const v of this.plotViews) {
      if (Math.abs(x - v.x) < PLOT_SIZE / 2 && Math.abs(y - v.y) < PLOT_SIZE / 2) return false
    }
    // refuse if inside any world structure footprint (~32px square)
    for (const s of state.worldStructures) {
      if (Math.abs(x - s.x) < 32 && Math.abs(y - s.y) < 32) return false
    }
    // refuse if the post's base would overlap any existing obstacle except other posts
    const newObs = this.makePostObstacle(x, y)
    for (const o of this.obstacles) {
      if (o.kind === 'post') continue
      if (boxOverlap(newObs.x, newObs.y, newObs.w, newObs.h, o.x, o.y, o.w, o.h)) return false
    }
    // refuse if the post's base would overlap any honse body
    for (const h of state.honses) {
      const b = getHonseBodyAABB(h)
      if (boxOverlap(newObs.x, newObs.y, newObs.w, newObs.h, b.x, b.y, b.w, b.h)) return false
    }
    const half = Overworld.PLAYER_HALF
    if (boxOverlap(newObs.x, newObs.y, newObs.w, newObs.h,
      this.player.x - half, this.player.y - half, half * 2, half * 2)) return false

    state.placedPosts.push({ x, y, species })
    this.spawnPostSprite(x, y, species)
    this.obstacles.push(newObs)
    this.placedPostBodies.set(`${x},${y}`, this.makePostBlocker(x, y))
    this.logPlacement(species, x, y)
    this.refreshPostNeighbors(x, y)

    stack.count -= 1
    if (stack.count <= 0) state.inventory[slotIdx] = null
    this.registry.events.emit('inventory-changed')
    return true
  }

  spawnCrate(x: number, y: number, item: string = 'crate') {
    const isLockbox = item === 'silver_lockbox' || item === 'gold_lockbox'
    state.placedCrates.push({ x, y, item: item as any, contents: createContainerContents(item as any), unlocked: isLockbox ? false : true })
    this.spawnContainer(x, y, item)
  }

  // Footprint (w,h) of a placed container's collision box, derived from its
  // rendered sprite so a wider chest gets a wider box — no magic numbers.
  private containerFootprint(item: string): { w: number; h: number } {
    const def = ITEMS[item as keyof typeof ITEMS]
    // Use the texture frame's real dimensions — works for baked (generated)
    // textures where getSourceImage() may not carry width/height.
    const frame = this.textures.getFrame(def.sprite)
    const tw = frame?.width ?? 8
    const th = frame?.height ?? 8
    const scale = def.scale
    const w = tw * scale
    const h = th * scale
    return { w, h }
  }

  private makeCrateObstacle(cx: number, cy: number, item = 'crate') {
    const { w, h } = this.containerFootprint(item)
    return {
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      kind: 'crate' as ObstacleKind,
      originX: cx,
      originY: cy,
    }
  }

  // Single container spawn used by placement and restore-on-load. Builds the
  // sprite, open handler, Matter body, and obstacle for a crate or chest,
  // sizing the body/obstacle to the item's footprint. Pushes nothing to
  // state.placedCrates — the caller owns that (so placement can roll contents
  // and restore can reuse the persisted entry).
  private spawnContainer(x: number, y: number, item: string) {
    const def = ITEMS[item as keyof typeof ITEMS]
    const { w, h } = this.containerFootprint(item)
    const sprite = this.add.sprite(x, y, def.sprite).setScale(def.scale).setDepth(y - 8).setInteractive()
    this.attachCrateOpenHandler(sprite)
    this.crateSprites.push(sprite)
    const cbody = this.matter.add.rectangle(x, y, w, h, { frictionAir: 0.4 })
    // Lock rotation: the sprite always draws upright, so the body must not spin
    // (otherwise the rope anchor / constraint pointB drift off the visual box).
    this.matter.body.setInertia(cbody, Infinity)
    this.crateBodies.push(cbody)
    this.obstacles.push(this.makeCrateObstacle(x, y, item))
  }

  private tryPlaceCrate(clickX: number, clickY: number): boolean {
    const slotIdx = state.selectedInventorySlot
    const stack = state.inventory[slotIdx]
    if (!stack || (stack.type !== 'crate' && stack.type !== 'chest' && stack.type !== 'silver_lockbox' && stack.type !== 'gold_lockbox')) return false
    const item = stack.type
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
  
    if (dx * dx + dy * dy > CRATE_RANGE * CRATE_RANGE) return false

    const CRATE_GRID = 10
    const x = Math.round(clickX / CRATE_GRID) * CRATE_GRID
    const y = Math.round(clickY / CRATE_GRID) * CRATE_GRID

    // refuse if a crate already sits on this exact grid cell
    if (state.placedCrates.some(c => c.x === x && c.y === y)) return false

    // refuse if inside any plot footprint
    for (const v of this.plotViews) {
      if (Math.abs(x - v.x) < PLOT_SIZE / 2 && Math.abs(y - v.y) < PLOT_SIZE / 2) return false
    }
    // refuse if inside any world structure footprint (~32px square)
    for (const s of state.worldStructures) {
      if (Math.abs(x - s.x) < 32 && Math.abs(y - s.y) < 32) return false
    }
    // refuse if the container would overlap ANY existing obstacle (no interlock)
    const newObs = this.makeCrateObstacle(x, y, item)
    for (const o of this.obstacles) {
      if (boxOverlap(newObs.x, newObs.y, newObs.w, newObs.h, o.x, o.y, o.w, o.h)) return false
    }
    // refuse if it would overlap any honse body
    for (const h of state.honses) {
      const b = getHonseBodyAABB(h)
      if (boxOverlap(newObs.x, newObs.y, newObs.w, newObs.h, b.x, b.y, b.w, b.h)) return false
    }

    const isLockbox = item === 'silver_lockbox' || item === 'gold_lockbox'
    // A lockbox placed from a stack that carries its own state is the SAME box:
    // reuse its stored contents and unlocked flag instead of rolling fresh. A
    // brand-new lockbox (no carried state) starts locked with rolled contents.
    const contents = isLockbox && stack.contents ? stack.contents : createContainerContents(item)
    const unlocked = isLockbox ? (stack.unlocked ?? false) : true
    state.placedCrates.push({ x, y, item, contents, unlocked })
    this.spawnContainer(x, y, item)
    this.logPlacement(item, x, y)

    stack.count -= 1
    if (stack.count <= 0) state.inventory[slotIdx] = null
    this.registry.events.emit('inventory-changed')
    return true
  }

  private tryPlacePlank(clickX: number, clickY: number): boolean {
    const slotIdx = state.selectedInventorySlot
    const stack = state.inventory[slotIdx]
    if (!stack || (stack.type !== 'plank' && stack.type !== 'flagstone' && stack.type !== 'sandstone')) return false
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false
    const T = WOOD_TILE
    const wb = state.worldBounds
    const wx = Math.floor((clickX - wb.minX) / T) * T + wb.minX + T / 2
    const wy = Math.floor((clickY - wb.minY) / T) * T + wb.minY + T / 2
    if (state.terrainAt(wx, wy) === Terrain.Water) return false
    if (state.woodAt(wx, wy)) return false
    state.setWoodAt(wx, wy, stack.type === 'sandstone' ? 3 : stack.type === 'flagstone' ? 2 : 1)
    this.chunkTerrain.markTileDirty(wx, wy)
    stack.count -= 1
    if (stack.count <= 0) state.inventory[slotIdx] = null
    this.registry.events.emit('inventory-changed')
    return true
  }

  private tryPickupWood(clickX: number, clickY: number): boolean {
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false
    const T = WOOD_TILE
    const wb = state.worldBounds
    const wx = Math.floor((clickX - wb.minX) / T) * T + wb.minX + T / 2
    const wy = Math.floor((clickY - wb.minY) / T) * T + wb.minY + T / 2
    const wv = state.woodAt(wx, wy)
    if (!wv) return false
    state.setWoodAt(wx, wy, 0)
    this.chunkTerrain.markTileDirty(wx, wy)
    this.dropStack(wx, wy, { type: wv === 3 ? 'sandstone' : wv === 2 ? 'flagstone' : 'plank', count: 1 })
    return true
  }

  private canDestroyWood(worldX: number, worldY: number): boolean {
    const dx = worldX - this.player.x
    const dy = worldY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false
    const T = WOOD_TILE
    const wb = state.worldBounds
    const wx = Math.floor((worldX - wb.minX) / T) * T + wb.minX + T / 2
    const wy = Math.floor((worldY - wb.minY) / T) * T + wb.minY + T / 2
    return state.woodAt(wx, wy) > 0
  }

  private makeGateObstacle(g: { x: number; y: number; vertical: boolean; open: boolean; swingX: number; swingY: number }) {
    if (!g.open) {
      const W = g.vertical ? 6 : 16
      const H = g.vertical ? 16 : 6
      return { x: g.x - W / 2, y: g.y - H / 2, w: W, h: H, kind: 'gate' as ObstacleKind, originX: g.x, originY: g.y }
    }
    if (g.vertical) {
      const W = 16, H = 6
      const cx = g.x + g.swingX * 10, cy = g.y + g.swingY * 11
      return { x: cx - W / 2, y: cy - H / 2, w: W, h: H, kind: 'gate' as ObstacleKind, originX: g.x, originY: g.y }
    } else {
      const W = 6, H = 16
      const cx = g.x + g.swingX * 11, cy = g.y + g.swingY * 11
      return { x: cx - W / 2, y: cy - H / 2, w: W, h: H, kind: 'gate' as ObstacleKind, originX: g.x, originY: g.y }
    }
  }

  private gateSpriteTex(g: { vertical: boolean; open: boolean }): string {
    if (!g.open) return g.vertical ? 'fence_gate_open' : 'item_fence_gate'
    return g.vertical ? 'item_fence_gate' : 'fence_gate_open'
  }

  private gateSpritePos(g: { x: number; y: number; vertical: boolean; open: boolean; swingX: number; swingY: number }): { sx: number; sy: number; flip: boolean } {
    if (!g.open) return { sx: g.x, sy: g.y, flip: false }
    if (g.vertical) {
      return { sx: g.x + g.swingX * 10, sy: g.y + g.swingY * 11, flip: false }
    } else {
      return { sx: g.x + g.swingX * 11, sy: g.y + g.swingY * 11, flip: false }
    }
  }

  private tryPlaceGate(clickX: number, clickY: number): boolean {
    const slotIdx = state.selectedInventorySlot
    const stack = state.inventory[slotIdx]
    if (!stack || stack.type !== 'fence_gate') return false
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false
    const GATE_GRID = 10
    const x = Math.round(clickX / GATE_GRID) * GATE_GRID
    const y = Math.round(clickY / GATE_GRID) * GATE_GRID
    const key = `${x},${y}`
    if (this.placedGateSprites.has(key)) return false
    for (const v of this.plotViews) {
      if (Math.abs(x - v.x) < PLOT_SIZE / 2 && Math.abs(y - v.y) < PLOT_SIZE / 2) return false
    }
    for (const s of state.worldStructures) {
      if (Math.abs(x - s.x) < 32 && Math.abs(y - s.y) < 32) return false
    }

    const checkObs = { x: x - 8, y: y - 3, w: 16, h: 6, kind: 'gate' as ObstacleKind, originX: x, originY: y }
    for (const o of this.obstacles) {
      if (o.kind === 'gate' || o.kind === 'post') continue
      if (boxOverlap(checkObs.x, checkObs.y, checkObs.w, checkObs.h, o.x, o.y, o.w, o.h)) return false
    }
    const half = Overworld.PLAYER_HALF
    if (boxOverlap(checkObs.x, checkObs.y, checkObs.w, checkObs.h,
      this.player.x - half, this.player.y - half, half * 2, half * 2)) return false

    const vertical = this.isVerticalGate(x, y)
    const entry = { x, y, vertical, open: false, swingX: 0, swingY: 0 }
    const obs = this.makeGateObstacle(entry)

    state.placedGates.push(entry)
    const tex = this.gateSpriteTex(entry)
    const sprite = this.add.sprite(x, y, tex).setScale(2).setDepth(y - 8)
    this.placedGateSprites.set(key, sprite)
    this.obstacles.push(obs)
    this.placedGateBodies.set(key, this.addBlocker(obs))
    this.refreshGateNeighbors(x, y)
    stack.count -= 1
    if (stack.count <= 0) state.inventory[slotIdx] = null
    this.registry.events.emit('inventory-changed')
    return true
  }

  private tryAxeGate(clickX: number, clickY: number): boolean {
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false
    const hitSq = 18 * 18
    let bestIdx = -1
    let bestDist = Infinity
    for (let i = 0; i < state.placedGates.length; i++) {
      const g = state.placedGates[i]
      const gdx = clickX - g.x
      const gdy = clickY - g.y
      const d = gdx * gdx + gdy * gdy
      if (d <= hitSq && d < bestDist) { bestIdx = i; bestDist = d }
    }
    if (bestIdx === -1) return false
    const g = state.placedGates[bestIdx]
    const key = `${g.x},${g.y}`
    const sprite = this.placedGateSprites.get(key)
    if (sprite) sprite.destroy()
    this.placedGateSprites.delete(key)
    const body = this.placedGateBodies.get(key)
    if (body) this.matter.world.remove(body)
    this.placedGateBodies.delete(key)
    const obsIdx = this.obstacles.findIndex(
      o => o.kind === 'gate' && o.originX === g.x && o.originY === g.y,
    )
    if (obsIdx !== -1) this.obstacles.splice(obsIdx, 1)
    state.placedGates.splice(bestIdx, 1)
    this.refreshGateNeighbors(g.x, g.y)
    this.spawnParticles(g.x, g.y, spriteColors('item_fence_gate'))
    this.dropStack(g.x, g.y, { type: 'fence_gate', count: 1 })
    return true
  }

  private canDestroyGate(wx: number, wy: number): number | null {
    const dx = wx - this.player.x
    const dy = wy - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return null
    const hitSq = 18 * 18
    let best: number | null = null
    let bestDist = Infinity
    for (let i = 0; i < state.placedGates.length; i++) {
      const g = state.placedGates[i]
      const gdx = wx - g.x
      const gdy = wy - g.y
      const d = gdx * gdx + gdy * gdy
      if (d <= hitSq && d < bestDist) { best = i; bestDist = d }
    }
    return best
  }

  private canToggleGate(wx: number, wy: number): number | null {
    const dx = wx - this.player.x
    const dy = wy - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return null
    const hitSq = 18 * 18
    let best: number | null = null
    let bestDist = Infinity
    for (let i = 0; i < state.placedGates.length; i++) {
      const g = state.placedGates[i]
      const gdx = wx - g.x
      const gdy = wy - g.y
      const d = gdx * gdx + gdy * gdy
      if (d <= hitSq && d < bestDist) { best = i; bestDist = d }
    }
    return best
  }

  private toggleGate(clickX: number, clickY: number): boolean {
    const idx = this.canToggleGate(clickX, clickY)
    if (idx === null) return false
    const g = state.placedGates[idx]
    const key = `${g.x},${g.y}`
    g.open = !g.open

    if (g.open) {
      if (g.vertical) {
        const bottom = this.isBottomHinge(g.x, g.y)
        const top = this.placedGateSprites.has(`${g.x},${g.y + 10}`) || this.placedGateSprites.has(`${g.x},${g.y + 20}`)
        if (bottom) {
          g.swingY = 1
        } else if (top) {
          g.swingY = -1
        } else {
          g.swingY = this.player.y > g.y ? -1 : 1
        }
        g.swingX = this.player.x > g.x ? -1 : 1
      } else {
        const right = this.isRightHinge(g.x, g.y)
        const left = this.placedGateSprites.has(`${g.x + 10},${g.y}`) || this.placedGateSprites.has(`${g.x + 20},${g.y}`)
        if (right) {
          g.swingX = 1
        } else if (left) {
          g.swingX = -1
        } else {
          g.swingX = this.player.x > g.x ? -1 : 1
        }
        g.swingY = this.player.y > g.y ? -1 : 1
      }
    } else {
      g.swingX = 0
      g.swingY = 0
    }

    const pos = this.gateSpritePos(g)
    const tex = this.gateSpriteTex(g)
    const sprite = this.placedGateSprites.get(key)
    if (sprite) {
      sprite.setTexture(tex)
      sprite.setPosition(pos.sx, pos.sy)
      sprite.setFlipX(pos.flip)
      sprite.setDepth(g.y - 8)
    }

    const obsIdx = this.obstacles.findIndex(
      o => o.kind === 'gate' && o.originX === g.x && o.originY === g.y,
    )
    if (obsIdx !== -1) this.obstacles.splice(obsIdx, 1)
    const oldBody = this.placedGateBodies.get(key)
    if (oldBody) this.matter.world.remove(oldBody)

    const obs = this.makeGateObstacle(g)
    this.obstacles.push(obs)
    this.placedGateBodies.set(key, this.addBlocker(obs))
    return true
  }

  private isVerticalGate(x: number, y: number): boolean {
    const above = this.placedGateSprites.has(`${x},${y - 10}`) || this.placedPostSprites.has(`${x},${y - 10}`)
    const below = this.placedGateSprites.has(`${x},${y + 10}`) || this.placedPostSprites.has(`${x},${y + 10}`)
    return above || below
  }

  private isRightHinge(x: number, y: number): boolean {
    return this.placedGateSprites.has(`${x - 10},${y}`) || this.placedGateSprites.has(`${x - 20},${y}`)
  }

  private isBottomHinge(x: number, y: number): boolean {
    return this.placedGateSprites.has(`${x},${y - 10}`) || this.placedGateSprites.has(`${x},${y - 20}`)
  }

  private setGateOrientation(g: { x: number; y: number; vertical: boolean; open: boolean; swingX: number; swingY: number }, vertical: boolean) {
    if (g.vertical === vertical) return
    g.vertical = vertical
    g.open = false
    const key = `${g.x},${g.y}`
    const tex = this.gateSpriteTex(g)
    const sprite = this.placedGateSprites.get(key)
    if (sprite) {
      sprite.setTexture(tex)
      sprite.setPosition(g.x, g.y)
      sprite.setFlipX(false)
    }

    const obsIdx = this.obstacles.findIndex(
      o => o.kind === 'gate' && o.originX === g.x && o.originY === g.y,
    )
    if (obsIdx !== -1) this.obstacles.splice(obsIdx, 1)
    const oldBody = this.placedGateBodies.get(key)
    if (oldBody) this.matter.world.remove(oldBody)

    const obs = this.makeGateObstacle(g)
    this.obstacles.push(obs)
    this.placedGateBodies.set(key, this.addBlocker(obs))
  }

  private refreshGateNeighbors(x: number, y: number) {
    const neighbors = [`${x},${y - 10}`, `${x},${y + 10}`, `${x - 10},${y}`, `${x + 10},${y}`]
    for (const nk of neighbors) {
      const spr = this.placedGateSprites.get(nk)
      if (!spr) continue
      const [nx, ny] = nk.split(',').map(Number)
      const entry = state.placedGates.find(g => g.x === nx && g.y === ny)
      if (!entry) continue
      this.setGateOrientation(entry, this.isVerticalGate(nx, ny))
    }
  }

  private attachCrateOpenHandler(sprite: Phaser.GameObjects.Sprite) {
    sprite.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!p.leftButtonDown()) return
      const x = sprite.x
      const y = sprite.y
      const heldType = state.inventory[state.selectedInventorySlot]?.type
      if (heldType === 'axe' || heldType === 'pickaxe') {
        this.tryAxeCrate(x, y)
        return
      }
      // any other overworld tool held → let it be (don't open)
      const tool = state.getSelectedTool()
      const toolHeld = tool !== null && (tool.cursorContexts ?? ['overworld']).includes('overworld')
      if (toolHeld) return
      // nothing relevant held → open the crate
      this.tryOpenCrate(x, y)
    })
  }

  // Open the loot panel for the nearest un-carried bandit body within range. The
  // UI renders the body's contents in the same slot grid the crate uses.
  private tryLootBody(x: number, y: number, hitRadius = BODY_LOOT_RANGE): boolean {
    const rSq = hitRadius * hitRadius
    let bestSq = rSq
    let bestId = -1
    for (const b of state.banditBodies) {
      if (b.carried) continue
      const dx = b.x - x
      const dy = b.y - y
      const d = dx * dx + dy * dy
      if (d <= bestSq) { bestSq = d; bestId = b.id }
    }
    if (bestId === -1) return false
    this.registry.events.emit('open-body', bestId)
    return true
  }

  private tryOpenCrate(x: number, y: number, hitRadius = 16): boolean {
    const ui = this.scene.get('UI') as UI
    if (ui.isCrateOpen()) return false
    const hitSq = hitRadius * hitRadius
    let best = -1
    let bestDistSq = hitSq
    for (let i = 0; i < state.placedCrates.length; i++) {
      const c = state.placedCrates[i]
      const dx = x - c.x
      const dy = y - c.y
      const dSq = dx * dx + dy * dy
      if (dSq <= bestDistSq) {
        bestDistSq = dSq
        best = i
      }
    }
    if (best < 0) return false
    const c = state.placedCrates[best]
    const pdx = c.x - this.player.x
    const pdy = c.y - this.player.y
    if (pdx * pdx + pdy * pdy > CRATE_RANGE * CRATE_RANGE) return false

    this.registry.events.emit('open-crate', best)
    return true
  }

  private placeNonEnterable(x: number, y: number, sprite: string, scale: number, flipX = false, tint?: number) {
    const spr = this.add.sprite(x, y, sprite).setScale(scale).setDepth(y + 8)
    if (flipX) spr.setFlipX(true)
    if (tint !== undefined) spr.setTint(tint)
    const obs = { x: x - 16, y: y, w: 28, h: 20, kind: 'solid' as ObstacleKind }
    this.obstacles.push(obs)
    this.addBlocker(obs)
  }

  // Place a roofed (occupied, non-enterable) house with seeded colors: a gray
  // roof whose tint varies per instance, and a muted wall color. Bakes a unique
  // recolored texture so the two regions are truly independent (not a flat tint).
  private placeRoofedHouse(x: number, y: number, scale: number) {
    const rng = makeRng(state.worldSeed + x * 71 + y * 31)
    // roof gray: ~50–70% lightness, very low saturation, hue drifts slightly
    const roofHue = rng()
    const roofMain = this.hslHex(roofHue, 0.06 + rng() * 0.06, 0.5 + rng() * 0.12)
    const roofStripe = this.hslHex(roofHue, 0.06 + rng() * 0.06, 0.38 + rng() * 0.08)
    // wall: dark brown, tint varies per instance — hue drifts within the
    // brown band, saturation/lightness wobble but stay dark.
    const wallHue = 0.05 + rng() * 0.03          // ~18°–29°, brown band
    const wall = this.hslHex(wallHue, 0.22 + rng() * 0.10, 0.23 + rng() * 0.04)

    const key = `house_roof_${x}_${y}`
    const sprite = recolorHouseRoof(roofMain, roofStripe, wall)
    spriteToTexture(this, key, sprite)

    const spr = this.add.sprite(x, y, key).setScale(scale).setDepth(y + 8)
    this.roofedHousePositions.push({ x, y })
    // box grows upward from a fixed base line so changing h extends the top edge,
    // not the bottom — the house footprint stays planted on the ground.
    const h = 38
    const baseY = y + 20
    const obs = { x: x - 18, y: baseY - h, w: 36, h, kind: 'solid' as ObstacleKind }
    this.obstacles.push(obs)
    this.addBlocker(obs)
  }

  // Walk a trail centerline and convert grass terrain cells within halfWidth of
  // the line to PathDirt, so trails wear a sandy track through grass. Steps
  // along each segment (centerline samples are sparse) so the track is
  // continuous, not dotted. Only grass changes — salt/water are left as-is.
  private stampPathDirt(centerline: { x: number; y: number }[], halfWidth: number) {
    const T = TERRAIN_TILE
    const stampDisc = (px: number, py: number) => {
      for (let oy = -halfWidth; oy <= halfWidth; oy += T) {
        for (let ox = -halfWidth; ox <= halfWidth; ox += T) {
          if (ox * ox + oy * oy > halfWidth * halfWidth) continue
          const wx = px + ox
          const wy = py + oy
          if (state.terrainAt(wx, wy) === Terrain.Grass) {
            state.setTerrainAt(wx, wy, Terrain.PathDirt)
            this.chunkTerrain?.markTileDirty(wx, wy)
          }
        }
      }
    }
    for (let i = 0; i < centerline.length - 1; i++) {
      const a = centerline[i]
      const b = centerline[i + 1]
      const dist = Math.hypot(b.x - a.x, b.y - a.y)
      const steps = Math.max(1, Math.ceil(dist / (T / 2)))
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        stampDisc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
      }
    }
  }

  // HSL (h,s,l in 0..1) → '#rrggbb'
  private hslHex(h: number, s: number, l: number): string {
    const f = (n: number) => {
      const k = (n + h * 12) % 12
      const a = s * Math.min(l, 1 - l)
      const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
      return Math.round(c * 255).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  // appended to state.worldStructures (so the world-structures render loop
  // draws them, gives them a building obstacle, and the door/interior wiring
  // makes them enterable — all reused, no new machinery), each carrying its
  // own loot list. Decor buildings get sprite + collision only (sealed husks).
  //
  // MUST be called before the world-structures render loop in create(), so the
  // appended walkable buildings actually render, and before the tree scatter,
  // so trees see the buildings' footprints as obstacles. Exclusions are per-
  // building (the building's own footprint via the render loop / placeNon-
  // Enterable), not a big per-site keep-out — so trees can grow between and
  // beside the buildings, which reads as natural reclaimed-frontier.
  private static SETTLEMENT_TINTS = [
    0x8B7355, 0x9B8268, 0x7A6248, 0xA08862, 0x8B7B5E,
    0x947A55, 0x82704F, 0x8B7355, 0x9B8B7A, 0x6E5C40,
    0x888888, 0x7088A0, 0x6B7A6B, 0x6E7B8B, 0x8B8178,
  ]

  // Long houses stay brown. The pool is weighted heavily toward true browns
  // (40 of them across neutral/red/gold/dark/tan/dusty/warm/mid) so most rolls
  // land brown; the tinted casts and off-whites are the minority spice.
  private static LONG_HOUSE_TINTS = [
    0x946248, 0x986046, 0x8C5E4A, 0xA06A4E, 0x82543C,  // reddish brown
    0x8A7044, 0x907842, 0x82683E, 0x9C8250, 0x766038,  // golden brown
    // --- BROWNS (the bulk; weighted so most rolls land here) ---
    0x8A6A4A, 0x7E6248, 0x8C7254, 0x9A7A58, 0x6E5640,  // neutral brown
    0x946248, 0x986046, 0x8C5E4A, 0xA06A4E, 0x82543C,  // reddish brown
    0x8A7044, 0x907842, 0x82683E, 0x9C8250, 0x766038,  // golden brown
    0x5A4632, 0x6E5238, 0x4E3C2A, 0x7A5C40, 0x614A34,  // dark / deep brown
    0xB0906A, 0xA88A60, 0xBC9C74, 0xA6885C, 0xC4A47C,  // light / tan brown
    0x8A7058, 0x96785E, 0x7E664E, 0x9E8064, 0x726052,  // dusty / muted brown
    0x7E5E42, 0x885A3E, 0x90704C, 0x6E5238, 0xA47C54,  // extra warm browns
    0x6A5440, 0x7C6248, 0x846A4E, 0x5E4A36, 0x98785A,  // extra mid browns
    // --- TINTED CASTS (minority spice) ---
    0x76704C, 0x72744A, 0x7C7850,                       // olive / green brown
    0x5E6A70, 0x586670, 0x647078,                       // cool / blue brown
    0x5E5E70, 0x645E72, 0x585468,                       // purple brown
    0x8A5E64, 0x946068, 0x80565E,                       // rose / pink brown
    // --- OFF-WHITES (rare) ---
    0xF6F0DA, 0xECEAF4, 0xF6ECE6,                        // near-white: yellow, cool, warm
  ]

  private instantiateSite(site: PlacedSite) {
    const template = SITE_TEMPLATES[site.templateId]
    if (!template) return
    const tintRng = makeRng(state.worldSeed + site.x * 31 + site.y * 17)
    const tintTypes = template.tintTypes ?? []
    for (const b of template.buildings) {
      const bx = site.x + b.dx
      const by = site.y + b.dy
      const tintPool = b.type === 'long_house'
        ? Overworld.LONG_HOUSE_TINTS
        : Overworld.SETTLEMENT_TINTS
      const tint = b.tint ?? (tintTypes.includes(b.type)
        ? tintPool[Math.floor(tintRng() * tintPool.length)]
        : undefined)
      if (b.walkable) {
        state.worldStructures.push({
          type: b.type,
          x: bx,
          y: by,
          townId: null,
          flipX: b.flipX,
          tint,
          loot: b.loot ?? [],
        })
        // Draw the sprite now. The fixed world structures are drawn by a render
        // loop early in create(), but sites are instantiated after it, so each
        // walkable site building draws itself here (same depth/flip/tint rule).
        const def = WORLD_STRUCTURES[b.type]
        const spr = this.add.sprite(bx, by, def.sprite).setScale(def.scale).setDepth(by + 24 - 16)
        if (b.flipX) spr.setFlipX(true)
        const sprTint = tint ?? def.tint
        if (sprTint !== undefined) spr.setTint(sprTint)
        const hb = def.hitbox ?? { w: 48, h: 48 }
        const obs = { x: bx - hb.w / 2, y: by - hb.h / 2, w: hb.w, h: hb.h, kind: 'building' as ObstacleKind }
        this.obstacles.push(obs)
        this.addBlocker(obs)
      } else if (b.type === 'house_roof') {
        this.placeRoofedHouse(bx, by, WORLD_STRUCTURES.house_roof.scale)
      } else {
        const def = WORLD_STRUCTURES[b.type]
        this.placeNonEnterable(bx, by, def.sprite, def.scale, b.flipX, tint)
      }
    }
    if (template.decor) {
      for (const d of template.decor) {
        const dx = site.x + d.dx
        const dy = site.y + d.dy
        this.add.sprite(dx, dy, d.sprite).setScale(d.scale).setDepth(d.depth ?? dy)
      }
    }
    if (template.wells) {
      for (const wlDef of template.wells) {
        const wx = site.x + wlDef.dx
        const wy = site.y + wlDef.dy
        if (wlDef.dry) {
          // dry well — pure decor with collision
          this.placeNonEnterable(wx, wy, 'dry_well', 3)
        } else {
          // working well — sprite only (no collision so the player can walk
          // onto its door zone) plus a worldWells entry that ticks water
          this.add.sprite(wx, wy, 'well').setScale(3).setDepth(wy + 8)
          state.worldWells.push({ x: wx, y: wy, water: 0, lastTickAt: state.gameTime })
        }
      }
    }
    if (template.posts) {
      const G = Overworld.POST_GRID
      for (const p of template.posts) {
        const px = Math.round((site.x + p.dx) / G) * G
        const py = Math.round((site.y + p.dy) / G) * G
        this.placePost(px, py, p.species)
      }
    }
    let pendingPathLine: { x: number; y: number }[] | null = null
    if (template.path) {
      const rng = makeRng(state.worldSeed + site.x * 7 + site.y * 13)
      // Where the main trail actually sits at this town's X (varies per seed).
      // Extend whichever path end faces the trail out to meet it, so the town
      // path always connects to the trail no matter the perpendicular gap.
      const trailY = trailYAtX(TRAIL_WAYPOINTS, site.x)
      let startY = site.y + template.path.startDy
      let endY = site.y + template.path.endDy
      // The town is offset to one side of the trail; pull the nearer end to it.
      if (Math.abs(startY - trailY) < Math.abs(endY - trailY)) {
        startY = trailY
      } else {
        endY = trailY
      }
      const len = endY - startY
      const steps = Math.floor(len / 6)
      let drift = 0
      const pathLine: { x: number; y: number }[] = []
      for (let i = 0; i <= steps; i++) {
        const py = startY + (i / steps) * len
        drift += (rng() - 0.5) * 1.5
        drift *= 0.995
        const spread = (rng() - 0.5) * template.path.width
        const px = site.x - 5 + drift + spread
        this.decorData.push({ x: Math.floor(px), y: Math.floor(py), type: 'pebbles', scale: 2 })
        pathLine.push({ x: site.x - 5 + drift, y: py })
      }
      pendingPathLine = pathLine
    }
    if (template.scatterGrass) {
      const sg = template.scatterGrass
      const grassRng = makeRng(state.worldSeed + site.x * 53 + site.y * 37)
      const T = TERRAIN_TILE
      for (let i = 0; i < sg.count; i++) {
        const angle = grassRng() * Math.PI * 2
        const dist = grassRng() * sg.radius
        const cx = site.x + Math.cos(angle) * dist
        const cy = site.y + (sg.dy ?? 0) + Math.sin(angle) * dist
        const patchSize = 1 + Math.floor(grassRng() * 3)
        for (let dy = -patchSize; dy <= patchSize; dy++) {
          for (let dx = -patchSize; dx <= patchSize; dx++) {
            if (dx * dx + dy * dy > patchSize * patchSize) continue
            if (grassRng() < 0.4) continue
            state.setTerrainAt(cx + dx * T, cy + dy * T, Terrain.Grass)
          }
        }
      }
    }
    // Stamp path dirt AFTER scatterGrass so the town path wears through the
    // freshly-painted grass instead of being painted back over.
    if (pendingPathLine && template.path) {
      this.stampPathDirt(pendingPathLine, Math.max(10, template.path.width / 2 + 4))
    }
    if (template.scatterTrees) {
      const st = template.scatterTrees
      const treeRng = makeRng(state.worldSeed + site.x * 43 + site.y * 29)
      let placed = 0
      let attempts = 0
      while (placed < st.count && attempts < st.count * 30) {
        attempts++
        const angle = treeRng() * Math.PI * 2
        const dist = st.minDist + treeRng() * (st.radius - st.minDist)
        const tx = site.x + Math.cos(angle) * dist
        const ty = site.y + Math.sin(angle) * dist
        let tooClose = false
        for (const b of template.buildings) {
          const bx = site.x + b.dx
          const by = site.y + b.dy
          if (b.type === 'long_house') {
            if (Math.abs(tx - bx) < 30 && Math.abs(ty - by) < 50) { tooClose = true; break }
          } else if (b.type === 'abandoned_house' || b.type === 'house_roof') {
            if (Math.abs(tx - bx) < 30 && Math.abs(ty - by) < 30) { tooClose = true; break }
          } else {
            const ddx = tx - bx
            const ddy = ty - by
            if (ddx * ddx + ddy * ddy < st.minDist * st.minDist) { tooClose = true; break }
          }
        }
        if (tooClose) continue
        const pathClearance = template.path ? 50 : 0
        if (pathClearance > 0 && Math.abs(tx - site.x) < pathClearance) continue
        this.placeTree(Math.floor(tx), Math.floor(ty))
        placed++
      }
    }
  }
  // things relative to the player (e.g. a test tumbleweed just west of them).
  getPlayerPos(): { x: number; y: number } {
    return { x: this.player.x, y: this.player.y }
  }

  // Grow the world outward by `amount` px in one direction, then re-sync the
  // scene to the new bounds. state.growWorld() does the data work (extend
  // bounds, resize + copy the terrain grid). Here we re-apply the things that
  // were set once from bounds at create-time and don't read it live: the camera
  // bounds and the cream background rect (position, size, and click hit-area).
  // The player-movement clamp already reads worldBounds every frame, so it
  // needs nothing. The new strip is left bare. Returns the pixels added.
  growWorld(direction: 'west' | 'east' | 'north' | 'south', amount: number): number {
    const before = { minX: state.worldBounds.minX, minY: state.worldBounds.minY, width: state.worldBounds.width, height: state.worldBounds.height }
    const added = state.growWorld(direction, amount)
    if (added === 0) return 0

    const wb = state.worldBounds
    this.cameras.main.setBounds(wb.minX, wb.minY, wb.width, wb.height)
    this.worldBg.setPosition(wb.minX + wb.width / 2, wb.minY + wb.height / 2)
    this.worldBg.setSize(wb.width, wb.height)
    const hit = this.worldBg.input?.hitArea as Phaser.Geom.Rectangle | undefined
    if (hit) { hit.width = wb.width; hit.height = wb.height }

    // Fill the new strip with scatter decor at the same densities as the rest of
    // the world. The strip is the rectangle of land just added: for east/west it
    // spans the full new height by `added` wide; for north/south the full width
    // by `added` tall. Seed is offset by the strip's corner so repeated grows in
    // the same direction don't repeat the identical pattern.
    // A west/east grow extends the world horizontally, adding a tall, narrow
    // strip down one side (full height, `added` px wide). A north/south grow
    // adds a short, wide strip (full width, `added` px tall).
    const horizontalGrow = direction === 'west' || direction === 'east'
    const strip: GenRect = {
      x: direction === 'east' ? before.minX + before.width : wb.minX,
      y: direction === 'south' ? before.minY + before.height : wb.minY,
      w: horizontalGrow ? added : wb.width,
      h: horizontalGrow ? wb.height : added,
    }
    const stripSeed = state.worldSeed + Math.floor(strip.x) + Math.floor(strip.y)
    const decor = generateRegionDecor(strip, stripSeed, ['pebbles', 'grass', 'cow_skull'])
    this.decorData.push(...decor)
    // Buried coins and gems for the new strip, at the same densities as the
    // original world. Without this, all treasure stays locked in the spawn box.
    const { buried, buriedGems } = generateRegionBuried(strip, stripSeed + 1)
    state.buriedItems.push(...buried)
    state.buriedGems.push(...buriedGems)
    this.cullDecor()
    return added
  }

  // Decor culling: only keep sprites for decor within the camera view + margin.
  // Called on a throttle from update and once after any growWorld. Scans all
  // decor data, creates sprites for items entering the view, and destroys
  // sprites for items leaving. The margin prevents thrashing at screen edges.
  private cullDecor() {
    const view = this.cameras.main.worldView
    const m = DECOR_CULL_MARGIN
    const left = view.x - m
    const right = view.right + m
    const top = view.y - m
    const bottom = view.bottom + m
    for (let i = 0; i < this.decorData.length; i++) {
      const d = this.decorData[i]
      const inView = d.x >= left && d.x <= right && d.y >= top && d.y <= bottom
      const sprite = this.activeDecor.get(i)
      if (inView && !sprite) {
        if (state.terrainAt(d.x, d.y) !== Terrain.Salt) continue
        this.activeDecor.set(i, this.add.sprite(d.x, d.y, d.type).setScale(d.scale).setDepth(DECOR_DEPTH))
      } else if (!inView && sprite) {
        sprite.destroy()
        this.activeDecor.delete(i)
      }
    }
  }

  // True if (x, y) is within the tree CREATE margin of the current view. Used
  // by placeTree so a tree placed near the camera at runtime
  // instantiates immediately instead of waiting for the next cull tick.
  private treeInCullRange(x: number, y: number): boolean {
    const view = this.cameras.main.worldView
    const m = TREE_CULL_MARGIN
    return x >= view.x - m && x <= view.right + m && y >= view.y - m && y <= view.bottom + m
  }

  // Tree culling: state.plantedTrees is the permanent source of truth; only
  // trees near the camera get live sprites/obstacles/bodies. Trees entering the
  // create margin get instantiated; trees past the (larger) destroy margin get
  // torn down. The asymmetric margins give hysteresis so boundary trees don't
  // flicker. Chop progress (treeHits) and stage live in data, so a tree
  // re-instantiates in exactly the state it was last seen. Runs on the same
  // throttle as decor.
  private cullTrees() {
    const view = this.cameras.main.worldView
    const cm = TREE_CULL_MARGIN
    const dm = TREE_CULL_DESTROY_MARGIN
    for (const entry of state.plantedTrees) {
      const key = `${entry.x},${entry.y}`
      const live = this.matureTreeSprites.has(key) || this.plantedTreeSprites.has(key)
      const inCreate = entry.x >= view.x - cm && entry.x <= view.right + cm && entry.y >= view.y - cm && entry.y <= view.bottom + cm
      if (inCreate && !live) {
        this.instantiateTree(entry)
      } else if (!live) {
        continue
      } else {
        // live — destroy only once past the larger destroy margin
        const inKeep = entry.x >= view.x - dm && entry.x <= view.right + dm && entry.y >= view.y - dm && entry.y <= view.bottom + dm
        if (!inKeep) this.deinstantiateTree(entry.x, entry.y)
      }
    }
  }

  // Rock formations are spawned once and never moved, but there are hundreds of
  // them. Rendering every formation's sprites each frame (even far off camera)
  // was the dominant frame cost. Toggling container visibility lets the WebGL
  // renderer skip the whole subtree when off screen. Sprites and all per-tile
  // mining/collision state stay resident, so gameplay is unchanged — only
  // drawing is gated.
  private cullRocks() {
    const view = this.cameras.main.worldView
    const m = TREE_CULL_MARGIN
    for (const [formKey, container] of this.rockContainers) {
      const ci = formKey.indexOf(',')
      const fx = Number(formKey.slice(0, ci))
      const fy = Number(formKey.slice(ci + 1))
      const inView = fx >= view.x - m && fx <= view.right + m && fy >= view.y - m && fy <= view.bottom + m
      if (container.visible !== inView) container.setVisible(inView)
    }
  }





  // True if a honse body footprint centered at (x, y) overlaps any obstacle.
  // Matches getHonseBodyAABB's footprint (30x12, vertical center at y+3).
  private honseFootprintBlocked(x: number, y: number): boolean {
    const fx = x - 15, fy = y - 3, fw = 30, fh = 12
    for (const o of this.obstacles) {
      if (boxOverlap(fx, fy, fw, fh, o.x, o.y, o.w, o.h)) return true
    }
    return false
  }

  // Find the nearest spot to (x, y) where a honse footprint clears all
  // obstacles. Returns (x, y) unchanged if it's already free; otherwise rings
  // outward (growing radius, 8 directions per ring) and returns the first clear
  // spot. Capped — if nothing clears within the search, returns the original so
  // a honse always spawns (degrading to overlap is better than no honse).
  private findFreeHonseSpot(x: number, y: number): { x: number; y: number } {
    if (!this.honseFootprintBlocked(x, y)) return { x, y }
    const STEP = 16
    const RINGS = 12
    for (let ring = 1; ring <= RINGS; ring++) {
      const r = ring * STEP
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2
        const nx = x + Math.cos(ang) * r
        const ny = y + Math.sin(ang) * r
        if (!this.honseFootprintBlocked(nx, ny)) return { x: Math.round(nx), y: Math.round(ny) }
      }
    }
    return { x, y }
  }

  // Spawn a wild honse at a world position. The position is nudged to the
  // nearest spot whose body footprint clears all obstacles, so a honse never
  // spawns inside a rock/tree/building/post/crate.
  spawnHonse(x: number, y: number) {
    const spot = this.findFreeHonseSpot(x, y)
    x = spot.x; y = spot.y
    const honse = createHonse(x, y, this.honseRng)
    state.honses.push(honse)
    const spr = this.add.sprite(x, y, honse.sprite).setScale(2).setDepth(y - 8)
    if (honse.tinted) spr.setTint(honse.tint)
    this.honseSprites.push(spr)
    this.honseBodies.push(
      this.matter.add.rectangle(x, y + 3, 30, 12, { inertia: Infinity, frictionAir: 0.05, restitution: 0.6, collisionFilter: { category: CAT_HONSE, mask: 0xFFFFFFFF, group: 0 } } as any)
    )
  }

  // Spawn a coyote at a world position. Creates the entity and its sprite at
  // matching indices so the per-frame sync loop keeps them paired.
  spawnCoyote(x: number, y: number) {
    state.coyotes.push(createCoyote(x, y))
    this.coyoteSprites.push(
      this.add.sprite(x, y, 'coyote').setScale(2).setDepth(y - 8)
    )
  }

  // Placeholder art: reuses the player sprite so the targeting can be tested
  // before bandit art exists.
  spawnBandit(x: number, y: number) {
    state.bandits.push(createBandit(x, y))
    this.banditSprites.push(
      this.add.sprite(x, y, 'player').setScale(PLAYER_SCALE).setDepth(y - 8)
    )
  }

  private placePost(x: number, y: number, species: 'post' | 'cedar_post' | 'iron_post') {
    state.placedPosts.push({ x, y, species })
    this.spawnPostSprite(x, y, species)
    const obs = this.makePostObstacle(x, y)
    this.obstacles.push(obs)
    this.placedPostBodies.set(`${x},${y}`, this.makePostBlocker(x, y))
    this.refreshPostNeighbors(x, y)
  }

  // ---- Pipe placement ----

  // Nearest side of a plot to a world point, plus the edge anchor where a pipe
  // marker sits and the rotation that points it outward from that side.
  private pipeSideFor(plotIndex: number, wx: number, wy: number):
    { side: 'top' | 'bottom' | 'left' | 'right'; x: number; y: number; rot: number } {
    const v = this.plotViews[plotIndex]
    const dx = wx - v.x
    const dy = wy - v.y
    // The marker's near edge meets the plot boundary, so the whole pipe sits
    // just outside the square on the chosen side (centered origin → push out by
    // half the plot plus half a tile). Rotation points it outward.
    const o = PLOT_SIZE / 2 + Overworld.PIPE_TILE / 2
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx >= 0
        ? { side: 'right', x: v.x + o, y: v.y, rot: 0 }
        : { side: 'left', x: v.x - o, y: v.y, rot: Math.PI }
    }
    return dy >= 0
      ? { side: 'bottom', x: v.x, y: v.y + o, rot: Math.PI / 2 }
      : { side: 'top', x: v.x, y: v.y - o, rot: -Math.PI / 2 }
  }

  // Place a pipe marker sprite (item_pipe) at a plot side anchor at the given
  // alpha. Reuses the one sprite passed in, creating it on first use.
  private placePipeMarker(
    spr: Phaser.GameObjects.Sprite | null,
    anchor: { x: number; y: number; rot: number },
    alpha: number,
  ): Phaser.GameObjects.Sprite {
    if (!spr) spr = this.add.sprite(anchor.x, anchor.y, 'item_pipe').setScale(2)
    spr.setPosition(anchor.x, anchor.y)
      .setRotation(anchor.rot)
      .setFlipY(Math.abs(anchor.rot) > Math.PI / 2)
      .setDepth(anchor.y)
      .setAlpha(alpha)
      .setVisible(true)
    return spr
  }

  // Per-frame driver for the placement ghosts. Only runs while a pipe is held.
  private updatePipeGhosts(wx: number, wy: number) {
    // Source marker: solid, pinned on the clicked side, while a source is set.
    if (this.pendingPipeFrom !== null && this.pendingPipeSide !== null) {
      const v = this.plotViews[this.pendingPipeFrom]
      const o = PLOT_SIZE / 2 + Overworld.PIPE_TILE / 2
      const anchor =
        this.pendingPipeSide === 'right' ? { x: v.x + o, y: v.y, rot: 0 } :
        this.pendingPipeSide === 'left' ? { x: v.x - o, y: v.y, rot: Math.PI } :
        this.pendingPipeSide === 'bottom' ? { x: v.x, y: v.y + o, rot: Math.PI / 2 } :
        { x: v.x, y: v.y - o, rot: -Math.PI / 2 }
      this.pipeSourceMarker = this.placePipeMarker(this.pipeSourceMarker, anchor, 1)
    } else if (this.pipeSourceMarker) {
      this.pipeSourceMarker.setVisible(false)
    }

    // Hover ghost: 0.65 on the side of the built plot under the cursor. While a
    // source is pending, the source plot shows no hover ghost (it has the solid
    // marker), and a target only ghosts if it's adjacent to the source — so the
    // ghost never invites a connection connectPipe would reject.
    const hovered = this.builtPlotNear(wx, wy)
    const validTarget = hovered !== null
      && hovered !== this.pendingPipeFrom
      && (this.pendingPipeFrom === null || this.plotsAdjacent(this.pendingPipeFrom, hovered))
    if (validTarget) {
      const anchor = this.pipeSideFor(hovered!, wx, wy)
      this.pipeHoverGhost = this.placePipeMarker(
        this.pipeHoverGhost, anchor, Overworld.PIPE_GHOST_ALPHA,
      )
    } else if (this.pipeHoverGhost) {
      this.pipeHoverGhost.setVisible(false)
    }
  }

  // Index of the built plot whose footprint contains (wx, wy), or null.
  // Nearest built plot whose center is within PIPE_REACH of (wx, wy), or null.
  // Radius-based (not the tight plot footprint) so the pipe ghost and click
  // trigger when the cursor is merely near a plot, including the gap between two.
  private static PIPE_REACH = 44
  private builtPlotNear(wx: number, wy: number): number | null {
    const reachSq = Overworld.PIPE_REACH * Overworld.PIPE_REACH
    let best: number | null = null
    let bestSq = Infinity
    for (let i = 0; i < this.plotViews.length; i++) {
      if (state.plots[i].built === 'empty') continue
      const v = this.plotViews[i]
      const dx = wx - v.x
      const dy = wy - v.y
      const d = dx * dx + dy * dy
      if (d <= reachSq && d < bestSq) { best = i; bestSq = d }
    }
    return best
  }

  // Tear down both placement ghosts and reset the pending source. Called on
  // connect, cancel, or whenever the pipe tool is no longer held.
  private clearPipeGhosts() {
    if (this.pipeHoverGhost) { this.pipeHoverGhost.destroy(); this.pipeHoverGhost = null }
    if (this.pipeSourceMarker) { this.pipeSourceMarker.destroy(); this.pipeSourceMarker = null }
    this.pendingPipeFrom = null
    this.pendingPipeSide = null
  }



  // Single entry point for a pipe placement click, used by both the per-plot
  // handler and the background handler so a click near a plot works the same as
  // one on it. No player-range gate — pipes place by cursor proximity only.
  // Returns true if the click was consumed.
  // Two plots are pipe-connectable only if they're at most one cell apart on the
  // 4x4 grid, in any direction (orthogonal OR diagonal). Same plot and anything
  // two-plus cells away are rejected. Chebyshev distance of exactly 1.
  private plotsAdjacent(a: number, b: number): boolean {
    const dr = Math.abs(Math.floor(a / PLOT_COLS) - Math.floor(b / PLOT_COLS))
    const dc = Math.abs((a % PLOT_COLS) - (b % PLOT_COLS))
    return Math.max(dr, dc) === 1
  }

  private handlePipeClick(wx: number, wy: number): boolean {
    const plotIndex = this.builtPlotNear(wx, wy)
    if (plotIndex === null) return false
    if (this.pendingPipeFrom === null) {
      this.pendingPipeFrom = plotIndex
      this.pendingPipeSide = this.pipeSideFor(plotIndex, wx, wy).side
    } else {
      if (this.pendingPipeFrom !== plotIndex) {
        this.connectPipe(this.pendingPipeFrom, plotIndex)
      }
      this.clearPipeGhosts()
    }
    return true
  }


  private connectPipe(fromPlot: number, toPlot: number) {
    // Only connect plots at most one cell apart (orthogonal or diagonal).
    if (!this.plotsAdjacent(fromPlot, toPlot)) return
    // One pipe per pair of buildings, regardless of direction: block an exact
    // duplicate AND the reverse (A→B already exists, so B→A is rejected too).
    if (state.pipes.some(p =>
      (p.fromPlot === fromPlot && p.toPlot === toPlot) ||
      (p.fromPlot === toPlot && p.toPlot === fromPlot)
    )) return

    // Consume one pipe from inventory
    const slotIdx = state.selectedInventorySlot
    const stack = state.inventory[slotIdx]
    if (!stack || stack.type !== 'pipe') return
    stack.count -= 1
    if (stack.count <= 0) state.inventory[slotIdx] = null
    this.registry.events.emit('inventory-changed')

    // Store the connection
    state.pipes.push({ fromPlot, toPlot })

    // Draw the visual
    this.drawPipe(fromPlot, toPlot)
  }

  private drawPipe(fromPlot: number, toPlot: number) {
    const fromView = this.plotViews[fromPlot]
    const toView = this.plotViews[toPlot]
    const key = `${fromPlot}-${toPlot}`

    const dx = toView.x - fromView.x
    const dy = toView.y - fromView.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    // Pipe sprite is 12x8 native at scale 2 = 24x16 on screen.
    // Tile them along the line between the two plot centers.
    const pipeLen = Overworld.PIPE_TILE
    const count = Math.max(1, Math.round(dist / pipeLen))
    const stepX = dx / count
    const stepY = dy / count

    // When the pipe points left (angle past ±90°), the rotation carries the
    // sprite past vertical and flips its shading upside down. Flip it back on Y
    // so the highlight always stays on top and the shadow on the bottom.
    const flipShade = Math.abs(angle) > Math.PI / 2

    const sprites: Phaser.GameObjects.Sprite[] = []
    for (let i = 0; i < count; i++) {
      const sx = fromView.x + stepX * (i + 0.5)
      const sy = fromView.y + stepY * (i + 0.5)
      const spr = this.add.sprite(sx, sy, 'item_pipe')
        .setScale(2)
        .setRotation(angle)
        .setFlipY(flipShade)
        .setDepth(sy)
      sprites.push(spr)
    }
    this.pipeSprites.set(key, sprites)

    // Arrow at midpoint showing flow direction.
    // When the pipe points left/up, the rotation flips the shading upside down,
    // so use the pre-flipped sprite to keep light-on-top consistent.
    const midX = (fromView.x + toView.x) / 2
    const midY = (fromView.y + toView.y) / 2
    const flipped = Math.abs(angle) > Math.PI / 2
    const chevronKey = flipped ? 'pipe_chevron_flip' : 'pipe_chevron'
    const arrow = this.add.sprite(midX, midY, chevronKey)
      .setScale(2)
      .setRotation(angle)
      .setDepth(midY + 1)
    this.pipeArrows.set(key, arrow)
  }

  // ---- Pipe item transfer ----

  // Drives all pipes. Called from update() on the PIPE_TICK_MS cadence.
  private runPipeTicks(now: number) {
    if (now - this.lastPipeTickAt < Overworld.PIPE_TICK_MS) return
    this.lastPipeTickAt = now

    // Snapshot how much each plot can send at the START of this tick. A plot may
    // only send up to its snapshot amount this tick — anything delivered into it
    // during this tick lands beyond the snapshot and waits until next tick. This
    // gives the staged-relay look (an item visibly lands before moving on) while
    // letting a backlog keep flowing every tick, with no per-hop delay buildup.
    const sendable = new Map<number, number>()
    for (const pipe of state.pipes) {
      if (!sendable.has(pipe.fromPlot)) {
        const a = this.pipePeekSource(pipe.fromPlot)
        sendable.set(pipe.fromPlot, a ? a.count : 0)
      }
    }

    for (const pipe of state.pipes) {
      const from = state.plots[pipe.fromPlot]
      const to = state.plots[pipe.toPlot]
      if (!from || !to || from.built === 'empty' || to.built === 'empty') continue

      // What type does the source have available to move?
      const avail = this.pipePeekSource(pipe.fromPlot)
      if (!avail) continue

      // Cap by this tick's snapshot so freshly-delivered items wait a tick.
      const budget = sendable.get(pipe.fromPlot) ?? 0
      if (budget <= 0) continue

      const want = Math.min(Overworld.PIPE_ITEMS_PER_TICK, avail.count, budget)
      const accepted = this.pipePushToPlot(pipe.toPlot, avail.type, want, pipe.fromPlot)
      if (accepted > 0) {
        this.pipeTakeFromSource(pipe.fromPlot, accepted)
        sendable.set(pipe.fromPlot, budget - accepted)
      }
    }
  }

  // Peek at what the source plot can send: returns {type, count} or null.
  // mill/well → output; workshop → craftOutput; storage → first non-empty slot.
  private pipePeekSource(plotIndex: number): { type: ItemType; count: number } | null {
    const plot = state.plots[plotIndex]
    if (plot.built === 'mill' || plot.built === 'well') {
      return plot.output ? { type: plot.output.type, count: plot.output.count } : null
    }
    if (plot.built === 'workshop') {
      return plot.craftOutput ? { type: plot.craftOutput.type, count: plot.craftOutput.count } : null
    }
    if (plot.built === 'storage' && plot.storageContents) {
      for (const s of plot.storageContents) {
        if (s && s.count > 0) return { type: s.type, count: s.count }
      }
    }
    return null
  }

  // Remove `count` items from the source plot's output location.
  private pipeTakeFromSource(plotIndex: number, count: number) {
    const plot = state.plots[plotIndex]
    let remaining = count
    const drain = (slot: ItemStack | null | undefined): ItemStack | null => {
      if (!slot) return null
      const take = Math.min(slot.count, remaining)
      slot.count -= take
      remaining -= take
      return slot.count <= 0 ? null : slot
    }
    if (plot.built === 'mill' || plot.built === 'well') {
      plot.output = drain(plot.output)
    } else if (plot.built === 'workshop') {
      plot.craftOutput = drain(plot.craftOutput)
    } else if (plot.built === 'storage' && plot.storageContents) {
      // drain from the first non-empty slot of the moved type
      for (let i = 0; i < plot.storageContents.length && remaining > 0; i++) {
        const s = plot.storageContents[i]
        if (s && s.count > 0) plot.storageContents[i] = drain(s)
      }
    }
  }

  // Push up to `count` of `type` into the dest plot's input location.
  // Returns how many were actually accepted.
  // workshop → craftInputs (matching slot first, then empty); storage → grid.
  // mill/well reject all input.
  private pipePushToPlot(plotIndex: number, type: ItemType, count: number, fromPlot: number): number {
    const plot = state.plots[plotIndex]
    const cap = ITEMS[type].maxStack
    let remaining = count
    let accepted = 0

    if (plot.built === 'workshop') {
      if (!plot.craftInputs) plot.craftInputs = [null, null]
      const inputs = plot.craftInputs
      // keep sources array sized to match inputs
      if (!plot.craftInputSources) plot.craftInputSources = inputs.map(() => null)
      while (plot.craftInputSources.length < inputs.length) plot.craftInputSources.push(null)
      const sources = plot.craftInputSources

      // Each pipe SOURCE owns its own slot. Find the slot already claimed by
      // this source; if none, claim the first empty slot for it. This makes a
      // 2nd hemp source land in the next slot instead of stacking into the 1st.
      let slot = sources.indexOf(fromPlot)
      if (slot === -1) {
        // claim the first slot that's both empty AND unclaimed by another source
        for (let i = 0; i < inputs.length; i++) {
          if (inputs[i] === null && sources[i] === null) { slot = i; break }
        }
      }
      if (slot === -1) return 0   // no slot available for this source

      const existing = inputs[slot]
      if (existing && existing.type !== type) return 0   // slot holds a different type
      const have = existing ? existing.count : 0
      const room = cap - have
      if (room <= 0) return 0
      const move = Math.min(room, remaining)
      if (existing) existing.count += move
      else inputs[slot] = { type, count: move }
      sources[slot] = fromPlot
      remaining -= move; accepted += move
      return accepted
    }

    if (plot.built === 'storage' && plot.storageContents) {
      const slots = plot.storageContents
      // top up matching slots
      for (let i = 0; i < slots.length && remaining > 0; i++) {
        const s = slots[i]
        if (s && s.type === type && s.count < cap) {
          const room = cap - s.count
          const move = Math.min(room, remaining)
          s.count += move; remaining -= move; accepted += move
        }
      }
      // then empty slots
      for (let i = 0; i < slots.length && remaining > 0; i++) {
        if (slots[i] === null) {
          const move = Math.min(cap, remaining)
          slots[i] = { type, count: move }
          remaining -= move; accepted += move
        }
      }
      return accepted
    }

    // mill/well/field don't accept piped input
    return 0
  }

  private tryDestroyPipe(clickX: number, clickY: number): boolean {
    const idx = this.canDestroyPipe(clickX, clickY)
    if (idx === null) return false
    this.removePipe(idx)
    return true
  }

  removePipe(pipeIndex: number) {
    const pipe = state.pipes[pipeIndex]
    if (!pipe) return
    const key = `${pipe.fromPlot}-${pipe.toPlot}`

    // Destroy visuals
    const sprites = this.pipeSprites.get(key)
    if (sprites) { for (const s of sprites) s.destroy(); this.pipeSprites.delete(key) }
    const arrow = this.pipeArrows.get(key)
    if (arrow) { arrow.destroy(); this.pipeArrows.delete(key) }

    // Remove data
    state.pipes.splice(pipeIndex, 1)

    // Pop the pipe out as a dropped item (like fences), bursting its own
    // colors at the pipe's midpoint between the two plots it connected.
    const fromView = this.plotViews[pipe.fromPlot]
    const toView = this.plotViews[pipe.toPlot]
    const midX = (fromView.x + toView.x) / 2
    const midY = (fromView.y + toView.y) / 2
    this.spawnParticles(midX, midY, spriteColors('item_pipe'))
    this.dropStack(midX, midY, { type: 'pipe', count: 1 })
  }

  // Preview helper for the cursor: given a snapped world position, return the
  // world post texture the held post would resolve to (horizontal vs vertical),
  // so the placement ghost matches what will actually be planted. Returns null
  // when no post is held.
  previewPostTexture(x: number, y: number): string | null {
    const species = state.inventory[state.selectedInventorySlot]?.type
    if (species !== 'post' && species !== 'cedar_post' && species !== 'iron_post') return null
    return this.resolvePostTexture(x, y, species)
  }

  isPostDragging(): boolean {
    return this.postDragAnchor !== null
  }

  private computePostDragPath(): { x: number; y: number }[] {
    if (!this.postDragAnchor) return []
    const G = Overworld.POST_GRID
    const ptr = this.input.activePointer
    const w = this.cameras.main.getWorldPoint(ptr.x, ptr.y)
    const cx = Math.round(w.x / G) * G
    const cy = Math.round(w.y / G) * G
    const ax = this.postDragAnchor.x
    const ay = this.postDragAnchor.y
    const path: { x: number; y: number }[] = []
    const stepX = cx > ax ? G : -G
    if (cx !== ax) {
      for (let x = ax; x !== cx + stepX; x += stepX) path.push({ x, y: ay })
    } else {
      path.push({ x: ax, y: ay })
    }
    const stepY = cy > ay ? G : -G
    if (cy !== ay) {
      for (let y = ay + stepY; y !== cy + stepY; y += stepY) path.push({ x: cx, y })
    }
    const rangeSq = TOOL_RANGE * TOOL_RANGE
    const stack = state.inventory[state.selectedInventorySlot]
    const maxCount = stack?.count ?? 0
    const filtered: { x: number; y: number }[] = []
    for (const cell of path) {
      if (filtered.length >= maxCount) break
      const dx = cell.x - this.player.x
      const dy = cell.y - this.player.y
      if (dx * dx + dy * dy > rangeSq) continue
      filtered.push(cell)
    }
    return filtered
  }

  private updatePostDragGhosts() {
    const path = this.computePostDragPath()
    const species = this.postDragSpecies!
    const anchor = this.postDragAnchor!
    const dragging = path.length > 1 || (path.length === 1 && (path[0].x !== anchor.x || path[0].y !== anchor.y))
    const showPath = dragging ? path : []

    const cam = this.cameras.main
    const view = cam.worldView
    if (!this.postDragRT) {
      this.postDragRT = this.add.renderTexture(view.x, view.y, view.width, view.height)
        .setOrigin(0, 0)
        .setAlpha(0.65)
        .setDepth(900000)
    }
    const rt = this.postDragRT
    // Resize/reposition to the live viewport so a moving/zooming camera always
    // has the whole reachable area covered.
    if (rt.width !== view.width || rt.height !== view.height) rt.setSize(view.width, view.height)
    rt.setPosition(view.x, view.y)
    rt.clear()
    if (showPath.length === 0) { rt.render(); return }

    const G = Overworld.POST_GRID
    const pathSet = new Set(showPath.map(p => `${p.x},${p.y}`))
    for (const cell of showPath) {
      if (this.placedPostSprites.has(`${cell.x},${cell.y}`)) continue
      const hasAbove = pathSet.has(`${cell.x},${cell.y - G}`) || state.placedPosts.some(p => p.x === cell.x && p.y === cell.y - G)
      const hasBelow = pathSet.has(`${cell.x},${cell.y + G}`) || state.placedPosts.some(p => p.x === cell.x && p.y === cell.y + G)
      let tex = species as string
      if (hasAbove || hasBelow) {
        if (species === 'cedar_post') tex = 'cedar_post_v'
        else if (species === 'iron_post') tex = 'iron_post_v'
        else tex = 'post_v'
      }
      let stamp = this.postDragStamps.get(tex)
      if (!stamp) {
        stamp = this.make.sprite({ x: 0, y: 0, key: tex, add: false }).setScale(2)
        this.postDragStamps.set(tex, stamp)
      }
      const drawY = species === 'iron_post' ? cell.y - 2 : cell.y
      rt.draw(stamp, cell.x - view.x, drawY - view.y)
    }
    rt.render()
  }

  private clearPostDragGhosts() {
    if (this.postDragRT) { this.postDragRT.destroy(); this.postDragRT = null }
    for (const s of this.postDragStamps.values()) s.destroy()
    this.postDragStamps.clear()
    this.postDragAnchor = null
    this.postDragSpecies = null
  }

  // Determine if a post at (x,y) should use the vertical sprite variant.
  // Vertical = has a neighbor directly above or below (same x, y ± 10)
  // but NOT left or right (x ± 10, same y).
  private resolvePostTexture(x: number, y: number, species: 'post' | 'cedar_post' | 'iron_post'): string {
    const hasAbove = state.placedPosts.some(p => p.x === x && p.y === y - 10)
    const hasBelow = state.placedPosts.some(p => p.x === x && p.y === y + 10)
    if (hasAbove || hasBelow) {
      if (species === 'cedar_post') return 'cedar_post_v'
      if (species === 'iron_post') return 'iron_post_v'
      return 'post_v'
    }
    return species
  }

  // Single source of truth for post sprite creation. Resolves the vertical/
  // horizontal texture from neighbor data and registers the sprite. Every post
  // sprite (live placement, settlement gen, state restore) goes through here so
  // orientation is never call-site dependent.
  private spawnPostSprite(x: number, y: number, species: 'post' | 'cedar_post' | 'iron_post'): Phaser.GameObjects.Sprite {
    const tex = this.resolvePostTexture(x, y, species)
    // Iron post art is 2px taller (scaled) than wood; centered draw would plant
    // its base lower. Nudge up so all post species share the same ground line.
    const drawY = species === 'iron_post' ? y - 2 : y
    const sprite = this.add.sprite(x, drawY, tex).setScale(2).setDepth(y - 8)
    this.placedPostSprites.set(`${x},${y}`, sprite)
    return sprite
  }

  // After placing/removing a post, update the sprites of its vertical neighbors
  // in case they need to switch between horizontal and vertical variants.
  private refreshPostNeighbors(x: number, y: number) {
    const neighbors = [`${x},${y - 10}`, `${x},${y + 10}`, `${x - 10},${y}`, `${x + 10},${y}`]
    for (const key of neighbors) {
      const spr = this.placedPostSprites.get(key)
      if (spr) {
        const [nx, ny] = key.split(',').map(Number)
        const entry = state.placedPosts.find(p => p.x === nx && p.y === ny)
        if (entry) {
          const tex = this.resolvePostTexture(nx, ny, entry.species ?? 'post')
          spr.setTexture(tex)
        }
      }
    }
    this.refreshGateNeighbors(x, y)
  }

  findPlantableDirtSpot(clickX: number, clickY: number): { index: number; x: number; y: number; key: string } | null {
    // dirt patches use the dig offset, so compare in offset-applied coords
    const x = clickX + Overworld.DIG_OFFSET_X
    const y = clickY + Overworld.DIG_OFFSET_Y
    const radiusSq = Overworld.PLANT_HIT_RADIUS * Overworld.PLANT_HIT_RADIUS

    for (let i = state.dugSpots.length - 1; i >= 0; i--) {
      const d = state.dugSpots[i]
      const dx = x - d.x
      const dy = y - d.y
      if (dx * dx + dy * dy >= radiusSq) continue
      return { index: i, x: d.x, y: d.y, key: `${d.x},${d.y}` }
    }
    return null
  }

  tryPlantFromStack(clickX: number, clickY: number, stack: ItemStack): boolean {
    if (stack.type !== 'cottonwood_sapling') return false
    if (stack.count <= 0) return false

    const spot = this.findPlantableDirtSpot(clickX, clickY)
    if (!spot) return false



    const dirtSprite = this.dugSprites.get(spot.key)
    if (dirtSprite) { dirtSprite.destroy(); this.dugSprites.delete(spot.key) }
    state.dugSpots.splice(spot.index, 1)

    const entry = { x: spot.x, y: spot.y, kind: 'cottonwood' as const, stage: 'sapling' as const, plantedAt: state.gameTime }
    state.plantedTrees.push(entry)
    if (this.treeInCullRange(spot.x, spot.y)) this.instantiateSapling(entry)
    this.logPlacement('cottonwood_sapling', spot.x, spot.y)

    stack.count -= 1
    return true
  }

  private tryDig(clickX: number, clickY: number) {
    if (this.digInProgress) return   // one dig at a time
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return
    const x = clickX + Overworld.DIG_OFFSET_X
    const y = clickY + Overworld.DIG_OFFSET_Y

    // dig up a planted tree: remove tree, leave dirt patch + sapling as a
    // revealed item that the player can walk over to claim.
    const undoSq = Overworld.DIG_MIN_SPACING * Overworld.DIG_MIN_SPACING
    for (let i = state.plantedTrees.length - 1; i >= 0; i--) {
      const t = state.plantedTrees[i]
      if (t.stage !== 'sapling') continue  
      const dx = x - t.x
      const dy = y - t.y
      if (dx * dx + dy * dy >= undoSq) continue

      const key = `${t.x},${t.y}`
      this.deinstantiateTree(t.x, t.y)   // remove any live sprite/obstacle/body
      state.plantedTrees.splice(i, 1)

      // dirt patch back at the spot
      state.dugSpots.push({ x: t.x, y: t.y })
      const dirtSprite = this.add.sprite(t.x, t.y, 'dirt_patch').setScale(2).setDepth(1)
      this.dugSprites.set(key, dirtSprite)

      // sapling appears as a dropped item on top, walk over to pick up
      const sapStack: ItemStack = { type: 'cottonwood_sapling', count: 1 }
      state.droppedItems.push({ x: t.x, y: t.y, stack: sapStack })
      this.droppedSprites.push(this.spawnDroppedSprite(t.x, t.y, 'cottonwood_sapling', true))
      return
    }

    for (let i = state.dugSpots.length - 1; i >= 0; i--) {
      const d = state.dugSpots[i]
      const dx = x - d.x
      const dy = y - d.y
      if (dx * dx + dy * dy >= undoSq) continue

      const burySq = Overworld.PLANT_HIT_RADIUS * Overworld.PLANT_HIT_RADIUS
      let buriedSomething = false
      for (let j = state.droppedItems.length - 1; j >= 0; j--) {
        const drop = state.droppedItems[j]
        const ddx = drop.x - d.x
        const ddy = drop.y - d.y
        if (ddx * ddx + ddy * ddy >= burySq) continue

        // remove the dropped item from the world
        state.droppedItems.splice(j, 1)
        this.droppedSprites[j]?.destroy()
        this.droppedSprites.splice(j, 1)

        // remove the dirt patch
        const key = `${d.x},${d.y}`
        const patchSprite = this.dugSprites.get(key)
        if (patchSprite) { patchSprite.destroy(); this.dugSprites.delete(key) }
        state.dugSpots.splice(i, 1)

        // store the buried item for later digs to find
        state.buriedStacks.push({ x: d.x, y: d.y, stack: drop.stack })
        buriedSomething = true
        break
      }
      if (buriedSomething) return

      // case 2: undo dig
      const key = `${d.x},${d.y}`
      const sprite = this.dugSprites.get(key)
      if (sprite) { sprite.destroy(); this.dugSprites.delete(key) }
      state.dugSpots.splice(i, 1)
      return
    }
    // refuse if inside any plot footprint
    for (const v of this.plotViews) {
      if (Math.abs(x - v.x) < PLOT_SIZE / 2 && Math.abs(y - v.y) < PLOT_SIZE / 2) return
    }
    // refuse if inside any world structure footprint (~32px square per sprite)
    for (const s of state.worldStructures) {
      if (Math.abs(x - s.x) < 32 && Math.abs(y - s.y) < 32) return
    }
    // refuse if too close to an existing dig
    const minSq = Overworld.DIG_MIN_SPACING * Overworld.DIG_MIN_SPACING
    for (const d of state.dugSpots) {
      const dx = x - d.x
      const dy = y - d.y
      if (dx * dx + dy * dy < minSq) return
    }

    // plant the shovel sprite at the dig position, then resolve after a delay
    this.digInProgress = true
    const planted = this.add.sprite(x, y, 'shovel_dig')
      .setOrigin(0.5, 1)   // bottom-center: blade tip sits at (x, y)
      .setScale(2)
      .setDepth(Overworld.DIG_SPRITE_DEPTH)

    const DIRT_COLORS = COLORS.dirtDig
    let wave = 0
    const particleTimer = this.time.addEvent({
      delay: 400,   // big burst every 0.4s while planted
      loop: true,
      callback: () => this.spawnParticles(x, y, DIRT_COLORS, wave++),
    })

    this.time.delayedCall(Overworld.DIG_DURATION_MS, () => {
      particleTimer.remove(false)
      planted.destroy()
      state.dugSpots.push({ x, y })
      const patchSprite = this.add.sprite(x, y, 'dirt_patch').setScale(2).setDepth(1)
      this.dugSprites.set(`${x},${y}`, patchSprite)

      // reveal AT MOST one buried coin within reveal radius
      const revSq = Overworld.DIG_REVEAL_RADIUS * Overworld.DIG_REVEAL_RADIUS
      let revealed = false
      for (let i = state.buriedItems.length - 1; i >= 0; i--) {
        const b = state.buriedItems[i]
        const dx = b.x - x
        const dy = b.y - y
        if (dx * dx + dy * dy > revSq) continue
        state.buriedItems.splice(i, 1)
        const placed = { x, y, reward: b.reward }
        state.revealedItems.push(placed)
        this.spawnRevealedCoinSprite(placed.x, placed.y)
        revealed = true
        break
      }

      if (!revealed) {
        for (let i = state.buriedStacks.length - 1; i >= 0; i--) {
          const b = state.buriedStacks[i]
          const dx = b.x - x
          const dy = b.y - y
          if (dx * dx + dy * dy > revSq) continue
          state.buriedStacks.splice(i, 1)
          state.droppedItems.push({ x, y, stack: b.stack })
          this.droppedSprites.push(this.spawnDroppedSprite(x, y, b.stack.type, true))
          revealed = true
          break
        }
      }

      if (!revealed) {
        for (let i = state.buriedGems.length - 1; i >= 0; i--) {
          const g = state.buriedGems[i]
          const dx = g.x - x
          const dy = g.y - y
          if (dx * dx + dy * dy > revSq) continue
          state.buriedGems.splice(i, 1)
          const stack = { type: g.type as ItemType, count: 1 }
          state.droppedItems.push({ x, y, stack })
          this.droppedSprites.push(this.spawnDroppedSprite(x, y, stack.type, true))
          break
        }
      }
      this.digInProgress = false
    })
  }

  private spawnRevealedCoinSprite(x: number, y: number) {
    const sprite = this.add.sprite(x, y, 'gold_coin').setScale(2).setDepth(2)
    this.revealedSprites.set(`${x},${y}`, sprite)
  }

  private spawnParticles(x: number, y: number, colors: number[], wave = 0) {
    const PARTICLE_COUNT = 12
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI / 6) + Math.random() * (Math.PI * 2 / 3)
      const speed = 12 + Math.random() * 10 + wave * 3   // each wave a bit farther
      const dx = Math.cos(angle) * speed
      const dy = -Math.sin(angle) * speed
      const color = colors[Math.floor(Math.random() * colors.length)]
      const p = this.add.rectangle(x, y - 4, 3, 3, color).setDepth(4)
      const landX = Math.floor(x + dx)
      const landY = Math.floor(y + dy + 12)   // small gravity so particles still arc down
      this.tweens.add({
        targets: p,
        x: landX,
        y: landY,
        duration: 400 + Math.random() * 100,
        ease: 'Quad.easeOut',
        onComplete: () => {
          p.setPosition(landX, landY)
          this.time.delayedCall(300, () => p.destroy())
        },
      })
    }
  }

  private spawnGoldFloat(x: number, y: number, amount: number) {
    const startY = y - 12   // start above the source so the text doesn't overlap it
    const txt = this.add.bitmapText(x, startY, 'mainSmall', `+${amount} gold`, FONT.cost)
      .setOrigin(0.5, 1)
      .setTint(COLORS.uiGold)
    this.tweens.add({
      targets: txt,
      y: startY - 36,
      alpha: 0,
      duration: 3000,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    })
  }

  // Mag refill happens the instant the reload cooldown elapses — not on the next
  // click — and that's when the ammo is deducted from inventory. gunFullReloadUntil
  // is nonzero only while a reload is pending, so clearing it self-gates this.
  // Begin a manual reload if it makes sense: a gun with a clip that isn't full,
  // not already reloading, and at least one round owned. Charges only the missing
  // rounds (capped to what's owned) when the timer completes — shares the refill
  // path with the auto-reload via pendingReloadAmount.
  private tryStartReload() {
    if (this.gunFullReloadUntil !== 0) return   // already reloading
    const sel = state.inventory[state.selectedInventorySlot]
    const selDef = sel ? ITEMS[sel.type] : null
    if (!selDef || selDef.gunSpread == null || selDef.gunAmmo == null) return
    const missing = selDef.gunAmmo - this.gunAmmo
    if (missing <= 0) return                     // clip already full
    const owned = state.countItem('colt_ammo')
    if (owned <= 0) return                       // nothing to load
    this.pendingReloadAmount = Math.min(missing, owned)
    this.gunFullReloadUntil = state.gameTime + (selDef.gunFullReloadMs ?? 0)
  }

  private refillGunIfReloaded() {
    if (this.gunFullReloadUntil === 0) return
    if (state.gameTime < this.gunFullReloadUntil) return
    const sel = state.inventory[state.selectedInventorySlot]
    const selDef = sel ? ITEMS[sel.type] : null
    if (selDef && selDef.gunAmmo != null) {
      // Charge only what this reload adds (full mag for auto, missing rounds for R).
      this.gunAmmo = Math.min(selDef.gunAmmo, this.gunAmmo + this.pendingReloadAmount)
      state.consumeItem('colt_ammo', this.pendingReloadAmount)
      this.registry.events.emit('inventory-changed')
    }
    this.gunFullReloadUntil = 0
    this.pendingReloadAmount = 0
  }

  update(_t: number, dt: number) {
    // Advance the pausable game clock. This is the ONLY site that advances it.
    // Overworld.update runs every frame even while an interior scene is open
    // (entering a building only hides this camera — the scene is never slept),
    // so the world keeps living inside houses and the clock never double-counts.
    // Everything below that gates a game mechanic reads state.gameTime, so a
    // single guard here freezes the entire simulation on pause.
    if (!state.paused) state.gameTime += dt

    this.refillGunIfReloaded()


    // Derive the player's velocity (px/sec) from this frame's position delta, so
    // bandits can lead their shots. Done before any enemy AI reads it.
    if (dt > 0) {
      this.playerVX = (this.player.x - this.playerLastX) * 1000 / dt
      this.playerVY = (this.player.y - this.playerLastY) * 1000 / dt
    }
    this.playerLastX = this.player.x
    this.playerLastY = this.player.y

    const overworldVisible = this.cameras.main.visible



    // Grow planted saplings into mature trees once enough time has elapsed.
    // Duration scales with the dev time multiplier so window.speed() speeds it up.
    const growMs = Overworld.SAPLING_GROW_MS / Math.max(0.01, state.timeMultiplier)
    for (const t of state.plantedTrees) {
      if (t.stage !== 'sapling' || t.plantedAt === undefined) continue
      // Salt basin won't let a sapling take — it only matures on grass.
      if (state.terrainAt(t.x, t.y) !== Terrain.Grass) continue
      if (state.gameTime - t.plantedAt >= growMs) this.growSapling(t)
    }

    // Spawn the starter honse trio when hemp is first harvested. Gated only by
    // honsesSpawned (fires once) — NOT by honses.length, because the wild herd
    // is seed-placed at world creation, so honses.length is never 0 by the time
    // hemp is harvested. (That stale === 0 guard previously blocked the trio
    // entirely once the herd existed.)
    if (state.hasHarvestedHemp && !this.honsesSpawned) {
      this.honsesSpawned = true
      const spawns: [number, number][] = [[2700, 2240], [2780, 2300], [2640, 2190]]
      for (const [sx, sy] of spawns) {
        this.spawnHonse(sx, sy)
      }
    }

    const leaderMap = state.mounted !== null
      ? this.rope.getHonseLeaderMap(state.mounted)
      : null
    updateHonses(
      state.honses,
      dt,
      state.gameTime,
      (px, py, ignoreIdx) => this.collidesAt(px, py, ignoreIdx),
      (honseIdx) => this.rope.getAllHonseTetherAnchors(honseIdx),
      state.mounted,
      { x: this.player.x, y: this.player.y },
      (honseIdx) => {
        const leaderIdx = leaderMap?.get(honseIdx)
        return leaderIdx === undefined ? null : state.honses[leaderIdx]
      },
      HORSE_GEAR_SPEEDS[1],
    )
    // Enemies freeze while the player is inside an interior — no AI, no damage —
    // so they can't act against the player who isn't in the world. Future enemy
    // systems belong inside this guard too.
    if (state.playerInWorld) {
      updateCoyotes(state.coyotes, dt, state.gameTime, (px, py) => this.collidesAt(px, py, undefined, true), { x: this.player.x, y: this.player.y }, (i) => this.rope.getCoyoteTetherAnchor(i), state.mounted !== null, this.playerInSafeZone())
      updateBandits(
        state.bandits,
        dt,
        state.gameTime,
        (px, py) => this.collidesAt(px, py, undefined, true),
        // line-of-sight: same obstacles but honses ignored, so a horse is never cover
        (px, py) => this.collidesAt(px, py, undefined, true, true),
        { x: this.player.x, y: this.player.y, vx: this.playerVX, vy: this.playerVY },
        Overworld.BULLET_SPEED,
        (bi, dx, dy) => {
          const ba = state.bandits[bi]
          this.fireBanditBullet(ba.x, ba.y + BANDIT_MUZZLE_DY, dx, dy)
        },
        // Threats he can dodge: the player's own bullets in flight.
        this.bullets.filter(bl => !bl.fromBandit).map(bl => ({ x: bl.x, y: bl.y, vx: bl.vx, vy: bl.vy })),
        this.banditRng,
        (i) => this.rope.getBanditTetherAnchor(i),
      )
      this.updateBullets(dt)
      // Coyote bite: player within bite radius of a coyote's mouth takes damage,
      // gated per-coyote by a cooldown. Roped coyotes flee and don't bite.
      const biteR2 = COYOTE_BITE_RADIUS * COYOTE_BITE_RADIUS
      for (let i = 0; i < state.coyotes.length; i++) {
        const c = state.coyotes[i]
        if (c.dying) continue
        if (this.rope.getCoyoteTetherAnchor(i)) continue   // leashed: not attacking
        if (state.gameTime - c.lastBiteAt < COYOTE_BITE_COOLDOWN_MS) continue
        const m = getCoyoteMouthAnchor(c)
        const dx = this.player.x - m.x
        const dy = this.player.y - m.y
        if (dx * dx + dy * dy <= biteR2) {
          if (this.damagePlayer(COYOTE_BITE_DAMAGE)) c.lastBiteAt = state.gameTime
        }
      }
    }
    // Pipe placement ghosts: only while a pipe is held. Drops both markers (and
    // any pending source) the moment the tool is put away.
    if (state.inventory[state.selectedInventorySlot]?.type === 'pipe') {
      const ptr = this.input.activePointer
      const w = this.cameras.main.getWorldPoint(ptr.x, ptr.y)
      this.updatePipeGhosts(w.x, w.y)
    } else if (this.pendingPipeFrom !== null || this.pipeHoverGhost || this.pipeSourceMarker) {
      this.clearPipeGhosts()
    }

    if (this.postDragAnchor) {
      const stack = state.inventory[state.selectedInventorySlot]
      if (!stack || (stack.type !== 'post' && stack.type !== 'cedar_post' && stack.type !== 'iron_post')) {
        this.clearPostDragGhosts()
      } else {
        this.updatePostDragGhosts()
      }
    }

    // Teleport horse back to spawn if left game area
    for (const h of state.honses) {
      if (h.tame) continue
      if (h.x < state.worldBounds.minX + 8 || h.x > state.worldBounds.minX + state.worldBounds.width - 8 || h.y < state.worldBounds.minY + 8 || h.y > state.worldBounds.minY + state.worldBounds.height - 8) {
        h.x = h.homeX
        h.y = h.homeY
        h.vx = 0
        h.vy = 0
      }
    }

    // Horse shove player
    if (state.mounted === null) {
      const half = Overworld.PLAYER_HALF
      for (const h of state.honses) {
        const b = getHonseBodyAABB(h)
        const px = this.player.x
        const py = this.player.y
        if (aabbOverlap(px, py, half, b.x, b.y, b.w, b.h)) {
          // overlap depth on each axis — pick the smaller and push out that way
          const overlapLeft   = (px + half) - b.x
          const overlapRight  = (b.x + b.w) - (px - half)
          const overlapTop    = (py + half) - b.y
          const overlapBottom = (b.y + b.h) - (py - half)
          const minX = Math.min(overlapLeft, overlapRight)
          const minY = Math.min(overlapTop, overlapBottom)
          if (minX < minY) {
            this.player.x += overlapLeft < overlapRight ? -minX : minX
          } else {
            this.player.y += overlapTop < overlapBottom ? -minY : minY
          }
        }
      }
    }

    // Coyote shove player — same push-out as honses, so coyotes feel solid.
    {
      const half = Overworld.PLAYER_HALF
      for (const c of state.coyotes) {
        const b = getCoyoteBodyAABB(c)
        const px = this.player.x
        const py = this.player.y
        if (aabbOverlap(px, py, half, b.x, b.y, b.w, b.h)) {
          const overlapLeft   = (px + half) - b.x
          const overlapRight  = (b.x + b.w) - (px - half)
          const overlapTop    = (py + half) - b.y
          const overlapBottom = (b.y + b.h) - (py - half)
          const minX = Math.min(overlapLeft, overlapRight)
          const minY = Math.min(overlapTop, overlapBottom)
          if (minX < minY) {
            this.player.x += overlapLeft < overlapRight ? -minX : minX
          } else {
            this.player.y += overlapTop < overlapBottom ? -minY : minY
          }
        }
      }
    }
    for (let i = 0; i < state.honses.length; i++) {
      const h = state.honses[i]
      const s = this.honseSprites[i]
      if (!s) continue
      const mb = this.honseBodies[i]
      if (mb) {
        const knocked = h.dying || state.gameTime < h.knockbackUntil
        const isFollower = leaderMap?.has(i) ?? false
        if (isFollower && !knocked) {
          // Driven by velocity like the mounted honse: h.vx/h.vy are px/s, the
          // body integrates them (same /60 conversion as the mount's setVelocity).
          if (mb.isSleeping) { mb.isSleeping = false; (mb as any).sleepCounter = 0 }
          this.matter.body.setVelocity(mb, { x: h.vx / 60, y: h.vy / 60 })
          h.x = mb.position.x
          h.y = mb.position.y - 3
        } else {
          if (i !== state.mounted && !knocked) {
            if (mb.isSleeping) { mb.isSleeping = false; (mb as any).sleepCounter = 0 }
            this.matter.body.setVelocity(mb, { x: h.x - mb.position.x, y: (h.y + 3) - mb.position.y })
          }
          // While knocked back, the body carries the impulse freely; state follows it.
          h.x = mb.position.x
          h.y = mb.position.y - 3
        }
      }
      // Leash cap: after the body sync so it gets the final word on position.
      const tethers = this.rope.getAllHonseTetherAnchors(i)
      for (const t of tethers) {
        const rx = h.x - t.x
        const ry = h.y - t.y
        const distSq = rx * rx + ry * ry
        const maxSq = ROPE_LEASH_LENGTH * ROPE_LEASH_LENGTH
        if (distSq > maxSq) {
          const dist = Math.sqrt(distSq)
          h.x = t.x + (rx / dist) * ROPE_LEASH_LENGTH
          h.y = t.y + (ry / dist) * ROPE_LEASH_LENGTH
          if (mb) this.matter.body.setPosition(mb, { x: h.x, y: h.y + 3 }, false)
        }
      }
      s.x = h.x
      s.y = h.y
      s.setDepth(h.y - 8)
      s.setFlipX(h.facingRight)

      // Red hit-flash: swap to the shared red silhouette, then back to the
      // honse's own coat sprite after the flash window.
      if (state.gameTime < h.hurtUntil) {
        if (s.texture.key !== 'honse_hurt') { s.setTexture('honse_hurt'); s.clearTint() }
      } else if (s.texture.key !== h.sprite) {
        s.setTexture(h.sprite)
        if (h.tinted) s.setTint(h.tint); else s.clearTint()
      }

      // Deferred death: once the flash expires on a dying honse, remove it
      // entirely — sprite, Matter body, and state.
      if (h.dying && state.gameTime >= h.hurtUntil) {
        s.destroy()
        this.honseSprites.splice(i, 1)
        const mb = this.honseBodies[i]
        if (mb) this.matter.world.remove(mb)
        this.honseBodies.splice(i, 1)
        state.honses.splice(i, 1)
        this.honseLastPrint.delete(i)
        if (state.mounted !== null && state.mounted > i) state.mounted--
        i--
        continue
      }


      // Hit flash: tint red while hurt, restore the coat tint (or none) after.
      if (state.gameTime < h.hurtUntil) {
        s.setTint(0xFF3030)
      } else if (h.tinted) {
        s.setTint(h.tint)
      } else {
        s.clearTint()
      }


      const last = this.honseLastPrint.get(i)
      if (!last) {
        this.honseLastPrint.set(i, { x: h.x, y: h.y })
      } else {
        const pdx = h.x - last.x
        const pdy = h.y - last.y
        if (pdx * pdx + pdy * pdy >= 36 * 36) {
          this.chunkTerrain.stampFootprint(h.x, h.y + 10, COLORS.honseFootprint, 0.7)
          this.honseLastPrint.set(i, { x: h.x, y: h.y })
        }
      }
    }

    for (let i = 0; i < state.coyotes.length; i++) {
      const c = state.coyotes[i]
      const s = this.coyoteSprites[i]
      if (!s) continue
      s.x = c.x
      // hop: while in the knockback window, lift the sprite in a sin arc (up then
      // back down) on top of the slide — a Minecraft-style hit pop. Depth still
      // sorts on the ground position so the hop doesn't reorder the sprite.
      let hop = 0
      if (state.gameTime < c.knockbackUntil) {
        const t = 1 - (c.knockbackUntil - state.gameTime) / Overworld.ENEMY_KNOCKBACK_MS
        hop = Math.sin(t * Math.PI) * Overworld.ENEMY_HOP_H
      }
      s.y = c.y - hop
      s.setDepth(c.y - 8)
      s.setFlipX(!c.facingRight)
      s.setTexture(state.gameTime < c.hurtUntil ? 'coyote_hurt' : 'coyote')
      if (c.dying && state.gameTime >= c.hurtUntil) {
        s.destroy()
        this.coyoteSprites.splice(i, 1)
        state.coyotes.splice(i, 1)
        state.carcasses.push({ x: c.x, y: c.y })
        this.carcassSprites.push(
          this.add.sprite(c.x, c.y, 'coyote_dead').setScale(2).setDepth(c.y - 8)
        )
        i--
        continue
      }
    }

    for (let i = 0; i < state.bandits.length; i++) {
      const ba = state.bandits[i]
      const s = this.banditSprites[i]
      if (!s) continue
      s.x = ba.x
      let hop = 0
      if (state.gameTime < ba.knockbackUntil) {
        const t = 1 - (ba.knockbackUntil - state.gameTime) / Overworld.ENEMY_KNOCKBACK_MS
        hop = Math.sin(t * Math.PI) * Overworld.ENEMY_HOP_H
      }
      s.y = ba.y - hop
      s.setDepth(ba.y - 8)
      s.setFlipX(!ba.facingRight)
      s.setTint(state.gameTime < ba.hurtUntil ? 0xFF3030 : 0xFFFFFF)
      if (ba.dying && state.gameTime >= ba.hurtUntil) {
        s.destroy()
        this.banditSprites.splice(i, 1)
        state.bandits.splice(i, 1)
        const id = state.nextBanditBodyId++
        // Loot: a derringer always, plus 0–25 rounds. 6 slots, rest empty.
        const rounds = Math.floor(this.lootRng() * 26)
        const contents: (ItemStack | null)[] = [
          { type: 'derringer', count: 1 },
          rounds > 0 ? { type: 'colt_ammo', count: rounds } : null,
          null, null, null, null,
        ]
        state.banditBodies.push({ id, x: ba.x, y: ba.y, carried: false, contents })
        this.banditBodySprites.push(
          this.add.sprite(ba.x, ba.y, 'bandit_dead').setScale(2).setDepth(ba.y - 8)
        )
        i--
        continue
      }
    }


    // Sync dynamic crate bodies  
    for (let i = 0; i < this.crateBodies.length; i++) {
      const body = this.crateBodies[i]
      if (!body || body.isSleeping) continue
      const c = state.placedCrates[i]
      if (!c) continue
      const bx = body.position.x
      const by = body.position.y
      // find the obstacle by its current origin (matches c.x/c.y before update)
      const obs = this.obstacles.find(
        o => o.kind === 'crate' && o.originX === c.x && o.originY === c.y
      )
      // update state entry
      c.x = bx
      c.y = by
      // update sprite
      const sprite = this.crateSprites[i]
      if (sprite) {
        sprite.x = bx
        sprite.y = by
        sprite.setDepth(by - 8)
      }
      // update obstacle AABB (sized to the container's footprint, not a fixed 8)
      if (obs) {
        const fp = this.containerFootprint(c.item ?? 'crate')
        obs.x = bx - fp.w / 2
        obs.y = by - fp.h / 2
        obs.w = fp.w
        obs.h = fp.h
        obs.originX = bx
        obs.originY = by
      }
    }

    // Float bob for settled dropped items. Reads the game clock so the bob
    // freezes on pause with the rest of the world — one clock everywhere.
    const bobNow = state.gameTime
    for (const s of this.droppedSprites) {
      if (!s || !s.getData('settled') || s.getData('attracting')) continue
      const baseY = s.getData('baseY') as number
      const phase = s.getData('bobPhase') as number
      s.y = baseY + Math.sin(bobNow * Overworld.DROP_BOB_SPEED + phase) * Overworld.DROP_BOB_AMP
    }

    this.rope.update()

    // ---- tumbleweeds ----
    updateTumbleweeds(this, this.player.x, this.player.y, Overworld.PLAYER_HALF)

    // Manual reload (R): top the clip back to full over the gun's reload time,
    // charging only the rounds actually added.
    if (overworldVisible && Phaser.Input.Keyboard.JustDown(this.rKey)) {
      this.tryStartReload()
    }

    // Mount/dismount the nearest honse
    if (overworldVisible && Phaser.Input.Keyboard.JustDown(this.eKey)) {
      const ui = this.scene.get('UI') as UI
      if (ui.isCrateOpen()) {
        // crate open → E closes it (single owner of the toggle, so the same
        // keypress can never close-then-reopen)
        ui.closeCrate()
      } else if (ui.isUpperInventoryOpen()) {
        // upper inventory open → E closes it
        this.registry.events.emit('toggle-inventory')
      } else if (state.mounted !== null) {
        this.dismount()
      } else if (!this.mountNearestHonse()) {
        // no honse in range — open the nearest crate within reach (E has no
        // cursor, so search a radius around the player, not a tight on-sprite hit)
        if (!this.tryOpenCrate(this.player.x, this.player.y, CRATE_RANGE)) {
          // no crate either — loot a dead bandit if one's in reach
          if (!this.tryLootBody(this.player.x, this.player.y)) {
            // nothing interactable in range — toggle inventory
            this.registry.events.emit('toggle-inventory')
          }
        }
      }
    }

    // ---- floating "E" prompt above the nearest interactable ----
    // Mirrors exactly what an E-press would target: nearest honse (mount) or
    // crate (open). Hidden while mounted, while a crate panel is open, or when
    // the overworld isn't the active view.
    {
      const uiE = this.scene.get('UI') as UI
      let target: { x: number; y: number } | null = null
      if (overworldVisible && state.mounted === null && !uiE.isCrateOpen()) {
        let bestSq = Infinity
        const mountSq = MOUNT_RANGE * MOUNT_RANGE
        for (const h of state.honses) {
          const dx = h.x - this.player.x
          const dy = h.y - this.player.y
          const d = dx * dx + dy * dy
          if (d <= mountSq && d < bestSq) { bestSq = d; target = { x: h.x, y: h.y - 20 } }
        }
        const crateSq = CRATE_RANGE * CRATE_RANGE
        for (const c of state.placedCrates) {
          const dx = c.x - this.player.x
          const dy = c.y - this.player.y
          const d = dx * dx + dy * dy
          if (d <= crateSq && d < bestSq) { bestSq = d; target = { x: c.x, y: c.y - 16 } }
        }
        const bodySq = BODY_LOOT_RANGE * BODY_LOOT_RANGE
        for (const b of state.banditBodies) {
          if (b.carried) continue
          const dx = b.x - this.player.x
          const dy = b.y - this.player.y
          const d = dx * dx + dy * dy
          if (d <= bodySq && d < bestSq) { bestSq = d; target = { x: b.x, y: b.y - 12 } }
        }
      }
      if (target) {
        this.ePrompt.setPosition(target.x, target.y).setVisible(true)
      } else if (this.ePrompt.visible) {
        this.ePrompt.setVisible(false)
      }
    }

    // movement only when overworld is the active view
    if (overworldVisible && state.mounted !== null) {
      const h = state.honses[state.mounted]
      const mountedIdx = state.mounted
      let dx = 0
      let dy = 0
      if (this.wasd.A.isDown || this.arrows.left!.isDown) dx -= 1
      if (this.wasd.D.isDown || this.arrows.right!.isDown) dx += 1
      if (this.wasd.W.isDown || this.arrows.up!.isDown) dy -= 1
      if (this.wasd.S.isDown || this.arrows.down!.isDown) dy += 1
      if (dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2 }

      // Acceleration ramp: honse starts at walk speed and builds to gallop
      const reversedX = dx !== 0 && this.mountedLastDx !== 0 && Math.sign(dx) !== Math.sign(this.mountedLastDx)
      const reversedY = dy !== 0 && this.mountedLastDy !== 0 && Math.sign(dy) !== Math.sign(this.mountedLastDy)
      if (reversedX || reversedY) {
        this.mountedRampTime = 0
      }
      if (dx === 0 && dy === 0) {
        // standing still — reset ramp so she starts from walk on next move
        this.mountedRampTime = 0
      } else {
        this.mountedRampTime = Math.min(this.mountedRampTime + dt, MOUNTED_RAMP_MS)
      }
      this.mountedLastDx = dx
      this.mountedLastDy = dy

      const rampFrac = this.mountedRampTime / MOUNTED_RAMP_MS
      // Leading a string of roped honses pins travel to a steady pace so the
      // caravan can't be outrun. Otherwise normal quirt/ramp speed applies.
      const leadingString = this.rope.getHonseLeaderMap(mountedIdx).size > 0
      const speed = leadingString
        ? HORSE_GEAR_SPEEDS[1] * h.speedMul
        : state.inventory[state.selectedInventorySlot]?.type === 'quirt'
        ? HORSE_GEAR_SPEEDS[this.horseGear] * h.speedMul
        : (MOUNTED_SPEED_MIN + (MOUNTED_SPEED_MAX - MOUNTED_SPEED_MIN) * rampFrac) * h.speedMul

      const tethers = this.rope.getAllHonseTetherAnchors(mountedIdx)
      if (this.rope.isAttached()) {
        const leash = this.rope.getLeashAnchor()
        if (leash) tethers.push(leash)
      }
      for (const tether of tethers) {
        if (dx === 0 && dy === 0) break
        const rx = h.x - tether.x
        const ry = h.y - tether.y
        const dist = Math.sqrt(rx * rx + ry * ry)
        if (dist > 0.0001) {
          const rNormX = rx / dist
          const rNormY = ry / dist
          const radial = dx * rNormX + dy * rNormY
          if (radial > 0) {
            const softStart = ROPE_LEASH_LENGTH * ROPE_LEASH_SOFT_START
            const t = Math.max(0, Math.min(1, (dist - softStart) / (ROPE_LEASH_LENGTH - softStart)))
            const scale = 1 - t
            dx -= radial * rNormX
            dy -= radial * rNormY
            dx += radial * scale * rNormX
            dy += radial * scale * rNormY
          }
        }
      }
 
      const mb = this.honseBodies[mountedIdx]
      if (mb) {

        if (mb.isSleeping) { mb.isSleeping = false; (mb as any).sleepCounter = 0 }
        let vx = (dx * speed) / 60
        let vy = (dy * speed) / 60
        // If she's touching a rope, cancel velocity partially
        const cp = (this.time.now - this.honseRopeContactAt <= 120) ? this.honseRopeContactPoint : null
        if (cp) {
          let ix = cp.x - mb.position.x
          let iy = cp.y - mb.position.y
          const ilen = Math.sqrt(ix * ix + iy * iy)
          if (ilen > 0.0001) {
            ix /= ilen; iy /= ilen
  
            let nx = ix, ny = iy   
            const line = this.honseRopeLine
            if (line) {
              const lx = line.bx - line.ax, ly = line.by - line.ay
              const llen = Math.sqrt(lx * lx + ly * ly)
              if (llen > 0.0001) {
                // perpendicular to the line
                let px = -ly / llen, py = lx / llen
                // orient it to point the same way as the segment dir (into rope)
                if (px * ix + py * iy < 0) { px = -px; py = -py }
                nx = px; ny = py
              }
            }
            // Blend 50/50: half segment-based (deform), half line-based (barrier).
            const bx = (ix + nx) * 0.5, by = (iy + ny) * 0.5
            const blen = Math.sqrt(bx * bx + by * by)
            if (blen > 0.0001) {
              const cancelX = bx / blen, cancelY = by / blen
              const into = vx * cancelX + vy * cancelY
              if (into > 0) { vx -= into * cancelX; vy -= into * cancelY }
            }
          }
        }
        this.matter.body.setVelocity(mb, { x: vx, y: vy })
      }

      for (const tether of tethers) {
        if (!mb) break
        const rx = mb.position.x - tether.x
        const ry = (mb.position.y - 3) - tether.y
        const distSq = rx * rx + ry * ry
        const maxSq = ROPE_LEASH_LENGTH * ROPE_LEASH_LENGTH
        if (distSq > maxSq) {
          const dist = Math.sqrt(distSq)
          const outX = rx / dist, outY = ry / dist   // unit vector away from tether
          const v = mb.velocity
          const outward = v.x * outX + v.y * outY     // >0 means moving further out
          if (outward > 0) {
            this.matter.body.setVelocity(mb, { x: v.x - outward * outX, y: v.y - outward * outY })
          }
        }
      }
      // update her facing from input direction
      if (dx > 0.001) h.facingRight = true
      else if (dx < -0.001) h.facingRight = false
      // lock player sprite to the saddle
      this.player.x = h.x
      this.player.y = h.y + MOUNT_SADDLE_Y
      this.player.setDepth(h.y - 7)
      // the rider casts no separate ground shadow while up on the honse
      this.playerShadow.setVisible(false)
    } else if (overworldVisible && !this.inPopup) {
      const baseSpeed = state.playerSpeedOverride ?? PLAYER_SPEED
      const buffed = state.gameTime < state.speedBuffEndsAt
      const speed = baseSpeed + (buffed ? state.speedBuffAmount : 0)
      const step = (speed * dt) / 1000
      let dx = 0
      let dy = 0
      if (this.wasd.A.isDown || this.arrows.left!.isDown) dx -= 1
      if (this.wasd.D.isDown || this.arrows.right!.isDown) dx += 1
      if (this.wasd.W.isDown || this.arrows.up!.isDown) dy -= 1
      if (this.wasd.S.isDown || this.arrows.down!.isDown) dy += 1
      if (dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2 }
      // axis-separated movement so the player can slide along obstacle edges
      const collidesAt = (px: number, py: number): boolean => this.collidesAt(px, py)
      // rope leash: when attached to a post or honse, dampen movement 
      if (this.rope.isAttached() && (dx !== 0 || dy !== 0)) {
        const anchor = this.rope.getLeashAnchor()
        if (anchor !== null) {
          const rx = this.player.x - anchor.x
          const ry = this.player.y - anchor.y
          const dist = Math.sqrt(rx * rx + ry * ry)
          if (dist > 0.0001) {
            const rNormX = rx / dist
            const rNormY = ry / dist
            // signed radial component: positive = moving away from the anchor
            const radial = dx * rNormX + dy * rNormY
            if (radial > 0) {
              // scale outward motion: 1.0 at < soft start, → 0 at the leash limit
              const softStart = ROPE_LEASH_LENGTH * ROPE_LEASH_SOFT_START
              const t = Math.max(0, Math.min(1, (dist - softStart) / (ROPE_LEASH_LENGTH - softStart)))
              const scale = 1 - t   // linear falloff; quadratic (1 - t*t) feels softer
              // remove outward radial, then add back the scaled version
              dx -= radial * rNormX
              dy -= radial * rNormY
              dx += radial * scale * rNormX
              dy += radial * scale * rNormY
            }
          }
        }
      }
      // Pushable containers: apply a force toward the player's movement so the
      // body's mass + friction resist (feels heavy), instead of hard-setting
      // velocity (which would ignore friction and track the player exactly).
      if (dx !== 0 || dy !== 0) {
        const half = Overworld.PLAYER_HALF
        for (let ci = 0; ci < state.placedCrates.length; ci++) {
          const c = state.placedCrates[ci]
          const body = this.crateBodies[ci]
          if (!body) continue
          const npx = this.player.x + dx * step
          const npy = this.player.y + dy * step
          const fp = this.containerFootprint(c.item ?? 'crate')
          if (aabbOverlap(npx, npy, half, c.x - fp.w / 2, c.y - fp.h / 2, fp.w, fp.h)) {
            if (body.isSleeping) { body.isSleeping = false; (body as any).sleepCounter = 0 }
            // Force scales with the body's mass so heavier containers still move,
            // but the push has to overcome inertia + friction each frame.
            const f = PUSH_FORCE * body.mass
            this.matter.body.applyForce(body, body.position, { x: dx * f, y: dy * f })
          }
        }
      }
      // Sub-stepped integration so collision is speed-independent. A single
      // big step (high speed / low framerate) tested only at the destination
      // makes obstacles reject from farther away — the faster you go, the
      // bigger the apparent no-go zone. Advancing in small slices (<= half the
      // player's extent) collides at the same place regardless of speed.
      const minX = state.worldBounds.minX + 8
      const maxX = state.worldBounds.minX + state.worldBounds.width - 8
      const minY = state.worldBounds.minY + 8
      const maxY = state.worldBounds.minY + state.worldBounds.height - 8
      const totalX = dx * step
      const totalY = dy * step
      const slice = Overworld.PLAYER_HALF   // max distance advanced per sub-step
      const dist = Math.sqrt(totalX * totalX + totalY * totalY)
      const subSteps = Math.max(1, Math.ceil(dist / slice))
      const incX = totalX / subSteps
      const incY = totalY / subSteps
      for (let s = 0; s < subSteps; s++) {
        if (incX !== 0) {
          const nx = Phaser.Math.Clamp(this.player.x + incX, minX, maxX)
          if (!collidesAt(nx, this.player.y)) this.player.x = nx
        }
        if (incY !== 0) {
          const ny = Phaser.Math.Clamp(this.player.y + incY, minY, maxY)
          if (!collidesAt(this.player.x, ny)) this.player.y = ny
        }
      }
      // hard cap: if somehow past leash (e.g. honse moved), snap back to the circle
      if (this.rope.isAttached()) {
        const anchor = this.rope.getLeashAnchor()
        if (anchor !== null) {
          const rx = this.player.x - anchor.x
          const ry = this.player.y - anchor.y
          const distSq = rx * rx + ry * ry
          const maxSq = ROPE_LEASH_LENGTH * ROPE_LEASH_LENGTH
          if (distSq > maxSq) {
            const dist = Math.sqrt(distSq)
            this.player.x = anchor.x + (rx / dist) * ROPE_LEASH_LENGTH
            this.player.y = anchor.y + (ry / dist) * ROPE_LEASH_LENGTH
          }
        }
      }
      this.player.setDepth(this.player.y - 8)
      this.playerShadow.setVisible(true)
      this.playerShadow.setPosition(this.player.x + 4, this.player.y + 8)
      this.playerShadow.setDepth(this.player.y - 9)
    }

    // Game clock drives every downstream timer in this block: decor/tree cull
    // throttle (lastDecorCullAt), producer + workshop ticks (lastItemTickAt),
    // pipe transfer (lastPipeTickAt via runPipeTicks), and the dropped-item
    // pickup delay (pickupAt). All of those stamps are also game-time, so they
    // freeze together on pause.
    const now = state.gameTime
    const px = this.player.x
    const py = this.player.y

    // Bake terrain chunks entering view EVERY frame so a chunk can never scroll
    // into view unbaked regardless of camera speed. Cheap (flat 2D stamps), so
    // it isn't throttled. Freeing far chunks rides the cull throttle below.
    this.chunkTerrain.bakeVisible()

    // ---- decor + tree culling ----
    if (now - this.lastDecorCullAt >= DECOR_CULL_INTERVAL_MS) {
      this.cullDecor()
      this.cullTrees()
      this.cullRocks()
      this.chunkTerrain.freeFar()
      this.lastDecorCullAt = now
    }

    // auto-close the crate panel if the player walks out of reach. 
    if (overworldVisible) {
      const ui = this.scene.get('UI') as UI
      const cratePos = ui.openCratePos()
      if (cratePos) {
        const dx = px - cratePos.x
        const dy = py - cratePos.y
        if (dx * dx + dy * dy > CRATE_RANGE * CRATE_RANGE) ui.closeCrate()
      }
    }

    // pickup any revealed coins the player has walked over
    if (overworldVisible && state.revealedItems.length > 0) {
      const pickSq = Overworld.PICKUP_RADIUS * Overworld.PICKUP_RADIUS
      for (let i = state.revealedItems.length - 1; i >= 0; i--) {
        const r = state.revealedItems[i]
        const dx = r.x - px
        const dy = r.y - py
        if (dx * dx + dy * dy > pickSq) continue
        state.revealedItems.splice(i, 1)
        const key = `${r.x},${r.y}`
        const sprite = this.revealedSprites.get(key)
        if (sprite) { sprite.destroy(); this.revealedSprites.delete(key) }
        state.addGold(r.reward, this.registry)
        this.spawnGoldFloat(r.x, r.y, r.reward)
      }
    }

    // pickup any dropped items the player has walked over with loot magnet
    if (overworldVisible && state.droppedItems.length > 0) {
      const pickSq = Overworld.PICKUP_RADIUS * Overworld.PICKUP_RADIUS
      const attractSq = Overworld.PICKUP_ATTRACT_RADIUS * Overworld.PICKUP_ATTRACT_RADIUS
      for (let i = state.droppedItems.length - 1; i >= 0; i--) {
        const d = state.droppedItems[i]
        const sprite = this.droppedSprites[i]
        // respect the post-drop pickup delay so fresh drops don't vanish underfoot
        if (sprite && now < (sprite.getData('pickupAt') as number)) continue
        const dx = px - d.x
        const dy = py - d.y
        const distSq = dx * dx + dy * dy

        // outside attract range — leave it floating
        if (distSq > attractSq) {
          if (sprite) sprite.setData('attracting', false)
          continue
        }

        if (distSq > pickSq) {
          if (sprite) {
            // only magnet what the player can actually take 
            if (state.roomFor(d.stack) <= 0) {
              sprite.setData('attracting', false)
              continue
            }
            sprite.setData('attracting', true)
            sprite.x += dx * Overworld.PICKUP_ATTRACT_EASE
            sprite.y += dy * Overworld.PICKUP_ATTRACT_EASE
            d.x = sprite.x
            d.y = sprite.y
          }
          continue
        }

        const added = state.inventoryAddAnywhere(d.stack)
        if (added > 0) {
          this.registry.events.emit('inventory-changed')
          // Pickup toast — uses `added` (what actually fit), not d.stack.count.
          // The buried-coin path at ~line 4771 stays out of this: that's gold,
          // already handled by spawnGoldFloat. This is item pickups only.
          this.registry.events.emit('item-picked-up', { type: d.stack.type, count: added })
        }
        if (d.stack.count <= 0) {
          state.droppedItems.splice(i, 1)
          this.droppedSprites[i]?.destroy()
          this.droppedSprites.splice(i, 1)
        }
      }
    }

    // Door zone check
    let inAnyDoorZone = false
    for (let i = 0; i < state.plots.length; i++) {
      const plot = state.plots[i]
      if (plot.built === 'empty') continue
      const view = this.plotViews[i]
      if (overworldVisible && Math.abs(px - view.x) < 16 && Math.abs(py - view.y) < 16) {
        inAnyDoorZone = true
        if (!this.doorCheckBlocked) {
          this.enterPlotInterior(i, plot.built)
          return
        }
      }
    }
    // world structures use the same door-zone size as plots, but shops are
    // visually wider (mirrored copy to the right) so their door zone extends
    // to cover both halves.
    for (let i = 0; i < state.worldStructures.length; i++) {
      const s = state.worldStructures[i]
      const inZone = overworldVisible && (
        (s.type === 'shop' || s.type === 'general_store')
          ? (px - s.x) >= -22 && (px - s.x) <= 46 && Math.abs(py - s.y) < 16
          : s.type === 'church_bell' || s.type === 'church_bell_back'
          ? Math.abs(px - s.x) < 37 && (py - s.y) > -4 && (py - s.y) < 37
          : s.type === 'long_house'
          ? (px - s.x) >= -16 && (px - s.x) <= 26 && Math.abs(py - s.y) < 42
          : s.type === 'abandoned_house'
          ? (px - s.x) >= -26 && (px - s.x) <= 19 && Math.abs(py - s.y) < 16
          : Math.abs(px - s.x) < 16 && Math.abs(py - s.y) < 16
      )
      if (inZone) {
        inAnyDoorZone = true
        if (!this.doorCheckBlocked) {
          this.enterWorldStructure(i, s.type)
          return
        }
      }
    }
    // standalone world wells — walk up to open, same as plot wells
    for (let i = 0; i < state.worldWells.length; i++) {
      const wl = state.worldWells[i]
      if (overworldVisible && Math.abs(px - wl.x) < 16 && Math.abs(py - wl.y) < 16) {
        inAnyDoorZone = true
        if (!this.doorCheckBlocked) {
          this.enterWorldWell(i)
          return
        }
      }
    }
    if (!inAnyDoorZone) this.doorCheckBlocked = false

    for (let i = 0; i < state.plots.length; i++) {
      const plot = state.plots[i]
      if (plot.built === 'empty') continue
      const def = BUILDINGS[plot.built]

      if (def.producesItem && def.itemTickMs) {
        const itemTick = getEffectiveTickMs(def.itemTickMs, plot.level)
        const cap = getStorageCap(plot.level)

        const blockedSameType = plot.output !== null && plot.output.type === def.producesItem && plot.output.count >= cap
        const blockedDiffType = plot.output !== null && plot.output.type !== def.producesItem
        const slotFull = blockedSameType || blockedDiffType
        if (slotFull) {
          // hold the timer so the next item lands immediately when slot is freed
          plot.lastItemTickAt = now
        } else {
          const elapsedI = now - plot.lastItemTickAt
          const fullItemTicks = Math.floor(elapsedI / itemTick)
          if (fullItemTicks > 0) {
            const have = plot.output?.count ?? 0
            const room = cap - have
            const add = Math.min(room, fullItemTicks)
            if (add > 0) {
              if (plot.output && plot.output.type === def.producesItem) {
                plot.output.count += add
              } else {
                plot.output = { type: def.producesItem, count: add }
              }
            }
            plot.lastItemTickAt += fullItemTicks * itemTick
          }
        }
      }

      // ---- workshop auto-craft tick ----
      // When a workshop has auto-craft toggled ON (in its interior) and a valid
      // recipe in its inputs with room in its output slot, it crafts on a timer
      // so the output buffers up unattended for pipes or the player to drain.
      // When auto-craft is OFF it's a plain crafting table — the player pulls
      // each craft by hand in the interior, and this tick does nothing.
      if (plot.built === 'workshop' && plot.autoCraft) {
        const preview = previewCraft(i)
        if (preview === null) {
          // no valid recipe — hold the timer so crafting starts fresh
          plot.lastItemTickAt = now
        } else {
          // check output slot has room for this craft's result
          const cap = ITEMS[preview.type].maxStack
          const out = plot.craftOutput
          const blockedDiffType = !!out && out.type !== preview.type
          const blockedFull = !!out && out.type === preview.type && out.count + preview.count > cap
          if (blockedDiffType || blockedFull) {
            plot.lastItemTickAt = now
          } else {
            const craftMs = getEffectiveTickMs(BUILDINGS.workshop.tickMs, plot.level)
            const elapsed = now - plot.lastItemTickAt
            if (elapsed >= craftMs) {
              const result = consumeCraft(i)
              if (result) {
                if (plot.craftOutput && plot.craftOutput.type === result.type) {
                  plot.craftOutput.count += result.count
                } else {
                  plot.craftOutput = result
                }
              }
              plot.lastItemTickAt += craftMs
            }
          }
        }
      }
    }

    // ---- standalone world well fill ---- fills to WORLD_WELL_CAP, then idles
    const wellTick = BUILDINGS.well.itemTickMs!
    for (const wl of state.worldWells) {
      if (wl.water >= WORLD_WELL_CAP) {
        // hold the timer so the next water lands a full interval after a take
        wl.lastTickAt = now
        continue
      }
      const elapsed = now - wl.lastTickAt
      const ticks = Math.floor(elapsed / wellTick)
      if (ticks > 0) {
        wl.water = Math.min(WORLD_WELL_CAP, wl.water + ticks)
        wl.lastTickAt += ticks * wellTick
      }
    }

    // ---- pipe item transfer ----
    this.runPipeTicks(now)

    // ---- safe zone / combat ---- hearts show outside any safe zone
    const px2 = this.player.x, py2 = this.player.y
    let inSafe = false
    for (const z of this.safeZones) {
      if (px2 >= z.x && px2 <= z.x + z.w && py2 >= z.y && py2 <= z.y + z.h) { inSafe = true; break }
    }
    if (inSafe === this.inCombat) {
      this.inCombat = !inSafe
      this.registry.set('inCombat', this.inCombat)
    }
  }
}
