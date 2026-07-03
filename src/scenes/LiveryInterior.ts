import Phaser from 'phaser'
import { buildBuyMenu, type BuyMenuRow, type BuyMenuHandle } from '../ui/buildBuyMenu'

const LIVERY_ROWS: BuyMenuRow[] = [
  { kind: 'header', label: 'Equipment' },
  { kind: 'item', entry: { type: 'saddle', buyPrice: 800 } },
  { kind: 'item', entry: { type: 'quirt', buyPrice: 200 } },
  { kind: 'item', entry: { type: 'rope', buyPrice: 25 } },
  { kind: 'header', label: 'Consumables' },
  { kind: 'item', entry: { type: 'hay', buyPrice: 8 } },
  { kind: 'item', entry: { type: 'water', buyPrice: 5 } },
]

export type LiveryInteriorHandle = BuyMenuHandle

export function buildLiveryInterior(scene: Phaser.Scene): LiveryInteriorHandle {
  return buildBuyMenu(scene, {
    title: 'Livery',
    rows: LIVERY_ROWS,
    palette: 'nursery',
  })
}
