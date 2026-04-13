import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

export class Greenhouse extends Scene {
    constructor() {
        super('Greenhouse');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(0x0f110f);

        // Apply grayscale
        const saturation = GameState.getSaturation(this);
        if (saturation < 1) {
            this.cameras.main.postFX.addColorMatrix().grayscale(1 - saturation);
        }

        const gfx = this.add.graphics();

        // Floor — soil-tinted
        gfx.fillStyle(0x2a2a1a, 1);
        gfx.fillRect(0, height * 0.7, width, height * 0.3);

        // Walls — slightly green-tinted
        gfx.fillStyle(0x1a2218, 1);
        gfx.fillRect(0, height * 0.2, width, height * 0.5);

        // Glass ceiling (showing stars)
        gfx.fillStyle(0x000008, 1);
        gfx.fillRect(0, height * 0.15, width, height * 0.05);
        // Window panes
        gfx.lineStyle(1, 0x334433, 0.5);
        for (let px = 0; px < width; px += 60) {
            gfx.lineBetween(px, height * 0.15, px, height * 0.2);
        }
        // Stars through glass
        for (let i = 0; i < 30; i++) {
            const sx = Phaser.Math.Between(0, width);
            const sy = Phaser.Math.Between(height * 0.15, height * 0.2);
            gfx.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.5));
            gfx.fillCircle(sx, sy, 1);
        }

        // Grow beds — three long planters
        const bedY = height * 0.58;
        const beds = [
            { x: width * 0.15, w: 160 },
            { x: width * 0.50, w: 180 },
            { x: width * 0.82, w: 140 },
        ];

        beds.forEach(bed => {
            // Planter box
            gfx.fillStyle(0x3a3322, 1);
            gfx.fillRect(bed.x - bed.w / 2, bedY, bed.w, 25);
            gfx.lineStyle(1, 0x4a4432, 0.6);
            gfx.strokeRect(bed.x - bed.w / 2, bedY, bed.w, 25);

            // Soil
            gfx.fillStyle(0x2a2015, 1);
            gfx.fillRect(bed.x - bed.w / 2 + 4, bedY + 2, bed.w - 8, 8);

            // Plants growing from soil
            const numPlants = Math.floor(bed.w / 20);
            for (let p = 0; p < numPlants; p++) {
                const plantX = bed.x - bed.w / 2 + 14 + p * 20;
                const plantH = 12 + Math.random() * 18;

                // Stem
                gfx.lineStyle(2, 0x446633, 0.8);
                gfx.lineBetween(plantX, bedY, plantX, bedY - plantH);

                // Leaves
                gfx.fillStyle(0x447744, 0.7);
                gfx.fillCircle(plantX - 4, bedY - plantH + 4, 4);
                gfx.fillCircle(plantX + 4, bedY - plantH + 2, 5);
                gfx.fillCircle(plantX, bedY - plantH - 2, 4);
            }
        });

        // Watering can on floor
        gfx.fillStyle(0x555555, 1);
        gfx.fillRect(width * 0.35, height * 0.65, 16, 12);
        gfx.fillRect(width * 0.35 + 14, height * 0.64, 8, 4);
        gfx.fillStyle(0x444444, 1);
        gfx.fillRect(width * 0.35 - 2, height * 0.65 + 12, 20, 3);

        // Small humidity gauge on wall
        gfx.fillStyle(0x222222, 1);
        gfx.fillRect(width * 0.92, height * 0.35, 24, 40);
        gfx.lineStyle(1, 0x446644, 0.5);
        gfx.strokeRect(width * 0.92, height * 0.35, 24, 40);
        gfx.fillStyle(0x447744, 0.6);
        gfx.fillRect(width * 0.92 + 4, height * 0.35 + 15, 16, 21);

        // Room label
        this.add.text(width * 0.5, height * 0.10, 'Greenhouse', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#666666',
        }).setOrigin(0.5);

        // Prompt
        const prompt = this.add.text(width * 0.5, height * 0.82, '[E] Tend the plants', {
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: '#888888',
        }).setOrigin(0.5);

        this.tweens.add({
            targets: prompt,
            alpha: 0.4,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        let tended = false;
        this.input.keyboard!.on('keydown-E', () => {
            if (tended) return;
            tended = true;
            prompt.destroy();

            const hasDog = GameState.hasCompanion(this, 'dog');
            const hasHuman = GameState.hasCompanion(this, 'human');
            const state = GameState.get(this);
            let msg: string;
            if (state.companions === 0) {
                msg = 'You water the plants in silence.\nThey grow. You don\'t.';
            } else if (hasHuman) {
                msg = 'The botanist takes over. Their hands move with purpose.\n"These remind me of home," they say quietly.';
            } else if (hasDog) {
                msg = 'The dog sniffs the plants curiously.\nYou water them around it.';
            } else {
                msg = 'You tend the plants together.';
            }

            const text = this.add.text(width * 0.5, height * 0.82, msg, {
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                color: '#999999',
                wordWrap: { width: 500 },
                align: 'center',
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: text,
                alpha: 1,
                duration: 800,
                ease: 'Power2',
            });

            this.time.delayedCall(2500, () => {
                GameState.completeChore(this, 'greenhouse');
                this.scene.start('Ship');
            });
        });
    }
}
