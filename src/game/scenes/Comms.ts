import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

export class Comms extends Scene {
    constructor() {
        super('Comms');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(0x0f0f11);

        // Apply grayscale
        const saturation = GameState.getSaturation(this);
        if (saturation < 1) {
            this.cameras.main.postFX.addColorMatrix().grayscale(1 - saturation);
        }

        const gfx = this.add.graphics();

        // Floor
        gfx.fillStyle(0x2a2a2a, 1);
        gfx.fillRect(0, height * 0.7, width, height * 0.3);

        // Walls
        gfx.fillStyle(0x1a1a1e, 1);
        gfx.fillRect(0, height * 0.2, width, height * 0.5);

        // Console desk
        gfx.fillStyle(0x333338, 1);
        gfx.fillRect(width * 0.2, height * 0.55, width * 0.6, 15);
        // Desk legs
        gfx.fillRect(width * 0.22, height * 0.55 + 15, 8, 50);
        gfx.fillRect(width * 0.2 + width * 0.6 - 10, height * 0.55 + 15, 8, 50);

        // Main screen
        gfx.fillStyle(0x111118, 1);
        gfx.fillRect(width * 0.3, height * 0.3, width * 0.4, height * 0.22);
        gfx.lineStyle(2, 0x444455, 0.6);
        gfx.strokeRect(width * 0.3, height * 0.3, width * 0.4, height * 0.22);

        // Static/noise on screen
        for (let i = 0; i < 60; i++) {
            const sx = width * 0.31 + Math.random() * (width * 0.38);
            const sy = height * 0.31 + Math.random() * (height * 0.2);
            const bright = Math.random() * 0.2;
            gfx.fillStyle(Phaser.Display.Color.GetColor(
                Math.floor(255 * bright),
                Math.floor(255 * bright),
                Math.floor(255 * bright + 20)
            ), 1);
            gfx.fillRect(sx, sy, 2, 2);
        }

        // Small indicator lights on desk
        const lightColors = [0x335533, 0x553333, 0x333355, 0x335533];
        for (let i = 0; i < 4; i++) {
            gfx.fillStyle(lightColors[i], 0.8);
            gfx.fillCircle(width * 0.35 + i * 40, height * 0.54, 3);
        }

        // Chair
        gfx.fillStyle(0x333333, 1);
        gfx.fillRect(width * 0.47, height * 0.58, 24, 35);
        gfx.fillRect(width * 0.47, height * 0.48, 24, 12);

        // Room label
        this.add.text(width * 0.5, height * 0.15, 'Communications', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#666666',
        }).setOrigin(0.5);

        // Prompt
        const prompt = this.add.text(width * 0.5, height * 0.82, '[E] Listen', {
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

        let listened = false;
        this.input.keyboard!.on('keydown-E', () => {
            if (listened) return;
            listened = true;
            prompt.destroy();

            const isRescue = GameState.isRescueEventReady(this);
            const hasDog = GameState.hasCompanion(this, 'dog');
            const state = GameState.get(this);

            const hasHuman = GameState.hasCompanion(this, 'human');
            let msg: string;
            if (isRescue) {
                msg = '...not static. A voice. Faint, desperate.\n"Is anyone there? Please... I need help."';
            } else if (state.companions === 0) {
                msg = 'Static. Nothing but static.\nYou listen for a while anyway.';
            } else if (hasHuman) {
                msg = 'The botanist scans frequencies while you listen.\n"Nothing new. But at least we\'re listening together."';
            } else if (hasDog && state.companions === 1) {
                msg = 'Static. The dog tilts its head at the noise.\nAt least someone is listening with you.';
            } else {
                msg = 'Voices. Familiar now. Someone asks how you are.';
            }

            const text = this.add.text(width * 0.5, height * 0.82, msg, {
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                color: isRescue ? '#bbaaaa' : '#999999',
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
                GameState.completeChore(this, 'comms');
                if (isRescue) {
                    this.scene.start('RescueEvent');
                } else {
                    this.scene.start('Ship');
                }
            });
        });
    }
}
