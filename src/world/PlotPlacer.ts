import Phaser from 'phaser'
import { COLORS, FONT } from '../colors'
import { state } from '../game/state'
import { createPlot, type PlotView, type PlotClickDeps } from './plotFactory'
import { PLOT_SIZE, PLOT_SPACING } from './plotConstants'

export interface DeedBlockers {
  obstacles: { x: number; y: number; w: number; h: number }[]
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

function gridPhase(plotViews: PlotView[]): { px: number; py: number } {
  if (plotViews.length === 0) return { px: 0, py: 0 }
  return { px: mod(plotViews[0].x, PLOT_SPACING), py: mod(plotViews[0].y, PLOT_SPACING) }
}

function gridCells(centerX: number, centerY: number, cols: number, rows: number, phase: { px: number; py: number }): { x: number; y: number }[] {
  const totalW = (cols - 1) * PLOT_SPACING
  const totalH = (rows - 1) * PLOT_SPACING
  const startX = Math.round((centerX - totalW / 2 - phase.px) / PLOT_SPACING) * PLOT_SPACING + phase.px
  const startY = Math.round((centerY - totalH / 2 - phase.py) / PLOT_SPACING) * PLOT_SPACING + phase.py
  const cells: { x: number; y: number }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ x: startX + c * PLOT_SPACING, y: startY + r * PLOT_SPACING })
    }
  }
  return cells
}

function cellBlocked(x: number, y: number, plotViews: PlotView[], blockers: DeedBlockers): boolean {
  for (const v of plotViews) {
    if (Math.abs(x - v.x) < PLOT_SIZE && Math.abs(y - v.y) < PLOT_SIZE) return true
  }
  for (const s of state.worldStructures) {
    if (Math.abs(x - s.x) < PLOT_SIZE && Math.abs(y - s.y) < PLOT_SIZE) return true
  }
  const half = PLOT_SIZE / 2
  for (const o of blockers.obstacles) {
    if (x + half > o.x && x - half < o.x + o.w && y + half > o.y && y - half < o.y + o.h) return true
  }
  return false
}

export function deedGridPlaceable(centerX: number, centerY: number, cols: number, rows: number, plotViews: PlotView[], blockers: DeedBlockers): boolean {
  for (const cell of gridCells(centerX, centerY, cols, rows, gridPhase(plotViews))) {
    if (cellBlocked(cell.x, cell.y, plotViews, blockers)) return false
  }
  return true
}

export function stampDeedGrid(
  scene: Phaser.Scene,
  centerX: number,
  centerY: number,
  cols: number,
  rows: number,
  plotViews: PlotView[],
  blockers: DeedBlockers,
  deps: PlotClickDeps,
): boolean {
  const cells = gridCells(centerX, centerY, cols, rows, gridPhase(plotViews))
  for (const cell of cells) {
    if (cellBlocked(cell.x, cell.y, plotViews, blockers)) return false
  }
  for (const cell of cells) {
    createPlot(scene, cell.x, cell.y, plotViews, deps)
  }
  return true
}

let ghostRT: Phaser.GameObjects.RenderTexture | null = null
let ghostRect: Phaser.GameObjects.Rectangle | null = null
let ghostTag: Phaser.GameObjects.BitmapText | null = null

export function drawDeedGhost(scene: Phaser.Scene, centerX: number, centerY: number, cols: number, rows: number, placeable: boolean, plotViews: PlotView[]) {
  const cam = scene.cameras.main
  const view = cam.worldView
  if (!ghostRT) {
    ghostRT = scene.add.renderTexture(view.x, view.y, view.width, view.height)
      .setOrigin(0, 0)
      .setAlpha(0.5)
      .setDepth(900000)
  }
  if (!ghostRect) {
    ghostRect = scene.add.rectangle(0, 0, PLOT_SIZE, PLOT_SIZE).setOrigin(0.5, 0.5).setVisible(false)
  }
  if (!ghostTag) {
    ghostTag = scene.add.bitmapText(0, 0, 'main', '$', FONT.cost)
      .setOrigin(0.5, 0.5)
      .setTint(COLORS.plotPriceTag)
      .setVisible(false)
  }
  if (ghostRT.width !== view.width || ghostRT.height !== view.height) ghostRT.setSize(view.width, view.height)
  ghostRT.setPosition(view.x, view.y)
  ghostRT.clear()
  ghostRect.setFillStyle(placeable ? COLORS.plotFill : 0xcc3333)
  ghostRect.setStrokeStyle(2, placeable ? COLORS.plotBorder : 0x882222)
  for (const cell of gridCells(centerX, centerY, cols, rows, gridPhase(plotViews))) {
    ghostRT.draw(ghostRect, cell.x - view.x, cell.y - view.y)
    ghostRT.draw(ghostTag, cell.x - view.x, cell.y - view.y)
  }
  ghostRT.render()
}

export function clearDeedGhost() {
  if (ghostRT) { ghostRT.destroy(); ghostRT = null }
  if (ghostRect) { ghostRect.destroy(); ghostRect = null }
  if (ghostTag) { ghostTag.destroy(); ghostTag = null }
}
