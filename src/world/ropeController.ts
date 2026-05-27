// RopeController — owns rope-throw physics, catch detection, and leash
// anchoring for player movement.
//
// Model:
//   A Rope has two endpoints, endA and endB. Each endpoint is either the
//   player, a placed post, or a honse (by index). Segment 0 is pinned to
//   endA's world position; the tip (last segment) is pinned to endB's. A
//   newly-thrown rope has endA = player and endB = null (in flight). When
//   the tip catches something, endB becomes that anchor.
//
//   The player can have at most ONE rope where they are an endpoint. When
//   they throw again while holding such a rope, the player-end transitions
//   to whatever the other end was anchored to — i.e. the player "lets go"
//   of their end and the same chain is now anchored at both ends. The newly
//   freed end (now segment-0 side) gets launch velocity toward the click,
//   becoming a fresh tip.
//
//   Fully two-anchor ropes stay in the world. A new throw starts a fresh
//   rope from the player's hand.

import Phaser from 'phaser'
import { state } from '../game/state'
import { getHonseNeckAnchor } from './honse'

// ---- tuning ----
const ROPE_SEGMENTS = 20
const ROPE_SEGMENT_COLLISION_RADIUS = 3
const ROPE_SEGMENT_SPACING = 6

// Collision categories. Everything in the world defaults to category 1 and a
// mask of "collide with all" (rocks, buildings, player, rope). The honse gets
// her own bit so the rope can choose whether to collide with her: rope segments
// always collide with the world (bit 1) but include the honse bit in their mask
// ONLY when strung between two posts. That keeps the rope solid against rocks/
// buildings while a held/in-flight rope passes the honse cleanly.
export const CAT_WORLD = 0x0001
export const CAT_HONSE = 0x0002
const ROPE_THROW_SPEED = 60
const ROPE_TRANSITION_THROW_SPEED = 40
const ROPE_THROW_MOUNTED_MULT = 2.5   // mounted throws fire harder so the rope leads a galloping mount
const ROPE_LIFETIME_MS = 2000          // unattached rope auto-cleanup
const ROPE_COLOR = 0x8B5A2B
const ROPE_THICKNESS = 3
const ROPE_CATCH_RADIUS = 16
const ROPE_CATCH_RADIUS_HONSE = 28
const ROPE_ATTACHED_FRICTION_AIR = 0.1
// Untie: click within this many px of a rope segment to sever it.
const ROPE_CLICK_TOLERANCE = 12


// ---- endpoint type ----
export type RopeEnd =
    | { kind: 'player' }
    | { kind: 'post'; x: number; y: number }
    | { kind: 'honse'; index: number }
    | { kind: 'crate'; index: number }

// ---- internal rope record ----
interface Rope {
    bodies: MatterJS.BodyType[]
    // Constraints between bodies[i] and bodies[i+1]. Same length as bodies-1.
    // Stored so we can sever one mid-life when the player unties the rope.
    constraints: MatterJS.ConstraintType[]
    graphics: Phaser.GameObjects.Graphics
    endA: RopeEnd       // pinned at segment 0
    endB: RopeEnd | null // pinned at the tip; null while in flight
    // launching: if non-null, this end is currently flying (has launch
    // velocity, hasn't settled). When the tip catches, this is cleared.
    // Used to know which side runs catch detection in update().
    cleanupTimer: Phaser.Time.TimerEvent | null
    // When attached to a crate, a Matter constraint links the tip to the crate
    // body so the solver tows it. The tip is NOT teleport-pinned in that case
    // (the constraint owns it). Stored so we can remove it when the rope dies.
    crateConstraint: MatterJS.ConstraintType | null
    crateConstraintA: MatterJS.ConstraintType | null
}

export class RopeController {
    private scene: Phaser.Scene
    private player: Phaser.GameObjects.Sprite
    private ropes: Rope[] = []
    // Player's per-frame velocity, measured from position deltas. A thrown rope
    // inherits this so it leads ahead when you throw while moving (mounted).
    private playerVX = 0
    private playerVY = 0
    private lastPlayerX = 0
    private lastPlayerY = 0
    private hasLastPlayerPos = false
    // Called when one rope is spent: either fully strung (second throw caught)
    // or despawned in flight (missed). Fires exactly once per rope.
    onRopeConsumed: (() => void) | null = null

    constructor(scene: Phaser.Scene, player: Phaser.GameObjects.Sprite) {
        this.scene = scene
        this.player = player
    }

    // Find the rope (if any) where the player is one of the endpoints.
    // The player can only be on ONE rope at a time by construction.
    private findPlayerRope(): Rope | null {
        for (const r of this.ropes) {
            if (r.endA.kind === 'player' || (r.endB && r.endB.kind === 'player')) return r
        }
        return null
    }

    // World position of an endpoint. Returns null if the endpoint references
    // a missing honse (e.g. removed mid-frame).
    private endPos(end: RopeEnd): { x: number; y: number } | null {
        if (end.kind === 'player') return { x: this.player.x, y: this.player.y }
        if (end.kind === 'post') return { x: end.x, y: end.y }
        if (end.kind === 'crate') {
            const c = state.placedCrates[end.index]
            return c ? { x: c.x, y: c.y } : null
        }
        const h = state.honses[end.index]
        if (!h) return null
        return getHonseNeckAnchor(h)
    }

    // True only when there's a rope with the player on one end AND the other
    // end anchored to something non-player. Drives the player leash.
    isAttached(): boolean {
        const r = this.findPlayerRope()
        if (!r || !r.endB) return false
        if (r.endA.kind === 'player') return r.endB.kind !== 'player'
        // endA is non-player, so the player is endB — the rope is attached
        // iff endA is anchored (which it is, since we narrowed it above).
        return true
    }

    // If the player's rope's OTHER end is on a honse, return her index.
    getAttachedHonseIndex(): number | null {
        const r = this.findPlayerRope()
        if (!r || !r.endB) return null
        const other = r.endA.kind === 'player' ? r.endB : r.endA
        return other.kind === 'honse' ? other.index : null
    }

    // For the given honse index, return the world position of the OTHER end of
    // any rope she's tied to (post, player, or another honse). Returns null if
    // she isn't on any fully-attached rope. If multiple ropes are tied to her,
    // returns the first one's other end.
    getHonseTetherAnchor(honseIndex: number): { x: number; y: number } | null {
        for (const r of this.ropes) {
            if (!r.endB) continue   // in-flight ropes don't tether yet
            let other: RopeEnd | null = null
            if (r.endA.kind === 'honse' && r.endA.index === honseIndex) other = r.endB
            else if (r.endB.kind === 'honse' && r.endB.index === honseIndex) other = r.endA
            if (!other) continue
            const pos = this.endPos(other)
            if (pos) return pos
        }
        return null
    }


    // World point the player leash pulls toward — the player-rope's OTHER end.
    getLeashAnchor(): { x: number; y: number } | null {
        const r = this.findPlayerRope()
        if (!r || !r.endB) return null
        const other = r.endA.kind === 'player' ? r.endB : r.endA
        if (other.kind === 'player') return null
        return this.endPos(other)
    }

    // Throw rope toward (toX, toY).
    // Cases:
    //   1. No player-rope exists → spawn a fresh rope from the player.
    //   2. Player-rope is in flight (no endB yet) → refuse.
    //   3. Player-rope is anchored on the other end → the player lets go: the
    //      same chain now has endA = the previous anchor, and the freed end
    //      gets launch velocity toward the click (it becomes the new tip).
    // Returns true if a throw was started.
    throw(toX: number, toY: number): boolean {
        const existing = this.findPlayerRope()
        if (existing) {
            if (!existing.endB) return false   // still in flight
            return this.transitionThrow(existing, toX, toY)
        }
        return this.spawnFreshRope(toX, toY)
    }

    // Untie a rope by clicking on it. Find a fully-attached rope whose nearest
    // segment is within ROPE_CLICK_TOLERANCE of the click. The whole rope
    // bursts into particles — each segment becomes a small brown puff that
    // scatters outward, then disappears. The rope is removed immediately.
    // Returns true if a rope was untied.
    // Non-destructive: is there a tied rope within untie range of this point?
    // Mirrors untieAtClick's search exactly so the cursor (which calls this)
    // can never disagree with whether a click would actually untie.
    isNearTiedRope(x: number, y: number): boolean {
        const tolSq = ROPE_CLICK_TOLERANCE * ROPE_CLICK_TOLERANCE
        for (const rope of this.ropes) {
            if (rope.endB === null) continue   // can't untie an in-flight rope
            // Mirror untieAtClick: skip the 3 segments at each end so the
            // dissolve cursor only shows where a click would actually untie
            // (the rope's body), not over the tied object itself.
            for (let i = 3; i < rope.bodies.length - 3; i++) {
                const b = rope.bodies[i]
                const dx = b.position.x - x
                const dy = b.position.y - y
                if (dx * dx + dy * dy <= tolSq) return true
            }
        }
        return false
    }

    untieAtClick(clickX: number, clickY: number): boolean {
        const tolSq = ROPE_CLICK_TOLERANCE * ROPE_CLICK_TOLERANCE
        let best: { rope: Rope; distSq: number } | null = null
        for (const rope of this.ropes) {
            if (rope.endB === null) continue   // can't untie an in-flight rope
            // Skip the 3 segments at each end: they sit on/near the objects the
            // rope is tied to (crate / post / honse), so clicking those objects
            // to use them would otherwise dissolve the rope. Only the rope's
            // body (interior segments) dissolves on click.
            for (let i = 3; i < rope.bodies.length - 3; i++) {
                const b = rope.bodies[i]
                const dx = b.position.x - clickX
                const dy = b.position.y - clickY
                const d2 = dx * dx + dy * dy
                if (d2 <= tolSq && (best === null || d2 < best.distSq)) {
                    best = { rope, distSq: d2 }
                }
            }
        }
        if (!best) return false

        // Untying dissolves the rope — that's a consume.
        if (this.onRopeConsumed) this.onRopeConsumed()

        // burst each rope segment into a particle at its current position
        for (const b of best.rope.bodies) {
            this.spawnParticle(b.position.x, b.position.y)
        }
        this.removeRope(best.rope)
        return true
    }

    // One particle = a small brown rectangle that drifts outward and fades.
    private spawnParticle(x: number, y: number) {
        const size = 2
        const rect = this.scene.add.rectangle(x, y, size, size, ROPE_COLOR).setDepth(10000)
        const angle = Math.random() * Math.PI * 2
        const speed = 10 + Math.random() * 15
        const dx = Math.cos(angle) * speed
        const dy = Math.sin(angle) * speed
        const life = 400 + Math.random() * 150
        this.scene.tweens.add({
            targets: rect,
            x: x + dx,
            y: y + dy,
            alpha: 0,
            duration: life,
            ease: 'Cubic.easeOut',
            onComplete: () => rect.destroy(),
        })
    }


    private spawnFreshRope(toX: number, toY: number): boolean {
        let dx = toX - this.player.x
        let dy = toY - this.player.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 1) return false
        dx /= len
        dy /= len

        const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics
        const bodies: MatterJS.BodyType[] = []
        for (let i = 0; i < ROPE_SEGMENTS; i++) {
            const body = matter.add.circle(this.player.x, this.player.y, ROPE_SEGMENT_COLLISION_RADIUS, {
                frictionAir: 0.02,
                density: 0.001,
                label: 'rope-flight',
            })
            bodies.push(body)
        }
        const constraints: MatterJS.ConstraintType[] = []
        for (let i = 0; i < bodies.length - 1; i++) {
            const c = matter.add.constraint(bodies[i] as any, bodies[i + 1] as any, ROPE_SEGMENT_SPACING, 0.9)
            constraints.push(c as any)
        }
        const tip = bodies[bodies.length - 1]
        const throwSpeed = ROPE_THROW_SPEED * (state.mounted !== null ? ROPE_THROW_MOUNTED_MULT : 1)
        matter.body.setVelocity(tip, {
            x: dx * throwSpeed + this.playerVX,
            y: dy * throwSpeed + this.playerVY,
        })

        const rope: Rope = {
            bodies,
            constraints,
            graphics: this.scene.add.graphics().setDepth(10000),
            endA: { kind: 'player' },
            endB: null,
            cleanupTimer: this.scene.time.delayedCall(ROPE_LIFETIME_MS, () => {
                if (this.onRopeConsumed) this.onRopeConsumed()
                this.removeRope(rope)
            }),
            crateConstraint: null,
            crateConstraintA: null,
        }
        this.ropes.push(rope)
        return true
    }

    // Player lets go of their end of an existing rope. The freed end gets
    // launched toward (toX, toY) and the chain's segment order is flipped so
    // the launched end is the tip and the anchored end is segment 0.
    private transitionThrow(rope: Rope, toX: number, toY: number): boolean {
        const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics
        // figure out which end is the player. The OTHER end is what the rope
        // is staying anchored to.
        const playerIsEndA = rope.endA.kind === 'player'
        const anchorEnd = playerIsEndA ? rope.endB! : rope.endA
        const anchorPos = this.endPos(anchorEnd)
        if (!anchorPos) return false

        // direction from the anchor (where the player just let go) toward the click
        let dx = toX - anchorPos.x
        let dy = toY - anchorPos.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 1) return false
        dx /= len
        dy /= len

        // ensure bodies are ordered [anchor end at index 0 ... tip at last]
        // segment 0 was always the player end; if the player is endA, that's
        // the freed end and must become the new tip, so reverse the array.
        if (playerIsEndA) rope.bodies.reverse()

        // anchor the rope to the previous "other end". endB is now null again
        // (in flight). Air friction goes back to flight values so the throw arcs.
        rope.endA = anchorEnd
        rope.endB = null
        // If the old endB crate constraint exists, clean it up — that end is
        // now endA or gone. Same for any prior endA crate constraint.
        if (rope.crateConstraint) {
            matter.world.removeConstraint(rope.crateConstraint as any)
            rope.crateConstraint = null
        }
        if (rope.crateConstraintA) {
            matter.world.removeConstraint(rope.crateConstraintA as any)
            rope.crateConstraintA = null
        }
        // If the new endA is a crate, link segment 0 to it with a soft
        // constraint instead of teleport-pinning (same approach as endB crates).
        if (anchorEnd.kind === 'crate') {
            const crateBody = (this.scene as any).getCrateBody?.(anchorEnd.index)
            if (crateBody) {
                rope.crateConstraintA = matter.add.constraint(
                    rope.bodies[0] as any, crateBody as any, 8, 0.2
                ) as any
            }
        }
        for (const b of rope.bodies) (b as any).frictionAir = 0.02

        // launch the new tip
        const tip = rope.bodies[rope.bodies.length - 1]
        const throwSpeed = ROPE_TRANSITION_THROW_SPEED
        matter.body.setVelocity(tip, {
            x: dx * throwSpeed + this.playerVX,
            y: dy * throwSpeed + this.playerVY,
        })

        // restart the in-flight lifetime timer
        if (rope.cleanupTimer) { rope.cleanupTimer.remove(false); rope.cleanupTimer = null }
        rope.cleanupTimer = this.scene.time.delayedCall(ROPE_LIFETIME_MS, () => {
            if (this.onRopeConsumed) this.onRopeConsumed()
            this.removeRope(rope)
        })
        return true
    }

    // Per-frame: pin each rope's endpoints, run catch detection on any rope
    // with endB === null, redraw all lines.
    update() {
        // measure the player's velocity from position delta (when mounted this is
        // the honse's velocity, since the player locks to the saddle). A thrown
        // rope inherits it so it leads ahead while moving.
        if (this.hasLastPlayerPos) {
            this.playerVX = this.player.x - this.lastPlayerX
            this.playerVY = this.player.y - this.lastPlayerY
        }
        this.lastPlayerX = this.player.x
        this.lastPlayerY = this.player.y
        this.hasLastPlayerPos = true

        const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics
        for (const rope of this.ropes) {
            // Tag segments by anchor state every frame (single source of truth):
            // only a fully-strung rope (both ends anchored) should act as an
            // obstacle for honses. In-flight ropes (endB === null) get an inert
            // label so the honse collision listener ignores them — she only
            // collides with rope strung between two points.
            // A rope is an obstacle to honses ONLY when BOTH ends are fixed world
            // anchors. The only fixed end kind is 'post' (placed posts AND trees,
            // which are caught as posts). Player = held, crate = draggable, honse
            // = walks/may be your mount — none of those are fixed, so a rope with
            // any such end never collides with a honse. No other scenario blocks her.
            const isFixedEnd = (e: RopeEnd | null): boolean => e !== null && e.kind === 'post'
            const strung = isFixedEnd(rope.endA) && isFixedEnd(rope.endB)
            const segLabel = strung ? 'rope-segment' : 'rope-flight'
            // Segments stay solid (so they bounce off rocks/buildings = CAT_WORLD).
            // The honse bit is in their collision mask ONLY when strung, so a
            // held/in-flight rope passes the honse but a post-to-post rope blocks
            // her. No isSensor — that made the rope pass through everything.
            const mask = strung ? (CAT_WORLD | CAT_HONSE) : CAT_WORLD
            for (const b of rope.bodies) {
                b.label = segLabel
                b.collisionFilter.mask = mask
            }
            // When strung between two posts, stiffen the inter-segment constraints
            // so the chain resists bending into a U around the honse and holds its
            // line as a barrier. Back to the throw-tuned springiness when not strung.
            const stiffness = strung ? 1 : 0.9
            for (const c of rope.constraints) (c as any).stiffness = stiffness
            // Also make the segments heavy when strung so a horse-mass body can't
            // just shove the near-weightless chain aside and wrap it into a U.
            // Light again when not strung so the throw arcs as before. setDensity
            // recalculates mass; only re-set when the value actually changes.
            const wantDensity = strung ? 0.7 : 0.001
            for (const b of rope.bodies) {
                if ((b as any).density !== wantDensity) matter.body.setDensity(b, wantDensity)
                // High restitution when strung so contact pings the honse back
                // instead of letting her grind into the chain.
                ;(b as any).restitution = strung ? 0.9 : 0
            }
            // When strung, stamp the rope's two endpoint positions onto each
            // segment so the honse collision listener can read the rope's LINE
            // direction (post→post), not just the contacted segment point. The
            // mounted branch blends segment-based and line-based cancel for a
            // rope that both deforms locally and holds as a barrier.
            if (strung) {
                const la = this.endPos(rope.endA)
                const lb = this.endPos(rope.endB!)
                if (la && lb) {
                    for (const b of rope.bodies) {
                        ;(b as any).ropeLineAx = la.x; (b as any).ropeLineAy = la.y
                        ;(b as any).ropeLineBx = lb.x; (b as any).ropeLineBy = lb.y
                    }
                }
            }
            // pin segment 0 to endA (skip crates — they're dynamic bodies;
            // teleporting them fights the solver. Use a constraint instead.)
            const aPos = this.endPos(rope.endA)
            if (aPos && rope.endA!.kind !== 'crate') {
                matter.body.setPosition(rope.bodies[0], aPos, false)
                matter.body.setVelocity(rope.bodies[0], { x: 0, y: 0 })
            }

            // catch detection while in flight (endB === null)
            const tip = rope.bodies[rope.bodies.length - 1]
            if (rope.endB === null) {
                const newEnd = this.detectCatch(tip.position.x, tip.position.y, rope.endA)
                if (newEnd) {
                    rope.endB = newEnd
                    if (rope.cleanupTimer) { rope.cleanupTimer.remove(false); rope.cleanupTimer = null }
                    for (const b of rope.bodies) (b as any).frictionAir = ROPE_ATTACHED_FRICTION_AIR
                    // Crate caught: link the tip to the crate's body so the
                    // solver tows it. The tip is no longer teleport-pinned (see
                    // below) — the constraint is the sole owner of the tip now.
                    if (newEnd.kind === 'crate') {
                        const crateBody = (this.scene as any).getCrateBody?.(newEnd.index)
                        if (crateBody) {
                            // Soft, slightly-springy link: low stiffness so the
                            // tug-of-war between the rope chain and the crate
                            // body is absorbed instead of snapping (no jitter).
                            rope.crateConstraint = matter.add.constraint(
                                tip as any, crateBody as any, 8, 0.2
                            ) as any
                        }
                    }
                }
            }

            // pin tip to endB if attached — but NOT for crate ends. A crate is
            // towed by its constraint; teleport-pinning the tip would override
            // the solver each frame and the two would fight (jitter).
            if (rope.endB !== null && rope.endB.kind !== 'crate') {
                const bPos = this.endPos(rope.endB)
                if (bPos) {
                    matter.body.setPosition(tip, bPos, false)
                    matter.body.setVelocity(tip, { x: 0, y: 0 })
                }
            }

            // redraw the line
            const g = rope.graphics
            g.clear()
            g.lineStyle(ROPE_THICKNESS, ROPE_COLOR, 1)
            g.beginPath()
            const first = rope.bodies[0]
            g.moveTo(first.position.x, first.position.y)
            for (let i = 1; i < rope.bodies.length; i++) {
                const b = rope.bodies[i]
                g.lineTo(b.position.x, b.position.y)
            }
            g.strokePath()
        }
    }

    // Return a non-player anchor near (x, y), or null. Excludes self-anchor —
    // a rope thrown from a post can't catch on the same post.
    private detectCatch(x: number, y: number, fromEnd: RopeEnd): RopeEnd | null {
        const postR2 = ROPE_CATCH_RADIUS * ROPE_CATCH_RADIUS
        for (const p of state.placedPosts) {
            if (fromEnd.kind === 'post' && fromEnd.x === p.x && fromEnd.y === p.y) continue
            const dx = x - p.x
            const dy = y - p.y
            if (dx * dx + dy * dy <= postR2) return { kind: 'post', x: p.x, y: p.y }
        }
        // Crates use their own end kind so the rope reads the crate's live
        // position each frame (it moves when dragged). Index-addressed.
        for (let i = 0; i < state.placedCrates.length; i++) {
            const c = state.placedCrates[i]
            if (fromEnd.kind === 'crate' && fromEnd.index === i) continue
            const dx = x - c.x
            const dy = y - c.y
            if (dx * dx + dy * dy <= postR2) return { kind: 'crate', index: i }
        }
        // Trees catch the same way posts do — anchor is 8px below the tree's
        // visual center, around the lower trunk where a rope would actually wrap.
        for (const t of state.plantedTrees) {
            if (t.stage === 'sapling') continue   // saplings are too small to catch rope
            const ax = t.x
            const ay = t.y + 11
            if (fromEnd.kind === 'post' && fromEnd.x === ax && fromEnd.y === ay) continue
            const dx = x - ax
            const dy = y - ay
            if (dx * dx + dy * dy <= postR2) return { kind: 'post', x: ax, y: ay }
        }
        const honseR2 = ROPE_CATCH_RADIUS_HONSE * ROPE_CATCH_RADIUS_HONSE
        for (let i = 0; i < state.honses.length; i++) {
            if (fromEnd.kind === 'honse' && fromEnd.index === i) continue
            // can't catch the honse you're riding — the rope spawns on top of her
            if (state.mounted === i) continue
            const neck = getHonseNeckAnchor(state.honses[i])
            const dx = x - neck.x
            const dy = y - neck.y
            if (dx * dx + dy * dy <= honseR2) return { kind: 'honse', index: i }
        }
        return null
    }

    private removeRope(rope: Rope) {
        const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics
        if (rope.crateConstraint) { matter.world.remove(rope.crateConstraint); rope.crateConstraint = null }
        if (rope.crateConstraintA) { matter.world.remove(rope.crateConstraintA); rope.crateConstraintA = null }
        for (const b of rope.bodies) matter.world.remove(b)
        rope.graphics.destroy()
        if (rope.cleanupTimer) { rope.cleanupTimer.remove(false); rope.cleanupTimer = null }
        const idx = this.ropes.indexOf(rope)
        if (idx >= 0) this.ropes.splice(idx, 1)
    }

    // Tear down every rope. Used for full reset (e.g. scene shutdown).
    clearAll() {
        const ropes = [...this.ropes]
        for (const r of ropes) this.removeRope(r)
    }
}
