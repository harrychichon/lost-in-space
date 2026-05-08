import { GameState } from '../systems/GameState';
import { RoomScene, InteractPoint } from './RoomScene';
import { drawDayIndicator } from '../objects/DayIndicator';
import { drawResourceBars } from '../objects/ResourceBars';
import { drawChoreChecklist } from '../objects/ChoreChecklist';

export class Engine extends RoomScene {
    constructor() {
        super('Engine');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(0x000000);
        this.setupRoom();

        // Background image — scale to fit full height so nothing is cropped
        const bgImg = this.add.image(width * 0.5, height * 0.5 + 85, 'bg_engine').setDepth(-100);
        const scale = Math.min(width / bgImg.width, height / bgImg.height) * 1.15;
        bgImg.setScale(scale);

        const gfx = this.add.graphics();

        // Blinking indicator lights — positioned over the lamp panel in the bg image
        const lights: { color: number; x: number; y: number; minAlpha: number; maxAlpha: number; duration: number }[] = [
            { color: 0xffaa00, x: width * 0.845, y: height * 0.495, minAlpha: 0.2, maxAlpha: 1.0, duration: 420 },
            { color: 0x44aaff, x: width * 0.845, y: height * 0.545, minAlpha: 0.1, maxAlpha: 0.9, duration: 700 },
            { color: 0xff4422, x: width * 0.845, y: height * 0.595, minAlpha: 0.15, maxAlpha: 1.0, duration: 310 },
        ];
        for (const l of lights) {
            // Glow halo
            const halo = this.add.circle(l.x, l.y, 7, l.color, 0.25).setDepth(20);
            // Core dot
            const dot = this.add.circle(l.x, l.y, 3.5, l.color, l.maxAlpha).setDepth(21);
            this.tweens.add({
                targets: [dot, halo],
                alpha: { from: l.maxAlpha, to: l.minAlpha },
                duration: l.duration,
                yoyo: true,
                repeat: -1,
                ease: 'Stepped',
                easeParams: [1],
            });
        }

        // Exit door — hidden visually but interaction still active
        const doorCountBefore = this.children.length;
        this.addExitDoor(gfx, this.roomLeft + 45);
        const doorImg = this.children.getAt(doorCountBefore) as Phaser.GameObjects.Image;
        if (doorImg) doorImg.setVisible(false);

        // --- Companions ---
        const state = GameState.get(this);

        if (GameState.hasCompanion(this, 'cavediver')) {
            const cdX = this.rx(0.7);
            const cdGfx = this.add.graphics();
            this.drawCavediver(cdGfx, cdX, this.floorY - 25);

            this.interactPoints.push({
                x: cdX,
                label: 'Talk to Mira',
                action: () => this.showMessage(
                    'Mira is elbow-deep in the engine, swapping in cave-forged parts.\n"This old rig\'s going to last us a while longer."'
                ),
            });
        }

        // --- Chore station (engine gauges) ---
        const choreX = this.rx(0.5);
        if (!state.chores.engine) {
            const chorePoint: InteractPoint = {
                x: choreX,
                label: 'Run diagnostics',
                action: () => {
                    if (this.transitioning) return;
                    GameState.completeChore(this, 'engine');
                    const idx = this.interactPoints.indexOf(chorePoint);
                    if (idx !== -1) this.interactPoints.splice(idx, 1);

                    this.sound.play('beep_sequence', { volume: 0.5 });

                    const hasCavediver = GameState.hasCompanion(this, 'cavediver');
                    let msg: string;
                    if (state.companions === 0) {
                        msg = 'Everything reads normal. It always does.';
                    } else if (hasCavediver) {
                        msg = 'Mira\'s patchwork holds. The gauges settle into the green.';
                    } else {
                        msg = 'Gauges read normal. Running a bit hotter with more life support online.';
                    }
                    this.showMessage(msg);
                },
            };
            this.interactPoints.push(chorePoint);
        }

        this.setupPlayerAndUI();

        drawDayIndicator(this, state);
        drawResourceBars(this, state);
        drawChoreChecklist(this, state);
    }

    update() {
        this.updateRoom();
    }
}
