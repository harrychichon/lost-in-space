import { Scene } from 'phaser'
import { GameState } from '../systems/GameState'
import { AudioManager } from '../systems/AudioManager'
import { createPlayerSprite, updatePlayerSprite } from '../objects/Player'
import { GlobalNavBar } from '../objects/GlobalNavBar'
import { HudPanel } from '../objects/HudPanel'

export interface InteractPoint {
    x: number
    label: string
    action: () => void
}

/**
 * Abstract base class for explorable room scenes (Kitchen, Greenhouse, Engine, Comms).
 * Provides player movement, proximity-based interaction, and shared drawing methods.
 */
export abstract class RoomScene extends Scene {
    protected player!: Phaser.GameObjects.Rectangle
    protected playerSprite!: Phaser.GameObjects.Sprite
    protected cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    protected keyA!: Phaser.Input.Keyboard.Key
    protected keyD!: Phaser.Input.Keyboard.Key
    protected interactKey!: Phaser.Input.Keyboard.Key
    protected leaveKey!: Phaser.Input.Keyboard.Key
    protected prompt!: HudPanel
    protected message!: HudPanel
    protected interactPoints: InteractPoint[] = []
    protected currentPoint: InteractPoint | null = null
    protected transitioning = false
    protected floorY = 0
    /** Left edge of the walkable room area. */
    protected roomLeft = 0
    /** Right edge of the walkable room area. */
    protected roomRight = 0
    /** Width of the walkable room area. */
    protected roomWidth = 0

    /** Call at start of create() — initialises state, grayscale, and input keys. */
    protected setupRoom() {
        const { width, height } = this.scale
        this.floorY = height * 0.7
        this.interactPoints = []
        this.currentPoint = null
        this.transitioning = false

        // Room bounds — centered, 50% of canvas width
        this.roomWidth = width * 0.5
        this.roomLeft = (width - this.roomWidth) / 2
        this.roomRight = this.roomLeft + this.roomWidth

        GameState.applyGrayscale(this)

        AudioManager.update(this, {
            warmth: GameState.getSaturation(this),
            location: 'room',
        })

        // Input
        this.cursors = this.input.keyboard!.createCursorKeys()
        this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
        this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)
        this.leaveKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L)
    }

    /** Convert a 0–1 fraction to an x position within the room bounds. */
    protected rx(fraction: number): number {
        return this.roomLeft + fraction * this.roomWidth
    }

    /** Call after room graphics — creates player, side walls, and UI text on top. */
    protected setupPlayerAndUI() {
        const { width, height } = this.scale

        // Constrain player to room bounds
        this.physics.world.setBounds(this.roomLeft, 0, this.roomWidth, height)

        // Player (invisible hitbox — visual is a sprite positioned on top)
        this.player = this.add.rectangle(this.roomLeft + 60, this.floorY - 25, 20, 50, 0xaaaaaa, 0)
        this.physics.add.existing(this.player)
        ;(this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true)
        this.playerSprite = createPlayerSprite(this, this.player.x, this.floorY).setDepth(10)

        // Side walls — hull panels that mask content outside the room
        const walls = this.add.graphics().setDepth(15)
        // Left hull
        walls.fillStyle(0x000000, 1)
        walls.fillRect(0, 0, this.roomLeft, height)
        // Right hull
        walls.fillStyle(0x000000, 1)
        walls.fillRect(this.roomRight, 0, width - this.roomRight, height)
        // Wall edge trim
        walls.fillStyle(0x000000, 1)
        walls.fillRect(this.roomLeft - 3, height * 0.15, 3, height * 0.85)
        walls.fillRect(this.roomRight, height * 0.15, 3, height * 0.85)

        // Prompt panel — shown when near an interact point
        this.prompt = new HudPanel(this, width * 0.5, height * 0.9, {
            variant: 'prompt',
            anchor: 'center',
        })
        this.add.existing(this.prompt)
        this.prompt.setDepth(20).setAlpha(0)

        // Message panel — shown after interacting (description-only narrative)
        this.message = new HudPanel(this, width * 0.5, height * 0.78, {
            variant: 'prompt',
            anchor: 'center',
        })
        this.add.existing(this.message)
        this.message.setDepth(20).setAlpha(0)

        // Leave hint — small indicator-style panel bottom-left, sits above the global nav bar
        const escHint = new HudPanel(this, 20, height - 24 - 52, {
            variant: 'indicator',
            anchor: 'left',
        })
        this.add.existing(escHint)
        escHint.setLabel('[L] Leave')
        escHint.setDepth(20).setAlpha(0.6)

        // Global navigation bar — pinned to bottom of screen
        this.add.existing(new GlobalNavBar(this))
    }

    /** Draw an exit door and register its interact point. */
    protected addExitDoor(_gfx: Phaser.GameObjects.Graphics, x: number) {
        // Metal door sprite (frame 13: col 3, row 2) at 2× scale = 48×64
        const door = this.add.image(x, this.floorY, 'doors', 13)
        door.setOrigin(0.5, 1)
        door.setScale(2)

        this.interactPoints.push({
            x,
            label: 'Leave',
            action: () => {
                if (this.transitioning) return
                this.transitioning = true
                this.scene.start('Ship', { fromRoom: this.scene.key })
            },
        })
    }

    /** Show a narrative message that fades in, holds, then fades out. */
    protected showMessage(text: string, _color?: string) {
        // _color kept for back-compat with old callers; HudPanel uses one consistent colour scheme.
        this.message.setContent(undefined, text)
        this.message.setAlpha(0)
        this.tweens.killTweensOf(this.message)
        this.tweens.add({
            targets: this.message,
            alpha: 1,
            duration: 500,
            hold: 2500,
            yoyo: true,
            ease: 'Power2',
        })
    }

    /** Call from update() — handles movement, proximity detection, and input. */
    protected updateRoom() {
        if (this.transitioning) return

        const body = this.player.body as Phaser.Physics.Arcade.Body

        // Movement
        if (this.cursors.left.isDown || this.keyA.isDown) {
            body.setVelocityX(-200)
        } else if (this.cursors.right.isDown || this.keyD.isDown) {
            body.setVelocityX(200)
        } else {
            body.setVelocityX(0)
        }

        updatePlayerSprite(this.playerSprite, this.player.x, this.floorY, body.velocity.x)

        // Find nearest interact point in range
        this.currentPoint = null
        for (const point of this.interactPoints) {
            if (Math.abs(this.player.x - point.x) < 40) {
                this.currentPoint = point
                break
            }
        }

        // Show/hide prompt
        if (this.currentPoint) {
            this.prompt.setContent(`[E] ${this.currentPoint.label}`)
            this.prompt.setAlpha(1)
        } else {
            this.prompt.setAlpha(0)
        }

        // Handle E key
        if (this.currentPoint && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.currentPoint.action()
        }

        // L to leave
        if (Phaser.Input.Keyboard.JustDown(this.leaveKey)) {
            if (!this.transitioning) {
                this.transitioning = true
                this.scene.start('Ship', { fromRoom: this.scene.key })
            }
        }
    }

    // --- Shared drawing methods (same visuals as Ship/Planet) ---

    protected drawCavediver(_gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
        const img = this.add.image(x, y, 'cavediver', 'frame0').setOrigin(0.5, 0.5)
        img.displayHeight = 80
        img.scaleX = img.scaleY
    }

    protected drawCompanionHuman(_gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
        const img = this.add.image(x, y, 'botanist', 'frame4').setOrigin(0.5, 0.5)
        img.displayHeight = 80
        img.scaleX = img.scaleY
    }
}
