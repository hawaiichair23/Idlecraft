import Phaser from 'phaser'
import { ALL_SPRITES, type Sprite } from './data'

// Build each sprite by drawing pixels into a Graphics object, then bake it into
// a real texture via generateTexture. Avoids the DynamicTexture y-flip pitfall.
export function spriteToTexture(scene: Phaser.Scene, key: string, sprite: Sprite) {
  if (scene.textures.exists(key)) return  // HMR safety

  const h = sprite.length
  const w = sprite[0].length

  const g = scene.add.graphics().setVisible(false)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const color = sprite[y][x]
      if (!color) continue
      g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1)
      g.fillRect(x, y, 1, 1)
    }
  }
  g.generateTexture(key, w, h)
  g.destroy()
}

export function loadSprites(scene: Phaser.Scene) {
  for (const [key, sprite] of Object.entries(ALL_SPRITES)) {
    spriteToTexture(scene, key, sprite)
  }
}

