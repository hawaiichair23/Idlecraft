import Phaser from 'phaser'
import { buildBuyMenu, type BuyMenuRow, type BuyMenuHandle } from '../ui/buildBuyMenu'

const GUNSMITH_ROWS: BuyMenuRow[] = [
  { kind: 'header', label: 'Firearms' },
  { kind: 'item', entry: { type: 'derringer', buyPrice: 600 } },
  { kind: 'item', entry: { type: 'colt', buyPrice: 1200 } },
  { kind: 'header', label: 'Ammo', singleLabel: 'x25', bulkLabel: 'x50' },
  { kind: 'item', entry: { type: 'colt_ammo', buyPrice: 10, singleQty: 25, bulkQty: 50 } },
]

export type GunsmithInteriorHandle = BuyMenuHandle

export function buildGunsmithInterior(scene: Phaser.Scene): GunsmithInteriorHandle {
  return buildBuyMenu(scene, {
    title: 'Gunsmith',
    rows: GUNSMITH_ROWS,
    palette: 'nursery',
  })
}
