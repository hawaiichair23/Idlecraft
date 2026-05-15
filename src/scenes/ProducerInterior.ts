import Phaser from 'phaser'
import { COLORS } from '../colors'
import { BUILDINGS, state, type BuiltType } from '../game/state'
import { type SlotBinding } from '../ui/SlotBinding'
import { makeSlotImage, makeProducerOutputBinding } from '../ui/slotFactory'
import type { SlotVisual } from './InteriorTypes'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from './UI'
import type { UI } from './UI'

// ---------------------------------------------------------------------------
// ProducerInterior — mill / well. A simple "building → arrow → output slot"
// panel. The arrow pulses to show item-tick progress.
// ---------------------------------------------------------------------------

export interface ProducerInteriorHandle {
  bindings: SlotBinding[]
  slotVisuals: SlotVisual[]
  update: () => void
}

export function buildProducerInterior(
  scene: Phaser.Scene,
  buildingType: BuiltType,
  plotIndex: number,
  onSlotShiftClick: (binding: SlotBinding) => void,
): ProducerInteriorHandle {
  const def = BUILDINGS[buildingType]
  if (!def.producesItem) {
    return { bindings: [], slotVisuals: [], update: () => {} }
  }

  const w = scene.cameras.main.width
  const h = scene.cameras.main.height
  const playAreaTop = UI_BAR_HEIGHT
  const playAreaH = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT
  const panelY = playAreaTop + playAreaH / 2

  const SLOT = 48
  const GAP = 16
  const SYMBOL = 16
  const PAD_X = 24
  const PAD_Y = 28
  const layoutW = SLOT * 2 + GAP * 2 + SYMBOL
  const panelW = layoutW + PAD_X * 2
  const panelH = SLOT + PAD_Y * 2

  scene.add.nineslice(w / 2, panelY, 'menu-bg', undefined, panelW, panelH, 16, 16, 16, 16)
    .setTint(COLORS.interiorPanel)
  scene.add.rectangle(w / 2, panelY, panelW, panelH)
    .setStrokeStyle(2, 0x000000).setFillStyle()

  const startX = w / 2 - layoutW / 2
  const buildingX = startX + SLOT / 2
  const arrowX = buildingX + SLOT / 2 + GAP + SYMBOL / 2
  const outputX = arrowX + SYMBOL / 2 + GAP + SLOT / 2

  scene.add.image(buildingX, panelY, 'menu-slot').setTint(COLORS.interiorPanel)
  scene.add.sprite(buildingX, panelY, buildingType).setScale(2)
  const producerArrow = scene.add.sprite(arrowX, panelY, 'arrow_right').setScale(2)

  // output slot
  const slotImg = makeSlotImage(scene, { x: outputX, y: panelY })
  const getStack = () => state.plots[plotIndex].output
  const setStack = (s: typeof state.plots[number]['output']) => { state.plots[plotIndex].output = s }
  const slotVisual: SlotVisual = {
    x: outputX, y: panelY, getStack,
    icon: null, count: null, lastType: null, lastCount: 0,
  }

  const binding = makeProducerOutputBinding(
    { x: outputX, y: panelY },
    def.producesItem,
    getStack,
    setStack,
    { onChange: () => {} },   // slotVisual.lastType/lastCount tracking handles redraw
  )

  const ui = scene.scene.get('UI') as UI
  ui.getDragController().register(binding)

  slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
    if ((p.event as MouseEvent).shiftKey) {
      onSlotShiftClick(binding)
      return
    }
    ui.getDragController().handleSlotClick(binding, p)
  })

  const update = () => {
    if (!def.itemTickMs) return
    const plot = state.plots[plotIndex]
    const frac = ((Date.now() - plot.lastItemTickAt) % def.itemTickMs) / def.itemTickMs
    const r = Math.floor(Phaser.Math.Linear(0x55, 0xFF, frac))
    const g = Math.floor(Phaser.Math.Linear(0x4a, 0xD7, frac))
    const b = Math.floor(Phaser.Math.Linear(0x3e, 0x00, frac))
    producerArrow.setTint((r << 16) | (g << 8) | b)
  }

  return { bindings: [binding], slotVisuals: [slotVisual], update }
}
