import Phaser from 'phaser'
import { COLORS, FONT } from '../colors'
import { state, BUILDINGS, getPlotSlotCap } from '../game/state'
import { type ItemStack, type ItemType } from '../items/types'
import { tickSmeltingPlot, ensureSmelt } from '../game/smelting'
import { type SlotBinding } from '../ui/SlotBinding'
import { rejectHover } from '../ui/hover'
import { makeSlotImage, makeFilteredStorageBinding, makeReadOnlyBinding } from '../ui/slotFactory'
import type { SlotVisual } from './InteriorTypes'

export interface BlastFurnaceInteriorHandle {
  bindings: SlotBinding[]
  slotVisuals: SlotVisual[]
  update: () => void
}

const BLAST_CFG = BUILDINGS.blast_furnace.smelting!

function isFuel(type: string): boolean {
  return BLAST_CFG.isFuel(type)
}

function isSmeltable(type: string): boolean {
  return type in BLAST_CFG.recipes
}

export function tickBlastFurnacePlot(plotIndex: number, now: number) {
  const plot = state.plots[plotIndex]
  if (plot.built !== 'blast_furnace') return
  tickSmeltingPlot(plot, plotIndex, now, BLAST_CFG)
}

export function buildBlastFurnaceInterior(
  scene: Phaser.Scene,
  plotIndex: number,
  centerX: number,
  centerY: number,
  onSlotShiftClick: (binding: SlotBinding) => void,
  container?: Phaser.GameObjects.Container,
): BlastFurnaceInteriorHandle {
  const plot = state.plots[plotIndex]
  const smelt = ensureSmelt(plot)

  const SLOT = 48
  const VERT_GAP = 40
  const HORIZ_GAP = 16
  const OUTPUT_SLOT_GAP = SLOT + 8

  const extraOutputWidth = (smelt.outputs.length - 1) * OUTPUT_SLOT_GAP
  const leftShift = extraOutputWidth / 2

  const oreX = centerX - SLOT / 2 - HORIZ_GAP / 2 - leftShift
  const oreY = centerY - SLOT / 2 - VERT_GAP / 2

  const fuelX = oreX
  const fuelY = centerY + SLOT / 2 + VERT_GAP / 2

  const outputX = centerX + SLOT / 2 + HORIZ_GAP / 2 + HORIZ_GAP + SLOT / 2
  const outputY = centerY

  const arrowX = (oreX + (outputX - leftShift)) / 2
  const arrowY = outputY

  const oreLabelY = oreY - SLOT / 2 - 12
  const fuelLabelY = fuelY - SLOT / 2 - 12
  const fuelLabel = scene.add.bitmapText(fuelX, fuelLabelY, 'mainSmall', 'Fuel', FONT.desc)
    .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
  const oreLabel = scene.add.bitmapText(oreX, oreLabelY, 'mainSmall', 'Bars', FONT.desc)
    .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
  container?.add([fuelLabel, oreLabel])

  const arrow = scene.add.sprite(arrowX, arrowY, 'arrow_right').setScale(2)
  container?.add(arrow)

  const progressBarW = SLOT
  const progressBarH = 6
  const progressBarY = oreY + SLOT / 2 + 8
  const progressBg = scene.add.rectangle(oreX, progressBarY, progressBarW, progressBarH, 0x333333)
  const progressFill = scene.add.rectangle(
    oreX - progressBarW / 2, progressBarY, 0, progressBarH, 0x4488CC,
  ).setOrigin(0, 0.5)
  container?.add([progressBg, progressFill])

  const fuelBarW = 6
  const fuelBarTop = oreY - SLOT / 2
  const fuelBarBottom = fuelY + SLOT / 2
  const fuelBarH = fuelBarBottom - fuelBarTop
  const fuelBarX = oreX - SLOT / 2 - 12
  const fuelBarBg = scene.add.rectangle(fuelBarX, fuelBarTop + fuelBarH / 2, fuelBarW, fuelBarH, 0x333333)
  const FUEL_BAR_COLOR = '#d32038'
  const fuelBarFill = scene.add.rectangle(fuelBarX, fuelBarBottom, fuelBarW, 0, parseInt(FUEL_BAR_COLOR.slice(1), 16))
  container?.add([fuelBarBg, fuelBarFill])

  const bindings: SlotBinding[] = []
  const slotVisuals: SlotVisual[] = []
  const ui = scene.scene.get('UI') as any
  const dc = ui.getDragController()

  const getFuel = (): ItemStack | null => smelt.fuel ?? null
  const setFuel = (s: ItemStack | null) => { smelt.fuel = s }
  const getOre = (): ItemStack | null => smelt.input ?? null
  const setOre = (s: ItemStack | null) => { smelt.input = s }

  const noop = { onChange: () => {} }

  const fuelPos = { x: fuelX, y: fuelY }
  const orePos = { x: oreX, y: oreY }

  const fuelSlotImg = makeSlotImage(scene, { x: fuelX, y: fuelY, peek: getFuel, tooltipOffsetY: -44 })
  const oreSlotImg = makeSlotImage(scene, { x: oreX, y: oreY, peek: getOre, tooltipOffsetY: -44 })
  container?.add([fuelSlotImg, oreSlotImg])

  const fuelBinding = makeFilteredStorageBinding(fuelPos, getFuel, setFuel, noop, isFuel)
  const oreBinding = makeFilteredStorageBinding(orePos, getOre, setOre, noop, isSmeltable)
  dc.register(fuelBinding)
  dc.register(oreBinding)
  bindings.push(fuelBinding, oreBinding)

  const wireReject = (img: Phaser.GameObjects.GameObject, binding: SlotBinding) => {
    const update = () => {
      const held = dc.peekHeldStack()
      rejectHover.active = !!held && !binding.accepts(held.type)
    }
    img.on('pointerover', update)
    img.on('pointermove', update)
    img.on('pointerout', () => { rejectHover.active = false })
  }
  wireReject(fuelSlotImg, fuelBinding)
  wireReject(oreSlotImg, oreBinding)

  fuelSlotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
    if ((p.event as MouseEvent).shiftKey) { onSlotShiftClick(fuelBinding); return }
    dc.handleSlotClick(fuelBinding, p)
  })
  oreSlotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
    if ((p.event as MouseEvent).shiftKey) { onSlotShiftClick(oreBinding); return }
    dc.handleSlotClick(oreBinding, p)
  })

  slotVisuals.push(
    { x: fuelX, y: fuelY, getStack: getFuel, icon: null, count: null, lastType: null, lastCount: 0, container },
    { x: oreX, y: oreY, getStack: getOre, icon: null, count: null, lastType: null, lastCount: 0, container },
  )

  const outputCount = smelt.outputs.length
  const outputLeftX = outputX - ((outputCount - 1) * OUTPUT_SLOT_GAP) / 2
  const isOutType = (t: ItemType) => BLAST_CFG.outputs.has(t)

  for (let i = 0; i < outputCount; i++) {
    const slotIdx = i
    const sx = outputLeftX + i * OUTPUT_SLOT_GAP
    const sy = outputY
    const getSlot = (): ItemStack | null => smelt.outputs[slotIdx] ?? null
    const setSlot = (s: ItemStack | null) => { smelt.outputs[slotIdx] = s }
    const slotImg = makeSlotImage(scene, { x: sx, y: sy, peek: getSlot, tooltipOffsetY: -44 })
    container?.add(slotImg)
    const binding = makeReadOnlyBinding({ x: sx, y: sy }, getSlot, setSlot, noop, (t) => getPlotSlotCap(plot, t as ItemType))
    const baseAccepts = binding.accepts
    const baseOffer = binding.offer
    binding.accepts = (t) => isOutType(t) && baseAccepts(t)
    binding.offer = (s) => isOutType(s.type) ? baseOffer(s) : 0
    dc.register(binding)
    bindings.push(binding)
    wireReject(slotImg, binding)
    slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if ((p.event as MouseEvent).shiftKey) { onSlotShiftClick(binding); return }
      dc.handleSlotClick(binding, p)
    })
    slotVisuals.push({ x: sx, y: sy, getStack: getSlot, icon: null, count: null, lastType: null, lastCount: 0, container })
  }

  const update = () => {
    const now = state.gameTime
    tickBlastFurnacePlot(plotIndex, now)

    if (smelt.cycleEndAt > 0 && getOre() && getFuel()) {
      const remaining = smelt.cycleEndAt - now
      const frac = Math.min(1, 1 - Math.max(0, remaining / BLAST_CFG.cycleDurationMs))
      progressFill.width = progressBarW * frac
      const r = Math.floor(Phaser.Math.Linear(0x55, 0xFF, frac))
      const g = Math.floor(Phaser.Math.Linear(0x4a, 0x6A, frac))
      const b = Math.floor(Phaser.Math.Linear(0x3e, 0x1A, frac))
      arrow.setTint((r << 16) | (g << 8) | b)
    } else {
      progressFill.width = 0
      arrow.clearTint()
    }

    if (smelt.burnEndAt > now && smelt.burnDuration > 0) {
      const remaining = smelt.burnEndAt - now
      const frac = Math.max(0, remaining / smelt.burnDuration)
      const fillH = fuelBarH * frac
      fuelBarFill.setSize(fuelBarW, fillH)
      fuelBarFill.setPosition(fuelBarX, fuelBarBottom - fillH / 2)
    } else {
      fuelBarFill.setSize(fuelBarW, 0)
    }
  }

  return { bindings, slotVisuals, update }
}
