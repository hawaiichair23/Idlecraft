import type { Coyote } from './coyote'
import { getCoyoteBodyAABB } from './coyote'
import type { Bandit } from './bandit'
import { getBanditBodyAABB } from './bandit'

// Shared combat surface for any damageable hostile. Both Coyote and Bandit
// structurally satisfy this — it's only the fields that melee, bullets, and the
// damage routine touch. AI, attacks, rendering, and death tails stay per-type.
export interface Enemy {
  x: number
  y: number
  vx: number
  vy: number
  facingRight: boolean
  health: number
  hurtUntil: number
  knockbackUntil: number
  dying: boolean
}

export type EnemyKind = 'coyote' | 'bandit'

// One enemy paired with what combat code needs to act on it generically: its
// kind (for any per-type death consequence) and its world-space hitbox.
export interface EnemyRef {
  enemy: Enemy
  kind: EnemyKind
  body: { x: number; y: number; w: number; h: number }
}

// Flat view over every live enemy roster. This is the ONE place that knows which
// arrays count as enemies — combat systems iterate this, never the typed arrays,
// so adding a new enemy type means registering it here and nothing else.
export function listEnemies(coyotes: Coyote[], bandits: Bandit[]): EnemyRef[] {
  const out: EnemyRef[] = []
  for (const c of coyotes) out.push({ enemy: c, kind: 'coyote', body: getCoyoteBodyAABB(c) })
  for (const b of bandits) out.push({ enemy: b, kind: 'bandit', body: getBanditBodyAABB(b) })
  return out
}
