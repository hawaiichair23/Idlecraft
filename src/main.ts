import Phaser from 'phaser'
import './style.css'
import { Overworld } from './scenes/Overworld'
import { UI } from './scenes/UI'
import { Interior } from './scenes/Interior'
import { state } from './game/state'

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1920,
  height: 1080,
  pixelArt: true,
  backgroundColor: '#2A2520',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
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

// ---- developer console commands ----
// Exposed on window for use in browser devtools. Type `gold(5000)` etc.
// in the F12 console to call them at runtime.
declare global {
  interface Window {
    gold: (n: number) => string
    speed: (n: number) => string
    playerSpeed: (n?: number) => string
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
