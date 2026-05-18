import Phaser from 'phaser'
import { COLORS } from '../colors'
import { state, GENERAL_STORE_SLOTS } from '../game/state'
import { ITEMS, type ItemStack } from '../items/types'
import { type SlotBinding } from '../ui/SlotBinding'
import { makeSlotImage, makeStorageBinding } from '../ui/slotFactory'
import type { SlotVisual } from './InteriorTypes'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from './UI'
import type { UI } from './UI'
import { registerGrabbable } from '../ui/hover'
import { buildInteriorBackdrop, INTERIOR_PALETTES } from './InteriorBackdrop'

// ---------------------------------------------------------------------------
// GeneralStoreInterior — 6×4 grid of slots. Drag items in, see running total
// at the top, click "Sell All" to convert everything to gold. Items left in
// slots when the player exits return to inventory automatically.
// ---------------------------------------------------------------------------

export interface GeneralStoreInteriorHandle {
    bindings: SlotBinding[]
    slotVisuals: SlotVisual[]
    onCleanup: () => void
}

const COLS = 6
const ROWS = 4
const SLOT = 48
const SLOT_GAP = 4
const PANEL_PAD = 36
const TITLE_H = 50
const TOTAL_H = 36
const SELL_BTN_H = 44
const SECTION_GAP = 20

export function buildGeneralStoreInterior(
    scene: Phaser.Scene,
    onSlotShiftClick: (binding: SlotBinding) => void,
): GeneralStoreInteriorHandle {
    // ---- backdrop (wall, windows, floor, side walls) ----
    buildInteriorBackdrop(scene, INTERIOR_PALETTES.generalStore)

    const bindings: SlotBinding[] = []
    const slotVisuals: SlotVisual[] = []

    const w = scene.cameras.main.width
    const h = scene.cameras.main.height
    const playAreaTop = UI_BAR_HEIGHT
    const playAreaH = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT

    // ---- panel dimensions ----
    const gridW = COLS * SLOT + (COLS - 1) * SLOT_GAP
    const gridH = ROWS * SLOT + (ROWS - 1) * SLOT_GAP
    const panelW = gridW + PANEL_PAD * 2
    const panelH = PANEL_PAD + TITLE_H + SECTION_GAP + TOTAL_H + SECTION_GAP + gridH + SECTION_GAP + SELL_BTN_H + PANEL_PAD

    const panelX = w / 2
    const panelY = playAreaTop + playAreaH / 2

    // ---- outer panel ----
    scene.add.nineslice(panelX, panelY, 'menu-bg', undefined, panelW, panelH, 16, 16, 16, 16)
        .setTint(COLORS.interiorPanel)

    // ---- title ----
    const titleY = panelY - panelH / 2 + PANEL_PAD + 16
    scene.add.bitmapText(panelX, titleY, 'main', 'General Store', 32)
        .setOrigin(0.5, 0.5).setTint(COLORS.uiText)

    // ---- running total ----
    const totalY = panelY - panelH / 2 + PANEL_PAD + TITLE_H + SECTION_GAP + TOTAL_H / 2
    const totalText = scene.add.bitmapText(panelX, totalY, 'mainSmall', '', 20)
        .setOrigin(0.5, 0.5).setTint(COLORS.uiGold)

    const computeTotal = (): number => {
        let g = 0
        for (const s of state.generalStoreSlots) {
            if (!s) continue
            const price = ITEMS[s.type].sellPrice ?? 0
            g += price * s.count
        }
        return g
    }
    const refreshTotal = () => {
        totalText.setText(`Total: ${computeTotal()}g`)
    }
    refreshTotal()

    // ---- slot grid ----
    const gridTop = totalY + TOTAL_H / 2 + SECTION_GAP
    const gridLeft = panelX - gridW / 2 + SLOT / 2

    const ui = scene.scene.get('UI') as UI
    const dc = ui.getDragController()

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const i = r * COLS + c
            const x = gridLeft + c * (SLOT + SLOT_GAP)
            const y = gridTop + SLOT / 2 + r * (SLOT + SLOT_GAP)

            const getStack = () => state.generalStoreSlots[i]
            const slotImg = makeSlotImage(scene, { x, y, peek: getStack, tooltipOffsetY: -44 })
            const setStack = (s: ItemStack | null) => { state.generalStoreSlots[i] = s }
            slotVisuals.push({ x, y, getStack, icon: null, count: null, lastType: null, lastCount: 0 })

            const binding = makeStorageBinding({ x, y }, getStack, setStack, { onChange: refreshTotal })
            // wrap accepts to reject items without a sellPrice
            const baseAccepts = binding.accepts
            binding.accepts = (itemType) => {
                if ((ITEMS[itemType].sellPrice ?? 0) <= 0) return false
                return baseAccepts(itemType)
            }
            bindings.push(binding)
            dc.register(binding)

            slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
                if ((p.event as MouseEvent).shiftKey) { onSlotShiftClick(binding); return }
                dc.handleSlotClick(binding, p)
            })
        }
    }

    // ---- Sell All button ----
    const btnY = gridTop + gridH + SECTION_GAP + SELL_BTN_H / 2
    const btn = scene.add.rectangle(panelX, btnY, 200, SELL_BTN_H, COLORS.uiBarBg).setInteractive()
    registerGrabbable(btn)
    scene.add.bitmapText(panelX, btnY, 'mainSmall', 'SELL ALL', 24)
        .setOrigin(0.5, 0.5).setTint(COLORS.uiGold)

    btn.on('pointerdown', () => {
        const total = computeTotal()
        if (total <= 0) return
        state.addGold(total, scene.registry)
        for (let i = 0; i < state.generalStoreSlots.length; i++) {
            state.generalStoreSlots[i] = null
        }
        refreshTotal()
    })

    // ---- cleanup: dump remaining items back into inventory on exit ----
    const onCleanup = () => {
        for (let i = 0; i < state.generalStoreSlots.length; i++) {
            const s = state.generalStoreSlots[i]
            if (!s) continue
            state.inventoryAddAnywhere(s)
            // if anything didn't fit, leave it in the slot for next visit
            if (s.count <= 0) state.generalStoreSlots[i] = null
        }
        scene.registry.events.emit('inventory-changed')
    }

    return { bindings, slotVisuals, onCleanup }
}