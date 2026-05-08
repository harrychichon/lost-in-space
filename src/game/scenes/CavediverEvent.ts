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

        this.cameras.main.setBackgroundColor(0x07060a);

        GameState.applyGrayscale(this);
        AudioManager.playEvent(this, 'cavediver');

        // Cave walls — match the regular Cave scene
        const walls = this.add.graphics();
        walls.fillStyle(0x141018, 1);
        walls.fillRect(0, 0, width, height);
        // Ceiling silhouette
        walls.fillStyle(0x080610, 1);
        walls.fillRect(0, 0, width, height * 0.2);
        const numSpikes = 12;
        for (let i = 0; i < numSpikes; i++) {
            const sx = (i + 0.5) * (width / numSpikes);
            const sh = Phaser.Math.Between(20, 70);
            walls.fillTriangle(sx - 10, height * 0.2, sx + 10, height * 0.2, sx, height * 0.2 + sh);
        }
        // Floor
        walls.fillStyle(0x1a1520, 1);
        walls.fillRect(0, height * 0.75, width, height * 0.25);
        // Stalagmites
        walls.fillStyle(0x0e0a14, 1);
        for (let i = 0; i < 6; i++) {
            const sx = Phaser.Math.Between(40, width - 40);
            const sh = Phaser.Math.Between(18, 40);
            walls.fillTriangle(sx - 8, height * 0.75, sx + 8, height * 0.75, sx, height * 0.75 - sh);
        }

        // Ambient glowing crystals scattered around (background light)
        for (let i = 0; i < 5; i++) {
            const ax = Phaser.Math.Between(60, width - 60);
            const ay = Phaser.Math.Between(height * 0.35, height * 0.72);
            const glow = this.add.circle(ax, ay, 4, 0xaaccff, 0.6);
            this.tweens.add({
                targets: glow,
                alpha: 0.2,
                duration: 900 + i * 150,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
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

        // Mira — cavediver sprite frame 0
        const mx = width * 0.55;
        const my = height * 0.62;
        const mira = this.add.image(mx, my, 'cavediver', 'frame0').setOrigin(0.5, 1);
        mira.displayHeight = 160;
        mira.scaleX = mira.scaleY;

        // Headlamp beam — origin at sprite head
        const beam = this.add.graphics();
        beam.fillStyle(0xffe8a8, 0.15);
        beam.fillTriangle(mx, my - 130, mx + 70, my - 150, mx + 70, my - 110);

        // --- Story text sequence ---
        const textStyle = {
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: '#cccc99',
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
        const storyText = this.add.text(width * 0.5, height * 0.88, '', textStyle)
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
