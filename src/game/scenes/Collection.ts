import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

interface PlantDisplay {
    id: string;
    name: string;
    desc: string;
    color: number;
}

const PLANT_DISPLAYS: PlantDisplay[] = [
    {
        id: 'voidbloom',
        name: 'Voidbloom',
        desc: 'Dark, iridescent petals that seem to absorb light.\nThe botanist says its sap is lethal in small doses.\nBeautiful. Dangerous. Alive.',
        color: 0x663366,
    },
    {
        id: 'sweetmoss',
        name: 'Sweetmoss',
        desc: 'A soft, luminous moss that fills the room\nwith a gentle, sweet fragrance.\nThe ship smells like something other than metal now.',
        color: 0x55aa77,
    },
    {
        id: 'starspice',
        name: 'Starspice',
        desc: 'A spiny herb with an intense aroma.\nThe botanist grinds it into meals.\nFood has flavor now. Actual flavor.',
        color: 0xbbaa44,
    },
];

export class Collection extends Scene {
    constructor() {
        super('Collection');
    }

    create() {
        const { width, height } = this.scale;
        const state = GameState.get(this);
        const collected = state.collectedExoticPlants;

        this.cameras.main.setBackgroundColor(0x0f110f);

        // Grayscale
        const saturation = GameState.getSaturation(this);
        if (saturation < 1) {
            this.cameras.main.postFX.addColorMatrix().grayscale(1 - saturation);
        }

        const gfx = this.add.graphics();

        // Walls — warm tinted from the plants
        gfx.fillStyle(0x1a1e18, 1);
        gfx.fillRect(0, height * 0.15, width, height * 0.55);

        // Floor
        gfx.fillStyle(0x2a2a1e, 1);
        gfx.fillRect(0, height * 0.7, width, height * 0.3);

        // Shelving unit across the back wall
        gfx.fillStyle(0x333328, 1);
        gfx.fillRect(width * 0.08, height * 0.25, width * 0.84, 8);
        gfx.fillRect(width * 0.08, height * 0.45, width * 0.84, 8);

        // Room label
        this.add.text(width * 0.5, height * 0.10, 'Exotic Plant Collection', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#777766',
        }).setOrigin(0.5);

        if (collected.length === 0) {
            this.add.text(width * 0.5, height * 0.5, 'The shelves are empty.\nThe botanist says to look for plants on the planets.', {
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                color: '#666655',
                align: 'center',
            }).setOrigin(0.5);
        } else {
            // Display collected plants
            const slotWidth = width * 0.28;
            const startX = width * 0.18;

            PLANT_DISPLAYS.forEach((plant, i) => {
                const px = startX + i * slotWidth;
                const py = height * 0.38;
                const isCollected = collected.includes(plant.id);

                // Display case
                gfx.fillStyle(0x222220, 1);
                gfx.fillRect(px - 35, py - 40, 70, 80);
                gfx.lineStyle(1, isCollected ? plant.color : 0x333333, 0.5);
                gfx.strokeRect(px - 35, py - 40, 70, 80);

                if (isCollected) {
                    // Plant in case
                    this.drawPlant(gfx, px, py, plant);

                    // Name
                    this.add.text(px, py + 50, plant.name, {
                        fontFamily: 'Georgia, serif',
                        fontSize: '14px',
                        color: '#aaaaaa',
                    }).setOrigin(0.5);

                    // Description below
                    this.add.text(px, py + 70, plant.desc, {
                        fontFamily: 'Georgia, serif',
                        fontSize: '10px',
                        color: '#888877',
                        align: 'center',
                        wordWrap: { width: 200 },
                    }).setOrigin(0.5, 0);
                } else {
                    // Empty case
                    this.add.text(px, py, '?', {
                        fontFamily: 'Georgia, serif',
                        fontSize: '28px',
                        color: '#333333',
                    }).setOrigin(0.5);

                    this.add.text(px, py + 50, 'Undiscovered', {
                        fontFamily: 'Georgia, serif',
                        fontSize: '12px',
                        color: '#444444',
                    }).setOrigin(0.5);
                }
            });
        }

        // Collection count
        this.add.text(width * 0.5, height * 0.65, `${collected.length} / ${PLANT_DISPLAYS.length} collected`, {
            fontFamily: 'Georgia, serif',
            fontSize: '13px',
            color: '#666655',
        }).setOrigin(0.5);

        // Back prompt
        this.add.text(width * 0.5, height - 30, '[ESC] Back to Ship', {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#555555',
        }).setOrigin(0.5);

        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
            this.scene.start('Ship');
        });
    }

    private drawPlant(gfx: Phaser.GameObjects.Graphics, x: number, y: number, plant: PlantDisplay) {
        // Pot
        gfx.fillStyle(0x554433, 1);
        gfx.fillRect(x - 10, y + 10, 20, 15);
        gfx.fillRect(x - 12, y + 8, 24, 4);

        // Stem
        gfx.lineStyle(2, 0x446633, 0.8);
        gfx.lineBetween(x, y + 10, x, y - 10);

        // Plant-specific visuals
        if (plant.id === 'voidbloom') {
            // Dark petals radiating out
            for (let a = 0; a < 6; a++) {
                const angle = (a / 6) * Math.PI * 2 - Math.PI / 2;
                const px2 = x + Math.cos(angle) * 12;
                const py2 = y - 10 + Math.sin(angle) * 10;
                gfx.fillStyle(plant.color, 0.8);
                gfx.fillCircle(px2, py2, 5);
            }
            gfx.fillStyle(0x220022, 1);
            gfx.fillCircle(x, y - 10, 4);
        } else if (plant.id === 'sweetmoss') {
            // Soft, round clumps of moss
            gfx.fillStyle(plant.color, 0.6);
            gfx.fillCircle(x - 6, y - 5, 8);
            gfx.fillCircle(x + 6, y - 8, 7);
            gfx.fillCircle(x, y - 14, 6);
            gfx.fillStyle(0x66bb88, 0.4);
            gfx.fillCircle(x - 2, y - 10, 4);
        } else if (plant.id === 'starspice') {
            // Spiny herb with yellow-green leaves
            for (let s = 0; s < 5; s++) {
                const angle = (s / 5) * Math.PI - Math.PI / 2;
                const sx = x + Math.cos(angle) * 3;
                const sy = y - 5 + s * -4;
                gfx.fillStyle(plant.color, 0.7);
                gfx.fillTriangle(sx - 8, sy + 3, sx, sy - 5, sx + 8, sy + 3);
            }
            gfx.lineStyle(1, 0x998833, 0.5);
            gfx.lineBetween(x, y + 10, x, y - 25);
        }
    }
}
