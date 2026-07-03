import Phaser from 'phaser'

export function createOutlinedLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontKey: string,
  fontSize: number,
  textColor: number,
  outlineColor: number,
  outlineThickness: number = 1,
  originX: number = 0.5,
  originY: number = 1,
): Phaser.GameObjects.Container {
  const offsets: [number, number][] = []
  for (let dy = -outlineThickness; dy <= outlineThickness; dy++) {
    for (let dx = -outlineThickness; dx <= outlineThickness; dx++) {
      if (dx === 0 && dy === 0) continue
      offsets.push([dx, dy])
    }
  }
  const parts = offsets.map(([dx, dy]) =>
    scene.add.bitmapText(dx, dy, fontKey, text, fontSize)
      .setOrigin(originX, originY)
      .setTint(outlineColor)
  )
  const main = scene.add.bitmapText(0, 0, fontKey, text, fontSize)
    .setOrigin(originX, originY)
    .setTint(textColor)
  return scene.add.container(x, y, [...parts, main])
}
