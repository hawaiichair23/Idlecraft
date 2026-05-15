import Phaser from 'phaser'
import './style.css'
import { Overworld } from './scenes/Overworld'
import { UI } from './scenes/UI'
import { Interior } from './scenes/Interior'

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 576,
  height: 576,
  pixelArt: true,
  backgroundColor: '#2A2520',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [Overworld, UI, Interior],
})
// right-click is used to pick up half a stack — suppress the browser menu
game.input.mouse?.disableContextMenu()
