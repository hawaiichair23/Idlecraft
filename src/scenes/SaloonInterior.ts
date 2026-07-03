import Phaser from 'phaser'
import { buildBuyMenu, type BuyMenuRow, type BuyMenuHandle } from '../ui/buildBuyMenu'

export type SaloonInteriorHandle = BuyMenuHandle

export function buildSaloonInterior(scene: Phaser.Scene): SaloonInteriorHandle {
  let bought = false
  const rows: BuyMenuRow[] = [
    {
      kind: 'item',
      entry: {
        type: 'widower',
        buyPrice: 5000,
        isOwned: () => bought,
        afterBuy: () => { bought = true },
      },
    },
  ]
  return buildBuyMenu(scene, {
    title: 'Saloon',
    rows,
    palette: 'saloon',
  })
}
