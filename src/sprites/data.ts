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

// ---- CRAFTER NPC ---- exact same shape as PLAYER, blue shirt, 1px black outline.
// 10x10 grid: the original 8x8 sprite is positioned at columns 1..8, rows 0..7,
// with OL pixels filling in any transparent cell that touches a filled cell.
const NPC_SHIRT = '#5577BB'   // blue shirt
const OL = '#000000'           // outline
export const NPC_CRAFTER: Sprite = [
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

// Shovel: wooden handle, gray metal scoop. 8x8.
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

export const ALL_SPRITES: Record<string, Sprite> = {
  mill: MILL,
  well: WELL,
  crafter: CRAFTER,
  shop: SHOP,
  church: CHURCH,
  player: PLAYER,
  npc_crafter: NPC_CRAFTER,
  gold_coin: GOLD_COIN,
  arrow_right: ARROW_RIGHT,
  cow_skull: COW_SKULL,
  pebbles: PEBBLES,
  grass: GRASS,
  item_flour: ITEM_FLOUR,
  item_water: ITEM_WATER,
  item_bread: ITEM_BREAD,
  item_shovel: ITEM_SHOVEL,
  shovel_dig: SHOVEL_DIG,
  dirt_patch: DIRT_PATCH,
  cursor: CURSOR,
  cursor_grab: CURSOR_GRAB,
}
