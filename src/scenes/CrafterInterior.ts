import Phaser from 'phaser'
import { COLORS } from '../colors'
import { state } from '../game/state'
import { type ItemStack } from '../items/types'
import { consumeCraft, previewCraft } from '../items/recipes'
import { type SlotBinding } from '../ui/SlotBinding'
import { makeSlotImage, makeStorageBinding } from '../ui/slotFactory'
import type { SlotVisual } from './InteriorTypes'
import { UI_BAR_HEIGHT, UI_INVENTORY_BAR_HEIGHT } from './UI'
import type { UI } from './UI'

// ---------------------------------------------------------------------------
// CrafterInterior — crafter panel (2 input slots + arrow + virtual output)
// plus the in-corner NPC who triggers dialogue lines.
// ---------------------------------------------------------------------------

export interface CrafterInteriorHandle {
  bindings: SlotBinding[]
  slotVisuals: SlotVisual[]
  onCleanup: () => void
}

export function buildCrafterInterior(
  scene: Phaser.Scene,
  plotIndex: number,
  onSlotShiftClick: (binding: SlotBinding) => void,
  onCraftAllShiftClick: () => void,
): CrafterInteriorHandle {
  const bindings: SlotBinding[] = []
  const slotVisuals: SlotVisual[] = []

  const w = scene.cameras.main.width
  const h = scene.cameras.main.height

  // ---- crafter panel -----------------------------------------------------
  const playAreaTop = UI_BAR_HEIGHT
  const playAreaH = h - UI_BAR_HEIGHT - UI_INVENTORY_BAR_HEIGHT
  const panelY = playAreaTop + playAreaH / 2

  const SLOT = 48
  const GAP = 16
  const SYMBOL = 16
  const PAD_X = 24
  const PAD_Y = 28
  const layoutW = SLOT * 3 + (GAP + SYMBOL + GAP) * 2
  const panelW = layoutW + PAD_X * 2
  const panelH = SLOT + PAD_Y * 2

  scene.add.nineslice(w / 2, panelY, 'menu-bg', undefined, panelW, panelH, 16, 16, 16, 16)
    .setTint(COLORS.interiorPanel)
  scene.add.rectangle(w / 2, panelY, panelW, panelH)
    .setStrokeStyle(2, 0x000000).setFillStyle()

  const startX = w / 2 - layoutW / 2
  const slot1X = startX + SLOT / 2
  const plusX = slot1X + SLOT / 2 + GAP + SYMBOL / 2
  const slot2X = plusX + SYMBOL / 2 + GAP + SLOT / 2
  const arrowX = slot2X + SLOT / 2 + GAP + SYMBOL / 2
  const slot3X = arrowX + SYMBOL / 2 + GAP + SLOT / 2

  scene.add.bitmapText(plusX, panelY + 4, 'main', '+', 24).setOrigin(0.5, 0.5).setTint(COLORS.craftSymbol)
  scene.add.sprite(arrowX, panelY, 'arrow_right').setScale(2).setTint(COLORS.craftSymbol)

  // ensure craftInputs is initialized
  const plot = state.plots[plotIndex]
  if (!plot.craftInputs) plot.craftInputs = [null, null]

  const ui = scene.scene.get('UI') as UI
  const dc = ui.getDragController()

  // ---- two input slots ---------------------------------------------------
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? slot1X : slot2X
    const slotImg = makeSlotImage(scene, { x, y: panelY })
    const getStack = () => state.plots[plotIndex].craftInputs![i]
    const setStack = (s: ItemStack | null) => { state.plots[plotIndex].craftInputs![i] = s }
    slotVisuals.push({ x, y: panelY, getStack, icon: null, count: null, lastType: null, lastCount: 0 })

    const binding = makeStorageBinding({ x, y: panelY }, getStack, setStack, { onChange: () => {} })
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
    const slotImg = makeSlotImage(scene, { x, y: panelY })
    const getStack = () => previewCraft(plotIndex)
    slotVisuals.push({ x, y: panelY, getStack, icon: null, count: null, lastType: null, lastCount: 0 })

    const outputBinding: SlotBinding = {
      getScreenPos: () => ({ x, y: panelY }),
      peek: () => getStack(),
      accepts: () => false,    // read-only
      take: () => {
        const result = consumeCraft(plotIndex)
        // notify Interior that a craft happened so it can fire the dialogue check
        if (result) scene.events.emit('bread-crafted')
        return result
      },
      offer: () => 0,
      restore: () => 0,        // can't restore into a virtual preview
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
  scene.add.sprite(npcX, npcY, 'npc_crafter').setScale(NPC_SCALE)
  const npcAnchor = { x: npcX, y: npcY - SPRITE_PX / 2 - 12 }

  // dialogue state lives in this closure — destroyed on cleanup
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

  // first-line trigger
  if (!state.crafterFirstLineSeen) {
    state.crafterFirstLineSeen = true
    showDialogue('OH DARN. I FORGOT HOW TO MAKE BREAD AGAIN.')
  }

  // listen for bread-crafted (Interior emits this after a successful consume)
  const onBreadCrafted = () => {
    if (state.crafterSecondLineSeen) return
    if (!state.hasMadeBread) return
    state.crafterSecondLineSeen = true
    showDialogue('THANK YOU TRAVELER. MY FRIEND THE SHOPKEEPER IN THE TOWN NORTH OF HERE HAS A TOOL FOR YOU.')
  }
  scene.events.on('bread-crafted', onBreadCrafted)

  const onCleanup = () => {
    if (npcTextTimer) { npcTextTimer.remove(false); npcTextTimer = null }
    npcText = null
    scene.events.off('bread-crafted', onBreadCrafted)
  }

  return { bindings, slotVisuals, onCleanup }
}
