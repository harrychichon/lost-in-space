import { Scene } from 'phaser'
import { GameState, PlanetData } from '../systems/GameState'
import { SpaceBackground } from '../objects/SpaceBackground'
import { AudioManager } from '../systems/AudioManager'
import { GlobalNavBar } from '../objects/GlobalNavBar'

const BIOME_COLORS: Record<PlanetData['biome'], number> = {
    lush: 0x558855,
    frozen: 0x7799aa,
    desert: 0xaa8855,
}

const PLANET_TEXTURES = [
    'planet1',
    'planet2',
    'planet3',
    'planet4',
    'planet5',
    'planet6',
    'planet7',
    'planet10',
    'planet11',
    'planet12',
    'planet13',
    'planet14',
    'planet15',
    'planet16',
    'planet17',
    'planet18',
    'planet19',
    'planet20',
]

function planetTextureFor(planet: PlanetData): string {
    const n = parseInt(planet.id.replace(/\D+/g, ''), 10) || 0
    return PLANET_TEXTURES[(n - 1 + PLANET_TEXTURES.length) % PLANET_TEXTURES.length]
}

interface PlanetEntry {
    sprite: Phaser.GameObjects.Image
    /** Scale assigned by setDisplaySize() — multiply, don't replace. */
    baseScale: number
    orbitRing: Phaser.GameObjects.Graphics
    selectionRing: Phaser.GameObjects.Graphics
    nameText: Phaser.GameObjects.Text
    planet: PlanetData
}

export class Navigation extends Scene {
    private space!: SpaceBackground
    private selectedIndex = 0
    private planetEntries: PlanetEntry[] = []

    constructor() {
        super('Navigation')
    }

    create() {
        const { width, height } = this.scale
        const state = GameState.get(this)
        const cx = width * 0.5
        const cy = height * 0.5

        this.selectedIndex = 0
        this.planetEntries = []

        this.cameras.main.setBackgroundColor(0x000000)

        GameState.applyGrayscale(this)

        this.space = new SpaceBackground(this)

        AudioManager.update(this, {
            warmth: GameState.getSaturation(this),
            location: 'navigation',
        })

        // Title
        this.add
            .text(cx, 28, 'Navigation', {
                fontFamily: 'Georgia, serif',
                fontSize: '28px',
                color: '#777777',
            })
            .setOrigin(0.5)

        // Ship in center — pixel-art sprite
        const ship = this.add.image(cx, cy, 'ship_navigation').setOrigin(0.5)
        ship.displayHeight = 110
        ship.scaleX = ship.scaleY

        this.add
            .text(cx, cy + ship.displayHeight / 2 + 12, 'Your Ship', {
                fontFamily: 'Georgia, serif',
                fontSize: '11px',
                color: '#666666',
            })
            .setOrigin(0.5)

        if (state.planets.length === 0) {
            this.add
                .text(cx, cy + 80, 'No planets discovered yet.\nKeep drifting...', {
                    fontFamily: 'Georgia, serif',
                    fontSize: '18px',
                    color: '#555555',
                    align: 'center',
                })
                .setOrigin(0.5)
        } else {
            // Spread planets in a circle around the ship
            const minRadius = 180
            const maxRadius = Math.min(width, height) * 0.4
            const angleStep = (Math.PI * 2) / Math.max(state.planets.length, 1)
            const startAngle = -Math.PI / 2 // start from top

            state.planets.forEach((planet, i) => {
                // Vary the radius so they don't sit on a perfect circle
                const radius = minRadius + ((i * 67) % 3) * ((maxRadius - minRadius) / 3)
                const angle = startAngle + i * angleStep
                const px = cx + Math.cos(angle) * radius
                const py = cy + Math.sin(angle) * radius
                const color = BIOME_COLORS[planet.biome]
                const uncollected = planet.items.filter((item) => !item.collected).length
                const total = planet.items.length

                // Connection line from ship to planet
                const lines = this.add.graphics()
                lines.lineStyle(1, 0x333344, 0.3)
                lines.lineBetween(cx, cy, px, py)

                // Dashed distance markers along the line
                const dots = 3
                for (let d = 1; d <= dots; d++) {
                    const t = d / (dots + 1)
                    const dx = cx + (px - cx) * t
                    const dy = cy + (py - cy) * t
                    lines.fillStyle(0x333344, 0.4)
                    lines.fillCircle(dx, dy, 1.5)
                }

                // Planet body (sprite)
                const planetSprite = this.add.image(px, py, planetTextureFor(planet))
                planetSprite.setDisplaySize(54, 54)
                const baseScale = planetSprite.scale

                // Subtle orbit ring, biome-tinted
                const orbitRing = this.add.graphics()
                orbitRing.lineStyle(1, color, 0.15)
                orbitRing.strokeCircle(px, py, 34)

                // Selection ring — bright cyan rounded rectangle wrapping planet + name +
                // item label, with ~10px breathing room on all sides so the content
                // doesn't crowd the border.
                const selectionRing = this.add.graphics()
                selectionRing.lineStyle(2, 0x6ee0ff, 0.9)
                selectionRing.strokeRoundedRect(px - 65, py - 43, 130, 112, 16)
                selectionRing.setVisible(false)

                // Planet name
                const nameText = this.add
                    .text(px, py + 32, planet.name, {
                        fontFamily: 'Georgia, serif',
                        fontSize: '13px',
                        color: '#b0b8c0',
                    })
                    .setOrigin(0.5)

                // Biome + items label
                const itemLabel =
                    uncollected > 0
                        ? `${planet.biome} · ${uncollected}/${total} items`
                        : `${planet.biome} · explored`
                const itemColor = uncollected > 0 ? '#969ea6' : '#707880'
                this.add
                    .text(px, py + 47, itemLabel, {
                        fontFamily: 'Georgia, serif',
                        fontSize: '10px',
                        color: itemColor,
                    })
                    .setOrigin(0.5)

                this.planetEntries.push({
                    sprite: planetSprite,
                    baseScale,
                    orbitRing,
                    selectionRing,
                    nameText,
                    planet,
                })
            })

            this.updateSelection()
        }

        // Inputs — A/D cycle, E confirm, L back (the GlobalNavBar at the bottom
        // already shows the L hint, so no extra prompt text needed up here).
        const keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
        const keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        const keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)
        const keyL = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L)

        keyA.on('down', () => {
            const n = this.planetEntries.length
            if (n === 0) return
            this.selectedIndex = (this.selectedIndex - 1 + n) % n
            this.updateSelection()
        })
        keyD.on('down', () => {
            const n = this.planetEntries.length
            if (n === 0) return
            this.selectedIndex = (this.selectedIndex + 1) % n
            this.updateSelection()
        })
        keyE.on('down', () => {
            if (this.planetEntries.length === 0) return
            const planet = this.planetEntries[this.selectedIndex].planet
            this.scene.start('Planet', { planetId: planet.id })
        })
        keyL.on('down', () => {
            this.scene.start('Ship', { fromRoom: 'Navigation' })
        })

        this.add.existing(new GlobalNavBar(this, ['E', 'L']))
    }

    private updateSelection() {
        this.planetEntries.forEach((e, i) => {
            const isSelected = i === this.selectedIndex
            e.sprite.setScale(isSelected ? e.baseScale * 1.18 : e.baseScale)
            e.orbitRing.setAlpha(isSelected ? 0.6 : 0.15)
            e.selectionRing.setVisible(isSelected)
            e.nameText.setColor(isSelected ? '#c0cdd9' : '#b0b8c0')
        })
    }

    update(_time: number, delta: number) {
        this.space.update(delta)
    }
}
