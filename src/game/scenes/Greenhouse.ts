import { GameState } from '../systems/GameState';
import { RoomScene, InteractPoint } from './RoomScene';

export class Greenhouse extends RoomScene {
    constructor() {
        super('Greenhouse');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(0x0f110f);
        this.setupRoom();

        const gfx = this.add.graphics();

        // Floor — soil-tinted
        gfx.fillStyle(0x2a2a1a, 1);
        gfx.fillRect(0, this.floorY, width, height * 0.3);

        // Walls — slightly green-tinted
        gfx.fillStyle(0x1a2218, 1);
        gfx.fillRect(0, height * 0.2, width, height * 0.5);

        // Glass ceiling (showing stars)
        gfx.fillStyle(0x000008, 1);
        gfx.fillRect(this.roomLeft, height * 0.15, this.roomWidth, height * 0.05);
        gfx.lineStyle(1, 0x334433, 0.5);
        for (let px = this.roomLeft; px < this.roomRight; px += 60) {
            gfx.lineBetween(px, height * 0.15, px, height * 0.2);
        }
        // Stars through glass
        for (let i = 0; i < 20; i++) {
            const sx = Phaser.Math.Between(this.roomLeft, this.roomRight);
            const sy = Phaser.Math.Between(height * 0.15, height * 0.2);
            gfx.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.5));
            gfx.fillCircle(sx, sy, 1);
        }

        // Grow beds — two planters
        const bedY = height * 0.58;
        const beds = [
            { x: this.rx(0.3), w: 130 },
            { x: this.rx(0.7), w: 130 },
        ];

        beds.forEach(bed => {
            gfx.fillStyle(0x3a3322, 1);
            gfx.fillRect(bed.x - bed.w / 2, bedY, bed.w, 25);
            gfx.lineStyle(1, 0x4a4432, 0.6);
            gfx.strokeRect(bed.x - bed.w / 2, bedY, bed.w, 25);
            gfx.fillStyle(0x2a2015, 1);
            gfx.fillRect(bed.x - bed.w / 2 + 4, bedY + 2, bed.w - 8, 8);

            const numPlants = Math.floor(bed.w / 20);
            for (let p = 0; p < numPlants; p++) {
                const plantX = bed.x - bed.w / 2 + 14 + p * 20;
                const plantH = 12 + Math.random() * 18;
                gfx.lineStyle(2, 0x446633, 0.8);
                gfx.lineBetween(plantX, bedY, plantX, bedY - plantH);
                gfx.fillStyle(0x447744, 0.7);
                gfx.fillCircle(plantX - 4, bedY - plantH + 4, 4);
                gfx.fillCircle(plantX + 4, bedY - plantH + 2, 5);
                gfx.fillCircle(plantX, bedY - plantH - 2, 4);
            }
        });

        // Watering can
        gfx.fillStyle(0x555555, 1);
        gfx.fillRect(this.rx(0.48), height * 0.65, 16, 12);
        gfx.fillRect(this.rx(0.48) + 14, height * 0.64, 8, 4);
        gfx.fillStyle(0x444444, 1);
        gfx.fillRect(this.rx(0.48) - 2, height * 0.65 + 12, 20, 3);

        // Humidity gauge on wall
        gfx.fillStyle(0x222222, 1);
        gfx.fillRect(this.rx(0.92), height * 0.35, 24, 40);
        gfx.lineStyle(1, 0x446644, 0.5);
        gfx.strokeRect(this.rx(0.92), height * 0.35, 24, 40);
        gfx.fillStyle(0x447744, 0.6);
        gfx.fillRect(this.rx(0.92) + 4, height * 0.35 + 15, 16, 21);

        // Exit door
        this.addExitDoor(gfx, this.roomLeft + 25);

        // Room label
        this.add.text(width * 0.5, height * 0.10, 'Greenhouse', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#666666',
        }).setOrigin(0.5);

        // --- Companions ---
        const state = GameState.get(this);

        if (GameState.hasCompanion(this, 'human')) {
            const botX = this.rx(0.78);
            const botGfx = this.add.graphics();
            this.drawCompanionHuman(botGfx, botX, this.floorY - 25);

            this.interactPoints.push({
                x: botX,
                label: 'Talk to botanist',
                action: () => this.showMessage(
                    '"These remind me of home," the botanist says quietly.\nTheir hands move with purpose among the leaves.'
                ),
            });
        }

        // --- Chore station (center / watering can area) ---
        const choreX = this.rx(0.5);
        if (!state.chores.greenhouse) {
            const chorePoint: InteractPoint = {
                x: choreX,
                label: 'Tend the plants',
                action: () => {
                    if (this.transitioning) return;
                    GameState.completeChore(this, 'greenhouse');
                    const idx = this.interactPoints.indexOf(chorePoint);
                    if (idx !== -1) this.interactPoints.splice(idx, 1);
                    const msg = state.companions === 0
                        ? 'You water the plants in silence.\nThey grow. You don\'t.'
                        : 'You tend the plants.';
                    this.showMessage(msg);
                    this.add.text(choreX, this.floorY - 85, '✓', {
                        fontFamily: 'Arial', fontSize: '22px', color: '#556655',
                    }).setOrigin(0.5).setDepth(5);
                },
            };
            this.interactPoints.push(chorePoint);
        } else {
            this.add.text(choreX, this.floorY - 85, '✓', {
                fontFamily: 'Arial', fontSize: '22px', color: '#556655',
            }).setOrigin(0.5).setDepth(5);
        }

        this.setupPlayerAndUI();
    }

    update() {
        this.updateRoom();
    }
}
