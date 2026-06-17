import Phaser from 'phaser'
import { COLORS, FONT } from '../colors'
import { state } from '../game/state'
import { ITEMS, type ItemType, type ItemStack } from '../items/types'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from './UI'
import { attachSlotHover } from '../ui/hover'
import { buildInteriorBackdrop, INTERIOR_PALETTES } from './InteriorBackdrop'

// ---------------------------------------------------------------------------
// ShopInterior — buy menu. Same row layout as the build menu in UI.ts but
// for inventory items. One row per item: icon | name+description | cost+coin.
// ---------------------------------------------------------------------------

export interface ShopInteriorHandle {
  onCleanup: () => void
}

interface ShopEntry {
  type: ItemType
  buyPrice: number
  gatedBy?: () => boolean
}
const SHOP_ITEMS: ShopEntry[] = [
  { type: 'shovel', buyPrice: 100 },
  { type: 'axe',    buyPrice: 500 },
  { type: 'pickaxe', buyPrice: 800 },
  { type: 'rope',   buyPrice: 75,  gatedBy: () => state.hasCraftedRope },
  { type: 'post',   buyPrice: 50,  gatedBy: () => state.hasCraftedPost },
  { type: 'bag',    buyPrice: 280, gatedBy: () => state.hasCraftedBag },
  { type: 'pipe',   buyPrice: 35,  gatedBy: () => state.hasPipeUnlock },
  { type: 'fence_gate', buyPrice: 60, gatedBy: () => state.hasCraftedPost },
]

export function buildShopInterior(scene: Phaser.Scene, _structureIndex: number): ShopInteriorHandle {
  // ---- backdrop (wall, windows, floor, side walls) ----
  buildInteriorBackdrop(scene, INTERIOR_PALETTES.toolShop)

  // Visible listings: filter out anything whose gate hasn't been met.
  const visibleItems = SHOP_ITEMS.filter(e => !e.gatedBy || e.gatedBy())

  const w = scene.cameras.main.width
  const h = scene.cameras.main.height
  const playAreaTop = UI_BAR_HEIGHT
  const playAreaH = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT

  // ---- panel dimensions ----
  const ICON_W = 48
  const NAME_W = 330
  const COST_W = 48
  const BULK_W = 48
  const GAP = 4
  const ROW_H = 48
  const ROW_GAP = 8
  const PANEL_PAD_X = 24
  const PANEL_PAD_Y = 24
  const TITLE_BAND = 36

  const hasBulk = visibleItems.some(e => e.type === 'pipe')
  const ROW_W = ICON_W + GAP + NAME_W + GAP + COST_W + (hasBulk ? GAP + BULK_W : 0)
  const rowStackH = visibleItems.length * ROW_H + Math.max(0, visibleItems.length - 1) * ROW_GAP
  const PANEL_W = ROW_W + PANEL_PAD_X * 2
  const PANEL_H = TITLE_BAND + rowStackH + PANEL_PAD_Y * 2

  const panelX = w / 2
  const panelY = playAreaTop + playAreaH / 2

  // ---- panel background ----
  scene.add.nineslice(panelX, panelY, 'menu-bg', undefined, PANEL_W, PANEL_H, 16, 16, 16, 16)
    .setTint(COLORS.interiorPanel)

  // ---- title ----
  const topRowY = panelY - rowStackH / 2 + ROW_H / 2
  scene.add.bitmapText(panelX, topRowY - ROW_H / 2 - 18, 'main', 'Tool Shop', FONT.title)
    .setOrigin(0.5, 0.5)
    .setTint(COLORS.uiText)

  // ---- rows ----
  const iconX = panelX - ROW_W / 2 + ICON_W / 2
  const nameX = iconX + ICON_W / 2 + GAP + NAME_W / 2
  const costX = nameX + NAME_W / 2 + GAP + COST_W / 2
  const bulkX = costX + COST_W / 2 + GAP + BULK_W / 2
  if (hasBulk) {
    scene.add.bitmapText(costX, topRowY - ROW_H / 2 - 18, 'mainSmall', 'x1', FONT.desc)
      .setOrigin(0.5, 0.5)
      .setTint(COLORS.uiText)
    scene.add.bitmapText(bulkX, topRowY - ROW_H / 2 - 18, 'mainSmall', 'x10', FONT.desc)
      .setOrigin(0.5, 0.5)
      .setTint(COLORS.uiText)
  }

  const rowTexts: { entry: ShopEntry; texts: Phaser.GameObjects.BitmapText[]; bulkTexts: Phaser.GameObjects.BitmapText[] }[] = []

  const refreshAffordability = () => {
    const gold = (scene.registry.get('gold') as number | undefined) ?? 0
    for (const { entry, texts, bulkTexts } of rowTexts) {
      const affordable = gold >= entry.buyPrice
      const tint = affordable ? COLORS.uiText : COLORS.menuDisabled
      for (const t of texts) t.setTint(tint)
      const bulkAffordable = gold >= entry.buyPrice * 10
      const bulkTint = bulkAffordable ? COLORS.uiText : COLORS.menuDisabled
      for (const t of bulkTexts) t.setTint(bulkTint)
    }
  }

  visibleItems.forEach((entry, i) => {
    const def = ITEMS[entry.type]
    const rowY = topRowY + i * (ROW_H + ROW_GAP)

    const iconSlot = scene.add.image(iconX, rowY, 'menu-slot').setInteractive()
    const nameSlot = scene.add.image(nameX, rowY, 'menu-longslot').setInteractive()
    const costSlot = scene.add.image(costX, rowY, 'menu-slot').setInteractive()
    attachSlotHover(scene, iconSlot, iconX, rowY, ICON_W, ROW_H)
    attachSlotHover(scene, nameSlot, nameX, rowY, NAME_W, ROW_H)
    attachSlotHover(scene, costSlot, costX, rowY, COST_W, ROW_H)

    // item icon centered in its slot
    scene.add.sprite(iconX, rowY, def.sprite).setScale(def.scale)

    // name + description, left-aligned in long slot
    const labelX = nameX - NAME_W / 2 + 12
    const label = scene.add.bitmapText(labelX, rowY - 8, 'main', def.name, FONT.name)
      .setOrigin(0, 0.5)
      .setTint(COLORS.uiText)
    const desc = scene.add.bitmapText(labelX, rowY + 10, 'mainSmall', def.desc ?? '', FONT.desc)
      .setOrigin(0, 0.5)
      .setTint(COLORS.uiText)

    // cost number + coin
    const cost = scene.add.bitmapText(costX - 6, rowY + 3, 'main', `${entry.buyPrice}`, FONT.cost)
      .setOrigin(0.5, 0.5)
      .setTint(COLORS.uiText)
    scene.add.sprite(costX + 12, rowY, 'gold_coin').setScale(2)

    rowTexts.push({ entry, texts: [label, desc, cost], bulkTexts: [] })

    const onClick = (p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
      if (!p.leftButtonDown()) return
      ev.stopPropagation()
      const gold = (scene.registry.get('gold') as number | undefined) ?? 0
      if (gold < entry.buyPrice) return
      if (!state.trySpend(entry.buyPrice, scene.registry)) return
      const stack: ItemStack = { type: entry.type, count: 1 }
      const added = state.inventoryAddAnywhere(stack)
      if (added <= 0) {
        state.addGold(entry.buyPrice, scene.registry)
        return
      }
      scene.registry.events.emit('inventory-changed')
      refreshAffordability()
    }
    iconSlot.on('pointerdown', onClick)
    nameSlot.on('pointerdown', onClick)
    costSlot.on('pointerdown', onClick)

    if (entry.type === 'pipe') {
      const bulkSlot = scene.add.image(bulkX, rowY, 'menu-slot').setInteractive()
      attachSlotHover(scene, bulkSlot, bulkX, rowY, BULK_W, ROW_H)
      const bulkLabel = scene.add.bitmapText(bulkX - 6, rowY + 3, 'main', `${entry.buyPrice * 10}`, FONT.cost)
        .setOrigin(0.5, 0.5)
        .setTint(COLORS.uiText)
      scene.add.sprite(bulkX + 12, rowY, 'gold_coin').setScale(2)
      rowTexts[rowTexts.length - 1].bulkTexts.push(bulkLabel)

      bulkSlot.on('pointerdown', (p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
        if (!p.leftButtonDown()) return
        ev.stopPropagation()
        const qty = 10
        const totalCost = entry.buyPrice * qty
        const gold = (scene.registry.get('gold') as number | undefined) ?? 0
        if (gold < totalCost) return
        if (!state.trySpend(totalCost, scene.registry)) return
        const stack: ItemStack = { type: entry.type, count: qty }
        const added = state.inventoryAddAnywhere(stack)
        if (added <= 0) {
          state.addGold(totalCost, scene.registry)
          return
        }
        if (added < qty) {
          state.addGold((qty - added) * entry.buyPrice, scene.registry)
        }
        scene.registry.events.emit('inventory-changed')
        refreshAffordability()
      })
    }
  })


  refreshAffordability()

  // re-tint rows when gold changes (e.g. from selling at general store)
  const onGoldChange = () => refreshAffordability()
  scene.registry.events.on('changedata-gold', onGoldChange)

  const onCleanup = () => {
    scene.registry.events.off('changedata-gold', onGoldChange)
  }

  return { onCleanup }
}
