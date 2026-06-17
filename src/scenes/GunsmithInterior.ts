// GunsmithInterior.ts — buy menu for firearms. Same layout as the Tanner.

import Phaser from 'phaser'
import { COLORS, FONT } from '../colors'
import { state } from '../game/state'
import { ITEMS, type ItemType, type ItemStack } from '../items/types'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from './UI'
import { attachSlotHover } from '../ui/hover'
import { buildInteriorBackdrop, INTERIOR_PALETTES } from './InteriorBackdrop'

export interface GunsmithInteriorHandle {
  onCleanup: () => void
}

interface GunsmithEntry {
  type: ItemType
  buyPrice: number       // per-unit price; tier cost is buyPrice * qty
  singleQty?: number     // single-buy amount, default 1
  bulkQty?: number       // bulk-buy amount, default 10
}

const GUNSMITH_ITEMS: GunsmithEntry[] = [
  { type: 'derringer', buyPrice: 600 },
  { type: 'colt', buyPrice: 1200 },
  { type: 'colt_ammo', buyPrice: 10, singleQty: 25, bulkQty: 50 },
]

const singleQtyOf = (e: GunsmithEntry) => e.singleQty ?? 1
const bulkQtyOf = (e: GunsmithEntry) => e.bulkQty ?? 10

export function buildGunsmithInterior(scene: Phaser.Scene): GunsmithInteriorHandle {
  buildInteriorBackdrop(scene, INTERIOR_PALETTES.nursery)

  const w = scene.cameras.main.width
  const h = scene.cameras.main.height
  const playAreaTop = UI_BAR_HEIGHT
  const playAreaH = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT

  // ---- panel dimensions ----
  const ICON_W = 48
  const NAME_W = 330
  const COST_W = 48
  const GAP = 4
  const ROW_H = 48
  const ROW_GAP = 8
  const PANEL_PAD_X = 24
  const PANEL_PAD_Y = 24
  const TITLE_BAND = 36
  // Vertical space a group header occupies, and the extra padding inserted
  // between the firearms group and the ammo group.
  const GROUP_HEAD = 26
  const GROUP_PAD = 20

  const BULK_W = 48

  // Single-purchase firearms on top, stackable goods (ammo) below. Membership is
  // derived from the item's own maxStack — no separate flag to keep in sync.
  const firearms = GUNSMITH_ITEMS.filter(e => ITEMS[e.type].maxStack === 1)
  const stackables = GUNSMITH_ITEMS.filter(e => ITEMS[e.type].maxStack > 1)
  const groups: { title: string; entries: GunsmithEntry[] }[] = []
  if (firearms.length) groups.push({ title: 'Firearms', entries: firearms })
  if (stackables.length) groups.push({ title: 'Ammo', entries: stackables })

  const hasAnyBulk = stackables.length > 0
  const ROW_W = ICON_W + GAP + NAME_W + GAP + COST_W + (hasAnyBulk ? GAP + BULK_W : 0)

  const totalRows = GUNSMITH_ITEMS.length
  const rowStackH = totalRows * ROW_H + Math.max(0, totalRows - 1) * ROW_GAP
  // Each group adds a header band; every group after the first adds the padding.
  const groupsExtra =
    groups.length * GROUP_HEAD + Math.max(0, groups.length - 1) * GROUP_PAD
  const PANEL_W = ROW_W + PANEL_PAD_X * 2
  const PANEL_H = TITLE_BAND + rowStackH + groupsExtra + PANEL_PAD_Y * 2

  const panelX = w / 2
  const panelY = playAreaTop + playAreaH / 2 - 50

  scene.add.nineslice(panelX, panelY, 'menu-bg', undefined, PANEL_W, PANEL_H, 16, 16, 16, 16)
    .setTint(COLORS.interiorPanel)

  const contentTop = panelY - (rowStackH + groupsExtra) / 2
  scene.add.bitmapText(panelX, contentTop - 18, 'main', 'Gunsmith', FONT.title)
    .setOrigin(0.5, 0.5)
    .setTint(COLORS.uiText)

  const iconX = panelX - ROW_W / 2 + ICON_W / 2
  const nameX = iconX + ICON_W / 2 + GAP + NAME_W / 2
  const costX = nameX + NAME_W / 2 + GAP + COST_W / 2
  const bulkX = costX + COST_W / 2 + GAP + BULK_W / 2

  const rowTexts: { entry: GunsmithEntry; texts: Phaser.GameObjects.BitmapText[]; bulkTexts: Phaser.GameObjects.BitmapText[] }[] = []

  const refreshAffordability = () => {
    const gold = (scene.registry.get('gold') as number | undefined) ?? 0
    for (const { entry, texts, bulkTexts } of rowTexts) {
      const affordable = gold >= entry.buyPrice * singleQtyOf(entry)
      const tint = affordable ? COLORS.uiText : COLORS.menuDisabled
      for (const t of texts) t.setTint(tint)
      const bulkAffordable = gold >= entry.buyPrice * bulkQtyOf(entry)
      const bulkTint = bulkAffordable ? COLORS.uiText : COLORS.menuDisabled
      for (const t of bulkTexts) t.setTint(bulkTint)
    }
  }

  // Walk top-to-bottom, drawing each group's header then its rows. cursorY tracks
  // the running vertical position so groups stack with their padding.
  let cursorY = contentTop

  groups.forEach((group, gi) => {
    if (gi > 0) cursorY += GROUP_PAD
    // group header
    scene.add.bitmapText(iconX - ICON_W / 2, cursorY, 'mainSmall', group.title, FONT.desc)
      .setOrigin(0, 0.5)
      .setTint(COLORS.uiText)
    // bulk-tier labels sit on the right, aligned over the bulk column
    if (ITEMS[group.entries[0].type].maxStack > 1) {
      scene.add.bitmapText(costX, cursorY, 'mainSmall', `x${singleQtyOf(group.entries[0])}`, FONT.desc)
        .setOrigin(0.5, 0.5)
        .setTint(COLORS.uiText)
      scene.add.bitmapText(bulkX, cursorY, 'mainSmall', `x${bulkQtyOf(group.entries[0])}`, FONT.desc)
        .setOrigin(0.5, 0.5)
        .setTint(COLORS.uiText)
    }
    cursorY += GROUP_HEAD

    group.entries.forEach((entry, ri) => {
      const def = ITEMS[entry.type]
      const rowY = cursorY + ROW_H / 2

      const iconSlot = scene.add.image(iconX, rowY, 'menu-slot').setInteractive()
      const nameSlot = scene.add.image(nameX, rowY, 'menu-longslot').setInteractive()
      const costSlot = scene.add.image(costX, rowY, 'menu-slot').setInteractive()
      attachSlotHover(scene, iconSlot, iconX, rowY, ICON_W, ROW_H)
      attachSlotHover(scene, nameSlot, nameX, rowY, NAME_W, ROW_H)
      attachSlotHover(scene, costSlot, costX, rowY, COST_W, ROW_H)

      scene.add.sprite(iconX, rowY, def.sprite).setScale(def.scale)

      const labelX = nameX - NAME_W / 2 + 12
      const label = scene.add.bitmapText(labelX, rowY - 8, 'main', def.name, FONT.name)
        .setOrigin(0, 0.5)
        .setTint(COLORS.uiText)
      const desc = scene.add.bitmapText(labelX, rowY + 10, 'mainSmall', def.desc ?? '', FONT.desc)
        .setOrigin(0, 0.5)
        .setTint(COLORS.uiText)

      const singleQty = singleQtyOf(entry)
      const singleCost = entry.buyPrice * singleQty
      const cost = scene.add.bitmapText(costX - 6, rowY + 3, 'main', `${singleCost}`, FONT.cost)
        .setOrigin(0.5, 0.5)
        .setTint(COLORS.uiText)
      scene.add.sprite(costX + 12, rowY, 'gold_coin').setScale(2)

      rowTexts.push({ entry, texts: [label, desc, cost], bulkTexts: [] })

      const onClick = (p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
        if (!p.leftButtonDown()) return
        ev.stopPropagation()
        const gold = (scene.registry.get('gold') as number | undefined) ?? 0
        if (gold < singleCost) return
        if (!state.trySpend(singleCost, scene.registry)) return
        const stack: ItemStack = { type: entry.type, count: singleQty }
        const added = state.inventoryAddAnywhere(stack)
        if (added <= 0) {
          state.addGold(singleCost, scene.registry)
          return
        }
        if (added < singleQty) {
          state.addGold((singleQty - added) * entry.buyPrice, scene.registry)
        }
        scene.registry.events.emit('inventory-changed')
        refreshAffordability()
      }
      iconSlot.on('pointerdown', onClick)
      nameSlot.on('pointerdown', onClick)
      costSlot.on('pointerdown', onClick)

      // ---- bulk buy button (stackable items only) ----
      if (def.maxStack > 1) {
        const bulkQty = bulkQtyOf(entry)
        const bulkCost = entry.buyPrice * bulkQty
        const bulkSlot = scene.add.image(bulkX, rowY, 'menu-slot').setInteractive()
        attachSlotHover(scene, bulkSlot, bulkX, rowY, BULK_W, ROW_H)
        const bulkLabel = scene.add.bitmapText(bulkX - 6, rowY + 3, 'main', `${bulkCost}`, FONT.cost)
          .setOrigin(0.5, 0.5)
          .setTint(COLORS.uiText)
        scene.add.sprite(bulkX + 12, rowY, 'gold_coin').setScale(2)
        rowTexts[rowTexts.length - 1].bulkTexts.push(bulkLabel)

        bulkSlot.on('pointerdown', (p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
          if (!p.leftButtonDown()) return
          ev.stopPropagation()
          const gold = (scene.registry.get('gold') as number | undefined) ?? 0
          if (gold < bulkCost) return
          if (!state.trySpend(bulkCost, scene.registry)) return
          const stack: ItemStack = { type: entry.type, count: bulkQty }
          const added = state.inventoryAddAnywhere(stack)
          if (added <= 0) {
            state.addGold(bulkCost, scene.registry)
            return
          }
          if (added < bulkQty) {
            state.addGold((bulkQty - added) * entry.buyPrice, scene.registry)
          }
          scene.registry.events.emit('inventory-changed')
          refreshAffordability()
        })
      }

      cursorY += ROW_H
      if (ri < group.entries.length - 1) cursorY += ROW_GAP
    })
  })

  refreshAffordability()

  const onGoldChange = () => refreshAffordability()
  scene.registry.events.on('changedata-gold', onGoldChange)

  const onCleanup = () => {
    scene.registry.events.off('changedata-gold', onGoldChange)
  }

  return { onCleanup }
}
