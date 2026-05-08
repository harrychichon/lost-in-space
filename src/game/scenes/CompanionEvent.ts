import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';
import { AudioManager } from '../systems/AudioManager';
import { createDogSprite } from '../objects/Dog';

export class CompanionEvent extends Scene {
    constructor() {
        super('CompanionEvent');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(0x000000);

        GameState.applyGrayscale(this);
        AudioManager.playEvent(this, 'companion_found');

        const bg = this.add.image(width * 0.5, height * 0.5, 'bg_companion_event').setDepth(-100);
        bg.setDisplaySize(width, height);

        // Twinkling stars overlay
        for (let i = 0; i < 60; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height * 0.6),
                Phaser.Math.Between(1, 4),
                0xffffff,
                Phaser.Math.FloatBetween(0.3, 0.9),
            ).setDepth(-50);
            this.tweens.add({
                targets: star,
                alpha: { from: star.alpha, to: Phaser.Math.FloatBetween(0.05, 0.3) },
                duration: Phaser.Math.Between(800, 3000),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000),
                ease: 'Sine.easeInOut',
            });
        }

        // Ship — floats in space, same drift as DayIntro
        const ship = this.add.image(width * 0.5, height * 0.4, 'ship_default').setOrigin(0.5);
        ship.setScale(0.12);
        this.tweens.add({
            targets: ship,
            x: ship.x + 30,
            y: ship.y - 5,
            duration: 4000,
            ease: 'Sine.easeInOut',
        });

        // Dog — small figure near the wreck
        const dogX = width * 0.55;
        const dogGroundY = height * 0.66 + 30;
        createDogSprite(this, dogX, dogGroundY);

        // --- Story text sequence ---
        const textStyle = {
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: '#999999',
            align: 'center' as const,
            wordWrap: { width: 600 },
        };

        const lines = [
            'A wrecked ship. No survivors.',
            '...',
            'Something moves in the debris.',
            'A dog. Thin, but alive.',
            'It looks up at you.',
        ];

        let lineIndex = 0;
        const storyText = this.add.text(width * 0.5, height * 0.85, '', textStyle)
            .setOrigin(0.5).setAlpha(0);

        const showNextLine = () => {
            if (lineIndex >= lines.length) {
                // Final prompt
                storyText.setText('It follows you back to the ship.');
                this.tweens.add({
                    targets: storyText,
                    alpha: 1,
                    duration: 800,
                });
                this.time.delayedCall(2500, () => {
                    // Add the dog as a companion
                    GameState.addCompanion(this, {
                        id: 'dog',
                        name: 'Dog',
                        type: 'dog',
                        foundDay: GameState.get(this).currentDay,
                    });
                    // Unlock all dog toys on planets
                    GameState.unlockDogToys(this);
                    AudioManager.clearEvent();
                    this.scene.start('Ship');
                });
                return;
            }

            storyText.setText(lines[lineIndex]);
            storyText.setAlpha(0);
            this.tweens.add({
                targets: storyText,
                alpha: 1,
                duration: 800,
                hold: 1500,
                yoyo: true,
                onComplete: () => {
                    lineIndex++;
                    showNextLine();
                },
            });
        };

        // Start sequence after a brief pause
        this.time.delayedCall(1000, showNextLine);
    }

    update() {}
}
