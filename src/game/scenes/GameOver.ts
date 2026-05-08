import { Scene } from 'phaser';
import { AudioManager } from '../systems/AudioManager';

const LINES = [
    'The stars fade.\nThe ship drifts quietly into still space.',
    'They sit for a moment, then reach up and pull off their headset.\nThe hum of engines fades into the ordinary sounds of a room.\nA house. A home.',
    'They set it down on the desk and stand up.',
    'Before even turning around, they feel it —\na weight against their leg.\nWarm. Familiar.\nA dog looking up at them like they never left.',
    'They reach down and scratch her behind the ear.',
    'Then they turn their back to the screen\nand walk away.',
    'Some things are worth more than the stars.',
];

const FADE_IN_MS  = 1400;
const HOLD_MS     = 3200;
const FADE_OUT_MS = 900;
const FONT = "'Share Tech Mono', Consolas, monospace";

export class GameOver extends Scene {
    constructor() {
        super('GameOver');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x000000);
        AudioManager.stop(this);

        // Brief silence before the first word — the black holds after the fade.
        this.time.delayedCall(800, () => this.showLine(0));
    }

    private showLine(index: number): void {
        if (index >= LINES.length) return;

        const { width, height } = this.scale;
        const isLast = index === LINES.length - 1;

        const text = this.add.text(width / 2, height / 2, LINES[index], {
            fontFamily: FONT,
            fontSize: isLast ? '26px' : '22px',
            color: isLast ? '#e8e0cc' : '#aaaaaa',
            align: 'center',
            lineSpacing: 10,
            wordWrap: { width: width * 0.62 },
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: text,
            alpha: 1,
            duration: FADE_IN_MS,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.time.delayedCall(HOLD_MS, () => {
                    if (!isLast) {
                        this.tweens.add({
                            targets: text,
                            alpha: 0,
                            duration: FADE_OUT_MS,
                            ease: 'Sine.easeIn',
                            onComplete: () => {
                                text.destroy();
                                this.showLine(index + 1);
                            },
                        });
                    } else {
                        this.showReturnPrompt();
                    }
                });
            },
        });
    }

    private showReturnPrompt(): void {
        const { width, height } = this.scale;
        const prompt = this.add.text(width / 2, height * 0.72, 'press any key', {
            fontFamily: FONT,
            fontSize: '14px',
            color: '#444444',
            align: 'center',
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: prompt,
            alpha: 1,
            duration: 1800,
            ease: 'Sine.easeOut',
        });

        this.input.keyboard!.once('keydown', () => {
            this.cameras.main.fade(600, 0, 0, 0, false, (_: unknown, progress: number) => {
                if (progress === 1) this.scene.start('MainMenu');
            });
        });
        this.input.once('pointerdown', () => {
            this.cameras.main.fade(600, 0, 0, 0, false, (_: unknown, progress: number) => {
                if (progress === 1) this.scene.start('MainMenu');
            });
        });
    }
}
