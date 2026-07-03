import Phaser from 'phaser'
import { buildBuyMenu, type BuyMenuRow, type BuyMenuHandle } from '../ui/buildBuyMenu'

const NURSERY_ROWS: BuyMenuRow[] = [
  { kind: 'item', entry: { type: 'hemp_seed', buyPrice: 10 } },
  { kind: 'item', entry: { type: 'cottonwood_sapling', buyPrice: 30 } },
]

export type NurseryInteriorHandle = BuyMenuHandle

export function buildNurseryInterior(scene: Phaser.Scene): NurseryInteriorHandle {
  return buildBuyMenu(scene, {
    title: 'Nursery',
    rows: NURSERY_ROWS,
    palette: 'nursery',
  })
}
