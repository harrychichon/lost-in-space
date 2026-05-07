import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';
import { SpaceBackground } from '../objects/SpaceBackground';

export class DayIntro extends Scene {
    private space!: SpaceBackground;

    constructor() {
        super('DayIntro');
    }

    create() {
        const state = GameState.get(this);
        const { width, height } = this.scale;
        const isCompanionEvent = GameState.isCompanionEventDay(this);
        const isDiscoveryDay = GameState.isPlanetDiscoveryDay(this) && !isCompanionEvent;

        this.cameras.main.setBackgroundColor(0x000000);

        this.space = new SpaceBackground(this);

        // Small spaceship shape
        const ship = this.add.graphics();
        ship.fillStyle(0x888888, 1);
        ship.fillRect(-30, -8, 60, 16);
        ship.fillStyle(0xaaaacc, 1);
        ship.fillTriangle(30, -8, 30, 8, 45, 0);
        ship.fillStyle(0x666666, 1);
        ship.fillRect(-40, -6, 10, 12);
        ship.setPosition(width * 0.5, height * 0.4);

        // Gentle drift
        this.tweens.add({
            targets: ship,
            x: ship.x + 30,
            y: ship.y - 5,
            duration: 4000,
            ease: 'Sine.easeInOut',
        });

        // Day text
        const dayText = this.add.text(width * 0.5, height * 0.65, `Day ${state.currentDay}`, {
            fontFamily: 'Georgia, serif',
            fontSize: '48px',
            color: '#cccccc',
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: dayText,
            alpha: 1,
            duration: 1500,
            ease: 'Power2',
        });

        // Companion event takes priority
        if (isCompanionEvent) {
            const subText = this.add.text(width * 0.5, height * 0.73, 'Sensors detect a faint life sign...', {
                fontFamily: 'Georgia, serif',
                fontSize: '20px',
                color: '#bbaaaa',
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: subText,
                alpha: 1,
                duration: 1500,
                delay: 1000,
                ease: 'Power2',
            });
        }

        // On discovery days: discover a new planet and announce it
        if (isDiscoveryDay) {
            const planet = GameState.discoverPlanet(this);

            const subText = this.add.text(width * 0.5, height * 0.73, `Sensors detect a planet: ${planet.name}`, {
                fontFamily: 'Georgia, serif',
                fontSize: '20px',
                color: '#999999',
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: subText,
                alpha: 1,
                duration: 1500,
                delay: 1000,
                ease: 'Power2',
            });
        }

        GameState.applyGrayscale(this);

        // Advance to next scene
        this.time.delayedCall(3500, () => {
            if (isCompanionEvent) {
                this.scene.start('CompanionEvent');
            } else {
                this.scene.start('Ship');
            }
        });
    }

    update(_time: number, delta: number) {
        this.space.update(delta);
    }
}
