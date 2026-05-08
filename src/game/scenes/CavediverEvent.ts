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

        // Exit arch on the left wall — warm daylight pouring in (matches Cave scene)
        const groundY = height * 0.75;
        const exitX = 60;
        const exitGfx = this.add.graphics();
        const drawArch = (g: Phaser.GameObjects.Graphics, cx: number, baseY: number, halfW: number, h: number) => {
            const archCenterY = baseY - h + halfW;
            g.beginPath();
            g.moveTo(cx - halfW, baseY);
            g.lineTo(cx - halfW, archCenterY);
            g.arc(cx, archCenterY, halfW, Math.PI, 0, false);
            g.lineTo(cx + halfW, baseY);
            g.closePath();
            g.fillPath();
        };
        exitGfx.fillStyle(0x2a2026, 1);
        drawArch(exitGfx, exitX, groundY, 38, 105);
        const lightShades = [0x553322, 0x995533, 0xddaa55, 0xffeebb];
        const lightScale  = [0.95,     0.78,     0.60,     0.42    ];
        lightShades.forEach((shade, i) => {
            exitGfx.fillStyle(shade, 1);
            drawArch(exitGfx, exitX, groundY, 35 * lightScale[i], 100 * lightScale[i]);
        });
        const ambient = this.add.circle(exitX + 30, groundY - 40, 70, 0xffcc88, 0.15);
        this.tweens.add({
            targets: ambient,
            alpha: 0.08,
            scale: 1.15,
            duration: 1600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Mira — cavediver sprite, same size as on the ship, standing on the cave floor
        const mira = this.add.image(width * 0.55, groundY, 'cavediver', 'frame0').setOrigin(0.5, 1);
        mira.displayHeight = 80;
        mira.scaleX = mira.scaleY;

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
