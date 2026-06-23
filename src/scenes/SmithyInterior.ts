import Phaser from 'phaser'
import { COLORS, FONT } from '../colors'
import { state } from '../game/state'
import { ITEMS, SMELT_RECIPES, FUEL_BURN_MS, type ItemStack, type ItemType } from '../items/types'
import { type SlotBinding } from '../ui/SlotBinding'
import { makeSlotImage } from '../ui/slotFactory'
import type { SlotVisual } from './InteriorTypes'

export interface SmithyInteriorHandle {
  bindings: SlotBinding[]
  slotVisuals: SlotVisual[]
  update: () => void
}

function isFuel(type: string): boolean {
  return type in FUEL_BURN_MS
}

function isSmeltable(type: string): boolean {
  return type in SMELT_RECIPES
}

const SMELT_DURATION_MS = 5000

export function buildSmithyInterior(
  scene: Phaser.Scene,
  plotIndex: number,
  centerX: number,
  centerY: number,
  onSlotShiftClick: (binding: SlotBinding) => void,
  container?: Phaser.GameObjects.Container,
): SmithyInteriorHandle {
  const plot = state.plots[plotIndex]
  if (plot.smithyFuel === undefined) plot.smithyFuel = null
  if (plot.smithyOre === undefined) plot.smithyOre = null
  if (plot.smithyOutput === undefined) plot.smithyOutput = null
  if (plot.smithyBurnEndAt == null) plot.smithyBurnEndAt = 0
  if (plot.smithySmeltEndAt == null) plot.smithySmeltEndAt = 0

  const SLOT = 48
  const VERT_GAP = 40
  const HORIZ_GAP = 16

  const oreX = centerX - SLOT / 2 - HORIZ_GAP / 2
  const oreY = centerY - SLOT / 2 - VERT_GAP / 2

  const fuelX = oreX
  const fuelY = centerY + SLOT / 2 + VERT_GAP / 2

  const outputX = centerX + SLOT / 2 + HORIZ_GAP / 2 + HORIZ_GAP + SLOT / 2
  const outputY = centerY

  const arrowX = (oreX + outputX) / 2
  const arrowY = outputY

  const oreLabelY = oreY - SLOT / 2 - 12
  const fuelLabelY = fuelY - SLOT / 2 - 12
  const fuelLabel = scene.add.bitmapText(fuelX, fuelLabelY, 'mainSmall', 'Fuel', FONT.desc)
    .setOrigin(0.5, 0.5).setTint(COLORS.uiText)
  const oreLabel = scene.add.bitmapText(oreX, oreLabelY, 'mainSmall', 'Ore', FONT.desc)
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

  const getFuel = (): ItemStack | null => plot.smithyFuel ?? null
  const setFuel = (s: ItemStack | null) => { plot.smithyFuel = s }
  const getOre = (): ItemStack | null => plot.smithyOre ?? null
  const setOre = (s: ItemStack | null) => { plot.smithyOre = s }
  const getOutput = (): ItemStack | null => plot.smithyOutput ?? null
  const setOutput = (s: ItemStack | null) => { plot.smithyOutput = s }

  const makeFilteredBinding = (
    pos: { x: number; y: number },
    getStack: () => ItemStack | null,
    setStack: (s: ItemStack | null) => void,
    filter: (type: string) => boolean,
  ): SlotBinding => {
    const binding: SlotBinding = {
      getScreenPos: () => pos,
      peek: () => getStack(),
      accepts: (itemType: ItemType) => {
        if (!filter(itemType)) return false
        const cur = getStack()
        return cur === null || cur.type === itemType
      },
      take: (count: number) => {
        const cur = getStack()
        if (!cur) return null
        const n = Math.min(count, cur.count)
        if (n <= 0) return null
        const taken: ItemStack = { type: cur.type, count: n }
        cur.count -= n
        if (cur.count <= 0) setStack(null)
        return taken
      },
      offer: (stack: ItemStack) => {
        if (!filter(stack.type)) return 0
        const cur = getStack()
        const cap = ITEMS[stack.type].maxStack
        if (!cur) {
          const moved = Math.min(cap, stack.count)
          setStack({ type: stack.type, count: moved })
          return moved
        }
        if (cur.type !== stack.type) return 0
        const room = cap - cur.count
        if (room <= 0) return 0
        const moved = Math.min(room, stack.count)
        cur.count += moved
        return moved
      },
      restore: (stack: ItemStack) => binding.offer(stack),
    }
    return binding
  }

  const makeOutputBinding = (
    pos: { x: number; y: number },
    getStack: () => ItemStack | null,
    setStack: (s: ItemStack | null) => void,
  ): SlotBinding => ({
    getScreenPos: () => pos,
    peek: () => getStack(),
    accepts: () => false,
    take: (count: number) => {
      const cur = getStack()
      if (!cur) return null
      const n = Math.min(count, cur.count)
      if (n <= 0) return null
      const taken: ItemStack = { type: cur.type, count: n }
      cur.count -= n
      if (cur.count <= 0) setStack(null)
      return taken
    },
    offer: () => 0,
    restore: (stack: ItemStack) => {
      const cur = getStack()
      if (!cur) { setStack({ type: stack.type, count: stack.count }); return stack.count }
      if (cur.type !== stack.type) return 0
      cur.count += stack.count
      return stack.count
    },
  })

  const fuelPos = { x: fuelX, y: fuelY }
  const orePos = { x: oreX, y: oreY }
  const outputPos = { x: outputX, y: outputY }

  const fuelSlotImg = makeSlotImage(scene, { x: fuelX, y: fuelY, peek: getFuel, tooltipOffsetY: -44 })
  const oreSlotImg = makeSlotImage(scene, { x: oreX, y: oreY, peek: getOre, tooltipOffsetY: -44 })
  const outputSlotImg = makeSlotImage(scene, { x: outputX, y: outputY, peek: getOutput, tooltipOffsetY: -44 })
  container?.add([fuelSlotImg, oreSlotImg, outputSlotImg])

  const fuelBinding = makeFilteredBinding(fuelPos, getFuel, setFuel, isFuel)
  const oreBinding = makeFilteredBinding(orePos, getOre, setOre, isSmeltable)
  const outputBinding = makeOutputBinding(outputPos, getOutput, setOutput)

  dc.register(fuelBinding)
  dc.register(oreBinding)
  dc.register(outputBinding)
  bindings.push(fuelBinding, oreBinding, outputBinding)

  fuelSlotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
    if ((p.event as MouseEvent).shiftKey) { onSlotShiftClick(fuelBinding); return }
    dc.handleSlotClick(fuelBinding, p)
  })
  oreSlotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
    if ((p.event as MouseEvent).shiftKey) { onSlotShiftClick(oreBinding); return }
    dc.handleSlotClick(oreBinding, p)
  })
  outputSlotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
    if ((p.event as MouseEvent).shiftKey) { onSlotShiftClick(outputBinding); return }
    dc.handleSlotClick(outputBinding, p)
  })

  slotVisuals.push(
    { x: fuelX, y: fuelY, getStack: getFuel, icon: null, count: null, lastType: null, lastCount: 0, container },
    { x: oreX, y: oreY, getStack: getOre, icon: null, count: null, lastType: null, lastCount: 0, container },
    { x: outputX, y: outputY, getStack: getOutput, icon: null, count: null, lastType: null, lastCount: 0, container },
  )

  const update = () => {
    const now = state.gameTime
    const fuel = getFuel()
    const ore = getOre()
    const isBurning = plot.smithyBurnEndAt! > now

    // No ore loaded → no smelt in progress. Clear the timer so the bar resets
    // and a freshly-inserted ore starts a full smelt rather than finishing the
    // stale one left from before it was removed.
    if (!ore) plot.smithySmeltEndAt = 0

    if (!isBurning && fuel && ore) {
      const burnMs = FUEL_BURN_MS[fuel.type]
      if (burnMs) {
        fuel.count -= 1
        if (fuel.count <= 0) setFuel(null)
        plot.smithyBurnEndAt = now + burnMs
        plot.smithyBurnDuration = burnMs
        plot.smithySmeltEndAt = now + SMELT_DURATION_MS
      }
    }

    if (plot.smithyBurnEndAt! > now && plot.smithySmeltEndAt! > 0 && now >= plot.smithySmeltEndAt!) {
      const currentOre = getOre()
      if (currentOre) {
        const barType = SMELT_RECIPES[currentOre.type]
        if (barType) {
          const currentOutput = getOutput()
          const cap = ITEMS[barType].maxStack
          if (!currentOutput || (currentOutput.type === barType && currentOutput.count < cap)) {
            currentOre.count -= 1
            if (currentOre.count <= 0) setOre(null)
            if (!currentOutput) {
              setOutput({ type: barType, count: 1 })
            } else {
              currentOutput.count += 1
            }
          }
          if (getOre() && plot.smithyBurnEndAt! > now) {
            plot.smithySmeltEndAt = now + SMELT_DURATION_MS
          } else {
            plot.smithySmeltEndAt = 0
          }
        }
      }
    }

    if (plot.smithyBurnEndAt! > now && plot.smithySmeltEndAt === 0 && getOre()) {
      plot.smithySmeltEndAt = now + SMELT_DURATION_MS
    }

    if (plot.smithySmeltEndAt! > 0 && plot.smithyBurnEndAt! > now && getOre()) {
      const remaining = plot.smithySmeltEndAt! - now
      const frac = 1 - Math.max(0, remaining / SMELT_DURATION_MS)
      progressFill.width = progressBarW * frac
      const r = Math.floor(Phaser.Math.Linear(0x55, 0xFF, frac))
      const g = Math.floor(Phaser.Math.Linear(0x4a, 0x6A, frac))
      const b = Math.floor(Phaser.Math.Linear(0x3e, 0x1A, frac))
      arrow.setTint((r << 16) | (g << 8) | b)
    } else {
      progressFill.width = 0
      arrow.clearTint()
    }

    if (plot.smithyBurnEndAt! > now && plot.smithyBurnDuration! > 0) {
      const remaining = plot.smithyBurnEndAt! - now
      const frac = Math.max(0, remaining / plot.smithyBurnDuration!)
      const fillH = fuelBarH * frac
      fuelBarFill.setSize(fuelBarW, fillH)
      fuelBarFill.setPosition(fuelBarX, fuelBarBottom - fillH / 2)
    } else {
      fuelBarFill.setSize(fuelBarW, 0)
    }
  }

  return { bindings, slotVisuals, update }
}