import Phaser from 'phaser'
import { COLORS } from '../colors'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from './UI'

// ---------------------------------------------------------------------------
// ShopInterior — placeholder. The shop will eventually have a shopkeeper on
// the left and a grid of unlockable purchases on the right. For now it just
// renders a "Coming soon" message so we can confirm the routing works.
// ---------------------------------------------------------------------------

export interface ShopInteriorHandle {
  onCleanup: () => void
}

export function buildShopInterior(scene: Phaser.Scene, _structureIndex: number): ShopInteriorHandle {
  const w = scene.cameras.main.width
  const h = scene.cameras.main.height
  const playAreaH = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT
  const cy = UI_BAR_HEIGHT + playAreaH / 2

  scene.add.bitmapText(w / 2, cy, 'main', 'COMING SOON', 24)
    .setOrigin(0.5, 0.5)
    .setTint(COLORS.uiText)

  return { onCleanup: () => {} }
}
