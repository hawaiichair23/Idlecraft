// InteriorBackdrop.ts — shared backdrop renderer for indoor scenes.
// Draws back wall + windows + floor + angled side walls in perspective.
// Used by WalkableInterior, Land Office, Nursery, and any future interior
// that wants the "stepped into a room" look.
//
// Callers add their own content (player, items, NPCs, panels, shop UI) on
// top of the returned floor bounds.

import Phaser from 'phaser'
import { UI_BAR_HEIGHT } from './UI'

export interface InteriorBackdropConfig {
  floorColor: number
  wallColor: number
  wallHeightFraction?: number  // defaults to DEFAULT_WALL_HEIGHT
  skyColor?: number            // pane color; defaults to pastel pink
  openSide?: 'left' | 'right'  // omit a side wall and its window
  // Optional repeating floor texture key (baked from ALL_SPRITES, e.g.
  // 'floor_wood'). When set, the floor tiles this texture instead of a flat
  // floorColor fill. floorColor still applies as the fallback when omitted.
  floorTexture?: string
  floorTextureScale?: number   // pixel scale of each tile; defaults to 2
}

export interface InteriorBackdropBounds {
  floorTop: number
  floorH: number
  floorBottom: number
  w: number
  h: number
}

// ---- abandoned house colors ----
// Edit these two CSS hex strings to recolor the abandoned house interior.
// Paste any '#RRGGBB' value (e.g. from a color picker). They're converted to
// the numeric form Phaser needs just below.
const abandonedHouseFloor = '#6c5e58'   // floor 
const abandonedHouseWall = '#2e201d'    // walls 

export const ABANDONED_HOUSE_FLOOR_COLOR = parseInt(abandonedHouseFloor.slice(1), 16)
export const ABANDONED_HOUSE_WALL_COLOR = parseInt(abandonedHouseWall.slice(1), 16)

// ---- palettes ----
// Named palettes for each shop's interior. Adding a new shop = add an entry
// here and pass it to buildInteriorBackdrop. Floor/wall colors should reflect
// the building's exterior identity (warm for Land Office, dusty grey for
// Tool Shop, etc).
export const INTERIOR_PALETTES = {
  toolShop:       { floorColor: 0x8B6240, wallColor: 0x2E2014 },
  landOffice:     { floorColor: 0xB07A45, wallColor: 0x4A2D14 },
  nursery:        { floorColor: 0x8E8550, wallColor: 0x3A3220 },
  abandonedHouse: { floorColor: ABANDONED_HOUSE_FLOOR_COLOR, wallColor: ABANDONED_HOUSE_WALL_COLOR },
  longHouse:      { floorColor: 0x5A5A5A, wallColor: 0x2A2A2A },
  generalStore:   { floorColor: 0x6E7A4A, wallColor: 0x2A2E1A },
  church:         { floorColor: 0x2A2A2E, wallColor: 0x0E0E12, skyColor: 0xFF707F },
  mill:           { floorColor: 0x9A7B5A, wallColor: 0x3A2818 },
  well:           { floorColor: 0x5A6A6E, wallColor: 0x1A2228 },
  workshop:       { floorColor: 0x7A6040, wallColor: 0x2E1E14 },
  storage:        { floorColor: 0x7A4030, wallColor: 0x2A0F0A },
} as const

// Defaults
const DEFAULT_SKY = 0xE8B0C0
const DEFAULT_WALL_HEIGHT = 0.45

// Window pane layout — kept here so all interiors share the same window look.
const PANE_W = 28
const PANE_H = 22
const PANE_GAP = 4
const WINDOW_COLS = 3
const WINDOW_ROWS = 2

// Side wall inset at the top — how far the angled wall comes into the room
// at the back. 0.12 = 12% of screen width.
export const SIDE_WALL_INSET = 0.12

export function buildInteriorBackdrop(
  scene: Phaser.Scene,
  config: InteriorBackdropConfig,
): InteriorBackdropBounds {
  const w = scene.cameras.main.width
  const h = scene.cameras.main.height

  const playTop = UI_BAR_HEIGHT
const playH = h - UI_BAR_HEIGHT
  const skyColor = config.skyColor ?? DEFAULT_SKY
  const wallHeightFraction = config.wallHeightFraction ?? DEFAULT_WALL_HEIGHT

  // back wall — depth below 0 so any caller content with default depth renders on top
  const wallH = Math.round(playH * wallHeightFraction)
  scene.add.rectangle(w / 2, playTop + wallH / 2, w, wallH, config.wallColor).setDepth(-30)

  // windows — two 3x2 grids of panes showing sky color
  const windowW = WINDOW_COLS * PANE_W + (WINDOW_COLS - 1) * PANE_GAP
  const windowH = WINDOW_ROWS * PANE_H + (WINDOW_ROWS - 1) * PANE_GAP
  const windowY = playTop + (wallH - windowH) / 2
  const windowCenters = config.openSide === 'left' ? [w * 0.28]
    : config.openSide === 'right' ? [w * 0.72]
    : [w * 0.28, w * 0.72]
  for (const cx of windowCenters) {
    const startX = cx - windowW / 2
    for (let r = 0; r < WINDOW_ROWS; r++) {
      for (let c = 0; c < WINDOW_COLS; c++) {
        const px = startX + c * (PANE_W + PANE_GAP) + PANE_W / 2
        const py = windowY + r * (PANE_H + PANE_GAP) + PANE_H / 2
        scene.add.rectangle(px, py, PANE_W, PANE_H, skyColor).setDepth(-20)
      }
    }
  }

  // floor — extended under inventory bar so there's no gap
  const floorTop = playTop + wallH
  const floorH = playH - wallH
  const floorDrawH = h - floorTop
  if (config.floorTexture && scene.textures.exists(config.floorTexture)) {
    // Repeating texture floor. tileScale enlarges each pixel of the source tile.
    const tile = scene.add.tileSprite(w / 2, floorTop + floorDrawH / 2, w, floorDrawH, config.floorTexture)
      .setDepth(-20)
    const ts = config.floorTextureScale ?? 2
    tile.setTileScale(ts, ts)
  } else {
    scene.add.rectangle(w / 2, floorTop + floorDrawH / 2, w, floorDrawH, config.floorColor)
      .setDepth(-20)
  }

  if (config.openSide) {
    const winH = windowH * 1.2
    const winW = PANE_W
    const winCenterY = windowY + windowH / 2 + 20
    const winTop = winCenterY - winH / 2
    const winBot = winCenterY + winH / 2
    const edgeDrop = winW * (floorH / (w * SIDE_WALL_INSET))
    const topDrop = edgeDrop
    if (config.openSide === 'left') {
      const baseX = w * 0.58
      scene.add.polygon(0, 0, [
        baseX, winTop,
        baseX + winW, winTop + topDrop,
        baseX + winW, winBot + edgeDrop,
        baseX, winBot,
      ], skyColor).setOrigin(0, 0).setDepth(-20)
    } else {
      const baseX = w * 0.42
      scene.add.polygon(0, 0, [
        baseX, winTop,
        baseX - winW, winTop + topDrop,
        baseX - winW, winBot + edgeDrop,
        baseX, winBot,
      ], skyColor).setOrigin(0, 0).setDepth(-20)
    }
  }

  // angled side walls — give the room perspective depth
  const floorBottom = floorTop + floorH
  if (config.openSide !== 'left') {
    const lInset = config.openSide === 'right' ? 0.35 : 0
    const lEdge = w * lInset
    scene.add.polygon(0, 0, [
      lEdge, floorBottom,
      lEdge, floorTop,
      lEdge + w * SIDE_WALL_INSET, floorTop,
      lEdge, floorBottom,
    ], config.wallColor).setOrigin(0, 0).setDepth(-10)
    if (lInset > 0) {
      scene.add.rectangle(lEdge / 2, (floorTop + floorBottom) / 2, lEdge, floorBottom - floorTop, config.wallColor).setDepth(-8)
    }
  }

  if (config.openSide !== 'right') {
    const rInset = config.openSide === 'left' ? 0.35 : 0
    const rEdge = w * (1 - rInset)
    scene.add.polygon(0, 0, [
      rEdge, floorBottom,
      rEdge, floorTop,
      rEdge - w * SIDE_WALL_INSET, floorTop,
      rEdge, floorBottom,
    ], config.wallColor).setOrigin(0, 0).setDepth(-10)
    if (rInset > 0) {
      scene.add.rectangle(rEdge + (w - rEdge) / 2, (floorTop + floorBottom) / 2, w - rEdge, floorBottom - floorTop, config.wallColor).setDepth(-8)
    }
  }

  return { floorTop, floorH, floorBottom, w, h }
}
