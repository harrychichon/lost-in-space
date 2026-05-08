import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';
import { AudioManager } from '../systems/AudioManager';

export class CavediverEvent extends Scene {
    private planetId = '';

    constructor() {
        super('CavediverEvent');
    }

    create(data: { planetId: string }) {
        const { width, height } = this.scale;
        this.planetId = data.planetId;

        this.cameras.main.setBackgroundColor(0x050505);

        GameState.applyGrayscale(this);
        AudioManager.playEvent(this, 'cavediver');

        // Cave walls — rough outline
        const walls = this.add.graphics();
        walls.fillStyle(0x1a1612, 1);
        walls.fillRect(0, 0, width, height);
        // Uneven rock silhouette
        walls.fillStyle(0x0a0806, 1);
        walls.fillTriangle(0, 0, 0, height, width * 0.15, height * 0.5);
        walls.fillTriangle(width, 0, width, height, width * 0.85, height * 0.5);
        walls.fillRect(0, height * 0.78, width, height * 0.22);

        // Stalactites from ceiling
        walls.fillStyle(0x0a0806, 1);
        for (let i = 0; i < 8; i++) {
            const sx = Phaser.Math.Between(width * 0.1, width * 0.9);
            const sh = Phaser.Math.Between(20, 60);
            walls.fillTriangle(sx - 8, 0, sx + 8, 0, sx, sh);
        }

        // Crystals — the source of the light
        const crystalGfx = this.add.graphics();
        const crystals = [
            { x: width * 0.52, y: height * 0.7, size: 14 },
            { x: width * 0.58, y: height * 0.72, size: 10 },
            { x: width * 0.47, y: height * 0.73, size: 8 },
            { x: width * 0.62, y: height * 0.71, size: 11 },
        ];
        for (const c of crystals) {
            crystalGfx.fillStyle(0xffcc66, 0.9);
            crystalGfx.fillTriangle(
                c.x - c.size / 2, c.y,
                c.x + c.size / 2, c.y,
                c.x, c.y - c.size * 1.5,
            );
            crystalGfx.fillStyle(0xffe8a8, 0.4);
            crystalGfx.fillTriangle(
                c.x - c.size / 4, c.y,
                c.x + c.size / 8, c.y,
                c.x - c.size / 8, c.y - c.size,
            );
        }

        // Warm glow around the crystals
        const glow = this.add.circle(width * 0.55, height * 0.7, 90, 0xffcc66, 0.18);
        this.tweens.add({
            targets: glow,
            alpha: 0.08,
            scale: 1.15,
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Mira — hunched over the crystals, headlamp on
        const mx = width * 0.55;
        const my = height * 0.66;
        const mira = this.add.graphics();
        // Legs (crouched)
        mira.fillStyle(0x554433, 1);
        mira.fillRect(mx - 6, my + 6, 4, 10);
        mira.fillRect(mx, my + 6, 4, 10);
        // Body
        mira.fillStyle(0x775544, 1);
        mira.fillRect(mx - 9, my - 8, 18, 16);
        // Arms reaching toward the crystals
        mira.fillStyle(0x775544, 1);
        mira.fillRect(mx + 6, my - 2, 10, 4);
        mira.fillRect(mx - 14, my - 2, 8, 4);
        // Head
        mira.fillStyle(0xbb9977, 1);
        mira.fillCircle(mx, my - 14, 7);
        // Helmet
        mira.lineStyle(2, 0x998866, 1);
        mira.strokeCircle(mx, my - 14, 9);
        // Headlamp
        mira.fillStyle(0xffe8a8, 1);
        mira.fillCircle(mx + 7, my - 14, 2.5);

        // Headlamp beam
        const beam = this.add.graphics();
        beam.fillStyle(0xffe8a8, 0.15);
        beam.fillTriangle(mx + 7, my - 14, mx + 60, my - 30, mx + 60, my);

        // --- Story text sequence ---
        const textStyle = {
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: '#c0cdd9',
            align: 'center' as const,
            wordWrap: { width: 620 },
        };

        const lines = [
            'The light isn\'t starlight.',
            'Someone has been living down here.',
            'She is hunched over a cluster of glowing crystals,\nworking a chisel.',
            'She looks up. Calm. Not surprised.',
            '"Took you long enough."',
            '"I\'ve mapped every cave on every rock we can reach.\nLet\'s go gather what\'s ours."',
        ];

        let lineIndex = 0;
        const storyText = this.add.text(width * 0.5, height * 0.78, '', textStyle)
            .setOrigin(0.5).setAlpha(0);

        const showNextLine = () => {
            if (lineIndex >= lines.length) {
                storyText.setText('She packs her gear. She follows you up.');
                this.tweens.add({
                    targets: storyText,
                    alpha: 1,
                    duration: 800,
                });
                this.time.delayedCall(2800, () => {
                    GameState.addCavediverCompanion(this);
                    AudioManager.clearEvent();
                    // Return to the planet surface rather than the ship —
                    // the cave stays entered-from-here.
                    this.scene.start('Planet', { planetId: this.planetId });
                });
                return;
            }

            storyText.setText(lines[lineIndex]);
            storyText.setAlpha(0);
            this.tweens.add({
                targets: storyText,
                alpha: 1,
                duration: 800,
                hold: 1800,
                yoyo: true,
                onComplete: () => {
                    lineIndex++;
                    showNextLine();
                },
            });
        };

        this.time.delayedCall(1000, showNextLine);
    }
}
