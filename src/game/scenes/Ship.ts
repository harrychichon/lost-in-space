import { Scene } from 'phaser'
import { GameState, Chores } from '../systems/GameState'
import { AudioManager } from '../systems/AudioManager'
import { createPlayerSprite, updatePlayerSprite } from '../objects/Player'
import { createDogSprite } from '../objects/Dog'
import { drawDayIndicator } from '../objects/DayIndicator'
import { drawResourceBars } from '../objects/ResourceBars'
import { drawChoreChecklist } from '../objects/ChoreChecklist'
import { GlobalNavBar } from '../objects/GlobalNavBar'
import { HudPanel } from '../objects/HudPanel'

interface Door {
    x: number
    label: Phaser.GameObjects.Text
    icon: Phaser.GameObjects.GameObject
    name: string
    choreKey: keyof Chores | null
    sceneName: string | null
    action: () => void
}

export class Ship extends Scene {
    private player!: Phaser.GameObjects.Rectangle
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private keyA!: Phaser.Input.Keyboard.Key
    private keyD!: Phaser.Input.Keyboard.Key
    private interactKey!: Phaser.Input.Keyboard.Key
    private doors: Door[] = []
    private currentDoor: Door | null = null
    private prompt!: HudPanel
    private dogPrompt!: HudPanel
    private playerSprite!: Phaser.GameObjects.Sprite
    private dogSprite: Phaser.GameObjects.Sprite | null = null
    private dogX = 0
    private playerSpeed = 200
    private dayComplete = false

    constructor() {
        super('Ship')
    }

    create(data?: { fromRoom?: string }) {
        const { width, height } = this.scale
        this.dayComplete = false
        this.doors = []
        this.currentDoor = null

        // Spawn position — default to corridor center, or outside the door we just left.
        const spawnDoorX: Record<string, number> = {
            Kitchen: 0.18,
            Greenhouse: 0.35,
            Engine: 0.5,
            Comms: 0.62,
            Collection: 0.74,
            Navigation: 0.84,
        }
        const spawnX =
            data?.fromRoom && spawnDoorX[data.fromRoom] !== undefined
                ? width * spawnDoorX[data.fromRoom]
                : width * 0.5

        this.cameras.main.setBackgroundColor(0x111111)

        this.add
            .image(width * 0.5, height * 0.5 + 13, 'bg_main')
            .setDisplaySize(width, height)
            .setDepth(-100)

        GameState.applyGrayscale(this)

        AudioManager.update(this, {
            warmth: GameState.getSaturation(this),
            location: 'ship',
        })

        // --- Draw the ship corridor ---
        const interior = this.add.graphics()

        // Floor
        interior.fillStyle(0x333333, 0)
        interior.fillRect(0, height * 0.7, width, height * 0.3)

        // Floor detail — grating lines
        interior.lineStyle(1, 0x3a3a3a, 0)
        for (let lx = 0; lx < width; lx += 40) {
            interior.lineBetween(lx, height * 0.7, lx, height)
        }

        // Back wall
        interior.fillStyle(0x222222, 0)
        interior.fillRect(0, height * 0.25, width, height * 0.45)

        // Ceiling
        interior.fillStyle(0x1a1a1a, 0)
        interior.fillRect(0, height * 0.2, width, height * 0.05)

        // Ceiling lights — soft pulsing strips
        for (let i = 0; i < 5; i++) {
            const lx = width * 0.1 + i * (width * 0.2)
            const light = this.add.rectangle(lx, height * 0.2 + 2, 30, 5, 0xbbbbaa, 0.35)
            this.tweens.add({
                targets: light,
                alpha: 0.15,
                duration: Phaser.Math.Between(1800, 2600),
                yoyo: true,
                repeat: -1,
                delay: i * 300,
                ease: 'Sine.easeInOut',
            })
            // Subtle glow halo below each light
            // const halo = this.add.circle(lx, height * 0.22, 22, 0xffeecc, 0.08);
            // this.tweens.add({
            //     targets: halo,
            //     alpha: 0.03,
            //     duration: Phaser.Math.Between(1800, 2600),
            //     yoyo: true,
            //     repeat: -1,
            //     delay: i * 300,
            //     ease: 'Sine.easeInOut',
            // });
        }

        // --- Doors ---
        const floorY = height * 0.7
        const doorH = 70
        const doorW = 45
        const doorY = floorY - doorH
        const state = GameState.get(this)

        // Kitchen door (interaction only; visuals hidden to match painted door in bg)
        this.createDoor(
            width * 0.18,
            doorY,
            doorW,
            doorH,
            'Kitchen',
            0x886644,
            'kitchen',
            'Kitchen',
            {
                hideVisual: true,
                hideLabel: true,
            }
        )
        // Greenhouse door — opens in-place modal instead of a room scene
        this.createDoor(
            width * 0.34,
            doorY,
            doorW,
            doorH,
            'Greenhouse',
            0x447744,
            'greenhouse',
            'Greenhouse',
            {
                hideVisual: true,
                hideLabel: true,
                customAction: () => {
                    if (GameState.get(this).chores.greenhouse) {
                        this.showMessage('The plants are already tended for today.')
                        return
                    }
                    this.scene.launch('GreenhouseModal')
                    this.scene.pause('Ship')
                },
            }
        )
        // Engine door
        this.createDoor(width * 0.46, doorY, doorW, doorH, 'Engine', 0x668888, 'engine', 'Engine', {
            hideVisual: true,
            hideLabel: true,
        })
        // Comms door
        this.createDoor(width * 0.6, doorY, doorW, doorH, 'Comms', 0x555566, 'comms', 'Comms', {
            hideVisual: true,
            hideLabel: true,
        })

        // Collection room — always visible, only usable after botanist joins
        this.createCollectionDoor(width * 0.72, floorY, { hideVisual: true, hideLabel: true })

        // Navigation console (not a chore)
        this.createNavConsole(width * 0.815, floorY, { hideVisual: true, hideLabel: true })

        // Bed (not a door — direct interaction)
        this.createBed(width * 0.9, floorY, { hideVisual: true, hideLabel: true })

        // --- Player ---
        this.player = this.add.rectangle(spawnX, floorY - 25, 20, 50, 0xaaaaaa, 0) // invisible hitbox
        this.physics.add.existing(this.player)
        const body = this.player.body as Phaser.Physics.Arcade.Body
        body.setCollideWorldBounds(true)
        this.playerSprite = createPlayerSprite(this, this.player.x, floorY)
        this.playerSprite.setDepth(1)

        // --- Dog companion ---
        this.dogSprite = null
        if (GameState.hasCompanion(this, 'dog')) {
            this.dogX = width * 0.35
            const dogY = floorY - 10
            this.dogSprite = createDogSprite(this, this.dogX, floorY)

            // Draw collected toys near the dog
            const collectedToys = GameState.get(this).collectedDogToys
            this.drawDogToys(this.dogX, dogY, collectedToys)

            // Toy counter
            if (collectedToys.length > 0) {
                this.add
                    .text(this.dogX, floorY - 55, `Toys: ${collectedToys.length}/4`, {
                        fontFamily: 'Georgia, serif',
                        fontSize: '10px',
                        color: '#666655',
                    })
                    .setOrigin(0.5)
            }

            // Dog prompt (separate from door prompt)
            let dogMsg: string
            if (GameState.isRescueEventReady(this)) {
                dogMsg =
                    'The dog is staring at the comms room, ears pricked.\nIt lets out a low, uncertain bark.'
            } else if (collectedToys.length === 0) {
                dogMsg =
                    'The dog wags its tail as you pass by, but looks understimulated.\nMaybe there was something on that first planet...'
            } else if (collectedToys.length === 1) {
                dogMsg = 'The dog has a toy to play with, but still looks around for more.'
            } else if (collectedToys.length === 2) {
                dogMsg = 'The dog is getting quite the collection. It seems happier.'
            } else if (collectedToys.length === 3) {
                dogMsg = 'The dog bounces between its toys, full of energy.'
            } else {
                dogMsg = 'The dog is surrounded by its treasures. Pure contentment.'
            }
            this.dogPrompt = new HudPanel(this, width * 0.5, height * 0.55, {
                variant: 'prompt',
                anchor: 'center',
            })
            this.add.existing(this.dogPrompt)
            this.dogPrompt.setContent(undefined, dogMsg)
            this.dogPrompt.setAlpha(0)
        }

        // --- Human companion ---
        if (GameState.hasCompanion(this, 'human')) {
            const humanGfx = this.add.graphics()
            const hx = width * 0.72
            const hy = floorY - 25
            this.drawCompanionHuman(humanGfx, hx, hy)
        }

        // --- Cavediver companion ---
        if (GameState.hasCompanion(this, 'cavediver')) {
            const cavediverGfx = this.add.graphics()
            const cx = width * 0.56
            const cy = floorY - 25
            this.drawCavediver(cavediverGfx, cx, cy)
        }

        // --- Cave trophies brought back to the corridor ---
        const collectedCave = state.collectedCaveItems
        const trophyGfx = this.add.graphics()
        if (collectedCave.includes('old_photograph')) {
            this.drawOldPhotograph(trophyGfx, width * 0.2, height * 0.42)
        }
        if (collectedCave.includes('music_box')) {
            this.drawMusicBox(trophyGfx, width * 0.42, height * 0.47)
        }
        if (collectedCave.includes('lantern')) {
            this.drawHangingLantern(trophyGfx, width * 0.89, height * 0.25, height * 0.42)
        }

        // --- HUD ---
        drawDayIndicator(this, state)

        // Resource bars
        drawResourceBars(this, state)

        // Chore checklist
        drawChoreChecklist(this, state)

        // Interaction prompt — sci-fi panel for door interactions
        this.prompt = new HudPanel(this, width * 0.5, height * 0.88, {
            variant: 'prompt',
            anchor: 'center',
        })
        this.add.existing(this.prompt)
        this.prompt.setAlpha(0)

        // --- Input ---
        this.cursors = this.input.keyboard!.createCursorKeys()
        this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
        this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)

        this.add.existing(new GlobalNavBar(this))
    }

    private createDoor(
        x: number,
        y: number,
        _w: number,
        h: number,
        name: string,
        _color: number,
        choreKey: keyof Chores,
        sceneName: string,
        options?: { hideVisual?: boolean; hideLabel?: boolean; customAction?: () => void }
    ) {
        const state = GameState.get(this)
        const done = state.chores[choreKey]
        const hideVisual = options?.hideVisual ?? false
        const hideLabel = options?.hideLabel ?? false

        // Metal door sprite at 2× scale (48×64), anchored at bottom
        const floorY = y + h
        const icon = this.add.image(x, floorY, 'doors', 13).setOrigin(0.5, 1).setScale(2)
        if (done) {
            icon.setTint(0x555555)
        }
        if (hideVisual) {
            icon.setVisible(false)
        }

        // Label above door
        const label = this.add
            .text(x, y - 12, name, {
                fontFamily: 'Georgia, serif',
                fontSize: '13px',
                color: done ? '#444444' : '#999999',
            })
            .setOrigin(0.5)
        if (hideLabel) {
            label.setVisible(false)
        }

        // Checkmark if done
        if (done && !hideVisual) {
            this.add
                .text(x, y + h / 2, '✓', {
                    fontFamily: 'Arial',
                    fontSize: '22px',
                    color: '#555555',
                })
                .setOrigin(0.5)
        }

        this.doors.push({
            x,
            label,
            icon,
            name,
            choreKey,
            sceneName,
            action:
                options?.customAction ??
                (() => {
                    this.scene.start(sceneName)
                }),
        })
    }

    private createCollectionDoor(
        x: number,
        floorY: number,
        options?: { hideVisual?: boolean; hideLabel?: boolean }
    ) {
        const doorH = 70
        const doorY = floorY - doorH
        const hasHuman = GameState.hasCompanion(this, 'human')

        // Metal door sprite at 2× scale
        const icon = this.add.image(x, floorY, 'doors', 13).setOrigin(0.5, 1).setScale(2)
        if (!hasHuman) {
            icon.setTint(0x444444)
        }
        if (options?.hideVisual) icon.setVisible(false)

        if (hasHuman) {
            // Small plant icon on door
            const plant = this.add.graphics()
            plant.fillStyle(0x447744, 0.6)
            plant.fillCircle(x, doorY + 20, 6)
            plant.fillCircle(x - 5, doorY + 18, 5)
            plant.fillCircle(x + 5, doorY + 18, 5)
            if (options?.hideVisual) plant.setVisible(false)

            const label = this.add
                .text(x, doorY - 12, 'Collection', {
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    color: '#999999',
                })
                .setOrigin(0.5)
            if (options?.hideLabel) label.setVisible(false)

            const collected = GameState.get(this).collectedExoticPlants
            if (collected.length > 0) {
                this.add
                    .text(x, doorY - 24, `${collected.length}/3`, {
                        fontFamily: 'Georgia, serif',
                        fontSize: '10px',
                        color: '#666655',
                    })
                    .setOrigin(0.5)
            }

            this.doors.push({
                x,
                label,
                icon,
                name: 'Collection',
                choreKey: null,
                sceneName: 'Collection',
                action: () => {
                    this.scene.start('Collection')
                },
            })
        } else {
            const label = this.add
                .text(x, doorY - 12, '???', {
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    color: '#444444',
                })
                .setOrigin(0.5)
            if (options?.hideLabel) label.setVisible(false)

            this.doors.push({
                x,
                label,
                icon,
                name: 'Empty space',
                choreKey: null,
                sceneName: null,
                action: () => {
                    this.showMessage('An empty room. No reason to go in.')
                },
            })
        }
    }

    private createNavConsole(
        x: number,
        floorY: number,
        options?: { hideVisual?: boolean; hideLabel?: boolean }
    ) {
        const state = GameState.get(this)
        const planetCount = state.planets.length
        const icon = this.add.graphics()

        // Console desk
        icon.fillStyle(0x333344, 1)
        icon.fillRect(x - 22, floorY - 45, 44, 45)

        // Screen
        icon.fillStyle(0x111122, 1)
        icon.fillRect(x - 16, floorY - 40, 32, 20)
        icon.lineStyle(1, 0x445566, 0.5)
        icon.strokeRect(x - 16, floorY - 40, 32, 20)

        // Blinking dot if planets exist
        if (planetCount > 0) {
            const dot = this.add.circle(x, floorY - 30, 2, 0x66aacc, 0.8)
            this.tweens.add({
                targets: dot,
                alpha: 0.2,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            })
            if (options?.hideVisual) dot.setVisible(false)
        }

        if (options?.hideVisual) icon.setVisible(false)

        const label = this.add
            .text(x, floorY - 53, 'Nav', {
                fontFamily: 'Georgia, serif',
                fontSize: '13px',
                color: '#999999',
            })
            .setOrigin(0.5)
        if (options?.hideLabel) label.setVisible(false)

        // Planet count indicator
        if (planetCount > 0) {
            const planetText = this.add
                .text(x, floorY - 62, `${planetCount} planet${planetCount > 1 ? 's' : ''}`, {
                    fontFamily: 'Georgia, serif',
                    fontSize: '10px',
                    color: '#666666',
                })
                .setOrigin(0.5)
            if (options?.hideVisual) planetText.setVisible(false)
        }

        this.doors.push({
            x,
            label,
            icon,
            name: 'Navigation',
            choreKey: null,
            sceneName: 'Navigation',
            action: () => {
                this.scene.start('Navigation')
            },
        })
    }

    private createBed(
        x: number,
        floorY: number,
        options?: { hideVisual?: boolean; hideLabel?: boolean }
    ) {
        const icon = this.add.graphics()

        // Bed frame
        icon.fillStyle(0x443333, 1)
        icon.fillRect(x - 25, floorY - 30, 50, 30)
        // Pillow
        icon.fillStyle(0x555544, 1)
        icon.fillRect(x - 20, floorY - 28, 15, 10)
        // Blanket
        icon.fillStyle(0x554444, 1)
        icon.fillRect(x - 5, floorY - 26, 25, 22)
        if (options?.hideVisual) icon.setVisible(false)

        const label = this.add
            .text(x, floorY - 42, 'Bed', {
                fontFamily: 'Georgia, serif',
                fontSize: '13px',
                color: '#999999',
            })
            .setOrigin(0.5)
        if (options?.hideLabel) label.setVisible(false)

        this.doors.push({
            x,
            label,
            icon,
            name: 'Bed',
            choreKey: null,
            sceneName: null,
            action: () => {
                if (this.dayComplete) return

                if (!GameState.allChoresDone(this)) {
                    this.showMessage('You still have things to do...')
                    return
                }

                this.dayComplete = true
                this.showMessage('You close your eyes. Another day done.')
                this.time.delayedCall(2000, () => {
                    GameState.advanceDay(this)
                    this.scene.start('DayIntro')
                })
            },
        })
    }

    private showMessage(text: string) {
        const { width, height } = this.scale
        const msgY = height * 0.55
        const msg = this.add
            .text(this.player.x, msgY, text, {
                fontFamily: 'Georgia, serif',
                fontSize: '18px',
                color: '#999999',
                wordWrap: { width: 400 },
                align: 'center',
            })
            .setOrigin(0.5)
            .setAlpha(0)
            .setDepth(50)

        this.tweens.add({
            targets: msg,
            alpha: 1,
            duration: 500,
            yoyo: true,
            hold: 1500,
            // Follow the player on x; y stays where the message spawned
            onUpdate: () => {
                const halfW = msg.width / 2
                const x = Math.max(halfW + 16, Math.min(width - halfW - 16, this.player.x))
                msg.setX(x)
            },
            onComplete: () => msg.destroy(),
        })
    }

    /** Pin a HudPanel's x to the player's screen position; y stays at spawn. */
    private anchorPanelAtPlayer(panel: HudPanel) {
        const cam = this.cameras.main
        const screenX = this.player.x - cam.scrollX
        const { width } = this.scale
        const halfW = panel.getBounds().width / 2
        const clampedX = Math.max(halfW + 16, Math.min(width - halfW - 16, screenX))
        panel.setX(clampedX)
        panel.setDepth(50)
    }

    private drawCavediver(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
        // Legs
        gfx.fillStyle(0x554433, 1)
        gfx.fillRect(x - 5, y + 10, 4, 14)
        gfx.fillRect(x + 1, y + 10, 4, 14)
        // Heavy boots
        gfx.fillStyle(0x332a20, 1)
        gfx.fillRect(x - 7, y + 22, 7, 4)
        gfx.fillRect(x, y + 22, 7, 4)
        // Body — rugged mining suit
        gfx.fillStyle(0x775544, 1)
        gfx.fillRect(x - 8, y - 6, 16, 18)
        // Tool belt
        gfx.fillStyle(0x332a20, 1)
        gfx.fillRect(x - 8, y + 6, 16, 4)
        gfx.fillStyle(0x888877, 1)
        gfx.fillRect(x - 6, y + 7, 3, 3)
        gfx.fillRect(x + 3, y + 7, 3, 3)
        // Arms
        gfx.fillStyle(0x775544, 1)
        gfx.fillRect(x - 11, y - 4, 4, 12)
        gfx.fillRect(x + 7, y - 4, 4, 12)
        // Gloves
        gfx.fillStyle(0x553322, 1)
        gfx.fillRect(x - 11, y + 6, 4, 3)
        gfx.fillRect(x + 7, y + 6, 4, 3)
        // Neck
        gfx.fillStyle(0xbb9977, 1)
        gfx.fillRect(x - 3, y - 10, 6, 5)
        // Helmet — hardhat
        gfx.fillStyle(0x997744, 1)
        gfx.fillCircle(x, y - 16, 9)
        gfx.fillRect(x - 9, y - 16, 18, 3)
        // Helmet lamp
        gfx.fillStyle(0xffe8a8, 1)
        gfx.fillCircle(x, y - 20, 3)
        gfx.fillStyle(0xffcc66, 0.4)
        gfx.fillCircle(x, y - 20, 5)
        // Face
        gfx.fillStyle(0xbb9977, 1)
        gfx.fillCircle(x, y - 15, 5)
        // Eyes
        gfx.fillStyle(0x222222, 1)
        gfx.fillCircle(x - 2, y - 15, 1.2)
        gfx.fillCircle(x + 2, y - 15, 1.2)
        // Smirk
        gfx.lineStyle(1, 0x222222, 0.7)
        gfx.beginPath()
        gfx.arc(x + 1, y - 13, 3, 0.1, Math.PI - 0.5)
        gfx.strokePath()
    }

    private drawCompanionHuman(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
        // Legs
        gfx.fillStyle(0x555566, 1)
        gfx.fillRect(x - 5, y + 10, 4, 14)
        gfx.fillRect(x + 1, y + 10, 4, 14)
        // Boots
        gfx.fillStyle(0x444455, 1)
        gfx.fillRect(x - 6, y + 22, 6, 3)
        gfx.fillRect(x, y + 22, 6, 3)
        // Body — slightly different suit color
        gfx.fillStyle(0x667766, 1)
        gfx.fillRect(x - 7, y - 6, 14, 18)
        // Belt with tool pouch
        gfx.fillStyle(0x555544, 1)
        gfx.fillRect(x - 7, y + 6, 14, 3)
        gfx.fillRect(x + 3, y + 3, 6, 5)
        // Arms
        gfx.fillStyle(0x667766, 1)
        gfx.fillRect(x - 10, y - 4, 4, 12)
        gfx.fillRect(x + 6, y - 4, 4, 12)
        // Gloves
        gfx.fillStyle(0x778877, 1)
        gfx.fillRect(x - 10, y + 6, 4, 3)
        gfx.fillRect(x + 6, y + 6, 4, 3)
        // Neck
        gfx.fillStyle(0x997766, 1)
        gfx.fillRect(x - 3, y - 10, 6, 5)
        // Helmet — slightly different tint
        gfx.fillStyle(0x889977, 0.5)
        gfx.fillCircle(x, y - 16, 9)
        gfx.lineStyle(2, 0x889988, 0.8)
        gfx.strokeCircle(x, y - 16, 9)
        // Face
        gfx.fillStyle(0x997766, 1)
        gfx.fillCircle(x, y - 16, 6)
        // Eyes
        gfx.fillStyle(0x222222, 1)
        gfx.fillCircle(x - 2, y - 17, 1.2)
        gfx.fillCircle(x + 2, y - 17, 1.2)
        // Slight smile
        gfx.lineStyle(1, 0x222222, 0.6)
        gfx.beginPath()
        gfx.arc(x, y - 14, 3, 0.2, Math.PI - 0.2)
        gfx.strokePath()
        // Visor reflection
        gfx.fillStyle(0xaabb99, 0.2)
        gfx.fillCircle(x - 3, y - 19, 3)
    }

    private drawOldPhotograph(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
        // Outer frame
        gfx.fillStyle(0x443322, 1)
        gfx.fillRect(x - 16, y - 12, 32, 24)
        // Inner photo — sepia
        gfx.fillStyle(0x998866, 1)
        gfx.fillRect(x - 13, y - 9, 26, 18)
        // Two small figures
        gfx.fillStyle(0x554433, 0.75)
        gfx.fillCircle(x - 5, y - 2, 2)
        gfx.fillCircle(x + 5, y - 2, 2)
        gfx.fillRect(x - 7, y, 4, 7)
        gfx.fillRect(x + 3, y, 4, 7)
        // Subtle highlight on frame
        gfx.lineStyle(1, 0x665544, 0.6)
        gfx.strokeRect(x - 16, y - 12, 32, 24)
    }

    private drawMusicBox(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
        // Shelf under box
        gfx.fillStyle(0x3a3428, 1)
        gfx.fillRect(x - 20, y + 8, 40, 3)
        // Box body
        gfx.fillStyle(0x664422, 1)
        gfx.fillRect(x - 12, y - 4, 24, 12)
        // Lid trim
        gfx.fillStyle(0xaa8844, 1)
        gfx.fillRect(x - 12, y - 6, 24, 2)
        // Decorative inlay on front
        gfx.fillStyle(0x886633, 1)
        gfx.fillRect(x - 8, y - 1, 16, 5)
        gfx.lineStyle(1, 0xccaa66, 0.7)
        gfx.strokeRect(x - 8, y - 1, 16, 5)
        // Crank
        gfx.fillStyle(0x998855, 1)
        gfx.fillCircle(x + 14, y + 2, 2)
        gfx.lineStyle(1, 0x998855, 0.9)
        gfx.lineBetween(x + 12, y + 2, x + 17, y + 2)

        // Glint that slides across the lid trim
        const glint = this.add.rectangle(x - 12, y - 5, 3, 1, 0xffe8a8, 0.0)
        this.tweens.add({
            targets: glint,
            x: x + 12,
            alpha: { from: 0, to: 0.8 },
            duration: 900,
            repeat: -1,
            repeatDelay: 5200,
            ease: 'Quad.easeOut',
            onRepeat: () => {
                glint.setAlpha(0)
                glint.x = x - 12
            },
        })
    }

    private drawHangingLantern(
        gfx: Phaser.GameObjects.Graphics,
        x: number,
        ceilingY: number,
        lanternY: number
    ) {
        // Chain from ceiling to lantern top
        gfx.lineStyle(1, 0x555555, 0.9)
        gfx.lineBetween(x, ceilingY, x, lanternY - 8)
        // Top cap
        gfx.fillStyle(0x443322, 1)
        gfx.fillRect(x - 6, lanternY - 8, 12, 4)
        // Glass / warm glow backing
        gfx.fillStyle(0xffcc66, 0.35)
        gfx.fillRect(x - 5, lanternY - 4, 10, 12)
        // Frame bars
        gfx.lineStyle(1, 0x443322, 1)
        gfx.strokeRect(x - 5, lanternY - 4, 10, 12)
        gfx.lineBetween(x, lanternY - 4, x, lanternY + 8)
        // Bottom
        gfx.fillStyle(0x443322, 1)
        gfx.fillRect(x - 6, lanternY + 8, 12, 2)

        // Flickering halo
        const halo = this.add.circle(x, lanternY + 2, 20, 0xffcc66, 0.14)
        this.tweens.add({
            targets: halo,
            alpha: 0.06,
            scale: 0.85,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        })
        // Flickering flame
        const flame = this.add.circle(x, lanternY + 3, 2, 0xffe8a8, 0.95)
        this.tweens.add({
            targets: flame,
            alpha: 0.6,
            scale: 1.3,
            duration: 180,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        })
    }

    private drawDogToys(dogX: number, dogY: number, toys: string[]) {
        const gfx = this.add.graphics()
        // Toys arranged around the dog on the floor
        const toyPositions = [
            { id: 'rubber_ball', ox: -25, oy: 10 },
            { id: 'squeaky_bone', ox: 28, oy: 10 },
            { id: 'chew_rope', ox: -20, oy: 16 },
            { id: 'cozy_blanket', ox: 0, oy: 14 },
        ]

        for (const tp of toyPositions) {
            if (!toys.includes(tp.id)) continue
            const tx = dogX + tp.ox
            const ty = dogY + tp.oy

            if (tp.id === 'rubber_ball') {
                // Small red ball
                gfx.fillStyle(0xcc5544, 1)
                gfx.fillCircle(tx, ty, 3)
                gfx.fillStyle(0xdd7766, 0.5)
                gfx.fillCircle(tx - 1, ty - 1, 1)
            } else if (tp.id === 'squeaky_bone') {
                // Small bone shape
                gfx.fillStyle(0xddcc88, 1)
                gfx.fillRect(tx - 4, ty - 1, 8, 2)
                gfx.fillCircle(tx - 4, ty, 2)
                gfx.fillCircle(tx + 4, ty, 2)
            } else if (tp.id === 'chew_rope') {
                // Coiled rope
                gfx.lineStyle(2, 0xaa7755, 1)
                gfx.strokeCircle(tx, ty, 3)
                gfx.lineBetween(tx + 3, ty, tx + 6, ty - 2)
            } else if (tp.id === 'cozy_blanket') {
                // Small folded blanket under/near the dog
                gfx.fillStyle(0x7788aa, 0.7)
                gfx.fillRect(tx - 6, ty, 12, 4)
                gfx.fillStyle(0x8899bb, 0.5)
                gfx.fillRect(tx - 5, ty, 4, 3)
            }
        }
    }

    update(_time: number, _delta: number) {
        if (this.dayComplete) return

        const body = this.player.body as Phaser.Physics.Arcade.Body

        // Movement (arrows or WASD)
        if (this.cursors.left.isDown || this.keyA.isDown) {
            body.setVelocityX(-this.playerSpeed)
        } else if (this.cursors.right.isDown || this.keyD.isDown) {
            body.setVelocityX(this.playerSpeed)
        } else {
            body.setVelocityX(0)
        }

        const { height } = this.scale
        updatePlayerSprite(this.playerSprite, this.player.x, height * 0.7, body.velocity.x)

        // Check proximity to doors
        this.currentDoor = null
        for (const door of this.doors) {
            if (Math.abs(this.player.x - door.x) < 40) {
                this.currentDoor = door
                break
            }
        }

        // Show/hide door prompt — keep it pinned above the player every frame
        if (this.currentDoor) {
            this.prompt.setContent('[E] Enter', this.currentDoor.name)
            this.anchorPanelAtPlayer(this.prompt)
            this.prompt.setAlpha(1)
        } else {
            this.prompt.setAlpha(0)
        }

        // Show/hide dog prompt when near the dog — also follows
        if (this.dogSprite && this.dogPrompt) {
            const nearDog = Math.abs(this.player.x - this.dogX) < 60
            const visible = nearDog && !this.currentDoor
            if (visible) this.anchorPanelAtPlayer(this.dogPrompt)
            this.dogPrompt.setAlpha(visible ? 1 : 0)
        }

        // Handle interaction
        if (this.currentDoor && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.currentDoor.action()
        }
    }
}
