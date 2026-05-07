import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

export class CompanionEvent extends Scene {
    constructor() {
        super('CompanionEvent');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(0x000000);

        // Grayscale (still solo at this point)
        this.cameras.main.postFX.addColorMatrix().grayscale(1);

        // Starfield
        const gfx = this.add.graphics();
        for (let i = 0; i < 200; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const brightness = Phaser.Math.FloatBetween(0.3, 1);
            gfx.fillStyle(Phaser.Display.Color.GetColor(
                Math.floor(255 * brightness),
                Math.floor(255 * brightness),
                Math.floor(255 * brightness)
            ), 1);
            gfx.fillCircle(x, y, Phaser.Math.FloatBetween(0.5, 2));
        }

        // Ground — barren rocky surface
        const ground = this.add.graphics();
        ground.fillStyle(0x1a1a12, 1);
        ground.fillRect(0, height * 0.65, width, height * 0.35);
        ground.fillStyle(0x222218, 1);
        ground.fillCircle(width * 0.3, height * 0.65, 40);
        ground.fillCircle(width * 0.7, height * 0.65, 50);

        // Wrecked ship — broken hull
        const wreck = this.add.graphics();
        // Main hull (tilted, broken)
        wreck.fillStyle(0x555555, 1);
        wreck.fillRect(width * 0.35, height * 0.45, 180, 30);
        // Broken nose
        wreck.fillStyle(0x444444, 1);
        wreck.fillTriangle(
            width * 0.35 + 180, height * 0.45,
            width * 0.35 + 180, height * 0.45 + 30,
            width * 0.35 + 210, height * 0.45 + 25
        );
        // Damage marks
        wreck.fillStyle(0x333333, 1);
        wreck.fillRect(width * 0.35 + 40, height * 0.45 + 5, 15, 20);
        wreck.fillRect(width * 0.35 + 80, height * 0.45 + 8, 10, 15);
        // Debris on ground
        wreck.fillStyle(0x444444, 0.6);
        wreck.fillRect(width * 0.3, height * 0.63, 20, 8);
        wreck.fillRect(width * 0.55, height * 0.62, 12, 10);
        wreck.fillRect(width * 0.65, height * 0.64, 15, 6);

        // Dog — small figure near the wreck
        const dogX = width * 0.55;
        const dogY = height * 0.60;
        const dog = this.add.graphics();
        // Body
        dog.fillStyle(0x997755, 1);
        dog.fillEllipse(dogX, dogY, 28, 16);
        // Legs
        dog.fillStyle(0x886644, 1);
        dog.fillRect(dogX - 8, dogY + 6, 3, 8);
        dog.fillRect(dogX - 3, dogY + 6, 3, 8);
        dog.fillRect(dogX + 3, dogY + 6, 3, 8);
        dog.fillRect(dogX + 8, dogY + 6, 3, 8);
        // Tail (wagging via tween)
        const tail = this.add.graphics();
        tail.lineStyle(2, 0x886644, 1);
        tail.lineBetween(-2, 0, -2, -10);
        tail.setPosition(dogX - 14, dogY - 2);

        this.tweens.add({
            targets: tail,
            angle: { from: -20, to: 20 },
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Head
        dog.fillStyle(0xaa8866, 1);
        dog.fillCircle(dogX + 14, dogY - 6, 8);
        // Ears poking out
        dog.fillStyle(0x886644, 1);
        dog.fillTriangle(dogX + 8, dogY - 15, dogX + 13, dogY - 15, dogX + 10, dogY - 9);
        dog.fillTriangle(dogX + 15, dogY - 15, dogX + 20, dogY - 15, dogX + 17, dogY - 9);
        // Space helmet
        dog.lineStyle(2, 0x8899aa, 0.7);
        dog.strokeCircle(dogX + 14, dogY - 6, 11);
        dog.fillStyle(0xaabbcc, 0.15);
        dog.fillCircle(dogX + 11, dogY - 9, 4);
        // Eye through helmet
        dog.fillStyle(0x222222, 1);
        dog.fillCircle(dogX + 17, dogY - 8, 2);
        // Snout
        dog.fillStyle(0xbb9977, 1);
        dog.fillCircle(dogX + 20, dogY - 5, 2.5);

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
                    // Unlock the rubber ball on the first planet
                    GameState.unlockPlanetItem(this, 'rubber_ball');
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
}
