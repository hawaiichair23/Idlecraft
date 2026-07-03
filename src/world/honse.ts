import type { TroughKind } from './troughs'

export type HonseSpecies = 'honse' | 'bison' | 'longhorn'

export const HONSE_MAX_NEED = 10
export const HONSE_SEEK_DEFICIT = 1
export const HONSE_HUNGER_TICK_MS = 120_000
export const HONSE_THIRST_TICK_MS = 90_000
export const HONSE_SEEK_ARRIVAL_DIST = 40
export const HONSE_SEEK_MAX_DIST = 1200
export const HONSE_FEED_MIN_GAP = 56

export type HonseMode = 'idle' | 'flee' | 'seek_food' | 'seek_water' | 'charge_orient' | 'charge_dash' | 'charge_recover'

export interface Honse {
  x: number
  y: number
  vx: number
  vy: number
  species: HonseSpecies
  herdId: number
  isLead: boolean
  facingRight: boolean
  facingLockedUntil: number
  homeX: number
  homeY: number
  mode: HonseMode
  modeUntil: number
  tame: boolean
  speedMul: number
  tint: number
  sprite: string
  tinted: boolean
  spacing: number
  health: number
  hurtUntil: number
  feedUntil: number
  leaveUntil: number
  leaveDirX: number
  leaveDirY: number
  knockbackUntil: number
  dying: boolean
  fleeDirX: number
  fleeDirY: number
  fleeSpeed: number
  spookCooldownUntil: number
  chargeCooldownUntil: number
  hunger: number
  thirst: number
  nextHungerTickAt: number
  nextThirstTickAt: number
  nextSeekAt: number
}

interface HonseTuning {
  walkSpeed: number
  catchOffsetX: number
  catchOffsetY: number
  bodyW: number
  bodyH: number
  bodyYOffset: number
  spacingMin: number
  spacingRange: number
  homeRadius: number
  homeBiasHalfAngle: number
  idleWalkChance: number
  idlePauseMinMs: number
  idlePauseMaxMs: number
  idleWalkMinMs: number
  idleWalkMaxMs: number
  herdRadius: number
  herdCohesion: number
  herdSeparation: number
  avoidRadius: number
  avoidSpeedMin: number
  avoidSpeedMax: number
  spookBoost: number
  spookMinSpeed: number
  spookRadius: number
  spookFleeMinMs: number
  spookFleeMaxMs: number
  spookEaseMs: number
  spookCooldownMs: number
  maxHealth: number
  ropeTautDist: number
  ropePullPerPx: number
  ropePullMax: number
  followDeadzone: number
  followRampBand: number
  facingLockMs: number
  chargeChance: number
  chargeOrientMs: number
  chargeDashSpeed: number
  chargeDashMaxMs: number
  chargeRecoverMs: number
  chargeCooldownMs: number
  chargeDamage: number
  chargeImpactRadius: number
  chargeKnockbackV: number
  chargeKnockbackMs: number
}

interface HonseTraits {
  tameable: boolean
  mountable: boolean
  needsTrough: boolean
  herds: boolean
  avoidsPlayer: boolean
  picksCoat: boolean
  canCharge: boolean
  hasLead: boolean
}

const HONSE_DEFAULTS: HonseTuning = {
  walkSpeed: 75,
  catchOffsetX: -16,
  catchOffsetY: -5,
  bodyW: 30,
  bodyH: 12,
  bodyYOffset: 3,
  spacingMin: 32,
  spacingRange: 38,
  homeRadius: 200,
  homeBiasHalfAngle: Math.PI / 2,
  idleWalkChance: 0.3,
  idlePauseMinMs: 3000,
  idlePauseMaxMs: 6000,
  idleWalkMinMs: 1000,
  idleWalkMaxMs: 3000,
  herdRadius: 220,
  herdCohesion: 14,
  herdSeparation: 90,
  avoidRadius: 360,
  avoidSpeedMin: 140,
  avoidSpeedMax: 480,
  spookBoost: 220,
  spookMinSpeed: 420,
  spookRadius: 460,
  spookFleeMinMs: 1500,
  spookFleeMaxMs: 2400,
  spookEaseMs: 1100,
  spookCooldownMs: 2500,
  maxHealth: 30,
  ropeTautDist: 70,
  ropePullPerPx: 1.2,
  ropePullMax: 60,
  followDeadzone: 90,
  followRampBand: 40,
  facingLockMs: 400,
  chargeChance: 0,
  chargeOrientMs: 0,
  chargeDashSpeed: 0,
  chargeDashMaxMs: 0,
  chargeRecoverMs: 0,
  chargeCooldownMs: 0,
  chargeDamage: 0,
  chargeImpactRadius: 0,
  chargeKnockbackV: 0,
  chargeKnockbackMs: 0,
}

export const HONSE_TUNING: Record<HonseSpecies, HonseTuning> = {
  honse: HONSE_DEFAULTS,
  bison: {
    ...HONSE_DEFAULTS,
    walkSpeed: 55,
    catchOffsetX: -18,
    catchOffsetY: 0,
    bodyW: 38,
    bodyH: 14,
    bodyYOffset: 4,
    spacingMin: 80,
    spacingRange: 20,
    homeRadius: 260,
    herdRadius: 260,
    herdCohesion: 300,
    herdSeparation: 80,
    avoidRadius: 280,
    avoidSpeedMin: 120,
    avoidSpeedMax: 380,
    spookBoost: 260,
    spookMinSpeed: 300,
    spookRadius: 380,
    spookFleeMinMs: 2000,
    spookFleeMaxMs: 3200,
    maxHealth: 90,
    chargeChance: 0.4,
    chargeOrientMs: 600,
    chargeDashSpeed: 480,
    chargeDashMaxMs: 1600,
    chargeRecoverMs: 1200,
    chargeCooldownMs: 0,
    chargeDamage: 1,
    chargeImpactRadius: 24,
    chargeKnockbackV: 600,
    chargeKnockbackMs: 350,
  },
  longhorn: {
    ...HONSE_DEFAULTS,
    walkSpeed: 55,
    catchOffsetX: -18,
    catchOffsetY: 0,
    bodyW: 38,
    bodyH: 14,
    bodyYOffset: 4,
    spacingMin: 80,
    spacingRange: 20,
    homeRadius: 260,
    herdRadius: 260,
    herdCohesion: 300,
    herdSeparation: 80,
    avoidRadius: 280,
    avoidSpeedMin: 120,
    avoidSpeedMax: 380,
    spookBoost: 260,
    spookMinSpeed: 300,
    spookRadius: 380,
    spookFleeMinMs: 2000,
    spookFleeMaxMs: 3200,
    maxHealth: 90,
    chargeChance: 0.4,
    chargeOrientMs: 600,
    chargeDashSpeed: 480,
    chargeDashMaxMs: 1600,
    chargeRecoverMs: 1200,
    chargeCooldownMs: 0,
    chargeDamage: 1,
    chargeImpactRadius: 24,
    chargeKnockbackV: 600,
    chargeKnockbackMs: 350,
  },
}

export const HONSE_TRAITS: Record<HonseSpecies, HonseTraits> = {
  honse:    { tameable: true,  mountable: true,  needsTrough: true,  herds: true, avoidsPlayer: true, picksCoat: true,  canCharge: false, hasLead: false },
  bison:    { tameable: false, mountable: false, needsTrough: false, herds: true, avoidsPlayer: true, picksCoat: false, canCharge: true,  hasLead: true  },
  longhorn: { tameable: false, mountable: false, needsTrough: false, herds: true, avoidsPlayer: true, picksCoat: false, canCharge: true,  hasLead: true  },
}

export const HONSE_MAX_HEALTH = HONSE_TUNING.honse.maxHealth
export const HONSE_CATCH_OFFSET_X = HONSE_TUNING.honse.catchOffsetX
export const HONSE_CATCH_OFFSET_Y = HONSE_TUNING.honse.catchOffsetY

const HONSE_COLORS: [number, number][] = [
  [0x7A4A2E, 8],
  [0x1A1A1E, 5],
  [0x4F5359, 5],
  [0xDCE1E6, 1],
]
const HONSE_COLOR_TOTAL = HONSE_COLORS.reduce((s, c) => s + c[1], 0)

function rollSpeed(rng: () => number): number {
  const r = rng()
  if (r < 0.10) return 1.40 + rng() * 0.30
  return 0.95 + rng() * 0.35
}

function pickCoat(rng: () => number): number {
  let r = rng() * HONSE_COLOR_TOTAL
  for (const [color, weight] of HONSE_COLORS) {
    r -= weight
    if (r < 0) return color
  }
  return HONSE_COLORS[0][0]
}

function pickHonseSprite(species: HonseSpecies, rng: () => number): { sprite: string, tinted: boolean } {
  if (!HONSE_TRAITS[species].picksCoat) {
    return { sprite: species, tinted: false }
  }
  const roll = rng()
  if (roll < 0.12) return { sprite: rng() < 0.5 ? 'honse_spotted' : 'honse_spotted_brown', tinted: false }
  if (roll < 0.24) return { sprite: 'honse_palomino', tinted: false }
  if (roll < 0.33) return { sprite: 'honse_sorrel_socks', tinted: false }
  if (roll < 0.55) return { sprite: 'honse_brown', tinted: false }
  if (roll < 0.68) return { sprite: 'honse_chestnut', tinted: false }
  if (roll < 0.80) return { sprite: 'honse_sorrel', tinted: false }
  return { sprite: 'honse', tinted: true }
}

export function createHonse(x: number, y: number, rng: () => number, gameTime: number, species: HonseSpecies = 'honse', herdId: number = 0, isLead: boolean = true): Honse {
  const tuning = HONSE_TUNING[species]
  const { sprite, tinted } = pickHonseSprite(species, rng)
  return {
    x, y,
    vx: 0, vy: 0,
    species,
    herdId,
    isLead,
    facingRight: false,
    facingLockedUntil: 0,
    homeX: x, homeY: y,
    mode: 'idle', modeUntil: gameTime + 500 + rng() * 3000,
    tame: false,
    speedMul: rollSpeed(rng),
    tint: tinted ? pickCoat(rng) : 0,
    sprite,
    tinted,
    spacing: tuning.spacingMin + rng() * tuning.spacingRange,
    health: tuning.maxHealth,
    hurtUntil: 0,
    feedUntil: 0,
    leaveUntil: 0,
    leaveDirX: 0,
    leaveDirY: 0,
    knockbackUntil: 0,
    dying: false,
    fleeDirX: 0,
    fleeDirY: 0,
    fleeSpeed: 0,
    spookCooldownUntil: 0,
    chargeCooldownUntil: 0,
    hunger: HONSE_MAX_NEED,
    thirst: HONSE_MAX_NEED,
    nextHungerTickAt: gameTime + HONSE_HUNGER_TICK_MS + 800 + rng() * 2200,
    nextThirstTickAt: gameTime + HONSE_THIRST_TICK_MS + 800 + rng() * 2200,
    nextSeekAt: 0,
  }
}

export function spookHonse(h: Honse, fromX: number, fromY: number, gameTime: number, rng: () => number, force = false) {
  if (h.dying) return
  if (!force && gameTime < h.spookCooldownUntil) return
  if (!force && h.mode === 'flee' && gameTime < h.modeUntil) return
  const t = HONSE_TUNING[h.species]
  const traits = HONSE_TRAITS[h.species]

  const inChargeMode = h.mode === 'charge_orient' || h.mode === 'charge_dash' || h.mode === 'charge_recover'

  if (!inChargeMode && traits.canCharge && gameTime >= h.chargeCooldownUntil && rng() < t.chargeChance) {
    h.vx = 0
    h.vy = 0
    h.mode = 'charge_orient'
    h.modeUntil = gameTime + t.chargeOrientMs
    return
  }

  let dx = h.x - fromX
  let dy = h.y - fromY
  let dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 0.0001) {
    const vmag = Math.sqrt(h.vx * h.vx + h.vy * h.vy)
    if (vmag > 0.0001) {
      dx = h.vx
      dy = h.vy
      dist = vmag
    } else {
      dx = h.facingRight ? 1 : -1
      dy = 0
      dist = 1
    }
  }
  h.fleeDirX = dx / dist
  h.fleeDirY = dy / dist
  h.fleeSpeed = t.spookMinSpeed
  h.mode = 'flee'
  const fleeMs = t.spookFleeMinMs + rng() * (t.spookFleeMaxMs - t.spookFleeMinMs)
  h.modeUntil = gameTime + fleeMs
  h.spookCooldownUntil = gameTime + fleeMs + t.spookCooldownMs
}

export function spookHonsesFromShot(
  honses: Honse[],
  sx: number,
  sy: number,
  gameTime: number,
  rng: () => number,
  mountedIndex: number | null = null,
) {
  for (let i = 0; i < honses.length; i++) {
    if (i === mountedIndex) continue
    const h = honses[i]
    const r = HONSE_TUNING[h.species].spookRadius
    const dx = h.x - sx
    const dy = h.y - sy
    if (dx * dx + dy * dy > r * r) continue
    spookHonse(h, sx, sy, gameTime, rng)
  }
}

export function getHonseNeckAnchor(h: Honse): { x: number; y: number } {
  const t = HONSE_TUNING[h.species]
  const dx = h.facingRight ? -t.catchOffsetX : t.catchOffsetX
  return { x: h.x + dx, y: h.y + t.catchOffsetY }
}

export function getHonseBodyAABB(h: Honse): { x: number; y: number; w: number; h: number } {
  const t = HONSE_TUNING[h.species]
  return { x: h.x - t.bodyW / 2, y: h.y - t.bodyH / 2 + t.bodyYOffset, w: t.bodyW, h: t.bodyH }
}

function pickIdleBehavior(h: Honse, now: number, rng: () => number) {
  const t = HONSE_TUNING[h.species]
  h.mode = 'idle'
  if (rng() < t.idleWalkChance) {
    const dx = h.homeX - h.x
    const dy = h.homeY - h.y
    const distFromHome = Math.sqrt(dx * dx + dy * dy)

    let angle: number
    if (distFromHome < t.homeRadius) {
      angle = rng() * Math.PI * 2
    } else {
      const homeAngle = Math.atan2(dy, dx)
      angle = homeAngle + (rng() * 2 - 1) * t.homeBiasHalfAngle
    }
    h.vx = Math.cos(angle) * t.walkSpeed
    h.vy = Math.sin(angle) * t.walkSpeed
    h.modeUntil = now + t.idleWalkMinMs + rng() * (t.idleWalkMaxMs - t.idleWalkMinMs)
  } else {
    h.vx = 0
    h.vy = 0
    h.modeUntil = now + t.idlePauseMinMs + rng() * (t.idlePauseMaxMs - t.idlePauseMinMs)
  }
}

export function getHonseRopePull(
  h: Honse,
  tether: { x: number; y: number } | null,
): { vx: number; vy: number } {
  if (!tether) return { vx: 0, vy: 0 }
  const t = HONSE_TUNING[h.species]
  const neck = getHonseNeckAnchor(h)
  const dx = tether.x - neck.x
  const dy = tether.y - neck.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist <= t.ropeTautDist || dist <= 0.0001) return { vx: 0, vy: 0 }
  const pull = Math.min((dist - t.ropeTautDist) * t.ropePullPerPx, t.ropePullMax)
  return { vx: (dx / dist) * pull, vy: (dy / dist) * pull }
}

const HERD_GRID_CELL = Math.max(...Object.values(HONSE_TUNING).map(t => t.herdRadius))

type HerdGrid = Map<string, number[]>

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`
}

function buildHerdGrid(honses: Honse[], mountedIndex: number | null): HerdGrid {
  const grid: HerdGrid = new Map()
  for (let i = 0; i < honses.length; i++) {
    if (i === mountedIndex) continue
    const h = honses[i]
    if (h.tame) continue
    if (!HONSE_TRAITS[h.species].herds) continue
    const cx = Math.floor(h.x / HERD_GRID_CELL)
    const cy = Math.floor(h.y / HERD_GRID_CELL)
    const key = cellKey(cx, cy)
    const bucket = grid.get(key)
    if (bucket) bucket.push(i)
    else grid.set(key, [i])
  }
  return grid
}

function getHerdSteer(
  honses: Honse[],
  selfIndex: number,
  grid: HerdGrid,
  leadByHerdId: Map<number, number>,
): { vx: number; vy: number } {
  const self = honses[selfIndex]
  const selfT = HONSE_TUNING[self.species]
  const selfTraits = HONSE_TRAITS[self.species]
  let sumX = 0, sumY = 0, count = 0
  let sepX = 0, sepY = 0
  const radiusSq = selfT.herdRadius * selfT.herdRadius
  const sep = self.spacing
  const sepSq = sep * sep

  const selfCX = Math.floor(self.x / HERD_GRID_CELL)
  const selfCY = Math.floor(self.y / HERD_GRID_CELL)
  for (let gx = selfCX - 1; gx <= selfCX + 1; gx++) {
    for (let gy = selfCY - 1; gy <= selfCY + 1; gy++) {
      const bucket = grid.get(cellKey(gx, gy))
      if (!bucket) continue
      for (const j of bucket) {
        if (j === selfIndex) continue
        const o = honses[j]
        if (o.species !== self.species) continue
        const dx = o.x - self.x
        const dy = o.y - self.y
        const dSq = dx * dx + dy * dy
        if (dSq > radiusSq || dSq < 0.0001) continue

        sumX += o.x; sumY += o.y; count++

        if (dSq < sepSq) {
          const d = Math.sqrt(dSq)
          const push = (sep - d) / sep
          sepX -= (dx / d) * push
          sepY -= (dy / d) * push
        }
      }
    }
  }

  let vx = 0, vy = 0

  if (selfTraits.hasLead && !self.isLead) {
    const leadIdx = leadByHerdId.get(self.herdId)
    if (leadIdx !== undefined && leadIdx !== selfIndex) {
      const lead = honses[leadIdx]
      const dx = lead.x - self.x
      const dy = lead.y - self.y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > 0.0001) {
        const followDist = self.spacing * 2
        if (d > followDist) {
          vx += (dx / d) * selfT.herdCohesion
          vy += (dy / d) * selfT.herdCohesion
        } else if (d > self.spacing) {
          const ramp = (d - self.spacing) / (followDist - self.spacing)
          vx += (dx / d) * selfT.herdCohesion * ramp
          vy += (dy / d) * selfT.herdCohesion * ramp
        }
      }
    }
  } else if (!selfTraits.hasLead && count > 0) {
    const cx = sumX / count
    const cy = sumY / count
    let dx = cx - self.x
    let dy = cy - self.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d > 0.0001) {
      vx += (dx / d) * selfT.herdCohesion
      vy += (dy / d) * selfT.herdCohesion
    }
  }

  vx += sepX * selfT.herdSeparation
  vy += sepY * selfT.herdSeparation
  return { vx, vy }
}

export function updateHonses(
  honses: Honse[],
  dt: number,
  gameTime: number,
  collidesAt: (px: number, py: number, ignoreHonseIndex: number) => boolean,
  getTethers: (honseIndex: number) => { x: number; y: number }[] = () => [],
  mountedIndex: number | null = null,
  playerPos: { x: number; y: number } | null = null,
  getLeaderPos: (honseIndex: number) => { x: number; y: number } | null = () => null,
  caravanSpeed: number = HONSE_DEFAULTS.walkSpeed,
  getNearestTrough: (kind: TroughKind, hx: number, hy: number) => { x: number; y: number } | null = () => null,
  consumeFromTrough: (kind: TroughKind, tx: number, ty: number, max: number) => number = () => 0,
  rng: () => number = () => 0,
) {
  const now = gameTime
  const step = dt / 1000

  const herdGrid = buildHerdGrid(honses, mountedIndex)
  const leadByHerdId: Map<number, number> = new Map()
  for (let i = 0; i < honses.length; i++) {
    const h = honses[i]
    if (h.isLead && !h.dying) leadByHerdId.set(h.herdId, i)
  }

  for (let i = 0; i < honses.length; i++) {
    if (i === mountedIndex) continue
    const h = honses[i]

    if (h.dying || now < h.knockbackUntil) continue
    if (now < h.feedUntil) { h.vx = 0; h.vy = 0; continue }

    const t = HONSE_TUNING[h.species]
    const traits = HONSE_TRAITS[h.species]

    if (traits.needsTrough) {
      if (h.nextHungerTickAt === 0) h.nextHungerTickAt = now + HONSE_HUNGER_TICK_MS + 800 + Math.floor((i * 547) % 2200)
      if (h.nextThirstTickAt === 0) h.nextThirstTickAt = now + HONSE_THIRST_TICK_MS + 800 + Math.floor((i * 911) % 2200)
      while (now >= h.nextHungerTickAt) {
        if (h.hunger > 0) h.hunger -= 1
        h.nextHungerTickAt += HONSE_HUNGER_TICK_MS
      }
      while (now >= h.nextThirstTickAt) {
        if (h.thirst > 0) h.thirst -= 1
        h.nextThirstTickAt += HONSE_THIRST_TICK_MS
      }
    }

    if (traits.canCharge && h.isLead && playerPos && h.mode !== 'charge_orient' && h.mode !== 'charge_dash' && h.mode !== 'charge_recover' && now >= h.chargeCooldownUntil) {
      const pdx = h.x - playerPos.x
      const pdy = h.y - playerPos.y
      if (pdx * pdx + pdy * pdy < t.avoidRadius * t.avoidRadius) {
        let nearby = 0
        const herdRSq = t.herdRadius * t.herdRadius
        for (let j = 0; j < honses.length; j++) {
          if (j === i) continue
          const o = honses[j]
          if (o.species !== h.species) continue
          if (o.dying) continue
          const dx = o.x - h.x
          const dy = o.y - h.y
          if (dx * dx + dy * dy <= herdRSq) nearby++
        }
        const chance = t.chargeChance * Math.pow(0.5, nearby)
        if (rng() < chance) {
          h.vx = 0
          h.vy = 0
          h.mode = 'charge_orient'
          h.modeUntil = now + t.chargeOrientMs
        } else {
          h.chargeCooldownUntil = now + 1500
        }
      }
    }

    if (h.mode === 'charge_orient') {
      h.vx = 0; h.vy = 0
      if (playerPos) {
        const dx = playerPos.x - h.x
        const dy = playerPos.y - h.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        h.fleeDirX = dx / d
        h.fleeDirY = dy / d
        if (now >= h.facingLockedUntil) {
          const newFacing = h.fleeDirX > 0.001 ? true : h.fleeDirX < -0.001 ? false : h.facingRight
          if (newFacing !== h.facingRight) {
            h.facingRight = newFacing
            h.facingLockedUntil = now + t.facingLockMs
          }
        }
      }
      if (now >= h.modeUntil) {
        h.mode = 'charge_dash'
        h.modeUntil = now + t.chargeDashMaxMs
      }
      continue
    }

    if (h.mode === 'charge_dash') {
      const vx = h.fleeDirX * t.chargeDashSpeed
      const vy = h.fleeDirY * t.chargeDashSpeed
      let blocked = false
      if (vx !== 0) {
        const nextX = h.x + vx * step
        if (collidesAt(nextX, h.y, i)) blocked = true
        else h.x = nextX
      }
      if (vy !== 0) {
        const nextY = h.y + vy * step
        if (collidesAt(h.x, nextY, i)) blocked = true
        else h.y = nextY
      }
      h.vx = vx
      h.vy = vy
      if (blocked || now >= h.modeUntil) {
        h.mode = 'charge_recover'
        h.modeUntil = now + t.chargeRecoverMs
        h.chargeCooldownUntil = now + t.chargeCooldownMs
      }
      continue
    }

    if (h.mode === 'charge_recover') {
      const remaining = h.modeUntil - now
      const factor = Math.max(0, remaining / t.chargeRecoverMs)
      const vx = h.fleeDirX * t.chargeDashSpeed * factor
      const vy = h.fleeDirY * t.chargeDashSpeed * factor
      if (vx !== 0) {
        const nextX = h.x + vx * step
        if (!collidesAt(nextX, h.y, i)) h.x = nextX
      }
      if (vy !== 0) {
        const nextY = h.y + vy * step
        if (!collidesAt(h.x, nextY, i)) h.y = nextY
      }
      h.vx = vx
      h.vy = vy
      if (now >= h.modeUntil) {
        h.mode = 'idle'
        h.modeUntil = 0
      }
      continue
    }

    const tethers = getTethers(i)
    const tether = tethers.length > 0 ? tethers[0] : null

    let moved = false

    if (traits.tameable && h.tame && tether) {
      const leaderPos = getLeaderPos(i)
      if (leaderPos) {
        const neck = getHonseNeckAnchor(h)
        const dx = leaderPos.x - neck.x
        const dy = leaderPos.y - neck.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        let vx = 0, vy = 0
        if (dist > t.followDeadzone) {
          const ramp = Math.min((dist - t.followDeadzone) / t.followRampBand, 1)
          const speed = caravanSpeed * h.speedMul * ramp
          vx = (dx / dist) * speed
          vy = (dy / dist) * speed
        }
        if (now >= h.facingLockedUntil) {
          const newFacing = vx > 0.001 ? true : vx < -0.001 ? false : h.facingRight
          if (newFacing !== h.facingRight) {
            h.facingRight = newFacing
            h.facingLockedUntil = now + t.facingLockMs
          }
        }
        h.vx = vx
        h.vy = vy
        moved = true
      }
    }

    let avoiding = false
    if (!moved && traits.avoidsPlayer && !h.tame && playerPos && !(tether && mountedIndex !== null)) {
      const ax = h.x - playerPos.x
      const ay = h.y - playerPos.y
      const distSq = ax * ax + ay * ay
      if (distSq < t.avoidRadius * t.avoidRadius && distSq > 0.0001) {
        const dist = Math.sqrt(distSq)
        const proximity = 1 - dist / t.avoidRadius
        const speed = (t.avoidSpeedMin + (t.avoidSpeedMax - t.avoidSpeedMin) * proximity) * h.speedMul
        h.vx = (ax / dist) * speed
        h.vy = (ay / dist) * speed
        avoiding = true
      }
    }

    if (!moved && h.mode === 'flee' && now < h.modeUntil) {
      const remaining = h.modeUntil - now
      const ease = remaining < t.spookEaseMs ? remaining / t.spookEaseMs : 1
      const speed = h.fleeSpeed * h.speedMul * ease
      const vx = h.fleeDirX * speed
      const vy = h.fleeDirY * speed
      if (now >= h.facingLockedUntil) {
        const newFacing = vx > 0.001 ? true : vx < -0.001 ? false : h.facingRight
        if (newFacing !== h.facingRight) {
          h.facingRight = newFacing
          h.facingLockedUntil = now + t.facingLockMs
        }
      }
      if (vx !== 0) {
        const nextX = h.x + vx * step
        if (!collidesAt(nextX, h.y, i)) h.x = nextX
      }
      if (vy !== 0) {
        const nextY = h.y + vy * step
        if (!collidesAt(h.x, nextY, i)) h.y = nextY
      }
      h.vx = vx
      h.vy = vy
      moved = true
    }

    if (!moved && !avoiding && now < h.leaveUntil) {
      const speed = t.walkSpeed * h.speedMul
      const baseAngle = Math.atan2(h.leaveDirY, h.leaveDirX)
      const SWEEP_STEPS = [0, 0.26, -0.26, 0.52, -0.52, 0.79, -0.79, 1.05, -1.05, 1.31, -1.31, 1.57, -1.57]
      let chosenVx = h.leaveDirX * speed
      let chosenVy = h.leaveDirY * speed
      let chosenAngle = baseAngle
      for (const offset of SWEEP_STEPS) {
        const a = baseAngle + offset
        const tryVx = Math.cos(a) * speed
        const tryVy = Math.sin(a) * speed
        const xClear = !collidesAt(h.x + tryVx * step, h.y, i)
        const yClear = !collidesAt(h.x, h.y + tryVy * step, i)
        if (xClear || yClear) {
          chosenVx = tryVx
          chosenVy = tryVy
          chosenAngle = a
          break
        }
      }
      h.leaveDirX = Math.cos(chosenAngle)
      h.leaveDirY = Math.sin(chosenAngle)
      if (now >= h.facingLockedUntil) {
        const newFacing = chosenVx > 0.001 ? true : chosenVx < -0.001 ? false : h.facingRight
        if (newFacing !== h.facingRight) {
          h.facingRight = newFacing
          h.facingLockedUntil = now + t.facingLockMs
        }
      }
      if (chosenVx !== 0) {
        const nextX = h.x + chosenVx * step
        if (!collidesAt(nextX, h.y, i)) h.x = nextX
      }
      if (chosenVy !== 0) {
        const nextY = h.y + chosenVy * step
        if (!collidesAt(h.x, nextY, i)) h.y = nextY
      }
      h.vx = chosenVx
      h.vy = chosenVy
      moved = true
    }

    if (!moved && !avoiding && traits.needsTrough && now >= h.nextSeekAt) {
      h.nextSeekAt = now + 500 + (i * 547) % 1500
      const thirstDeficit = HONSE_MAX_NEED - h.thirst
      const hungerDeficit = HONSE_MAX_NEED - h.hunger
      const wantsWater = thirstDeficit >= HONSE_SEEK_DEFICIT
      const wantsHay = hungerDeficit >= HONSE_SEEK_DEFICIT
      let seekKind: TroughKind | null = null
      if (wantsWater && wantsHay) seekKind = thirstDeficit >= hungerDeficit ? 'water' : 'hay'
      else if (wantsWater) seekKind = 'water'
      else if (wantsHay) seekKind = 'hay'
      if (seekKind) {
        const maxSq = HONSE_SEEK_MAX_DIST * HONSE_SEEK_MAX_DIST
        let target = getNearestTrough(seekKind, h.x, h.y)
        if (target) {
          const tdx = target.x - h.x, tdy = target.y - h.y
          if (tdx * tdx + tdy * tdy > maxSq) target = null
        }
        if (!target) {
          const fallback: TroughKind | null = seekKind === 'water' && wantsHay ? 'hay'
            : seekKind === 'hay' && wantsWater ? 'water'
            : null
          if (fallback) {
            target = getNearestTrough(fallback, h.x, h.y)
            if (target) {
              const tdx = target.x - h.x, tdy = target.y - h.y
              if (tdx * tdx + tdy * tdy > maxSq) target = null
              else seekKind = fallback
            }
          }
        }
        if (target) {
          const dx = target.x - h.x
          const dy = target.y - h.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= HONSE_SEEK_ARRIVAL_DIST) {
            const need = seekKind === 'water' ? h.thirst : h.hunger
            const deficit = HONSE_MAX_NEED - need
            const consumed = consumeFromTrough(seekKind, target.x, target.y, deficit)
            if (seekKind === 'water') h.thirst = Math.min(HONSE_MAX_NEED, h.thirst + consumed)
            else h.hunger = Math.min(HONSE_MAX_NEED, h.hunger + consumed)
            if (consumed > 0) {
              h.feedUntil = now + 1000
              const ex = h.x - target.x
              const ey = h.y - target.y
              const ed = Math.sqrt(ex * ex + ey * ey)
              if (ed > 0.01) {
                h.leaveDirX = ex / ed
                h.leaveDirY = ey / ed
              } else {
                const a = (i * 1.732) % (Math.PI * 2)
                h.leaveDirX = Math.cos(a)
                h.leaveDirY = Math.sin(a)
              }
              h.leaveUntil = h.feedUntil + 1500
            }
            h.mode = 'idle'
            h.vx = 0
            h.vy = 0
            moved = true
          } else {
            const speed = t.walkSpeed * h.speedMul
            let vx = (dx / dist) * speed
            let vy = (dy / dist) * speed
            const FEED_ZONE = HONSE_FEED_MIN_GAP * 2
            const feedZoneSq = FEED_ZONE * FEED_ZONE
            const myDxT = h.x - target.x
            const myDyT = h.y - target.y
            const inFeedZone = myDxT * myDxT + myDyT * myDyT <= feedZoneSq
            if (inFeedZone) {
              for (let j = 0; j < honses.length; j++) {
                if (j === i) continue
                const other = honses[j]
                const odxT = other.x - target.x
                const odyT = other.y - target.y
                if (odxT * odxT + odyT * odyT > feedZoneSq) continue
                const rx = h.x - other.x
                const ry = h.y - other.y
                const rd = Math.sqrt(rx * rx + ry * ry)
                if (rd <= 0 || rd >= HONSE_FEED_MIN_GAP) continue
                const push = (HONSE_FEED_MIN_GAP - rd) / HONSE_FEED_MIN_GAP
                vx += (rx / rd) * speed * push
                vy += (ry / rd) * speed * push
              }
            }
            if (now >= h.facingLockedUntil) {
              const newFacing = vx > 0.001 ? true : vx < -0.001 ? false : h.facingRight
              if (newFacing !== h.facingRight) {
                h.facingRight = newFacing
                h.facingLockedUntil = now + t.facingLockMs
              }
            }
            if (vx !== 0) {
              const nextX = h.x + vx * step
              if (!collidesAt(nextX, h.y, i)) h.x = nextX
            }
            if (vy !== 0) {
              const nextY = h.y + vy * step
              if (!collidesAt(h.x, nextY, i)) h.y = nextY
            }
            h.vx = vx
            h.vy = vy
            h.mode = seekKind === 'water' ? 'seek_water' : 'seek_food'
            moved = true
          }
        }
      }
    }

    if (!moved) {
      if (!avoiding) {
        if (traits.hasLead && !h.isLead) {
          h.vx = 0
          h.vy = 0
          h.mode = 'idle'
        } else if (now >= h.modeUntil) {
          pickIdleBehavior(h, now, rng)
        }
      }

      let vx = h.vx
      let vy = h.vy

      if (!h.tame && traits.herds) {
        const steer = getHerdSteer(honses, i, herdGrid, leadByHerdId)
        vx += steer.vx
        vy += steer.vy
      }
      const pull = getHonseRopePull(h, tether)
      vx += pull.vx
      vy += pull.vy

      if (now >= h.facingLockedUntil) {
        let newFacing = h.facingRight
        if (vx > 0.001) newFacing = true
        else if (vx < -0.001) newFacing = false
        if (newFacing !== h.facingRight) {
          h.facingRight = newFacing
          h.facingLockedUntil = now + t.facingLockMs
        }
      }

      if (vx !== 0) {
        const nextX = h.x + vx * step
        if (!collidesAt(nextX, h.y, i)) h.x = nextX
      }
      if (vy !== 0) {
        const nextY = h.y + vy * step
        if (!collidesAt(h.x, nextY, i)) h.y = nextY
      }
    }
  }
}
