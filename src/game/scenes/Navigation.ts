import { Scene } from 'phaser';
import { GameState, PlanetData } from '../systems/GameState';
import { SpaceBackground } from '../objects/SpaceBackground';
import { AudioManager } from '../systems/AudioManager';

const BIOME_COLORS: Record<PlanetData['biome'], number> = {
    lush: 0x558855,
    frozen: 0x7799aa,
    desert: 0xaa8855,
};

const PLANET_TEXTURES = [
    'planet1', 'planet2', 'planet3', 'planet4', 'planet5', 'planet6', 'planet7',
    'planet10', 'planet11', 'planet12', 'planet13', 'planet14', 'planet15',
    'planet16', 'planet17', 'planet18', 'planet19', 'planet20',
];

function planetTextureFor(planet: PlanetData): string {
    const n = parseInt(planet.id.replace(/\D+/g, ''), 10) || 0;
    return PLANET_TEXTURES[(n - 1 + PLANET_TEXTURES.length) % PLANET_TEXTURES.length];
}

export class Navigation extends Scene {
    private space!: SpaceBackground;

    constructor() {
        super('Navigation');
    }

    create() {
        const { width, height } = this.scale;
        const state = GameState.get(this);
        const cx = width * 0.5;
        const cy = height * 0.5;

        this.cameras.main.setBackgroundColor(0x000000);

        GameState.applyGrayscale(this);

        this.space = new SpaceBackground(this);

        AudioManager.update(this, {
            warmth: GameState.getSaturation(this),
            location: 'navigation',
        });

        // Title
        this.add.text(cx, 28, 'Navigation', {
            fontFamily: 'Georgia, serif',
            fontSize: '28px',
            color: '#777777',
        }).setOrigin(0.5);

        // Ship in center (top-down view)
        const ship = this.add.graphics();
        // Hull
        ship.fillStyle(0x888888, 1);
        ship.fillTriangle(cx, cy - 20, cx - 10, cy + 14, cx + 10, cy + 14);
        // Cockpit window
        ship.fillStyle(0xaaaacc, 1);
        ship.fillTriangle(cx, cy - 12, cx - 5, cy, cx + 5, cy);
        // Engine glow
        ship.fillStyle(0x666677, 0.6);
        ship.fillRect(cx - 6, cy + 14, 12, 4);
        // Wings
        ship.fillStyle(0x777777, 1);
        ship.fillTriangle(cx - 10, cy + 6, cx - 22, cy + 16, cx - 10, cy + 14);
        ship.fillTriangle(cx + 10, cy + 6, cx + 22, cy + 16, cx + 10, cy + 14);

        this.add.text(cx, cy + 28, 'Your Ship', {
            fontFamily: 'Georgia, serif',
            fontSize: '11px',
            color: '#666666',
        }).setOrigin(0.5);

        if (state.planets.length === 0) {
            this.add.text(cx, cy + 60, 'No planets discovered yet.\nKeep drifting...', {
                fontFamily: 'Georgia, serif',
                fontSize: '18px',
                color: '#555555',
                align: 'center',
            }).setOrigin(0.5);
        } else {
            // Spread planets in a circle around the ship
            const minRadius = 140;
            const maxRadius = Math.min(width, height) * 0.4;
            const angleStep = (Math.PI * 2) / Math.max(state.planets.length, 1);
            const startAngle = -Math.PI / 2; // start from top

            state.planets.forEach((planet, i) => {
                // Vary the radius so they don't sit on a perfect circle
                const radius = minRadius + ((i * 67) % 3) * ((maxRadius - minRadius) / 3);
                const angle = startAngle + i * angleStep;
                const px = cx + Math.cos(angle) * radius;
                const py = cy + Math.sin(angle) * radius;
                const color = BIOME_COLORS[planet.biome];
                const uncollected = planet.items.filter(item => !item.collected).length;
                const total = planet.items.length;

                // Connection line from ship to planet
                const lines = this.add.graphics();
                lines.lineStyle(1, 0x333344, 0.3);
                lines.lineBetween(cx, cy, px, py);

                // Dashed distance markers along the line
                const dots = 3;
                for (let d = 1; d <= dots; d++) {
                    const t = d / (dots + 1);
                    const dx = cx + (px - cx) * t;
                    const dy = cy + (py - cy) * t;
                    lines.fillStyle(0x333344, 0.4);
                    lines.fillCircle(dx, dy, 1.5);
                }

                // Planet body (sprite)
                const planetSprite = this.add.image(px, py, planetTextureFor(planet));
                planetSprite.setDisplaySize(54, 54);

                // Subtle orbit ring, biome-tinted
                const orbitRing = this.add.graphics();
                orbitRing.lineStyle(1, color, 0.15);
                orbitRing.strokeCircle(px, py, 34);

                // Planet name
                this.add.text(px, py + 32, planet.name, {
                    fontFamily: 'Georgia, serif',
                    fontSize: '13px',
                    color: '#999999',
                }).setOrigin(0.5);

                // Biome + items label
                const itemLabel = uncollected > 0
                    ? `${planet.biome} · ${uncollected}/${total} items`
                    : `${planet.biome} · explored`;
                const itemColor = uncollected > 0 ? '#777777' : '#555555';
                this.add.text(px, py + 47, itemLabel, {
                    fontFamily: 'Georgia, serif',
                    fontSize: '10px',
                    color: itemColor,
                }).setOrigin(0.5);

                // Key shortcut
                if (i < 9) {
                    this.add.text(px, py - 32, `[${i + 1}]`, {
                        fontFamily: 'Georgia, serif',
                        fontSize: '11px',
                        color: '#555555',
                    }).setOrigin(0.5);

                    const key = this.input.keyboard!.addKey(
                        Phaser.Input.Keyboard.KeyCodes.ONE + i
                    );
                    key.on('down', () => {
                        this.scene.start('Planet', { planetId: planet.id });
                    });
                }

                // Interactive hover/click
                planetSprite.setInteractive({ useHandCursor: true });
                const baseScale = planetSprite.scale;
                planetSprite.on('pointerover', () => {
                    planetSprite.setScale(baseScale * 1.15);
                    orbitRing.setAlpha(0.6);
                });
                planetSprite.on('pointerout', () => {
                    planetSprite.setScale(baseScale);
                    orbitRing.setAlpha(1);
                });
                planetSprite.on('pointerdown', () => {
                    this.scene.start('Planet', { planetId: planet.id });
                });
            });
        }

        // Back prompt
        this.add.text(cx, height - 30, '[ESC] Back to Ship', {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#555555',
        }).setOrigin(0.5);

        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
            this.scene.start('Ship', { fromRoom: 'Navigation' });
        });
    }

    update(_time: number, delta: number) {
        this.space.update(delta);
    }
}
