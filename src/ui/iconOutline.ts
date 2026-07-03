import Phaser from 'phaser'
import { COLORS } from '../colors'
import { ITEMS } from '../items/types'

const OUTLINE_THICKNESS = 1
const OUTLINE_COLOR = COLORS.white
const OUTLINE_QUALITY = 0.1

// Sprite keys that receive the white outline: any item that is a pick or axe,
// identified by carrying a mining or chopping stat. Derived from ITEMS so new
// picks/axes are included automatically without editing a hardcoded list.
const OUTLINED_SPRITES: ReadonlySet<string> = new Set(
  Object.values(ITEMS)
    .filter((def) => def.mining != null || def.chopping != null)
    .map((def) => def.sprite),
)

// Whether a given sprite key should get the outline (picks and axes).
export function spriteGetsOutline(spriteKey: string): boolean {
  return OUTLINED_SPRITES.has(spriteKey)
}

export function outlineIcon(icon: Phaser.GameObjects.Sprite, color: number = OUTLINE_COLOR): Phaser.GameObjects.Sprite {
  icon.enableFilters()
  icon.filters.internal
    .addRexOutline({
      thickness: OUTLINE_THICKNESS,
      outlineColor: color,
      quality: OUTLINE_QUALITY,
    })
    .setPaddingOverride(null)
  return icon
}
