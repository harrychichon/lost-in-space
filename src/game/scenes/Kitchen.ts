import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

const SOLO_MSG = 'You eat alone. The food has no taste.';
const DOG_MSG = 'You eat together. The dog wolfs it down.\nFood goes faster now.';
const BOTH_MSG = 'Three mouths to feed now. The botanist cooks.\nIt\'s... not bad, actually.';
const BOTH_SPICE_MSG = 'The botanist adds Starspice to the meal.\nYou\'d forgotten food could taste like this.';

export class Kitchen extends Scene {
    constructor() {
        super('Kitchen');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(0x111111);

        // Apply grayscale
        const saturation = GameState.getSaturation(this);
        if (saturation < 1) {
            this.cameras.main.postFX.addColorMatrix().grayscale(1 - saturation);
        }

        const gfx = this.add.graphics();

        // Floor
        gfx.fillStyle(0x333333, 1);
        gfx.fillRect(0, height * 0.7, width, height * 0.3);

        // Walls
        gfx.fillStyle(0x222222, 1);
        gfx.fillRect(0, height * 0.25, width, height * 0.45);

        // Back wall detail — tiles
        gfx.lineStyle(1, 0x2a2a2a, 0.4);
        for (let tx = 0; tx < width; tx += 30) {
            gfx.lineBetween(tx, height * 0.25, tx, height * 0.7);
        }
        for (let ty = height * 0.25; ty < height * 0.7; ty += 30) {
            gfx.lineBetween(0, ty, width, ty);
        }

        // Counter/shelf on left wall
        gfx.fillStyle(0x3a3a2a, 1);
        gfx.fillRect(50, height * 0.5, 200, 15);
        // Plates on counter
        gfx.fillStyle(0x555555, 1);
        gfx.fillCircle(90, height * 0.5 - 3, 10);
        gfx.fillCircle(140, height * 0.5 - 3, 10);

        // Table in center
        gfx.fillStyle(0x444433, 1);
        gfx.fillRect(width * 0.35, height * 0.55, 200, 12);
        // Table legs
        gfx.fillRect(width * 0.35 + 10, height * 0.55 + 12, 8, 50);
        gfx.fillRect(width * 0.35 + 182, height * 0.55 + 12, 8, 50);

        // Chair
        gfx.fillStyle(0x3a3a3a, 1);
        gfx.fillRect(width * 0.42, height * 0.55 + 15, 20, 40);
        gfx.fillRect(width * 0.42, height * 0.45, 20, 15);

        // Food tray on table
        gfx.fillStyle(0x666655, 1);
        gfx.fillRect(width * 0.45, height * 0.53, 30, 6);
        // Food blob
        gfx.fillStyle(0x777766, 1);
        gfx.fillCircle(width * 0.46 + 10, height * 0.52, 5);

        // Room label
        this.add.text(width * 0.5, height * 0.15, 'Kitchen', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#666666',
        }).setOrigin(0.5);

        // Prompt
        const prompt = this.add.text(width * 0.5, height * 0.82, '[E] Eat', {
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: '#888888',
        }).setOrigin(0.5);

        // Pulsing prompt
        this.tweens.add({
            targets: prompt,
            alpha: 0.4,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        let eaten = false;
        this.input.keyboard!.on('keydown-E', () => {
            if (eaten) return;
            eaten = true;
            prompt.destroy();

            const hasDog = GameState.hasCompanion(this, 'dog');
            const hasHuman = GameState.hasCompanion(this, 'human');
            const state = GameState.get(this);
            const hasSpice = state.collectedExoticPlants.includes('starspice');
            let msg = SOLO_MSG;
            if (hasHuman && hasSpice) msg = BOTH_SPICE_MSG;
            else if (hasHuman) msg = BOTH_MSG;
            else if (hasDog) msg = DOG_MSG;

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
                GameState.completeChore(this, 'kitchen');
                this.scene.start('Ship');
            });
        });
    }
}
