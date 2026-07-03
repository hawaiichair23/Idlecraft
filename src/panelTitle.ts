import Phaser from 'phaser'

export const PANEL_TITLE_FONT = 'Polaris'
export const PANEL_TITLE_SIZE = 16
export const PANEL_TITLE_COLOR = 0xFFFFFF

export function addPanelTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: number = PANEL_TITLE_COLOR,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: PANEL_TITLE_FONT,
    fontSize: `${PANEL_TITLE_SIZE}px`,
    color: `#${color.toString(16).padStart(6, '0')}`,
  }).setOrigin(0.5, 0.5)
}
