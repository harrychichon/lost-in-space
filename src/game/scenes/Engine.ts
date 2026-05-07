import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

export class Engine extends Scene {
    constructor() {
        super('Engine');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(0x0f0f0f);

        // Apply grayscale
        const saturation = GameState.getSaturation(this);
        if (saturation < 1) {
            this.cameras.main.postFX.addColorMatrix().grayscale(1 - saturation);
        }

        const gfx = this.add.graphics();

        // Floor — metal grating
        gfx.fillStyle(0x2a2a2a, 1);
        gfx.fillRect(0, height * 0.7, width, height * 0.3);
        gfx.lineStyle(1, 0x333333, 0.5);
        for (let lx = 0; lx < width; lx += 20) {
            gfx.lineBetween(lx, height * 0.7, lx, height);
        }

        // Walls — darker, industrial
        gfx.fillStyle(0x1a1a1a, 1);
        gfx.fillRect(0, height * 0.2, width, height * 0.5);

        // Pipes along the top
        gfx.fillStyle(0x444444, 1);
        gfx.fillRect(0, height * 0.22, width, 8);
        gfx.fillRect(0, height * 0.28, width, 5);
        gfx.fillStyle(0x555555, 1);
        gfx.fillRect(0, height * 0.35, width, 6);

        // Engine block — large central machine
        gfx.fillStyle(0x3a3a3a, 1);
        gfx.fillRect(width * 0.3, height * 0.4, width * 0.4, height * 0.3);

        // Engine details — panels
        gfx.lineStyle(1, 0x555555, 0.6);
        gfx.strokeRect(width * 0.32, height * 0.42, width * 0.15, height * 0.12);
        gfx.strokeRect(width * 0.53, height * 0.42, width * 0.15, height * 0.12);

        // Gauges
        const gaugeColors = [0x668888, 0x886644, 0x668888];
        for (let i = 0; i < 3; i++) {
            const gx = width * 0.35 + i * 70;
            const gy = height * 0.46;
            gfx.fillStyle(0x222222, 1);
            gfx.fillCircle(gx, gy, 12);
            gfx.lineStyle(1, gaugeColors[i], 0.6);
            gfx.strokeCircle(gx, gy, 12);
            // Needle
            gfx.lineStyle(2, gaugeColors[i], 0.8);
            const angle = -0.5 + Math.random() * 1.0;
            gfx.lineBetween(gx, gy, gx + Math.cos(angle) * 8, gy + Math.sin(angle) * 8);
        }

        // Vent on right
        gfx.fillStyle(0x2a2a2a, 1);
        gfx.fillRect(width * 0.8, height * 0.4, 40, 60);
        for (let vy = 0; vy < 6; vy++) {
            gfx.fillStyle(0x1a1a1a, 1);
            gfx.fillRect(width * 0.8 + 5, height * 0.4 + 5 + vy * 10, 30, 4);
        }

        // Room label
        this.add.text(width * 0.5, height * 0.15, 'Engine Room', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#666666',
        }).setOrigin(0.5);

        // Prompt
        const prompt = this.add.text(width * 0.5, height * 0.82, '[E] Run diagnostics', {
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

        let checked = false;
        this.input.keyboard!.on('keydown-E', () => {
            if (checked) return;
            checked = true;
            prompt.destroy();

            const hasHuman = GameState.hasCompanion(this, 'human');
            const hasDog = GameState.hasCompanion(this, 'dog');
            const state = GameState.get(this);
            let msg: string;
            if (state.companions === 0) {
                msg = 'Everything reads normal. It always does.';
            } else if (hasHuman) {
                msg = 'Running hotter with three aboard.\nThe botanist points out a filter that needs replacing.\nYou hadn\'t noticed.';
            } else if (hasDog) {
                msg = 'The dog lies in the warm corner by the vents.\nGauges read normal.';
            } else {
                msg = 'Running a bit hotter with more life support online. Still within range.';
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
                GameState.completeChore(this, 'engine');
                this.scene.start('Ship');
            });
        });
    }
}
