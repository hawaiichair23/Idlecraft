import Phaser from 'phaser'
import { BUILDINGS, state, type BuiltType } from '../game/state'
import { buildBuyMenu, type BuyMenuRow, type BuyMenuHandle, type BuyMenuEntry } from '../ui/buildBuyMenu'
import type { ItemType } from '../items/types'

export interface CharterOfficeInteriorHandle extends BuyMenuHandle {}

export interface UnlockEntry {
  type: BuiltType | 'pipe'
  buyPrice: number
  sprite?: string
  name?: string
  description?: string
  isOwned?: () => boolean
  onBuy?: () => void
}

const PIPE_ENTRY: UnlockEntry = {
  type: 'pipe',
  buyPrice: 200,
  sprite: 'item_pipe',
  name: 'Pipes',
  description: 'Unlocks Pipes from the Tool Shop.',
  isOwned: () => state.hasPipeUnlock,
  onBuy: () => { state.hasPipeUnlock = true },
}

const plotUnlock = (type: BuiltType, buyPrice: number, spriteOverride?: string): UnlockEntry => ({
  type,
  buyPrice,
  sprite: spriteOverride ?? type,
  name: BUILDINGS[type].name,
  description: BUILDINGS[type].description,
  isOwned: () => state.unlockedBuildings.has(type),
  onBuy: () => { state.unlockedBuildings.add(type) },
})

const FIELD = plotUnlock('field', 300)
const STORAGE = plotUnlock('storage', 400)
const SMELTER = plotUnlock('smelter', 500)
const BLAST_FURNACE = plotUnlock('blast_furnace', 2000)

const toRow = (e: UnlockEntry): BuyMenuRow => ({
  kind: 'item',
  entry: {
    type: e.type as ItemType,
    buyPrice: e.buyPrice,
    name: e.name,
    description: e.description,
    sprite: e.sprite,
    onBuy: e.onBuy,
    isOwned: e.isOwned,
  } as BuyMenuEntry,
})

const SPAWN_ROWS: BuyMenuRow[] = [
  { kind: 'header', label: 'Plots' },
  toRow(FIELD),
  toRow(STORAGE),
  toRow(SMELTER),
  { kind: 'header', label: 'Tools' },
  toRow(PIPE_ENTRY),
]

const FW_ROWS: BuyMenuRow[] = [
  { kind: 'header', label: 'Plots' },
  toRow(FIELD),
  toRow(STORAGE),
  toRow(SMELTER),
  toRow(BLAST_FURNACE),
  { kind: 'header', label: 'Tools' },
  toRow(PIPE_ENTRY),
]

export const FW_UNLOCK_ENTRIES = FW_ROWS

export function buildCharterOfficeInterior(scene: Phaser.Scene, rows: BuyMenuRow[] = SPAWN_ROWS): CharterOfficeInteriorHandle {
  return buildBuyMenu(scene, {
    title: 'Charter Office',
    rows,
    palette: 'charterOffice',
  })
}
