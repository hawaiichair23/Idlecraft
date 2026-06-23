import Phaser from 'phaser'
import { state, WOOD_TILE, Terrain } from '../game/state'
import { grabbableSlots, grabHover, rejectHover } from './hover'
import { ACTION_CURSOR, resolveAction, type ItemAction, type WorldContext, TOOL_RANGE } from '../game/ItemActionController'


// Gold tint for the white arrow/grab cursor art (matches the old baked-in gold,
// #D4A017). Cleared to leave the cursor white over grass.
const Overworld_CURSOR_GOLD = 0xD4A017

// Max distance for crate cursors (placeable + open grab). Must match
// CRATE_RANGE in Overworld.ts so the cursor never disagrees with whether a
// crate action would actually succeed.
const CRATE_RANGE = 75

// Custom cursor — renders a sprite at the pointer position so the game has
// a pixel-art cursor instead of the OS one. Three states:
//   - default: gold arrow
//   - grab: open hand, shown when hovering an interactive object
//   - tool: tool sprite (shovel for now), shown when a tool is the selected
//     hotbar item. Overrides grab.
//
// Lives in the UI scene because UI is always rendered on top.

const CURSOR_DEPTH = 99999

export class CursorController {
  private scene: Phaser.Scene
  private cursor: Phaser.GameObjects.Sprite
  private quirtExtras: Phaser.GameObjects.Sprite[] = []
  private bulletStrip: Phaser.GameObjects.Sprite
  private axeSwinging = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    if (scene.game.canvas) scene.game.canvas.style.cursor = 'none'

    const p = scene.input.activePointer
    this.cursor = scene.add.sprite(p.x, p.y, 'cursor')
      .setOrigin(0, 0)
      .setScale(2)
      .setDepth(CURSOR_DEPTH)

    for (let i = 0; i < 2; i++) {
      this.quirtExtras.push(
        scene.add.sprite(p.x, p.y, 'item_quirt')
          .setOrigin(0.5, 0.5)
          .setDepth(CURSOR_DEPTH)
          .setVisible(false)
      )
    }

    this.bulletStrip = scene.add.sprite(p.x, p.y, 'bullets_5')
      .setOrigin(0.5, 0)
      .setDepth(CURSOR_DEPTH)
      .setVisible(false)

    scene.input.on('pointermove', (pt: Phaser.Input.Pointer) => {
      // Clicks resolve through the Overworld camera (p.worldX/worldY), which is
      // zoomed (1.08) and scrolling — so raw screen pt.x/pt.y puts the cursor
      // picture off from where a click actually lands. Convert the pointer's
      // world point back to screen with the same transform the snap path uses,
      // so the cursor sits exactly on the true click point at any zoom.
      // Only in the Overworld: interiors render in plain screen space, so
      // applying the Overworld camera transform there would offset the picture.
      const interiorActive = this.scene.scene.manager.isActive('Interior')
      const overworld = this.scene.scene.manager.getScene('Overworld') as any
      const cam = !interiorActive ? (overworld?.cameras?.main as Phaser.Cameras.Scene2D.Camera | undefined) : undefined
      if (cam) {
        const world = cam.getWorldPoint(pt.x, pt.y)
        const screenX = (world.x - cam.worldView.x) * cam.zoom + cam.x
        const screenY = (world.y - cam.worldView.y) * cam.zoom + cam.y
        this.cursor.setPosition(screenX, screenY)
      } else {
        this.cursor.setPosition(pt.x, pt.y)
      }
    })
  }

  // Called each frame from UI.update(). Picks the right cursor texture based
  // on (tool selected) > (hovering interactive) > (default).
  // Also re-asserts cursor: none on the canvas in case Phaser's scene
  // transitions or hover handlers reset it.
  refresh() {
    if (this.scene.game.canvas && this.scene.game.canvas.style.cursor !== 'none') {
      this.scene.game.canvas.style.cursor = 'none'
    }
    for (const e of this.quirtExtras) if (e.visible) e.setVisible(false)
    if (this.bulletStrip.visible) this.bulletStrip.setVisible(false)
    if (this.cursor.alpha !== 1) this.cursor.setAlpha(1)
    // clear any tint left from a previous frame (e.g. the mount cursor's coat
    // color); re-applied below only when hovering a honse.
    if (this.cursor.tintTopLeft !== 0xffffff) this.cursor.clearTint()
    // Default the cursor upright every frame; the tool-sprite branch below
    // re-applies the swing rotation only when an actual tool cursor is shown.
    if (this.cursor.rotation !== 0) this.cursor.setRotation(0)



    // ---- Overworld action resolver ----
    // One call to resolveOverworldAction decides both "what cursor to show"
    // and "what a click here would do." No separate cursor blocks needed.
    const interiorActive = this.scene.scene.manager.isActive('Interior')
    const ui = this.scene as any
    const uiPanelOpen = !!(ui.openCrateContents || ui.upperInvOpen || ui.menuContainer?.visible)
    if (!interiorActive && !uiPanelOpen) {
      const p = this.scene.input.activePointer
      let overGrabbable = grabHover.active
      if (!overGrabbable) {
        for (const s of this.scene.scene.manager.getScenes(true)) {
          if (overGrabbable) break
          const targets = s.input.hitTestPointer(p)
          if (targets.some(t => grabbableSlots.has(t))) { overGrabbable = true; break }
        }
      }
      const overworld = this.scene.scene.manager.getScene('Overworld') as any
      const playerObj = overworld?.player as Phaser.GameObjects.Sprite | undefined
      const cam = overworld?.cameras?.main as Phaser.Cameras.Scene2D.Camera | undefined

      // Resolve the overworld action once, up front, so a held tool's action can
      // take precedence over the generic grab cursor. A built plot is a
      // registered grabbable, so without this an axe/pickaxe hover over it would
      // show the grab cursor and never the destroy (red-X) cursor.
      let action: ItemAction | null = null
      if (overworld?.resolveOverworldAction && playerObj && cam) {
        const world = cam.getWorldPoint(p.x, p.y)
        action = overworld.resolveOverworldAction(world.x, world.y)
      }

      // The grab cursor yields ONLY to a destroy action (the red-X kinds) —
      // otherwise a grabbable world object (e.g. a built plot) would mask its
      // own destroy cursor when an axe/pickaxe is held over it. Every other
      // action still defers to the grab hand, as before.
      const destroyEntry = action ? ACTION_CURSOR[action.kind] : null
      const isDestroyAction = !!destroyEntry && destroyEntry !== 'tool' && destroyEntry.texture === 'cursor_x'
      if (overGrabbable && !isDestroyAction) {
        this.setTexture('cursor_grab', 2)
        this.applyArrowTerrainTint()
        return
      }

      if (cam) {
        if (action) {
          const entry = ACTION_CURSOR[action.kind]
          if (entry === 'tool') {
            // tool-sprite cursor: use the sprite/scale carried in the action
            const a = action as { sprite: string; scale: number }
            const zoomedScale = a.scale * (cam?.zoom ?? 1)
            this.setTexture(a.sprite, zoomedScale)
            // The swing rotation only applies to the actual tool sprite, never the
            // plain pointer — so an out-of-range click can't tilt the arrow.
            const wantRot = this.axeSwinging ? -Math.PI / 2 : 0
            if (this.cursor.rotation !== wantRot) this.cursor.setRotation(wantRot)
            // posts get ghost-alpha + grid snap
            if (action.kind === 'place-post') {
              if (overworld.isPostDragging()) return
              this.cursor.setAlpha(0.65)
              // match spawnPostSprite: iron post art draws 2px up so its base
              // lines up with wood posts. Preview must mirror that nudge.
              const nudgeY = a.sprite === 'item_iron_post' ? -2 : 0
              const isWall = state.inventory[state.selectedInventorySlot]?.type === 'wood_wall'
              const snapped = this.snapCursorToWorldGrid(isWall ? 24 : 10, undefined, undefined, nudgeY)
              // swap ghost to the vertical world sprite when a vertical neighbor
              // is detected, so the preview matches what actually gets planted.
              if (snapped) {
                const tex = overworld.previewPostTexture(snapped.x, snapped.y)
                if (tex) this.setTexture(tex, zoomedScale)
              }
            }
            if (action.kind === 'place-plank') {
              this.cursor.setAlpha(0.65)
              this.snapCursorToWorldGrid(WOOD_TILE, state.worldBounds.minX, state.worldBounds.minY)
            }
            if (action.kind === 'place-water') {
              this.cursor.setAlpha(0.65)
              this.snapCursorToWorldGrid(WOOD_TILE, state.worldBounds.minX, state.worldBounds.minY)
            }
            if (action.kind === 'place-gate') {
              this.cursor.setAlpha(0.65)
              this.snapCursorToWorldGrid(10)
            }
            // mount/dismount cursor wears the honse's coat color (null = special
            // untinted coat, leave the sprite's native colors)
            if ((action.kind === 'mount' || action.kind === 'dismount') && action.tint !== null) {
              this.cursor.setTint(action.tint)
            }
            if (action.kind === 'quirt') {
              const step = this.cursor.displayWidth
              for (let i = 0; i < this.quirtExtras.length; i++) {
                const e = this.quirtExtras[i]
                if (i < action.gear) {
                  e.setScale(zoomedScale)
                    .setPosition(this.cursor.x + step * (i + 1), this.cursor.y)
                    .setVisible(true)
                } else {
                  e.setVisible(false)
                }
              }
            }
            if (action.kind === 'aim' && (action as any).bullets) {
              this.bulletStrip.setTexture((action as any).bullets)
                .setScale(zoomedScale)
                .setPosition(this.cursor.x, this.cursor.y + this.cursor.displayHeight / 2 + zoomedScale)
                .setVisible(true)
            }
          } else {
            this.setTexture(entry.texture, entry.scale)
            // The grab-cursor sprite is white art designed to be tinted by the
            // grass/non-grass rule (clearTint over grass, gold otherwise). Other
            // entry textures (cursor_x, etc.) have native colors — skip tinting.
            if (entry.texture === 'cursor_grab') this.applyArrowTerrainTint()
          }
          return
        }
      }
    } else {
      const interiorScene = this.scene.scene.manager.getScene('Interior') as any
      const interiorData = interiorScene?.getInteriorData?.()
      const walkableCtx: WorldContext | null = interiorScene?.walkableCtx ?? null

      if (walkableCtx && !uiPanelOpen) {
        const p = this.scene.input.activePointer
        const drag = (this.scene as any).getDragController?.()
        const action = resolveAction(walkableCtx, p.x, p.y, drag?.isHolding() ?? false)
        if (action) {
          const entry = ACTION_CURSOR[action.kind]
          if (entry === 'tool') {
            const a = action as { sprite: string; scale: number }
            this.setTexture(a.sprite, a.scale)
            const wantRot = this.axeSwinging ? -Math.PI / 2 : 0
            if (this.cursor.rotation !== wantRot) this.cursor.setRotation(wantRot)
            if (action.kind === 'aim' && (action as any).bullets) {
              this.bulletStrip.setTexture((action as any).bullets)
                .setScale(a.scale)
                .setPosition(this.cursor.x, this.cursor.y + this.cursor.displayHeight / 2 + a.scale)
                .setVisible(true)
            }
          } else {
            this.setTexture(entry.texture, entry.scale)
            if (entry.texture === 'cursor_grab') this.applyArrowTerrainTint()
          }
          return
        }
      }

      const tool = state.getSelectedTool()
      if (tool) {
        const inField = !!(interiorData && interiorData.source === 'plot' && interiorData.buildingType === 'field')
        const contexts = tool.cursorContexts ?? ['overworld']
        if (inField && contexts.includes('field')) {
          this.setTexture(tool.sprite, tool.scale)
          return
        }
      }
    }

    // ---- UI slot hover (grab cursor) ----
    const p = this.scene.input.activePointer
    if (rejectHover.active) {
      this.setTexture('cursor_x', 2)
      return
    }
    // When a UI panel is open (build menu, crate, inventory), only the UI
    // scene's own slots may show the grab cursor — world objects (plots,
    // crates) sit behind the panel and must not be hit-tested through it.
    let overSlot = grabHover.active
    const scenes = uiPanelOpen ? [this.scene] : this.scene.scene.manager.getScenes(true)
    for (const s of scenes) {
      if (overSlot) break
      const targets = s.input.hitTestPointer(p)
      if (targets.some(t => grabbableSlots.has(t))) { overSlot = true; break }
    }
    if (overSlot) {
      this.setTexture('cursor_grab', 2)
      this.applyArrowTerrainTint()
    } else {
      this.setTexture('cursor', 2)
      this.applyArrowTerrainTint()
    }
  }

  // The arrow/grab cursor art is white so it can be tinted per terrain: gold on
  // most ground (reads on the cream sand), left white over grass (reads on
  // green). One terrain lookup per frame; tint only changes on a class flip.
  private applyArrowTerrainTint() {
    // The terrain tint is an overworld concept — it samples the overworld grid
    // through the overworld camera. Inside an interior that sample is the world
    // terrain under the building (e.g. grass beneath a long house), which would
    // wrongly whiten the cursor. Interiors always use the plain gold arrow.
    if (this.scene.scene.manager.isActive('Interior')) { this.cursor.setTint(Overworld_CURSOR_GOLD); return }
    const overworld = this.scene.scene.manager.getScene('Overworld') as any
    const cam = overworld?.cameras?.main as Phaser.Cameras.Scene2D.Camera | undefined
    if (!cam) { this.cursor.setTint(Overworld_CURSOR_GOLD); return }
    const p = this.scene.input.activePointer
    const w = cam.getWorldPoint(p.x, p.y)
    if (state.terrainAt(w.x, w.y) === Terrain.Grass) this.cursor.clearTint()
    else this.cursor.setTint(Overworld_CURSOR_GOLD)
  }

  setAxeSwung(swung: boolean) {
    this.axeSwinging = swung
  }


  private setTexture(key: string, scale: number) {
    if (this.cursor.texture.key === key && this.cursor.scaleX === scale) return
    // Anchor each cursor at its meaningful "hot point" so the picture lands on
    // the true pointer position:
    //   - default arrow ('cursor'): tip at top-left → (0, 0)
    //   - grab hand ('cursor_grab'): the pointing fingertip is at the top, ~1.5
    //     of 8px across → (0.19, 0), NOT the sprite center (which threw clicks
    //     up-and-left of where the finger pointed)
    //   - everything else (X, held items, honse): centered crosshair → (0.5, 0.5)
    let ox = 0.5, oy = 0.5
    if (key === 'cursor') { ox = 0; oy = 0 }
    else if (key === 'cursor_grab') { ox = 0.19; oy = 0 }
    this.cursor.setTexture(key).setScale(scale).setOrigin(ox, oy)
  }

  // Override the cursor's screen position so it snaps to a world-space grid.
  // The Overworld camera is what defines world coords; we convert the pointer
  // from screen → world, snap, then convert the snapped world point back to
  // screen and set the cursor sprite there. Origin is centered so the cursor
  // visually lines up with where the placed sprite lands (placed sprites use
  // default center origin).
  private snapCursorToWorldGrid(gridPx: number, offsetX?: number, offsetY?: number, nudgeY = 0) {
    const overworld = this.scene.scene.manager.getScene('Overworld') as any
    const cam = overworld?.cameras?.main as Phaser.Cameras.Scene2D.Camera | undefined
    if (!cam) return
    const p = this.scene.input.activePointer
    const world = cam.getWorldPoint(p.x, p.y)
    let sx: number, sy: number
    if (offsetX !== undefined && offsetY !== undefined) {
      sx = Math.floor((world.x - offsetX) / gridPx) * gridPx + offsetX + gridPx / 2
      sy = Math.floor((world.y - offsetY) / gridPx) * gridPx + offsetY + gridPx / 2
    } else {
      sx = Math.round(world.x / gridPx) * gridPx
      sy = Math.round(world.y / gridPx) * gridPx
    }
    const screenX = (sx - cam.worldView.x) * cam.zoom + cam.x
    const screenY = (sy + nudgeY - cam.worldView.y) * cam.zoom + cam.y
    this.cursor.setOrigin(0.5, 0.5)
    this.cursor.setPosition(screenX, screenY)
    return { x: sx, y: sy }
  }
}
