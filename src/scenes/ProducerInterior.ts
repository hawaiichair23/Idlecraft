import Phaser from 'phaser'
import { COLORS } from '../colors'
import { BUILDINGS, state, getEffectiveTickMs, getPlotSlotCap, type BuiltType } from '../game/state'
import { type SlotBinding } from '../ui/SlotBinding'
import { makeSlotImage, makeProducerOutputBinding } from '../ui/slotFactory'
import { outlineIcon } from '../ui/iconOutline'
import type { SlotVisual } from './InteriorTypes'
import type { UI } from './UI'

// ---------------------------------------------------------------------------
// ProducerInterior — mill / well. A simple "building → arrow → output slot"
// layout. No panel — the parent Interior scene provides the frame.
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
  centerX: number,
  centerY: number,
  onSlotShiftClick: (binding: SlotBinding) => void,
  container?: Phaser.GameObjects.Container,
): ProducerInteriorHandle {
  const def = BUILDINGS[buildingType]
  if (!def.producesItem) {
    return { bindings: [], slotVisuals: [], update: () => {} }
  }

  const SLOT = 48
  const GAP = 16
  const SYMBOL = 16
  const layoutW = SLOT * 2 + GAP * 2 + SYMBOL

  const startX = centerX - layoutW / 2
  const buildingX = startX + SLOT / 2
  const arrowX = buildingX + SLOT / 2 + GAP + SYMBOL / 2
  const outputX = arrowX + SYMBOL / 2 + GAP + SLOT / 2

  const buildingSlotBg = scene.add.image(buildingX, centerY, 'menu-slot').setTint(COLORS.slotBg)
  const buildingSprite = outlineIcon(scene.add.sprite(buildingX, centerY, buildingType).setScale(2))
  const producerArrow = scene.add.sprite(arrowX, centerY, 'arrow_right').setScale(2)
  container?.add([buildingSlotBg, buildingSprite, producerArrow])

  // output slot
  const getStack = () => state.plots[plotIndex].output
  const slotImg = makeSlotImage(scene, { x: outputX, y: centerY, peek: getStack, tooltipOffsetY: -38 })
  container?.add(slotImg)
  const setStack = (s: typeof state.plots[number]['output']) => { state.plots[plotIndex].output = s }
  const slotVisual: SlotVisual = {
    x: outputX, y: centerY, getStack,
    icon: null, count: null, lastType: null, lastCount: 0,
    container,
  }

  const binding = makeProducerOutputBinding(
    { x: outputX, y: centerY },
    def.producesItem,
    getStack,
    setStack,
    { onChange: () => {} },
    (t) => getPlotSlotCap(state.plots[plotIndex], t as any),
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
    const effectiveMs = getEffectiveTickMs(def.itemTickMs, plot.level)
    const frac = ((state.gameTime - plot.lastItemTickAt) % effectiveMs) / effectiveMs
    const r = Math.floor(Phaser.Math.Linear(0x55, 0xFF, frac))
    const g = Math.floor(Phaser.Math.Linear(0x4a, 0xD7, frac))
    const b = Math.floor(Phaser.Math.Linear(0x3e, 0x00, frac))
    producerArrow.setTint((r << 16) | (g << 8) | b)
  }

  return { bindings: [binding], slotVisuals: [slotVisual], update }
}
