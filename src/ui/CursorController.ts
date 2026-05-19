import Phaser from 'phaser'
import { state } from '../game/state'
import { grabbableSlots } from './hover'

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
        this.setTexture(tool.sprite, tool.scale)
        return
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
}
