// ChurchInterior.ts — interior of the church.
// Empty for now. Backdrop only. Future: NES-style scene with the
// mill-and-water joke from the Brazos poem.

import Phaser from 'phaser'
import { buildInteriorBackdrop, INTERIOR_PALETTES } from './InteriorBackdrop'

export interface ChurchInteriorHandle {
  onCleanup: () => void
}

export function buildChurchInterior(_scene: Phaser.Scene): ChurchInteriorHandle {
  buildInteriorBackdrop(_scene, INTERIOR_PALETTES.church)
  return { onCleanup: () => {} }
}
