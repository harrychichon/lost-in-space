import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

export class RescueEvent extends Scene {
    constructor() {
        super('RescueEvent');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(0x000000);

        // Still mostly grayscale but slightly shifting
        const saturation = GameState.getSaturation(this);
        this.cameras.main.postFX.addColorMatrix().grayscale(1 - saturation);

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

        // Drifting escape pod
        const pod = this.add.graphics();
        // Pod hull
        pod.fillStyle(0x666666, 1);
        pod.fillEllipse(0, 0, 50, 30);
        // Window
        pod.fillStyle(0x334455, 1);
        pod.fillCircle(12, -4, 8);
        pod.lineStyle(1, 0x888888, 0.6);
        pod.strokeCircle(12, -4, 8);
        // Damage
        pod.fillStyle(0x444444, 1);
        pod.fillRect(-20, 2, 8, 6);
        // Blinking distress light
        const light = this.add.circle(22, -10, 3, 0xaa4444, 0.8);

        pod.setPosition(width * 0.5, height * 0.4);
        light.setPosition(width * 0.5 + 22, height * 0.4 - 10);

        // Pod drifts slowly
        this.tweens.add({
            targets: [pod, light],
            x: '+=15',
            y: '+=8',
            angle: 3,
            duration: 5000,
            ease: 'Sine.easeInOut',
        });

        // Blinking distress light
        this.tweens.add({
            targets: light,
            alpha: 0.1,
            duration: 500,
            yoyo: true,
            repeat: -1,
        });

        // Figure visible through the window — a person
        const person = this.add.graphics();
        person.fillStyle(0x998877, 1);
        person.fillCircle(width * 0.5 + 12, height * 0.4 - 5, 4);
        person.setAlpha(0.6);

        // Story text sequence
        const textStyle = {
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: '#999999',
            align: 'center' as const,
            wordWrap: { width: 600 },
        };

        const lines = [
            'You follow the signal.',
            'An escape pod. Barely intact.',
            'Someone is inside.',
            '"Thank you... I thought no one would come."',
            'A botanist. Stranded for weeks.',
            '"I can help. I know plants — food, medicine, everything."',
        ];

        let lineIndex = 0;
        const storyText = this.add.text(width * 0.5, height * 0.75, '', textStyle)
            .setOrigin(0.5).setAlpha(0);

        const showNextLine = () => {
            if (lineIndex >= lines.length) {
                storyText.setText('They board your ship. The silence feels different now.');
                storyText.setColor('#aaaaaa');
                this.tweens.add({
                    targets: storyText,
                    alpha: 1,
                    duration: 800,
                });
                this.time.delayedCall(3000, () => {
                    GameState.addCompanion(this, {
                        id: 'human',
                        name: 'Botanist',
                        type: 'human',
                        foundDay: GameState.get(this).currentDay,
                    });
                    // Unlock all exotic plants on discovered planets
                    GameState.unlockExoticPlants(this);
                    this.scene.start('Ship');
                });
                return;
            }

            storyText.setText(lines[lineIndex]);
            storyText.setAlpha(0);

            // The botanist's dialogue lines get a warmer color
            if (lines[lineIndex].startsWith('"')) {
                storyText.setColor('#bbaa99');
            } else {
                storyText.setColor('#999999');
            }

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
