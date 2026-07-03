import Phaser from 'phaser'
import { buildBuyMenu, type BuyMenuRow, type BuyMenuHandle } from '../ui/buildBuyMenu'

const LAND_OFFICE_ROWS: BuyMenuRow[] = [
  { kind: 'header', label: 'Las Salinas' },
  { kind: 'item', entry: { type: 'quarter_deed', buyPrice: 8000 } },
  { kind: 'item', entry: { type: 'modest_deed',  buyPrice: 16000 } },
  { kind: 'item', entry: { type: 'proper_deed',  buyPrice: 32000 } },
  { kind: 'item', entry: { type: 'grand_deed',   buyPrice: 64000 } },
  { kind: 'header', label: 'Fort Worth' },
  { kind: 'item', entry: { type: 'fw_quarter_deed', buyPrice: 20000 } },
  { kind: 'item', entry: { type: 'fw_modest_deed',  buyPrice: 40000 } },
  { kind: 'item', entry: { type: 'fw_proper_deed',  buyPrice: 80000 } },
  { kind: 'item', entry: { type: 'fw_grand_deed',   buyPrice: 160000 } },
]

export type LandOfficeInteriorHandle = BuyMenuHandle

export function buildLandOfficeInterior(scene: Phaser.Scene): LandOfficeInteriorHandle {
  return buildBuyMenu(scene, {
    title: 'Land Office',
    rows: LAND_OFFICE_ROWS,
    palette: 'landOffice',
  })
}
