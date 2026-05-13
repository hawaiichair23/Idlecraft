import Phaser from 'phaser'
import { loadSprites } from '../sprites/loader'
import { COLORS } from '../colors'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from './UI'
import { INTERIOR_BG_PATHS } from './Interior'
import { state, BUILDINGS, type BuiltType } from '../game/state'
import { ITEMS } from '../items/types'
import { generateWorld } from '../world/gen'

const WORLD_PX = 576 * 8    // 8x canvas size, so player can wander
const PLAYER_SPEED = 120

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

  constructor() {
    super('Overworld')
  }

  preload() {
    this.load.bitmapFont('main', '/minecraftbm.png', '/minecraftbm.xml')
    this.load.bitmapFont('mainSmall', '/minecraftbmsmall.png', '/minecraftbmsmall.xml')
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

        const priceTag = this.add.bitmapText(x, y, 'main', '$', 16)
          .setOrigin(0.5, 0.5)
          .setTint(COLORS.plotPriceTag)

        const view: PlotView = { x, y, priceTag, building: null, nameLabel: null, barBg: null, barFill: null, barLabel: null }
        this.plotViews.push(view)

        rect.on('pointerdown', (_p: any, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
          ev.stopPropagation()  // don't also award click-on-bg gold
          // only open the build menu if the plot is empty
          if (state.plots[plotIndex].built === 'empty') {
            this.registry.events.emit('open-build-menu', plotIndex)
          }
        })
      }
    }

    // procedural world decor — scatter cow skulls, avoiding plots and player spawn
    const exclusions = this.plotViews.map(v => ({ x: v.x, y: v.y, radius: 100 }))
    exclusions.push({ x: cx, y: cy, radius: 60 })  // also clear the spawn point
    const layout = generateWorld({ seed: 1337, worldSize: WORLD_PX, exclusions })
    for (const d of layout.decor) {
      this.add.sprite(d.x, d.y, d.type).setScale(d.scale)
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

    // when returning from Interior, put the player just below the door of the exited plot
    this.registry.events.on('interior-exited', (plotIndex: number) => {
      this.cameras.main.setVisible(true)
      const v = this.plotViews[plotIndex]
      if (!v) return
      this.player.x = v.x
      this.player.y = v.y + PLOT_SIZE / 2 + 12
    })
  }

  private enterInterior(plotIndex: number, type: BuiltType) {
    this.cameras.main.setVisible(false)
    this.scene.run('Interior', { buildingType: type, plotIndex })
    // keep the UI scene (inventory bar, drag visuals) above Interior
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

  private spawnGoldFloat(x: number, y: number, amount: number) {
    const txt = this.add.bitmapText(x, y, 'mainSmall', `+${amount} gold`, 13)
      .setOrigin(0.5, 1)
      .setTint(COLORS.uiGold)
    this.tweens.add({
      targets: txt,
      y: y - 24,
      alpha: 0,
      duration: 1500,
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

    for (let i = 0; i < state.plots.length; i++) {
      const plot = state.plots[i]
      if (plot.built === 'empty') continue
      const def = BUILDINGS[plot.built]
      const view = this.plotViews[i]

      // door zone (only while overworld is visible)
      if (overworldVisible && Math.abs(px - view.x) < 16 && Math.abs(py - view.y) < 16) {
        this.enterInterior(i, plot.built)
        return
      }

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
        const slotFull = plot.output !== null && plot.output.count >= cap
        if (slotFull) {
          // hold the timer so the next item lands immediately when slot is freed
          plot.lastItemTickAt = now
        } else {
          const elapsedI = now - plot.lastItemTickAt
          const fullItemTicks = Math.floor(elapsedI / def.itemTickMs)
          if (fullItemTicks > 0) {
            // how many can actually fit?
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
