// Pixel sprite data — 2D arrays where each cell is a hex color string or null.
// Copied from project1. Loader converts these to Phaser textures at boot.

export type Sprite = (string | null)[][]

const _ = null

// ---- MILL ----
const R = '#5C3A1E'
const D = '#7A5230'
const L = '#8B6340'
const B = '#A0522D'
const W = '#C4A35A'
const O = '#654321'
const K = '#4A2F0F'
const F = '#6B3410'
const S = '#5A2D0E'
const A = '#A0522D'

// Building art widened from the center: every column 7 duplicated to 7-8,
// then last column dropped to keep the grid 16 wide. Now centered on cols 7-8.
export const MILL: Sprite = [
  [_,_,_,_,A,_,_,R,R,_,_,A,_,_,_,_],
  [_,_,_,_,_,A,R,D,D,R,A,_,_,_,_,_],
  [_,_,_,_,_,R,A,D,D,A,R,_,_,_,_,_],
  [_,_,_,_,_,_,D,A,A,D,_,_,_,_,_,_],
  [_,_,_,_,_,_,A,D,D,A,_,_,_,_,_,_],
  [_,_,_,_,_,A,D,D,D,D,A,_,_,_,_,_],
  [_,_,_,_,_,A,D,D,D,D,A,_,_,_,_,_],
  [_,_,_,_,_,B,B,B,B,B,B,_,_,_,_,_],
  [_,_,_,_,B,B,B,B,B,B,B,B,_,_,_,_],
  [_,_,_,_,B,B,W,B,B,W,B,B,_,_,_,_],
  [_,_,_,_,B,B,B,B,B,B,B,B,_,_,_,_],
  [_,_,_,B,B,B,B,B,B,B,B,B,B,_,_,_],
  [_,_,_,B,B,B,O,O,O,O,B,B,B,_,_,_],
  [_,_,_,B,B,B,O,K,K,O,B,B,B,_,_,_],
  [_,_,F,F,F,F,F,F,F,F,F,F,F,F,_,_],
  [_,_,S,S,S,S,S,S,S,S,S,S,S,S,_,_],
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

export const COW_SKULL: Sprite = [
  [bN,_,_,_,_,_,_,bN],
  [bN,bN,bN,bN,bN,bN,bN,bN],
  [_,bN,bS,bN,bN,bS,bN,_],
  [_,bN,bS,bN,bN,bS,bN,_],
  [_,bN,bN,bN,bN,bA,bN,_],
  [_,_,bN,bN,bA,bA,_,_],
  [_,_,bA,bA,bA,bA,_,_],
  [_,_,_,bA,bA,_,_,_],
]
// 8x8. Starter — feel free to tweak any pixel.
const cL = '#FFEE66'  // highlight (bright)
const cM = '#DAA520'  // main yellow (matches uiGold)
const cD = '#8B6914'  // shadow (dark)

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
const SK = '#F5C6A0'
const RD = '#CC2222'
const GN = '#228822'
const BT = '#553311'
const HR = '#442200'

export const PLAYER: Sprite = [
  [_,_,HR,HR,HR,HR,_,_],
  [_,HR,SK,SK,SK,SK,HR,_],
  [_,_,SK,SK,SK,SK,_,_],
  [_,_,RD,RD,RD,RD,_,_],
  [_,RD,RD,RD,RD,RD,RD,_],
  [_,_,RD,RD,RD,RD,_,_],
  [_,_,GN,GN,GN,GN,_,_],
  [_,_,BT,_,_,BT,_,_],
]

// ---- WELL ----
const ST = '#888888'
const SD = '#666666'
const WA = '#4488CC'
const WL = '#66AADD'
const RP = '#8B4513'

export const WELL: Sprite = [
  [_,_,_,_,_,_,_,RP,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,RP,_,_,_,_,_,_,_,_],
  [_,_,_,_,RP,RP,RP,RP,RP,RP,RP,_,_,_,_,_],
  [_,_,_,_,_,_,_,RP,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,RP,_,_,_,_,_,_,_,_],
  [_,_,_,_,ST,ST,ST,ST,ST,ST,ST,_,_,_,_,_],
  [_,_,_,ST,SD,SD,SD,SD,SD,SD,SD,ST,_,_,_,_],
  [_,_,_,ST,SD,WA,WA,WA,WA,WA,SD,ST,_,_,_,_],
  [_,_,_,ST,SD,WA,WL,WA,WL,WA,SD,ST,_,_,_,_],
  [_,_,_,ST,SD,WA,WA,WA,WA,WA,SD,ST,_,_,_,_],
  [_,_,_,ST,SD,WA,WA,WL,WA,WA,SD,ST,_,_,_,_],
  [_,_,_,ST,SD,SD,SD,SD,SD,SD,SD,ST,_,_,_,_],
  [_,_,_,ST,ST,ST,ST,ST,ST,ST,ST,ST,_,_,_,_],
  [_,_,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,_,_,_],
  [_,_,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

// ---- CRAFTER (smithy) ----
// 16x16, centered on cols 7-8 (even-art rule). Door at bottom-center, forge above.
const rD = '#4A2F0F'  // roof dark
const wL = '#8B5A2B'  // wall light brown
const wM = '#6B3410'  // wall medium brown
const dK = '#1A1208'  // doorway interior shadow
const aB = '#222222'  // anvil
const gO = '#FF6622'  // forge glow orange
const gY = '#FFAA33'  // forge glow yellow
const sL = '#888888'  // stone light
const sD = '#666666'  // stone dark
const sM = '#AAAAAA'  // smoke
const dD = '#3A2410'  // door deep

export const CRAFTER: Sprite = [
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

// ---- ITEMS (placeholders) ----
// Flour: white sack with a brown tie at the top.
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

// Water: blue droplet, lighter highlight on left, darker bottom.
const iwD = '#3A6EA5'
const iwM = '#4A8BCC'
const iwL = '#6AAEE0'
export const ITEM_WATER: Sprite = [
  [_,_,_,iwM,_,_,_,_],
  [_,_,iwM,iwM,iwM,_,_,_],
  [_,iwM,iwL,iwM,iwM,iwD,_,_],
  [_,iwM,iwL,iwM,iwM,iwD,_,_],
  [iwM,iwL,iwM,iwM,iwM,iwM,iwD,_],
  [iwM,iwM,iwM,iwM,iwM,iwM,iwD,_],
  [_,iwM,iwM,iwM,iwM,iwD,_,_],
  [_,_,iwM,iwM,iwD,_,_,_],
]

// Bread: brown loaf with a darker crust pattern.
const bC = '#A06030'   // crust
const bI = '#D4A574'   // interior crumb
const bD = '#6B3410'   // dark crust line
export const ITEM_BREAD: Sprite = [
  [_,_,bC,bC,bC,_,_,_],
  [_,bC,bI,bI,bI,bC,_,_],
  [bC,bI,bI,bI,bI,bI,bC,_],
  [bC,bI,bD,bI,bD,bI,bC,_],
  [bC,bI,bI,bI,bI,bI,bC,_],
  [bC,bI,bD,bI,bD,bI,bC,_],
  [_,bC,bI,bI,bI,bC,_,_],
  [_,_,bC,bC,bC,_,_,_],
]

export const ALL_SPRITES: Record<string, Sprite> = {
  mill: MILL,
  well: WELL,
  crafter: CRAFTER,
  player: PLAYER,
  gold_coin: GOLD_COIN,
  arrow_right: ARROW_RIGHT,
  cow_skull: COW_SKULL,
  item_flour: ITEM_FLOUR,
  item_water: ITEM_WATER,
  item_bread: ITEM_BREAD,
}
