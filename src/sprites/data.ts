// Pixel sprite data — 2D arrays where each cell is a hex color string or null.
// Copied from project1. Loader converts these to Phaser textures at boot.

export type Sprite = (string | null)[][]

const _ = null

// ---- MILL ----
const R = '#5C3A1E'
const D = '#7A5230'
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

// ---- PEBBLES ---- 8x8. Scattered brown dots — ground texture for the empty
// areas of the world. Edit colors/positions freely.
const pB = '#5A3D26'   // dark brown pebble
const pL = '#8A6B4A'   // lighter brown pebble
// ---- GRASS ---- dead/dry strands. Edit colors/shape freely.
const gD = '#6B7042'   // dark dry green
const gL = '#8E8C4E'   // pale dry green-tan
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
const SK = '#D19766'
const RD = '#CC2222'
const GN = '#228822'
const BT = '#553311'
const HR = '#1A0F08'

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

// ---- WORKSHOP NPC ---- exact same shape as PLAYER, blue shirt, 1px black outline.
// 10x10 grid: the original 8x8 sprite is positioned at columns 1..8, rows 0..7,
// with OL pixels filling in any transparent cell that touches a filled cell.
const NPC_SHIRT = '#5577BB'   // blue shirt
const OL = '#000000'           // outline
export const NPC_WORKSHOP: Sprite = [
  [_,_,_,OL,OL,OL,OL,OL,OL,_],
  [_,_,OL,HR,SK,SK,SK,SK,HR,OL],
  [_,_,OL,HR,SK,SK,SK,SK,HR,OL],
  [_,_,OL,OL,NPC_SHIRT,NPC_SHIRT,NPC_SHIRT,NPC_SHIRT,OL,OL],
  [_,_,OL,NPC_SHIRT,NPC_SHIRT,NPC_SHIRT,NPC_SHIRT,NPC_SHIRT,NPC_SHIRT,OL],
  [_,_,OL,OL,NPC_SHIRT,NPC_SHIRT,NPC_SHIRT,NPC_SHIRT,OL,OL],
  [_,_,_,OL,GN,GN,GN,GN,OL,_],
  [_,_,_,OL,BT,OL,OL,BT,OL,_],
  [_,_,_,_,OL,_,_,OL,_,_],
  [_,_,_,_,_,_,_,_,_,_],
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

// ---- WORKSHOP (smithy) ----
// 16x16, centered on cols 7-8 (even-art rule). Door at bottom-center, forge above.
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

// ---- CHURCH ---- 16x16. Mission-style: low adobe walls, arched bell tower at top, cross.
// Desert/southwest mission church palette.
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

// ---- SHOP ---- 16x16. Wooden frontier storefront: planks, sloped roof, door,
// hanging sign. Same desert palette base, more "trading post" feel.
const spP = '#8B6240'   // plank wood
const spD = '#5F3D1F'   // dark plank / shadow
const spR = '#6B4A2C'   // roof
const spS = '#3A2410'   // sign frame / deep shadow
const spA = '#1A0F08'   // door / window deep
export const SHOP: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,spR,spR,spR,spR,spR,spR,spR,spR,spR,spR,_,_,_,_],
  [_,spR,spS,spS,spS,spS,spS,spS,spS,spS,spS,spR,_,_,_,_],
  [_,spR,spS,spS,spS,spS,spS,spS,spS,spS,spS,spR,_,_,_,_],
  [_,spR,spS,spS,spS,spS,spS,spS,spS,spS,spS,spR,_,_,_,_],
  [_,spR,spS,spS,spS,spS,spS,spS,spS,spS,spS,spR,_,_,_,_],
  [_,spR,spS,spS,spS,spS,spS,spS,spS,spS,spS,spR,_,_,_,_],
  [_,spR,spS,spS,spS,spS,spS,spS,spS,spS,spS,spR,_,_,_,_],
  [_,spP,spP,spP,spP,spP,spP,spP,spP,spP,spP,spP,_,_,_,_],
  [_,spP,spD,spP,spA,spA,spP,spD,spA,spA,spP,spP,_,_,_,_],
  [_,spP,spP,spP,spA,spA,spP,spP,spA,spA,spP,spP,_,_,_,_],
  [_,spP,spD,spP,spA,spA,spP,spD,spA,spA,spP,spP,_,_,_,_],
  [_,spP,spP,spP,spA,spA,spP,spP,spA,spA,spP,spP,_,_,_,_],
  [_,spP,spD,spP,spA,spA,spP,spD,spA,spA,spP,spP,_,_,_,_],
  [_,spP,spP,spP,spA,spA,spP,spP,spA,spA,spP,spP,_,_,_,_],
  [_,spS,spS,spS,spS,spS,spS,spS,spS,spS,spS,spS,_,_,_,_],
]

// ---- GENERAL STORE ---- Same shape as SHOP, different palette. Cooler/greener
// to read distinct at a glance. Used for the early-game "sell goods" building.
const gsP = '#6E7A4A'   // plank wood (sage green)
const gsD = '#3F4828'   // dark plank / shadow
const gsR = '#566338'   // roof
const gsS = '#2A2E1A'   // sign frame / deep shadow
const gsA = '#0F1408'   // door / window deep
export const GENERAL_STORE: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,gsR,gsR,gsR,gsR,gsR,gsR,gsR,gsR,gsR,gsR,_,_,_,_],
  [_,gsR,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsR,_,_,_,_],
  [_,gsR,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsR,_,_,_,_],
  [_,gsR,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsR,_,_,_,_],
  [_,gsR,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsR,_,_,_,_],
  [_,gsR,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsR,_,_,_,_],
  [_,gsR,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsR,_,_,_,_],
  [_,gsP,gsP,gsP,gsP,gsP,gsP,gsP,gsP,gsP,gsP,gsP,_,_,_,_],
  [_,gsP,gsD,gsP,gsA,gsA,gsP,gsD,gsA,gsA,gsP,gsP,_,_,_,_],
  [_,gsP,gsP,gsP,gsA,gsA,gsP,gsP,gsA,gsA,gsP,gsP,_,_,_,_],
  [_,gsP,gsD,gsP,gsA,gsA,gsP,gsD,gsA,gsA,gsP,gsP,_,_,_,_],
  [_,gsP,gsP,gsP,gsA,gsA,gsP,gsP,gsA,gsA,gsP,gsP,_,_,_,_],
  [_,gsP,gsD,gsP,gsA,gsA,gsP,gsD,gsA,gsA,gsP,gsP,_,_,_,_],
  [_,gsP,gsP,gsP,gsA,gsA,gsP,gsP,gsA,gsA,gsP,gsP,_,_,_,_],
  [_,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,gsS,_,_,_,_],
]

// ---- ABANDONED HOUSE ---- Same shape as SHOP, but desaturated and weathered.
// Sagging roofline (missing pixels), boarded-over windows, dark hollow door.
// Used as a discoverable structure off-screen with items inside.
const ahP = '#6E665C'   // weathered plank
const ahD = '#3A332C'   // dark plank shadow
const ahR = '#4A4138'   // washed-out roof
const ahS = '#1F1A14'   // deep shadow / sign frame
const ahA = '#0A0805'   // doorway hollow
const ahB = '#4D3520'   // board-up plank (warm brown, contrasts grays)
export const ABANDONED_HOUSE: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,ahR,ahR,ahR,_,ahR,ahR,ahR,ahR,_,ahR,_,_,_,_],
  [_,ahR,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahR,_,_,_,_],
  [_,ahR,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahR,_,_,_,_],
  [_,ahR,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,_,_,_,_,_],
  [_,ahR,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahR,_,_,_,_],
  [_,_,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahR,_,_,_,_],
  [_,ahR,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahR,_,_,_,_],
  [_,ahP,ahP,ahP,ahP,ahD,ahP,ahP,ahP,ahP,ahP,ahP,_,_,_,_],
  [_,ahP,ahD,ahP,ahB,ahB,ahP,ahD,ahA,ahA,ahP,ahP,_,_,_,_],
  [_,ahP,ahP,ahD,ahB,ahB,ahP,ahP,ahA,ahA,ahD,ahP,_,_,_,_],
  [_,ahP,ahD,ahP,ahB,ahB,ahP,ahD,ahA,ahA,ahP,ahP,_,_,_,_],
  [_,ahP,ahP,ahP,ahB,ahB,ahP,ahP,ahA,ahA,ahP,ahD,_,_,_,_],
  [_,ahP,ahD,ahP,ahB,ahB,ahP,ahD,ahA,ahA,ahP,ahP,_,_,_,_],
  [_,ahP,ahP,ahP,ahB,ahB,ahP,ahP,ahA,ahA,ahP,ahP,_,_,_,_],
  [_,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,ahS,_,_,_,_],
]

// ---- LAND OFFICE ---- 16x16. Warm honey-toned frontier office with a porch
// overhang on the front. Sits in the northern town. Sells plot-type unlocks.
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


// ---- FIELD ---- 16x16. Tilled plot — rows of furrows in brown dirt, a few
// small green sprouts poking up. Plot-type building, like the Mill.
const fdD = '#5A3D1F'   // dark furrow
const fdM = '#7A5230'   // mid soil
const fdL = '#9B6E40'   // raised soil ridge
const fdG = '#7BAA3C'   // sprout green
const fdGd = '#3F5828'  // sprout shadow
export const FIELD: Sprite = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,_,_,_,_],
  [_,fdM,fdM,fdM,fdM,fdM,fdM,fdM,fdM,fdM,fdM,fdM,_,_,_,_],
  [_,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,_,_,_,_],
  [_,fdL,fdL,fdG,fdL,fdL,fdL,fdL,fdG,fdL,fdL,fdL,_,_,_,_],
  [_,fdM,fdM,fdGd,fdM,fdM,fdM,fdM,fdGd,fdM,fdM,fdM,_,_,_,_],
  [_,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,_,_,_,_],
  [_,fdL,fdL,fdL,fdL,fdG,fdL,fdL,fdL,fdL,fdL,fdL,_,_,_,_],
  [_,fdM,fdM,fdM,fdM,fdGd,fdM,fdM,fdM,fdM,fdM,fdM,_,_,_,_],
  [_,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,_,_,_,_],
  [_,fdL,fdL,fdL,fdL,fdL,fdL,fdG,fdL,fdL,fdL,fdL,_,_,_,_],
  [_,fdM,fdM,fdM,fdM,fdM,fdM,fdGd,fdM,fdM,fdM,fdM,_,_,_,_],
  [_,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,fdD,_,_,_,_],
  [_,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,fdL,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]


// Sits next to the Land Office. Sells seeds.
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


// center. Pale dusty green. Decorative groundcover, used outside the nursery.
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


const svH = '#8B5A2B'   // handle wood
const svM = '#777777'   // metal scoop
const svD = '#444444'   // metal shadow
// Cursor — solid gold arrow, classic pointer shape. 8x8. Tip at (0,0) top-left.
const curG = '#D4A017'   // gold
// Grab cursor — a small open hand for hovering over interactive things. 8x8.
// Same gold color so it reads as part of the cursor family.
const grG = '#D4A017'
export const CURSOR_GRAB: Sprite = [
  [_,grG,_,_,_,_,_,_],
  [_,grG,_,_,_,_,_,_],
  [_,grG,grG,grG,grG,grG,_,_],
  [grG,grG,grG,grG,grG,grG,_,_],
  [_,grG,grG,grG,grG,grG,_,_],
  [_,_,grG,grG,grG,grG,_,_],
  [_,_,grG,grG,grG,grG,_,_],
  [_,_,_,grG,grG,_,_,_],
]

// Rope-dissolve cursor — a red X shown over a tied rope to signal "click to
// dissolve." 8x8, two crossed diagonals, darker red core for a little depth.
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
  [curG,_,_,_,_,_,_,_],
  [curG,curG,_,_,_,_,_,_],
  [curG,curG,curG,_,_,_,_,_],
  [curG,curG,curG,curG,_,_,_,_],
  [curG,curG,curG,curG,curG,_,_,_],
  [curG,curG,curG,curG,curG,curG,_,_],
  [curG,curG,_,curG,_,_,_,_],
  [_,_,_,_,curG,_,_,_],
]

// Dirt patch — left behind by the shovel. Small oblong brown blob.
// 12x8 pixels.
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

// Shovel stuck in the ground — handle pointing up, blade buried at bottom.
// Shown for 2s after a dig click before the dirt patch appears.
// 6 wide x 12 tall.
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

// ---- ROCK TILES ---- 8x8. Tilemap pieces for rock formations. 3x3 grid:
// corners (TL/TR/BL/BR), edges (T/L/R/B), and center (C). World gen composes
// these into multi-tile rock heaps the player can mine with a pickaxe.
const rkL = '#9E9A93'   // light stone (highlight)
const rkM = '#6F6B65'   // mid stone (main)
const rkD = '#3F3C38'   // dark stone (shadow)

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

// Axe: wood handle running corner-to-corner with a metal head at the top.
// Reuses the shovel palette (svH handle, svM/svD metal). 8x8.
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
  [_,_,sgT,_,_,_,_,sgT],
  [_,sgT,sgD,sgM,sgM,sgD,sgT,sgD],
  [sgT,sgD,sgM,sgL,sgL,sgM,sgD,sgT],
  [_,sgT,sgD,sgM,sgM,sgD,sgT,_],
  [_,_,sgT,sgD,sgD,sgT,_,_],
  [_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_],
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

// Pastry: golden flaky bun, swirled sugar glaze on top. 8x8.
const pasL = '#F4D17E'   // dough light
const pasM = '#D8A848'   // dough mid
const pasD = '#9C6E20'   // crust dark
const pasG = '#FFFFFF'   // sugar glaze
export const ITEM_PASTRY: Sprite = [
  [_,pasD,pasM,pasM,pasM,pasM,pasD,_],
  [pasD,pasM,pasL,pasG,pasG,pasL,pasM,pasD],
  [pasM,pasL,pasG,pasL,pasL,pasG,pasL,pasM],
  [pasM,pasG,pasL,pasL,pasL,pasL,pasG,pasM],
  [pasM,pasG,pasL,pasL,pasL,pasL,pasG,pasM],
  [pasM,pasL,pasG,pasL,pasL,pasG,pasL,pasM],
  [pasD,pasM,pasL,pasG,pasG,pasL,pasM,pasD],
  [_,pasD,pasM,pasM,pasM,pasM,pasD,_],
]

// Cottonwood: tall western tree. Trunk centered, canopy on top. 12x16,
// matched to the scale of other in-game buildings.
const cotBk = '#7A5C36'   // bark mid
const cotBkD = '#4A3520'  // bark shadow
const cotLfL = '#8C9A6E'  // leaves light (grey-green)
const cotLfM = '#5F6B48'  // leaves mid (muted green)
const cotLfD = '#3F4A2E'  // leaves dark (deep muted green)
export const COTTONWOOD: Sprite = [
  [_,_,_,cotLfM,cotLfL,cotLfL,cotLfM,cotLfM,_,_,_,_],
  [_,_,cotLfM,cotLfL,cotLfL,cotLfL,cotLfL,cotLfM,cotLfM,_,_,_],
  [_,cotLfM,cotLfL,cotLfM,cotLfL,cotLfL,cotLfM,cotLfL,cotLfM,cotLfM,_,_],
  [_,cotLfL,cotLfM,cotLfM,cotLfD,cotLfM,cotLfM,cotLfL,cotLfL,cotLfM,_,_],
  [cotLfM,cotLfL,cotLfM,cotLfD,cotLfD,cotLfD,cotLfM,cotLfM,cotLfL,cotLfM,cotLfM,_],
  [cotLfL,cotLfM,cotLfD,cotLfD,cotLfD,cotLfD,cotLfD,cotLfM,cotLfM,cotLfL,cotLfM,_],
  [cotLfM,cotLfM,cotLfD,cotLfD,cotLfM,cotLfM,cotLfD,cotLfD,cotLfM,cotLfM,cotLfM,_],
  [cotLfM,cotLfL,cotLfM,cotLfM,cotLfL,cotLfL,cotLfM,cotLfM,cotLfL,cotLfM,cotLfM,_],
  [_,cotLfM,cotLfM,cotLfL,cotLfL,cotLfL,cotLfL,cotLfL,cotLfM,cotLfM,_,_],
  [_,_,cotLfM,cotLfM,cotLfM,cotBkD,cotLfM,cotLfM,cotLfM,_,_,_],
  [_,_,_,_,_,cotBk,cotBkD,_,_,_,_,_],
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
// Cottonwood sapling: thin trunk with a small leafy tuft. 8x8.
// Reuses the cottonwood palette (cotBk, cotBkD, cotLfL, cotLfM).
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

// Rope: coiled loop of braided fiber. Same palette as twine so they read as
// related, but thicker strokes and a hoop shape so it doesn't get confused
// for twine at a glance. 8x8.
export const ITEM_ROPE: Sprite = [
  [_,_,twD,twM,twL,twD,_,_],
  [_,twD,twM,twL,twM,twL,twD,_],
  [twD,twM,twD,_,_,twD,twM,twD],
  [twM,twL,_,_,_,_,twL,twM],
  [twL,twM,_,_,_,_,twM,twL],
  [twD,twM,twD,_,_,twD,twM,twD],
  [_,twD,twL,twM,twL,twM,twD,_],
  [_,_,twD,twM,twD,twL,_,_],
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
const hsM = '#5C402A'   // seed mid (highlight)
const hsL = '#7E5E40'   // seed light edge
export const ITEM_HEMP_SEED: Sprite = [
  [_,_,_,_,_,_,_,_],
  [_,hsL,hsD,_,_,hsL,hsD,_],
  [_,hsM,hsD,_,_,hsM,hsD,_],
  [_,_,hsD,_,_,_,hsD,_],
  [_,_,_,_,hsL,hsD,_,_],
  [_,_,_,_,hsM,hsD,_,_],
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

// Wood: a single log lying horizontally, light top / dark underside for
// roundness, two knot specks. Reuses the post-wood palette so it reads as the
// same wood family as posts. 8x8.
export const ITEM_WOOD: Sprite = [
  [_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_],
  [psD,psM,psM,psM,psM,psM,psM,psD],
  [psM,psL,psL,psG,psL,psL,psM,psM],
  [psM,psL,psL,psL,psL,psG,psL,psM],
  [psD,psM,psM,psM,psM,psM,psM,psD],
  [_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_],
]

// ---- BRUSH GROUND ---- 8x8 ground tile, dusty gray-green to match the
// cottonwood foliage palette. Tiled densely under the oasis grove so the
// area reads as a distinct patch of dry brushy ground instead of cream.
// Not interactable; pure visual. Edges of the patch fade by reducing tile
// density toward the perimeter rather than a hard square boundary.
const brL = '#8C9A6E'   // brush light (matches cotLfL)
const brM = '#5F6B48'   // brush mid (matches cotLfM)
const brD = '#4e5f37'   // brush dark speck (matches cotLfD)
export const BRUSH_GROUND: Sprite = [
  [brL,brM,brL,brL,brM,brL,brL,brM],
  [brM,brL,brL,brM,brL,brL,brM,brL],
  [brL,brL,brD,brL,brM,brL,brL,brL],
  [brL,brM,brL,brL,brL,brM,brL,brM],
  [brM,brL,brL,brM,brL,brL,brL,brL],
  [brL,brL,brM,brL,brL,brL,brM,brL],
  [brL,brM,brL,brL,brD,brL,brL,brM],
  [brM,brL,brL,brM,brL,brL,brM,brL],
]

// Honse: side view facing LEFT, single solid brown. 26 wide × 15 tall.
// Long face juts out at the upper-left, body extends across, tail drapes
// down off the rear-right, four legs underneath.
const hnB = '#6B3F22'   // honse brown (single color, placeholder)
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

export const ALL_SPRITES: Record<string, Sprite> = {
  mill: MILL,
  well: WELL,
  workshop: WORKSHOP,
  field: FIELD,
  shop: SHOP,
  general_store: GENERAL_STORE,
  abandoned_house: ABANDONED_HOUSE,
  land_office: LAND_OFFICE,
  nursery: NURSERY,
  church: CHURCH,
  player: PLAYER,
  npc_workshop: NPC_WORKSHOP,
  gold_coin: GOLD_COIN,
  arrow_right: ARROW_RIGHT,
  cow_skull: COW_SKULL,
  yucca: YUCCA,
  pebbles: PEBBLES,
  grass: GRASS,
  item_flour: ITEM_FLOUR,
  item_water: ITEM_WATER,
  item_bread: ITEM_BREAD,
  item_shovel: ITEM_SHOVEL,
  item_axe: ITEM_AXE,
  shovel_dig: SHOVEL_DIG,
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
  item_sausage: ITEM_SAUSAGE,
  item_kolache: ITEM_KOLACHE,
  item_leather: ITEM_LEATHER,
  item_twine: ITEM_TWINE,
  item_rope: ITEM_ROPE,
  item_sugar_cane: ITEM_SUGAR_CANE,
  item_sugar: ITEM_SUGAR,
  item_pastry: ITEM_PASTRY,
  cottonwood: COTTONWOOD,
  cottonwood_stump: COTTONWOOD_STUMP,
  item_cottonwood_sapling: ITEM_COTTONWOOD_SAPLING,
  planted_cottonwood_sapling: PLANTED_COTTONWOOD_SAPLING,
  item_hemp: ITEM_HEMP,
  item_hemp_seed: ITEM_HEMP_SEED,
  post: POST,
  item_post: ITEM_POST,
  cedar_post: CEDAR_POST,
  item_cedar_post: ITEM_CEDAR_POST,
  item_wood: ITEM_WOOD,
  brush_ground: BRUSH_GROUND,
  honse: HONSE,
}
