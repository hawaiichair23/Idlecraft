import Phaser from 'phaser'
import { buildBuyMenu, type BuyMenuRow, type BuyMenuHandle } from '../ui/buildBuyMenu'

const MERCANTILE_ROWS: BuyMenuRow[] = [
  { kind: 'header', label: 'Storage' },
  { kind: 'item', entry: { type: 'crate', buyPrice: 35 } },
  { kind: 'item', entry: { type: 'chest', buyPrice: 70 } },
  { kind: 'item', entry: { type: 'bag', buyPrice: 180 } },
  { kind: 'item', entry: { type: 'medium_bag', buyPrice: 360 } },
  { kind: 'item', entry: { type: 'sack', buyPrice: 500 } },
  { kind: 'item', entry: { type: 'barrel', buyPrice: 6 } },
  { kind: 'header', label: 'Materials' },
  { kind: 'item', entry: { type: 'twine', buyPrice: 18 } },
  { kind: 'item', entry: { type: 'canvas', buyPrice: 48 } },
  { kind: 'header', label: 'Consumables' },
  { kind: 'item', entry: { type: 'snake_oil', buyPrice: 250 } },
  { kind: 'header', label: 'Keys' },
  { kind: 'item', entry: { type: 'silver_key', buyPrice: 800 } },
  { kind: 'item', entry: { type: 'gold_key', buyPrice: 1200 } },
]

export type MercantileInteriorHandle = BuyMenuHandle

export function buildMercantileInterior(scene: Phaser.Scene): MercantileInteriorHandle {
  return buildBuyMenu(scene, {
    title: 'Mercantile',
    rows: MERCANTILE_ROWS,
    palette: 'nursery',
  })
}
