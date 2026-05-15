import Phaser from 'phaser'
import { loadSprites } from '../sprites/loader'
import { COLORS } from '../colors'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from './UI'
import { INTERIOR_BG_PATHS } from './Interior'
import { state, BUILDINGS, type BuiltType } from '../game/state'
import { ITEMS } from '../items/types'
import { generateWorld } from '../world/gen'
import { WORLD_STRUCTURES, TOWNS, type WorldStructureType } from '../world/structures'
import { registerGrabbable } from '../ui/hover'

const WORLD_PX = 576 * 8    // 8x canvas size, so player can wander
// For non testing gameplay: const PLAYER_SPEED = 120
const PLAYER_SPEED = 310

const PLOT_COLS = 4
const PLOT_ROWS = 4
const PLOT_SIZE = 56
const PLOT_SPACING = 112
const PLOT_COUNT = PLOT_COLS * PLOT_ROWS

// Sprites are authored at 1px-per-pixel. We render them upscaled to fit plots.
const SPRITE_SCALE = 3   // 16px sprite → 48px on screen (fits 56px plot)
const PLAYER_SCALE = 2   // player half-size: 8px sprite → 16px on screen

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
  private plotViews: PlotView[] = []
  private worldBg!: Phaser.GameObjects.Rectangle
  // sprite for each currently-revealed buried coin, keyed by `x,y` so we can
  // destroy it on pickup. Parallel to state.revealedItems.
  private revealedSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()

  constructor() {
    super('Overworld')
  }

  preload() {
    this.load.bitmapFont('main', '/minecraftbm.png', '/minecraftbm.xml')
    this.load.bitmapFont('mainSmall', '/minecraftbmsmall.png', '/minecraftbmsmall.xml')
    // real art assets — these take priority over the generated pixel sprites
    // (loadSprites in create() skips keys that already exist)
    this.load.image('item_flour', '/flour.png')
    this.load.image('item_water', '/water.png')
    // preload all interior backgrounds up front so transitions are instant
    for (const [key, path] of Object.entries(INTERIOR_BG_PATHS)) {
      this.load.image(key, path)
    }
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
      if (state.isShovelSelected()) {
        this.tryDig(p.worldX, p.worldY)
        return
      }
      state.addGold(1, this.registry)
      this.spawnGoldFloat(p.worldX, p.worldY, 1)
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

        rect.on('pointerdown', (_p: any, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
          if (state.isShovelSelected()) return   // shovel-click is for digging only
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
    // seed buried items from the layout (only once — state survives HMR but a
    // fresh playthrough rolls a new world). Empty array means first play.
    if (state.buriedItems.length === 0 && state.revealedItems.length === 0) {
      state.buriedItems = layout.buried.map(b => ({ x: b.x, y: b.y, reward: b.reward }))
    }
    // restore any dirt patches already in state (e.g. after HMR)
    for (const d of state.dugSpots) {
      this.add.sprite(d.x, d.y, 'dirt_patch').setScale(2).setDepth(1)
    }
    // restore any revealed-but-uncollected coins
    for (const r of state.revealedItems) {
      this.spawnRevealedCoinSprite(r.x, r.y)
    }

    // fixed world structures (shop, church, ...) — render at their hardcoded positions
    for (const s of state.worldStructures) {
      const def = WORLD_STRUCTURES[s.type]
      this.add.sprite(s.x, s.y, def.sprite).setScale(def.scale)
      // shops get a mirrored copy at the same position so the building reads wider
      if (s.type === 'shop') {
        // mirror to the right, snug against the original. Sprite's right side
        // has 4px of native padding, so offset by content width not full width.
        this.add.sprite(s.x + 24, s.y, def.sprite).setScale(def.scale).setFlipX(true)
      }
    }

    // player at world center, always on the top layer of the overworld
    this.player = this.add.sprite(cx, cy, 'player').setScale(PLAYER_SCALE).setDepth(1000)

    // camera — viewport sits between the top bar and the inventory bar
    const cam = this.cameras.main
    cam.setViewport(0, UI_BAR_HEIGHT, cam.width, cam.height - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT)
    cam.startFollow(this.player)
    cam.setBounds(0, 0, WORLD_PX, WORLD_PX)

    // launch the UI scene on top
    this.scene.launch('UI')

    // input
    const kb = this.input.keyboard!
    this.wasd = kb.addKeys('W,A,S,D') as any
    this.arrows = kb.createCursorKeys()

    // listen for buy events coming back from the UI build menu
    this.registry.events.on('buy-building', (plotIndex: number, type: BuiltType) => {
      this.tryBuyAtPlot(plotIndex, type)
    })

    // when returning from Interior, put the player back exactly where they were
    // standing when they entered (saved in enterInterior).
    this.registry.events.on('interior-exited', () => {
      this.cameras.main.setVisible(true)
      if (this.preInteriorPos) {
        this.player.x = this.preInteriorPos.x
        this.player.y = this.preInteriorPos.y
        this.preInteriorPos = null
      }
      // ignore door detection until the player moves out of the current
      // door zone, so we don't immediately re-enter the building we just left.
      this.doorCheckBlocked = true
    })
  }

  private preInteriorPos: { x: number; y: number } | null = null
  // true after exiting an interior; cleared once the player walks out of any door zone.
  private doorCheckBlocked = false

  private enterPlotInterior(plotIndex: number, type: BuiltType) {
    this.preInteriorPos = { x: this.player.x, y: this.player.y }
    this.cameras.main.setVisible(false)
    this.scene.run('Interior', { source: 'plot', buildingType: type, plotIndex })
    this.scene.bringToTop('UI')
  }

  private enterWorldStructure(structureIndex: number, type: WorldStructureType) {
    this.preInteriorPos = { x: this.player.x, y: this.player.y }
    this.cameras.main.setVisible(false)
    this.scene.run('Interior', { source: 'world', buildingType: type, structureIndex })
    this.scene.bringToTop('UI')
  }

  private tryBuyAtPlot(plotIndex: number, type: BuiltType) {
    const ok = state.placeBuilding(plotIndex, type, this.registry)
    if (!ok) return
    const view = this.plotViews[plotIndex]
    view.priceTag.destroy()
    view.building = this.add.sprite(view.x, view.y, type).setScale(SPRITE_SCALE)

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

  private tryDig(clickX: number, clickY: number) {
    if (this.digInProgress) return   // one dig at a time
    const x = clickX + Overworld.DIG_OFFSET_X
    const y = clickY + Overworld.DIG_OFFSET_Y
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
    let wave = 0
    const particleTimer = this.time.addEvent({
      delay: 400,   // big burst every 0.4s while planted
      loop: true,
      callback: () => this.spawnDirtParticles(x, y, wave++),
    })

    this.time.delayedCall(Overworld.DIG_DURATION_MS, () => {
      particleTimer.remove(false)
      planted.destroy()
      state.dugSpots.push({ x, y })
      this.add.sprite(x, y, 'dirt_patch').setScale(2).setDepth(1)

      // reveal AT MOST one buried item within reveal radius
      const revSq = Overworld.DIG_REVEAL_RADIUS * Overworld.DIG_REVEAL_RADIUS
      for (let i = state.buriedItems.length - 1; i >= 0; i--) {
        const b = state.buriedItems[i]
        const dx = b.x - x
        const dy = b.y - y
        if (dx * dx + dy * dy > revSq) continue
        state.buriedItems.splice(i, 1)
        const placed = { x, y, reward: b.reward }
        state.revealedItems.push(placed)
        this.spawnRevealedCoinSprite(placed.x, placed.y)
        break
      }
      this.digInProgress = false
    })
  }

  private spawnRevealedCoinSprite(x: number, y: number) {
    const sprite = this.add.sprite(x, y, 'gold_coin').setScale(2).setDepth(2)
    this.revealedSprites.set(`${x},${y}`, sprite)
  }

  // Burst of brown specks at a dig position. Each particle flies outward,
  // lands, sits for a moment, then snaps away (no fade — pixel game).
  private spawnDirtParticles(x: number, y: number, wave: number) {
    const PARTICLE_COUNT = 12
    const COLORS_DIRT = [0x5A3D1F, 0x7A5230, 0x3D2A14, 0x8B5A2B]
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI / 6) + Math.random() * (Math.PI * 2 / 3)
      const speed = 12 + Math.random() * 10 + wave * 3   // each wave a bit farther
      const dx = Math.cos(angle) * speed
      const dy = -Math.sin(angle) * speed
      const color = COLORS_DIRT[Math.floor(Math.random() * COLORS_DIRT.length)]
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

    // movement only when overworld is the active view
    if (overworldVisible) {
      const step = (PLAYER_SPEED * dt) / 1000
      let dx = 0
      let dy = 0
      if (this.wasd.A.isDown || this.arrows.left!.isDown) dx -= 1
      if (this.wasd.D.isDown || this.arrows.right!.isDown) dx += 1
      if (this.wasd.W.isDown || this.arrows.up!.isDown) dy -= 1
      if (this.wasd.S.isDown || this.arrows.down!.isDown) dy += 1
      if (dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2 }
      this.player.x = Phaser.Math.Clamp(this.player.x + dx * step, 8, WORLD_PX - 8)
      this.player.y = Phaser.Math.Clamp(this.player.y + dy * step, 8, WORLD_PX - 8)
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
        s.type === 'shop'
          ? (px - s.x) >= -16 && (px - s.x) <= 52 && Math.abs(py - s.y) < 16
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
        const elapsed = now - plot.lastTickAt
        const fullTicks = Math.floor(elapsed / def.tickMs)
        if (fullTicks > 0) {
          state.addGold(def.goldPerTick * fullTicks, this.registry)
          plot.lastTickAt += fullTicks * def.tickMs
          if (overworldVisible) {
            this.spawnGoldFloat(view.x, view.y - PLOT_SIZE / 2, def.goldPerTick * fullTicks)
          }
        }
        // progress bar: fraction of the current tick (always update so it stays right)
        if (view.barFill) {
          const frac = ((now - plot.lastTickAt) % def.tickMs) / def.tickMs
          view.barFill.width = BAR_W * frac
        }
      }

      // item production (mill→flour, well→water) — separate cadence from gold
      if (def.producesItem && def.itemTickMs) {
        const cap = ITEMS[def.producesItem].maxStack
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
          const fullItemTicks = Math.floor(elapsedI / def.itemTickMs)
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
            plot.lastItemTickAt += fullItemTicks * def.itemTickMs
          }
        }
      }
    }
  }
}
