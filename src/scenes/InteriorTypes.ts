import Phaser from 'phaser'
import type { ItemStack } from '../items/types'

// Shared shape for slot visual tracking. Building-specific interior modules
// produce these and the parent Interior scene redraws them each frame using
// the lastType/lastCount snapshots (no destroy/recreate if nothing changed).
export interface SlotVisual {
  x: number
  y: number
  getStack: () => ItemStack | null
  icon: Phaser.GameObjects.Sprite | null
  count: Phaser.GameObjects.BitmapText | null
  lastType: string | null
  lastCount: number
}
