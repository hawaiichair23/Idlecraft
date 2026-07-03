import Phaser from 'phaser'
import { buildBuyMenu, type BuyMenuRow, type BuyMenuHandle } from '../ui/buildBuyMenu'

const TANNER_ROWS: BuyMenuRow[] = [
  { kind: 'item', entry: { type: 'leather', buyPrice: 35 } },
]

export type TannerInteriorHandle = BuyMenuHandle

export function buildTannerInterior(scene: Phaser.Scene): TannerInteriorHandle {
  return buildBuyMenu(scene, {
    title: 'Tanner',
    rows: TANNER_ROWS,
    palette: 'nursery',
  })
}
