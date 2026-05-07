import { GameState } from '../systems/GameState';
import { RoomScene, InteractPoint } from './RoomScene';
import { SpaceBackground } from '../objects/SpaceBackground';

export class Comms extends RoomScene {
    private space!: SpaceBackground;

    constructor() {
        super('Comms');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(0x0f0f11);
        this.setupRoom();

        const gfx = this.add.graphics();

        // Floor
        gfx.fillStyle(0x2a2a2a, 1);
        gfx.fillRect(0, this.floorY, width, height * 0.3);

        // Walls
        gfx.fillStyle(0x1a1a1e, 1);
        gfx.fillRect(0, height * 0.2, width, height * 0.5);

        // Console desk
        gfx.fillStyle(0x333338, 1);
        gfx.fillRect(this.rx(0.25), height * 0.55, this.roomWidth * 0.5, 15);
        gfx.fillRect(this.rx(0.27), height * 0.55 + 15, 8, 50);
        gfx.fillRect(this.rx(0.73), height * 0.55 + 15, 8, 50);

        // Main screen — parallax space feed (a live transmission from outside)
        const screenX = this.rx(0.3);
        const screenY = height * 0.3;
        const screenW = this.roomWidth * 0.4;
        const screenH = height * 0.22;
        this.space = new SpaceBackground(this, {
            x: screenX, y: screenY, width: screenW, height: screenH,
            bgSpeed: 2, fl1Speed: 5, fl2Speed: 11,
        });
        // Faint horizontal scan lines to keep the "screen" feel
        const scan = this.add.graphics();
        scan.lineStyle(1, 0x88aaff, 0.05);
        for (let y = screenY; y < screenY + screenH; y += 3) {
            scan.lineBetween(screenX, y, screenX + screenW, y);
        }
        // Screen frame on top
        gfx.lineStyle(2, 0x444455, 0.6);
        gfx.strokeRect(screenX, screenY, screenW, screenH);

        // Indicator lights on desk
        const lightColors = [0x335533, 0x553333, 0x333355, 0x335533];
        for (let i = 0; i < 4; i++) {
            gfx.fillStyle(lightColors[i], 0.8);
            gfx.fillCircle(this.rx(0.35) + i * 35, height * 0.54, 3);
        }

        // Chair
        gfx.fillStyle(0x333333, 1);
        gfx.fillRect(this.rx(0.48), height * 0.58, 24, 35);
        gfx.fillRect(this.rx(0.48), height * 0.48, 24, 12);

        // Exit door
        this.addExitDoor(gfx, this.roomLeft + 25);

        // Room label
        this.add.text(width * 0.5, height * 0.15, 'Communications', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#666666',
        }).setOrigin(0.5);

        // --- Companions ---
        const state = GameState.get(this);
        const isRescue = GameState.isRescueEventReady(this);

        if (GameState.hasCompanion(this, 'dog')) {
            const dogX = this.rx(0.75);
            const dogGfx = this.add.graphics();
            this.drawDog(dogGfx, dogX, this.floorY - 10);

            this.interactPoints.push({
                x: dogX,
                label: 'Talk to dog',
                action: () => this.showMessage(
                    'The dog listens intently.\nYou know he will bark if he hears anything on the comms.'
                ),
            });
        }

        // --- Chore station (console) ---
        const choreX = this.rx(0.5);
        if (!state.chores.comms) {
            const chorePoint: InteractPoint = {
                x: choreX,
                label: 'Listen',
                action: () => {
                    if (this.transitioning) return;
                    GameState.completeChore(this, 'comms');
                    const idx = this.interactPoints.indexOf(chorePoint);
                    if (idx !== -1) this.interactPoints.splice(idx, 1);

                    if (isRescue) {
                        // Rescue event — special narrative transition
                        this.showMessage(
                            '...not static. A voice. Faint, desperate.\n"Is anyone there? Please... I need help."',
                            '#bbaaaa'
                        );
                        this.transitioning = true;
                        this.time.delayedCall(3000, () => {
                            this.scene.start('RescueEvent');
                        });
                    } else {
                        let msg: string;
                        if (state.companions === 0) {
                            msg = 'Static. Nothing but static.\nYou listen for a while anyway.';
                        } else {
                            msg = 'You scan the frequencies. Nothing new.';
                        }
                        this.showMessage(msg);
                        this.add.text(choreX, this.floorY - 85, '✓', {
                            fontFamily: 'Arial', fontSize: '22px', color: '#556655',
                        }).setOrigin(0.5).setDepth(5);
                    }
                },
            };
            this.interactPoints.push(chorePoint);
        } else {
            this.add.text(choreX, this.floorY - 85, '✓', {
                fontFamily: 'Arial', fontSize: '22px', color: '#556655',
            }).setOrigin(0.5).setDepth(5);
        }

        this.setupPlayerAndUI();
    }

    update(_time: number, delta: number) {
        this.space.update(delta);
        this.updateRoom();
    }
}
