// RopeController — owns the rope-throw physics, catch detection, and the
// leash-anchor lookup that the scene uses for player-movement clamping.
//
// Lifecycle:
//   - Construct once in the scene's create(), passing scene + player sprite.
//   - Call update() every frame from the scene's update(). This pins segment 0
//     to the player, runs catch detection, pins the tip to its anchor if
//     attached, and redraws the line.
//   - Call throw(toX, toY) on a click while rope is selected.
//   - Read getLeashAnchor() for the player-movement leash clamp.
//
// The controller reads state.placedPosts and state.honses directly (live
// arrays) so newly placed posts and new honses are immediately catchable
// without any registration step.

import Phaser from 'phaser'
import { state } from '../game/state'
import { getHonseNeckAnchor } from './honse'

// ---- tuning constants ----
// Tip count, segment geometry, throw velocity, lifetime, render style, and
// catch radii. Adjust the feel here.
const ROPE_SEGMENTS = 20
const ROPE_SEGMENT_RADIUS = 3
const ROPE_SEGMENT_SPACING = 6        // distance between adjacent segment centers
const ROPE_THROW_SPEED = 50           // velocity magnitude given to the tip
const ROPE_LIFETIME_MS = 2000         // auto-cleanup if the rope never catches
const ROPE_COLOR = 0x8B5A2B           // wood-brown for the wormy line
const ROPE_THICKNESS = 3
const ROPE_CATCH_RADIUS = 16          // how close the tip must get to a post to catch
const ROPE_CATCH_RADIUS_HONSE = 28    // honse is much bigger, more forgiving
const ROPE_ATTACHED_FRICTION_AIR = 0.1   // after catch, crank air friction to settle the wiggle

// Internal attachment state. 'post' stores the coords directly; 'honse'
// stores an index into state.honses so the anchor follows live position.
type Attachment =
    | { kind: 'post'; x: number; y: number }
    | { kind: 'honse'; index: number }

export class RopeController {
    private scene: Phaser.Scene
    private player: Phaser.GameObjects.Sprite
    private bodies: MatterJS.BodyType[] | null = null
    private graphics: Phaser.GameObjects.Graphics | null = null
    private attached: Attachment | null = null
    private cleanupTimer: Phaser.Time.TimerEvent | null = null

    constructor(scene: Phaser.Scene, player: Phaser.GameObjects.Sprite) {
        this.scene = scene
        this.player = player
    }

    // True while a rope chain exists in the world (in flight or attached).
    isActive(): boolean {
        return this.bodies !== null
    }

    // True only when the rope is caught on something.
    isAttached(): boolean {
        return this.attached !== null
    }

    // If the rope is caught on a honse, returns her index in state.honses.
    // Returns null otherwise (free, or attached to a post).
    getAttachedHonseIndex(): number | null {
        if (this.attached?.kind === 'honse') return this.attached.index
        return null
    }


    // World-space anchor for the leash. Returns null when not attached or when
    // the honse the rope was caught on is gone.
    getLeashAnchor(): { x: number; y: number } | null {
        if (!this.attached) return null
        if (this.attached.kind === 'post') {
            return { x: this.attached.x, y: this.attached.y }
        }
        const h = state.honses[this.attached.index]
        if (!h) return null
        return getHonseNeckAnchor(h)
    }

    // Launch a rope from the player toward (toX, toY). If a previous rope is
    // attached, this throw replaces it; if one is still in flight (unattached),
    // the new throw is refused. Returns true if a throw was started.
    throw(toX: number, toY: number): boolean {
        if (this.bodies !== null) {
            if (this.attached === null) return false
            this.clear()
        }

        // direction from player to click
        let dx = toX - this.player.x
        let dy = toY - this.player.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 1) return false
        dx /= len
        dy /= len

        // build the chain: every segment starts stacked at the player's position.
        // Stretchy constraints let the launched tip drag the chain out behind it.
        const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics
        const bodies: MatterJS.BodyType[] = []
        for (let i = 0; i < ROPE_SEGMENTS; i++) {
            const body = matter.add.circle(this.player.x, this.player.y, ROPE_SEGMENT_RADIUS, {
                frictionAir: 0.02,
                density: 0.001,
            })
            bodies.push(body)
        }
        // connect adjacent segments with short constraints
        for (let i = 0; i < bodies.length - 1; i++) {
            matter.add.constraint(bodies[i] as any, bodies[i + 1] as any, ROPE_SEGMENT_SPACING, 0.9)
        }
        // launch the tip (last body) outward
        const tip = bodies[bodies.length - 1]
        matter.body.setVelocity(tip, { x: dx * ROPE_THROW_SPEED, y: dy * ROPE_THROW_SPEED })

        this.bodies = bodies
        this.graphics = this.scene.add.graphics().setDepth(10000)
        this.cleanupTimer = this.scene.time.delayedCall(ROPE_LIFETIME_MS, () => this.clear())
        return true
    }

    // Per-frame work: pin segment 0 to the player, run catch detection while
    // the tip is free, pin the tip to its anchor when attached, redraw the line.
    update() {
        if (!this.bodies || !this.graphics) return
        const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics

        // pin segment 0 to the player's position so the rope trails from their hand
        matter.body.setPosition(this.bodies[0], { x: this.player.x, y: this.player.y }, false)
        matter.body.setVelocity(this.bodies[0], { x: 0, y: 0 })

        // catch detection — only run while the tip is still free
        const tip = this.bodies[this.bodies.length - 1]
        if (this.attached === null) {
            let caught = false
            const postR2 = ROPE_CATCH_RADIUS * ROPE_CATCH_RADIUS
            for (const p of state.placedPosts) {
                const dx = tip.position.x - p.x
                const dy = tip.position.y - p.y
                if (dx * dx + dy * dy <= postR2) {
                    this.attached = { kind: 'post', x: p.x, y: p.y }
                    caught = true
                    break
                }
            }
            if (!caught) {
                const honseR2 = ROPE_CATCH_RADIUS_HONSE * ROPE_CATCH_RADIUS_HONSE
                for (let i = 0; i < state.honses.length; i++) {
                    const neck = getHonseNeckAnchor(state.honses[i])
                    const dx = tip.position.x - neck.x
                    const dy = tip.position.y - neck.y
                    if (dx * dx + dy * dy <= honseR2) {
                        this.attached = { kind: 'honse', index: i }
                        caught = true
                        break
                    }
                }
            }
            if (caught) {
                // cancel the auto-cleanup so the rope sticks around.
                if (this.cleanupTimer) { this.cleanupTimer.remove(false); this.cleanupTimer = null }
                // crank air friction so the middle segments stop wiggling
                for (const b of this.bodies) {
                    (b as any).frictionAir = ROPE_ATTACHED_FRICTION_AIR
                }
            }
        }

        // if attached, pin the tip to the current anchor position (live for honses)
        const anchor = this.getLeashAnchor()
        if (anchor !== null) {
            matter.body.setPosition(tip, { x: anchor.x, y: anchor.y }, false)
            matter.body.setVelocity(tip, { x: 0, y: 0 })
        }

        // redraw the wormy line through all segment positions
        const g = this.graphics
        g.clear()
        g.lineStyle(ROPE_THICKNESS, ROPE_COLOR, 1)
        g.beginPath()
        const first = this.bodies[0]
        g.moveTo(first.position.x, first.position.y)
        for (let i = 1; i < this.bodies.length; i++) {
            const b = this.bodies[i]
            g.lineTo(b.position.x, b.position.y)
        }
        g.strokePath()
    }

    // Tear down the active rope simulation. Safe to call when nothing is active.
    clear() {
        const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics
        if (this.bodies) {
            for (const b of this.bodies) matter.world.remove(b)
            this.bodies = null
        }
        if (this.graphics) {
            this.graphics.destroy()
            this.graphics = null
        }
        if (this.cleanupTimer) {
            this.cleanupTimer.remove(false)
            this.cleanupTimer = null
        }
        this.attached = null
    }
}