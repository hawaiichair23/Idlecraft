import Phaser from 'phaser'
import { state } from '../game/state'
import { grabbableSlots } from './hover'

// Must match the TOOL_RANGE in Overworld.ts — max distance from the player
// at which tool cursors are shown and tool actions are allowed.
const TOOL_RANGE = 150

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

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    if (scene.game.canvas) scene.game.canvas.style.cursor = 'none'

    const p = scene.input.activePointer
    this.cursor = scene.add.sprite(p.x, p.y, 'cursor')
      .setOrigin(0, 0)
      .setScale(2)
      .setDepth(CURSOR_DEPTH)

    scene.input.on('pointermove', (pt: Phaser.Input.Pointer) => {
      this.cursor.setPosition(pt.x, pt.y)
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
    // Rope-dissolve cursor — a red X over a tied rope, signalling "click to
    // dissolve." Priority: above tool cursors (so it beats rope/shovel/post),
    // but below horse riding — suppressed while mounted and while the mount
    // affordance is showing (handled by the near-honse check below, which we
    // replicate here so the honse cursor wins). Overworld only.
    {
      const interiorActiveR = this.scene.scene.manager.isActive('Interior')
      if (!interiorActiveR && state.mounted === null) {
        const overworld = this.scene.scene.manager.getScene('Overworld') as any
        const playerObj = overworld?.player as Phaser.GameObjects.Sprite | undefined
        const cam = overworld?.cameras?.main as Phaser.Cameras.Scene2D.Camera | undefined
        if (overworld?.rope && playerObj && cam) {
          // mount affordance wins: if near a honse, skip the X
          let nearHonse = false
          const MOUNT_RANGE_SQ = 40 * 40
          for (const h of state.honses) {
            const dx = h.x - playerObj.x
            const dy = h.y - playerObj.y
            if (dx * dx + dy * dy <= MOUNT_RANGE_SQ) { nearHonse = true; break }
          }
          if (!nearHonse) {
            const p = this.scene.input.activePointer
            const world = cam.getWorldPoint(p.x, p.y)
            if (overworld.rope.isNearTiedRope(world.x, world.y)) {
              this.setTexture('cursor_x', 2)
              if (this.cursor.alpha !== 1) this.cursor.setAlpha(1)
              return
            }
          }
        }
      }
    }
    // Post-destroy cursor — red X when the axe is held over a placed post,
    // matching the rope-dissolve affordance. Overworld only, not mounted.
    {
      const interiorActiveP = this.scene.scene.manager.isActive('Interior')
      if (!interiorActiveP && state.mounted === null
          && state.inventory[state.selectedInventorySlot]?.type === 'axe') {
        const overworld = this.scene.scene.manager.getScene('Overworld') as any
        const cam = overworld?.cameras?.main as Phaser.Cameras.Scene2D.Camera | undefined
        if (overworld?.isNearPost && cam) {
          const p = this.scene.input.activePointer
          const world = cam.getWorldPoint(p.x, p.y)
          if (overworld.isNearPost(world.x, world.y)) {
            this.setTexture('cursor_x', 2)
            if (this.cursor.alpha !== 1) this.cursor.setAlpha(1)
            return
          }
        }
      }
    }
    // Tool cursor — only show if the selected tool says it's usable in the
    // current scene context. Tools default to overworld-only.
    const tool = state.getSelectedTool()
    if (tool) {
      const contexts = tool.cursorContexts ?? ['overworld']
      const interiorScene = this.scene.scene.manager.getScene('Interior') as any
      const interiorActive = this.scene.scene.manager.isActive('Interior')
      const interiorData = interiorActive ? interiorScene?.getInteriorData?.() : null

      const inOverworld = !interiorActive
      const inField = !!(interiorData && interiorData.source === 'plot' && interiorData.buildingType === 'field')

      const showCursor =
        (inOverworld && contexts.includes('overworld')) ||
        (inField && contexts.includes('field'))

      if (showCursor) {
        // In the overworld, tool cursor only shows within TOOL_RANGE of the player.
        // Beyond that the cursor reverts to default — visual feedback that you can't
        // reach that far.
        if (inOverworld) {
          const overworld = this.scene.scene.manager.getScene('Overworld') as any
          const playerObj = overworld?.player as Phaser.GameObjects.Sprite | undefined
          const cam = overworld?.cameras?.main as Phaser.Cameras.Scene2D.Camera | undefined
          if (playerObj && cam) {
            const p = this.scene.input.activePointer
            const world = cam.getWorldPoint(p.x, p.y)
            const dx = world.x - playerObj.x
            const dy = world.y - playerObj.y
            if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) {
              // out of range — fall through to default cursor
            } else {
              const sel = state.inventory[state.selectedInventorySlot]
              // Sapling only shows its plant cursor when hovering a plantable
              // dirt patch — the same check planting uses, so the cursor can
              // never disagree with whether a plant would succeed. Elsewhere it
              // falls through to the default arrow.
              if (sel !== null && sel.type === 'cottonwood_sapling'
                  && !overworld.findPlantableDirtSpot(world.x, world.y)) {
                // not over a dirt patch — fall through to default cursor
              } else {
                this.setTexture(tool.sprite, tool.scale)
                const isPost = sel !== null && (sel.type === 'post' || sel.type === 'cedar_post')
                if (isPost) {
                  this.cursor.setAlpha(0.45)
                  this.snapCursorToWorldGrid(10)
                } else if (this.cursor.alpha !== 1) {
                  this.cursor.setAlpha(1)
                }
                return
              }
            }
          }
        } else {
          // Field/interior — no range limit, show tool cursor
          this.setTexture(tool.sprite, tool.scale)
          if (this.cursor.alpha !== 1) this.cursor.setAlpha(1)
          return
        }
      }
    }
    if (this.cursor.alpha !== 1) this.cursor.setAlpha(1)
    // Honse mount affordance — overworld only, no tool selected, not already
    // mounted. Cursor swaps to the honse sprite when the player is close
    // enough to mount. Distance is player-to-honse, not pointer-to-honse:
    // you have to walk up to her, not just hover.
    const interiorActive2 = this.scene.scene.manager.isActive('Interior')
    if (!interiorActive2 && state.mounted === null && state.honses.length > 0) {
      const overworld = this.scene.scene.manager.getScene('Overworld') as any
      const playerObj = overworld?.player as Phaser.GameObjects.Sprite | undefined
      if (playerObj) {
        const MOUNT_RANGE = 40
        const rangeSq = MOUNT_RANGE * MOUNT_RANGE
        for (const h of state.honses) {
          const dx = h.x - playerObj.x
          const dy = h.y - playerObj.y
          if (dx * dx + dy * dy <= rangeSq) {
            this.setTexture('honse', 1)
            return
          }
        }
      }
    }
    // hovering a registered slot frame? Slots can live in any scene (UI
    // inventory bar lives in UI; workshop/producer/modifier slots live in
    // Interior). Check the pointer against every active scene's input plugin.
    const p = this.scene.input.activePointer
    let overSlot = false
    for (const s of this.scene.scene.manager.getScenes(true)) {
      const targets = s.input.hitTestPointer(p)
      if (targets.some(t => grabbableSlots.has(t))) { overSlot = true; break }
    }
    if (overSlot) {
      this.setTexture('cursor_grab', 2)
    } else {
      this.setTexture('cursor', 2)
    }
  }

  private setTexture(key: string, scale: number) {
    if (this.cursor.texture.key === key && this.cursor.scaleX === scale) return
    this.cursor.setTexture(key).setScale(scale).setOrigin(0, 0)
  }

  // Override the cursor's screen position so it snaps to a world-space grid.
  // The Overworld camera is what defines world coords; we convert the pointer
  // from screen → world, snap, then convert the snapped world point back to
  // screen and set the cursor sprite there. Origin is centered so the cursor
  // visually lines up with where the placed sprite lands (placed sprites use
  // default center origin).
  private snapCursorToWorldGrid(gridPx: number) {
    const overworld = this.scene.scene.manager.getScene('Overworld') as any
    const cam = overworld?.cameras?.main as Phaser.Cameras.Scene2D.Camera | undefined
    if (!cam) return
    const p = this.scene.input.activePointer
    const world = cam.getWorldPoint(p.x, p.y)
    const sx = Math.round(world.x / gridPx) * gridPx
    const sy = Math.round(world.y / gridPx) * gridPx
    const screenX = (sx - cam.worldView.x) * cam.zoom + cam.x
    const screenY = (sy - cam.worldView.y) * cam.zoom + cam.y
    this.cursor.setOrigin(0.5, 0.5)
    this.cursor.setPosition(screenX, screenY)
  }
}
