import Phaser from 'phaser'
import './style.css'
import { Overworld } from './scenes/Overworld'
import { UI } from './scenes/UI'
import { Interior } from './scenes/Interior'
import { state } from './game/state'
import { ITEMS, type ItemType } from './items/types'

import { spawnTumbleweed } from './world/tumbleweed'

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1920,
  height: 1080,
  pixelArt: true,
  backgroundColor: '#2A2520',
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 0 },   // top-down: no falling
      enableSleeping: true,
    },
  },
  scene: [Overworld, UI, Interior],
})
// right-click is used to pick up half a stack — suppress the browser menu
game.input.mouse?.disableContextMenu()

// Phaser's auto modes can miss bounds changes when the window moves between
// monitors or enters/leaves fullscreen (known scale-manager regression).
// updateBounds() forces a re-measure of the parent so the canvas rescales.
window.addEventListener('resize', () => game.scale.updateBounds())
document.addEventListener('fullscreenchange', () => game.scale.updateBounds())

// ---- developer console commands ----
// Exposed on window for use in browser devtools. Type `gold(5000)` etc.
// in the F12 console to call them at runtime.
declare global {
  interface Window {
    gold: (n: number) => string
    speed: (n: number) => string
    playerSpeed: (n?: number) => string
    getItem: (name: string, count?: number) => string
    spawnItem: (name: string, x?: number, y?: number) => string
    growWorld: (direction: string, amount: number) => string
    fps: () => string
  }
}

// Add n gold to the player's wallet (n can be negative to remove).
window.gold = (n: number) => {
  state.addGold(n, game.registry)
  return `gold: ${state.gold}`
}

// Set the production-tick time multiplier. 1 = normal, 2 = twice as fast,
// 0.5 = half speed. Affects every building's effective tick rate.
window.speed = (n: number) => {
  state.timeMultiplier = n
  return `timeMultiplier: ${state.timeMultiplier}`
}

// Override player movement speed in pixels/second. Call with no args (or null)
// to clear the override and return to the default.
window.playerSpeed = (n?: number) => {
  state.playerSpeedOverride = (n === undefined || n === null) ? null : n
  return `playerSpeedOverride: ${state.playerSpeedOverride}`
}

// Give the player items. getItem("rope") gives 1; getItem("post", 12) gives 12.
// Valid names are the keys of ITEMS — if the name is unknown, the valid names
// are printed. Respects maxStack and inventory space (returns how many fit).
window.getItem = (name: string, count = 1) => {
  // Console shortcuts for long item ids. Typed name → real ItemType key.
  const ALIASES: Record<string, string> = {
    sapling: 'cottonwood_sapling',
  }
  name = ALIASES[name] ?? name
  if (!(name in ITEMS)) {
    return `unknown item "${name}". valid: ${Object.keys(ITEMS).join(', ')}`
  }
  const added = state.inventoryAddAnywhere({ type: name as ItemType, count })
  game.registry.events.emit('inventory-changed')
  if (added < count) return `gave ${added} ${name} (inventory full — ${count - added} didn't fit)`
  return `gave ${added} ${name}`
}

// Spawn a world entity at coordinates. Only certain things are spawnable —
// these aren't inventory items, they're world entities with their own spawn
// logic, so the list is a curated switch (no central registry to read from).
// spawnItem("horse", 2617, 2129)
window.spawnItem = (name: string, x?: number, y?: number) => {
  const overworld = game.scene.getScene('Overworld') as Overworld | undefined
  if (!overworld) return 'Overworld scene not active'
  switch (name) {
    case 'horse':
    case 'honse':
      if (x === undefined || y === undefined) return 'honse needs coords: spawnItem("honse", x, y)'
      overworld.spawnHonse(x, y)
      return `spawned honse at ${x}, ${y}`
    case 'rock':
      if (x === undefined || y === undefined) return 'rock needs coords: spawnItem("rock", x, y)'
      overworld.spawnRockFormation(x, y)
      return `spawned rock formation at ${x}, ${y}`
    case 'crate':
      if (x === undefined || y === undefined) return 'crate needs coords: spawnItem("crate", x, y)'
      overworld.spawnCrate(x, y)
      return `spawned crate at ${x}, ${y}`
    case 'tumbleweed': {
      if (x !== undefined && y !== undefined) {
        spawnTumbleweed(overworld, x, y, true)
        return `spawned tumbleweed at ${x}, ${y}`
      }
      // No coords: drop one just west of the player so it rolls past them.
      const p = overworld.getPlayerPos()
      spawnTumbleweed(overworld, p.x - 200, p.y, true)
      return `spawned tumbleweed near player (${Math.round(p.x - 200)}, ${Math.round(p.y)})`
    }
    default:
      return `can't spawn "${name}". spawnable: horse, rock, crate, tumbleweed`
  }
}

// Grow the world outward in one direction by `amount` pixels. The new land is
// left bare (no scenery yet). Existing content keeps its world position.
// growWorld("west", 2000)
window.growWorld = (direction: string, amount: number) => {
  const dirs = ['west', 'east', 'north', 'south']
  if (!dirs.includes(direction)) {
    return `unknown direction "${direction}". valid: ${dirs.join(', ')}`
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return 'amount must be a positive number of pixels, e.g. growWorld("west", 2000)'
  }
  const overworld = game.scene.getScene('Overworld') as Overworld | undefined
  if (!overworld) return 'Overworld scene not active'
  const added = overworld.growWorld(direction as 'west' | 'east' | 'north' | 'south', amount)
  const b = state.worldBounds
  return `grew ${direction} by ${added}px — world is now ${b.width}×${b.height} (origin ${b.minX}, ${b.minY})`
}

// Report the game loop's actual framerate plus the number of live display
// objects in the Overworld. If FPS drops as the object count climbs (e.g. after
// growing the world), that points at per-frame work scaling with object count.
window.fps = () => {
  const overworld = game.scene.getScene('Overworld') as Overworld | undefined
  const fps = game.loop.actualFps.toFixed(1)
  if (!overworld) return `${fps} fps (Overworld scene not active)`
  const objects = overworld.children.length
  return `${fps} fps · ${objects} objects`
}
