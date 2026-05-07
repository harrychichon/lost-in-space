import { GameState } from '../systems/GameState';
import { RoomScene } from './RoomScene';

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

export class Collection extends RoomScene {
    constructor() {
        super('Collection');
    }

    create() {
        const { width, height } = this.scale;
        const state = GameState.get(this);
        const collected = state.collectedExoticPlants;

        this.cameras.main.setBackgroundColor(0x0f110f);
        this.setupRoom();

        const gfx = this.add.graphics();

        // Walls — warm tinted from the plants
        gfx.fillStyle(0x1a1e18, 1);
        gfx.fillRect(0, height * 0.15, width, height * 0.55);

        // Floor
        gfx.fillStyle(0x2a2a1e, 1);
        gfx.fillRect(0, this.floorY, width, height * 0.3);

        // Shelving unit across the back wall
        gfx.fillStyle(0x333328, 1);
        gfx.fillRect(this.roomLeft, height * 0.25, this.roomWidth, 8);
        gfx.fillRect(this.roomLeft, height * 0.45, this.roomWidth, 8);

        // Exit door
        this.addExitDoor(gfx, this.roomLeft + 25);

        // Room label
        this.add.text(width * 0.5, height * 0.10, 'Exotic Plant Collection', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#777766',
        }).setOrigin(0.5);

        // Collection count
        this.add.text(width * 0.5, height * 0.18, `${collected.length} / ${PLANT_DISPLAYS.length} collected`, {
            fontFamily: 'Georgia, serif',
            fontSize: '13px',
            color: '#666655',
        }).setOrigin(0.5);

        // --- Display cases + interact points ---
        const slotCount = PLANT_DISPLAYS.length;
        const slotWidth = this.roomWidth / (slotCount + 1);

        PLANT_DISPLAYS.forEach((plant, i) => {
            const px = this.roomLeft + slotWidth * (i + 1);
            const py = height * 0.38;
            const isCollected = collected.includes(plant.id);

            // Display case on wall
            gfx.fillStyle(0x222220, 1);
            gfx.fillRect(px - 35, py - 40, 70, 80);
            gfx.lineStyle(1, isCollected ? plant.color : 0x333333, 0.5);
            gfx.strokeRect(px - 35, py - 40, 70, 80);

            if (isCollected) {
                this.drawPlant(gfx, px, py, plant);

                // Name plate below case
                this.add.text(px, py + 50, plant.name, {
                    fontFamily: 'Georgia, serif',
                    fontSize: '14px',
                    color: '#aaaaaa',
                }).setOrigin(0.5);

                // Small podium on floor
                gfx.fillStyle(0x333328, 1);
                gfx.fillRect(px - 15, this.floorY - 8, 30, 8);

                this.interactPoints.push({
                    x: px,
                    label: `Examine ${plant.name}`,
                    action: () => this.showMessage(plant.desc),
                });
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

                this.interactPoints.push({
                    x: px,
                    label: 'Examine',
                    action: () => this.showMessage('An empty display case.\nThe botanist says to look for plants on the planets.'),
                });
            }
        });

        // --- Botanist in room ---
        if (GameState.hasCompanion(this, 'human')) {
            const botX = this.rx(0.9);
            const botGfx = this.add.graphics();
            this.drawCompanionHuman(botGfx, botX, this.floorY - 25);

            const msg = collected.length === 3
                ? '"The full collection," the botanist says, beaming.\n"I never thought I\'d see anything like these again."'
                : collected.length > 0
                    ? '"There are more out there," the botanist says.\n"I can feel it. Keep looking."'
                    : '"The planets have plants unlike anything I\'ve seen.\nBring them back and I\'ll take care of them."';

            this.interactPoints.push({
                x: botX,
                label: 'Talk to botanist',
                action: () => this.showMessage(msg),
            });
        }

        this.setupPlayerAndUI();
    }

    update() {
        this.updateRoom();
    }

    private drawPlant(gfx: Phaser.GameObjects.Graphics, x: number, y: number, plant: PlantDisplay) {
        // Pot
        gfx.fillStyle(0x554433, 1);
        gfx.fillRect(x - 10, y + 10, 20, 15);
        gfx.fillRect(x - 12, y + 8, 24, 4);

        // Stem
        gfx.lineStyle(2, 0x446633, 0.8);
        gfx.lineBetween(x, y + 10, x, y - 10);

        if (plant.id === 'voidbloom') {
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
            gfx.fillStyle(plant.color, 0.6);
            gfx.fillCircle(x - 6, y - 5, 8);
            gfx.fillCircle(x + 6, y - 8, 7);
            gfx.fillCircle(x, y - 14, 6);
            gfx.fillStyle(0x66bb88, 0.4);
            gfx.fillCircle(x - 2, y - 10, 4);
        } else if (plant.id === 'starspice') {
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
