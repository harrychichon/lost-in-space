import { Scene } from 'phaser';
import { AudioManager } from '../systems/AudioManager';

const LINES = [
    'The stars fade. The ship drifts quietly into still space.',
    'They sit for a moment, then reach up and pull off their headset.',
    'The hum of engines fades into the ordinary sounds of a room.',
    'A house.',
    'A home.',
    'They set down their headset on the desk and stand up.',
    'Before even turning around, they feel it…',
    'A weight against their leg. Warm. Familiar.',
    'A dog looking up at them like they never left.',
    'They reach down and scratch her behind the ear.',
    'Then they turn their back to the screen and walk away.',
    'Some things are worth more than the stars.',
];

const FADE_OUT_MS = 800;
const FONT = "'Share Tech Mono', Consolas, monospace";

// Hold and fade-in scale with word count so short lines hit quick,
// long lines have space to breathe.
function wordCount(line: string): number {
    return line.split(/\s+/).filter(w => w.length > 0).length;
}
function holdMs(line: string): number {
    return Math.min(4800, Math.max(1800, wordCount(line) * 250 + 1000));
}
function fadeInMs(line: string): number {
    return Math.min(1400, Math.max(500, wordCount(line) * 60 + 500));
}

export class GameOver extends Scene {
    constructor() {
        super('GameOver');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x000000);
        AudioManager.stop(this);

        this.time.delayedCall(900, () => this.showLine(0));
    }

    private showLine(index: number): void {
        if (index >= LINES.length) return;

        const { width, height } = this.scale;
        const line   = LINES[index];
        const isLast = index === LINES.length - 1;

        const text = this.add.text(width / 2, height / 2, line, {
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
            duration: fadeInMs(line),
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.time.delayedCall(holdMs(line), () => {
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
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: prompt,
            alpha: 1,
            duration: 2000,
            ease: 'Sine.easeOut',
        });

        const dismiss = () => {
            this.cameras.main.fade(600, 0, 0, 0, false, (_: unknown, progress: number) => {
                if (progress === 1) this.scene.start('MainMenu');
            });
        };
        this.input.keyboard!.once('keydown', dismiss);
        this.input.once('pointerdown', dismiss);
    }
}
