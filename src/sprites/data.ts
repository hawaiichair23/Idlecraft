// Pixel sprite data — 2D arrays where each cell is a hex color string or null.
// Copied from project1. Loader converts these to Phaser textures at boot.
import { COLORS } from '../colors'

// Phaser-style hex number (0xRRGGBB) → CSS string ('#RRGGBB') for the pixel cells.
const hexStr = (n: number) => '#' + n.toString(16).padStart(6, '0').toUpperCase()


export type Sprite = (string | null)[][]

function mirrorSprite(sprite: Sprite, mirrorAt = 32): Sprite {
  return sprite.map(row => {
    const newRow = [...row]
    for (let x = mirrorAt; x < row.length; x++) {
      newRow[x] = row[mirrorAt - 1 - (x - mirrorAt)]
    }
    return newRow
  })
}

const _ = null

// ---- MILL ----
const R = '#412916'
const D = '#5A3C24'
const B = '#743D21'
const W = '#917741'
const O = '#492F17'
const K = '#36230B'
const S = '#41210D'
const A = '#743D21'

const Z = '#b97c5e'

// Building art widened from the center: every column 7 duplicated to 7-8,
// then last column dropped to keep the grid 16 wide. Now centered on cols 7-8.
export const MILL: Sprite = [
  [_,_,_,_,Z,_,_,Z,Z,_,_,Z,_,_,_,_],
  [_,_,_,_,_,Z,Z,Z,Z,Z,Z,_,_,_,_,_],
  [_,_,_,_,_,R,Z,D,D,Z,R,_,_,_,_,_],
  [_,_,_,_,_,_,D,Z,Z,D,_,_,_,_,_,_],
  [_,_,_,_,_,_,A,D,D,A,_,_,_,_,_,_],
  [_,_,_,_,_,A,D,D,D,D,A,_,_,_,_,_],
  [_,_,_,_,_,A,D,D,D,D,A,_,_,_,_,_],
  [_,_,_,_,_,B,B,B,B,B,B,_,_,_,_,_],
  [_,_,_,_,B,B,B,B,B,B,B,B,_,_,_,_],
  [_,_,_,_,B,B,W,B,B,W,B,B,_,_,_,_],
  [_,_,_,_,B,B,B,B,B,B,B,B,_,_,_,_],
  [_,_,_,B,B,B,B,B,B,B,B,B,B,_,_,_],
  [_,_,_,B,B,B,O,O,O,O,B,B,B,_,_,_],
  [_,_,S,B,B,B,O,K,K,O,B,B,B,S,_,_],
  [_,_,S,S,S,S,S,K,K,S,S,S,S,S,_,_],
  [_,_,_,S,S,S,S,S,S,S,S,S,S,_,_,_],
]

// ---- ARROW (right-pointing) ----
// 16x8, white-on-transparent so we can tint it any color via setTint.
const aW = '#FFFFFF'

export const ARROW_RIGHT: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,aW,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,aW,aW,_,_,_,_],
  [_,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,_,_,_],
  [_,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,_,_],
  [_,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,_,_],
  [_,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,aW,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,aW,aW,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,aW,_,_,_,_,_],
]
// ---- COW SKULL (decoration) ----
// 8x8. Off-white blob, two dark eye sockets, tiny horn nubs.
const bN = '#E8DCC0'  // bone (off-white)
const bA = '#C8C0AA'  // darker bone
const bS = '#1A1208'  // eye socket / shadow

// ---- PEBBLES ---- 8x8. Scattered brown dots — ground texture for the empty
// areas of the world. Edit colors/positions freely.
const pB = '#5A3D26'   // dark brown pebble
const pL = '#8A6B4A'   // lighter brown pebble
// ---- GRASS ---- dead/dry strands. Edit colors/shape freely.
const gD = '#6B7042'   // dark dry green
const gL = '#8E8C4E'   // pale dry green-tan
const gssL = '#9c9c8f'   // pale dry green-tan
export const GRASS: Sprite = [
  [gD,_,_,_,_,gD,_],
  [_,gD,_,gL,_,gD,_],
  [_,gD,gL,gL,_,gD,_],
  [_,gD,gL,gL,_,gD,_],
]

export const PEBBLES: Sprite = [
  [_,_,pB,_,_,_,_,_],
  [_,_,_,_,_,_,pL,_],
  [_,_,_,_,pB,_,_,_],
  [_,_,_,_,_,_,_,_],
  [_,pL,_,_,_,_,_,_]
]

// ---- BARREL ---- 
const baC = '#b28557'   // wood highlight (trough cap)
const baCd = '#805b3f'   // wood highlight 
const baH = '#5c3a23'   // wood mid (trough high) / top rim
const baD = '#4d321c'   // wood shadow / staves (trough mid)
const baM = '#656571'   // metal band
const baMd = '#a0a0b4'   // metal band light

export const BARREL: Sprite = [
  [_,baH,baH,baH,baH,baH,baH,_],
  [baD,baH,baC,baC,baC,baC,baH,baD],
  [baD,baC,baC,baC,baC,baC,baC,baD],
  [baD,baM,baH,baH,baH,baH,baM,baD],
  [baD,baH,baM,baMd,baMd,baM,baH,baD],
  [baD,baH,baCd,baH,baH,baCd,baH,baD],
  [baD,baM,baCd,baCd,baH,baH,baM,baD],
  [baD,baH,baM,baMd,baMd,baM,baH,baD],
  [baD,baH,baH,baCd,baH,baH,baCd,baD],
  [baD,baH,baCd,baH,baH,baCd,baH,baD],
  [_,baD,baD,baD,baD,baD,baD,_],
]

// ---- BUSH ---- 8x8. Low round dry-green shrub, palette shared with GRASS.
const buG = '#41724b'   // dry green
const buL = '#8d8a39'   // pale highlight
const buD = '#305a39'  // shadow
const f = '#bce129'

export const BUSH: Sprite = [
  [_,_,f,f,_,_,_,_],
  [_,f,buL,f,f,buG,_,_],
  [_,f,f,buL,buG,_,buG,_],
  [f,_,buG,buG,_,buG,buG,buG],
  [buG,buG,_,buG,buG,buG,_,buG],
  [_,buG,buG,buG,buD,buG,buG,_],
  [_,_,buD,buG,buG,buD,_,_],
  [_,_,_,buD,buD,_,_,_],
]

// ---- ROCK_SMALL ---- 8x8. Little grey stone clump, grey palette shared with stone.
const roL = '#8b91a7'   // lit stone
const roM = '#6E685E'   // mid stone
const roD = '#474239'   // shadow
export const ROCK_SMALL: Sprite = [
  [_,_,_,_,_,_,_,_],
  [_,_,roM,roM,roM,_,_,_],
  [_,roM,roM,roL,roM,roM,_,_],
  [_,roM,roL,roM,roM,roD,roM,_],
  [_,roM,roM,roM,roD,roM,roM,_],
  [_,_,roM,roD,roD,roM,_,_],
  [_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_],
]

export const COW_SKULL: Sprite = [
  [bN,_,_,_,_,_,_,bN],
  [bN,bN,bN,bN,bN,bN,bN,bN],
  [_,bN,bS,bN,bN,bS,bN,gssL],
  [_,bN,bS,bN,bN,bS,bN,gssL],
  [_,bN,bN,bN,bN,bA,bN,gssL],
  [_,_,bN,bN,bA,bA,gssL,_],
  [_,_,bA,bA,bA,gssL,gssL,_],
  [_,_,_,bA,bA,gssL,_,_],
]
// 8x8. Starter — feel free to tweak any pixel.
const cL = '#FFEE66'  // highlight (bright)
const cM = '#DAA520'  // main yellow (matches uiGold)
const cD = '#8B6914'  // shadow (dark)

// ---- HEART ----
const hM = '#c50000'  // main red
const hE = '#3a1515'  // drained / empty cell

export const HEART_FULL: Sprite = [
  [_,hM,hM,_,hM,hM,_],
  [hM,hM,hM,hM,hM,hM,hM],
  [hM,hM,hM,hM,hM,hM,hM],
  [_,hM,hM,hM,hM,hM,_],
  [_,_,hM,hM,hM,_,_],
  [_,_,_,hM,_,_,_],
]

export const HEART_3Q: Sprite = [
  [_,hM,hM,_,hE,hE,_],
  [hM,hM,hM,hM,hE,hE,hE],
  [hM,hM,hM,hM,hE,hE,hE],
  [_,hM,hM,hM,hM,hM,_],
  [_,_,hM,hM,hM,_,_],
  [_,_,_,hM,_,_,_],
]

export const HEART_HALF: Sprite = [
  [_,hM,hM,_,hE,hE,_],
  [hM,hM,hM,hM,hE,hE,hE],
  [hM,hM,hM,hM,hE,hE,hE],
  [_,hM,hM,hM,hE,hE,_],
  [_,_,hM,hM,hE,_,_],
  [_,_,_,hM,_,_,_],
]

export const HEART_1Q: Sprite = [
  [_,hM,hM,_,hE,hE,_],
  [hM,hM,hM,hE,hE,hE,hE],
  [hM,hM,hM,hE,hE,hE,hE],
  [_,hE,hE,hE,hE,hE,_],
  [_,_,hE,hE,hE,_,_],
  [_,_,_,hE,_,_,_],
]

export const HEART_EMPTY: Sprite = [
  [_,hE,hE,_,hE,hE,_],
  [hE,hE,hE,hE,hE,hE,hE],
  [hE,hE,hE,hE,hE,hE,hE],
  [_,hE,hE,hE,hE,hE,_],
  [_,_,hE,hE,hE,_,_],
  [_,_,_,hE,_,_,_],
]

const hcF = '#FFCC2E'
const hcE = '#5C4514'
const recolorHeart = (s: Sprite): Sprite => s.map(row => row.map(c => c === hM ? hcF : c === hE ? hcE : c))
export const HEART_CONST_FULL: Sprite = recolorHeart(HEART_FULL)
export const HEART_CONST_3Q: Sprite = recolorHeart(HEART_3Q)
export const HEART_CONST_HALF: Sprite = recolorHeart(HEART_HALF)
export const HEART_CONST_1Q: Sprite = recolorHeart(HEART_1Q)
export const HEART_CONST_EMPTY: Sprite = recolorHeart(HEART_EMPTY)

export const GOLD_COIN: Sprite = [
  [_,_,_,cD,cD,_,_,_],
  [_,_,cD,cL,cL,cD,_,_],
  [_,_,cL,cL,cM,cD,_,_],
  [_,_,cL,cM,cM,cD,_,_],
  [_,_,cM,cM,cM,cD,_,_],
  [_,_,cM,cM,cM,cD,_,_],
  [_,_,cD,cM,cM,cD,_,_],
  [_,_,_,cD,cD,_,_,_],
]

// ---- PLAYER ----
const SK = '#D19766'
const RD = hexStr(COLORS.playerShirt)
const GN = '#228822'
const BT = '#553311'
const HR = '#1A0F08'

export const PLAYER: Sprite = [
  [_,_,HR,HR,HR,HR,_,_],
  [_,HR,HR,HR,HR,HR,HR,_],
  [_,_,SK,SK,SK,SK,_,_],
  [_,_,RD,RD,RD,RD,_,_],
  [_,RD,RD,RD,RD,RD,RD,_],
  [_,_,RD,RD,RD,RD,_,_],
  [_,_,GN,GN,GN,GN,_,_],
  [_,_,BT,_,_,BT,_,_],
]

// Solid-red silhouette 
export const PLAYER_HURT: Sprite = PLAYER.map(row => row.map(cell => cell === _ ? _ : RD))

// ---- CAVALRY TROOPER ---- 
const tvHat = '#3a3326'   // slouch hat (dusty brown-black)
const tvHatB = '#2a241a'  // hat band / shadow
const tvSkin = '#dcae9a'  // face 
const tvCoat = '#26324f'  // dark blue coat
const tvCoatD = '#19223a' // coat shadow
const tvPant = '#4473af'  // sky blue trousers
const tvStripe = '#ffdd00' // yellow leg stripe
const bs = '#d2b017'
const tvBoot = '#3a2614'  // riding boots
const tvGun = '#6b4a2a'   // rifle wood/barrel
const tvGunD = '#4a3019'  // rifle shadow

export const CAVALRY_TROOPER: Sprite = [
  [_,_,_,tvHatB,tvHatB,tvHatB,_,_,_,tvGunD],
  [_,_,tvHatB,tvHatB,tvHatB,tvHatB,tvHatB,tvHatB,_,tvGunD],
  [_,tvHat,tvHat,tvHat,tvHat,tvHat,tvHat,_,tvGunD,_],
  [_,_,_,tvGunD,tvSkin,tvSkin,_,tvGunD,tvGunD,_],
  [_,_,bs,bs,tvCoat,tvGun,tvGunD,tvGunD,_,_],
  [_,_,tvCoat,tvCoat,tvCoatD,tvGun,tvGunD,_,_,_],
  [_,_,tvCoat,tvCoat,tvCoat,tvCoat,tvGunD,_,_,_],
  [_,_,tvCoat,tvCoat,tvCoat,tvCoat,tvGunD,_,_,_],
  [_,_,tvCoat,tvCoat,tvCoat,tvCoat,tvCoat,_,_,_],
  [_,_,tvCoat,tvCoat,tvCoatD,tvCoat,tvCoat,_,_,_],
  [_,_,tvCoat,tvCoat,tvCoat,tvCoat,_,_,_,_],
  [_,_,_,tvPant,tvStripe,tvPant,_,_,_,_],
  [_,_,_,tvPant,tvStripe,tvPant,_,_,_,_],
  [_,_,_,tvPant,tvStripe,tvPant,_,_,_,_],
  [_,_,_,tvPant,tvStripe,tvPant,_,_,_,_],
  [_,_,_,tvPant,tvStripe,tvPant,_,_,_,_],
  [_,_,_,tvPant,tvStripe,tvPant,_,_,_,_],
  [_,_,_,tvPant,tvStripe,tvPant,_,_,_,_],
  [_,_,_,tvBoot,tvBoot,tvBoot,tvBoot,_,_,_],
]

export const CAVALRY_TROOPER_STEP: Sprite = [
  [_,_,_,tvHatB,tvHatB,tvHatB,_,_,_,tvGunD],
  [_,_,tvHatB,tvHatB,tvHatB,tvHatB,tvHatB,tvHatB,_,tvGunD],
  [_,tvHat,tvHat,tvHat,tvHat,tvHat,tvHat,_,tvGunD,_],
  [_,_,_,tvGunD,tvSkin,tvSkin,_,tvGunD,tvGunD,_],
  [_,_,bs,bs,tvCoat,tvGun,tvGunD,tvGunD,_,_],
  [_,_,tvCoat,tvCoat,tvCoatD,tvGun,tvGunD,_,_,_],
  [_,_,tvCoat,tvCoat,tvCoat,tvCoat,tvGunD,_,_,_],
  [_,_,tvCoat,tvCoat,tvCoat,tvCoat,tvGunD,_,_,_],
  [_,_,tvCoat,tvCoat,tvCoat,tvCoat,tvCoat,_,_,_],
  [_,_,tvCoat,tvCoat,tvCoatD,tvCoat,tvCoat,_,_,_],
  [_,_,tvCoat,tvCoat,tvCoat,tvCoat,_,_,_,_],
  [_,_,_,tvPant,tvStripe,tvPant,_,_,_,_],
  [_,_,_,tvPant,tvStripe,tvPant,_,_,_,_],
  [_,_,_,tvPant,tvStripe,tvPant,_,_,_,_],
  [_,_,_,tvPant,tvStripe,tvPant,tvPant,_,_,_],
  [_,_,_,tvPant,tvStripe,tvPant,tvPant,_,_,_],
  [_,_,_,tvPant,tvPant,tvStripe,tvPant,tvBoot,tvBoot,_],
  [_,_,_,tvPant,tvPant,tvBoot,tvPant,tvBoot,tvBoot,_],
  [_,_,_,tvBoot,tvBoot,tvBoot,tvBoot,tvBoot,_,_],
]

// ---- FORT WOOD WALL ----
const sltC = '#c6ac99'   // cap
const sltM = '#554132'   // face 
const sltD = '#503b2d'   // gap

export const WOOD_WALL: Sprite = [
  [sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC],
  [sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC],
  [sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD],
  [sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD],
  [sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD],
  [sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD],
  [sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD],
  [sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD],
  [sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD],
  [sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD],
  [sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD],
  [sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD],
  [sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD],
  [sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD,sltM,sltM,sltM,sltM,sltD],
]

// Half-width wood wall
export const WOOD_WALL_HALF: Sprite = [
  [sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltM,sltM],
  [sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltC,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM,sltM],
]

// Vertical wood wall 
export const WOOD_WALL_V: Sprite = [
  [sltC,sltC,sltC,sltC,sltC,sltC],
  [sltC,sltC,sltC,sltC,sltC,sltC],
  [sltC,sltC,sltC,sltC,sltC,sltC],
  [sltC,sltC,sltC,sltC,sltC,sltC],
  [sltC,sltC,sltC,sltC,sltC,sltC],
  [sltC,sltC,sltC,sltC,sltC,sltC],
  [sltC,sltC,sltC,sltC,sltC,sltC],
  [sltC,sltC,sltC,sltC,sltC,sltC],
  [sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM],
  [sltM,sltM,sltM,sltM,sltM,sltM],
]

// ---- WELL ----
const ST = '#504a40'
const STs = '#474239'
const SD = '#8a7e6a'
export const WA = '#99bec6'
const RP = '#693f21'
const RQ = '#905c3a'

export const WELL: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,RQ,RQ,RQ,RQ,RQ,RQ,RQ,RQ,RQ,RQ,RQ,_,_],
  [_,_,_,RP,_,_,_,RP,_,_,_,RP,_,_,_],
  [_,_,_,RP,_,_,_,RP,_,_,_,RP,_,_,_],
  [_,_,_,RP,_,_,_,RQ,_,_,_,RP,_,_,_],
  [_,_,_,RP,_,_,_,RQ,_,_,_,RP,_,_,_],
  [_,_,_,RP,ST,ST,ST,RQ,ST,ST,ST,RP,_,_,_],
  [_,_,_,SD,SD,WA,WA,RQ,WA,WA,SD,SD,_,_,_],
  [_,_,_,ST,SD,SD,SD,SD,SD,SD,SD,ST,_,_,_],
  [_,_,_,ST,ST,ST,ST,ST,ST,ST,ST,STs,_,_],
  [_,_,_,ST,ST,STs,STs,ST,ST,ST,ST,ST,_,_,_],
  [_,_,_,ST,ST,ST,ST,ST,STs,STs,ST,ST,_,_,_],
  [_,_,_,STs,ST,ST,ST,ST,ST,ST,ST,ST,_,_,_],
  [_,_,_,_,ST,STs,STs,ST,ST,ST,ST,_,_,_,_],
]

// ---- DRY WELL ----
const WD = '#2b2620'   // dried/empty well — dark
export const DRY_WELL: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,RQ,RQ,RQ,RQ,RQ,RQ,RQ,RQ,RQ,RQ,RQ,_,_],
  [_,_,RP,_,_,_,RP,_,_,_,RP,_,_,_],
  [_,_,RP,_,_,_,RP,_,_,_,RP,_,_,_],
  [_,_,RP,_,_,_,RQ,_,_,_,RP,_,_,_],
  [_,_,RP,_,_,_,RQ,_,_,_,RP,_,_,_],
  [_,_,RP,ST,ST,ST,RQ,ST,ST,ST,RP,_,_,_],
  [_,_,SD,SD,WD,WD,RQ,WD,WD,SD,SD,_,_,_],
  [_,_,ST,SD,SD,SD,SD,SD,SD,SD,ST,_,_,_],
  [_,_,ST,ST,ST,ST,ST,ST,ST,ST,STs,_,_],
  [_,_,ST,ST,STs,STs,ST,ST,ST,ST,ST,_,_,_],
  [_,_,ST,ST,ST,ST,ST,STs,STs,ST,ST,_,_,_],
  [_,_,STs,ST,ST,ST,ST,ST,ST,ST,ST,_,_,_],
  [_,_,_,ST,ST,ST,ST,ST,ST,ST,_,_,_,_],
]

// ---- GRAVE CROSS ----
const gC = '#6b5746'   // weathered wood
const gCd = '#4a3b2f'  // wood shadow
const gCs = '#3f3a33'  // ground shadow at the base
export const GRAVE_CROSS: Sprite = [
  [_,_,_,gC,gCd,_,_,_],
  [_,_,_,gC,gCd,_,_,_],
  [gC,gC,gC,gC,gC,gC,gC,gC,_],
  [gC,gC,gCd,gCd,gC,gCd,gCd,gCd,_],
  [_,_,_,gC,gCd,_,_,_],
  [_,_,_,gC,gCd,_,_,_],
  [_,_,_,gC,gCd,_,_,_],
  [_,_,_,gC,gCd,_,_,_],
  [_,_,gCs,gCs,gCs,gCs,_,_],
]

// ---- WORKSHOP (smithy) ----
const rD = '#4A2F0F'  // roof dark
const wL = '#8B5A2B'  // wall light brown
const wM = '#6B3410'  // wall medium brown
const aB = '#222222'  // anvil
const gO = '#FF6622'  // forge glow orange
const gY = '#FFAA33'  // forge glow yellow
const sL = '#888888'  // stone light
const sD = '#666666'  // stone dark
const sM = '#AAAAAA'  // smoke
const dD = '#3A2410'  // door deep

export const WORKSHOP: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,sM,sM,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,sM,sM,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,sL,sL,_,_,_,_],
  [_,_,_,_,_,_,rD,rD,rD,rD,sL,sL,_,_,_,_],
  [_,_,_,_,_,rD,rD,rD,rD,rD,rD,_,_,_,_,_],
  [_,_,_,_,rD,rD,rD,rD,rD,rD,rD,rD,_,_,_,_],
  [_,_,_,wM,wL,wL,wL,wL,wL,wL,wL,wL,wM,_,_,_],
  [_,_,_,wL,wL,wL,aB,gY,gY,aB,wL,wL,wL,_,_,_],
  [_,_,_,wM,wL,wL,aB,gO,gO,aB,wL,wL,wM,_,_,_],
  [_,_,_,wM,wL,wL,aB,aB,aB,aB,wL,wL,wM,_,_,_],
  [_,_,_,wM,wL,wL,wL,aB,aB,wL,wL,wL,wM,_,_,_],
  [_,_,_,wM,wL,wL,wL,wL,wL,wL,wL,wL,wM,_,_,_],
  [_,_,_,wM,wL,wL,rD,rD,rD,rD,wL,wL,wM,_,_,_],
  [_,_,sL,sL,sL,sL,rD,dD,dD,rD,sL,sL,sL,sL,_,_],
  [_,_,sD,sD,sD,sD,rD,dD,dD,rD,sD,sD,sD,sD,_,_],
  [_,_,sD,sD,sD,sD,rD,dD,dD,rD,sD,sD,sD,sD,_,_],
]

// ---- WORKSHOP LEVEL 2 ---- 
const stL = '#9a9488'  // stone block light
const st = '#7d776b'  // stone block mid
const stD = '#5a554c'  // stone block dark / mortar
const slT = '#4a4640'  // slate roof
const bkL = '#A65238'  // brick light (red chimney)
const bkD = '#7C3B28'  // brick dark
const wsWn = '#1A0D06'  // window deep (matches storage windows)
export const WORKSHOP_L2: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,sM,sM,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,sM,sM,sM,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,bkD,bkL,bkD,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,bkD,bkL,bkD,_,_,_],
  [_,_,_,_,slT,slT,slT,slT,slT,slT,bkD,bkL,bkD,_,_,_],
  [_,_,_,slT,slT,slT,slT,slT,slT,slT,bkD,bkL,bkD,_,_,_],
  [_,_,slT,slT,slT,slT,slT,slT,slT,slT,slT,slT,slT,_,_,_],
  [_,_,stD,stL,st,stL,stD,stL,st,stL,stD,stL,st,stD,_,_],
  [_,_,stL,st,wsWn,wsWn,stD,stL,st,wsWn,wsWn,st,stL,stD,_,_],
  [_,_,stD,stL,wsWn,wsWn,stD,stL,st,wsWn,wsWn,stL,stD,stL,_,_],
  [_,_,stL,st,stL,stD,stL,st,stL,stD,stL,stD,stL,st,_,_],
  [_,_,stD,stL,st,stL,stD,stL,st,stL,st,stL,stD,stL,_,_],
  [_,_,stL,st,stL,stD,stL,st,stL,stD,stL,st,stL,stD,_,_],
  [_,_,stD,stL,st,stL,dD,dD,stL,st,stL,stD,stL,st,_,_],
  [_,_,stL,st,stL,stD,dD,dD,stD,stL,st,stL,stD,stL,_,_],
  [_,_,stD,stL,st,stL,dD,dD,stL,stD,stL,st,stL,stD,_,_],
]

// ---- ITEMS ----
// Flour
const fW = '#F5F0E1'
const fT = '#8B5A2B'
export const ITEM_FLOUR: Sprite = [
  [_,_,fT,fT,_,_,_,_],
  [_,_,fT,fT,_,_,_,_],
  [_,fW,fW,fW,fW,_,_,_],
  [fW,fW,fW,fW,fW,fW,_,_],
  [fW,fW,fW,fW,fW,fW,_,_],
  [fW,fW,fW,fW,fW,fW,_,_],
  [fW,fW,fW,fW,fW,fW,_,_],
  [_,fW,fW,fW,fW,_,_,_],
]

// Bread
const bC = '#97623a'   // crust
const bI = '#cea579'   // interior crumb
const bD = '#c69c70'   // dark crust line
const bF = '#deb282'   

export const ITEM_BREAD: Sprite = [
  [_,bC,bC,bC,bC,bC,bC,bC,bC,bC,bC,bC,bC,bC,_],
  [bC,bF,bF,bF,bF,bF,bF,bF,bF,bF,bF,bF,bF,bF,bC],
  [bC,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bC],
  [bC,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bC],
  [bC,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bC],
  [bC,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bI,bC],
  [_,bC,bD,bD,bD,bD,bD,bD,bD,bD,bD,bD,bD,bC,_],
  [_,bC,bD,bD,bD,bD,bD,bD,bD,bD,bD,bD,bD,bC,_],
  [_,bC,bD,bD,bD,bD,bD,bD,bD,bD,bD,bD,bD,bC,_],
  [_,_,bC,bC,bC,bC,bC,bC,bC,bC,bC,bC,bC,_,_],
]

// Snake oil
const soK = '#8a5a32'   // cork
const soG = '#3e6b4a'   // dark green glass
const snL = '#5f9468'   // glass highlight
const soA = '#caa24a'   // amber tonic
const soP = '#e8e0c8'   // paper label
const grr = '#c8c1ac'
export const ITEM_SNAKE_OIL: Sprite = [
  [_,_,_,soK,soK,soK,_,_,_,_],
  [_,_,_,soK,soK,soK,_,_,_,_],
  [_,_,_,soG,soG,soG,_,_,_,_],
  [_,_,_,snL,soG,soG,_,_,_,_],
  [_,_,soG,snL,soG,soG,soG,_,_,_],
  [_,soG,snL,soA,soA,soA,soG,soG,_,_],
  [_,soG,snL,soA,soA,soA,soG,soG,_,_],
  [_,soG,snL,soA,soA,soA,soG,soG,_,_],
  [_,soG,soP,soP,soP,soP,soP,soG,_,_],
  [_,soG,soP,grr,grr,grr,soP,soG,_,_],
  [_,soG,soP,grr,grr,soP,grr,soG,_,_],
  [_,soG,grr,soP,soP,grr,soP,soG,_,_],
  [_,soG,soP,soP,soP,soP,soP,soG,_,_],
  [_,soG,snL,soA,soA,soA,soA,soG,_,_],
  [_,soG,snL,soA,soA,soA,soA,soG,_,_],
  [_,soG,snL,soA,soA,soA,soA,soG,_,_],
  [_,soG,soG,soA,soA,soA,soG,soG,_,_],
  [_,_,soG,soG,soG,soG,soG,_,_,_],
]

const wdK = '#8a5a32'
const wdG = '#3e6b4a'
const wdL = '#5f9468'
const wdD = '#241712'
const wdP = '#e8e0c8'
const wdR = '#c8c1ac'
export const ITEM_WIDOWER: Sprite = [
  [_,_,_,wdK,wdK,wdK,_,_,_,_],
  [_,_,_,wdK,wdK,wdK,_,_,_,_],
  [_,_,_,wdG,wdG,wdG,_,_,_,_],
  [_,_,_,wdL,wdG,wdG,_,_,_,_],
  [_,_,wdG,wdL,wdG,wdG,wdG,_,_,_],
  [_,wdG,wdL,wdD,wdD,wdD,wdG,wdG,_,_],
  [_,wdG,wdL,wdD,wdD,wdD,wdG,wdG,_,_],
  [_,wdG,wdL,wdD,wdD,wdD,wdG,wdG,_,_],
  [_,wdG,wdP,wdP,wdP,wdP,wdP,wdG,_,_],
  [_,wdG,wdP,wdR,wdR,wdR,wdP,wdG,_,_],
  [_,wdG,wdP,wdR,wdR,wdP,wdR,wdG,_,_],
  [_,wdG,wdR,wdP,wdP,wdR,wdP,wdG,_,_],
  [_,wdG,wdP,wdP,wdP,wdP,wdP,wdG,_,_],
  [_,wdG,wdL,wdD,wdD,wdD,wdD,wdG,_,_],
  [_,wdG,wdL,wdD,wdD,wdD,wdD,wdG,_,_],
  [_,wdG,wdL,wdD,wdD,wdD,wdD,wdG,_,_],
  [_,wdG,wdG,wdD,wdD,wdD,wdG,wdG,_,_],
  [_,_,wdG,wdG,wdG,wdG,wdG,_,_,_],
]


// ---- CHURCH ---- 
const shL = '#D6B97A'   // adobe light
const shD = '#9F855B'   // adobe shadow
const shS = '#6B5635'   // dark adobe / roof line
const shC = '#5A3D26'   // cross / detail (matches pebble brown)
const shB = '#1A0F08'   // doorway / shadow / bell
export const CHURCH: Sprite = [
  [_,_,_,_,_,_,shC,shC,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,shC,shC,shC,shC,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,shC,shC,_,_,_,_,_,_,_,_],
  [_,_,_,_,shS,shS,shL,shL,shS,shS,_,_,_,_,_,_],
  [_,_,_,shS,shL,shL,shL,shL,shL,shL,shS,_,_,_,_,_],
  [_,_,shS,shL,shL,shL,shL,shL,shL,shL,shL,shS,_,_,_,_],
  [shS,shS,shL,shL,shD,shL,shL,shL,shL,shD,shL,shL,shS,shS,_,_],
  [shL,shL,shL,shL,shL,shL,shL,shL,shL,shL,shL,shL,shL,shL,_,_],
  [shL,shL,shL,shL,shL,shL,shL,shL,shL,shL,shL,shL,shL,shL,_,_],
  [shL,shD,shL,shL,shL,shB,shB,shB,shL,shL,shL,shD,shL,shL,_,_],
  [shL,shL,shL,shL,shB,shB,shB,shB,shB,shL,shL,shL,shL,shL,_,_],
  [shL,shL,shL,shL,shB,shB,shB,shB,shB,shL,shL,shL,shL,shL,_,_],
  [shL,shL,shL,shL,shB,shB,shB,shB,shB,shL,shL,shL,shL,shL,_,_],
  [shL,shL,shL,shL,shB,shB,shB,shB,shB,shL,shL,shL,shL,shL,_,_],
  [shS,shS,shS,shS,shS,shS,shS,shS,shS,shS,shS,shS,shS,shS,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

const cbG = '#a8a8a8'
const cbT = '#959599'
const cbD = '#595959'
const cbB = '#363636'
const cbE = '#3e2818'

export const CHURCH_BELL_BACK: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,cbE,cbE,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,cbE,cbE,cbE,cbE,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,cbE,cbE,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,cbE,cbE,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,cbD,cbD,cbD,cbD,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,cbD,cbD,cbB,cbB,cbD,cbD,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,cbD,cbD,cbB,cbB,cbB,cbB,cbD,cbD,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,cbT,cbT,cbT,cbT,cbT,cbT,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,cbG,cbG,cbB,cbB,cbG,cbG,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,cbT,cbT,cbB,cbB,cbT,cbT,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,cbG,cbG,cbB,cbB,cbG,cbG,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,cbD,cbD,cbD,cbD,cbD,cbD,cbD,cbD,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,cbD,cbD,cbD,cbB,cbB,cbB,cbB,cbD,cbD,cbD,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,cbD,cbD,cbB,cbB,cbB,cbB,cbB,cbB,cbB,cbB,cbD,cbD,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,_,_,_,_,_,_,_],
  [_,_,_,_,_,cbD,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbD,_,_,_,_,_],
  [_,_,_,_,cbD,cbG,cbG,cbG,cbG,cbG,cbG,cbB,cbB,cbG,cbG,cbG,cbT,cbG,cbG,cbD,_,_,_,_],
  [_,_,_,cbD,cbT,cbT,cbT,cbT,cbT,cbT,cbB,cbB,cbB,cbB,cbT,cbT,cbT,cbT,cbT,cbT,cbD,_,_,_],
  [_,_,cbD,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbB,cbB,cbG,cbG,cbG,cbT,cbG,cbG,cbG,cbG,cbD,_,_],
  [_,cbD,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbD,_],
  [cbD,cbG,cbG,cbG,cbB,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbT,cbG,cbG,cbB,cbG,cbG,cbG,cbD],
  [_,cbT,cbT,cbB,cbB,cbB,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbB,cbB,cbB,cbT,cbT,_],
  [_,cbG,cbG,cbB,cbB,cbB,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbT,cbG,cbB,cbB,cbB,cbG,cbG,_],
  [_,cbT,cbT,cbB,cbB,cbB,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbB,cbB,cbB,cbT,cbT,_],
  [_,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbT,cbG,cbG,cbG,cbG,cbG,cbG,_],
  [_,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,_],
]

const hh = '#8B3A26'

export const CHURCH_BELL: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,cbE,cbE,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,cbE,cbE,cbE,cbE,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,cbE,cbE,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,cbE,cbE,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,cbD,cbD,cbD,cbD,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,cbD,cbD,cbB,cbB,cbD,cbD,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,cbD,cbD,cbB,cbB,cbB,cbB,cbD,cbD,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,cbT,cbT,cbT,cbT,cbT,cbT,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,cbG,cbG,cbB,cbB,cbG,cbG,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,cbT,cbT,cbB,cbB,cbT,cbT,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,cbG,cbG,cbB,cbB,cbG,cbG,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,cbD,cbD,cbD,cbD,cbD,cbD,cbD,cbD,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,cbD,cbD,cbD,cbB,cbB,cbB,cbB,cbD,cbD,cbD,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,cbD,cbD,cbB,cbB,cbB,cbB,cbB,cbB,cbB,cbB,cbD,cbD,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,_,_,_,_,_,_,_],
  [_,_,_,_,_,cbD,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbD,_,_,_,_,_],
  [_,_,_,_,cbD,cbG,cbG,cbG,cbG,cbG,cbG,cbB,cbB,cbG,cbG,cbG,cbT,cbG,cbG,cbD,_,_,_,_],
  [_,_,_,cbD,cbT,cbT,cbT,cbT,cbT,cbT,cbB,cbB,cbB,cbB,cbT,cbT,cbT,cbT,cbT,cbT,cbD,_,_,_],
  [_,_,cbD,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbB,cbB,cbG,cbG,cbG,cbT,cbG,cbG,cbG,cbG,cbD,_,_],
  [_,cbD,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbD,_],
  [cbD,cbG,cbG,cbG,cbB,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbT,cbG,cbG,cbB,cbG,cbG,cbG,cbD],
  [_,cbT,cbT,cbB,cbB,cbB,cbT,cbT,cbT,cbT,cbT,cbB,cbB,cbT,cbT,cbT,cbT,cbT,cbB,cbB,cbB,cbT,cbT,_],
  [_,cbG,cbG,cbB,cbB,cbB,cbG,cbG,cbG,cbG,cbG,hh,hh,cbG,cbG,cbG,cbT,cbG,cbB,cbB,cbB,cbG,cbG,_],
  [_,cbT,cbT,cbB,cbB,cbB,cbT,cbT,cbT,cbT,hh,hh,hh,hh,cbT,cbT,cbT,cbT,cbB,cbB,cbB,cbT,cbT,_],
  [_,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,cbG,hh,hh,hh,hh,cbG,cbG,cbT,cbG,cbG,cbG,cbG,cbG,cbG,_],
  [_,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,hh,hh,hh,hh,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,cbT,_],
]

const spP = '#989898'   // plank wood
const spD = '#787878'   // dark plank / shadow
const spR = '#d9d9d9'   // roof
const spS = '#3e3e3e'   // sign frame / deep shadow
const spF = '#525252'   // upper wall fill
const spA = '#181818'   // door / window deep
export const SHOP: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,spR,spR,spR,spR,spR,spR,spR,spR,spR,_,_,_,_,_],
  [_,spR,spS,spS,spS,spS,spS,spS,spS,spS,spS,spR,_,_,_,_],
  [_,spR,spF,spF,spF,spF,spF,spF,spF,spF,spF,spR,_,_,_,_],
  [_,spR,spF,spF,spF,spF,spF,spF,spF,spF,spF,spR,_,_,_,_],
  [_,spR,spF,spF,spF,spF,spF,spF,spF,spF,spF,spR,_,_,_,_],
  [_,spR,spF,spF,spF,spF,spF,spF,spF,spF,spF,spR,_,_,_,_],
  [_,spR,spR,spR,spR,spR,spR,spR,spR,spR,spR,spR,_,_,_,_],
  [_,spP,spD,spP,spP,spP,spP,spD,spP,spP,spP,spP,_,_,_,_],
  [_,spP,spP,spP,spA,spA,spP,spP,spA,spA,spP,spP,_,_,_,_],
  [_,spP,spP,spP,spA,spA,spP,spP,spA,spA,spD,spP,_,_,_,_],
  [_,spP,spD,spP,spA,spA,spP,spD,spA,spA,spP,spP,_,_,_,_],
  [_,spP,spP,spP,spA,spA,spP,spP,spA,spA,spP,spP,_,_,_,_],
  [_,spP,spD,spP,spA,spA,spP,spD,spA,spA,spP,spP,_,_,_,_],
  [_,spP,spP,spP,spA,spA,spP,spP,spA,spA,spD,spP,_,_,_,_],
  [_,spS,spS,spS,spS,spS,spS,spS,spS,spS,spS,spS,_,_,_,_],
]

// ---- GENERAL STORE ---- 
const gsP = '#6E7A4A'   // plank wood (sage green)
const gsD = '#525c38'   // dark plank / shadow
const gsR = '#9eb077'   // roof
const gsS = '#2A2E1A'   // sign frame / deep shadow
const gsF = '#4d513e'   // sign frame / deep shadow
const gsA = '#0F1408'   // door / window deep
export const GENERAL_STORE: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,gsR,gsR,gsR,gsR,gsR,gsR,gsR,gsR,gsR,_,_,_,_,_],
  [_,gsR,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsR,_,_,_,_],
  [_,gsR,gsF,gsF,gsF,gsF,gsF,gsF,gsF,gsF,gsF,gsR,_,_,_,_],
  [_,gsR,gsF,gsF,gsF,gsF,gsF,gsF,gsF,gsF,gsF,gsR,_,_,_,_],
  [_,gsR,gsF,gsF,gsF,gsF,gsF,gsF,gsF,gsF,gsF,gsR,_,_,_,_],
  [_,gsR,gsF,gsF,gsF,gsF,gsF,gsF,gsF,gsF,gsF,gsR,_,_,_,_],
  [_,gsR,gsR,gsR,gsR,gsR,gsR,gsR,gsR,gsR,gsR,gsR,_,_,_,_],
  [_,gsP,gsD,gsP,gsP,gsP,gsP,gsD,gsP,gsP,gsP,gsP,_,_,_,_],
  [_,gsP,gsP,gsP,gsA,gsA,gsP,gsP,gsA,gsA,gsP,gsP,_,_,_,_],
  [_,gsP,gsP,gsP,gsA,gsA,gsP,gsP,gsA,gsA,gsD,gsP,_,_,_,_],
  [_,gsP,gsD,gsP,gsA,gsA,gsP,gsD,gsA,gsA,gsP,gsP,_,_,_,_],
  [_,gsP,gsP,gsP,gsA,gsA,gsP,gsP,gsA,gsA,gsP,gsP,_,_,_,_],
  [_,gsP,gsD,gsP,gsA,gsA,gsP,gsD,gsA,gsA,gsP,gsP,_,_,_,_],
  [_,gsP,gsP,gsP,gsA,gsA,gsP,gsP,gsA,gsA,gsD,gsP,_,_,_,_],
  [_,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,_,_,_,_],
]

// ---- ABANDONED HOUSE ---- 
const ahP = '#9c9c9c'   // weathered plank
const ahD = '#828282'   // dark plank shadow
const wwW = '#ffffff'   // white
const ahS = '#3f3f3f'   // deep shadow / sign frame
const ahA = '#363636'   // doorway hollow
const ahB = '#705242'   // board-up plank (warm brown, contrasts grays)
export const ABANDONED_HOUSE: Sprite = [
  [_,wwW,wwW,wwW,_,_,wwW,wwW,wwW,wwW,_,wwW],
  [wwW,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,wwW],
  [wwW,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,wwW],
  [wwW,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,_],
  [wwW,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,wwW],
  [_,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,wwW],
  [wwW,wwW,wwW,wwW,wwW,ahS,ahS,wwW,wwW,wwW,wwW,wwW],
  [ahP,ahP,ahP,ahP,ahD,ahP,ahP,ahP,ahP,ahP,ahP,ahP],
  [ahP,ahD,ahP,ahP,ahP,ahP,ahP,ahD,ahP,ahP,ahP,ahP],
  [ahP,ahP,ahD,ahB,ahB,ahP,ahP,ahP,ahA,ahA,ahD,ahP],
  [ahP,ahD,ahP,ahB,ahB,ahP,ahP,ahD,ahA,ahA,ahP,ahP],
  [ahP,ahP,ahP,ahB,ahB,ahP,ahP,ahP,ahA,ahA,ahP,ahD],
  [ahP,ahD,ahP,ahB,ahB,ahP,ahP,ahD,ahA,ahA,ahP,ahP],
  [ahP,ahP,ahP,ahB,ahB,ahP,ahP,ahP,ahA,ahA,ahP,ahP],
  [ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS],
]

// ---- HOUSE WITH ROOF ---- 
const hrP = '#959595'   // plank
const hrR = '#aaaaaa'   // roof
const hrS = '#3f3f3f'   // deep shadow / sign frame
const hrA = '#282322'   // doorway hollow
const hrB = '#342823'   // board-up plank
const hrG = '#828282'

export const HOUSE_ROOF: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR],
  [hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR],
  [hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG],
  [hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG],
  [hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG],
  [hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG],
  [hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA],
  [hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA],
  [hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrA,hrA,hrA,hrA,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrB,hrB,hrB,hrB,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrB,hrB,hrB,hrB,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrB,hrB,hrB,hrB,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrB,hrB,hrB,hrB,hrP,hrP,hrP,hrP],
  [hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS],
]

// Double-wide house: two HOUSE_ROOF copies side by side. The center openings
// are framed windows (one per half) rather than doors — shortened and lifted
// off the base so they read as windows. Same hr* tokens as HOUSE_ROOF so
// recolorHouseRoof rolls its color identically.
export const HOUSE_ROOF_DOUBLE: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR],
  [hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR],
  [hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG],
  [hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG],
  [hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG],
  [hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG],
  [hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA],
  [hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA],
  [hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrP,hrA,hrA,hrA,hrA,hrP,hrP,hrP,hrP,hrP,hrP,hrA,hrA,hrA,hrA,hrP,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrP,hrB,hrB,hrB,hrB,hrP,hrP,hrP,hrP,hrP,hrP,hrB,hrB,hrB,hrB,hrP,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrP,hrB,hrB,hrB,hrB,hrP,hrP,hrP,hrP,hrP,hrP,hrB,hrB,hrB,hrB,hrP,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrP,hrA,hrA,hrA,hrA,hrP,hrP,hrP,hrP,hrP,hrP,hrA,hrA,hrA,hrA,hrP,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP],
  [hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS],
]

// Gunsmith variant — same as HOUSE_ROOF but with the door open (black).
export const HOUSE_ROOF_OPEN: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR],
  [hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR,hrR],
  [hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG],
  [hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG],
  [hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG],
  [hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG],
  [hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA],
  [hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA,hrA],
  [hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrA,hrA,hrA,hrA,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrA,hrA,hrA,hrA,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrA,hrA,hrA,hrA,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrA,hrA,hrA,hrA,hrP,hrP,hrP,hrP],
  [hrP,hrP,hrP,hrP,hrA,hrA,hrA,hrA,hrP,hrP,hrP,hrP],
  [hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS,hrS],
]

// Base palette values that mark the recolorable regions of HOUSE_ROOF.
// recolorHouseRoof swaps these out for seeded colors per instance.
export const HOUSE_ROOF_ROOF_MAIN = hrG    // roof main
export const HOUSE_ROOF_ROOF_STRIPE = hrR  // roof stripe
export const HOUSE_ROOF_WALL = hrP         // wall plank

// Return a recolored copy of HOUSE_ROOF: roof (main + stripe) and wall swapped
// for the supplied colors. Other keys (door, boards, base shadow) stay fixed.
export function recolorHouseRoof(roofMain: string, roofStripe: string, wall: string, sprite: Sprite = HOUSE_ROOF): Sprite {
  const map: Record<string, string> = {
    [HOUSE_ROOF_ROOF_MAIN]: roofMain,
    [HOUSE_ROOF_ROOF_STRIPE]: roofStripe,
    [HOUSE_ROOF_WALL]: wall,
  }
  return sprite.map(row => row.map(cell => (cell ? (map[cell] ?? cell) : cell)))
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(v * 255).toString(16).padStart(2, '0')
  }
  return '#' + f(0) + f(8) + f(4)
}

let _longhouseRoofTokens: Set<string> | null = null
let _longhouseWallTokens: Set<string> | null = null
const longhouseRoofTokens = () => (_longhouseRoofTokens ??= new Set([hrR, hrG]))
const longhouseWallTokens = () => (_longhouseWallTokens ??= new Set([lhR, lhS, lhD, lhB, lmB]))

export function recolorLonghouseRoof(roofMain: string, roofStripe: string): Sprite {
  const tokens = longhouseRoofTokens()
  const map: Record<string, string> = { [hrR]: roofMain, [hrG]: roofStripe }
  return LONGHOUSE.map(row => row.map(cell => (cell && tokens.has(cell) ? map[cell] : null)))
}

export function longhouseWallLayer(): Sprite {
  const tokens = longhouseWallTokens()
  return LONGHOUSE.map(row => row.map(cell => (cell && tokens.has(cell) ? cell : null)))
}

const lhD = '#777777'
const lhS = '#c1c1c1'
const lhR = '#e0e0e0'
const lhB = '#5f5f5f'
const lmB = '#1e1c1c'

export const LONG_HOUSE: Sprite = [
  [_,_,lhS,lhS,lhS,lhS,lhS,lhS,lhS,lhS,lhS,_,_,_,_,_,_],
  [_,lhS,lhS,lhD,lhD,lhD,lhD,lhD,lhD,lhS,lhS,lhS,lhS,_,_,_,_],
  [_,lhS,lhD,lhR,lhR,lhR,lhR,lhR,lhR,lhD,lhS,lhS,lhS,_,_,_,_],
  [_,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhS,lhS,lhS,_,_,_,_],
  [_,lhS,lhR,lhS,lhR,lhR,lhR,lhS,lhR,lhR,lhS,lhS,lhS,_,_,_,_],
  [_,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhS,lhS,lhS,_,_,_,_],
  [_,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhS,lhS,lhS,_,_,_,_],
  [_,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhD,lhD,_,_,_,_,_],
  [_,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhD,lhD,_,_,_,_,_],
  [_,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhD,lhD,lhR,_,_,_,_],
  [_,lhS,lhR,lhS,lhR,lhR,lhR,lhS,lhR,lhR,lhD,lhD,lhR,_,_,_,_],
  [_,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhS,lhS,_,lhD,_,_,_],
  [_,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhS,lhS,lhS,lhD,_,_,_],
  [_,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhS,lhS,lhS,lhD,_,_,_],
  [_,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhS,lhS,lhS,_,_,_,_],
  [_,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhS,lhS,lhS,_,_,_,_],
  [_,lhS,lhR,lhS,lhR,lhR,lhR,lhS,lhR,lhR,lhS,lhS,lhS,_,_,_,_],
  [_,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhD,lhD,_,_,_,_,_],
  [_,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhD,lhD,_,_,_,_,_],
  [_,lhS,lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhS,lhD,lhD,_,_,_,_,_],
  [_,lhD,lhS,lhS,lhS,lhS,lhS,lhS,lhS,lhS,lhD,lhD,_,_,_,_,_],
  [_,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhR,_,_,_,_],
  [_,lhB,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhB,lhR,_,_,_,_],
  [_,lhD,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhD,_,lhD,_,_,_],
  [_,lhB,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhB,lhR,lhD,_,_,_],
  [_,lhD,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhD,lhD,lhD,_,_,_],
  [_,_,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,_,_,_,_,_,_],
]

export const LONGHOUSE: Sprite = [
  [_,lhS,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhS,_],
  [lhS,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhR,lhS],
  [lhS,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhR,lhR,lhR,lhR,lhR,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhS],
  [lhD,lhS,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhS,lhS,lhS,lhS,lhS,lhS,lhS,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhS,lhD],
  [lhD,lhD,lhD,lhB,lhD,lhD,lhD,lhD,lhB,lhD,lhD,lhD,lhD,lhB,lhD,lhD,lhD,lhD,lhB,lhD,lhD,lhD,lhD,lhB,lhD,lhD,lhD],
  [lhB,lhD,lhB,lhB,lhB,lhD,lhD,lhB,lhB,lhB,lhD,lhD,lhB,lhB,lhB,lhD,lhD,lhB,lhB,lhB,lhD,lhD,lhB,lhB,lhB,lhD,lhB],
  [lhD,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhD],
  [lhB,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,hrG,hrR,lhB,],
  [lhD,lmB,lhD,lmB,lmB,lmB,lmB,lmB,lmB,lhD,lmB,lmB,lmB,lmB,lmB,lmB,lmB,lhD,lmB,lmB,lmB,lmB,lmB,lmB,lmB,lhD,lhD],
  [lhB,lhD,lhD,lhD,lmB,lmB,lmB,lmB,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lmB,lmB,lmB,lmB,lhD,lhD,lhD,lhB],
  [lhD,lhB,lhD,lhB,lmB,lmB,lmB,lmB,lhB,lhD,lhB,lhB,lhB,lhB,lhB,lhB,lhB,lhD,lhB,lmB,lmB,lmB,lmB,lhB,lhB,lhD,lhD],
  [lhD,lhD,lhD,lhD,lmB,lmB,lmB,lmB,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lmB,lmB,lmB,lmB,lhD,lhD,lhD,lhD],
  [_,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,lhD,_],
]

// ---- LAND OFFICE ---- 
const loP = '#B07A45'   // plank wood (warm honey)
const loD = '#7A4F25'   // dark plank / shadow
const loR = '#955A2A'   // roof (reddish brown)
const loS = '#3A1F10'   // sign frame / deep shadow
const loA = '#1A0D05'   // door / window deep
const loC = '#8B5A2B'   // porch post (slightly darker than wall)
export const LAND_OFFICE: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,loR,loR,loR,loR,loR,loR,loR,loR,loR,loR,_,_,_,_],
  [_,loR,loS,loS,loS,loS,loS,loS,loS,loS,loS,loR,_,_,_,_],
  [_,loR,loS,loS,loS,loS,loS,loS,loS,loS,loS,loR,_,_,_,_],
  [_,loR,loS,loS,loS,loS,loS,loS,loS,loS,loS,loR,_,_,_,_],
  [_,loR,loS,loS,loS,loS,loS,loS,loS,loS,loS,loR,_,_,_,_],
  [_,loR,loS,loS,loS,loS,loS,loS,loS,loS,loS,loR,_,_,_,_],
  [_,loP,loP,loP,loP,loP,loP,loP,loP,loP,loP,loP,_,_,_,_],
  [_,loP,loD,loP,loA,loA,loP,loD,loA,loA,loP,loP,_,_,_,_],
  [_,loP,loP,loP,loA,loA,loP,loP,loA,loA,loP,loP,_,_,_,_],
  [_,loP,loD,loP,loA,loA,loP,loD,loA,loA,loP,loP,_,_,_,_],
  [_,loP,loP,loP,loA,loA,loP,loP,loA,loA,loP,loP,_,_,_,_],
  [_,loR,loR,loR,loR,loR,loR,loR,loR,loR,loR,loR,loR,_,_,_,_],
  [_,loC,loC,loC,loC,loC,loC,loC,loC,loC,loC,loC,loC,_,_,_],
  [_,loC,loC,loC,loC,loC,loC,loC,loC,loC,loC,loC,loC,_,_,_],
  [_,loS,loS,loS,loS,loS,loS,loS,loS,loS,loS,loS,loS,_,_,_],
]

// ---- FIELD ---- 16x16. 
const fdD = '#5A3D1F'   // dark furrow
const fdM = '#7A5230'   // mid soil
const fdL = '#9B6E40'   // raised soil ridge
const fdG = '#7BAA3C'   // sprout green
const fdGd = '#3F5828'  // sprout shadow
export const FIELD: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,_,_],
  [_,_,fdM,fdM,fdM,fdM,fdM,fdM,fdM,fdM,fdM,fdM,fdM,fdM,_,_],
  [_,_,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,_,_],
  [_,_,fdL,fdL,fdG,fdL,fdL,fdL,fdL,fdL,fdG,fdL,fdL,fdL,_,_],
  [_,_,fdM,fdM,fdGd,fdM,fdM,fdM,fdM,fdM,fdGd,fdM,fdM,fdM,_,_],
  [_,_,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,_,_],
  [_,_,fdL,fdL,fdL,fdL,fdL,fdG,fdL,fdL,fdL,fdL,fdL,fdL,_,_],
  [_,_,fdM,fdM,fdM,fdM,fdM,fdGd,fdM,fdM,fdM,fdM,fdM,fdM,_,_],
  [_,_,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,_,_],
  [_,_,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdG,fdL,fdL,fdL,fdL,_,_],
  [_,_,fdM,fdM,fdM,fdM,fdM,fdM,fdM,fdGd,fdM,fdM,fdM,fdM,_,_],
  [_,_,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,_,_],
  [_,_,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]


// ---- STORAGE ---- 16x16.
const stBk = '#8e3426'   // brick red
const stBd = '#6c281e'   // brick dark (shadow / mortar)
const stBl = '#9e3e2e'   // brick light (highlight)
const stMt = '#4b1d11'   // mortar line
const stWn = '#1A0D06'   // window deep
const stRf = '#3A1A0E'   // roof dark
const stDr = '#2A1208'   // door deep
export const STORAGE: Sprite = [
  [_,_,stRf,stRf,stRf,stRf,stRf,stRf,stRf,stRf,stRf,stRf,stRf,stRf,_,_],
  [_,stRf,stRf,stRf,stRf,stRf,stRf,stRf,stRf,stRf,stRf,stRf,stRf,stRf,stRf,_],
  [_,stBd,stBk,stBl,stBk,stBk,stBl,stBk,stBk,stBl,stBk,stBk,stBl,stBk,stBd,_],
  [_,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,_],
  [_,stBk,stBl,stBk,stWn,stWn,stBk,stBl,stBk,stBk,stWn,stWn,stBk,stBl,stBk,_],
  [_,stBk,stBk,stBk,stWn,stWn,stBk,stBk,stBk,stBk,stWn,stWn,stBk,stBk,stBk,_],
  [_,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,_],
  [_,stBd,stBk,stBl,stBk,stBk,stBl,stBk,stBk,stBl,stBk,stBk,stBl,stBk,stBd,_],
  [_,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,_],
  [_,stBk,stBl,stBk,stWn,stWn,stBk,stBl,stBk,stBk,stWn,stWn,stBk,stBl,stBk,_],
  [_,stBk,stBk,stBk,stWn,stWn,stBk,stBk,stBk,stBk,stWn,stWn,stBk,stBk,stBk,_],
  [_,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,stMt,_],
  [_,stBd,stBk,stBl,stBk,stBk,stDr,stDr,stDr,stDr,stBk,stBk,stBl,stBk,stBd,_],
  [_,stBd,stBk,stBk,stBk,stBk,stDr,stDr,stDr,stDr,stBk,stBk,stBk,stBk,stBd,_],
  [_,stMt,stMt,stMt,stMt,stMt,stDr,stDr,stDr,stDr,stMt,stMt,stMt,stMt,stMt,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]
const smSt = '#6E6E6E'
const smSd = '#4A4A4A'
const smBk = '#8B3A1A'
const smBd = '#5C2810'
const smFg = '#FF6A1A'
const smFd = '#CC4400'
const smRf = '#3A3A3A'
const smAn = '#555555'
const smDr = '#2A1208'
export const SMELTER: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,smBd,smBk],
  [_,_,_,_,_,_,_,_,_,_,_,smBk,smBd],
  [_,smRf,smRf,smRf,smRf,smRf,smRf,smRf,smRf,smRf,smRf,smBd,smBk],
  [smRf,smRf,smRf,smRf,smRf,smRf,smRf,smRf,smRf,smRf,smRf,smBk,smBd],
  [smSd,smSt,smSt,smSt,smSt,smSt,smSt,smSt,smSt,smSt,smSt,smSt,smSd],
  [smSd,smSt,smSd,smSt,smSt,smSd,smSt,smSt,smSd,smSt,smFg,smFd,smSd],
  [smSd,smSt,smSt,smSt,smSt,smSt,smSt,smSt,smSt,smSt,smFd,smFg,smSd],
  [smSd,smSt,smSd,smSt,smSt,smSd,smSt,smSt,smSd,smSt,smFg,smFd,smSd],
  [smSd,smSt,smSt,smSt,smSt,smSt,smSt,smSt,smSt,smSt,smSt,smSt,smSd],
  [smSd,smSt,smSd,smSt,smSt,smSd,smDr,smDr,smSd,smSt,smSt,smSt,smSd],
  [smSd,smSt,smSt,smSt,smSt,smSt,smDr,smDr,smSt,smSt,smAn,smSt,smSd],
  [smSd,smSt,smSd,smSt,smSt,smSd,smDr,smDr,smSd,smAn,smAn,smAn,smSd],
  [_,smSd,smSd,smSd,smSd,smSd,smSd,smSd,smSd,smSd,smSd,smSd,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_],
]

// Blast Furnace: tall stone shaft tower 
const bfSt = '#6B6B6B'   // stone mid
const bfSd = '#4A4A4A'   // stone shadow
const bfHi = '#8A8A8A'   // stone highlight
const bfBn = '#3A3028'   // iron banding (rust-darkened)
const bfBd = '#241C16'   // band shadow / deep seam
const bfFg = '#FF7A1A'   // furnace glow
const bfFd = '#CC4400'   // glow shadow
const bfSm = '#3A3A3A'   // smoke
const bfSl = '#5A5A5A'   // light smoke
export const BLAST_FURNACE: Sprite = [
  [_,_,_,_,_,bfSl,bfSm,_,_,_,_,_],
  [_,_,_,_,bfSm,bfSl,bfSm,_,_,_,_,_],
  [_,_,_,_,_,bfBn,bfBn,_,_,_,_,_],
  [_,_,_,_,bfSd,bfSt,bfSt,bfSd,_,_,_,_],
  [_,_,_,bfSd,bfSt,bfHi,bfSt,bfSt,bfSd,_,_,_],
  [_,_,_,bfBn,bfBn,bfBn,bfBn,bfBn,bfBn,_,_,_],
  [_,_,_,bfBd,bfBn,bfBd,bfBn,bfBd,bfBn,_,_,_],
  [_,_,bfSd,bfSt,bfHi,bfSt,bfSt,bfSt,bfSt,bfSd,_,_],
  [_,_,bfSd,bfSt,bfSt,bfSd,bfSt,bfHi,bfSt,bfSd,_,_],
  [_,_,bfSd,bfSt,bfSt,bfSt,bfSt,bfSt,bfSt,bfSd,_,_],
  [_,_,bfBn,bfBn,bfBn,bfBn,bfBn,bfBn,bfBn,bfBn,_,_],
  [_,_,bfBd,bfBn,bfBd,bfBn,bfBd,bfBn,bfBd,bfBn,_,_],
  [_,bfSd,bfSt,bfSt,bfHi,bfSt,bfSt,bfSt,bfSt,bfSt,bfSd,_],
  [_,bfSd,bfSt,bfSt,bfSt,bfFd,bfFg,bfFg,bfSt,bfSt,bfSd,_],
  [_,bfSd,bfSt,bfSt,bfSt,bfFg,bfFg,bfFd,bfSt,bfSt,bfSd,_],
  [_,bfSd,bfSt,bfSt,bfSd,bfFd,bfFd,bfSt,bfSt,bfSt,bfSd,_],
  [_,bfSd,bfSt,bfSt,bfSt,bfSt,bfSt,bfSt,bfSt,bfSt,bfSd,_],
  [_,bfSd,bfSd,bfSd,bfSd,bfSd,bfSd,bfSd,bfSd,bfSd,bfSd,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
]
const nuP = '#A89476'   // plank wood (pale weathered)
const nuD = '#6E5E45'   // dark plank / shadow
const nuR = '#7A6650'   // roof (muted brown)
const nuS = '#2E2618'   // sign frame / deep shadow
const nuA = '#120D06'   // door / window deep
export const NURSERY: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,nuR,nuR,nuR,nuR,nuR,nuR,nuR,nuR,nuR,nuR,_,_,_,_],
  [_,nuR,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuR,_,_,_,_],
  [_,nuR,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuR,_,_,_,_],
  [_,nuR,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuR,_,_,_,_],
  [_,nuR,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuR,_,_,_,_],
  [_,nuR,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuR,_,_,_,_],
  [_,nuR,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuR,_,_,_,_],
  [_,nuP,nuP,nuP,nuP,nuP,nuP,nuP,nuP,nuP,nuP,nuP,_,_,_,_],
  [_,nuP,nuD,nuP,nuA,nuA,nuP,nuD,nuA,nuA,nuP,nuP,_,_,_,_],
  [_,nuP,nuP,nuP,nuA,nuA,nuP,nuP,nuA,nuA,nuP,nuP,_,_,_,_],
  [_,nuP,nuD,nuP,nuA,nuA,nuP,nuD,nuA,nuA,nuP,nuP,_,_,_,_],
  [_,nuP,nuP,nuP,nuA,nuA,nuP,nuP,nuA,nuA,nuP,nuP,_,_,_,_],
  [_,nuP,nuD,nuP,nuA,nuA,nuP,nuD,nuA,nuA,nuP,nuP,_,_,_,_],
  [_,nuP,nuP,nuP,nuA,nuA,nuP,nuP,nuA,nuA,nuP,nuP,_,_,_,_],
  [_,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,nuS,_,_,_,_],
]


// Yucca
const yL = '#A8B878'   // leaf light (pale dusty green)
const yM = '#6B8048'   // leaf mid
const yD = '#3F5028'   // leaf dark (center where leaves overlap)
export const YUCCA: Sprite = [
  [_,yL,_,_,yL,_,_,yL],
  [_,_,yM,yM,yM,_,yL,_],
  [yL,yM,yM,yD,yM,yM,_,_],
  [_,yM,yD,yD,yD,yM,yM,yL],
  [yL,yM,yD,yD,yD,yM,_,_],
  [_,yM,yM,yM,yM,_,yL,_],
  [yL,_,_,yM,_,yL,_,_],
  [_,yL,_,_,_,_,_,yL],
]


const svH = '#653d18'   // handle wood
const svM = '#777777'   // metal scoop
const svD = '#444444'   // metal shadow
// Cursor — solid gold arrow, classic pointer shape. 8x8. Tip at (0,0) top-left.
const curG = '#D4A017'   // gold
// Grab cursor — for hovering over interactive things

export const CURSOR_GRAB: Sprite = [
  [_,wwW,_,_,_,_,_,_],
  [_,wwW,_,_,_,_,_,_],
  [_,wwW,wwW,wwW,wwW,wwW,_,_],
  [wwW,wwW,wwW,wwW,wwW,wwW,_,_],
  [_,wwW,wwW,wwW,wwW,wwW,_,_],
  [_,_,wwW,wwW,wwW,wwW,_,_],
  [_,_,wwW,wwW,wwW,wwW,_,_],
  [_,_,_,wwW,wwW,_,_,_],
]

// Destroy cursor
const xR = '#C0392B'   // red
const xD = '#8E2820'   // darker red (center crossing)
export const CURSOR_X: Sprite = [
  [xR,_,_,_,_,_,_,xR],
  [xR,xR,_,_,_,_,xR,xR],
  [_,xR,xR,_,_,xR,xR,_],
  [_,_,xR,xD,xD,xR,_,_],
  [_,_,xR,xD,xD,xR,_,_],
  [_,xR,xR,_,_,xR,xR,_],
  [xR,xR,_,_,_,_,xR,xR],
  [xR,_,_,_,_,_,_,xR],
]

export const CURSOR: Sprite = [
  [wwW,_,_,_,_,_,_,_],
  [wwW,wwW,_,_,_,_,_,_],
  [wwW,wwW,wwW,_,_,_,_,_],
  [wwW,wwW,wwW,wwW,_,_,_,_],
  [wwW,wwW,wwW,wwW,wwW,_,_,_],
  [wwW,wwW,wwW,wwW,wwW,wwW,_,_],
  [wwW,wwW,_,wwW,_,_,_,_],
  [_,_,_,_,wwW,_,_,_],
]

// Dirt patch
const dtL = '#7A5230'   // light brown
const dtM = '#5A3D1F'   // mid brown
const dtD = '#3D2A14'   // dark brown
export const DIRT_PATCH: Sprite = [
  [_,_,dtM,dtM,dtM,dtM,dtM,dtM,dtM,_,_,_],
  [_,dtM,dtL,dtL,dtL,dtL,dtL,dtL,dtL,dtM,_,_],
  [dtM,dtL,dtL,dtL,dtL,dtL,dtL,dtL,dtL,dtL,dtM,_],
  [dtM,dtL,dtL,dtD,dtL,dtL,dtL,dtD,dtL,dtL,dtM,_],
  [dtM,dtL,dtL,dtL,dtL,dtL,dtL,dtL,dtL,dtL,dtM,_],
  [dtM,dtL,dtL,dtL,dtD,dtL,dtL,dtL,dtL,dtL,dtM,_],
  [_,dtM,dtL,dtL,dtL,dtL,dtL,dtL,dtL,dtM,_,_],
  [_,_,dtM,dtM,dtM,dtM,dtM,dtM,dtM,_,_,_],
]

// Shovel stuck in the ground 
export const SHOVEL_DIG: Sprite = [
  [_,_,svH,svH,_,_],
  [_,_,svH,svH,_,_],
  [_,_,svH,svH,_,_],
  [_,_,svH,svH,_,_],
  [_,_,svH,svH,_,_],
  [_,_,svH,svH,_,_],
  [_,svM,svM,svD,svD,_],
  [svM,svM,svM,svD,svD,svD],
  [svM,svM,svM,svD,svD,svD],
  [svM,svM,svM,svD,svD,svD],
  [_,svM,svM,svD,svD,_],
  [_,_,svM,svD,_,_],
]

// ---- ROCK TILES ---- 
const rkL = '#948fa9'   // light stone (highlight)
const rkM = '#52493c'   // mid stone (main)
const rkD = '#47413a'   // dark stone (shadow)

// top-left corner
export const ROCK_TL: Sprite = [
  [_,_,rkM,rkM,rkM,rkM,rkM,rkM],
  [_,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkL,rkL,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkL,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
]

// top edge
export const ROCK_T: Sprite = [
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkL,rkM,rkM,rkM,rkM,rkL,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkD,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
]

// top-right corner
export const ROCK_TR: Sprite = [
  [rkM,rkM,rkM,rkM,rkM,rkM,_,_],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,_],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
]

// left edge
export const ROCK_L: Sprite = [
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkL,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkD,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
]

// center
export const ROCK_C: Sprite = [
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkL,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkD,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkL],
  [rkM,rkM,rkD,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
]

// right edge
export const ROCK_R: Sprite = [
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkD,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkL,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
]

// bottom-left corner
export const ROCK_BL: Sprite = [
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
]

// bottom edge
export const ROCK_B: Sprite = [
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkD,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
]

// bottom-right corner
export const ROCK_BR: Sprite = [
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
]

// bump tile: 8 wide × 11 tall. Rises 3 pixels above a normal top edge.
// Render with origin (0.5, 1) so its bottom aligns with neighbor T tiles.
export const ROCK_BUMP: Sprite = [
  [_,_,rkM,rkM,rkM,rkM,_,_],
  [_,rkM,rkM,rkM,rkM,rkM,rkM,_],
  [rkM,rkM,rkM,rkL,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkD,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkM],
]

// Stone
export const ITEM_STONE: Sprite = [
  [_,_,rkM,rkM,rkM,_,_,_],
  [_,rkM,rkL,rkL,rkM,rkM,_,_],
  [rkM,rkL,rkL,rkM,rkM,rkM,rkM,_],
  [rkM,rkL,rkM,rkM,rkM,rkD,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkD,rkM,rkM,rkM],
  [rkM,rkM,rkM,rkM,rkM,rkM,rkM,rkD],
  [_,rkM,rkM,rkD,rkM,rkM,rkD,_],
  [_,_,rkD,rkM,rkM,rkD,_,_],
]

// Pipe: short horizontal pipe segment
const piG = '#5A6B5A'   // slate green (main body)
const piL = '#7A8B72'   // slate green light (highlight)
const piD = '#3A4A3A'   // slate green dark (shadow)
const piM = '#8A8A8A'   // metal band light
const piMd = '#5A5A5A'  // metal band dark
export const ITEM_PIPE: Sprite = [
  [piM,piMd,_,_,_,_,_,_,_,_,piMd,piM],
  [piM,piG,piG,piG,piG,piG,piG,piG,piG,piG,piG,piM],
  [piM,piL,piL,piL,piL,piL,piL,piL,piL,piL,piL,piM],
  [piM,piL,piL,piL,piL,piL,piL,piL,piL,piL,piL,piM],
  [piM,piG,piG,piG,piG,piG,piG,piG,piG,piG,piG,piM],
  [piM,piD,piD,piD,piD,piD,piD,piD,piD,piD,piD,piM],
  [piM,piG,piG,piG,piG,piG,piG,piG,piG,piG,piG,piM],
  [piM,piMd,_,_,_,_,_,_,_,_,piMd,piM],
]

// Pipe flow chevron
const chL = '#BBBBBB'  // chevron light
const chD = '#3A3A3A'  // chevron dark
export const PIPE_CHEVRON: Sprite = [
  [_,chL,chL,_,_,_],
  [_,chL,chL,chL,_,_],
  [_,_,chL,chL,chL,_],
  [_,_,_,chL,chL,chL],
  [_,_,_,chD,chD,chD],
  [_,_,chD,chD,chD,_],
  [_,chD,chD,chD,_,_],
  [_,chD,chD,_,_,_],
]

// Pipe flow chevron flipped
export const PIPE_CHEVRON_FLIP: Sprite = [
  [_,chD,chD,_,_,_],
  [_,chD,chD,chD,_,_],
  [_,_,chD,chD,chD,_],
  [_,_,_,chD,chD,chD],
  [_,_,_,chL,chL,chL],
  [_,_,chL,chL,chL,_],
  [_,chL,chL,chL,_,_],
  [_,chL,chL,_,_,_],
]

// ---- WOOD FLOOR TILE ----
const wfA = '#734830'   // plank face A
const wfG = '#613926'   // groove between planks / board-end seam
const wfH = '#82563c'   // top-edge highlight on each plank
const wfZ = '#6a3e27'   // darker

export const FLOOR_WOOD: Sprite = [
  [wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfG,wfH,wfH,wfH,wfH,wfH,wfH,wfH],
  [wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfG,wfH,wfZ,wfZ,wfA,wfA,wfA,wfA],
  [wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfG,wfH,wfA,wfA,wfZ,wfZ,wfA,wfA],
  [wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA,wfG,wfH,wfA,wfA,wfA,wfA,wfZ,wfZ],
  [wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfG,wfH,wfA,wfA,wfZ,wfZ,wfA,wfA],
  [wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfG,wfH,wfZ,wfZ,wfA,wfA,wfA,wfA],
  [wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG],
  [wfG,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH],
  [wfG,wfH,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ],
  [wfG,wfH,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA],
  [wfG,wfH,wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA],
  [wfG,wfH,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA],
  [wfG,wfH,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ],
  [wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG],
  [wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfG,wfH,wfH,wfH,wfH,wfH,wfH,wfH],
  [wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfG,wfH,wfZ,wfZ,wfA,wfA,wfA,wfA],
  [wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfG,wfH,wfA,wfA,wfZ,wfZ,wfA,wfA],
  [wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA,wfG,wfH,wfA,wfA,wfA,wfA,wfZ,wfZ],
  [wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfG,wfH,wfA,wfA,wfZ,wfZ,wfA,wfA],
  [wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfG,wfH,wfZ,wfZ,wfA,wfA,wfA,wfA],
  [wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG],
  [wfG,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH,wfH],
  [wfG,wfH,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ],
  [wfG,wfH,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA],
  [wfG,wfH,wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA],
  [wfG,wfH,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA],
  [wfG,wfH,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ,wfA,wfA,wfA,wfA,wfZ,wfZ],
  [wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG,wfG],
]

// ---- FLOOR BORDER TILE ----
const fbD = '#533725'   // dark trim
const fbM = '#7e472d'   // mid trim
const fbL = '#a5754e'   // light trim / diamond highlight
const fbA = '#794835'   // matches wfA so border blends into floor near edge
const fbB = '#85513d'   // 

export const FLOOR_BORDER: Sprite = [
  [fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD],
  [fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM],
  [fbL,fbL,fbM,fbM,fbM,fbM,fbL,fbL,fbL,fbL,fbM,fbM,fbM,fbM,fbL,fbL],
  [fbL,fbL,fbL,fbM,fbM,fbL,fbL,fbL,fbL,fbL,fbL,fbM,fbM,fbL,fbL,fbL],
  [fbM,fbM,fbL,fbL,fbL,fbL,fbM,fbM,fbM,fbM,fbL,fbL,fbL,fbL,fbM,fbM],
  [fbM,fbM,fbM,fbL,fbL,fbM,fbM,fbM,fbM,fbM,fbM,fbL,fbL,fbM,fbM,fbM],
  [fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM,fbM],
  [fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD],
]

export const FLOOR_CORNER: Sprite = [
  [fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD],
  [fbD,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA],
  [fbD,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA],
  [fbD,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA],
  [fbD,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA,fbA],
  [fbD,fbA,fbA,fbA,fbA,fbB,fbB,fbB,fbB,fbB,fbB,fbB,fbB,fbB,fbB,fbB],
  [fbD,fbA,fbA,fbA,fbA,fbB,fbB,fbB,fbB,fbB,fbB,fbB,fbB,fbB,fbB,fbB],
  [fbD,fbA,fbA,fbA,fbA,fbB,fbB,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD],
  [fbD,fbA,fbA,fbA,fbA,fbB,fbB,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD,fbD],
  [fbD,fbA,fbA,fbA,fbA,fbB,fbB,fbD,fbD,fbA,fbA,fbA,fbA,fbA,fbA,fbA],
  [fbD,fbA,fbA,fbA,fbA,fbB,fbB,fbD,fbD,fbA,fbA,fbA,fbA,fbA,fbA,fbA],
  [fbD,fbA,fbA,fbA,fbA,fbB,fbB,fbD,fbD,fbA,fbA,fbA,fbA,fbA,fbA,fbA],
  [fbD,fbA,fbA,fbA,fbA,fbB,fbB,fbD,fbD,fbA,fbA,fbA,fbA,fbA,fbA,fbA],
  [fbD,fbA,fbA,fbA,fbA,fbB,fbB,fbD,fbD,fbA,fbA,fbA,fbA,fbA,fbA,fbA],
  [fbD,fbA,fbA,fbA,fbA,fbB,fbB,fbD,fbD,fbA,fbA,fbA,fbA,fbA,fbA,fbA],
  [fbD,fbA,fbA,fbA,fbA,fbB,fbB,fbD,fbD,fbA,fbA,fbA,fbA,fbA,fbA,fbA],
]

// ---- WALL TRIM ----
const wtL = '#92704e'   // light plank base
const wtD = '#86623c'   // subtle diagonal / groove
const btD = '#b89868'   // highlight

export const WALL_TRIM: Sprite = [
  [wtL,wtD,wtL,wtL,wtL,wtL,wtD,wtL,wtL,wtL,wtD,wtL,wtL,wtL,wtL,wtD],
  [wtL,wtL,wtD,wtL,wtL,wtL,wtL,wtD,wtL,wtL,wtL,wtD,wtL,wtL,wtL,wtL],
  [wtL,wtL,wtL,wtD,wtL,wtL,wtL,wtL,wtD,wtL,wtL,wtL,wtD,wtL,wtL,wtL],
  [wtL,wtL,wtL,wtL,wtD,wtL,wtL,wtL,wtL,wtD,wtL,wtL,wtL,wtD,wtL,wtL],
  [btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD],
  [btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD],
  [btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD,btD],
]

export const WALL_TRIM_CORNER: Sprite = [
  [btD,btD,btD,btD,btD,btD,btD],
  [btD,btD,btD,btD,btD,btD,btD],
  [btD,btD,btD,btD,btD,btD,btD],
  [btD,btD,btD,wtL,wtL,wtL,wtL],
  [btD,btD,btD,wtL,wtL,wtL,wtL],
  [btD,btD,btD,wtL,wtL,wtL,wtL],
  [btD,btD,btD,wtL,wtL,wtL,wtL],
  
]

// ---- WALL TRIM (MISSION) ----
const mtL = '#9d8c6d'   // WALL COLOR
const mbD = '#cdbe9f'   // HIGHLIGHT

export const WALL_TRIM_MISSION: Sprite = [
  [mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL],
  [mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL],
  [mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL],
  [mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL,mtL],
  [mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD],
  [mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD],
  [mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD,mbD],
]

export const WALL_TRIM_MISSION_CORNER: Sprite = [
  [mbD,mbD,mbD,mbD,mbD,mbD,mbD],
  [mbD,mbD,mbD,mbD,mbD,mbD,mbD],
  [mbD,mbD,mbD,mbD,mbD,mbD,mbD],
  [mbD,mbD,mbD,mtL,mtL,mtL,mtL],
  [mbD,mbD,mbD,mtL,mtL,mtL,mtL],
  [mbD,mbD,mbD,mtL,mtL,mtL,mtL],
  [mbD,mbD,mbD,mtL,mtL,mtL,mtL],
]

// ---- DOOR ----
const drS = '#1a0a1e'   // dark purple shadow (interior of doorway)

export const DOOR: Sprite = [
  [drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS],
  [drS,btD,btD,wtL,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,wtL,btD,btD,drS],
  [drS,btD,btD,wtL,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,wtL,btD,btD,drS],
  [drS,btD,btD,wtL,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,wtL,btD,btD,drS],
  [drS,btD,btD,wtL,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,wtL,btD,btD,drS],
  [drS,btD,btD,wtL,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,wtL,btD,btD,drS],
  [drS,btD,btD,wtL,wtL,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,wtL,wtL,btD,btD,drS],
  [drS,btD,btD,wtL,wtL,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,wtL,wtL,btD,btD,drS],
  [drS,btD,btD,wtL,wtL,drS,wfA,drS,wfA,drS,wfA,drS,wfA,drS,wfA,drS,wfA,drS,wfA,drS,drS,wtL,wtL,btD,btD,drS],
  [drS,btD,btD,btD,wtL,drS,drS,wfA,drS,wfA,drS,wfA,drS,wfA,drS,wfA,drS,wfA,drS,wfA,drS,wtL,btD,btD,btD,drS],
  [_,drS,btD,btD,wtL,drS,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,drS,wtL,btD,btD,drS,_],
  [_,drS,btD,btD,wtL,drS,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,drS,wtL,btD,btD,drS,_],
  [_,drS,btD,btD,wtL,drS,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,drS,wtL,btD,btD,drS,_],
  [_,_,drS,btD,wtL,drS,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,drS,wtL,btD,drS,_,_],
  [_,_,drS,btD,wtL,drS,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,drS,wtL,btD,drS,_,_],
  [_,_,drS,btD,wtL,drS,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,drS,wtL,btD,drS,_,_],
  [_,_,drS,btD,wtL,drS,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,drS,wtL,btD,drS,_,_],
  [_,_,drS,btD,wtL,drS,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,drS,wtL,btD,drS,_,_],
  [_,_,drS,btD,wtL,drS,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,wfA,drS,wtL,btD,drS,_,_],
]

// ---- CARPET ----
const cpE = '#3a0e0e'   // dark edge
const cpR = '#7f2a2a'   // red body
const cpG = '#c89a3a'   // gold trim

export const CARPET: Sprite = [
  [cpE,cpG,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpG,cpE],
  [cpE,cpG,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpG,cpE],
  [cpE,cpG,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpG,cpE],
  [cpE,cpG,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpG,cpE],
  [cpE,cpG,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpG,cpE],
  [cpE,cpG,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpG,cpE],
  [cpE,cpG,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpG,cpE],
  [cpE,cpG,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpR,cpG,cpE],
]

// ---- TERRACOTTA FLOOR TILE ----
const tcA = '#7c3925'   // tile face A
const tcB = '#663021'   // tile face B (variation)
const tcG = '#3a1c10'   // grout between tiles
const tcH = '#994529'   // highlight

export const FLOOR_TERRACOTTA: Sprite = [
  [tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcG,tcH,tcH,tcH,tcH,tcH,tcH,tcH],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG],
  [tcG,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH],
  [tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG],
  [tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcG,tcH,tcH,tcH,tcH,tcH,tcH,tcH],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG],
  [tcG,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH,tcH],
  [tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcB],
  [tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG],
]

// ---- WINDOW ----
const wnF = '#faf0dc'   // Light
const wnS = '#adbc3d'   // grass

export const WINDOW: Sprite = [
  [_,_,_,_,_,_,_,_,_,wnF,wnF,wnF,wnF,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,wnF,wnF,wnF,wnF,wnF,_,_,_,_,_],
  [_,_,_,_,_,_,_,wnF,wnF,wnF,wnF,wnF,wnF,_,_,_,_,_],
  [_,_,_,_,_,_,wnF,wnF,wnF,wnF,wnF,wnF,wnF,_,_,_,_,_],
  [_,_,_,_,_,wnF,wnF,wnF,wnF,wnF,wnF,wnF,wnF,_,_,_,_,_],
  [_,_,_,_,wnF,wnF,wnF,wnF,wnF,wnF,wnF,wnF,wnF,_,_,_,_,_],
  [_,_,_,wnF,wnF,wnF,wnF,wnF,wnF,wnF,wnF,wnS,wnS,_,_,_,_,_],
  [_,_,wnF,wnF,wnF,wnF,wnF,wnF,wnF,wnS,wnS,wnS,wnS,_,_,_,_,_],
  [_,_,wnF,wnF,wnF,wnF,wnF,wnF,wnS,wnS,wnS,wnS,wnS,_,_,_,_,_],
  [_,_,wnF,wnF,wnF,wnF,wnF,wnS,wnS,wnS,wnS,wnS,wnS,_,_,_,_,_],
  [_,_,wnF,wnF,wnF,wnF,wnS,wnS,wnS,wnS,wnS,wnS,wnS,_,_,_,_,_],
  [_,_,wnF,wnF,wnF,wnF,wnS,wnS,wnS,wnS,wnS,wnS,wnS,_,_,_,_,_],
  [_,_,wnF,wnF,wnF,wnF,wnS,wnS,wnS,wnS,wnS,wnS,wnS,_,_,_,_,_],
  [_,_,wnF,wnF,wnF,wnF,wnS,wnS,wnS,wnS,wnS,wnS,_,_,_,_,_,_],
  [_,_,wnF,wnF,wnF,wnF,wnS,wnS,wnS,wnS,_,_,_,_,_,_,_,_],
  [_,_,wnF,wnF,wnF,wnF,wnS,wnS,_,_,_,_,_,_,_,_,_,_],
  [_,_,wnF,wnF,wnF,wnF,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,wnF,wnF,wnF,wnF,_,_,_,_,_,_,_,_,_,_,_,_],
]

// ---- BRICK ROW (single row of terracotta bricks) ----
export const BRICK_ROW: Sprite = [
  [tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG,tcG],
  [tcH,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcH,tcB,tcB,tcB,tcB,tcB,tcB,tcG],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcG],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcG],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcG],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcG],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcG],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcG],
  [tcA,tcA,tcA,tcA,tcA,tcA,tcA,tcG,tcB,tcB,tcB,tcB,tcB,tcB,tcB,tcG],
]

// ---- PEW ----
const pwL = '#bc8b4f'   // light wood
const pwM = '#a26c3a'   // wood pattern
const pwB = '#663326'   // shadow band on seat back
const pwC = '#53351c'   // darker shadow

const PEW: Sprite = [
  [drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS],
  [drS,pwM,pwM,drS,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,drS,pwM,pwM,drS],
  [drS,pwM,pwM,drS,pwM,pwM,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwM,pwM,pwM,drS,pwM,pwM,drS],
  [drS,pwL,pwL,drS,pwL,pwL,pwM,pwM,pwM,pwL,pwL,pwL,pwM,pwM,pwM,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwM,pwM,pwM,pwL,pwL,pwL,pwL,pwM,pwM,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwM,pwM,pwM,pwM,pwL,pwL,pwL,pwM,pwM,pwM,pwL,pwL,drS,pwL,pwL,drS],
  [drS,pwL,pwL,drS,pwL,pwL,pwL,pwL,pwM,pwM,pwM,pwM,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwM,pwM,pwM,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwM,pwM,pwM,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwM,pwM,pwM,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwM,pwM,pwM,pwM,pwM,pwL,pwL,pwL,pwL,drS,pwL,pwL,drS],
  [drS,pwM,pwM,drS,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwM,pwM,pwL,pwL,pwL,pwL,pwM,pwM,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwM,pwM,pwM,pwL,pwL,pwL,pwL,pwM,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwM,drS,pwM,pwM,drS],
  [drS,pwM,pwM,drS,pwL,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwM,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwL,drS,pwM,pwM,drS],
  [drS,pwM,pwM,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,pwM,pwM,drS],
  [drS,pwM,pwM,drS,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,pwM,drS,pwM,pwM,drS],
  [drS,pwL,pwL,drS,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,drS,pwL,pwL,drS],
  [drS,pwL,pwL,drS,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,pwL,drS,pwL,pwL,drS],
  [drS,pwB,pwB,drS,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,drS,pwB,pwB,drS],
  [drS,pwB,pwB,drS,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,drS,pwB,pwB,drS],
  [drS,pwB,pwB,drS,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,drS,pwB,pwB,drS],
  [drS,pwB,pwB,drS,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,pwB,drS,pwB,pwB,drS],
  [drS,pwB,pwB,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,pwC,pwC,drS],
  [drS,pwC,pwC,drS,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,pwC,drS,pwC,pwC,drS],
  [drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS],
  [drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS],
  [drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS,drS],
]

// Chest
const cstL = '#9C7248'   // light plank
const cstM = '#8B5A2B'   // mid plank
const cstD = '#4A3318'   // dark outline / batten shadow
export const ITEM_CHEST: Sprite = [
  [cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD],
  [cstD,cstM,cstL,cstM,cstM,cstL,cstM,cstD,cstD,cstM,cstL,cstM,cstM,cstL,cstM,cstD],
  [cstD,cstL,cstD,cstM,cstM,cstD,cstL,cstD,cstD,cstL,cstD,cstM,cstM,cstD,cstL,cstD],
  [cstD,cstM,cstM,cstD,cstD,cstM,cstM,cstD,cstD,cstM,cstM,cstD,cstD,cstM,cstM,cstD],
  [cstD,cstM,cstM,cstD,cstD,cstM,cstM,cstD,cstD,cstM,cstM,cstD,cstD,cstM,cstM,cstD],
  [cstD,cstL,cstD,cstM,cstM,cstD,cstL,cstD,cstD,cstL,cstD,cstM,cstM,cstD,cstL,cstD],
  [cstD,cstM,cstL,cstM,cstM,cstL,cstM,cstD,cstD,cstM,cstL,cstM,cstM,cstL,cstM,cstD],
  [cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD,cstD],
]

// Crate 
const crL = '#9C7248'   // light plank
const crM = '#8B5A2B'   // mid plank
const crD = '#4A3318'   // dark outline / batten shadow
export const ITEM_CRATE: Sprite = [
  [crD,crD,crD,crD,crD,crD,crD,crD],
  [crD,crM,crL,crM,crM,crL,crM,crD],
  [crD,crL,crD,crM,crM,crD,crL,crD],
  [crD,crM,crM,crD,crD,crM,crM,crD],
  [crD,crM,crM,crD,crD,crM,crM,crD],
  [crD,crL,crD,crM,crM,crD,crL,crD],
  [crD,crM,crL,crM,crM,crL,crM,crD],
  [crD,crD,crD,crD,crD,crD,crD,crD],
]

// Silver lockbox
const slL = '#C0C0C0'   // light silver
const slM = '#9A9A9A'   // mid silver
const slD = '#4A4A4A'   // dark outline

export const ITEM_SILVER_LOCKBOX: Sprite = [
  [slD,slD,slD,slD,slD,slD,slD,slD],
  [slD,slM,slL,slM,slM,slL,slM,slD],
  [slD,slL,slD,slM,slM,slD,slL,slD],
  [slD,slM,slM,slD,slD,slM,slM,slD],
  [slD,slM,slM,slD,slD,slM,slM,slD],
  [slD,slL,slD,slM,slM,slD,slL,slD],
  [slD,slM,slL,slM,slM,slL,slM,slD],
  [slD,slD,slD,slD,slD,slD,slD,slD],
]

// Gold lockbox — same shape as crate, gold palette
const glL = '#FFD700'   // light gold
const glM = '#DAA520'   // mid gold
const glD = '#8c5c09'   // dark outline

export const ITEM_GOLD_LOCKBOX: Sprite = [
  [glD,glD,glD,glD,glD,glD,glD,glD],
  [glD,glM,glL,glM,glM,glL,glM,glD],
  [glD,glL,glD,glM,glM,glD,glL,glD],
  [glD,glM,glM,glD,glD,glM,glM,glD],
  [glD,glM,glM,glD,glD,glM,glM,glD],
  [glD,glL,glD,glM,glM,glD,glL,glD],
  [glD,glM,glL,glM,glM,glL,glM,glD],
  [glD,glD,glD,glD,glD,glD,glD,glD],
]

// ---- ORES ---- 
// Coal: near-black with a faint gray sheen.
const coL = '#5A5A5A'
const coM = '#2E2E2E'
const coD = '#141414'
export const ITEM_COAL: Sprite = [
  [_,_,coM,coM,coM,_,_,_],
  [_,coM,coL,coL,coM,coM,_,_],
  [coM,coL,coL,coM,coM,coM,coM,_],
  [coM,coL,coM,coM,coM,coD,coM,coM],
  [coM,coM,coM,coM,coD,coM,coM,coM],
  [coM,coM,coM,coM,coM,coM,coM,coD],
  [_,coM,coM,coD,coM,coM,coD,_],
  [_,_,coD,coM,coM,coD,_,_],
]

// Coke: baked coal
const ckL = '#9a9aa0'
const ckM = '#5e5e64'
const ckD = '#1a1a1a'
export const ITEM_COKE: Sprite = [
  [_,_,_,ckM,ckM,ckM,ckM,ckM,ckM,_,_,_,_,_],
  [_,_,ckM,ckL,ckL,ckL,ckD,ckL,ckL,ckM,ckM,_,_,_],
  [_,ckM,ckL,ckL,ckD,ckL,ckL,ckL,ckL,ckL,ckM,ckM,_,_],
  [ckM,ckL,ckL,ckL,ckL,ckL,ckL,ckD,ckL,ckL,ckL,ckM,ckM,_],
  [ckM,ckL,ckD,ckL,ckL,ckL,ckL,ckL,ckL,ckD,ckL,ckL,ckM,ckM],
  [ckM,ckL,ckL,ckL,ckL,ckD,ckL,ckL,ckL,ckL,ckL,ckL,ckL,ckM],
  [ckM,ckL,ckL,ckL,ckL,ckL,ckL,ckL,ckD,ckL,ckL,ckL,ckM,ckD],
  [ckD,ckM,ckL,ckD,ckL,ckL,ckL,ckL,ckL,ckL,ckD,ckL,ckM,_],
  [_,ckD,ckM,ckL,ckL,ckL,ckD,ckL,ckL,ckL,ckL,ckM,ckD,_],
  [_,_,ckD,ckM,ckM,ckL,ckL,ckL,ckL,ckM,ckM,ckD,_,_],
  [_,_,_,ckD,ckD,ckM,ckM,ckM,ckM,ckD,ckD,_,_,_],
]

// Iron: rusty red-brown
const irL = '#B5713F'
const irM = '#8A4A24'
const irD = '#552A12'
export const ITEM_IRON: Sprite = [
  [_,_,irM,irM,irM,_,_,_],
  [_,irM,irL,irL,irM,irM,_,_],
  [irM,irL,irL,irM,irM,irM,irM,_],
  [irM,irL,irM,irM,irM,irD,irM,irM],
  [irM,irM,irM,irM,irD,irM,irM,irM],
  [irM,irM,irM,irM,irM,irM,irM,irD],
  [_,irM,irM,irD,irM,irM,irD,_],
  [_,_,irD,irM,irM,irD,_,_],
]

// Copper: bright orange-brown with a hint of patina.
const cuL = '#E08A4A'
const cuM = '#C46A2E'
const cuD = '#7A3D16'
export const ITEM_COPPER: Sprite = [
  [_,_,cuM,cuM,cuM,_,_,_],
  [_,cuM,cuL,cuL,cuM,cuM,_,_],
  [cuM,cuL,cuL,cuM,cuM,cuM,cuM,_],
  [cuM,cuL,cuM,cuM,cuM,cuD,cuM,cuM],
  [cuM,cuM,cuM,cuM,cuD,cuM,cuM,cuM],
  [cuM,cuM,cuM,cuM,cuM,cuM,cuM,cuD],
  [_,cuM,cuM,cuD,cuM,cuM,cuD,_],
  [_,_,cuD,cuM,cuM,cuD,_,_],
]

// Silver: pale cool gray-white. 
const siL = '#F0F2F5'
const siM = '#C2C8D0'
const siD = '#8A929C'
export const ITEM_SILVER: Sprite = [
  [_,_,siM,siM,siM,_,_,_],
  [_,siM,siL,siL,siM,siM,_,_],
  [siM,siL,siL,siM,siM,siM,siM,_],
  [siM,siL,siM,siM,siM,siD,siM,siM],
  [siM,siM,siM,siM,siD,siM,siM,siM],
  [siM,siM,siM,siM,siM,siM,siM,siD],
  [_,siM,siM,siD,siM,siM,siD,_],
  [_,_,siD,siM,siM,siD,_,_],
]

// Gold: warm yellow. 
const goL = '#FFE680'
const goM = '#E0A92E'
const goD = '#9C6E14'
export const ITEM_GOLD: Sprite = [
  [_,_,goM,goM,goM,_,_,_],
  [_,goM,goL,goL,goM,goM,_,_],
  [goM,goL,goL,goM,goM,goM,goM,_],
  [goM,goL,goM,goM,goM,goD,goM,goM],
  [goM,goM,goM,goM,goD,goM,goM,goM],
  [goM,goM,goM,goM,goM,goM,goM,goD],
  [_,goM,goM,goD,goM,goM,goD,_],
  [_,_,goD,goM,goM,goD,_,_],
]

const ibD = '#d2d4ea'
const ibB = '#acacb6'
const ibS = '#909098'
const ibR = '#55555c'

export const ITEM_IRON_BAR: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,ibR,ibR,ibR,ibR,_,_,_],
  [_,_,_,_,_,_,ibR,ibS,ibS,ibS,ibR,ibR,_,_],
  [_,_,_,_,_,ibR,ibS,ibS,ibS,ibS,ibS,ibR,_,_],
  [_,_,_,_,ibR,ibS,ibS,ibS,ibB,ibB,ibB,ibR,_,_],
  [_,_,_,ibR,ibS,ibS,ibS,ibB,ibB,ibB,ibR,ibR,_,_],
  [_,_,ibR,ibS,ibS,ibS,ibS,ibB,ibB,ibR,ibR,ibR,_,_],
  [_,ibR,ibS,ibS,ibS,ibS,ibB,ibB,ibR,ibR,ibR,_,_,_],
  [ibR,ibB,ibS,ibS,ibS,ibB,ibB,ibR,ibR,ibR,_,_,_,_],
  [ibR,ibB,ibD,ibD,ibD,ibB,ibR,ibR,ibR,_,_,_,_,_],
  [_,ibR,ibD,ibD,ibD,ibR,ibR,ibR,_,_,_,_,_,_],
  [_,ibR,ibR,ibR,ibR,ibR,ibR,_,_,_,_,_,_,_],
  [_,_,ibR,ibR,ibR,ibR,_,_,_,_,_,_,_,_],
]

const sbT = '#bec7ed'
const sbB = '#8f9abd'
const sbS = '#7483a3'
const sbR = '#3e475d'
export const ITEM_STEEL: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,sbR,sbR,sbR,sbR,_,_,_],
  [_,_,_,_,_,_,sbR,sbS,sbS,sbS,sbR,sbR,_,_],
  [_,_,_,_,_,sbR,sbS,sbS,sbS,sbS,sbS,sbR,_,_],
  [_,_,_,_,sbR,sbS,sbS,sbS,sbB,sbB,sbB,sbR,_,_],
  [_,_,_,sbR,sbS,sbS,sbS,sbB,sbB,sbB,sbR,sbR,_,_],
  [_,_,sbR,sbS,sbS,sbS,sbS,sbB,sbB,sbR,sbR,sbR,_,_],
  [_,sbR,sbS,sbS,sbS,sbS,sbB,sbB,sbR,sbR,sbR,_,_,_],
  [sbR,sbB,sbS,sbS,sbS,sbB,sbB,sbR,sbR,sbR,_,_,_,_],
  [sbR,sbB,sbT,sbT,sbT,sbB,sbR,sbR,sbR,_,_,_,_,_],
  [_,sbR,sbT,sbT,sbT,sbR,sbR,sbR,_,_,_,_,_,_],
  [_,sbR,sbR,sbR,sbR,sbR,sbR,_,_,_,_,_,_,_],
  [_,_,sbR,sbR,sbR,sbR,_,_,_,_,_,_,_,_],
]

const cpbHi = '#F5BE7E'
const cpbL = '#DC9450'
const cpbM = '#C07838'
const cpbD = '#894c1d'
export const ITEM_COPPER_BAR: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,cpbD,cpbD,cpbD,cpbD,_,_,_],
  [_,_,_,_,_,_,cpbD,cpbM,cpbM,cpbM,cpbD,cpbD,_,_],
  [_,_,_,_,_,cpbD,cpbM,cpbM,cpbM,cpbM,cpbM,cpbD,_,_],
  [_,_,_,_,cpbD,cpbM,cpbM,cpbM,cpbL,cpbL,cpbL,cpbD,_,_],
  [_,_,_,cpbD,cpbM,cpbM,cpbM,cpbL,cpbL,cpbL,cpbD,cpbD,_,_],
  [_,_,cpbD,cpbM,cpbM,cpbM,cpbM,cpbL,cpbL,cpbD,cpbD,cpbD,_,_],
  [_,cpbD,cpbM,cpbM,cpbM,cpbM,cpbL,cpbL,cpbD,cpbD,cpbD,_,_,_],
  [cpbD,cpbL,cpbM,cpbM,cpbM,cpbL,cpbL,cpbD,cpbD,cpbD,_,_,_,_],
  [cpbD,cpbL,cpbHi,cpbHi,cpbHi,cpbL,cpbD,cpbD,cpbD,_,_,_,_,_],
  [_,cpbD,cpbHi,cpbHi,cpbHi,cpbD,cpbD,cpbD,_,_,_,_,_,_],
  [_,cpbD,cpbD,cpbD,cpbD,cpbD,cpbD,_,_,_,_,_,_,_],
  [_,_,cpbD,cpbD,cpbD,cpbD,_,_,_,_,_,_,_,_],
]

const sbHi = '#FFFFFF'
const sbL = '#dedeee'
const sbM = '#b4b4c6'
const sbD = '#6d6d87'
export const ITEM_SILVER_BAR: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,sbD,sbD,sbD,sbD,_,_,_],
  [_,_,_,_,_,_,sbD,sbM,sbM,sbM,sbD,sbD,_,_],
  [_,_,_,_,_,sbD,sbM,sbM,sbM,sbM,sbM,sbD,_,_],
  [_,_,_,_,sbD,sbM,sbM,sbM,sbL,sbL,sbL,sbD,_,_],
  [_,_,_,sbD,sbM,sbM,sbM,sbL,sbL,sbL,sbD,sbD,_,_],
  [_,_,sbD,sbM,sbM,sbM,sbM,sbL,sbL,sbD,sbD,sbD,_,_],
  [_,sbD,sbM,sbM,sbM,sbM,sbL,sbL,sbD,sbD,sbD,_,_,_],
  [sbD,sbL,sbM,sbM,sbM,sbL,sbL,sbD,sbD,sbD,_,_,_,_],
  [sbD,sbL,sbHi,sbHi,sbHi,sbL,sbD,sbD,sbD,_,_,_,_,_],
  [_,sbD,sbHi,sbHi,sbHi,sbD,sbD,sbD,_,_,_,_,_,_],
  [_,sbD,sbD,sbD,sbD,sbD,sbD,_,_,_,_,_,_,_],
  [_,_,sbD,sbD,sbD,sbD,_,_,_,_,_,_,_,_],
]

const gbHi = '#FFF4C0'
const gbL = '#f0da83'
const gbM = '#dea930'
const gbD = '#8d6521'
export const ITEM_GOLD_BAR: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,gbD,gbD,gbD,gbD,_,_,_],
  [_,_,_,_,_,_,gbD,gbM,gbM,gbM,gbD,gbD,_,_],
  [_,_,_,_,_,gbD,gbM,gbM,gbM,gbM,gbM,gbD,_,_],
  [_,_,_,_,gbD,gbM,gbM,gbM,gbL,gbL,gbL,gbD,_,_],
  [_,_,_,gbD,gbM,gbM,gbM,gbL,gbL,gbL,gbD,gbD,_,_],
  [_,_,gbD,gbM,gbM,gbM,gbM,gbL,gbL,gbD,gbD,gbD,_,_],
  [_,gbD,gbM,gbM,gbM,gbM,gbL,gbL,gbD,gbD,gbD,_,_,_],
  [gbD,gbL,gbM,gbM,gbM,gbL,gbL,gbD,gbD,gbD,_,_,_,_],
  [gbD,gbL,gbHi,gbHi,gbHi,gbL,gbD,gbD,gbD,_,_,_,_,_],
  [_,gbD,gbHi,gbHi,gbHi,gbD,gbD,gbD,_,_,_,_,_,_],
  [_,gbD,gbD,gbD,gbD,gbD,gbD,_,_,_,_,_,_,_],
  [_,_,gbD,gbD,gbD,gbD,_,_,_,_,_,_,_,_],
]

const bdW = '#8B6B3E'
const bdH = '#5C3A1A'
const bdI = '#9A9A9F'
const bdId = '#6B6B70'
export const ITEM_BRAND: Sprite = [
  [_,_,_,_,_,_,bdId,bdI],
  [_,_,_,_,_,bdId,bdI,_],
  [_,_,_,_,bdId,bdI,_,_],
  [_,_,_,bdId,bdI,_,_,_],
  [_,_,bdH,bdW,_,_,_,_],
  [_,bdH,bdW,_,_,_,_,_],
  [bdH,bdW,_,_,_,_,_,_],
  [bdH,_,_,_,_,_,_,_],
]
// terracotta 
const clL = '#CC9870'
const clM = '#A6724F'
const clD = '#6E4830'
export const ITEM_CLAY: Sprite = [
  [_,_,clM,clM,clM,_,_,_],
  [_,clM,clL,clL,clM,clM,_,_],
  [clM,clL,clL,clM,clM,clM,clM,_],
  [clM,clL,clM,clM,clM,clD,clM,clM],
  [clM,clM,clM,clM,clD,clM,clM,clM],
  [clM,clM,clM,clM,clM,clM,clM,clD],
  [_,clM,clM,clD,clM,clM,clD,_],
  [_,_,clD,clM,clM,clD,_,_],
]

export const ITEM_SHOVEL: Sprite = [
  [_,_,_,_,_,_,svH,_],
  [_,_,_,_,_,svH,_,_],
  [_,_,_,_,svH,_,_,_],
  [_,_,_,svH,_,_,_,_],
  [_,_,svM,svD,_,_,_,_],
  [_,svM,svM,svD,_,_,_,_],
  [svM,svM,svM,svD,_,_,_,_],
  [_,svM,svD,_,_,_,_,_],
]

const mlH = '#9C7A4A'
const mlL = '#7A5A38'
const mlD = '#4A3420'
export const ITEM_MALLET: Sprite = [
  [_,_,mlL,mlL,mlL,mlL,_,_],
  [_,mlL,mlD,mlD,mlD,mlD,mlL,_],
  [_,mlL,mlD,mlD,mlD,mlD,mlL,_],
  [_,_,mlL,mlH,mlH,mlL,_,_],
  [_,_,_,mlH,mlH,_,_,_],
  [_,_,_,mlH,mlH,_,_,_],
  [_,_,_,mlH,mlH,_,_,_],
  [_,_,_,mlH,mlH,_,_,_],
]

// Axe
export const ITEM_AXE: Sprite = [
  [_,_,_,svM,svM,svD,_,_],
  [_,_,svM,svM,svM,svD,svD,_],
  [_,_,svM,svM,svD,svH,_,_],
  [_,_,_,_,svH,_,_,_],
  [_,_,_,svH,_,_,_,_],
  [_,_,svH,_,_,_,_,_],
  [_,svH,_,_,_,_,_,_],
  [svH,_,_,_,_,_,_,_],
]

// Pickaxe
export const ITEM_PICKAXE: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,svM,svM,svM,svM,svM,_,_,_],
  [_,_,_,_,_,svM,svD,svD,svD,_,_],
  [_,_,_,_,svH,svD,_,_,svD,_,_],
  [_,_,_,svH,_,_,_,_,_,_,_],
  [_,_,svH,_,_,_,_,_,_,_,_],
  [_,svH,_,_,_,_,_,_,_,_,_],
  [svH,_,_,_,_,_,_,_,_,_,_],
]

// ---- TOOLS ----

// Greedy
const grM = '#DAA520'   // gold face
const grDd = '#895e13'   // gold shadow
const grL = '#FFE680'   // gold highlight
const Ss = '#383046'

export const ITEM_GREEDY: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,grL,grL,grM,grM,grM,_,_,_],
  [_,_,_,_,_,grL,grDd,grDd,grDd,_,_],
  [_,_,_,_,Ss,grDd,_,_,grDd,_,_],
  [_,_,_,Ss,_,_,_,_,_,_,_],
  [_,_,Ss,_,_,_,_,_,_,_,_],
  [_,Ss,_,_,_,_,_,_,_,_,_],
  [Ss,_,_,_,_,_,_,_,_,_,_],
]

// Double Jack
const djM = '#7c7c7c'
const djD = '#454545'
export const ITEM_DOUBLE_JACK: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_],
  [_,_,djD,djD,djM,djM,djM,djD,djD,_,_],
  [_,_,_,djD,djM,djM,djM,djD,_,_,_],
  [_,_,_,_,Ss,svH,djM,_,_,_,_],
  [_,_,_,Ss,_,_,_,_,_,_,_],
  [_,_,Ss,_,_,_,_,_,_,_,_],
  [_,Ss,_,_,_,_,_,_,_,_,_],
  [Ss,_,_,_,_,_,_,_,_,_,_],
]

// Toledo
const tlM = '#8a9bb0'
const tlD = '#566273'
const tlH = '#cdd9e6'
const pbR = '#9c3b2e'
export const ITEM_TOLEDO: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,tlH,tlH,tlM,tlM,tlM,_,_,_],
  [_,_,_,_,_,tlH,tlD,tlD,tlD,_,_],
  [_,_,_,_,pbR,tlD,_,_,tlD,_,_],
  [_,_,_,pbR,_,_,_,_,_,_,_],
  [_,_,pbR,_,_,_,_,_,_,_,_],
  [_,pbR,_,_,_,_,_,_,_,_,_],
  [pbR,_,_,_,_,_,_,_,_,_,_],
]

export const ITEM_TEMPERED_SHOVEL: Sprite = ITEM_SHOVEL.map(row => row.map(c => c === svM ? tlM : c === svD ? tlD : c))
export const SHOVEL_DIG_TEMPERED: Sprite = SHOVEL_DIG.map(row => row.map(c => c === svM ? tlM : c === svD ? tlD : c))

// Tempered Steel Pick
export const ITEM_TEMPERED_PICK: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,tlH,tlH,tlM,tlM,tlM,_,_,_],
  [_,_,_,_,_,tlH,tlD,tlD,tlD,_,_],
  [_,_,_,_,svH,tlD,_,_,tlD,_,_],
  [_,_,_,svH,_,_,_,_,_,_,_],
  [_,_,svH,_,_,_,_,_,_,_,_],
  [_,svH,_,_,_,_,_,_,_,_,_],
  [svH,_,_,_,_,_,_,_,_,_,_],
]

// Tempered Steel Axe
export const ITEM_TEMPERED_AXE: Sprite = [
  [_,_,_,tlM,tlM,tlD,_,_],
  [_,_,tlM,tlM,tlM,tlD,tlD,_],
  [_,_,tlM,tlM,tlD,svH,_,_],
  [_,_,_,_,svH,_,_,_],
  [_,_,_,svH,_,_,_,_],
  [_,_,svH,_,_,_,_,_],
  [_,svH,_,_,_,_,_,_],
  [svH,_,_,_,_,_,_,_],
]

// Paul Bunyan
const pbM = '#888888'
const pbD = '#4d4d4d'
export const ITEM_PAUL_BUNYAN: Sprite = [
  [_,_,tlH,pbM,pbM,pbD,_,_],
  [_,tlH,pbM,pbM,pbM,pbD,pbD,_],
  [_,tlH,pbM,pbM,pbD,pbR,_,_],
  [_,_,pbM,pbD,pbR,_,_,_],
  [_,_,_,pbR,_,_,_,_],
  [_,_,pbR,_,_,_,_,_],
  [_,pbR,_,_,_,_,_,_],
  [pbR,_,_,_,_,_,_,_],
]

// Wild Bill
const wbM = '#5f5f5f'
const wbD = '#363636'
const wbE = '#a82c22'
export const ITEM_WILD_BILL: Sprite = [
  [_,_,_,wbE,wbM,wbD,_,_],
  [_,_,wbE,wbM,wbM,wbD,wbD,_],
  [_,_,wbE,wbM,wbD,svH,_,_],
  [_,_,_,_,svH,_,_,_],
  [_,_,_,svH,_,_,_,_],
  [_,_,svH,_,_,_,_,_],
  [_,svH,_,_,_,_,_,_],
  [svH,_,_,_,_,_,_,_],
]

// Damascus Steel Pick
const dpkM = '#3a3a3a'   // dark steel face
const dpkD = '#1c1c1c'   // near-black shadow
const dpkL = '#555555'   // banding highlight
const dpkH = '#262626'   // dark handle
export const ITEM_DAMASCUS_PICK: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,dpkL,dpkM,dpkL,dpkM,dpkM,_,_,_],
  [_,_,_,_,_,dpkM,dpkD,dpkL,dpkD,_,_],
  [_,_,_,_,dpkH,dpkD,_,_,dpkD,_,_],
  [_,_,_,dpkH,_,_,_,_,_,_,_],
  [_,_,dpkH,_,_,_,_,_,_,_,_],
  [_,dpkH,_,_,_,_,_,_,_,_,_],
  [dpkH,_,_,_,_,_,_,_,_,_,_],
]

// Bag: brown leather pouch with drawstring. 8x8.
const bgL = '#A07040'   // leather light
const bgD = '#6B4422'   // leather dark
const bgS = '#8B5A2B'   // leather shadow
const bgT = '#5A3D26'   // drawstring tie
export const ITEM_BAG: Sprite = [
  [_,_,bgT,bgT,bgT,bgT,_,_],
  [_,bgT,bgL,bgL,bgL,bgL,bgT,_],
  [_,bgS,bgL,bgL,bgL,bgL,bgS,_],
  [bgS,bgL,bgL,bgL,bgL,bgL,bgL,bgS],
  [bgS,bgL,bgL,bgD,bgD,bgL,bgL,bgS],
  [bgS,bgL,bgD,bgD,bgD,bgD,bgL,bgS],
  [_,bgS,bgD,bgD,bgD,bgD,bgS,_],
  [_,_,bgS,bgS,bgS,bgS,_,_],
]

// Sack: a bulging burlap sack cinched at the neck. 8x8
const vnL = '#ad926c' 
const vnM = '#977545'
const vnB = '#7e5e32'
export const ITEM_SACK: Sprite = [
  [_,vnL,vnL,vnL,vnL,vnL,vnL,_],
  [_,vnL,vnL,vnB,vnL,vnL,vnM,_],
  [_,_,vnM,vnB,vnM,vnL,vnM,_],
  [_,_,_,vnM,vnB,vnB,_,_],
  [_,_,vnL,vnL,vnM,vnL,_,_],
  [_,vnL,vnL,vnM,vnL,vnL,vnL,_],
  [vnL,vnL,vnL,vnB,vnL,vnL,vnB,vnL,],
  [vnM,vnL,vnL,vnM,vnL,vnL,vnB,vnL],
  [vnM,vnM,vnL,vnL,vnL,vnL,vnL,vnL],
  [vnM,vnM,vnM,vnL,vnL,vnL,vnL,vnL],
  [vnM,vnM,vnM,vnM,vnL,vnL,vnL,vnL],
  [vnM,vnM,vnM,vnM,vnM,vnL,vnL,vnM],
  [_,vnB,vnB,vnM,vnM,vnM,vnM,vnL],
]

// Medium Bag: larger version of the bag with a slight green tint and a metal
// buckle on the front. 12x12. Mid-game upgrade — holds 2x3 = 6 slots.
const bbL = '#8E8550'   // green-tinted leather light
const bbD = '#574D2A'   // green-tinted leather dark
const bbS = '#73683E'   // shadow
const bbT = '#3F3820'   // drawstring
const bbB = '#C9C2A8'   // metal buckle highlight
const bbM = '#9C9685'   // metal buckle mid
export const ITEM_MEDIUM_BAG: Sprite = [
  [_,_,_,bbT,bbT,bbT,bbT,bbT,bbT,_,_,_],
  [_,_,bbT,bbL,bbL,bbL,bbL,bbL,bbL,bbT,_,_],
  [_,bbT,bbS,bbL,bbL,bbL,bbL,bbL,bbL,bbS,bbT,_],
  [_,bbS,bbL,bbL,bbL,bbL,bbL,bbL,bbL,bbL,bbS,_],
  [bbS,bbL,bbL,bbL,bbB,bbM,bbM,bbB,bbL,bbL,bbL,bbS],
  [bbS,bbL,bbL,bbL,bbM,bbD,bbD,bbM,bbL,bbL,bbL,bbS],
  [bbS,bbL,bbL,bbD,bbD,bbD,bbD,bbD,bbD,bbL,bbL,bbS],
  [bbS,bbL,bbD,bbD,bbD,bbD,bbD,bbD,bbD,bbD,bbL,bbS],
  [bbS,bbL,bbD,bbD,bbD,bbD,bbD,bbD,bbD,bbD,bbL,bbS],
  [_,bbS,bbD,bbD,bbD,bbD,bbD,bbD,bbD,bbD,bbS,_],
  [_,_,bbS,bbD,bbD,bbD,bbD,bbD,bbD,bbS,_,_],
  [_,_,_,bbS,bbS,bbS,bbS,bbS,bbS,_,_,_],
]

// Sausage: reddish-brown link with highlight and tied ends. 8x8.
const sgM = '#A03828'   // sausage mid
const sgD = '#6B2418'   // sausage dark
const sgL = '#C44838'   // sausage highlight
const sgT = '#3D1A0E'   // tied ends
export const ITEM_SAUSAGE: Sprite = [
  [_,sgT,sgD,sgM,sgM,sgD,sgT,sgD],
  [sgT,sgD,sgM,sgL,sgL,sgM,sgD,sgT],
  [_,sgT,sgD,sgM,sgM,sgD,sgT,_],
  [_,_,sgT,sgD,sgD,sgT,_,_],
  [sgT,sgD,sgM,sgL,sgL,sgM,sgD,sgT],
  [_,sgT,sgD,sgM,sgM,sgD,sgT,_],
  [_,_,sgT,sgD,sgD,sgT,_,_],
]

// Kolache: golden pastry round with sausage centered in the middle. 8x8.
const kP = '#E8B860'   // pastry light
const kPm = '#C49043'  // pastry mid
const kPd = '#8B6028'  // pastry dark crust
export const ITEM_KOLACHE: Sprite = [
  [_,kPd,kP,kP,kP,kP,kPd,_],
  [kPd,kP,kPm,kPm,kPm,kPm,kP,kPd],
  [kP,kPm,sgD,sgM,sgM,sgD,kPm,kP],
  [kP,kPm,sgM,sgL,sgL,sgM,kPm,kP],
  [kP,kPm,sgM,sgL,sgL,sgM,kPm,kP],
  [kP,kPm,sgD,sgM,sgM,sgD,kPm,kP],
  [kPd,kP,kPm,kPm,kPm,kPm,kP,kPd],
  [_,kPd,kP,kP,kP,kP,kPd,_],
]

// Leather: tan rectangular hide with darker edges. 8x8.
const ltL = '#B68957'   // hide light
const ltM = '#8B5A2B'   // hide mid
const ltD = '#5A3D1F'   // hide dark edge
export const ITEM_LEATHER: Sprite = [
  [_,ltD,ltD,ltD,ltD,ltD,ltD,_],
  [ltD,ltM,ltL,ltL,ltL,ltL,ltM,ltD],
  [ltD,ltL,ltL,ltL,ltL,ltL,ltL,ltD],
  [ltD,ltL,ltM,ltL,ltL,ltM,ltL,ltD],
  [ltD,ltL,ltL,ltL,ltL,ltL,ltL,ltD],
  [ltD,ltM,ltL,ltL,ltL,ltL,ltM,ltD],
  [ltD,ltM,ltM,ltM,ltM,ltM,ltM,ltD],
  [_,ltD,ltD,ltD,ltD,ltD,ltD,_],
]

// Twine: small bundle of twisted fibers, tied in the middle. 8x8.
const twL = '#D6B97A'   // fiber light
const twM = '#A0855B'   // fiber mid
const twD = '#5A3D26'   // tie/shadow
export const ITEM_TWINE: Sprite = [
  [_,twM,twL,twM,twL,twM,twL,_],
  [_,twL,twM,twL,twM,twL,twM,_],
  [_,twM,twL,twM,twL,twM,twL,_],
  [twD,twD,twD,twD,twD,twD,twD,twD],
  [twD,twD,twD,twD,twD,twD,twD,twD],
  [_,twL,twM,twL,twM,twL,twM,_],
  [_,twM,twL,twM,twL,twM,twL,_],
  [_,twL,twM,twL,twM,twL,twM,_],
]

const ddP = '#E8D9A8'
const ddM = '#C9B27A'
const ddD = '#9A7E4E'
const ddT = '#6B4E2A'
export const ITEM_DEED: Sprite = [
  [_,ddM,ddM,ddM,ddM,ddM,ddM,ddM,ddM,ddM,_],
  [ddD,ddM,ddP,ddT,ddT,ddT,ddT,ddT,ddP,ddM,ddD],
  [ddD,ddM,ddP,ddP,ddP,ddP,ddP,ddP,ddP,ddM,ddD],
  [ddD,ddM,ddP,ddT,ddT,ddT,ddT,ddT,ddP,ddM,ddD],
  [ddD,ddM,ddP,ddP,ddP,ddP,ddP,ddP,ddP,ddM,ddD],
  [ddD,ddM,ddP,ddT,ddT,ddT,ddT,ddT,ddP,ddM,ddD],
  [ddD,ddM,ddP,ddP,ddP,ddP,ddP,ddP,ddP,ddM,ddD],
  [ddD,ddM,ddP,ddT,ddT,ddT,ddT,ddT,ddP,ddM,ddD],
  [ddD,ddM,ddP,ddP,ddP,ddP,ddP,ddP,ddP,ddM,ddD],
  [ddD,ddM,ddP,ddT,ddT,ddT,ddT,ddT,ddP,ddM,ddD],
  [ddD,ddM,ddP,ddP,ddP,ddP,ddP,ddP,ddP,ddM,ddD],
  [_,ddM,ddM,ddM,ddM,ddM,ddM,ddM,ddM,ddM,_],
]

// Canvas
export const ITEM_CANVAS: Sprite = [
  [twD,twD,twD,twD,twD,twD,twD,twD],
  [twD,twL,twM,twL,twM,twL,twM,twD],
  [twD,twM,twL,twM,twL,twM,twL,twD],
  [twD,twL,twM,twL,twM,twL,twM,twD],
  [twD,twM,twL,twM,twL,twM,twL,twD],
  [twD,twL,twM,twL,twM,twL,twM,twD],
  [twD,twM,twL,twM,twL,twM,twL,twD],
  [twD,twD,twD,twD,twD,twD,twD,twD],
]

// Sugar cane: tall green stalk with segmented joints. 8x8.
const scL = '#7BAA3C'   // leaf light green
const scM = '#5A8024'   // stalk mid green
const scD = '#3E5818'   // joint dark
export const ITEM_SUGAR_CANE: Sprite = [
  [_,_,scL,_,_,scL,_,_],
  [_,scL,scM,scL,_,_,_,_],
  [_,_,scM,scM,scM,_,_,_],
  [_,_,scD,scM,scM,_,_,_],
  [_,_,scM,scD,scM,_,_,_],
  [_,_,scM,scM,scM,_,_,_],
  [_,_,scD,scM,scM,_,_,_],
  [_,_,scM,scM,scM,_,_,_],
  [_,_,scM,scM,scM,_,_,_],
]

// Sugar: white granules piled up. 8x8.
const sugW = '#FFFFFF'
const sugG = '#D8D8D8'
const sugK = '#A8A8A8'
export const ITEM_SUGAR: Sprite = [
  [_,_,_,sugW,sugW,_,_,_],
  [_,_,sugW,sugG,sugG,sugW,_,_],
  [_,sugW,sugG,sugW,sugW,sugG,sugW,_],
  [sugW,sugG,sugW,sugW,sugW,sugW,sugG,sugW],
  [sugW,sugG,sugG,sugW,sugW,sugG,sugG,sugW],
  [sugG,sugG,sugK,sugG,sugG,sugK,sugG,sugG],
  [sugG,sugK,sugK,sugG,sugG,sugK,sugK,sugG],
  [sugK,sugK,sugK,sugK,sugK,sugK,sugK,sugK],
]

// Tart: golden flaky bun, swirled sugar glaze on top. 8x8.
const pasL = '#F4D17E'   // dough light
const pasM = '#D8A848'   // dough mid
const pasD = '#9C6E20'   // crust dark
const pasG = '#FFFFFF'   // sugar glaze
export const ITEM_TART: Sprite = [
  [_,pasD,pasM,pasM,pasM,pasM,pasD,_],
  [pasD,pasM,pasL,pasG,pasG,pasL,pasM,pasD],
  [pasM,pasL,pasG,pasL,pasL,pasG,pasL,pasM],
  [pasM,pasG,pasL,pasL,pasL,pasL,pasG,pasM],
  [pasM,pasG,pasL,pasL,pasL,pasL,pasG,pasM],
  [pasM,pasL,pasG,pasL,pasL,pasG,pasL,pasM],
  [pasD,pasM,pasL,pasG,pasG,pasL,pasM,pasD],
  [_,pasD,pasM,pasM,pasM,pasM,pasD,_],
]

// Cottonwood
const cotBk = '#745f44'   // bark mid
const cotBkD = '#4a3928'  // bark shadow
const cotLfL = '#668e7b'  // leaves light (grey-green)
const cotLfM = '#48683d'  // leaves mid (muted green)
const cotLfD = '#2c4d2b'  // leaves dark (deep muted green)
const brrW = '#b5de2c' // highlight

export const COTTONWOOD: Sprite = [
  [_,_,_,_,brrW,cotLfL,brrW,brrW,_,_,_,_],
  [_,_,_,brrW,brrW,cotLfL,brrW,cotLfM,cotLfM,_,_,_],
  [_,brrW,cotLfL,cotLfM,cotLfL,cotLfL,cotLfM,cotLfL,cotLfM,cotLfM,_,_],
  [_,cotLfL,cotLfM,cotLfM,cotLfD,cotLfM,cotLfM,cotLfL,cotLfL,cotLfM,_,_],
  [cotLfM,cotLfL,cotLfM,cotLfD,cotLfD,cotLfD,cotLfM,cotLfM,cotLfL,cotLfM,cotLfM,_],
  [cotLfL,cotLfM,cotLfD,cotLfD,cotLfD,cotLfD,cotLfD,cotLfM,cotLfM,cotLfL,cotLfM,_],
  [cotLfM,cotLfM,cotLfD,cotLfD,cotLfM,cotLfM,cotLfD,cotLfD,cotLfM,cotLfM,cotLfM,_],
  [cotLfM,cotLfL,_,cotLfM,cotLfL,cotLfL,cotLfM,cotLfM,cotLfL,cotLfM,cotLfM,_],
  [_,cotLfM,cotLfM,cotLfL,cotLfL,cotLfL,cotLfL,cotLfL,cotLfM,cotLfM,_,_],
  [_,_,cotLfM,cotLfM,cotLfM,cotBkD,_,cotLfM,cotLfM,_,_,_],
  [_,_,_,cotLfM,cotBk,cotBk,cotBkD,cotLfD,_,_,_,_],
  [_,_,_,_,_,cotBk,cotBkD,_,_,_,_,_],
  [_,_,_,_,_,cotBk,cotBkD,_,_,_,_,_],
  [_,_,_,_,cotBk,cotBk,cotBkD,_,_,_,_,_],
  [_,_,_,cotBk,cotBk,cotBk,cotBkD,cotBkD,_,_,_,_],
  [_,_,cotBk,cotBk,cotBk,cotBkD,cotBkD,cotBkD,cotBkD,_,_,_],
]

// Cottonwood stump: the COTTONWOOD sprite with the canopy rows blanked out,
// leaving only the trunk. Used as the post-felled state of a chopped tree —
// the entry stays in the world but its visual swaps to this. Same 12x16
// dimensions and palette as COTTONWOOD so depth/sort math is unchanged.
export const COTTONWOOD_STUMP: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,cotBk,cotBkD,_,_,_,_,_],
  [_,_,_,_,_,cotBk,cotBkD,_,_,_,_,_],
  [_,_,_,_,cotBk,cotBk,cotBkD,_,_,_,_,_],
  [_,_,_,cotBk,cotBk,cotBk,cotBkD,cotBkD,_,_,_,_],
  [_,_,cotBk,cotBk,cotBk,cotBkD,cotBkD,cotBkD,cotBkD,_,_,_],
]

// Cottonwood dead: bare trunk with a few leafless forking branches. Same 12x16
// dimensions and trunk (rows 10-15) as COTTONWOOD so depth/sort and the felling
// cut line up. Branches sit above CUT_ROW (11) so a felled dead tree sheds a
// dead top. Bark palette only — no canopy.
export const COTTONWOOD_DEAD: Sprite = [
  [_,_,cotBk,_,_,_,_,_,_,_,_,_],
  [_,_,cotBkD,_,_,_,_,_,cotBk,_,_,_],
  [_,_,_,cotBk,_,_,_,cotBk,_,_,_,_],
  [_,_,_,cotBkD,_,_,cotBk,_,_,_,_,_],
  [_,_,_,_,cotBk,_,cotBk,_,_,_,_,_],
  [_,_,_,_,_,cotBk,cotBk,_,_,_,_,_],
  [_,_,_,_,_,cotBk,cotBkD,_,_,cotBkD,_,_],
  [_,_,_,_,_,cotBk,cotBkD,_,cotBkD,_,_,_],
  [_,_,_,cotBk,_,cotBk,cotBkD,cotBkD,_,_,_,_],
  [_,_,_,cotBk,_,cotBk,cotBkD,_,_,_,_,_],
  [_,_,_,_,cotBk,cotBk,cotBkD,_,_,_,_,_],
  [_,_,_,_,_,cotBk,cotBkD,_,_,_,_,_],
  [_,_,_,_,_,cotBk,cotBkD,_,_,_,_,_],
  [_,_,_,_,cotBk,cotBk,cotBkD,_,_,_,_,_],
  [_,_,_,cotBk,cotBk,cotBk,cotBkD,cotBkD,_,_,_,_],
  [_,_,cotBk,cotBk,cotBk,cotBkD,cotBkD,cotBkD,cotBkD,_,_,_],
]
// Cottonwood sapling
export const ITEM_COTTONWOOD_SAPLING: Sprite = [
  [_,_,cotLfM,cotLfL,cotLfM,_,_,_],
  [_,cotLfM,cotLfL,cotLfL,cotLfL,cotLfM,_,_],
  [_,cotLfL,cotLfM,cotLfL,cotLfM,cotLfL,_,_],
  [_,_,cotLfM,cotLfL,cotLfM,_,_,_],
  [_,_,_,cotBk,_,_,_,_],
  [_,_,_,cotBk,_,_,_,_],
  [_,_,_,cotBk,cotBkD,_,_,_],
  [_,_,cotBk,cotBk,cotBkD,_,_,_],
]

// Planted cottonwood sapling: same sapling, but with a ring of loose dirt
// around the base to show it was freshly planted. The dirt fades visually
// as the tree matures (future growth stages will lose this ring).
export const PLANTED_COTTONWOOD_SAPLING: Sprite = [
  [_,_,cotLfM,cotLfL,cotLfM,_,_,_],
  [_,cotLfM,cotLfL,cotLfL,cotLfL,cotLfM,_,_],
  [_,cotLfL,cotLfM,cotLfL,cotLfM,cotLfL,_,_],
  [_,_,cotLfM,cotLfL,cotLfM,_,_,_],
  [_,_,_,cotBk,_,_,_,_],
  [_,_,_,cotBk,_,_,_,_],
  [_,dtM,dtL,cotBk,cotBkD,dtL,dtM,_],
  [dtM,dtL,dtL,cotBk,cotBkD,dtL,dtL,dtM],
]

// Rope
export const ITEM_ROPE: Sprite = [
  [_,_,twD,twM,twL,twL,twD,_,_],
  [_,twD,twM,twL,twM,twM,twL,twD,_],
  [twD,twM,twD,_,_,_,twD,twM,twD],
  [twM,twL,_,_,_,_,_,twL,twM],
  [twL,twM,_,_,_,_,_,twM,twL],
  [twL,twM,_,_,_,_,_,twM,twL],
  [twD,twM,twD,_,_,_,twD,twM,twD],
  [_,twD,twL,twM,twL,twL,twM,twD,_],
  [_,_,twD,twM,twM,twM,twL,_,_],
  [_,_,_,_,twM,twL,twM,_,_],
  [_,_,_,_,_,twM,twM,_,_],
  [_,_,_,_,_,twM,twL,_,_],
  [_,_,_,_,twM,twL,twM,_,_],
]
// Hemp: rough fibrous stalks, tan-green. 8x8.
const hpL = '#B8A878'   // fiber light (tan)
const hpM = '#7A8048'   // stalk mid (olive green)
const hpD = '#4A5028'   // stalk dark
export const ITEM_HEMP: Sprite = [
  [_,_,hpM,_,_,hpM,_,_],
  [_,hpM,hpL,hpM,_,hpM,hpL,_],
  [_,hpM,hpM,hpL,_,hpL,hpM,_],
  [_,_,hpD,hpM,_,hpM,hpD,_],
  [_,_,hpM,hpM,_,hpM,hpM,_],
  [_,_,hpD,hpM,_,hpM,hpD,_],
  [_,_,hpM,hpD,_,hpD,hpM,_],
  [_,_,hpD,hpD,_,hpD,hpD,_],
]

// Hemp seed: small cluster of dark teardrop-shaped seeds. 8x8.
const hsD = '#3A2818'   // seed dark
const hssM = '#5C402A'   // seed mid (highlight)
const hsL = '#7E5E40'   // seed light edge
export const ITEM_HEMP_SEED: Sprite = [
  [_,_,_,_,_,_,_,_],
  [_,hsL,hsD,_,_,hsL,hsD,_],
  [_,hssM,hsD,_,_,hssM,hsD,_],
  [_,_,hsD,_,_,_,hsD,_],
  [_,_,_,_,hsL,hsD,_,_],
  [_,_,_,_,hssM,hsD,_,_],
  [_,_,_,_,_,hsD,_,_],
  [_,_,_,_,_,_,_,_],
]

// Post: weathered wooden hitching post, H-shape. Same art as the item icon
// so the placed object reads identical to what's in your inventory. 8x8.
const psL = '#9A7A52'   // wood light (sunlit side)
const psM = '#6B4F30'   // wood mid (main)
const psD = '#3F2C18'   // wood dark (shadow / grain)
const psG = '#1A1208'   // deepest shadow / knothole
export const POST: Sprite = [
  [_,psM,_,_,_,_,psM,_],
  [psM,psL,psM,_,_,psM,psL,psM],
  [psM,psL,psM,psM,psM,psM,psL,psM],
  [psM,psM,psL,psL,psL,psL,psM,psM],
  [psM,psL,psM,psM,psM,psM,psL,psM],
  [psM,psL,psM,_,_,psM,psL,psM],
  [psM,psL,psD,_,_,psM,psL,psD],
  [psM,psM,psG,_,_,psM,psM,psG],
]

// Post item icon: identical to the world POST. 8x8.
export const ITEM_POST: Sprite = [
  [_,psM,_,_,_,_,psM,_],
  [psM,psL,psM,_,_,psM,psL,psM],
  [psM,psL,psM,psM,psM,psM,psL,psM],
  [psM,psM,psL,psL,psL,psL,psM,psM],
  [psM,psL,psM,psM,psM,psM,psL,psM],
  [psM,psL,psM,_,_,psM,psL,psM],
  [psM,psL,psD,_,_,psM,psL,psD],
  [psM,psM,psG,_,_,psM,psM,psG],
]

// Post vertical: top-down view of a fence running north-south. Single plank. 8x8.
export const POST_V: Sprite = [
  [_,_,_,psM,psD,_,_,_],
  [_,_,_,psL,psD,_,_,_],
  [_,_,_,psL,psM,_,_,_],
  [_,_,_,psL,psM,_,_,_],
  [_,_,_,psL,psM,_,_,_],
  [_,_,_,psL,psM,_,_,_],
  [_,_,_,psM,psD,_,_,_],
  [_,_,_,psM,psG,_,_,_],
]

// Cedar post: same H-shape and behavior as POST, but warm cedar wood from a
// different tree species. Palette shifted toward red-orange tones; structure
// identical to POST. Mechanically interchangeable.
const fcL = '#C28A55'   // wood light (warm cedar)
const fcM = '#9C5E2C'   // wood mid (main warm brown)
const fcD = '#5F3418'   // wood dark
const fcG = '#2F1A0A'   // deepest shadow
export const CEDAR_POST: Sprite = [
  [_,fcM,_,_,_,_,fcM,_],
  [fcM,fcL,fcM,_,_,fcM,fcL,fcM],
  [fcM,fcL,fcM,fcM,fcM,fcM,fcL,fcM],
  [fcM,fcM,fcL,fcL,fcL,fcL,fcM,fcM],
  [fcM,fcL,fcM,fcM,fcM,fcM,fcL,fcM],
  [fcM,fcL,fcM,_,_,fcM,fcL,fcM],
  [fcM,fcL,fcD,_,_,fcM,fcL,fcD],
  [fcM,fcM,fcG,_,_,fcM,fcM,fcG],
]

// Cedar post item icon: identical to the world CEDAR_POST. 8x8.
export const ITEM_CEDAR_POST: Sprite = [
  [_,fcM,_,_,_,_,fcM,_],
  [fcM,fcL,fcM,_,_,fcM,fcL,fcM],
  [fcM,fcL,fcM,fcM,fcM,fcM,fcL,fcM],
  [fcM,fcM,fcL,fcL,fcL,fcL,fcM,fcM],
  [fcM,fcL,fcM,fcM,fcM,fcM,fcL,fcM],
  [fcM,fcL,fcM,_,_,fcM,fcL,fcM],
  [fcM,fcL,fcD,_,_,fcM,fcL,fcD],
  [fcM,fcM,fcG,_,_,fcM,fcM,fcG],
]

const ipL = '#6A6A6A'
const ipM = '#4A4A4A'
const ipD = '#2E2E2E'
const ipG = '#1A1A1A'
export const IRON_POST: Sprite = [
  [_,ipM,_,_,_,_,ipM,_],
  [ipM,ipM,ipM,_,_,ipM,ipM,ipM],
  [_,ipM,_,_,_,_,ipM,_],
  [ipD,ipL,ipD,_,_,ipD,ipL,ipD],
  [ipM,ipL,ipM,ipM,ipM,ipM,ipL,ipM],
  [ipM,ipM,ipL,ipL,ipL,ipL,ipM,ipM],
  [ipM,ipL,ipM,ipM,ipM,ipM,ipL,ipM],
  [ipD,ipL,ipD,_,_,ipD,ipL,ipD],
  [ipD,ipL,ipD,_,_,ipD,ipL,ipD],
  [ipD,ipM,ipG,_,_,ipD,ipM,ipG],
]

export const ITEM_IRON_POST: Sprite = [
  [_,ipM,_,_,_,_,ipM,_],
  [ipM,ipM,ipM,_,_,ipM,ipM,ipM],
  [_,ipM,_,_,_,_,ipM,_],
  [ipD,ipL,ipD,_,_,ipD,ipL,ipD],
  [ipM,ipL,ipM,ipM,ipM,ipM,ipL,ipM],
  [ipM,ipM,ipL,ipL,ipL,ipL,ipM,ipM],
  [ipM,ipL,ipM,ipM,ipM,ipM,ipL,ipM],
  [ipD,ipL,ipD,_,_,ipD,ipL,ipD],
  [ipD,ipL,ipD,_,_,ipD,ipL,ipD],
  [ipD,ipM,ipG,_,_,ipD,ipM,ipG],
]

export const IRON_POST_V: Sprite = [
  [_,_,_,_,ipD,_,_,_],
  [_,_,_,_,ipD,_,_,_],
  [_,_,_,ipL,ipD,_,_,_],
  [_,_,_,ipL,ipM,_,_,_],
  [_,_,_,ipL,ipM,_,_,_],
  [_,_,_,ipL,ipM,_,_,_],
  [_,_,_,ipL,ipM,_,_,_],
  [_,_,_,ipM,ipD,_,_,_],
  [_,_,_,ipM,ipG,_,_,_],
  [_,_,_,ipM,ipG,_,_,_],
]

// Cedar post vertical: top-down view of a cedar fence running north-south. 8x8.
export const CEDAR_POST_V: Sprite = [
  [_,_,_,fcM,fcD,_,_,_],
  [_,_,_,fcL,fcD,_,_,_],
  [_,_,_,fcL,fcM,_,_,_],
  [_,_,_,fcL,fcM,_,_,_],
  [_,_,_,fcL,fcM,_,_,_],
  [_,_,_,fcL,fcM,_,_,_],
  [_,_,_,fcM,fcD,_,_,_],
  [_,_,_,fcM,fcG,_,_,_],
]

// Wood
export const ITEM_WOOD: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [psD,psM,psM,psM,psM,psM,psM,psM,psM,psM,psM,psD],
  [psM,psL,psL,psG,psL,psL,psL,psL,psG,psL,psM,psM],
  [psM,psL,psL,psL,psL,psG,psL,psL,psL,psL,psG,psM],
  [psM,psL,psL,psL,psL,psL,psL,psG,psL,psL,psL,psM],
  [psD,psM,psM,psM,psM,psM,psM,psM,psM,psM,psM,psD],
  [psD,psM,psM,psM,psM,psM,psM,psM,psM,psM,psM,psD],
  [_,_,_,_,_,_,_,_,_,_,_,_],
]

// Plank
const plL = '#d1b281'   // plank light (sunlit board face)
const plM = '#bb9967'   // plank mid (main)
const plD = '#926d45'   // plank dark (shadow / grain)
export const ITEM_PLANK: Sprite = [
  [plD,plM,plM,plM,plM,plM,plM,plM,plM,plM,plM,plD],
  [plD,plL,plL,plL,plD,plL,plL,plL,plL,plL,plL,plD],
  [plD,plM,plM,plM,plM,plM,plM,plM,plM,plM,plM,plD],
  [plD,plM,plM,plM,plM,plM,plM,plM,plM,plM,plM,plD],
  [plD,plL,plL,plL,plL,plL,plL,plD,plL,plL,plL,plD],
  [plD,plM,plM,plM,plM,plM,plM,plM,plM,plM,plM,plD],
  [plD,plM,plM,plM,plM,plM,plM,plM,plM,plM,plM,plD],
  [plD,plL,plL,plD,plL,plL,plL,plL,plL,plL,plL,plD],
  [plD,plM,plM,plM,plM,plM,plM,plM,plM,plM,plM,plD],
  [plD,plM,plM,plM,plM,plM,plM,plM,plM,plM,plM,plD],
  [plD,plL,plL,plL,plL,plD,plL,plL,plL,plL,plL,plD],
  [plD,plM,plM,plM,plM,plM,plM,plM,plM,plM,plM,plD],
]

// Flagstone: floor tile. 12x12.
const stM = '#52493c'   // stone (single fill, matches rock mid rkM)
const rk = '#7d7161'

export const ITEM_FLAGSTONE: Sprite = [
  [stM,stM,stM,stM,stM,stM,stM,stM,stM,stM,rk,stM],
  [stM,stM,stM,stM,stM,stM,stM,stM,stM,stM,rk,rk],
  [stM,stM,stM,stM,stM,stM,stM,stM,stM,stM,rk,rk],
  [stM,stM,stM,stM,stM,stM,stM,stM,stM,stM,rk,rk],
  [stM,stM,stM,stM,stM,stM,stM,stM,stM,stM,rk,rk],
  [stM,stM,stM,stM,stM,stM,stM,stM,stM,stM,rk,rk],
  [stM,stM,stM,stM,stM,stM,stM,stM,stM,stM,rk,rk],
  [stM,stM,stM,stM,stM,stM,stM,stM,stM,stM,rk,rk],
  [stM,stM,stM,stM,stM,stM,stM,stM,stM,stM,rk,rk],
  [stM,stM,stM,stM,stM,stM,stM,stM,stM,stM,rk,rk],
  [rk,rk,rk,rk,rk,rk,rk,rk,rk,rk,rk,rk],
  [stM,rk,rk,rk,rk,rk,rk,rk,rk,rk,rk,_],
]

// Sandstone
const saM = '#b1805d'   // sandstone main (reddish sand)
const saK = '#ca9e77'   // sandstone seam (lighter sandy)
export const ITEM_SANDSTONE: Sprite = [
  [saM,saM,saM,saM,saM,saM,saM,saM,saM,saM,saK,saM],
  [saM,saM,saM,saM,saM,saM,saM,saM,saM,saM,saK,saK],
  [saM,saM,saM,saM,saM,saM,saM,saM,saM,saM,saK,saK],
  [saM,saM,saM,saM,saM,saM,saM,saM,saM,saM,saK,saK],
  [saM,saM,saM,saM,saM,saM,saM,saM,saM,saM,saK,saK],
  [saM,saM,saM,saM,saM,saM,saM,saM,saM,saM,saK,saK],
  [saM,saM,saM,saM,saM,saM,saM,saM,saM,saM,saK,saK],
  [saM,saM,saM,saM,saM,saM,saM,saM,saM,saM,saK,saK],
  [saM,saM,saM,saM,saM,saM,saM,saM,saM,saM,saK,saK],
  [saM,saM,saM,saM,saM,saM,saM,saM,saM,saM,saK,saK],
  [saK,saK,saK,saK,saK,saK,saK,saK,saK,saK,saK,saK],
  [saM,saK,saK,saK,saK,saK,saK,saK,saK,saK,saK,_],
]

// Wheel
export const ITEM_WHEEL: Sprite = [
  [_, _, psM, psM, psM, psM, _, _],
  [_, psM, psL, psL, psL, psL, psM, _],
  [psM, psL, psM, psD, psD, psM, psL, psM],
  [psM, psL, psD, rkL, rkM, psD, psL, psM],
  [psM, psL, psD, rkM, rkD, psD, psL, psM],
  [psM, psL, psM, psD, psD, psM, psL, psM],
  [_, psM, psL, psL, psL, psL, psM, _],
  [_, _, psM, psM, psM, psM, _, _],
]

// Cart: placeholder — a simple wooden box on two wheels. 8x8, post palette.
export const ITEM_CRAFTING_CART: Sprite = [
  [_, psM, psM, psM, psM, psM, psM, _],
  [psM, psL, psL, psL, psL, psL, psL, psM],
  [psM, psL, psD, psL, psL, psD, psL, psM],
  [psM, psL, psL, psL, psL, psL, psL, psM],
  [psM, psM, psM, psM, psM, psM, psM, psM],
  [_, psD, _, _, _, _, psD, _],
  [_, psD, psD, _, _, psD, psD, _],
  [_, _, psD, _, _, psD, _, _],
]

// Fence gate: placeholder — two end posts with two horizontal rails between.
// 8x8, post palette.
export const ITEM_FENCE_GATE: Sprite = [
  [psM,psM,_,_,_,_,_,_,_,_,psM,psM],
  [psL,psL,psD,psD,psD,psD,psD,psD,psD,psD,psL,psL],
  [psL,psL,_,_,_,_,_,_,_,_,psL,psL],
  [psL,psL,psD,psD,psD,psD,psD,psD,psD,psD,psL,psL],
  [psL,psL,_,_,_,_,_,_,_,_,psL,psL],
  [psL,psL,psD,psD,psD,psD,psD,psD,psD,psD,psL,psL],
  [psM,psM,_,_,_,_,_,_,_,_,psM,psM],
  [psD,psD,_,_,_,_,_,_,_,_,psD,psD],
]

export const FENCE_GATE_OPEN: Sprite = [
  [psM,psM,psM],
  [psL,psL,psL],
  [psD,psD,psD],
  [psD,psD,psD],
  [psD,psD,psD],
  [psD,psD,psD],
  [psD,psD,psD],
  [psD,psD,psD],
  [psD,psD,psD],
  [psD,psD,psD],
  [psM,psM,psM],
  [psD,psD,psD],
]

// ---- BRUSH GROUND ---- 8x8 ground tile
const brL = '#adbc3d'   // brush light
const brD = '#7c8f38'   // brush dark speck 
export const BRUSH_GROUND: Sprite = [
  [brL,brL,brL,brL,brL,brL,brL,brL],
  [brL,brL,brL,brL,brL,brL,brL,brL],
  [brL,brL,brL,brL,brL,brL,brL,brL],
  [brL,brL,brL,brL,brL,brL,brL,brL],
  [brL,brL,brL,brL,brL,brL,brL,brL],
  [brL,brL,brL,brL,brL,brL,brL,brL],
  [brL,brL,brL,brL,brL,brL,brL,brL],
  [brL,brL,brL,brL,brL,brL,brL,brL],
]

// Sandy yellow-tan path dirt. Same 8x8 footprint as BRUSH_GROUND so it tiles
// the terrain grid identically; stamped where a trail crosses grass.
const pdL = '#ffe063'   // sandy light
const pdD = '#f3d660'   // sandy dark speck
export const PATH_DIRT: Sprite = [
  [pdL,pdL,pdL,pdL,pdL,pdL,pdL,pdL],
  [pdL,pdL,pdL,pdD,pdL,pdL,pdL,pdL],
  [pdL,pdL,pdL,pdL,pdL,pdL,pdL,pdL],
  [pdL,pdL,pdL,pdL,pdL,pdD,pdL,pdL],
  [pdL,pdD,pdL,pdL,pdL,pdL,pdL,pdL],
  [pdL,pdL,pdL,pdL,pdL,pdL,pdL,pdL],
  [pdL,pdL,pdL,pdL,pdD,pdL,pdL,pdL],
  [pdL,pdL,pdL,pdL,pdL,pdL,pdL,pdL],
]

// Tilled dirt — moist worked soil, paintable terrain tile. Uses the dirt-
// patch palette (dtL/dtM/dtD) so painted fields match the color of holes
// dug by the shovel. Horizontal furrow lines tile vertically to form
// continuous rows when adjacent tiles stack — reads as plowed ground.
export const TILLED_DIRT: Sprite = [
  [dtM,dtM,dtM,dtM,dtM,dtM,dtM,dtM],
  [dtM,dtM,dtM,dtM,dtM,dtM,dtM,dtM],
  [dtD,dtD,dtD,dtD,dtD,dtD,dtD,dtD],
  [dtM,dtL,dtM,dtM,dtM,dtL,dtM,dtM],
  [dtM,dtM,dtM,dtM,dtM,dtM,dtM,dtM],
  [dtM,dtM,dtM,dtL,dtM,dtM,dtM,dtL],
  [dtD,dtD,dtD,dtD,dtD,dtD,dtD,dtD],
  [dtM,dtM,dtM,dtM,dtM,dtM,dtM,dtM],
]


const brr = '#d1e330'

export const BRUSH_EDGE_TOP: Sprite = [
  [_,_,_,_,_,_,_,_],
  [_,brr,brr,_,_,brr,_,],
  [brr,brr,brr,brr,brr,_,brr,brr],
  [brr,brr,brr,brr,brr,brr,brL,brr],
  [brr,brL,brL,brL,brL,brL,brL,brL],
  [brL,brL,brL,brL,brL,brL,brL,brL],
  [brL,brL,brL,brL,brL,brL,brL,brL],
  [brL,brL,brL,brL,brL,brL,brL,brL],
]

export const BRUSH_EDGE_LEFT: Sprite = [
  [_,_,brL,brL,brL,brL,brL,brL],
  [_,brL,_,brL,brL,brL,brL,brL],
  [_,_,brL,brL,brL,brL,brL,brL],
  [_,brL,brL,brL,brL,brL,brL,brL],
  [_,_,_,brL,brL,brL,brL,brL],
  [_,_,brL,brL,brL,brL,brL,brL],
  [_,brL,_,brL,brL,brL,brL,brL],
  [_,_,brL,brL,brL,brL,brL,brL],
]

export const BRUSH_EDGE_RIGHT: Sprite = [
  [brL,brL,brL,brL,brL,brL,_,_],
  [brL,brL,brL,brL,brL,_,brL,_],
  [brL,brL,brL,brL,brL,brL,_,_],
  [brL,brL,brL,brL,brL,brL,brL,_],
  [brL,brL,brL,brL,brL,_,_,_],
  [brL,brL,brL,brL,brL,brL,_,_],
  [brL,brL,brL,brL,brL,_,brL,_],
  [brL,brL,brL,brL,brL,brL,_,_],
]

const brBot = '#778440'

export const BRUSH_EDGE_BOTTOM: Sprite = [
  [brL,brL,brL,brL,brL,brL,brL,brL],
  [brL,brL,brL,brL,brL,brL,brL,brL],
  [brL,brL,brL,brL,brL,brL,brL,brL],
  [brL,brBot,brBot,brBot,brBot,brBot,brL,brBot],
  [brBot,brBot,brBot,brBot,brBot,brBot,brBot,brBot],
  [_,brBot,brBot,_,_,brBot,_,_],
  [_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_],
]

export const BRUSH_SPECK: Sprite = [
  [brD,_,_,_,_,brD,_],
  [_,brD,_,brD,_,brD,_],
  [_,brD,brD,brD,_,brD,_],
  [_,brD,brD,brD,_,brD,_],
]

// Wildflowers baked into the grass (scattered in chunkTerrain's bake pass).
// FLOWER_DOT: tiny far-off orange speck. FLOWER_FIREWHEEL: Indian blanket /
// firewheel — red center, orange mid, yellow petal tips (matches the daisy ref).
const flwR = '#d7242d'   // red center
const flwO = '#e96a2f'   // orange mid
const flwY = '#f7c80b'   // yellow petal tips
const flwG = '#ff6117' 
const flwD = '#b9420b'

export const FLOWER_DOT: Sprite = [
  [_,_,_,_,flwG,flwG,_,_],
  [flwG,flwG,_,_,flwD,flwD,_,_],
  [flwD,flwD,flwG,flwG,_,_,flwG,flwG],
  [_,_,flwD,flwD,_,_,flwD,flwD]
]

export const FLOWER_FIREWHEEL: Sprite = [
  [_,flwY,flwY,flwY,_],
  [flwY,flwR,flwR,flwO,flwY],
  [flwY,flwR,flwR,flwR,flwY],
  [flwY,flwO,flwR,flwO,flwY],
  [_,flwY,flwY,flwY,_],
]

// Bluebonnet — Texas state flower. Upright spike: white-capped top over a body of
// blue florets, on a short green base.
const bbd = '#683bd8'   // bluebonnet blue
const bbBd = '#4227a1'  // blue shadow
const bbW = '#d8e2c9'   // white cap
export const FLOWER_BLUEBONNET: Sprite = [
  [_,bbW,_],
  [bbW,bbd,_],
  [bbd,bbd,_],
  [bbBd,bbd,_],
]

const tsh = '#5e5e4e' 
export const TREE_SHADOW: Sprite = [
  [_,tsh,tsh,tsh,tsh,tsh,tsh,_],
  [tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh],
  [tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh],
  [_,tsh,tsh,tsh,tsh,tsh,tsh,_],
]

export const SQUARE_SHADOW: Sprite = [
  [tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh],
  [tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh],
  [tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh],
  [tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh],
  [tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh],
  [tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh],
  [tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh],
  [tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh],
]

export const BLOB_SHADOW: Sprite = [
  [_,_,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,_,_],
  [_,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,_],
  [_,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,_],
  [_,_,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,tsh,_,_],
]

export const TROOPER_SHADOW: Sprite = [
  [tsh,tsh,tsh,tsh],
  [tsh,tsh,tsh,tsh],
  [tsh,tsh,tsh,tsh],
  [tsh,tsh,tsh,tsh],
]

// Honse: side view facing LEFT, single solid brown. 26 wide × 15 tall.
const hnB = '#FFFFFF'   // honse base 
export const HONSE: Sprite = [
  [_,_,_,hnB,hnB,hnB,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [hnB,hnB,hnB,hnB,hnB,hnB,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [hnB,hnB,hnB,hnB,hnB,hnB,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,hnB,hnB,hnB,hnB,hnB,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,hnB,hnB,hnB,hnB,hnB,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,_,_,_,_,_,_],
  [_,_,_,_,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,_,_,_],
  [_,_,_,_,_,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,_,_],
  [_,_,_,_,_,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,_,hnB,hnB,hnB,_],
  [_,_,_,_,_,_,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,_,_,_,hnB,hnB,hnB],
  [_,_,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,hnB,hnB],
  [_,_,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,_,_],
  [_,_,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,_,_],
  [_,_,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,_,_],
  [_,_,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,_,_],
]

const bnB = '#21201f'
export const BISON: Sprite = [
  [_,_,_,_,_,_,_,bnB,bnB,bnB,bnB,bnB,bnB,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,bnB,_,bnB,_,_,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,_,_,_,_,_,_,_,_,_,_],
  [_,bnB,_,bnB,_,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,_,_,_,_,_,_],
  [_,_,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,_,_,_,_,_],
  [_,_,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,_,_,_,_,_],
  [_,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,_,_,_,_],
  [_,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,_,_,_,_],
  [bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,_,bnB,_,_,_],
  [_,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,_,bnB,_,_,_],
  [_,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,_,bnB,_,_,_],
  [_,bnB,bnB,_,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,bnB,_,bnB,bnB,bnB,bnB,bnB,bnB,bnB,_,_,bnB,_,_],
  [_,_,_,_,_,bnB,bnB,bnB,_,bnB,bnB,bnB,_,_,_,_,_,bnB,bnB,bnB,_,bnB,bnB,bnB,_,_,_,_,_],
  [_,_,_,_,_,bnB,bnB,bnB,_,bnB,bnB,bnB,_,_,_,_,_,bnB,bnB,bnB,_,bnB,bnB,bnB,_,_,_,_,_],
  [_,_,_,_,_,bnB,bnB,bnB,_,bnB,bnB,bnB,_,_,_,_,_,bnB,bnB,bnB,_,bnB,bnB,_,_,_,_,_,_],
  [_,_,_,_,_,bnB,bnB,_,_,bnB,bnB,_,_,_,_,_,_,bnB,bnB,_,_,bnB,bnB,_,_,_,_,_,_],
  [_,_,_,_,_,bnB,bnB,_,_,bnB,bnB,_,_,_,_,_,_,bnB,bnB,_,_,bnB,bnB,_,_,_,_,_,_],
  [_,_,_,_,bnB,bnB,_,_,bnB,bnB,_,_,_,_,_,_,bnB,bnB,_,_,bnB,bnB,_,_,_,_,_,_,_],
]

export const HONSE_SHADOW: Sprite = HONSE.map(row => row.map(cell => cell === _ ? _ : tsh)).slice().reverse()

// Honse feed pose 
export const HONSE_FEED: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,hnB,hnB,hnB,hnB,hnB,hnB,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,_,_,_,_,_,_],
  [hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,_,_,_],
  [hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,_,_],
  [hnB,hnB,hnB,_,_,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,_,hnB,hnB,hnB,_],
  [_,_,_,_,_,_,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,hnB,_,_,_,hnB,hnB,hnB],
  [_,_,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,hnB,hnB],
  [_,_,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,_,_],
  [_,_,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,_,_],
  [_,_,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,_,_],
  [_,_,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,hnB,hnB,_,hnB,hnB,_,_,_,_,_,_],
]

// Per-coat feed sprite
const recolorFeed = (color: string): Sprite => HONSE_FEED.map(row => row.map(cell => cell === _ ? _ : color))
export const HONSE_BROWN_FEED: Sprite = recolorFeed('#55341e')
export const HONSE_CHESTNUT_FEED: Sprite = recolorFeed('#8B5A2B')
export const HONSE_SORREL_FEED: Sprite = recolorFeed('#8B3A26')
export const HONSE_PALOMINO_FEED: Sprite = recolorFeed('#C9A06A')
export const HONSE_SORREL_SOCKS_FEED: Sprite = recolorFeed('#8B3A26')
export const HONSE_SPOTTED_FEED: Sprite = recolorFeed('#dce1e6')
export const HONSE_SPOTTED_BROWN_FEED: Sprite = recolorFeed('#dce1e6')

const lhornB = '#A0522D'
export const LONGHORN: Sprite = BISON.map(row => row.map(c => c === null ? null : lhornB))

// Shared red hit-flash silhouette
export const HONSE_HURT: Sprite = HONSE.map(row => row.map(cell => cell === _ ? _ : RD))
export const BISON_HURT: Sprite = BISON.map(row => row.map(cell => cell === _ ? _ : RD))
export const LONGHORN_HURT: Sprite = LONGHORN.map(row => row.map(cell => cell === _ ? _ : RD))
// hbB = body, hbM = mane (edit the mane pixels by hand).
const hbB = '#55341e'   // brown body
export const HONSE_BROWN: Sprite = [
  [_,_,_,hbB,hbB,hbB,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [hbB,hbB,hbB,hbB,hbB,hbB,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [hbB,hbB,hbB,hbB,hbB,hbB,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,hbB,hbB,hbB,hbB,hbB,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,hbB,hbB,hbB,hbB,hbB,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,_,_,_,_,_,_],
  [_,_,_,_,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,_,_,_],
  [_,_,_,_,_,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,_,_],
  [_,_,_,_,_,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,_,hbB,hbB,hbB,_],
  [_,_,_,_,_,_,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,hbB,_,_,_,hbB,hbB,hbB],
  [_,_,_,_,_,_,hbB,hbB,_,hbB,hbB,_,_,_,_,hbB,hbB,_,hbB,hbB,_,_,_,_,hbB,hbB],
  [_,_,_,_,_,_,hbB,hbB,_,hbB,hbB,_,_,_,_,hbB,hbB,_,hbB,hbB,_,_,_,_,_,_],
  [_,_,_,_,_,_,hbB,hbB,_,hbB,hbB,_,_,_,_,hbB,hbB,_,hbB,hbB,_,_,_,_,_,_],
  [_,_,_,_,_,_,hbB,hbB,_,hbB,hbB,_,_,_,_,hbB,hbB,_,hbB,hbB,_,_,_,_,_,_],
  [_,_,_,_,_,_,hbB,hbB,_,hbB,hbB,_,_,_,_,hbB,hbB,_,hbB,hbB,_,_,_,_,_,_],
]

// Chestnut honse
const hcB = '#8B5A2B'   // chestnut body
const hcM = '#492b0e'   // darker mane (placeholder — edit freely)
export const HONSE_CHESTNUT: Sprite = [
  [_,_,_,hcM,hcB,hcB,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [hcB,hcB,hcB,hcM,hcB,hcM,hcM,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [hcB,hcB,hcB,hcB,hcB,hcM,hcM,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,hcB,hcB,hcB,hcB,hcM,hcM,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,hcB,hcB,hcB,hcB,hcM,hcM,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,_,_,_,_,_,_],
  [_,_,_,_,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcM,hcM,hcM,_,_,_],
  [_,_,_,_,_,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcM,hcM,hcM,hcM,_,_],
  [_,_,_,_,_,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcM,_,hcM,hcM,hcM,_],
  [_,_,_,_,_,_,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,hcB,_,_,_,hcM,hcM,hcM],
  [_,_,_,_,_,_,hcB,hcB,_,hcB,hcB,_,_,_,_,hcB,hcB,_,hcB,hcB,_,_,_,_,hcM,hcM],
  [_,_,_,_,_,_,hcB,hcB,_,hcB,hcB,_,_,_,_,hcB,hcB,_,hcB,hcB,_,_,_,_,_,_],
  [_,_,_,_,_,_,hcB,hcB,_,hcB,hcB,_,_,_,_,hcB,hcB,_,hcB,hcB,_,_,_,_,_,_],
  [_,_,_,_,_,_,hcM,hcM,_,hcM,hcM,_,_,_,_,hcM,hcM,_,hcM,hcM,_,_,_,_,_,_],
  [_,_,_,_,_,_,hcM,hcM,_,hcM,hcM,_,_,_,_,hcM,hcM,_,hcM,hcM,_,_,_,_,_,_],
]

// Sorrel honse
const hsB = '#8B3A26'   // sorrel red body
const hsM = '#4d1d12'   // darker mane (placeholder — edit freely)
export const HONSE_SORREL: Sprite = [
  [_,_,_,hsM,hsB,hsM,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [hsB,hsB,hsB,hsM,hsB,hsM,hsM,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [hsB,hsB,hsB,hsB,hsB,hsM,hsM,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,hsB,hsB,hsB,hsB,hsM,hsM,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,hsB,hsB,hsB,hsB,hsM,hsM,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,_,_,_,_,_,_],
  [_,_,_,_,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsM,hsM,hsM,_,_,_],
  [_,_,_,_,_,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsM,hsM,hsM,hsM,_,_],
  [_,_,_,_,_,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsM,_,hsM,hsM,hsM,_],
  [_,_,_,_,_,_,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,hsB,_,_,_,hsM,hsM,hsM],
  [_,_,_,_,_,_,hsB,hsB,_,hsB,hsB,_,_,_,_,hsB,hsB,_,hsB,hsB,_,_,_,_,hsM,hsM],
  [_,_,_,_,_,_,hsB,hsB,_,hsB,hsB,_,_,_,_,hsB,hsB,_,hsB,hsB,_,_,_,_,_,_],
  [_,_,_,_,_,_,hsB,hsB,_,hsB,hsB,_,_,_,_,hsB,hsB,_,hsB,hsB,_,_,_,_,_,_],
  [_,_,_,_,_,_,hsM,hsM,_,hsM,hsM,_,_,_,_,hsM,hsM,_,hsM,hsM,_,_,_,_,_,_],
  [_,_,_,_,_,_,hsM,hsM,_,hsM,hsM,_,_,_,_,hsM,hsM,_,hsM,hsM,_,_,_,_,_,_],
]

// Palomino honse
const pmT = '#C9A06A'   // palomino tan body
const pmM = '#9A6E3F'   // mid transition (ombré)
const pmD = '#5A3A22'   // dark brown points (lower legs, tail end)
export const HONSE_PALOMINO: Sprite = [
  [_,_,_,pmD,pmT,pmD,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [pmT,pmT,pmT,pmD,pmT,pmD,pmD,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [pmT,pmT,pmT,pmT,pmT,pmD,pmD,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,pmT,pmT,pmT,pmT,pmD,pmD,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,pmT,pmT,pmT,pmT,pmD,pmD,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,_,_,_,_,_,_],
  [_,_,_,_,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmD,pmD,pmD,_,_,_],
  [_,_,_,_,_,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmD,pmD,pmD,pmD,_,_],
  [_,_,_,_,_,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmD,_,pmD,pmD,pmD,_],
  [_,_,_,_,_,_,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,pmT,_,_,_,pmD,pmD,pmD],
  [_,_,_,_,_,_,pmM,pmM,_,pmM,pmM,_,_,_,_,pmM,pmM,_,pmM,pmM,_,_,_,_,pmD,pmD],
  [_,_,_,_,_,_,pmM,pmM,_,pmM,pmM,_,_,_,_,pmM,pmM,_,pmM,pmM,_,_,_,_,_,_],
  [_,_,_,_,_,_,pmD,pmD,_,pmD,pmD,_,_,_,_,pmD,pmD,_,pmD,pmD,_,_,_,_,_,_],
  [_,_,_,_,_,_,pmD,pmD,_,pmD,pmD,_,_,_,_,pmD,pmD,_,pmD,pmD,_,_,_,_,_,_],
  [_,_,_,_,_,_,pmD,pmD,_,pmD,pmD,_,_,_,_,pmD,pmD,_,pmD,pmD,_,_,_,_,_,_],
]

// Sorrel honse
const soR = '#8B3A26'   // sorrel red body
const soW = '#dce1e6'   // blueish-grey socks
const soL = '#733521'  

export const HONSE_SORREL_SOCKS: Sprite = [
  [_,_,_,soL,soR,soL,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [soR,soR,soR,soL,soR,soL,soL,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [soR,soR,soR,soR,soR,soL,soL,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,soR,soR,soR,soR,soL,soL,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,soR,soR,soR,soR,soL,soL,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,_,_,_,_,_,_],
  [_,_,_,_,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soL,soL,soL,_,_,_],
  [_,_,_,_,_,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soL,soL,soL,_,_],
  [_,_,_,_,_,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,_,soL,soL,soL,_],
  [_,_,_,_,_,_,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,soR,_,_,_,soL,soL,soL],
  [_,_,_,_,_,_,soR,soR,_,soR,soR,_,_,_,_,soR,soR,_,soR,soR,_,_,_,_,soL,soL],
  [_,_,_,_,_,_,soR,soR,_,soR,soR,_,_,_,_,soR,soR,_,soR,soR,_,_,_,_,_,_],
  [_,_,_,_,_,_,soW,soW,_,soW,soW,_,_,_,_,soW,soW,_,soW,soW,_,_,_,_,_,_],
  [_,_,_,_,_,_,soW,soW,_,soW,soW,_,_,_,_,soW,soW,_,soW,soW,_,_,_,_,_,_],
  [_,_,_,_,_,_,soW,soW,_,soW,soW,_,_,_,_,soW,soW,_,soW,soW,_,_,_,_,_,_],
]

// Spotted honse
const hnS = '#C9A06A'   // tan spot
export const HONSE_SPOTTED: Sprite = [
  [_,_,_,soW,soW,soW,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [soW,soW,soW,hnS,soW,soW,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [soW,soW,soW,soW,hnS,soW,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,soW,soW,soW,soW,soW,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,soW,soW,soW,soW,soW,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,soW,soW,soW,hnS,hnS,soW,soW,soW,soW,hnS,hnS,soW,soW,soW,soW,soW,_,_,_,_,_,_],
  [_,_,_,_,soW,soW,hnS,hnS,soW,soW,soW,soW,soW,hnS,hnS,soW,soW,soW,soW,soW,soW,soW,soW,_,_,_],
  [_,_,_,_,_,soW,soW,soW,soW,soW,hnS,hnS,soW,soW,soW,soW,hnS,hnS,soW,soW,soW,soW,soW,soW,_,_],
  [_,_,_,_,_,soW,soW,soW,hnS,hnS,soW,soW,soW,soW,soW,soW,hnS,soW,soW,soW,soW,_,soW,soW,soW,_],
  [_,_,_,_,_,_,soW,soW,soW,soW,soW,soW,hnS,hnS,soW,soW,soW,soW,soW,soW,_,_,_,soW,soW,soW],
  [_,_,_,_,_,_,soW,hnS,_,soW,soW,_,_,_,_,hnS,soW,_,soW,soW,_,_,_,_,soW,hnS],
  [_,_,_,_,_,_,soW,soW,_,hnS,soW,_,_,_,_,soW,soW,_,hnS,soW,_,_,_,_,_,_],
  [_,_,_,_,_,_,hnS,soW,_,soW,soW,_,_,_,_,soW,hnS,_,soW,soW,_,_,_,_,_,_],
  [_,_,_,_,_,_,soW,soW,_,soW,hnS,_,_,_,_,hnS,soW,_,soW,soW,_,_,_,_,_,_],
  [_,_,_,_,_,_,soW,soW,_,soW,soW,_,_,_,_,soW,soW,_,soW,hnS,_,_,_,_,_,_],
]

// Spotted honse variant
const hnD = '#5A3A22'   // dark-brown spot
export const HONSE_SPOTTED_BROWN: Sprite = [
  [_,_,_,soW,soW,soW,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [soW,soW,soW,hnD,soW,soW,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [soW,soW,soW,soW,hnD,soW,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,soW,soW,soW,soW,soW,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,soW,soW,soW,soW,soW,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,soW,soW,soW,hnD,hnD,soW,soW,soW,soW,hnD,hnD,soW,soW,soW,soW,soW,_,_,_,_,_,_],
  [_,_,_,_,soW,soW,hnD,hnD,soW,soW,soW,soW,soW,hnD,hnD,soW,soW,soW,soW,soW,soW,soW,soW,_,_,_],
  [_,_,_,_,_,soW,soW,soW,soW,soW,hnD,hnD,soW,soW,soW,soW,hnD,hnD,soW,soW,soW,soW,soW,soW,_,_],
  [_,_,_,_,_,soW,soW,soW,hnD,hnD,soW,soW,soW,soW,soW,soW,hnD,soW,soW,soW,soW,_,soW,soW,soW,_],
  [_,_,_,_,_,_,soW,soW,soW,soW,soW,soW,hnD,hnD,soW,soW,soW,soW,soW,soW,_,_,_,soW,soW,soW],
  [_,_,_,_,_,_,soW,hnD,_,soW,soW,_,_,_,_,hnD,soW,_,soW,soW,_,_,_,_,soW,hnD],
  [_,_,_,_,_,_,soW,soW,_,hnD,soW,_,_,_,_,soW,soW,_,hnD,soW,_,_,_,_,_,_],
  [_,_,_,_,_,_,hnD,soW,_,soW,soW,_,_,_,_,soW,hnD,_,soW,soW,_,_,_,_,_,_],
  [_,_,_,_,_,_,soW,soW,_,soW,hnD,_,_,_,_,hnD,soW,_,soW,soW,_,_,_,_,_,_],
  [_,_,_,_,_,_,soW,soW,_,soW,soW,_,_,_,_,soW,soW,_,soW,hnD,_,_,_,_,_,_],
]

// Coyote
const cy1 = '#6b5840'   // ash-brown (rear/tail)
const cy2 = '#7e6446'
const cy3 = '#71593c'
const cy4 = '#7c5e3a'   // orange-brown (head/chest)

export const COYOTE: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,cy4,cy4,_,_,_,_,_],
  [cy1,cy1,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,cy4,cy4,cy4,cy4,_,_,_,_],
  [cy1,cy1,cy1,cy1,_,_,_,_,_,_,_,_,cy2,cy2,cy3,cy4,cy4,cy4,cy4,cy4,cy4,cy4,cy4,cy4,cy4],
  [_,cy1,cy1,cy1,cy1,cy1,cy2,cy2,cy2,cy2,cy2,cy2,cy3,cy3,cy3,cy3,cy4,cy4,cy4,cy4,cy4,cy4,cy4,cy4,_],
  [_,_,_,cy1,cy1,cy1,cy2,cy2,cy2,cy2,cy2,cy2,cy3,cy3,cy3,cy3,cy4,cy4,cy4,cy4,cy4,_,_,_,_],
  [_,_,_,_,cy1,cy1,cy2,cy2,cy2,cy2,cy2,cy2,cy3,cy3,cy3,cy3,cy4,cy4,_,_,_,_,_,_,_],
  [_,_,_,_,cy1,cy1,_,cy2,cy2,_,_,_,_,cy3,cy3,_,cy4,cy4,_,_,_,_,_,_,_],
  [_,_,_,_,cy1,cy1,cy2,cy2,cy2,cy2,_,_,_,cy3,cy3,cy3,cy4,cy4,cy4,_,_,_,_,_,_],
  [_,_,_,_,cy1,cy1,cy2,cy2,cy2,cy2,_,_,_,cy3,cy3,cy3,cy4,cy4,cy4,_,_,_,_,_,_],
]

// Downed coyote
const cyEMPTY: (string | null)[] = Array(25).fill(_)
export const COYOTE_DEAD: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,cy1,cy1,cy2,cy2,cy3,cy4,cy4,cy4,cy4,cy4,cy4,_,_,_,_],
  [cy1,cy1,cy1,cy1,cy1,cy1,cy2,cy2,cy2,cy2,cy2,cy2,cy3,cy3,cy3,cy3,cy4,cy4,cy4,cy4,cy4,cy4,_,_,_],
  [cy1,cy1,cy1,cy1,cy1,cy1,cy2,cy2,cy2,cy2,cy2,cy2,cy3,cy3,cy3,cy3,cy4,cy4,cy4,cy4,cy4,cy4,cy4,cy4,cy4],
  [_,cy1,cy1,cy1,cy1,cy1,cy2,cy2,cy2,cy2,cy2,cy2,cy3,cy3,cy3,cy3,cy4,cy4,cy4,cy4,cy4,cy4,cy4,cy4,cy4],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,soR,soR,soR,soR,soR,soR,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

// Solid-red silhouette of the coyote for its hurt flash
export const COYOTE_HURT: Sprite = COYOTE.map(row => row.map(cell => cell === _ ? _ : RD))

const twdL = '#b8a568'   // dried plant light
const twdM = '#ae8d60'   // dried plant mid
const twdD = '#947651'   // dried plant dark (center mass)
const twdS = '#695438'   // deep shadow / twig
export const TUMBLEWEED: Sprite = [
  [_,_,_,twdS,twdM,twdM,twdS,_,_,_],
  [_,_,twdM,twdL,twdD,twdD,twdL,twdM,_,_],
  [_,twdM,twdD,twdL,twdM,twdM,twdL,twdD,twdM,_],
  [twdS,twdL,twdM,twdD,twdS,twdS,twdD,twdM,twdL,twdS],
  [twdM,twdD,twdM,twdS,twdD,twdD,twdS,twdM,twdD,twdM],
  [twdM,twdD,twdM,twdS,twdD,twdD,twdS,twdM,twdD,twdM],
  [twdS,twdL,twdM,twdD,twdS,twdS,twdD,twdM,twdL,twdS],
  [_,twdM,twdD,twdL,twdM,twdM,twdL,twdD,twdM,_],
  [_,_,twdM,twdL,twdD,twdD,twdL,twdM,_,_],
  [_,_,_,twdS,twdM,twdM,twdS,_,_,_],
]

// Downed bandit 
const bdD = '#6e1212'  // puddle deep / shadow edge
const bdM = '#9e1b1b'  // puddle mid

export const BANDIT_DEAD: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,bdM,bdM,bdM,bdM,bdM,bdM,bdM,bdM,bdM,_],
  [_,HR,HR,HR,bdM,bdM,bdM,bdM,bdM,bdM,bdM,bdM,bdM,bdM,bdD],
  [HR,HR,HR,HR,bdM,bdM,bdM,bdM,bdM,bdM,bdM,bdM,bdM,bdM,bdD],
]

// Hotbar selection frame
const SF = '#FFFFFF'
export const SELECT_FRAME: Sprite = [
  [_,_,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,_,_],
  [_,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,_],
  [SF,SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF],
  [SF,SF,SF,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,SF,SF,SF],
  [_,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,_],
  [_,_,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,SF,_,_],
]

// Quirt:
export const QUIRT: Sprite = [
  [_,_,_,_,_,_,twL,_],
  [_,_,_,_,_,twM,twL,twM],
  [_,_,_,_,twL,twM,_,_],
  [_,_,_,ltL,twM,_,_,_],
  [_,_,ltM,ltL,_,_,_,_],
  [_,ltM,ltL,_,_,_,_,_],
  [ltD,ltM,_,_,_,_,_,_],
  [ltD,_,_,_,_,_,_,_],
]

// Saddle: western-style with horn, cantle, and stirrup leather. 14x12.
// Dark stitch lines along the seat edge, lighter highlight across the seat.
export const ITEM_SADDLE: Sprite = [
  [_,_,_,_,_,_,ltL,ltL,_,_,_,_,_,_],
  [_,_,_,_,_,ltM,ltD,ltD,ltM,_,_,_,_,_],
  [_,_,_,ltM,ltL,ltL,ltL,ltL,ltL,ltM,_,_,_,_],
  [_,_,ltM,ltL,ltL,ltL,ltL,ltL,ltL,ltL,ltM,_,_,_],
  [_,ltM,ltL,ltL,ltL,ltL,ltL,ltL,ltL,ltL,ltL,ltM,_,_],
  [ltM,ltL,ltL,ltL,ltL,ltL,ltL,ltL,ltL,ltL,ltL,ltL,ltM,_],
  [ltD,ltM,ltL,ltL,ltL,ltL,ltL,ltL,ltL,ltL,ltL,ltM,ltD,_],
  [_,ltD,ltM,ltM,ltM,ltM,ltM,ltM,ltM,ltM,ltM,ltD,_,_],
  [_,_,ltD,ltD,_,_,_,_,_,_,ltD,ltD,_,_],
  [_,_,ltM,ltM,_,_,_,_,_,_,ltM,ltM,_,_],
  [_,_,ltD,ltD,_,_,_,_,_,_,ltD,ltD,_,_],
  [_,_,ltD,_,_,_,_,_,_,_,_,ltD,_,_],
]

// Derringer: a small pocket pistol. 8x8. Dark metal body, wood grip.
const dgM = '#6B6B6B'   // metal barrel/frame
const dgD = '#4A4A4A'   // dark metal shadow
const dgW = '#815c39'   // wood grip
const dgH = '#6b4d30'   // grip shadow
const dgB = '#888888'   // bright metal highlight

export const ITEM_DERRINGER: Sprite = [
  [_,_,_,_,dgM,dgM,dgM,dgM,dgM,dgM,dgM,dgD,dgD],
  [_,_,_,dgW,dgH,dgH,dgH,dgH,dgH,dgD,dgD,_,_],
  [_,_,dgW,dgH,dgH,dgH,dgH,_,_,_,_,_,_],
  [_,dgW,dgH,dgH,dgH,dgW,dgW,_,_,_,_,_,_],
  [dgW,dgH,dgH,dgW,dgW,_,_,dgW,_,_,_,_,_],
  [dgH,dgH,dgH,dgH,_,dgW,dgW,_,_,_,_,_,_],
  [dgH,dgH,dgH,_,_,_,_,_,_,_,_,_,_],
  [_,dgH,_,_,_,_,_,_,_,_,_,_,_],
]

// Ammo: a small box of pistol cartridges.
const amBr = '#d9a441'   // brass casing
const amBh = '#999999'   // highlight
const amLd = '#868686'   // tip
const amBx = '#8a5a32'   // cardboard box
const amBxD = '#6b4427'  // box shadow
const amBxL = '#a06f43'  // box highlight
export const ITEM_AMMO: Sprite = [
  [_,amBh,amBh,_,amBh,amBh,_,amBh,amBh,_,amBh,amBh,_,_],
  [_,amLd,amLd,_,amLd,amLd,_,amLd,amLd,_,amLd,amLd,_,_],
  [_,amBr,amBr,_,amBr,amBr,_,amBr,amBr,_,amBr,amBr,_,_],
  [_,amBr,amBr,_,amBr,amBr,_,amBr,amBr,_,amBr,amBr,_,_],
  [amBxL,amBx,amBx,amBx,amBx,amBx,amBx,amBx,amBx,amBx,amBx,amBx,amBx,_],
  [amBxL,amBx,amBx,amBx,amBx,amBx,amBx,amBx,amBx,amBx,amBx,amBx,amBx,_],
  [amBxL,amBx,amBxD,amBx,amBx,amBxD,amBx,amBx,amBxD,amBx,amBx,amBxD,amBx,_],
  [amBxL,amBxD,amBxD,amBxD,amBxD,amBxD,amBxD,amBxD,amBxD,amBxD,amBxD,amBxD,amBxD,_],
  [_,amBxD,amBxD,amBxD,amBxD,amBxD,amBxD,amBxD,amBxD,amBxD,amBxD,amBxD,_,_],
]


const clH = '#76310f'
const clHH = '#9c481e'

export const ITEM_COLT: Sprite = [
  [_,_,_,_,dgB,dgM,dgM,dgM,dgM,dgM,dgD,dgD,dgD],
  [_,_,dgB,dgB,dgM,dgM,dgM,dgD,dgD,dgD,dgD,_],
  [_,clHH,clHH,dgM,dgM,dgD,dgD,_,_,_,_,_],
  [_,clHH,clHH,clH,_,_,_,_,_,_,_,_],
  [clHH,clHH,clH,_,_,_,_,_,_,_,_],
  [clH,clH,clH,clH,_,_,_,_,_,_,_,_],
  [clH,clH,clH,_,_,_,_,_,_,_,_,_],
  [_,clH,_,_,_,_,_,_,_,_,_,_],
]

// Keyhole icon 
const khD = '#1A1A1A'   // keyhole dark

export const KEYHOLE: Sprite = [
[_,_,_,khD,khD,_,_,_],
[_,_,khD,khD,khD,khD,_,_],
[_,_,khD,khD,khD,khD,_,_],
[_,_,khD,khD,khD,khD,_,_],
[_,_,_,khD,khD,_,_,_],
[_,_,_,khD,khD,_,_,_],
[_,_,_,khD,khD,_,_,_],
[_,_,_,khD,khD,_,_,_],
]

// Silver key — 8x8
const skL = '#c1c0c6'
const skM = '#97989e'
const skD = '#7a7b7f'

export const ITEM_SILVER_KEY: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,skL,skM,skL,_,_,_,_,_,_,_,_,_,_],
  [skL,skM,_,skM,skL,_,_,_,_,_,_,_,_,_],
  [skL,skM,_,skM,skM,skM,skM,skM,skM,skM,skM,skM,skM,skM],
  [skD,skD,_,skD,skD,_,_,_,_,_,_,skD,_,skD],
  [_,skD,skD,skD,_,_,_,_,_,_,_,skD,_,skD],
  [_,_,_,_,_,_,_,_,_,_,_,skD,_,skD],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

// Silver key inserted — ring + short stub, shaft hidden in keyhole
export const SILVER_KEY_INSERTED: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,skL,skM,skL,_,_,_,_,_,_,_,_,_,_],
  [skL,skM,_,skM,skL,_,_,_,_,_,_,_,_,_],
  [skL,skM,_,skM,skM,skM,skM,skM,skM,skM,skM,skM,skM,skM],
  [skD,skD,_,skD,skD,_,_,_,_,_,_,_,_,_],
  [_,skD,skD,skD,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

// Gold key — 8x8
const gkL = '#f2d949'
const gkM = '#d2aa43'
const gkD = '#b58c26'

export const ITEM_GOLD_KEY: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,gkL,gkM,gkL,_,_,_,_,_,_,_,_,_,_],
  [gkL,gkM,_,gkM,gkL,_,_,_,_,_,_,_,_,_],
  [gkL,gkM,_,gkM,gkM,gkM,gkM,gkM,gkM,gkM,gkM,gkM,gkM,gkM],
  [gkD,gkD,_,gkD,gkD,_,_,_,_,_,_,gkD,_,gkD],
  [_,gkD,gkD,gkD,_,_,_,_,_,_,_,gkD,_,gkD],
  [_,_,_,_,_,_,_,_,_,_,_,gkD,_,gkD],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

// Gold key inserted — ring + short stub, shaft hidden in keyhole
export const GOLD_KEY_INSERTED: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,gkL,gkM,gkL,_,_,_,_,_,_,_,_,_,_],
  [gkL,gkM,_,gkM,gkL,_,_,_,_,_,_,_,_,_],
  [gkL,gkM,_,gkM,gkM,gkM,gkM,gkM,gkM,gkM,gkM,gkM,gkM,gkM],
  [gkD,gkD,_,gkD,gkD,_,_,_,_,_,_,_,_,_],
  [_,gkD,gkD,gkD,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

// Crosshair reticle — 9x9, used as cursor when Derringer is selected

export const CROSSHAIR: Sprite = [
  [_,_,_,_,RD,_,_,_,_],
  [_,_,_,RD,RD,RD,_,_,_],
  [_,_,RD,_,_,_,RD,_,_],
  [_,RD,_,_,_,_,_,RD,_],
  [RD,RD,_,_,RD,_,_,RD,RD],
  [_,RD,_,_,_,_,_,RD,_],
  [_,_,RD,_,_,_,RD,_,_],
  [_,_,_,RD,RD,RD,_,_,_],
  [_,_,_,_,RD,_,_,_,_],
]

export const CROSSHAIR_EMPTY: Sprite = [
  [_,_,_,_,RD,_,_,_,_],
  [_,_,_,RD,RD,RD,_,_,_],
  [_,_,RD,_,_,_,RD,_,_],
  [_,RD,_,_,_,_,_,RD,_],
  [RD,RD,_,_,_,_,_,RD,RD],
  [_,RD,_,_,_,_,_,RD,_],
  [_,_,RD,_,_,_,RD,_,_],
  [_,_,_,RD,RD,RD,_,_,_],
  [_,_,_,_,RD,_,_,_,_],
]

const BL = '#868686'

// Bullet-count pips — 9 wide, single row. Layered below the reticle by the
// cursor controller. 5 pixels at cols 0,2,4,6,8, removed right-to-left.
export const BULLETS_5: Sprite = [
  [BL,_,BL,_,BL,_,BL,_,BL],
]

export const BULLETS_4: Sprite = [
  [BL,_,BL,_,BL,_,BL,_,_],
]

export const BULLETS_3: Sprite = [
  [BL,_,BL,_,BL,_,_,_,_],
]

export const BULLETS_2: Sprite = [
  [BL,_,BL,_,_,_,_,_,_],
]

export const BULLETS_1: Sprite = [
  [BL,_,_,_,_,_,_,_,_],
]

export const BULLETS_0: Sprite = [
  [_,_,_,_,_,_,_,_,_],
]

// Rough gems — 8x8 placeholder pixel art, each a distinct cut/shape and palette.
// Refine freely; sprite keys stay the same.

// Agate — rounded banded nodule
const agL = '#E8A87C', agM = '#C9683E', agD = '#8A3D1F'
export const ITEM_GEM_AGATE: Sprite = [
  [_,_,agM,agM,agM,_,_,_],
  [_,agM,agL,agL,agL,agM,_,_],
  [agM,agL,agD,agD,agL,agL,agM,_],
  [agM,agL,agD,agL,agD,agL,agM,_],
  [agM,agL,agL,agD,agD,agL,agM,_],
  [agM,agL,agL,agL,agL,agL,agM,_],
  [_,agM,agL,agL,agL,agM,_,_],
  [_,_,agM,agM,agM,_,_,_],
]

// Turquoise — chunky squarish stone with dark matrix veins
const tqL = '#7FE3DB', tqM = '#3FB5AE', tqD = '#1F5A58'
export const ITEM_GEM_TURQUOISE: Sprite = [
  [_,tqM,tqM,tqM,tqM,tqM,_,_],
  [tqM,tqL,tqL,tqL,tqD,tqL,tqM,_],
  [tqM,tqL,tqD,tqL,tqL,tqL,tqM,_],
  [tqM,tqL,tqL,tqL,tqD,tqL,tqM,_],
  [tqM,tqD,tqL,tqL,tqL,tqL,tqM,_],
  [tqM,tqL,tqL,tqD,tqL,tqL,tqM,_],
  [tqM,tqL,tqL,tqL,tqL,tqL,tqM,_],
  [_,tqM,tqM,tqM,tqM,tqM,_,_],
]

// Chalcedony — waxy translucent lump, soft top highlight
const cyL = '#EEF4F8', cyM = '#A9BDC9', cyD = '#76909E'
export const ITEM_GEM_CHALCEDONY: Sprite = [
  [_,_,cyM,cyM,cyM,cyM,_,_],
  [_,cyM,cyL,cyL,cyL,cyM,cyM,_],
  [cyM,cyL,cyL,cyL,cyM,cyM,cyD,_],
  [cyM,cyL,cyL,cyM,cyM,cyD,cyD,_],
  [cyM,cyL,cyM,cyM,cyD,cyD,cyD,_],
  [cyM,cyM,cyM,cyD,cyD,cyD,cyD,_],
  [_,cyM,cyD,cyD,cyD,cyD,_,_],
  [_,_,cyD,cyD,cyD,_,_,_],
]

// Topaz — emerald-cut rectangle, beveled corners
const tpL = '#FBE08A', tpM = '#E6B23F', tpD = '#B5811C'
export const ITEM_GEM_TOPAZ: Sprite = [
  [_,tpM,tpM,tpM,tpM,tpM,_,_],
  [tpM,tpL,tpL,tpL,tpL,tpM,tpD,_],
  [tpM,tpL,tpM,tpM,tpL,tpM,tpD,_],
  [tpM,tpL,tpM,tpM,tpM,tpM,tpD,_],
  [tpM,tpM,tpM,tpM,tpD,tpD,tpD,_],
  [tpD,tpM,tpD,tpD,tpD,tpD,tpD,_],
  [_,tpD,tpD,tpD,tpD,tpD,_,_],
  [_,_,_,_,_,_,_,_],
]

// Amethyst — pointed crystal cluster (tall facets)
const amL = '#D2A8E8', amM = '#9A5BC9', amD = '#653089'
export const ITEM_GEM_AMETHYST: Sprite = [
  [_,_,amL,_,amL,_,_,_],
  [_,amL,amM,amL,amM,amL,_,_],
  [_,amL,amM,amM,amM,amM,amL,_],
  [amL,amM,amM,amD,amM,amM,amM,_],
  [amM,amM,amD,amD,amD,amM,amD,_],
  [amM,amD,amD,amD,amD,amD,amD,_],
  [_,amD,amD,amD,amD,amD,_,_],
  [_,_,amD,amD,amD,_,_,_],
]

// Diamond — brilliant cut, table on top, point at bottom
const dmL = '#FFFFFF', dmM = '#D6E4EC', dmD = '#A7BCC9'
export const ITEM_GEM_DIAMOND: Sprite = [
  [_,dmM,dmM,dmM,dmM,dmM,_,_],
  [dmM,dmL,dmL,dmL,dmL,dmL,dmM,_],
  [dmM,dmL,dmM,dmM,dmM,dmD,dmM,_],
  [_,dmM,dmL,dmM,dmD,dmD,_,_],
  [_,_,dmM,dmM,dmD,_,_,_],
  [_,_,_,dmM,dmD,_,_,_],
  [_,_,_,dmD,_,_,_,_],
]

// Ruby — round brilliant, deep red with bright crown facet
const ruL = '#F08A9C', ruM = '#C8334F', ruD = '#8A1226'
export const ITEM_GEM_RUBY: Sprite = [
  [_,_,ruM,ruM,ruM,_,_,_],
  [_,ruM,ruL,ruL,ruM,ruM,_,_],
  [ruM,ruL,ruL,ruM,ruM,ruD,ruM,_],
  [ruM,ruL,ruM,ruM,ruD,ruD,ruM,_],
  [ruM,ruM,ruM,ruD,ruD,ruD,ruM,_],
  [_,ruM,ruD,ruD,ruD,ruD,_,_],
  [_,_,ruM,ruD,ruD,ruM,_,_],
  [_,_,_,ruM,ruM,_,_,_],
]

// Small right arrow icon — 5x5, for inline use in UI text
const arW = '#F5F0E1'   // same as COLORS.uiText

export const ARROW_SMALL: Sprite = [
  [_,_,arW,_,_],
  [_,_,_,arW,_],
  [arW,arW,arW,arW,arW],
  [_,_,_,arW,_],
  [_,_,arW,_,_],
]

// Tall American flag on a pole. Pole runs the full height in the left column;
// the panel fills the upper portion: blue canton with suggested stars (light
// dots) over alternating red/white stripes. Stylized to read at sprite scale.
const flP = '#6b4a2c'   // pole (wood)
const flPd = '#4d321c'  // pole shadow
const flB = '#283a7a'   // canton blue
const flS = '#f5f0e1'   // star / white stripe
const flR = '#b22234'   // red stripe
export const FLAG_US: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,flB,flB,flB,flB,flB,flB,flB,flB,flB,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,flB,flS,flB,flS,flB,flS,flB,flS,flB,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,flB,flB,flB,flB,flB,flB,flB,flB,flB,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,flB,flS,flB,flS,flB,flS,flB,flS,flB,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,flB,flB,flB,flB,flB,flB,flB,flB,flB,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,flB,flS,flB,flS,flB,flS,flB,flS,flB,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,flB,flB,flB,flB,flB,flB,flB,flB,flB,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS,flS],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR,flR],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,flPd,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,flP,flP,flPd,flP,flP,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,flP,flP,flP,flP,flPd,flP,flP,flP,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,flP,flP,_,_,_,flPd,flP,_,_,_,flP,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,flP,flP,_,_,_,flPd,flP,_,_,_,flP,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,flP,flP,flP,flP,flPd,flP,flP,flP,flP,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,flP,flP,flP,flPd,flP,flP,flP,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

const mcL = '#6a6a6a'
const mcM = '#4a4a4a'
const mcD = '#2e2e2e'

export const ITEM_MANACLES: Sprite = [
  [_,mcM,mcM,mcM,mcM,_,_,_,_,_,_,mcM,mcM,mcM,mcM,_],
  [mcM, mcL,mcL,mcM,mcD,mcM,_,_,_,_,mcM,mcL,mcM,mcL,mcD,mcM],
  [mcM,_,_,_,_,mcM,_,_,_,_,mcM,_,_,_,_,mcM],
  [mcM,_,_,_,_,mcM,mcL,mcM,mcL,mcM,mcM,_,_,_,_,mcM],
  [mcM,_,_,_,_,mcM,mcM,mcD,mcM,mcD,mcM,_,_,_,_,mcM],
  [mcM,_,_,_,_,mcM,_,_,_,_,mcM,_,_,_,_,mcM],
  [mcM,mcL,mcM,mcL,mcD,mcM,_,_,_,_,mcM,mcL,mcM,mcL,mcD,mcM],
  [_,mcM,mcM,mcM,mcM,_,_,_,_,_,_,mcM,mcM,mcM,mcM,_],
]

const cR = '#CC2222'
const DIALOGUE_CURSOR: Sprite = [
  [cR,_,_,_,_],
  [cR,cR,_,_,_],
  [cR,cR,cR,_,_],
  [cR,cR,cR,cR,_],
  [cR,cR,cR,_,_],
  [cR,cR,_,_,_],
  [cR,_,_,_,_],
]

export const ALL_SPRITES: Record<string, Sprite> = {
  dialogue_cursor: DIALOGUE_CURSOR,
  mill: MILL,
  well: WELL,
  dry_well: DRY_WELL,
  barrel: BARREL,
  flag_us: FLAG_US,
  flower_dot: FLOWER_DOT,
  flower_firewheel: FLOWER_FIREWHEEL,
  flower_bluebonnet: FLOWER_BLUEBONNET,
  bush: BUSH,
  rock_small: ROCK_SMALL,
  grave_cross: GRAVE_CROSS,
  workshop: WORKSHOP,
  workshop_l2: WORKSHOP_L2,
  field: FIELD,
  storage: STORAGE,
  smelter: SMELTER,
  blast_furnace: BLAST_FURNACE,
  shop: SHOP,
  general_store: GENERAL_STORE,
  abandoned_house: ABANDONED_HOUSE,
  house_roof: HOUSE_ROOF,
  house_roof_double: HOUSE_ROOF_DOUBLE,
  house_roof_open: HOUSE_ROOF_OPEN,
  long_house: LONG_HOUSE,
  land_office: LAND_OFFICE,
  nursery: NURSERY,
  church: CHURCH,
  church_bell: CHURCH_BELL,
  church_bell_back: CHURCH_BELL_BACK,
  player: PLAYER,
  player_hurt: PLAYER_HURT,
  cavalry_trooper: CAVALRY_TROOPER,
  cavalry_trooper_step: CAVALRY_TROOPER_STEP,
  wood_wall: WOOD_WALL,
  wood_wall_v: WOOD_WALL_V,
  wood_wall_half: WOOD_WALL_HALF,
  gold_coin: GOLD_COIN,
  heart_full: HEART_FULL,
  heart_3q: HEART_3Q,
  heart_half: HEART_HALF,
  heart_1q: HEART_1Q,
  heart_empty: HEART_EMPTY,
  heart_const_full: HEART_CONST_FULL,
  heart_const_3q: HEART_CONST_3Q,
  heart_const_half: HEART_CONST_HALF,
  heart_const_1q: HEART_CONST_1Q,
  heart_const_empty: HEART_CONST_EMPTY,
  arrow_right: ARROW_RIGHT,
  cow_skull: COW_SKULL,
  yucca: YUCCA,
  pebbles: PEBBLES,
  grass: GRASS,
  item_flour: ITEM_FLOUR,
  item_bread: ITEM_BREAD,
  item_snake_oil: ITEM_SNAKE_OIL,
  item_widower: ITEM_WIDOWER,
  item_shovel: ITEM_SHOVEL,
  item_axe: ITEM_AXE,
  item_pickaxe: ITEM_PICKAXE,
  item_tempered_pick: ITEM_TEMPERED_PICK,
  item_tempered_shovel: ITEM_TEMPERED_SHOVEL,
  item_tempered_axe: ITEM_TEMPERED_AXE,
  item_greedy: ITEM_GREEDY,
  item_double_jack: ITEM_DOUBLE_JACK,
  item_toledo: ITEM_TOLEDO,
  item_paul_bunyan: ITEM_PAUL_BUNYAN,
  item_wild_bill: ITEM_WILD_BILL,
  item_damascus_pick: ITEM_DAMASCUS_PICK,
  shovel_dig: SHOVEL_DIG,
  shovel_dig_tempered: SHOVEL_DIG_TEMPERED,
  dirt_patch: DIRT_PATCH,
  rock_tl: ROCK_TL,
  rock_t:  ROCK_T,
  rock_tr: ROCK_TR,
  rock_l:  ROCK_L,
  rock_c:  ROCK_C,
  rock_r:  ROCK_R,
  rock_bl: ROCK_BL,
  rock_b:  ROCK_B,
  rock_br: ROCK_BR,
  rock_bump: ROCK_BUMP,
  cursor: CURSOR,
  cursor_grab: CURSOR_GRAB,
  cursor_x: CURSOR_X,
  item_bag: ITEM_BAG,
  item_medium_bag: ITEM_MEDIUM_BAG,
  item_sack: ITEM_SACK,
  item_sausage: ITEM_SAUSAGE,
  item_kolache: ITEM_KOLACHE,
  item_leather: ITEM_LEATHER,
  item_twine: ITEM_TWINE,
  item_deed: ITEM_DEED,
  item_mallet: ITEM_MALLET,
  item_canvas: ITEM_CANVAS,
  item_quirt: QUIRT,
  item_saddle: ITEM_SADDLE,
  item_rope: ITEM_ROPE,
  item_sugar_cane: ITEM_SUGAR_CANE,
  item_sugar: ITEM_SUGAR,
  item_tart: ITEM_TART,
  cottonwood: COTTONWOOD,
  cottonwood_stump: COTTONWOOD_STUMP,
  cottonwood_dead: COTTONWOOD_DEAD,
  item_cottonwood_sapling: ITEM_COTTONWOOD_SAPLING,
  planted_cottonwood_sapling: PLANTED_COTTONWOOD_SAPLING,
  item_hemp: ITEM_HEMP,
  item_hemp_seed: ITEM_HEMP_SEED,
  item_iron_bar: ITEM_IRON_BAR,
  item_steel: ITEM_STEEL,
  item_copper_bar: ITEM_COPPER_BAR,
  item_silver_bar: ITEM_SILVER_BAR,
  item_gold_bar: ITEM_GOLD_BAR,
  item_brand: ITEM_BRAND,
  post: POST,
  post_v: POST_V,
  item_post: ITEM_POST,
  cedar_post: CEDAR_POST,
  cedar_post_v: CEDAR_POST_V,
  item_cedar_post: ITEM_CEDAR_POST,
  iron_post: IRON_POST,
  iron_post_v: IRON_POST_V,
  item_iron_post: ITEM_IRON_POST,
  item_manacles: ITEM_MANACLES,
  item_wood: ITEM_WOOD,
  item_plank: ITEM_PLANK,
  item_flagstone: ITEM_FLAGSTONE,
  item_sandstone: ITEM_SANDSTONE,
  item_wheel: ITEM_WHEEL,
  item_crafting_cart: ITEM_CRAFTING_CART,
  item_fence_gate: ITEM_FENCE_GATE,
  item_derringer: ITEM_DERRINGER,
  item_colt: ITEM_COLT,
  item_ammo: ITEM_AMMO,
  keyhole: KEYHOLE,
  item_silver_key: ITEM_SILVER_KEY,
  silver_key_inserted: SILVER_KEY_INSERTED,
  item_gold_key: ITEM_GOLD_KEY,
  gold_key_inserted: GOLD_KEY_INSERTED,
  arrow_small: ARROW_SMALL,
  crosshair: CROSSHAIR,
  crosshair_empty: CROSSHAIR_EMPTY,
  bullets_5: BULLETS_5,
  bullets_4: BULLETS_4,
  bullets_3: BULLETS_3,
  bullets_2: BULLETS_2,
  bullets_1: BULLETS_1,
  bullets_0: BULLETS_0,
  item_gem_agate: ITEM_GEM_AGATE,
  item_gem_turquoise: ITEM_GEM_TURQUOISE,
  item_gem_chalcedony: ITEM_GEM_CHALCEDONY,
  item_gem_topaz: ITEM_GEM_TOPAZ,
  item_gem_amethyst: ITEM_GEM_AMETHYST,
  item_gem_diamond: ITEM_GEM_DIAMOND,
  item_gem_ruby: ITEM_GEM_RUBY,
  fence_gate_open: FENCE_GATE_OPEN,
  item_crate: ITEM_CRATE,
  item_silver_lockbox: ITEM_SILVER_LOCKBOX,
  item_gold_lockbox: ITEM_GOLD_LOCKBOX,
  item_chest: ITEM_CHEST,
  floor_wood: FLOOR_WOOD,
  floor_border: FLOOR_BORDER,
  floor_corner: FLOOR_CORNER,
  wall_trim: WALL_TRIM,
  wall_trim_corner: WALL_TRIM_CORNER,
  wall_trim_mission: WALL_TRIM_MISSION,
  wall_trim_mission_corner: WALL_TRIM_MISSION_CORNER,
  door: DOOR,
  carpet: CARPET,
  floor_terracotta: FLOOR_TERRACOTTA,
  brick_row: BRICK_ROW,
  window: WINDOW,
  pew: PEW,
  item_pipe: ITEM_PIPE,
  pipe_chevron: PIPE_CHEVRON,
  select_frame: SELECT_FRAME,
  pipe_chevron_flip: PIPE_CHEVRON_FLIP,
  item_stone: ITEM_STONE,
  item_coal: ITEM_COAL,
  item_coke: ITEM_COKE,
  item_iron: ITEM_IRON,
  item_copper: ITEM_COPPER,
  item_silver: ITEM_SILVER,
  item_gold: ITEM_GOLD,
  item_clay: ITEM_CLAY,
  brush_ground: BRUSH_GROUND,
  path_dirt: PATH_DIRT,
  tilled_dirt: TILLED_DIRT,
  brush_edge_top: BRUSH_EDGE_TOP,
  brush_edge_left: BRUSH_EDGE_LEFT,
  brush_edge_right: BRUSH_EDGE_RIGHT,
  brush_edge_bottom: BRUSH_EDGE_BOTTOM,
  brush_speck: BRUSH_SPECK,
  tree_shadow: TREE_SHADOW,
  square_shadow: SQUARE_SHADOW,
  blob_shadow: BLOB_SHADOW,
  trooper_shadow: TROOPER_SHADOW,
  honse_shadow: HONSE_SHADOW,
  honse: HONSE,
  bison: BISON,
  longhorn: LONGHORN,
  longhouse: LONGHOUSE,
  honse_feed: HONSE_FEED,
  honse_hurt: HONSE_HURT,
  bison_hurt: BISON_HURT,
  longhorn_hurt: LONGHORN_HURT,
  honse_brown: HONSE_BROWN,
  honse_chestnut: HONSE_CHESTNUT,
  honse_sorrel: HONSE_SORREL,
  honse_palomino: HONSE_PALOMINO,
  honse_sorrel_socks: HONSE_SORREL_SOCKS,
  honse_spotted: HONSE_SPOTTED,
  honse_spotted_brown: HONSE_SPOTTED_BROWN,
  honse_brown_feed: HONSE_BROWN_FEED,
  honse_chestnut_feed: HONSE_CHESTNUT_FEED,
  honse_sorrel_feed: HONSE_SORREL_FEED,
  honse_palomino_feed: HONSE_PALOMINO_FEED,
  honse_sorrel_socks_feed: HONSE_SORREL_SOCKS_FEED,
  honse_spotted_feed: HONSE_SPOTTED_FEED,
  honse_spotted_brown_feed: HONSE_SPOTTED_BROWN_FEED,
  coyote: COYOTE,
  coyote_hurt: COYOTE_HURT,
  coyote_dead: COYOTE_DEAD,
  bandit_dead: BANDIT_DEAD,
  tumbleweed: TUMBLEWEED,
}

// Fallback palette for sprite keys that aren't generated arrays (e.g. PNG
// items like flour/water) or are missing — wood-brown debris.
const DEFAULT_DEBRIS_COLORS = [0x6B4A2A, 0x8B5A2B, 0x4A3318, 0x9C7248]

// Cache so repeated destroys of the same sprite type don't re-scan the array.
const debrisCache: Record<string, number[]> = {}

// The distinct colors of a generated sprite, as Phaser-style 0xRRGGBB numbers,
// for use as a particle palette. Reads straight from the sprite's pixel array —
// destroyed buildings/items burst in their own colors. Falls back to wood-brown
// for keys with no generated array (PNG sprites) or an empty palette.
export function spriteColors(key: string): number[] {
  const cached = debrisCache[key]
  if (cached) return cached

  const sprite = ALL_SPRITES[key]
  if (!sprite) return DEFAULT_DEBRIS_COLORS

  const seen = new Set<string>()
  for (const row of sprite) {
    for (const cell of row) {
      if (cell) seen.add(cell)
    }
  }
  if (seen.size === 0) return DEFAULT_DEBRIS_COLORS

  // hex string ("#RRGGBB" or "RRGGBB") → 0xRRGGBB number. Kept dependency-free
  // so this data module stays pure (no Phaser import).
  const colors = [...seen].map(hex => parseInt(hex.replace('#', ''), 16))
  debrisCache[key] = colors
  return colors
}

import { getAllTroughSprites } from '../world/troughs'
Object.assign(ALL_SPRITES, getAllTroughSprites())

