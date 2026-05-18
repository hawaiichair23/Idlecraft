import Phaser from 'phaser'
import { COLORS } from '../colors'
import { state, MODIFIER_SLOTS_PER_PLOT } from '../game/state'
import { type ItemStack } from '../items/types'
import { type SlotBinding } from '../ui/SlotBinding'
import { makeSlotImage, makeStorageBinding } from '../ui/slotFactory'
import type { SlotVisual } from './InteriorTypes'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from './UI'
import type { UI } from './UI'

// ---------------------------------------------------------------------------
// ModifierRack — vertical column of slots on the right edge of every interior.
// Each slot stores a single item type that (eventually) modifies the building's
// behavior. Right now just stores items; effects come later.
// ---------------------------------------------------------------------------

export interface ModifierRackHandle {
  bindings: SlotBinding[]
  slotVisuals: SlotVisual[]
}

export function buildModifierRack(
  scene: Phaser.Scene,
  plotIndex: number,
  onSlotShiftClick: (binding: SlotBinding) => void,
): ModifierRackHandle {
  const w = scene.cameras.main.width
  const h = scene.cameras.main.height

  const SLOT = 48
  const GAP = 4
  const PAD = 12

  const playAreaTop = UI_BAR_HEIGHT
  const playAreaH = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT
  const rackH = MODIFIER_SLOTS_PER_PLOT * SLOT + (MODIFIER_SLOTS_PER_PLOT - 1) * GAP + PAD * 2
  const rackW = SLOT + PAD * 2
  const rackX = w - rackW / 2
  const rackY = playAreaTop + playAreaH / 2

  scene.add.nineslice(rackX, rackY, 'menu-bg', undefined, rackW, rackH, 16, 16, 16, 16)
    .setTint(COLORS.interiorPanel)
  scene.add.rectangle(rackX, rackY, rackW, rackH)
    .setStrokeStyle(2, 0x000000).setFillStyle()

  const bindings: SlotBinding[] = []
  const slotVisuals: SlotVisual[] = []
  const ui = scene.scene.get('UI') as UI
  const dc = ui.getDragController()

  const topSlotY = rackY - (MODIFIER_SLOTS_PER_PLOT - 1) * (SLOT + GAP) / 2
  for (let i = 0; i < MODIFIER_SLOTS_PER_PLOT; i++) {
    const slotY = topSlotY + i * (SLOT + GAP)
    const getStack = () => state.plots[plotIndex].modifiers[i]
    const slotImg = makeSlotImage(scene, { x: rackX, y: slotY, peek: getStack, tooltipOffsetY: -44 })

    const setStack = (s: ItemStack | null) => { state.plots[plotIndex].modifiers[i] = s }
    slotVisuals.push({ x: rackX, y: slotY, getStack, icon: null, count: null, lastType: null, lastCount: 0 })

    const binding = makeStorageBinding({ x: rackX, y: slotY }, getStack, setStack, { onChange: () => {} })
    bindings.push(binding)
    dc.register(binding)

    slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if ((p.event as MouseEvent).shiftKey) { onSlotShiftClick(binding); return }
      dc.handleSlotClick(binding, p)
    })
  }

  return { bindings, slotVisuals }
}
