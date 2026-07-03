import Phaser from 'phaser'
import { addPanelTitle } from '../panelTitle'
import { COLORS, FONT } from '../colors'
import { outlineIcon } from './iconOutline'
import { state } from '../game/state'
import { ITEMS, type ItemType, type ItemStack } from '../items/types'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from '../scenes/UI'
import { attachSlotHover, attachSlotTooltip } from './hover'
import { buildInteriorBackdrop, INTERIOR_PALETTES } from '../scenes/InteriorBackdrop'

export interface BuyMenuEntry {
  type: ItemType
  buyPrice: number
  name?: string
  description?: string
  sprite?: string
  scale?: number
  singleQty?: number
  bulkQty?: number
  onBuy?: () => void
  isOwned?: () => boolean
  afterBuy?: () => void
}

export type BuyMenuRow =
  | { kind: 'item'; entry: BuyMenuEntry }
  | { kind: 'header'; label: string; singleLabel?: string; bulkLabel?: string }

export interface BuyMenuOptions {
  title: string
  rows: BuyMenuRow[]
  palette: keyof typeof INTERIOR_PALETTES
  visibleRows?: number
}

export interface BuyMenuHandle {
  onCleanup: () => void
}

export function buildBuyMenu(scene: Phaser.Scene, opts: BuyMenuOptions): BuyMenuHandle {
  const { title, rows: ROWS, palette, visibleRows = 4 } = opts
  buildInteriorBackdrop(scene, INTERIOR_PALETTES[palette])

  const w = scene.cameras.main.width
  const h = scene.cameras.main.height
  const playAreaTop = UI_BAR_HEIGHT
  const playAreaH = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT

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

  const hasAnyBulkRow = ROWS.some(r => r.kind === 'item' && !r.entry.onBuy && ITEMS[r.entry.type] !== undefined && ITEMS[r.entry.type].maxStack > 1)
  const anyHeaderHasLabels = ROWS.some(r => r.kind === 'header' && (r.singleLabel !== undefined || r.bulkLabel !== undefined))
  const ROW_W = ICON_W + GAP + NAME_W + GAP + COST_W + (hasAnyBulkRow ? GAP + BULK_W : 0)

  const viewportH = visibleRows * ROW_H + (visibleRows - 1) * ROW_GAP
  const PANEL_W = ROW_W + PANEL_PAD_X * 2
  const PANEL_H = TITLE_BAND + viewportH + PANEL_PAD_Y * 2

  const panelX = w / 2
  const panelY = playAreaTop + playAreaH / 2

  scene.add.nineslice(panelX, panelY, 'menu-bg', undefined, PANEL_W, PANEL_H, 16, 16, 16, 16)
    .setTint(COLORS.interiorPanel)

  const viewportTop = panelY - PANEL_H / 2 + TITLE_BAND + PANEL_PAD_Y
  addPanelTitle(scene, panelX, viewportTop - 18, title)

  const iconX = panelX - ROW_W / 2 + ICON_W / 2
  const nameX = iconX + ICON_W / 2 + GAP + NAME_W / 2
  const costX = nameX + NAME_W / 2 + GAP + COST_W / 2
  const bulkX = costX + COST_W / 2 + GAP + BULK_W / 2
  if (hasAnyBulkRow && !anyHeaderHasLabels) {
    scene.add.bitmapText(costX, viewportTop - 18, 'mainSmall', 'x1', FONT.desc)
      .setOrigin(0.5, 0.5)
      .setTint(COLORS.uiText)
    scene.add.bitmapText(bulkX, viewportTop - 18, 'mainSmall', 'x10', FONT.desc)
      .setOrigin(0.5, 0.5)
      .setTint(COLORS.uiText)
  }

  interface RowSlot {
    rowY: number
    iconSlot: Phaser.GameObjects.Image
    nameSlot: Phaser.GameObjects.Image
    costSlot: Phaser.GameObjects.Image
    bulkSlot?: Phaser.GameObjects.Image
    iconHover: Phaser.GameObjects.Graphics
    nameHover: Phaser.GameObjects.Graphics
    costHover: Phaser.GameObjects.Graphics
    bulkHover?: Phaser.GameObjects.Graphics
    icon: Phaser.GameObjects.Sprite
    label: Phaser.GameObjects.BitmapText
    desc: Phaser.GameObjects.BitmapText
    cost: Phaser.GameObjects.BitmapText
    coin: Phaser.GameObjects.Sprite
    bulkLabel?: Phaser.GameObjects.BitmapText
    bulkCoin?: Phaser.GameObjects.Sprite
    headerText: Phaser.GameObjects.BitmapText
    headerSingleLabel: Phaser.GameObjects.BitmapText
    headerBulkLabel: Phaser.GameObjects.BitmapText
    entry: BuyMenuEntry | null
  }

  const rowSlots: RowSlot[] = []
  let topIndex = 0

  const tryCursorFirst = (stack: ItemStack): number => {
    const ui = scene.scene.get('UI') as Phaser.Scene & { getDragController?: () => { tryAddToHeld: (s: ItemStack) => number } }
    const drag = ui?.getDragController?.()
    if (!drag) return 0
    return drag.tryAddToHeld(stack)
  }

  const buyOne = (entry: BuyMenuEntry) => {
    if (entry.isOwned && entry.isOwned()) return
    const qty = entry.singleQty ?? 1
    const totalCost = entry.buyPrice * qty
    const gold = (scene.registry.get('gold') as number | undefined) ?? 0
    if (gold < totalCost) return
    if (!state.trySpend(totalCost, scene.registry)) return
    if (entry.onBuy) {
      entry.onBuy()
      refresh()
      return
    }
    const stack: ItemStack = { type: entry.type, count: qty }
    const onCursor = tryCursorFirst(stack)
    stack.count -= onCursor
    let added = 0
    if (stack.count > 0) added = state.inventoryAddAnywhere(stack)
    const totalAccepted = onCursor + added
    if (totalAccepted <= 0) {
      state.addGold(totalCost, scene.registry)
      return
    }
    if (totalAccepted < qty) state.addGold((qty - totalAccepted) * entry.buyPrice, scene.registry)
    scene.registry.events.emit('inventory-changed')
    entry.afterBuy?.()
    refresh()
  }

  const buyBulk = (entry: BuyMenuEntry) => {
    const qty = entry.bulkQty ?? 10
    const totalCost = entry.buyPrice * qty
    const gold = (scene.registry.get('gold') as number | undefined) ?? 0
    if (gold < totalCost) return
    if (!state.trySpend(totalCost, scene.registry)) return
    const stack: ItemStack = { type: entry.type, count: qty }
    const onCursor = tryCursorFirst(stack)
    stack.count -= onCursor
    let added = 0
    if (stack.count > 0) added = state.inventoryAddAnywhere(stack)
    const totalAccepted = onCursor + added
    if (totalAccepted <= 0) {
      state.addGold(totalCost, scene.registry)
      return
    }
    if (totalAccepted < qty) state.addGold((qty - totalAccepted) * entry.buyPrice, scene.registry)
    scene.registry.events.emit('inventory-changed')
    entry.afterBuy?.()
    refresh()
  }

  for (let i = 0; i < visibleRows; i++) {
    const rowY = viewportTop + ROW_H / 2 + i * (ROW_H + ROW_GAP)

    const iconSlot = scene.add.image(iconX, rowY, 'menu-slot').setTint(COLORS.slotBg).setInteractive()
    const nameSlot = scene.add.image(nameX, rowY, 'menu-longslot').setTint(COLORS.slotBg).setInteractive()
    const costSlot = scene.add.image(costX, rowY, 'menu-slot').setTint(COLORS.slotBg).setInteractive()
    const iconHover = attachSlotHover(scene, iconSlot, iconX, rowY, ICON_W, ROW_H)
    const nameHover = attachSlotHover(scene, nameSlot, nameX, rowY, NAME_W, ROW_H)
    const costHover = attachSlotHover(scene, costSlot, costX, rowY, COST_W, ROW_H)

    const icon = outlineIcon(scene.add.sprite(iconX, rowY, 'item_crate').setScale(1))
    const labelX = nameX - NAME_W / 2 + 12
    const label = scene.add.bitmapText(labelX, rowY - 8, 'main', '', FONT.name).setOrigin(0, 0.5).setTint(COLORS.uiText)
    const desc = scene.add.bitmapText(labelX, rowY + 10, 'mainSmall', '', FONT.desc).setOrigin(0, 0.5).setTint(COLORS.uiText)
    const cost = scene.add.bitmapText(costX - 6, rowY + 3, 'main', '', FONT.cost).setOrigin(0.5, 0.5).setTint(COLORS.uiText)
    const coin = scene.add.sprite(costX + 12, rowY, 'gold_coin').setScale(2)
    const headerText = scene.add.bitmapText(iconX - ICON_W / 2, rowY, 'mainSmall', '', FONT.desc).setOrigin(0, 0.5).setTint(COLORS.uiText)
    const headerSingleLabel = scene.add.bitmapText(costX, rowY, 'mainSmall', '', FONT.desc).setOrigin(0.5, 0.5).setTint(COLORS.uiText)
    const headerBulkLabel = scene.add.bitmapText(bulkX, rowY, 'mainSmall', '', FONT.desc).setOrigin(0.5, 0.5).setTint(COLORS.uiText)

    const row: RowSlot = { rowY, iconSlot, nameSlot, costSlot, iconHover, nameHover, costHover, icon, label, desc, cost, coin, headerText, headerSingleLabel, headerBulkLabel, entry: null }
    const peek = () => row.entry && ITEMS[row.entry.type] !== undefined ? { type: row.entry.type, count: 1 } : null
    attachSlotTooltip(iconSlot, peek)
    attachSlotTooltip(nameSlot, peek)

    if (hasAnyBulkRow) {
      const bulkSlot = scene.add.image(bulkX, rowY, 'menu-slot').setTint(COLORS.slotBg).setInteractive()
      const bulkHover = attachSlotHover(scene, bulkSlot, bulkX, rowY, BULK_W, ROW_H)
      const bulkLabel = scene.add.bitmapText(bulkX - 6, rowY + 3, 'main', '', FONT.cost).setOrigin(0.5, 0.5).setTint(COLORS.uiText)
      const bulkCoin = scene.add.sprite(bulkX + 12, rowY, 'gold_coin').setScale(2)
      row.bulkSlot = bulkSlot
      row.bulkHover = bulkHover
      row.bulkLabel = bulkLabel
      row.bulkCoin = bulkCoin
      bulkSlot.on('pointerdown', (p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
        if (!p.leftButtonDown()) return
        ev.stopPropagation()
        if (row.entry) buyBulk(row.entry)
      })
    }

    const onClick = (p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
      if (!p.leftButtonDown()) return
      ev.stopPropagation()
      if (row.entry) buyOne(row.entry)
    }
    iconSlot.on('pointerdown', onClick)
    nameSlot.on('pointerdown', onClick)
    costSlot.on('pointerdown', onClick)

    rowSlots.push(row)
  }

  const SCROLLBAR_W = 6
  const SCROLLBAR_X = panelX + PANEL_W / 2 - PANEL_PAD_X / 2 - SCROLLBAR_W / 2
  const scrollbarTrack = scene.add.rectangle(SCROLLBAR_X, viewportTop + viewportH / 2, SCROLLBAR_W, viewportH, COLORS.slotBg)
  const thumbHeight = ROWS.length > visibleRows
    ? Math.max(12, viewportH * (visibleRows / ROWS.length))
    : viewportH
  const scrollbarThumb = scene.add.rectangle(SCROLLBAR_X, viewportTop + thumbHeight / 2, SCROLLBAR_W, thumbHeight, COLORS.uiText)
  if (ROWS.length <= visibleRows) {
    scrollbarTrack.setVisible(false)
    scrollbarThumb.setVisible(false)
  }

  const refresh = () => {
    const gold = (scene.registry.get('gold') as number | undefined) ?? 0
    const maxIdx = Math.max(0, ROWS.length - visibleRows)
    const t = maxIdx > 0 ? topIndex / maxIdx : 0
    scrollbarThumb.y = viewportTop + thumbHeight / 2 + t * (viewportH - thumbHeight)
    for (let i = 0; i < visibleRows; i++) {
      const row = rowSlots[i]
      const r = ROWS[topIndex + i] ?? null

      if (r && r.kind === 'header') {
        row.entry = null
        row.iconSlot.setVisible(false)
        row.nameSlot.setVisible(false)
        row.costSlot.setVisible(false)
        row.iconHover.setVisible(false)
        row.nameHover.setVisible(false)
        row.costHover.setVisible(false)
        row.icon.setVisible(false)
        row.label.setVisible(false)
        row.desc.setVisible(false)
        row.cost.setVisible(false)
        row.coin.setVisible(false)
        if (row.bulkSlot) row.bulkSlot.setVisible(false)
        if (row.bulkHover) row.bulkHover.setVisible(false)
        if (row.bulkLabel) row.bulkLabel.setVisible(false)
        if (row.bulkCoin) row.bulkCoin.setVisible(false)
        row.headerText.setText(r.label).setVisible(true)
        if (r.singleLabel !== undefined) {
          row.headerSingleLabel.setText(r.singleLabel).setVisible(true)
        } else {
          row.headerSingleLabel.setVisible(false)
        }
        if (r.bulkLabel !== undefined) {
          row.headerBulkLabel.setText(r.bulkLabel).setVisible(true)
        } else {
          row.headerBulkLabel.setVisible(false)
        }
        continue
      }

      row.headerText.setVisible(false)
      row.headerSingleLabel.setVisible(false)
      row.headerBulkLabel.setVisible(false)
      const entry = r && r.kind === 'item' ? r.entry : null
      row.entry = entry
      const visible = entry !== null
      row.iconSlot.setVisible(visible)
      row.nameSlot.setVisible(visible)
      row.costSlot.setVisible(visible)
      if (!visible) {
        row.iconHover.setVisible(false)
        row.nameHover.setVisible(false)
        row.costHover.setVisible(false)
        if (row.bulkHover) row.bulkHover.setVisible(false)
      }
      row.icon.setVisible(visible)
      row.label.setVisible(visible)
      row.desc.setVisible(visible)
      row.cost.setVisible(visible)
      row.coin.setVisible(visible)
      if (row.bulkSlot) row.bulkSlot.setVisible(visible)
      if (row.bulkLabel) row.bulkLabel.setVisible(visible)
      if (row.bulkCoin) row.bulkCoin.setVisible(visible)
      if (!entry) continue
      const def = ITEMS[entry.type] as { name: string; sprite: string; scale: number; desc?: string; maxStack: number } | undefined
      const isUnlock = !!entry.onBuy
      const owned = entry.isOwned ? entry.isOwned() : false
      const spriteKey = entry.sprite ?? def?.sprite ?? 'item_crate'
      const scaleVal = entry.scale ?? def?.scale ?? 2
      const nameStr = entry.name ?? def?.name ?? entry.type
      const descStr = entry.description ?? def?.desc ?? ''
      row.icon.setTexture(spriteKey).setScale(scaleVal)
      row.label.setText(nameStr)
      row.desc.setText(descStr)
      const singleQty = entry.singleQty ?? 1
      const singleCost = entry.buyPrice * singleQty
      row.cost.setText(owned ? 'owned' : `${singleCost}`)
      const affordable = gold >= singleCost
      const tint = owned ? COLORS.menuDisabled : (affordable ? COLORS.uiText : COLORS.menuDisabled)
      row.label.setTint(tint)
      row.desc.setTint(tint)
      row.cost.setTint(tint)
      if (row.bulkLabel) {
        const hasBulk = !isUnlock && def !== undefined && def.maxStack > 1
        if (hasBulk) {
          const bulkQty = entry.bulkQty ?? 10
          const bulkCost = entry.buyPrice * bulkQty
          row.bulkLabel.setText(`${bulkCost}`)
          const bulkAffordable = gold >= bulkCost
          row.bulkLabel.setTint(bulkAffordable ? COLORS.uiText : COLORS.menuDisabled)
        }
        row.bulkSlot!.setVisible(hasBulk)
        row.bulkLabel.setVisible(hasBulk)
        row.bulkCoin!.setVisible(hasBulk)
      }
    }
  }

  const maxTopIndex = Math.max(0, ROWS.length - visibleRows)
  scene.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown[], _dx: number, dy: number) => {
    const dir = dy > 0 ? 1 : dy < 0 ? -1 : 0
    if (dir === 0) return
    topIndex = Math.max(0, Math.min(maxTopIndex, topIndex + dir))
    refresh()
  })

  refresh()

  const onGoldChange = () => refresh()
  scene.registry.events.on('changedata-gold', onGoldChange)

  scene.registry.set('wheel-block-rect', {
    x: panelX - PANEL_W / 2,
    y: panelY - PANEL_H / 2,
    w: PANEL_W,
    h: PANEL_H,
  })

  const onCleanup = () => {
    scene.registry.events.off('changedata-gold', onGoldChange)
    scene.registry.set('wheel-block-rect', undefined)
  }

  return { onCleanup }
}
