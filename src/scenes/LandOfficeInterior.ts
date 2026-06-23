// LandOfficeInterior.ts — interior of the Land Office.
// Sells plot-type unlocks. Walking in shows the room backdrop plus a panel
// listing the unlock options (Field, future stable/etc).
//
// Buying adds the building type to state.unlockedBuildings — the build menu
// re-reads this each time it opens, so newly-unlocked buildings appear next
// time the player clicks an empty plot.

import Phaser from 'phaser'
import { COLORS, FONT } from '../colors'
import { BUILDINGS, state, type BuiltType } from '../game/state'
import { attachSlotHover } from '../ui/hover'
import { buildInteriorBackdrop, INTERIOR_PALETTES } from './InteriorBackdrop'

export interface LandOfficeInteriorHandle {
  onCleanup: () => void
}

// Plot-type unlocks the Land Office sells. Order = display order.
interface UnlockEntry {
  type: BuiltType | 'pipe'
  buyPrice: number
  sprite?: string
  name?: string
  description?: string
  isOwned?: () => boolean
  onBuy?: () => void
}
const UNLOCK_ENTRIES: UnlockEntry[] = [
  {
    type: 'pipe',
    buyPrice: 200,
    sprite: 'item_pipe',
    name: 'Pipes',
    description: 'Unlocks Pipes from the Tool Shop.',
    isOwned: () => state.hasPipeUnlock,
    onBuy: () => { state.hasPipeUnlock = true },
  },
  { type: 'field', buyPrice: 300 },
  { type: 'storage', buyPrice: 400 },
  { type: 'smithy', buyPrice: 500 },
]

// Interior palette is now defined in InteriorBackdrop.ts INTERIOR_PALETTES.

export function buildLandOfficeInterior(scene: Phaser.Scene): LandOfficeInteriorHandle {
  // ---- backdrop (wall, windows, floor, side walls) ----
  buildInteriorBackdrop(scene, INTERIOR_PALETTES.landOffice)

  // ---- panel layout (same shape as build menu / shop) ----
  const w = scene.cameras.main.width
  const h = scene.cameras.main.height

  const ICON_W = 48
  const NAME_W = 330
  const COST_W = 48
  const GAP = 4
  const ROW_H = 48
  const ROW_GAP = 8
  const PANEL_PAD_X = 24
  const PANEL_PAD_Y = 24
  const TITLE_BAND = 36
  const ROW_W = ICON_W + GAP + NAME_W + GAP + COST_W
  const rowStackH = UNLOCK_ENTRIES.length * ROW_H + Math.max(0, UNLOCK_ENTRIES.length - 1) * ROW_GAP
  const PANEL_W = ROW_W + PANEL_PAD_X * 2
  const PANEL_H = TITLE_BAND + rowStackH + PANEL_PAD_Y * 2

  const panelX = w / 2
  const panelY = h / 2

  // panel background — same nineslice as build menu, with interior tint
  scene.add.nineslice(panelX, panelY, 'menu-bg', undefined, PANEL_W, PANEL_H, 16, 16, 16, 16)
    .setTint(COLORS.interiorPanel)
    .setDepth(100)

  // title
  const topRowY = panelY - rowStackH / 2 + ROW_H / 2
  scene.add.bitmapText(panelX, topRowY - ROW_H / 2 - 18, 'main', 'Land Office', FONT.title)
    .setOrigin(0.5, 0.5)
    .setTint(COLORS.uiText)
    .setDepth(101)

  const iconX = panelX - ROW_W / 2 + ICON_W / 2
  const nameX = iconX + ICON_W / 2 + GAP + NAME_W / 2
  const costX = nameX + NAME_W / 2 + GAP + COST_W / 2

  // text refs for affordability / unlocked-state re-tinting
  interface RowRefs {
    entry: UnlockEntry
    label: Phaser.GameObjects.BitmapText
    desc: Phaser.GameObjects.BitmapText
    cost: Phaser.GameObjects.BitmapText
  }
  const rowRefs: RowRefs[] = []

  const refresh = () => {
    const gold = (scene.registry.get('gold') as number | undefined) ?? 0
    for (const r of rowRefs) {
      const owned = r.entry.isOwned ? r.entry.isOwned() : state.unlockedBuildings.has(r.entry.type as BuiltType)
      const affordable = gold >= r.entry.buyPrice
      const tint = owned ? COLORS.menuDisabled
        : affordable ? COLORS.uiText
        : COLORS.menuDisabled
      r.label.setTint(tint)
      r.desc.setTint(tint)
      r.cost.setTint(tint)
      r.cost.setText(owned ? 'owned' : `${r.entry.buyPrice}`)
    }
  }

  UNLOCK_ENTRIES.forEach((entry, i) => {
    const buildingDef = (entry.type !== 'pipe') ? BUILDINGS[entry.type as BuiltType] : null
    const spriteName = entry.sprite ?? entry.type
    const displayName = entry.name ?? (buildingDef ? buildingDef.name : entry.type)
    const displayDesc = entry.description ?? (buildingDef ? buildingDef.description : '')
    const rowY = topRowY + i * (ROW_H + ROW_GAP)

    const iconSlot = scene.add.image(iconX, rowY, 'menu-slot').setInteractive().setDepth(101)
    const nameSlot = scene.add.image(nameX, rowY, 'menu-longslot').setInteractive().setDepth(101)
    const costSlot = scene.add.image(costX, rowY, 'menu-slot').setInteractive().setDepth(101)
    attachSlotHover(scene, iconSlot, iconX, rowY, ICON_W, ROW_H)
    attachSlotHover(scene, nameSlot, nameX, rowY, NAME_W, ROW_H)
    attachSlotHover(scene, costSlot, costX, rowY, COST_W, ROW_H)

    scene.add.sprite(iconX, rowY, spriteName).setScale(2).setDepth(102)

    const labelX = nameX - NAME_W / 2 + 12
    const label = scene.add.bitmapText(labelX, rowY - 8, 'main', displayName, FONT.name)
      .setOrigin(0, 0.5)
      .setTint(COLORS.uiText)
      .setDepth(102)
    const desc = scene.add.bitmapText(labelX, rowY + 10, 'mainSmall', displayDesc, FONT.desc)
      .setOrigin(0, 0.5)
      .setTint(COLORS.uiText)
      .setDepth(102)

    // cost number + coin
    const cost = scene.add.bitmapText(costX - 6, rowY + 3, 'main', `${entry.buyPrice}`, FONT.cost)
      .setOrigin(0.5, 0.5)
      .setTint(COLORS.uiText)
      .setDepth(102)
    scene.add.sprite(costX + 12, rowY, 'gold_coin').setScale(2).setDepth(102)

    rowRefs.push({ entry, label, desc, cost })

    const onClick = (p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
      if (!p.leftButtonDown()) return
      ev.stopPropagation()
      const owned = entry.isOwned ? entry.isOwned() : state.unlockedBuildings.has(entry.type as BuiltType)
      if (owned) return
      const gold = (scene.registry.get('gold') as number | undefined) ?? 0
      if (gold < entry.buyPrice) return
      if (!state.trySpend(entry.buyPrice, scene.registry)) return
      if (entry.onBuy) entry.onBuy()
      else state.unlockedBuildings.add(entry.type as BuiltType)
      refresh()
    }
    iconSlot.on('pointerdown', onClick)
    nameSlot.on('pointerdown', onClick)
    costSlot.on('pointerdown', onClick)
  })

  refresh()

  // re-tint when gold changes
  const onGoldChange = () => refresh()
  scene.registry.events.on('changedata-gold', onGoldChange)

  const onCleanup = () => {
    scene.registry.events.off('changedata-gold', onGoldChange)
  }

  return { onCleanup }
}
