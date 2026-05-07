import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';
import { SpaceBackground } from '../objects/SpaceBackground';

export class MainMenu extends Scene {
    private space!: SpaceBackground;

    constructor() {
        super('MainMenu');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(0x000000);

        this.space = new SpaceBackground(this);

        // Title
        const title = this.add.text(width * 0.5, height * 0.35, 'Lost in Space', {
            fontFamily: 'Georgia, serif',
            fontSize: '52px',
            color: '#888888',
        }).setOrigin(0.5).setAlpha(0);

        // Subtitle
        const subtitle = this.add.text(width * 0.5, height * 0.45, 'A game about being alone', {
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: '#555555',
        }).setOrigin(0.5).setAlpha(0);

        // Start prompt
        const prompt = this.add.text(width * 0.5, height * 0.65, 'Click to begin', {
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            color: '#444444',
        }).setOrigin(0.5).setAlpha(0);

        // Fade in sequence
        this.tweens.add({ targets: title, alpha: 1, duration: 2000, ease: 'Power2' });
        this.tweens.add({ targets: subtitle, alpha: 1, duration: 2000, delay: 800, ease: 'Power2' });
        this.tweens.add({
            targets: prompt,
            alpha: 0.7,
            duration: 1500,
            delay: 2000,
            ease: 'Power2',
            onComplete: () => {
                // Pulse the prompt
                this.tweens.add({
                    targets: prompt,
                    alpha: 0.3,
                    duration: 1200,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            },
        });

        this.game.canvas.style.filter = 'grayscale(100%)';

        // Click to start
        this.input.once('pointerdown', () => {
            GameState.init(this);
            this.scene.start('DayIntro');
        });
    }

    update(_time: number, delta: number) {
        this.space.update(delta);
    }
}
