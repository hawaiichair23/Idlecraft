import Phaser from 'phaser'
import { buildBuyMenu, type BuyMenuRow, type BuyMenuHandle } from '../ui/buildBuyMenu'
import type { ItemType } from '../items/types'
import { state } from '../game/state'

interface ToolShopEntry {
  type: ItemType
  buyPrice: number
  gatedBy?: () => boolean
}

const TOOL_SHOP_ITEMS: ToolShopEntry[] = [
  { type: 'shovel', buyPrice: 100 },
  { type: 'axe', buyPrice: 500 },
  { type: 'pickaxe', buyPrice: 800 },
  { type: 'rope', buyPrice: 75, gatedBy: () => state.hasCraftedRope },
  { type: 'post', buyPrice: 50, gatedBy: () => state.hasCraftedPost },
  { type: 'bag', buyPrice: 280, gatedBy: () => state.hasCraftedBag },
  { type: 'pipe', buyPrice: 35, gatedBy: () => state.hasPipeUnlock },
  { type: 'fence_gate', buyPrice: 60, gatedBy: () => state.hasCraftedPost },
]

export type ShopInteriorHandle = BuyMenuHandle

export function buildShopInterior(scene: Phaser.Scene, _structureIndex: number): ShopInteriorHandle {
  const rows: BuyMenuRow[] = TOOL_SHOP_ITEMS
    .filter(e => !e.gatedBy || e.gatedBy())
    .map(e => ({ kind: 'item', entry: { type: e.type, buyPrice: e.buyPrice } }))
  return buildBuyMenu(scene, {
    title: 'Tool Shop',
    rows,
    palette: 'toolShop',
  })
}
