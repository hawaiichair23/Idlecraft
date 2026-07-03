import Phaser from 'phaser'
import { COLORS, FONT } from '../colors'

interface DialogueOption {
  label: string
  act: () => void
}

export interface DialogueLine {
  text: string
  speaker?: string
  options?: DialogueOption[]
}

const DEPTH = 13000
const PANEL_H = 180
const SIDE_PAD = 24
const TOP_PAD = 16
const BORDER = 2
const CHAR_INTERVAL_MS = 30
const MAX_OPTIONS = 4
const OPTION_ROW_H = 24
const OPTION_ROW_GAP = 2
const OPTION_ROW_W = 240

export class DialogueBox {
  private scene: Phaser.Scene
  private panelX: number
  private panelY: number
  private panelW: number
  private leftEdge: number
  private rightEdge: number

  private border: Phaser.GameObjects.Rectangle
  private borderGap: Phaser.GameObjects.Rectangle
  private innerBorder: Phaser.GameObjects.Rectangle
  private bg: Phaser.GameObjects.Rectangle
  private speakerText: Phaser.GameObjects.BitmapText
  private bodyText: Phaser.GameObjects.BitmapText
  private continueIndicator: Phaser.GameObjects.BitmapText
  private optionRowBgs: Phaser.GameObjects.Rectangle[] = []
  private optionRowLabels: Phaser.GameObjects.BitmapText[] = []
  private optionCursor: Phaser.GameObjects.Sprite | null = null
  private selectedOption = 0

  private lines: DialogueLine[] = []
  private lineIdx = 0
  private revealChars = 0
  private typing = false
  private accumMs = 0
  private open = false
  private options: DialogueOption[] = []

  private keyHandler: ((event: KeyboardEvent) => void) | null = null
  private pointerHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null
  private ignoreInputUntil = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    const w = scene.scale.width
    const h = scene.scale.height
    this.panelW = w
    this.panelX = w / 2
    this.panelY = h - PANEL_H
    this.leftEdge = this.panelX - this.panelW / 2
    this.rightEdge = this.panelX + this.panelW / 2

    this.border = scene.add.rectangle(this.panelX, this.panelY, this.panelW, PANEL_H, 0xD0D0D0, 1)
      .setOrigin(0.5, 0).setDepth(DEPTH).setVisible(false)
    this.borderGap = scene.add.rectangle(this.panelX, this.panelY + BORDER, this.panelW - BORDER * 2, PANEL_H - BORDER * 2, 0x100010, 1)
      .setOrigin(0.5, 0).setDepth(DEPTH + 1).setVisible(false)
    this.innerBorder = scene.add.rectangle(this.panelX, this.panelY + BORDER + 3, this.panelW - BORDER * 2 - 6, PANEL_H - BORDER * 2 - 6, 0xD0D0D0, 1)
      .setOrigin(0.5, 0).setDepth(DEPTH + 2).setVisible(false)
    this.bg = scene.add.rectangle(this.panelX, this.panelY + BORDER + 5, this.panelW - BORDER * 2 - 10, PANEL_H - BORDER * 2 - 10, 0x100010, 0.94)
      .setOrigin(0.5, 0).setDepth(DEPTH + 3).setVisible(false)

    this.speakerText = scene.add.bitmapText(this.leftEdge + SIDE_PAD, this.panelY + TOP_PAD, 'main', '', FONT.name)
      .setOrigin(0, 0).setTint(COLORS.white).setDepth(DEPTH + 4).setVisible(false)

    this.bodyText = scene.add.bitmapText(this.panelX, this.panelY + TOP_PAD + 28, 'main', '', FONT.name)
      .setOrigin(0.5, 0).setCenterAlign().setMaxWidth(this.panelW - SIDE_PAD * 2).setTint(COLORS.uiText)
      .setDepth(DEPTH + 4).setVisible(false)

    this.continueIndicator = scene.add.bitmapText(this.rightEdge - SIDE_PAD, this.panelY + PANEL_H - TOP_PAD, 'main', 'v', FONT.name)
      .setOrigin(1, 1).setTint(COLORS.white).setDepth(DEPTH + 4).setVisible(false)

    for (let i = 0; i < MAX_OPTIONS; i++) {
      const rowBg = scene.add.rectangle(0, 0, OPTION_ROW_W, OPTION_ROW_H, 0x1A001A, 0)
        .setOrigin(0.5, 0).setDepth(DEPTH + 5).setInteractive().setVisible(false)
      rowBg.on('pointerover', () => {
        if (this.open) {
          rowBg.setFillStyle(0x3A2040, 0.9)
          this.selectedOption = i
          this.positionCursor(i)
        }
      })
      rowBg.on('pointerout', () => rowBg.setFillStyle(0x1A001A, 0))
      rowBg.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation()
        const opt = this.options[i]
        if (opt) { this.close(); opt.act() }
      })
      this.optionRowBgs.push(rowBg)
      const label = scene.add.bitmapText(0, 0, 'main', '', FONT.desc)
        .setOrigin(0.5, 0.5).setTint(COLORS.uiText).setDepth(DEPTH + 6).setVisible(false)
      this.optionRowLabels.push(label)
    }
    this.optionCursor = scene.add.sprite(0, 0, 'dialogue_cursor').setScale(2).setDepth(DEPTH + 7).setVisible(false)
  }

  isOpen(): boolean { return this.open }

  openLines(lines: DialogueLine[]) {
    if (lines.length === 0) return
    this.lines = lines
    this.lineIdx = 0
    this.open = true
    this.ignoreInputUntil = this.scene.time.now + 100
    this.setWorldInputEnabled(false)
    this.showLine(0)
    this.attachInputListeners()
  }

  private setWorldInputEnabled(enabled: boolean) {
    const ow = this.scene.scene.get('Overworld')
    if (!ow) return
    ow.input.enabled = enabled
    const kb = ow.input.keyboard
    if (kb) {
      kb.enabled = enabled
      kb.resetKeys()
    }
  }

  private attachInputListeners() {
    if (this.keyHandler || this.pointerHandler) return
    this.keyHandler = (event: KeyboardEvent) => {
      if (this.scene.time.now < this.ignoreInputUntil) return
      if (this.options.length > 0) {
        const count = this.options.length
        const isGrid = count === 4
        if (event.key === 'ArrowUp') {
          if (isGrid) this.selectOption(this.selectedOption >= 2 ? this.selectedOption - 2 : this.selectedOption)
          else this.selectOption(Math.max(0, this.selectedOption - 1))
          return
        }
        if (event.key === 'ArrowDown') {
          if (isGrid) this.selectOption(this.selectedOption < 2 ? this.selectedOption + 2 : this.selectedOption)
          else this.selectOption(Math.min(count - 1, this.selectedOption + 1))
          return
        }
        if (event.key === 'ArrowLeft' && isGrid) {
          this.selectOption(this.selectedOption % 2 === 1 ? this.selectedOption - 1 : this.selectedOption)
          return
        }
        if (event.key === 'ArrowRight' && isGrid) {
          this.selectOption(this.selectedOption % 2 === 0 && this.selectedOption + 1 < count ? this.selectedOption + 1 : this.selectedOption)
          return
        }
        if (event.key === 'Enter' || event.key === 'e' || event.key === 'E') {
          const opt = this.options[this.selectedOption]
          if (opt) { this.close(); opt.act() }
          return
        }
        return
      }
      this.advance()
    }
    this.pointerHandler = () => {
      if (this.scene.time.now < this.ignoreInputUntil) return
      if (this.options.length > 0) return
      this.advance()
    }
    this.scene.input.keyboard!.on('keydown', this.keyHandler)
    this.scene.input.on('pointerdown', this.pointerHandler)
  }

  private selectOption(idx: number) {
    this.selectedOption = idx
    for (let i = 0; i < this.optionRowBgs.length; i++) {
      if (i < this.options.length) {
        this.optionRowBgs[i].setFillStyle(i === idx ? 0x3A2040 : 0x1A001A, i === idx ? 0.9 : 0)
      }
    }
    this.positionCursor(idx)
  }

  private detachInputListeners() {
    if (this.keyHandler) {
      this.scene.input.keyboard!.off('keydown', this.keyHandler)
      this.keyHandler = null
    }
    if (this.pointerHandler) {
      this.scene.input.off('pointerdown', this.pointerHandler)
      this.pointerHandler = null
    }
  }

  private showLine(idx: number) {
    const line = this.lines[idx]
    if (!line) { this.close(); return }
    this.revealChars = 0
    this.typing = true
    this.accumMs = 0
    this.options = []

    this.border.setVisible(true)
    this.borderGap.setVisible(true)
    this.innerBorder.setVisible(true)
    this.bg.setVisible(true)
    this.bodyText.setText('').setVisible(true)
    if (line.speaker) {
      this.speakerText.setText(line.speaker).setVisible(true)
    } else {
      this.speakerText.setVisible(false)
    }
    this.continueIndicator.setVisible(false)
    for (const row of this.optionRowBgs) row.setVisible(false)
    for (const label of this.optionRowLabels) label.setVisible(false)
    if (this.optionCursor) this.optionCursor.setVisible(false)
  }

  update(dt: number) {
    if (!this.open || !this.typing) return
    const line = this.lines[this.lineIdx]
    if (!line) return
    this.accumMs += dt
    const oldReveal = this.revealChars
    while (this.accumMs >= CHAR_INTERVAL_MS && this.revealChars < line.text.length) {
      this.revealChars++
      this.accumMs -= CHAR_INTERVAL_MS
    }
    if (this.revealChars !== oldReveal) {
      this.bodyText.setText(line.text.substring(0, this.revealChars))
    }
    if (this.revealChars >= line.text.length) {
      this.typing = false
      this.onLineRevealed()
    }
  }

  private onLineRevealed() {
    const line = this.lines[this.lineIdx]
    if (!line) return
    if (line.options && line.options.length > 0) {
      this.options = line.options
      this.layoutOptions()
    } else {
      this.continueIndicator.setVisible(true)
    }
  }

  private layoutOptions() {
    const count = this.options.length
    this.selectedOption = 0
    const isGrid = count === 4
    const cols = isGrid ? 2 : 1
    const rows = Math.ceil(count / cols)
    const totalW = isGrid ? OPTION_ROW_W * 2 + 16 : OPTION_ROW_W
    const totalH = rows * OPTION_ROW_H + (rows - 1) * OPTION_ROW_GAP
    const startY = this.panelY + PANEL_H - TOP_PAD - totalH - 20
    const startX = this.panelX - totalW / 2 + OPTION_ROW_W / 2

    for (let i = 0; i < this.optionRowBgs.length; i++) {
      const bg = this.optionRowBgs[i]
      const label = this.optionRowLabels[i]
      if (i < count) {
        const col = isGrid ? i % 2 : 0
        const row = isGrid ? Math.floor(i / 2) : i
        const rowX = startX + col * (OPTION_ROW_W + 16)
        const rowY = startY + row * (OPTION_ROW_H + OPTION_ROW_GAP)
        bg.setPosition(rowX, rowY).setVisible(true)
        bg.setFillStyle(0x1A001A, 0)
        label.setText(this.options[i].label).setPosition(rowX, rowY + OPTION_ROW_H / 2).setVisible(true)
      } else {
        bg.setVisible(false)
        label.setVisible(false)
      }
    }
    this.positionCursor(0)
  }

  private positionCursor(idx: number) {
    if (!this.optionCursor || idx >= this.options.length) return
    const rowBg = this.optionRowBgs[idx]
    this.optionCursor.setPosition(rowBg.x - OPTION_ROW_W / 2 - 16, rowBg.y + OPTION_ROW_H / 2).setVisible(true)
  }

  advance() {
    if (!this.open) return
    if (this.typing) {
      const line = this.lines[this.lineIdx]
      if (line) {
        this.revealChars = line.text.length
        this.bodyText.setText(line.text)
        this.typing = false
        this.onLineRevealed()
      }
      return
    }
    if (this.options.length > 0) return
    if (this.lineIdx + 1 >= this.lines.length) {
      this.close()
    } else {
      this.lineIdx++
      this.showLine(this.lineIdx)
    }
  }

  close() {
    this.detachInputListeners()
    this.setWorldInputEnabled(true)
    this.open = false
    this.lines = []
    this.options = []
    this.lineIdx = 0
    this.typing = false
    this.border.setVisible(false)
    this.borderGap.setVisible(false)
    this.innerBorder.setVisible(false)
    this.bg.setVisible(false)
    this.speakerText.setVisible(false)
    this.bodyText.setVisible(false)
    this.continueIndicator.setVisible(false)
    for (const row of this.optionRowBgs) row.setVisible(false)
    for (const label of this.optionRowLabels) label.setVisible(false)
    if (this.optionCursor) this.optionCursor.setVisible(false)
  }
}
