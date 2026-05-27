import Phaser from 'phaser'
import { COLORS } from '../colors'
import { state, isBag, BUILDINGS, getEffectiveTickMs } from '../game/state'
import { type ItemStack } from '../items/types'
import { consumeCraft, previewCraft } from '../items/recipes'
import { type SlotBinding } from '../ui/SlotBinding'
import { makeSlotImage, makeStorageBinding } from '../ui/slotFactory'
import type { SlotVisual } from './InteriorTypes'
import { UI_INVENTORY_BAR_HEIGHT } from './UI'
import type { UI } from './UI'

// ---------------------------------------------------------------------------
// WorkshopInterior — workshop panel (2 input slots + arrow + virtual output)
// plus the in-corner NPC who triggers dialogue lines.
// No panel — the parent Interior scene provides the frame.
// ---------------------------------------------------------------------------

export interface WorkshopInteriorHandle {
  bindings: SlotBinding[]
  slotVisuals: SlotVisual[]
  update: () => void
  onCleanup: () => void
}

export function buildWorkshopInterior(
  scene: Phaser.Scene,
  plotIndex: number,
  centerX: number,
  centerY: number,
  onSlotShiftClick: (binding: SlotBinding) => void,
  onCraftAllShiftClick: () => void,
  container?: Phaser.GameObjects.Container,
): WorkshopInteriorHandle {
  const bindings: SlotBinding[] = []
  const slotVisuals: SlotVisual[] = []

  const h = scene.cameras.main.height

  const plot = state.plots[plotIndex]
  const isL2 = plot.level >= 2

  const SLOT = 48
  const GAP = 16
  const SYMBOL = 16

  // Input slot positions (screen coords), plus the arrow and output positions.
  // Level 1: a row of two inputs joined by a '+'. Level 2: a 2x2 grid of four
  // inputs, no '+'. Both feed a single output to the right via the arrow.
  let inputPositions: { x: number; y: number }[]
  let arrowX: number
  let outputX: number

  if (isL2) {
    const GRID_GAP = 4
    const gridW = SLOT * 2 + GRID_GAP
    const layoutW = gridW + GAP + SYMBOL + GAP + SLOT
    const startX = centerX - layoutW / 2
    const colL = startX + SLOT / 2
    const colR = colL + SLOT + GRID_GAP
    const rowT = centerY - (SLOT + GRID_GAP) / 2
    const rowB = centerY + (SLOT + GRID_GAP) / 2
    inputPositions = [
      { x: colL, y: rowT }, { x: colR, y: rowT },
      { x: colL, y: rowB }, { x: colR, y: rowB },
    ]
    arrowX = colR + SLOT / 2 + GAP + SYMBOL / 2
    outputX = arrowX + SYMBOL / 2 + GAP + SLOT / 2
  } else {
    const layoutW = SLOT * 3 + (GAP + SYMBOL + GAP) * 2
    const startX = centerX - layoutW / 2
    const slot1X = startX + SLOT / 2
    const plusX = slot1X + SLOT / 2 + GAP + SYMBOL / 2
    const slot2X = plusX + SYMBOL / 2 + GAP + SLOT / 2
    arrowX = slot2X + SLOT / 2 + GAP + SYMBOL / 2
    outputX = arrowX + SYMBOL / 2 + GAP + SLOT / 2
    inputPositions = [{ x: slot1X, y: centerY }, { x: slot2X, y: centerY }]
    const plusText = scene.add.bitmapText(plusX, centerY + 4, 'main', '+', 24).setOrigin(0.5, 0.5).setTint(COLORS.craftSymbol)
    container?.add(plusText)
  }

  const arrowSprite = scene.add.sprite(arrowX, centerY, 'arrow_right').setScale(2).setTint(COLORS.craftSymbol)
  container?.add(arrowSprite)

  // ensure craftInputs is initialized
  if (!plot.craftInputs) plot.craftInputs = [null, null]

  const ui = scene.scene.get('UI') as UI
  const dc = ui.getDragController()

  // ---- input slots -------------------------------------------------------
  for (let i = 0; i < inputPositions.length; i++) {
    const { x, y } = inputPositions[i]
    const getStack = () => state.plots[plotIndex].craftInputs![i]
    const slotImg = makeSlotImage(scene, { x, y, peek: getStack, tooltipOffsetY: -38 })
    container?.add(slotImg)
    const setStack = (s: ItemStack | null) => { state.plots[plotIndex].craftInputs![i] = s }
    slotVisuals.push({ x, y, getStack, icon: null, count: null, lastType: null, lastCount: 0, container })

    const binding = makeStorageBinding({ x, y }, getStack, setStack, { onChange: () => {} })
    // bags can't be crafting inputs — reject them
    const baseAccepts = binding.accepts
    binding.accepts = (itemType) => !isBag(itemType) && baseAccepts(itemType)
    bindings.push(binding)
    dc.register(binding)

    slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if ((p.event as MouseEvent).shiftKey) { onSlotShiftClick(binding); return }
      dc.handleSlotClick(binding, p)
    })
  }

  // ---- output slot --------------------------------------------------------
  // Shows the real stored craftOutput (filled by the auto-craft tick when pipes
  // feed the workshop) if present; otherwise shows the live craft preview.
  // Taking pulls the stored output first, else consumes inputs to craft once.
  {
    const x = outputX
    const getStack = () => state.plots[plotIndex].craftOutput ?? previewCraft(plotIndex)
    const slotImg = makeSlotImage(scene, { x, y: centerY, peek: getStack, tooltipOffsetY: -38 })
    container?.add(slotImg)
    slotVisuals.push({ x, y: centerY, getStack, icon: null, count: null, lastType: null, lastCount: 0, container })

    const outputBinding: SlotBinding = {
      getScreenPos: () => ({ x, y: centerY }),
      peek: () => getStack(),
      accepts: () => false,
      take: () => {
        const plot = state.plots[plotIndex]
        if (plot.craftOutput) {
          const out = plot.craftOutput
          plot.craftOutput = null
          if (out.type === 'bread') state.hasMadeBread = true
          scene.events.emit('bread-crafted')
          return out
        }
        const result = consumeCraft(plotIndex)
        if (result) scene.events.emit('bread-crafted')
        return result
      },
      offer: () => 0,
      restore: () => 0,
    }
    bindings.push(outputBinding)
    dc.register(outputBinding)

    slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if ((p.event as MouseEvent).shiftKey) { onCraftAllShiftClick(); return }
      dc.handleSlotClick(outputBinding, p)
    })
  }

  // ---- NPC ---------------------------------------------------------------
  const NPC_SCALE = 4
  const SPRITE_PX = 8 * NPC_SCALE
  const margin = 16
  const npcX = margin + SPRITE_PX / 2
  const npcY = h - UI_INVENTORY_BAR_HEIGHT - margin - SPRITE_PX / 2
  scene.add.sprite(npcX, npcY, 'npc_workshop').setScale(NPC_SCALE)
  const npcAnchor = { x: npcX, y: npcY - SPRITE_PX / 2 - 12 }

  let npcText: Phaser.GameObjects.BitmapText | null = null
  let npcTextTimer: Phaser.Time.TimerEvent | null = null

  const showDialogue = (text: string) => {
    if (npcTextTimer) { npcTextTimer.remove(false); npcTextTimer = null }
    if (npcText) { npcText.destroy(); npcText = null }

    const TYPE_MS_PER_CHAR = 40
    npcText = scene.add.bitmapText(npcAnchor.x, npcAnchor.y, 'mainSmall', '', 14)
      .setOrigin(0, 1)
      .setTint(COLORS.white)
      .setMaxWidth(380)

    let i = 0
    npcTextTimer = scene.time.addEvent({
      delay: TYPE_MS_PER_CHAR,
      loop: true,
      callback: () => {
        if (!npcText) return
        i++
        npcText.setText(text.slice(0, i))
        if (i >= text.length) {
          npcTextTimer?.remove(false)
          npcTextTimer = null
        }
      },
    })
  }

  if (!state.workshopFirstLineSeen) {
    state.workshopFirstLineSeen = true
    showDialogue(`I DON'T RECKON YOU COULD MAKE ME SOME BREAD?`)
  }

  const onBreadCrafted = () => {
    if (state.workshopSecondLineSeen) return
    if (!state.hasMadeBread) return
    state.workshopSecondLineSeen = true
    showDialogue('THANK YOU STRANGER. MY FRIEND THE SHOPKEEPER IN THE SETTLEMENT NORTH OF HERE HAS A TOOL FOR YOU.')
  }
  scene.events.on('bread-crafted', onBreadCrafted)

  const onCleanup = () => {
    if (npcTextTimer) { npcTextTimer.remove(false); npcTextTimer = null }
    npcText = null
    scene.events.off('bread-crafted', onBreadCrafted)
  }

  // Arrow fills dark→bright yellow over the craft interval while a craft is
  // active (valid recipe + room in output). Mirrors the mill/well arrow.
  const update = () => {
    const plot = state.plots[plotIndex]
    const preview = previewCraft(plotIndex)
    // a craft is "active" only when there's a valid recipe AND output room
    let active = preview !== null
    if (active && preview) {
      const out = plot.craftOutput
      if (out && out.type !== preview.type) active = false
    }
    if (!active) {
      arrowSprite.setTint(COLORS.craftSymbol)
      return
    }
    const craftMs = getEffectiveTickMs(BUILDINGS.workshop.tickMs, plot.level)
    const frac = ((Date.now() - plot.lastItemTickAt) % craftMs) / craftMs
    const r = Math.floor(Phaser.Math.Linear(0x55, 0xFF, frac))
    const g = Math.floor(Phaser.Math.Linear(0x4a, 0xD7, frac))
    const b = Math.floor(Phaser.Math.Linear(0x3e, 0x00, frac))
    arrowSprite.setTint((r << 16) | (g << 8) | b)
  }

  return { bindings, slotVisuals, update, onCleanup }
}
