import Phaser from 'phaser'
import { loadSprites } from '../sprites/loader'
import { COLORS } from '../colors'
import { UI_BAR_HEIGHT, UI } from './UI'
import { state, BUILDINGS, getEffectiveTickMs, getStorageCap, type BuiltType } from '../game/state'
import { ITEMS, type ItemStack, type ItemDef, type ItemType } from '../items/types'
import { generateWorld } from '../world/gen'
import { WORLD_STRUCTURES, TOWNS, type WorldStructureType } from '../world/structures'
import { registerGrabbable } from '../ui/hover'
import { RopeController } from '../world/ropeController'
import { updateHonses, getHonseBodyAABB } from '../world/honse'

const WORLD_PX = 576 * 8    // 8x canvas size, so player can wander
// Wood-brown palette for the burst when an axe destroys a post.
const POST_PARTICLE_COLORS = [0x6B4A2A, 0x8B5A2B, 0x4A3318, 0x9C7248]
const PLAYER_SPEED = 130
const MOUNTED_SPEED_MIN = 130   // honse walk speed — same as player on foot
const MOUNTED_SPEED_MAX = 235   // honse top speed after full ramp
const MOUNTED_RAMP_MS = 2200    // time to accelerate from min to max
// How close the player must be to a honse to mount her (center-to-center px).
const MOUNT_RANGE = 40
// Max distance (px) from the player at which tools (shovel, posts) can be used.
// Beyond this the cursor reverts to default and clicks do nothing.
const TOOL_RANGE = 150
// Player sprite offset above honse center while mounted (saddle position).
const MOUNT_SADDLE_Y = -10
const FOOD_BUFF_MS = 60000

const PLOT_COLS = 4
const PLOT_ROWS = 4
const PLOT_SIZE = 56
const PLOT_SPACING = 112
const PLOT_COUNT = PLOT_COLS * PLOT_ROWS

// Sprites are authored at 1px-per-pixel. We render them upscaled to fit plots.
const SPRITE_SCALE = 3   // 16px sprite → 48px on screen (fits 56px plot)
const PLAYER_SCALE = 2   // player half-size: 8px sprite → 16px on screen

// Rope leash: when the rope is attached, the player can't go further than
// ROPE_LEASH_LENGTH from the anchor. From ROPE_LEASH_SOFT_START fraction
// outward, outward radial movement is progressively dampened to zero.
const ROPE_LEASH_LENGTH = 140
const ROPE_LEASH_SOFT_START = 0.9

// Kind tag for entries in the Overworld's obstacles list. Used by placement
// validation and any other code that needs to know what a given collision
// rectangle represents. Add new variants when adding new placeable types.
type ObstacleKind = 'tree' | 'rock' | 'post' | 'building' | 'solid'

// True if two axis-aligned rectangles overlap. First rect is center+half-extent
// (px, py, half), second is origin+size (x, y, w, h).
function aabbOverlap(px: number, py: number, half: number, x: number, y: number, w: number, h: number): boolean {
  return px + half > x && px - half < x + w && py + half > y && py - half < y + h
}

// True if two origin+size AABBs overlap.
function boxOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax + aw > bx && ax < bx + bw && ay + ah > by && ay < by + bh
}

// Shortest distance from point (px, py) to the line segment (x1,y1)→(x2,y2).
function pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq < 0.0001) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1))
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq))
  const projX = x1 + t * dx
  const projY = y1 + t * dy
  return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY))
}

interface PlotView {
  x: number
  y: number
  priceTag: Phaser.GameObjects.BitmapText
  building: Phaser.GameObjects.Sprite | null
  nameLabel: Phaser.GameObjects.BitmapText | null
  barBg: Phaser.GameObjects.Rectangle | null
  barFill: Phaser.GameObjects.Rectangle | null
  barLabel: Phaser.GameObjects.BitmapText | null
}

const BAR_W = PLOT_SIZE
const BAR_H = 14
const BAR_Y_OFFSET = PLOT_SIZE / 2 + 4   // sit just below the plot

export class Overworld extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private arrows!: Phaser.Types.Input.Keyboard.CursorKeys
  private eKey!: Phaser.Input.Keyboard.Key
  // Mounted acceleration ramp: tracks how long the honse has been moving in
  // the current direction. Reversal on either axis resets the timer to zero.
  private mountedRampTime = 0
  private mountedLastDx = 0
  private mountedLastDy = 0
  // True once honses have been spawned this session (prevents re-spawning every frame)
  private honsesSpawned = false
  private plotViews: PlotView[] = []
  // Solid obstacles the player can't walk through. World-space AABBs with a
  // `kind` tag so consumers (placement validation, future hit-tests) can ask
  // what each rectangle represents instead of cross-referencing parallel
  // lists. Add new kinds here as new placeable types appear.
  private obstacles: { x: number; y: number; w: number; h: number; kind: ObstacleKind; originX?: number; originY?: number }[] = []
  private worldBg!: Phaser.GameObjects.Rectangle
  // sprite for each currently-revealed buried coin, keyed by `x,y` so we can
  // destroy it on pickup. Parallel to state.revealedItems.
  private revealedSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  // dirt patches left by digging, keyed by `x,y` so we can destroy on undo.
  private dugSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  // Player-dropped items in the world. Index in state.droppedItems → sprite.
  private droppedSprites: (Phaser.GameObjects.Sprite | null)[] = []
  // Planted trees/saplings in the world, keyed by `x,y` so we can destroy on dig-up.
  private plantedTreeSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  // Mature tree sprites, keyed by `x,y`, so chopping can find and fell them.
  private matureTreeSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  // Axe hit counts per mature tree, keyed by `x,y`. Resets when the tree fells.
  private treeHits: Map<string, number> = new Map()
  // Player-placed hitching posts, keyed by `x,y`. Future: rope-throw targets.
  private placedPostSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  // Honse sprites — parallel to state.honses by index. Position + depth are
  // synced from state each frame in update().
  private honseSprites: Phaser.GameObjects.Sprite[] = []
  // Shadow Matter bodies for honses — static rectangles repositioned each frame
  // so rope segments collide with honses without changing the movement system.
  private honseBodies: MatterJS.BodyType[] = []
  // Owns rope physics, catch detection, and the leash-anchor lookup. Built in
  // create() once the player sprite exists.
  private rope!: RopeController

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
    this.worldBg = this.add.rectangle(WORLD_PX / 2, WORLD_PX / 2, WORLD_PX, WORLD_PX, COLORS.worldBg)
      .setStrokeStyle(2, COLORS.worldBorder)
      .setInteractive()
    this.worldBg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const ui = this.scene.get('UI') as UI
      const drag = ui.getDragController()
      const isRight = p.rightButtonDown()

      // ---- MOUNT / DISMOUNT ----
      // While mounted: right-click dismounts unless food is held/selected
      // (so eat-from-horseback still works). An unarmed left-click also
      // dismounts. With an active tool (rope, shovel, etc.) held, a
      // left-click falls through to that tool's handler — you can throw rope,
      // dig, etc. from horseback.
      if (state.mounted !== null) {
        const heldEdible = isRight && drag.isHolding() ? drag.peekEdibleDef() : undefined
        const selectedEdible = isRight ? this.peekSelectedEdibleDef() : undefined
        const rightClickEats = isRight && (heldEdible || selectedEdible)
        const leftClickDismounts = !isRight && !state.getSelectedTool()
        if ((isRight && !rightClickEats) || leftClickDismounts) {
          this.dismount()
          return
        }
      }
      // Not mounted: if the player is close enough to a honse, left-click mounts.
      // Refuse if a rope is in-flight/attached or a tool is selected (those
      // clicks have their own meaning).
      if (!isRight && !this.rope.isAttached() && !state.getSelectedTool()) {
        if (this.mountNearestHonse()) return
      }


      // right-click: eat from held cursor, or from selected hotbar slot
      if (isRight) {
        const heldDef = drag.isHolding() ? drag.peekEdibleDef() : undefined
        if (heldDef && drag.tryEatHeld()) {
          this.spawnCrumbs(this.player.x, this.player.y, heldDef.crumbColor!)
          state.speedBuffEndsAt = Date.now() + FOOD_BUFF_MS
          state.speedBuffAmount = heldDef.speedBuff!
          return
        }
        const selectedDef = this.peekSelectedEdibleDef()
        if (selectedDef && this.tryEatSelected()) {
          this.spawnCrumbs(this.player.x, this.player.y, selectedDef.crumbColor!)
          state.speedBuffEndsAt = Date.now() + FOOD_BUFF_MS
          state.speedBuffAmount = selectedDef.speedBuff!
          return
        }
        return  // right-click with non-food does nothing on the world
      }

      // left-click — existing behavior
      // if the player is holding a stack (drag-and-drop):
      //   - if it's a sapling and dropped on a dirt patch → plant it
      //   - otherwise drop the stack on the ground
      if (drag.isHolding()) {
        const heldStack = drag.peekHeldStack()
        if (heldStack && heldStack.type === 'cottonwood_sapling') {
          if (this.tryPlantFromStack(p.worldX, p.worldY, heldStack)) {
            // sapling count decremented; if empty, clear held
            if (heldStack.count <= 0) drag.takeHeld()
            else drag.refreshHeldVisual()
            return
          }
        }
        const stack = drag.takeHeld()
        if (stack) this.dropStack(p.worldX, p.worldY, stack)
        return
      }
      // click on a tied rope to untie and destroy it
      if (this.rope.untieAtClick(p.worldX, p.worldY)) return
      if (state.isShovelSelected()) {
        this.tryDig(p.worldX, p.worldY)
        return
      }
      // sapling selected? try to plant on a nearby dirt patch
      if (this.trySaplingPlant(p.worldX, p.worldY)) return
      // axe selected? try to chop a nearby mature tree, else destroy a post
      if (state.inventory[state.selectedInventorySlot]?.type === 'axe') {
        if (this.tryChop(p.worldX, p.worldY)) return
        if (this.tryAxePost(p.worldX, p.worldY)) return
      }
      // post selected? try to place it in the world
      if (this.tryPlacePost(p.worldX, p.worldY)) return
      // rope selected? Throw goes through the rope controller, which consumes
      // one rope when the throw resolves (caught-and-thrown, or missed).
      const sel = state.inventory[state.selectedInventorySlot]
      if (sel && sel.type === 'rope' && this.rope.throw(p.worldX, p.worldY)) return
    })

    // 16 plots, evenly spaced, centered on the world
    const cx = WORLD_PX / 2
    const cy = WORLD_PX / 2
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

        const priceTag = this.add.bitmapText(x, y, 'main', '$', 16)
          .setOrigin(0.5, 0.5)
          .setTint(COLORS.plotPriceTag)

        const view: PlotView = { x, y, priceTag, building: null, nameLabel: null, barBg: null, barFill: null, barLabel: null }
        this.plotViews.push(view)

        rect.on('pointerdown', (p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
          const tool = state.getSelectedTool()
          if (tool && (tool.cursorContexts ?? ['overworld']).includes('overworld')) return   // overworld tool equipped — click is for the tool
          if (!p.leftButtonDown()) return        // build menu opens on left-click only
          ev.stopPropagation()  // don't also award click-on-bg gold
          // only open the build menu if the plot is empty
          if (state.plots[plotIndex].built === 'empty') {
            this.registry.events.emit('open-build-menu', plotIndex)
          }
        })
      }
    }

    // procedural world decor — scatter cow skulls (wide buffer), pebbles + grass (plot footprint only)
    const exclusions = this.plotViews.map(v => ({ x: v.x, y: v.y, radius: 100 }))
    exclusions.push({ x: cx, y: cy, radius: 60 })  // also clear the spawn point
    // ground texture only avoids the plot footprint itself (so pebbles/grass appear right up to plot edges)
    const tightExclusions = this.plotViews.map(v => ({ x: v.x, y: v.y, radius: 61 }))
    const layout = generateWorld({
      seed: Math.floor(Math.random() * 1e9),
      worldSize: WORLD_PX,
      exclusions,
      tightExclusions,
    })
    for (const d of layout.decor) {
      this.add.sprite(d.x, d.y, d.type).setScale(d.scale)
    }
    // seed buried items from the layout
    state.buriedItems = layout.buried.map(b => ({ x: b.x, y: b.y, reward: b.reward }))
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
    // restore any planted trees already in state, by stage
    for (const t of state.plantedTrees) {
      const key = `${t.x},${t.y}`
      if (t.stage === 'sapling') {
        const sprite = this.add.sprite(t.x, t.y, 'planted_cottonwood_sapling').setScale(2).setDepth(2)
        this.plantedTreeSprites.set(key, sprite)
      } else if (t.stage === 'stump') {
        const sprite = this.add.sprite(t.x, t.y, 'cottonwood_stump').setScale(3).setDepth(t.y + 18)
        this.matureTreeSprites.set(key, sprite)
      } else {
        // mature
        const sprite = this.add.sprite(t.x, t.y, 'cottonwood').setScale(3).setDepth(t.y + 18)
        this.matureTreeSprites.set(key, sprite)
      }
    }
    // restore any placed posts already in state
    for (const p of state.placedPosts) {
      const sprite = this.add.sprite(p.x, p.y, p.species ?? 'post').setScale(2).setDepth(p.y + 8)
      this.placedPostSprites.set(`${p.x},${p.y}`, sprite)
      this.obstacles.push(this.makePostObstacle(p.x, p.y))
    }
    // restore any revealed-but-uncollected coins
    for (const r of state.revealedItems) {
      this.spawnRevealedCoinSprite(r.x, r.y)
    }

    // fixed world structures (shop, church, ...) — render at their hardcoded positions
    for (const s of state.worldStructures) {
      const def = WORLD_STRUCTURES[s.type]
      // y-sort depth uses the building's bottom edge (sprite is 16px @ scale 3)
      const bottomY = s.y + 24
      this.add.sprite(s.x, s.y, def.sprite).setScale(def.scale).setDepth(bottomY)
      // shops get a mirrored copy at the same position so the building reads wider
      if (s.type === 'shop' || s.type === 'general_store') {
        // mirror to the right, snug against the original. Sprite's right side
        // has 4px of native padding, so offset by content width not full width.
        this.add.sprite(s.x + 24, s.y, def.sprite).setScale(def.scale).setFlipX(true).setDepth(bottomY)
        // building footprint covers both halves: x ranges ~[-24, +48], y ~±24
        this.obstacles.push({ x: s.x - 24, y: s.y - 24, w: 72, h: 48, kind: 'building' as ObstacleKind })
      } else {
        // single-sprite building: 48x48 centered
        this.obstacles.push({ x: s.x - 24, y: s.y - 24, w: 48, h: 48, kind: 'building' as ObstacleKind })
      }
    }

    // ---- TEST ROCK FORMATION ---- horizontal ridge with a bump in the middle.
    {
      const TILE = 24
      const rockX = cx - 240
      const rockY = cy + 280
      const rockBottomY = rockY + TILE / 2   // y-sort depth (same for every tile)
      const rockTiles = ['rock_tl', 'rock_bump', 'rock_tr']
      for (let c = 0; c < rockTiles.length; c++) {
        const x = rockX + c * TILE
        const isBump = rockTiles[c] === 'rock_bump'
        const sprite = this.add.sprite(x, rockY, rockTiles[c]).setScale(3)
        if (isBump) sprite.setOrigin(0.5, 1).setY(rockBottomY)
        sprite.setDepth(rockBottomY)
      }
      // collision rect covering the full formation footprint
      const rockAABB = {
        x: rockX - TILE / 2,
        y: rockY - TILE / 2,
        w: TILE * rockTiles.length,
        h: TILE,
        kind: 'rock' as ObstacleKind,
      }
      this.obstacles.push(rockAABB)
      this.addRopeBlocker(rockAABB)
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
      }
      this.placeTree(3220, 160)
    }

    // ---- OASIS GROVE ---- 10 cottonwoods clustered ~1600px east of plot
    // center on a patch of brush ground. Trees hand-placed (not grid) so it
    // reads as a grove, not a farm. Brush tiles painted underneath with a
    // feathered edge — perimeter tiles are randomly skipped so the patch
    // fades into the cream rather than ending in a hard square.
    {
      // Center of the grove. All positions are relative to this anchor.
      const gx = 3900
      const gy = 2380
      // Brush ground: tile 16px square (8×8 sprite at scale 2) across an
      // oval extent. Interior fully filled; perimeter tiles fade out with
      // distance-based probability so the edge dissolves into the cream.
      const TILE = 16
      const halfW = 14   // tiles wide / 2 (so ~28 tiles → ~448px wide)
      const halfH = 10   // tiles tall / 2 (so ~20 tiles → ~320px tall)
      // ellipse radii (in tiles) — same as halves so a tile at the edge is
      // ~r/r = 1 (full edge); slightly inside is more likely to render.
      for (let ty = -halfH; ty <= halfH; ty++) {
        for (let tx = -halfW; tx <= halfW; tx++) {
          // normalized distance from center in ellipse-space
          const ndx = tx / halfW
          const ndy = ty / halfH
          const d2 = ndx * ndx + ndy * ndy
          if (d2 > 1) continue   // outside the ellipse entirely
          // inside ~0.7 radius: always render. Outside that: probability
          // drops linearly to 0 at the edge.
          const keepProb = d2 < 0.49 ? 1 : 1 - (d2 - 0.49) / 0.51
          if (Math.random() > keepProb) continue
          const x = gx + tx * TILE
          const y = gy + ty * TILE
          this.add.sprite(x, y, 'brush_ground').setScale(2).setDepth(0.5)
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
      this.placeNonEnterable(3790, 1480, 'shop', 3)
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
    this.honseSprites = state.honses.map(h =>
      this.add.sprite(h.x, h.y, 'honse').setScale(2).setDepth(h.y + 8)
    )
    // Shadow Matter bodies so rope segments can't pass through honses.
    this.honseBodies = state.honses.map(h =>
      this.matter.add.rectangle(h.x, h.y + 3, 30, 12, { isStatic: true })
    )

    // player at world center. Depth = y, so sprites south of the player render
    // in front and sprites north render behind (standard overhead y-sort).
    this.player = this.add.sprite(cx, cy, 'player').setScale(PLAYER_SCALE).setDepth(cy)
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
    // Static Matter bodies so rope segments bounce off buildings. Trees,
    // rocks, and posts are deliberately NOT blockers — they're rope targets
    // (or will be).
    for (const o of this.obstacles) if (o.kind === 'building') this.addRopeBlocker(o)

    // camera — viewport starts below the top bar, extends to bottom of canvas
    const cam = this.cameras.main
    cam.setViewport(0, UI_BAR_HEIGHT, cam.width, cam.height - UI_BAR_HEIGHT)
    cam.startFollow(this.player)
    cam.setBounds(0, 0, WORLD_PX, WORLD_PX)
    cam.setZoom(1.08)

    // launch the UI scene on top
    this.scene.launch('UI')

    // input
    const kb = this.input.keyboard!
    this.wasd = kb.addKeys('W,A,S,D') as any
    this.arrows = kb.createCursorKeys()
    this.eKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    // listen for buy events coming back from the UI build menu
    this.registry.events.on('buy-building', (plotIndex: number, type: BuiltType) => {
      this.tryBuyAtPlot(plotIndex, type)
    })

    // when returning from Interior, put the player back exactly where they were
    // standing when they entered (saved in enterInterior).
    this.registry.events.on('interior-exited', () => {
      this.cameras.main.setVisible(true)
      if (this.preInteriorPos) {
        const bx = this.preInteriorBuildingPos?.x ?? this.preInteriorPos.x
        const by = this.preInteriorBuildingPos?.y ?? this.preInteriorPos.y
        let dx = this.preInteriorPos.x - bx
        let dy = this.preInteriorPos.y - by
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 0) { dx /= len; dy /= len }
        else { dy = 1 }  // default: push south
        this.player.x = this.preInteriorPos.x + dx * 5
        this.player.y = this.preInteriorPos.y + dy * 5
        this.player.setDepth(this.player.y + 8)
        this.preInteriorPos = null
        this.preInteriorBuildingPos = null
      }
      // ignore door detection until the player moves out of the current
      // door zone, so we don't immediately re-enter the building we just left.
      this.doorCheckBlocked = true
    })
  }

  private preInteriorPos: { x: number; y: number } | null = null
  private preInteriorBuildingPos: { x: number; y: number } | null = null
  // true after exiting an interior; cleared once the player walks out of any door zone.
  private doorCheckBlocked = false

  private enterPlotInterior(plotIndex: number, type: BuiltType) {
    this.preInteriorPos = { x: this.player.x, y: this.player.y }
    const view = this.plotViews[plotIndex]
    this.preInteriorBuildingPos = { x: view.x, y: view.y }
    this.cameras.main.setVisible(false)
    this.registry.events.emit('interior-entered')
    this.scene.run('Interior', { source: 'plot', buildingType: type, plotIndex })
    this.scene.bringToTop('UI')
  }

  private enterWorldStructure(structureIndex: number, type: WorldStructureType) {
    this.preInteriorPos = { x: this.player.x, y: this.player.y }
    const s = state.worldStructures[structureIndex]
    this.preInteriorBuildingPos = { x: s.x, y: s.y }
    this.cameras.main.setVisible(false)
    this.registry.events.emit('interior-entered')
    this.scene.run('Interior', { source: 'world', buildingType: type, structureIndex })
    this.scene.bringToTop('UI')
  }

  private tryBuyAtPlot(plotIndex: number, type: BuiltType) {
    const ok = state.placeBuilding(plotIndex, type, this.registry)
    if (!ok) return
    const view = this.plotViews[plotIndex]
    view.priceTag.destroy()
    view.building = this.add.sprite(view.x, view.y, type).setScale(SPRITE_SCALE).setDepth(view.y + 12)
    // honses can't walk through built plots; rope segments bounce off too
    const plotAABB = { x: view.x - 24, y: view.y - 24, w: 48, h: 48, kind: 'building' as ObstacleKind }
    this.obstacles.push(plotAABB)
    this.addRopeBlocker(plotAABB)

    const def = BUILDINGS[type]
    // name label above the plot
    view.nameLabel = this.add.bitmapText(view.x, view.y - PLOT_SIZE / 2 - 4, 'mainSmall', def.name, 15)
      .setOrigin(0.5, 1)
      .setTint(COLORS.plotPriceTag)
    // only buildings that produce gold get a progress bar + label
    if (def.goldPerTick > 0) {
      const barY = view.y + BAR_Y_OFFSET
      view.barBg = this.add.rectangle(view.x, barY, BAR_W, BAR_H, COLORS.progressBg).setOrigin(0.5, 0)
      view.barFill = this.add.rectangle(view.x - BAR_W / 2, barY, 0, BAR_H, COLORS.progressFill).setOrigin(0, 0)
      view.barLabel = this.add.bitmapText(view.x, barY + BAR_H / 2, 'mainSmall', `${def.goldPerTick} gold`, 13)
        .setOrigin(0.5, 0.5)
        .setTint(COLORS.uiText)
    }
  }

  // dig spacing: refuse if click is within this many pixels of an existing dig
  private static DIG_MIN_SPACING = 12
  // plant hit radius: dropping/clicking a sapling within this distance of a
  // dirt patch will plant on it. More generous than DIG_MIN_SPACING so
  // dropping doesn't require pixel-perfect aim.
  private static PLANT_HIT_RADIUS = 28
  // Axe hits required to fell a mature tree.
  private static CHOP_HITS_TO_FELL = 8
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
  // Timestamp of the last axe swing, for the cooldown.
  private lastChopAt = 0
  // dig offset: the shovel cursor's tip is at (0,0) but the blade is lower-left.
  // Offset the dirt patch so it appears at the blade, not the cursor tip.
  private static DIG_OFFSET_X = 0
  private static DIG_OFFSET_Y = 18
  // reveal radius: buried items within this distance of a dig get unearthed.
  private static DIG_REVEAL_RADIUS = 36
  // pickup radius: player walking within this distance of a revealed item collects it.
  private static PICKUP_RADIUS = 18
  // dig duration: shovel stays planted for this long before dirt appears. Also
  // gates further dig clicks so the player can't spam the shovel.
  private static DIG_DURATION_MS = 2000
  // true while a dig is in progress — blocks new dig clicks until resolved.
  private digInProgress = false

  // Places a mature cottonwood: sprite + trunk obstacle + state entry, welded
  // together so a tree can never be placed without collision and rope physics.
  // All world-tree placement must go through here.
  private placeTree(tx: number, ty: number) {
    const sprite = this.add.sprite(tx, ty, 'cottonwood').setScale(3).setDepth(ty + 18)
    this.matureTreeSprites.set(`${tx},${ty}`, sprite)
    this.obstacles.push(this.makeTreeTrunkObstacle(tx, ty))
    state.plantedTrees.push({ x: tx, y: ty, kind: 'cottonwood', stage: 'mature' })
  }

  // Promote a planted sapling to a mature tree. Swaps the walk-through sapling
  // sprite for the solid cottonwood, welds on the trunk obstacle (same helper
  // placeTree uses), and flips the existing state entry — so a grown tree is
  // identical to a hand-placed one and is immediately choppable.
  private growSapling(t: { x: number; y: number; stage: string; plantedAt?: number }) {
    const key = `${t.x},${t.y}`
    const sapSprite = this.plantedTreeSprites.get(key)
    if (sapSprite) { sapSprite.destroy(); this.plantedTreeSprites.delete(key) }

    const sprite = this.add.sprite(t.x, t.y, 'cottonwood').setScale(3).setDepth(t.y + 18)
    this.matureTreeSprites.set(key, sprite)
    this.obstacles.push(this.makeTreeTrunkObstacle(t.x, t.y))

    t.stage = 'mature'
    t.plantedAt = undefined
  }

  // Axe-click on a mature tree within range: shake it side to side as a hit
  // reaction. Returns true if a tree was hit. (Felling comes later.)
  private tryChop(clickX: number, clickY: number): boolean {
    const now = Date.now()
    if (now - this.lastChopAt < Overworld.CHOP_COOLDOWN_MS) return false
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false

    const CHOP_HIT_RADIUS = 18
    const hitSq = CHOP_HIT_RADIUS * CHOP_HIT_RADIUS
    for (const t of state.plantedTrees) {
      if (t.stage !== 'mature') continue
      // trunk sits ~6px left of the sprite's stored center, so offset the hit test
      const tdx = clickX - (t.x - 6)
      const tdy = clickY - t.y
      if (tdx * tdx + tdy * tdy > hitSq) continue

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

  // Axe-destroy a placed post: removes it from state, sprite, and collision,
  // bursts wood particles, and drops the post item where it stood. Returns
  // true if a post was destroyed.
  private tryAxePost(clickX: number, clickY: number): boolean {
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false

    const hitSq = Overworld.POST_HIT_RADIUS * Overworld.POST_HIT_RADIUS
    for (let i = 0; i < state.placedPosts.length; i++) {
      const p = state.placedPosts[i]
      const pdx = clickX - p.x
      const pdy = clickY - p.y
      if (pdx * pdx + pdy * pdy > hitSq) continue

      const species = p.species ?? 'post'
      const key = `${p.x},${p.y}`

      // remove the visual
      const sprite = this.placedPostSprites.get(key)
      if (sprite) sprite.destroy()
      this.placedPostSprites.delete(key)

      // remove the collision body — found by the origin stamped on it, so no
      // geometry has to be recomputed here.
      const obsIdx = this.obstacles.findIndex(
        o => o.kind === 'post' && o.originX === p.x && o.originY === p.y,
      )
      if (obsIdx !== -1) this.obstacles.splice(obsIdx, 1)

      // remove the data
      state.placedPosts.splice(i, 1)

      this.spawnParticles(p.x, p.y, POST_PARTICLE_COLORS)
      this.dropStack(p.x, p.y, { type: species, count: 1 })
      return true
    }
    return false
  }

  // Subtle side-to-side shake of a whole tree sprite, settling back to baseX.
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

  // Fell a mature tree: the stump is revealed at the base while a copy of the
  // full tree tips over (rotating from its base), slides off, and fades. Marks
  // the entry 'stump' in state; the trunk obstacle stays (a stump is solid).
  private fellTree(t: { x: number; y: number; stage: string }, sprite?: Phaser.GameObjects.Sprite) {
    if (sprite) {
      this.tweens.killTweensOf(sprite)
      sprite.x = t.x
      sprite.setTexture('cottonwood_stump')
    }
    t.stage = 'stump'

    // falling top: a copy of the tree cropped to just the upper portion (the
    // part above the stump), pivoting at the cut line where it meets the stump.
    // Tree is 16 rows; stump is the bottom 5, so the top is rows 0–10 (11 rows).
    // The cut line sits at 11/16 = 0.6875 down the full frame, and on screen at
    // t.y + 9 (stump top: t.y + 24 bottom − 15px stump height).
    const dir = Math.random() < 0.5 ? -1 : 1   // 50/50 left or right
    const CUT_ROW = 11
    const cutFrac = CUT_ROW / 16
    const falling = this.add.sprite(t.x, t.y + 9, 'cottonwood')
      .setScale(3)
      .setOrigin(0.5, cutFrac)        // pivot at the cut line
      .setCrop(0, 0, 12, CUT_ROW)     // show only the top 11 rows
      .setDepth(t.y + 19)             // just above the stump
    // Two phases: slide off the stump first, THEN tip over as it goes.
    this.tweens.chain({
      targets: falling,
      onComplete: () => {
        // tree's down — scatter 4 logs in a horizontal row where the top came
        // to rest. Sprites are 16px wide (8px × scale 2), so space centers ~18px
        // apart to keep them from overlapping.
        const lx = t.x + dir * 16
        const ly = t.y + 13
        const spread = [[-27, -2], [-9, 1], [9, -1], [27, 2]]
        for (const [ox, oy] of spread) {
          this.dropStack(lx + ox, ly + oy, { type: 'wood', count: 1 })
        }
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

  // Trunk footprint for a full-size cottonwood at (tx, ty). Sprite is 16px
  // tall at scale 3 (48px on screen), trunk occupies the bottom ~18px center.
  // Returns an AABB sized to the trunk only — canopy is non-blocking.
  private makeTreeTrunkObstacle(tx: number, ty: number) {
    const TRUNK_W = 12
    const TRUNK_H = 16
    // Sprite bottom edge sits at ty + 24 (16px sprite, scale 3, default origin)
    const bottomY = ty + 24
    return {
      x: tx - TRUNK_W / 2,
      y: bottomY - TRUNK_H,
      w: TRUNK_W,
      h: TRUNK_H,
      kind: 'tree' as ObstacleKind,
    }
  }

  // Base footprint for a hitching post at (px, py). Sprite is 8x8 at scale 2
  // → 16x16 on screen. Both H legs share a small base near the ground; the
  // AABB covers that base so the player can't walk through.
  private makePostObstacle(px: number, py: number) {
    const POST_W = 15
    const POST_H = 5
    // Sprite bottom edge sits at py + 8 (8px sprite tall, scale 2, default origin)
    const bottomY = py + 4
    return {
      x: px - POST_W / 2,
      y: bottomY - POST_H,
      w: POST_W,
      h: POST_H,
      kind: 'post' as ObstacleKind,
      // origin of the post this box belongs to, so it can be found and removed
      // by post position without recomputing the geometry above.
      originX: px,
      originY: py,
    }
  }

  // Half-extent used when checking whether the player's center collides.
  // Player sprite is 8×8 at scale 2 = 16×16 on screen; ~5px around center
  // is the historically-tuned tight check.
  private static PLAYER_HALF = 5

  // Is a dismount spot blocked by something the player would get stuck in?
  // Checks the same solid obstacles the player collides with (skips 'building',
  // which the player walks through) and all honses EXCEPT the one just
  // dismounted — standing beside your own horse is fine.
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

  // Mount the nearest honse within range. Returns true if a honse was mounted.
  // Shared by click-to-mount and the E key. Caller is responsible for its own
  // guards (e.g. not while holding a tool).
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

  // Dismount: tame the honse and step the player off the saddle. South is the
  // natural spot; if it's blocked by a solid obstacle, go north instead so the
  // player never lands stuck. The dismounted honse is ignored by the check —
  // standing next to your own horse is fine. Shared by click and the E key.
  dismount() {
    if (state.mounted === null) return
    const dismountedIdx = state.mounted
    const h = state.honses[dismountedIdx]
    if (h) h.tame = true
    state.mounted = null
    const south = h ? h.y + 12 : this.player.y + 14
    const north = h ? h.y - 12 : this.player.y - 14
    this.player.y = this.solidBlockedAt(this.player.x, south, dismountedIdx) ? north : south
  }

  // True if a player-sized AABB centered at (px, py) overlaps any static
  // obstacle (trees, rocks, posts) or any honse body. When called by a
  // honse's own movement code, pass that honse's index in ignoreHonseIndex
  // so she doesn't collide with herself; the call ALSO checks building
  // footprints, which the player passes through on purpose.
  private collidesAt(px: number, py: number, ignoreHonseIndex?: number): boolean {
    const half = Overworld.PLAYER_HALF
    const isHonse = ignoreHonseIndex !== undefined
    for (const o of this.obstacles) {
      if (!isHonse && o.kind === 'building') continue
      if (aabbOverlap(px, py, half, o.x, o.y, o.w, o.h)) return true
    }
    for (let i = 0; i < state.honses.length; i++) {
      if (i === ignoreHonseIndex) continue
      const b = getHonseBodyAABB(state.honses[i])
      if (aabbOverlap(px, py, half, b.x, b.y, b.w, b.h)) return true
    }
    // Taut ropes block honses (not the player — a person can duck under a rope)
    if (isHonse) {
      const ROPE_BLOCK_DIST = 6
      for (const seg of this.rope.getTautRopeLines()) {
        if (pointToSegmentDist(px, py, seg.x1, seg.y1, seg.x2, seg.y2) < ROPE_BLOCK_DIST) return true
      }
    }
    return false
  }

  // Create a static Matter rectangle matching an AABB so rope segments bounce
  // off it. Called for every world obstacle and building so the rope can't
  // pass through trees, rocks, posts, or buildings.
  private addRopeBlocker(aabb: { x: number; y: number; w: number; h: number }) {
    this.matter.add.rectangle(
      aabb.x + aabb.w / 2,
      aabb.y + aabb.h / 2,
      aabb.w,
      aabb.h,
      { isStatic: true },
    )
  }

  // Drop a stack at world position (x, y). Spawns a sprite and adds to state.
  // Dev helper: logs the final world coordinate of a player-placed item to the
  // console, so spots can be read off and hardcoded permanently into the map.
  private logPlacement(label: string, x: number, y: number) {
    console.log(`[place] ${label} @ ${Math.round(x)}, ${Math.round(y)}`)
  }

  // Creates the sprite for a dropped item and returns it. The caller owns
  // array placement and state.droppedItems — this only builds the visual and
  // its animation. `jump` true = a fresh drop, pops up then floats; false =
  // restored from a save, floats immediately. The float baseline (baseY) and
  // a per-item phase live on the sprite via data, read each frame in update().
  private spawnDroppedSprite(x: number, y: number, type: ItemType, jump: boolean): Phaser.GameObjects.Sprite {
    const sprite = this.add.sprite(x, y, ITEMS[type].sprite)
      .setScale(ITEMS[type].scale)
      .setDepth(2)
    sprite.setData('baseY', y)
    sprite.setData('bobPhase', Math.random() * Math.PI * 2)
    if (jump) {
      // not settled yet — the bob loop skips it so it can't fight the tween
      sprite.setData('settled', false)
      sprite.y = y - Overworld.DROP_JUMP_HEIGHT
      this.tweens.add({
        targets: sprite,
        y,
        duration: Overworld.DROP_JUMP_MS,
        ease: 'Bounce.easeOut',
        onComplete: () => sprite.setData('settled', true),
      })
    } else {
      sprite.setData('settled', true)
    }
    return sprite
  }

  private dropStack(x: number, y: number, stack: ItemStack) {
    state.droppedItems.push({ x, y, stack })
    this.droppedSprites.push(this.spawnDroppedSprite(x, y, stack.type, true))
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

  // Try to plant a sapling at click position. The selected hotbar slot must be
  // a sapling, and the click must be near a dirt patch. Returns true if planted.
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

  // Try to place a hitching post at click position. The selected hotbar slot
  // must be a post or cedar_post — both behave identically (collision, rope
  // catch, snap) but render with their species sprite. The spot must be
  // clear of plots, world structures, existing obstacles, and honse bodies.
  // Position snaps to POST_GRID so consecutive placements line up.
  private tryPlacePost(clickX: number, clickY: number): boolean {
    const slotIdx = state.selectedInventorySlot
    const stack = state.inventory[slotIdx]
    if (!stack || (stack.type !== 'post' && stack.type !== 'cedar_post')) return false
    const dx = clickX - this.player.x
    const dy = clickY - this.player.y
    if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return false
    const species = stack.type   // 'post' | 'cedar_post'

    const POST_GRID = 10
    const x = Math.round(clickX / POST_GRID) * POST_GRID
    const y = Math.round(clickY / POST_GRID) * POST_GRID

    // refuse if a post already occupies this exact grid cell. (Touching/
    // overlapping posts are fine — that's how fence lines interlock — but
    // stacking one directly on another is not.)
    if (this.placedPostSprites.has(`${x},${y}`)) return false



    // refuse if inside any plot footprint
    for (const v of this.plotViews) {
      if (Math.abs(x - v.x) < PLOT_SIZE / 2 && Math.abs(y - v.y) < PLOT_SIZE / 2) return false
    }
    // refuse if inside any world structure footprint (~32px square)
    for (const s of state.worldStructures) {
      if (Math.abs(x - s.x) < 32 && Math.abs(y - s.y) < 32) return false
    }
    // refuse if the post's base would overlap any existing obstacle EXCEPT
    // other posts — fence-to-fence touching is allowed on purpose so players
    // can build continuous fence lines where the H-shapes interlock visually.
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

    state.placedPosts.push({ x, y, species })
    const sprite = this.add.sprite(x, y, species).setScale(2).setDepth(y + 8)
    this.placedPostSprites.set(`${x},${y}`, sprite)
    this.obstacles.push(newObs)
    this.logPlacement(species, x, y)

    stack.count -= 1
    if (stack.count <= 0) state.inventory[slotIdx] = null
    this.registry.events.emit('inventory-changed')
    return true
  }

  private placeNonEnterable(x: number, y: number, sprite: string, scale: number) {
    this.add.sprite(x, y, sprite).setScale(scale).setDepth(y + 24)
    const obs = { x: x - 16, y: y, w: 28, h: 20, kind: 'solid' as ObstacleKind }
    this.obstacles.push(obs)
    this.addRopeBlocker(obs)
  }

  // Spawn a wild honse at a world position: state entry + sprite + shadow
  // Matter body (so rope segments physically interact with her). The single
  // source of truth for "a honse exists" — used by the twine-craft spawn and
  // available for hardcoded placements or dev tools.
  spawnHonse(x: number, y: number) {
    state.honses.push({
      x, y,
      vx: 0, vy: 0,
      facingRight: false,
      facingLockedUntil: 0,
      homeX: x, homeY: y,
      mode: 'idle', modeUntil: 0,
      tame: false,
    })
    this.honseSprites.push(
      this.add.sprite(x, y, 'honse').setScale(2).setDepth(y + 8)
    )
    this.honseBodies.push(
      this.matter.add.rectangle(x, y + 3, 30, 12, { isStatic: true })
    )
  }

  // World-creation half of placing a post: sprite + obstacle + state entry,
  // welded together (same role placeTree plays for trees). Used for hardcoded
  // startup placement; tryPlacePost handles the gameplay checks separately.
  private placePost(x: number, y: number, species: 'post' | 'cedar_post') {
    state.placedPosts.push({ x, y, species })
    const sprite = this.add.sprite(x, y, species).setScale(2).setDepth(y + 8)
    this.placedPostSprites.set(`${x},${y}`, sprite)
    this.obstacles.push(this.makePostObstacle(x, y))
  }

  // ---- ROPE THROW ----
  // All rope state and physics live in src/world/ropeController.ts. The scene
  // holds one RopeController (this.rope), calls its throw() on click, calls
  // its update() each frame, and reads getLeashAnchor() for player movement.






  // Lower-level: given a sapling stack, try planting one near (clickX, clickY).
  // Mutates the stack (count -= 1) on success but does NOT clear empty slots
  // or emit events — callers handle cleanup since the stack may live in
  // inventory or on the cursor (drag held).
  // Single source of truth for "is there a dirt patch within plant range of
  // this point?" Used by both tryPlantFromStack (to plant) and the cursor (to
  // show the plant affordance), so the cursor can never disagree with whether
  // a plant would actually succeed. Returns the matched dug spot (with its
  // index + key) or null. Pure — no side effects.
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

    state.plantedTrees.push({ x: spot.x, y: spot.y, kind: 'cottonwood', stage: 'sapling', plantedAt: Date.now() })
    const treeSprite = this.add.sprite(spot.x, spot.y, 'planted_cottonwood_sapling').setScale(2).setDepth(2)
    this.plantedTreeSprites.set(spot.key, treeSprite)
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
      if (t.stage !== 'sapling') continue   // only saplings can be dug up; mature trees are felled with an axe
      const dx = x - t.x
      const dy = y - t.y
      if (dx * dx + dy * dy >= undoSq) continue

      const key = `${t.x},${t.y}`
      const treeSprite = this.plantedTreeSprites.get(key)
      if (treeSprite) { treeSprite.destroy(); this.plantedTreeSprites.delete(key) }
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

    // existing dirt patch nearby? Two cases, in order:
    //   1. a dropped item is on/near it → bury that item, remove the patch
    //   2. empty patch → undo the dig
    for (let i = state.dugSpots.length - 1; i >= 0; i--) {
      const d = state.dugSpots[i]
      const dx = x - d.x
      const dy = y - d.y
      if (dx * dx + dy * dy >= undoSq) continue

      // case 1: bury — find the topmost dropped item near this patch.
      // Move it into state.buriedStacks and remove the patch entirely; the
      // ground looks clean again. Re-digging here will reveal it.
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
      .setDepth(3)

    // continuous dirt particles while the shovel is planted
    const DIRT_COLORS = [0x5A3D1F, 0x7A5230, 0x3D2A14, 0x8B5A2B]
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
      // if no coin was revealed, try a player-buried stack instead.
      // The stack drops on the ground at the dig site; walk over to pick up.
      if (!revealed) {
        for (let i = state.buriedStacks.length - 1; i >= 0; i--) {
          const b = state.buriedStacks[i]
          const dx = b.x - x
          const dy = b.y - y
          if (dx * dx + dy * dy > revSq) continue
          state.buriedStacks.splice(i, 1)
          state.droppedItems.push({ x, y, stack: b.stack })
          this.droppedSprites.push(this.spawnDroppedSprite(x, y, b.stack.type, true))
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

  // Burst of specks at a position. Each particle flies outward, lands, sits
  // for a moment, then snaps away (no fade — pixel game). Caller picks the
  // palette; wave (default 0) pushes each successive burst a bit farther.
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
          // snap to pixel grid and sit, then destroy
          p.setPosition(landX, landY)
          this.time.delayedCall(300, () => p.destroy())
        },
      })
    }
  }

  private spawnGoldFloat(x: number, y: number, amount: number) {
    const startY = y - 12   // start above the source so the text doesn't overlap it
    const txt = this.add.bitmapText(x, startY, 'mainSmall', `+${amount} gold`, 16)
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

  update(_t: number, dt: number) {
    const overworldVisible = this.cameras.main.visible

    // Grow planted saplings into mature trees once enough time has elapsed.
    // Duration scales with the dev time multiplier so window.speed() speeds it up.
    const growMs = Overworld.SAPLING_GROW_MS / Math.max(0.01, state.timeMultiplier)
    for (const t of state.plantedTrees) {
      if (t.stage !== 'sapling' || t.plantedAt === undefined) continue
      if (Date.now() - t.plantedAt >= growMs) this.growSapling(t)
    }

    // Spawn honses when twine is first crafted
    if (state.hasCraftedTwine && !this.honsesSpawned && state.honses.length === 0) {
      this.honsesSpawned = true
      const spawns: [number, number][] = [[2700, 2240], [2780, 2300], [2640, 2190]]
      for (const [sx, sy] of spawns) {
        this.spawnHonse(sx, sy)
      }
    }

    // step honses, then sync sprite position + depth (do this before the
    // rope update so attached ropes read the honse's new position this frame)
    updateHonses(
      state.honses,
      dt,
      (px, py, ignoreIdx) => this.collidesAt(px, py, ignoreIdx),
      (honseIdx) => this.rope.getHonseTetherAnchor(honseIdx),
      state.mounted,
      { x: this.player.x, y: this.player.y },
    )
    // A wild honse can wander out of the game area. When she does, send her
    // back to where she spawned.
    for (const h of state.honses) {
      if (h.tame) continue
      if (h.x < 8 || h.x > WORLD_PX - 8 || h.y < 8 || h.y > WORLD_PX - 8) {
        h.x = h.homeX
        h.y = h.homeY
        h.vx = 0
        h.vy = 0
      }
    }
    // if any honse is overlapping the player, shove the player out along the
    // axis of least overlap. She's a big animal and doesn't notice you.
    // Skip while mounted — the player is intentionally on top of the honse.
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
    for (let i = 0; i < state.honses.length; i++) {
      const h = state.honses[i]
      const s = this.honseSprites[i]
      if (!s) continue
      s.x = h.x
      s.y = h.y
      s.setDepth(h.y + 8)
      // sprite is authored facing LEFT, so flipX=true makes her face right
      s.setFlipX(h.facingRight)
      // sync shadow Matter body so rope segments collide with honse
      const mb = this.honseBodies[i]
      if (mb) this.matter.body.setPosition(mb, { x: h.x, y: h.y + 3 }, false)
    }

    // Float bob for settled dropped items. Visual only — pickup and depth read
    // the logical position in state, so wiggling sprite.y here is harmless.
    const bobNow = Date.now()
    for (const s of this.droppedSprites) {
      if (!s || !s.getData('settled')) continue
      const baseY = s.getData('baseY') as number
      const phase = s.getData('bobPhase') as number
      s.y = baseY + Math.sin(bobNow * Overworld.DROP_BOB_SPEED + phase) * Overworld.DROP_BOB_AMP
    }

    // update the rope controller (catch detection, anchor pinning, redraw)
    this.rope.update()


    // E key: mount the nearest honse / dismount the current one. Same actions
    // as click, context-dependent on whether already mounted. Unlike click,
    // E ignores held tools/rope — it's a dedicated key with no other meaning.
    if (overworldVisible && Phaser.Input.Keyboard.JustDown(this.eKey)) {
      if (state.mounted !== null) {
        this.dismount()
      } else {
        this.mountNearestHonse()
      }
    }

    // movement only when overworld is the active view
    if (overworldVisible && state.mounted !== null) {
      // MOUNTED: player input drives the honse; player sprite locks to saddle.
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
      // over MOUNTED_RAMP_MS while holding a direction. Reversing on either
      // axis resets the ramp — she has to slow down before going the other way.
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
      const speed = MOUNTED_SPEED_MIN + (MOUNTED_SPEED_MAX - MOUNTED_SPEED_MIN) * rampFrac
      const step = (speed * dt) / 1000
      // rope leash (hard wall, same as the player on foot): dampen outward
      // motion approaching the limit, then snap back if she slipped past.
      // Two cases while mounted:
      //   A. The honse herself is tethered (e.g. tied to a post before you
      //      mounted her) — leash anchor is her tether.
      //   B. The rider threw a rope from horseback and it caught something —
      //      leash anchor is the player-rope's other end.
      // Either way the math is the same; the honse position is what gets
      // bounded since the rider is locked to her.
      const tether = this.rope.getHonseTetherAnchor(mountedIdx) ?? (this.rope.isAttached() ? this.rope.getLeashAnchor() : null)
      if (tether && (dx !== 0 || dy !== 0)) {
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
      const nextX = Phaser.Math.Clamp(h.x + dx * step, 8, WORLD_PX - 8)
      if (!this.collidesAt(nextX, h.y, mountedIdx)) h.x = nextX
      const nextY = Phaser.Math.Clamp(h.y + dy * step, 8, WORLD_PX - 8)
      if (!this.collidesAt(h.x, nextY, mountedIdx)) h.y = nextY
      // hard cap: if somehow past leash, snap her back to the circle
      if (tether) {
        const rx = h.x - tether.x
        const ry = h.y - tether.y
        const distSq = rx * rx + ry * ry
        const maxSq = ROPE_LEASH_LENGTH * ROPE_LEASH_LENGTH
        if (distSq > maxSq) {
          const dist = Math.sqrt(distSq)
          h.x = tether.x + (rx / dist) * ROPE_LEASH_LENGTH
          h.y = tether.y + (ry / dist) * ROPE_LEASH_LENGTH
        }
      }
      // update her facing from input direction
      if (dx > 0.001) h.facingRight = true
      else if (dx < -0.001) h.facingRight = false
      // lock player sprite to the saddle
      this.player.x = h.x
      this.player.y = h.y + MOUNT_SADDLE_Y
      this.player.setDepth(h.y + 9)   // one above the honse so the rider is on top
    } else if (overworldVisible) {
      const baseSpeed = state.playerSpeedOverride ?? PLAYER_SPEED
      const buffed = Date.now() < state.speedBuffEndsAt
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
      // rope leash: when attached to a post or honse, dampen movement that
      // would increase distance from the anchor. The tangential (sideways)
      // component is left alone; only the outward radial component is scaled
      // down, smoothly going to zero as the player approaches max leash length.
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
      const nextX = Phaser.Math.Clamp(this.player.x + dx * step, 8, WORLD_PX - 8)
      if (!collidesAt(nextX, this.player.y)) this.player.x = nextX
      const nextY = Phaser.Math.Clamp(this.player.y + dy * step, 8, WORLD_PX - 8)
      if (!collidesAt(this.player.x, nextY)) this.player.y = nextY
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
      // Y-sort by feet, not center, so player passes in front of buildings
      // when their feet are below the building's bottom edge.
      this.player.setDepth(this.player.y + 8)
    }

    const now = Date.now()
    const px = this.player.x
    const py = this.player.y

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

    // pickup any dropped items the player has walked over
    if (overworldVisible && state.droppedItems.length > 0) {
      const pickSq = Overworld.PICKUP_RADIUS * Overworld.PICKUP_RADIUS
      for (let i = state.droppedItems.length - 1; i >= 0; i--) {
        const d = state.droppedItems[i]
        const dx = d.x - px
        const dy = d.y - py
        if (dx * dx + dy * dy > pickSq) continue
        const added = state.inventoryAddAnywhere(d.stack)
        if (added > 0) {
          this.registry.events.emit('inventory-changed')
        }
        if (d.stack.count <= 0) {
          // fully picked up — destroy sprite and remove from world
          state.droppedItems.splice(i, 1)
          this.droppedSprites[i]?.destroy()
          this.droppedSprites.splice(i, 1)
        }
        // if d.stack.count > 0, inventory full — leave on ground, will retry next frame
      }
    }

    // first pass: door zone check. We have to look at all plots before clearing
    // the post-exit door guard — otherwise a far-away plot's "not in zone" would
    // clear the flag while the player is still standing in the exited plot's door.
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
    if (!inAnyDoorZone) this.doorCheckBlocked = false

    // town discovery — flip the flag the first time the player wanders near a town
    if (overworldVisible) {
      for (const t of TOWNS) {
        if (state.discoveredTowns.has(t.id)) continue
        const dx = px - t.x
        const dy = py - t.y
        if (dx * dx + dy * dy < t.radius * t.radius) {
          state.discoveredTowns.add(t.id)
          this.registry.events.emit('town-discovered', t.id)
        }
      }
    }

    for (let i = 0; i < state.plots.length; i++) {
      const plot = state.plots[i]
      if (plot.built === 'empty') continue
      const def = BUILDINGS[plot.built]
      const view = this.plotViews[i]

      if (def.goldPerTick > 0) {
        // time-based ticking: how many full ticks have elapsed since lastTickAt?
        const goldTickMs = getEffectiveTickMs(def.tickMs, plot.level)
        const levelGold = def.goldPerTick * Math.pow(2, plot.level - 1)
        // keep bar label in sync with current level
        if (view.barLabel) view.barLabel.setText(`${levelGold} gold`)
        const elapsed = now - plot.lastTickAt
        const fullTicks = Math.floor(elapsed / goldTickMs)
        if (fullTicks > 0) {
          const gold = levelGold * fullTicks
          state.addGold(gold, this.registry)
          plot.lastTickAt += fullTicks * goldTickMs
          if (overworldVisible) {
            this.spawnGoldFloat(view.x, view.y - PLOT_SIZE / 2, gold)
          }
        }
        // progress bar: fraction of the current tick (always update so it stays right)
        if (view.barFill) {
          const frac = ((now - plot.lastTickAt) % goldTickMs) / goldTickMs
          view.barFill.width = BAR_W * frac
        }
      }

      // item production (mill→flour, well→water) — separate cadence from gold
      if (def.producesItem && def.itemTickMs) {
        const itemTick = getEffectiveTickMs(def.itemTickMs, plot.level)
        const cap = getStorageCap(plot.level)
        // "blocked" means we can't add to this slot: full of our own item,
        // or holding a different item the player put there.
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
    }
  }
}
