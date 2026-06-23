import Phaser from 'phaser'
import { state } from './state'
import { TOOL_RANGE } from './ItemActionController'
import { ITEMS } from '../items/types'
import { makeRng } from '../world/gen'
import { listEnemies, type EnemyRef } from '../world/enemy'
import { startBanditRetreat, BANDIT_KNOCKBACK, BANDIT_KNOCKBACK_MS } from '../world/bandit'
import type { Bandit } from '../world/bandit'

// ---- visual effect helpers (scene-agnostic) ----
// These take a Phaser.Scene instead of living on a specific scene, so any scene
// (overworld, walkable interior, future barns) renders identical feedback.

export function spawnCrumbWave(scene: Phaser.Scene, x: number, y: number, color: number) {
  const COUNT = 6
  for (let i = 0; i < COUNT; i++) {
    const angle = (Math.PI / 6) + Math.random() * (Math.PI * 2 / 3)
    const speed = 8 + Math.random() * 8
    const dx = Math.cos(angle) * speed
    const dy = -Math.sin(angle) * speed
    const p = scene.add.rectangle(x, y - 2, 2, 2, color).setDepth(1001)
    const landX = Math.floor(x + dx)
    const landY = Math.floor(y + dy + 10)
    scene.tweens.add({
      targets: p,
      x: landX,
      y: landY,
      duration: 300 + Math.random() * 80,
      ease: 'Quad.easeOut',
      onComplete: () => {
        p.setPosition(landX, landY)
        scene.time.delayedCall(200, () => p.destroy())
      },
    })
  }
}

export function spawnCrumbs(scene: Phaser.Scene, x: number, y: number, color: number) {
  spawnCrumbWave(scene, x, y, color)
  scene.time.delayedCall(150, () => spawnCrumbWave(scene, x, y, color))
  scene.time.delayedCall(300, () => spawnCrumbWave(scene, x, y, color))
  scene.time.delayedCall(450, () => spawnCrumbWave(scene, x, y, color))
}

export function spawnParticles(scene: Phaser.Scene, x: number, y: number, colors: number[], wave = 0) {
  const PARTICLE_COUNT = 12
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (Math.PI / 6) + Math.random() * (Math.PI * 2 / 3)
    const speed = 12 + Math.random() * 10 + wave * 3
    const dx = Math.cos(angle) * speed
    const dy = -Math.sin(angle) * speed
    const color = colors[Math.floor(Math.random() * colors.length)]
    const p = scene.add.rectangle(x, y - 4, 3, 3, color).setDepth(4)
    const landX = Math.floor(x + dx)
    const landY = Math.floor(y + dy + 12)
    scene.tweens.add({
      targets: p,
      x: landX,
      y: landY,
      duration: 400 + Math.random() * 100,
      ease: 'Quad.easeOut',
      onComplete: () => {
        p.setPosition(landX, landY)
        scene.time.delayedCall(300, () => p.destroy())
      },
    })
  }
}

// ---- gun controller ----
// Owns all gun state (ammo, reload timing, slot tracking, the bullet stream's
// seeded RNG, and the live bullets). One instance per scene that fires guns.
// The bullet *consequence* (what a bullet hits and what that does) differs by
// scene population, so each scene supplies an onHit callback; everything else —
// fire cadence, ammo, reload, spawning, movement, despawn — is shared here.

export const BULLET_SPEED = 600   // px/sec

export interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  sprite: Phaser.GameObjects.Rectangle
  fromBandit: boolean
}

export interface BulletBounds {
  left: number
  right: number
  top: number
  bottom: number
}

export const ENEMY_KNOCKBACK = 250
export const ENEMY_KNOCKBACK_MS = 200
export const ENEMY_HURT_MS = 400
export const ENEMY_DEATH_MS = 200
export const WEAPON_DAMAGE: Record<string, number> = { axe: 3 }
export const CHOP_COOLDOWN_MS = 0

export function damageEnemy(ref: EnemyRef, amount: number, fromX: number, fromY: number, ignoreInvuln = false, melee = false): boolean {
  const e = ref.enemy
  if (e.dying) return false
  if (!ignoreInvuln && state.gameTime < e.hurtUntil) return false
  e.health -= amount
  e.hurtUntil = state.gameTime + ENEMY_HURT_MS
  let kx = e.x - fromX
  let ky = e.y - fromY
  const len = Math.sqrt(kx * kx + ky * ky) || 1
  kx /= len; ky /= len
  const kb = ref.kind === 'bandit' ? BANDIT_KNOCKBACK : ENEMY_KNOCKBACK
  const kbMs = ref.kind === 'bandit' ? BANDIT_KNOCKBACK_MS : ENEMY_KNOCKBACK_MS
  if (ref.kind === 'bandit') {
    const bandit = e as Bandit
    bandit.active = true
    bandit.returningHome = false   // shot mid-return → abort walk-back, re-engage
  }
  e.vx = kx * kb
  e.vy = ky * kb
  e.knockbackUntil = state.gameTime + kbMs
  if (e.health <= 0) {
    e.dying = true
    e.hurtUntil = state.gameTime + ENEMY_DEATH_MS
  } else if (melee && ref.kind === 'bandit') {
    startBanditRetreat(e as Bandit, fromX, fromY, state.gameTime)
  }
  return true
}

export function tryAxeEnemy(
  playerX: number, playerY: number,
  clickX: number, clickY: number,
  damage: number, lastChopAt: number,
): { hit: boolean; newChopAt: number } {
  if (state.gameTime - lastChopAt < CHOP_COOLDOWN_MS) return { hit: false, newChopAt: lastChopAt }
  const dx = clickX - playerX
  const dy = clickY - playerY
  if (dx * dx + dy * dy > TOOL_RANGE * TOOL_RANGE) return { hit: false, newChopAt: lastChopAt }
  const M = 14
  for (const ref of listEnemies(state.coyotes, state.bandits)) {
    if (ref.enemy.dying) continue
    const b = ref.body
    if (clickX < b.x - M || clickX > b.x + b.w + M) continue
    if (clickY < b.y - M || clickY > b.y + b.h + M) continue
    if (!damageEnemy(ref, damage, playerX, playerY, false, true)) continue
    return { hit: true, newChopAt: state.gameTime }
  }
  return { hit: false, newChopAt: lastChopAt }
}

export class GunController {
  // Magazine + reload state is shared across all scenes, so it lives on `state`
  // and these accessors proxy to it. One clip, persistent whether you're in the
  // overworld or an interior. Bullets and the seeded RNG stay per-instance.
  get gunAmmo() { return state.gunAmmo }
  set gunAmmo(v) { state.gunAmmo = v }
  get lastFireAt() { return state.lastFireAt }
  set lastFireAt(v) { state.lastFireAt = v }
  get gunFullReloadUntil() { return state.gunFullReloadUntil }
  set gunFullReloadUntil(v) { state.gunFullReloadUntil = v }
  get lastGunSlot() { return state.lastGunSlot }
  set lastGunSlot(v) { state.lastGunSlot = v }
  get pendingReloadAmount() { return state.pendingReloadAmount }
  set pendingReloadAmount(v) { state.pendingReloadAmount = v }
  readonly bullets: Bullet[] = []
  private readonly bulletRng: () => number
  private readonly bulletW: number
  private readonly bulletH: number


  constructor(seed = 0, bulletW = 8, bulletH = 3) {
    this.bulletRng = makeRng(seed)
    this.bulletW = bulletW
    this.bulletH = bulletH
  }

  // Reset/refresh ammo when the selected gun slot changes. Returns the gun def
  // for the selected slot, or null if the selected item isn't a gun.
  private syncSlot() {
    const sel = state.inventory[state.selectedInventorySlot]
    const def = sel ? ITEMS[sel.type] : null
    if (!def || def.gunSpread == null) return null
    if (state.selectedInventorySlot !== this.lastGunSlot) {
      this.lastFireAt = 0
      this.gunFullReloadUntil = 0
      this.gunAmmo = def.gunAmmo ?? 1
      this.lastGunSlot = state.selectedInventorySlot
    }
    return def
  }

  // Reticle state for the cursor: which crosshair + how many rounds to show.
  reticle(): { sprite: string; bullets?: string } | null {
    const def = this.syncSlot()
    if (!def) return null
    const reloading = state.gameTime < this.gunFullReloadUntil
      || state.gameTime - this.lastFireAt < (def.gunReloadMs ?? 0)
    const sprite = reloading ? 'crosshair_empty' : 'crosshair'
    if (def.gunAmmo != null) {
      const shown = reloading && state.gameTime < this.gunFullReloadUntil ? 0 : this.gunAmmo
      return { sprite, bullets: `bullets_${shown}` }
    }
    return { sprite }
  }

  // Attempt to fire toward (tx, ty) from (px, py). Handles cadence, ammo, and
  // the auto-reload trigger on an emptied mag. Spawns the bullet sprite on the
  // given scene. Returns true if a shot was fired.
  fire(scene: Phaser.Scene, px: number, py: number, tx: number, ty: number): boolean {
    const def = this.syncSlot()
    if (!def || def.gunSpread == null) return false
    if (state.gameTime < this.gunFullReloadUntil) return false
    if (state.gameTime - this.lastFireAt < (def.gunReloadMs ?? 0)) return false
    if (def.gunAmmo != null && this.gunAmmo <= 0) return false

    this.lastFireAt = state.gameTime
    const dx = tx - px
    const dy = ty - py
    let angle = Math.atan2(dy, dx)
    if (def.gunSpread > 0) angle += (this.bulletRng() - 0.5) * def.gunSpread
    const vx = Math.cos(angle) * BULLET_SPEED
    const vy = Math.sin(angle) * BULLET_SPEED
    const sprite = scene.add.rectangle(px, py, this.bulletW, this.bulletH, 0x2A2A2A)
      .setDepth(50000)
      .setRotation(angle)
    this.bullets.push({ x: px, y: py, vx, vy, sprite, fromBandit: false })

    if (def.gunAmmo != null) {
      this.gunAmmo--
      if (this.gunAmmo <= 0) {
        this.gunFullReloadUntil = state.gameTime + (def.gunFullReloadMs ?? 0)
        this.pendingReloadAmount = def.gunAmmo
      }
    }
    return true
  }

  // Draw the next value from the seeded bullet-spread stream. Bandits share this
  // stream so their shot perturbation stays deterministic with worldgen.
  nextSpread(): number {
    return this.bulletRng()
  }

  // Spawn a bullet from a non-player source (e.g. a bandit). The scene supplies
  // origin, direction, and spread; the controller owns the lifecycle.
  spawnHostile(scene: Phaser.Scene, px: number, py: number, angle: number) {
    const vx = Math.cos(angle) * BULLET_SPEED
    const vy = Math.sin(angle) * BULLET_SPEED
    const sprite = scene.add.rectangle(px, py, this.bulletW, this.bulletH, 0x2A2A2A)
      .setDepth(50000)
      .setRotation(angle)
    this.bullets.push({ x: px, y: py, vx, vy, sprite, fromBandit: true })
  }

  // Manual reload (R): top the clip from owned ammo over the gun's reload time.
  tryStartReload(ammoItem = 'colt_ammo') {
    if (this.gunFullReloadUntil !== 0) return
    const sel = state.inventory[state.selectedInventorySlot]
    const def = sel ? ITEMS[sel.type] : null
    if (!def || def.gunSpread == null || def.gunAmmo == null) return
    const missing = def.gunAmmo - this.gunAmmo
    if (missing <= 0) return
    const owned = state.countItem(ammoItem)
    if (owned <= 0) return
    this.pendingReloadAmount = Math.min(missing, owned)
    this.gunFullReloadUntil = state.gameTime + (def.gunFullReloadMs ?? 0)
  }

  // Once the reload cooldown elapses, charge the rounds and refill the clip.
  refillIfReloaded(registry: Phaser.Data.DataManager, ammoItem = 'colt_ammo') {
    if (this.gunFullReloadUntil === 0) return
    if (state.gameTime < this.gunFullReloadUntil) return
    const sel = state.inventory[state.selectedInventorySlot]
    const def = sel ? ITEMS[sel.type] : null
    if (def && def.gunAmmo != null) {
      this.gunAmmo = Math.min(def.gunAmmo, this.gunAmmo + this.pendingReloadAmount)
      state.consumeItem(ammoItem, this.pendingReloadAmount)
      registry.events.emit('inventory-changed')
    }
    this.gunFullReloadUntil = 0
    this.pendingReloadAmount = 0
  }

  // Move every bullet, run the scene's hit check, and despawn on hit or once
  // out of bounds. onHit returns true if the bullet should be consumed.
  // Per-frame gun upkeep shared by every scene: finish any pending reload,
  // honor the manual-reload key, and advance bullets. Keeps the reload/key
  // wiring in one place instead of duplicated in each scene's update loop.
  tick(
    dt: number,
    bounds: BulletBounds,
    rKey: Phaser.Input.Keyboard.Key,
    registry: Phaser.Data.DataManager,
    onHit?: (b: Bullet) => boolean,
    ammoItem = 'colt_ammo',
  ) {
    this.refillIfReloaded(registry, ammoItem)
    if (Phaser.Input.Keyboard.JustDown(rKey)) this.tryStartReload(ammoItem)
    this.update(dt, bounds, onHit)
  }

  update(dt: number, bounds: BulletBounds, onHit?: (b: Bullet) => boolean) {
    if (this.bullets.length === 0) return
    const sec = dt / 1000
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]
      b.x += b.vx * sec
      b.y += b.vy * sec
      b.sprite.setPosition(b.x, b.y)
      const hit = onHit ? onHit(b) : false
      if (hit || b.x < bounds.left || b.x > bounds.right || b.y < bounds.top || b.y > bounds.bottom) {
        b.sprite.destroy()
        this.bullets.splice(i, 1)
      }
    }
  }

  destroyAll() {
    for (const b of this.bullets) b.sprite.destroy()
    this.bullets.length = 0
  }
}
