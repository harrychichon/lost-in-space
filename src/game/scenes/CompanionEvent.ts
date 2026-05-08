import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';
import { AudioManager } from '../systems/AudioManager';
import { SpaceBackground } from '../objects/SpaceBackground';
import { createDogSprite } from '../objects/Dog';

export class CompanionEvent extends Scene {
    private space!: SpaceBackground;

    constructor() {
        super('CompanionEvent');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(0x000000);

        GameState.applyGrayscale(this);
        AudioManager.playEvent(this, 'companion_found');

        this.space = new SpaceBackground(this);

        // Ground — barren rocky surface
        const ground = this.add.graphics();
        ground.fillStyle(0x1a1a12, 1);
        ground.fillRect(0, height * 0.65, width, height * 0.35);
        ground.fillStyle(0x222218, 1);
        ground.fillCircle(width * 0.3, height * 0.65, 40);
        ground.fillCircle(width * 0.7, height * 0.65, 50);

        // Wrecked ship — same sprite used in DayIntro, tilted as if crashed
        const wreckShip = this.add.image(width * 0.42, height * 0.6, 'ship_default')
            .setOrigin(0.5)
            .setScale(0.12)
            .setRotation(0.35);
        wreckShip.setTint(0x666666);

        // Debris on ground
        const debris = this.add.graphics();
        debris.fillStyle(0x444444, 0.6);
        debris.fillRect(width * 0.3, height * 0.63, 20, 8);
        debris.fillRect(width * 0.55, height * 0.62, 12, 10);
        debris.fillRect(width * 0.65, height * 0.64, 15, 6);

        // Dog — small figure near the wreck
        const dogX = width * 0.55;
        const dogGroundY = height * 0.66;
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

    update(_time: number, delta: number) {
        this.space.update(delta);
    }
}
