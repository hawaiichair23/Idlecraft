import Phaser from 'phaser'
import { COLORS } from '../colors'
import { state } from '../game/state'
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

  const w = scene.cameras.main.width
  const h = scene.cameras.main.height

  const SLOT = 48
  const GAP = 16
  const SYMBOL = 16
  const layoutW = SLOT * 3 + (GAP + SYMBOL + GAP) * 2

  const startX = centerX - layoutW / 2
  const slot1X = startX + SLOT / 2
  const plusX = slot1X + SLOT / 2 + GAP + SYMBOL / 2
  const slot2X = plusX + SYMBOL / 2 + GAP + SLOT / 2
  const arrowX = slot2X + SLOT / 2 + GAP + SYMBOL / 2
  const slot3X = arrowX + SYMBOL / 2 + GAP + SLOT / 2

  const plusText = scene.add.bitmapText(plusX, centerY + 4, 'main', '+', 24).setOrigin(0.5, 0.5).setTint(COLORS.craftSymbol)
  const arrowSprite = scene.add.sprite(arrowX, centerY, 'arrow_right').setScale(2).setTint(COLORS.craftSymbol)
  container?.add([plusText, arrowSprite])

  // ensure craftInputs is initialized
  const plot = state.plots[plotIndex]
  if (!plot.craftInputs) plot.craftInputs = [null, null]

  const ui = scene.scene.get('UI') as UI
  const dc = ui.getDragController()

  // ---- two input slots ---------------------------------------------------
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? slot1X : slot2X
    const getStack = () => state.plots[plotIndex].craftInputs![i]
    const slotImg = makeSlotImage(scene, { x, y: centerY, peek: getStack, tooltipOffsetY: -38 })
    container?.add(slotImg)
    const setStack = (s: ItemStack | null) => { state.plots[plotIndex].craftInputs![i] = s }
    slotVisuals.push({ x, y: centerY, getStack, icon: null, count: null, lastType: null, lastCount: 0, container })

    const binding = makeStorageBinding({ x, y: centerY }, getStack, setStack, { onChange: () => {} })
    bindings.push(binding)
    dc.register(binding)

    slotImg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if ((p.event as MouseEvent).shiftKey) { onSlotShiftClick(binding); return }
      dc.handleSlotClick(binding, p)
    })
  }

  // ---- output slot (virtual — shows preview, take() consumes inputs) -----
  {
    const x = slot3X
    const getStack = () => previewCraft(plotIndex)
    const slotImg = makeSlotImage(scene, { x, y: centerY, peek: getStack, tooltipOffsetY: -38 })
    container?.add(slotImg)
    slotVisuals.push({ x, y: centerY, getStack, icon: null, count: null, lastType: null, lastCount: 0, container })

    const outputBinding: SlotBinding = {
      getScreenPos: () => ({ x, y: centerY }),
      peek: () => getStack(),
      accepts: () => false,
      take: () => {
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
      .setTint(0xFFFFFF)
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

  return { bindings, slotVisuals, onCleanup }
}
