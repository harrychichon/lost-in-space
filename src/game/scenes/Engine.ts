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
        this.cameras.main.setBackgroundColor(0x0f0f0f);
        this.setupRoom();

        const gfx = this.add.graphics();

        // Floor — metal grating
        gfx.fillStyle(0x2a2a2a, 1);
        gfx.fillRect(0, this.floorY, width, height * 0.3);
        gfx.lineStyle(1, 0x333333, 0.5);
        for (let lx = this.roomLeft; lx < this.roomRight; lx += 20) {
            gfx.lineBetween(lx, this.floorY, lx, height);
        }

        // Walls — darker, industrial
        gfx.fillStyle(0x1a1a1a, 1);
        gfx.fillRect(0, height * 0.2, width, height * 0.5);

        // Pipes along the top
        gfx.fillStyle(0x444444, 1);
        gfx.fillRect(this.roomLeft, height * 0.22, this.roomWidth, 8);
        gfx.fillRect(this.roomLeft, height * 0.28, this.roomWidth, 5);
        gfx.fillStyle(0x555555, 1);
        gfx.fillRect(this.roomLeft, height * 0.35, this.roomWidth, 6);

        // Engine block — large central machine
        gfx.fillStyle(0x3a3a3a, 1);
        gfx.fillRect(this.rx(0.25), height * 0.4, this.roomWidth * 0.5, height * 0.3);

        // Engine panels
        gfx.lineStyle(1, 0x555555, 0.6);
        gfx.strokeRect(this.rx(0.28), height * 0.42, this.roomWidth * 0.18, height * 0.12);
        gfx.strokeRect(this.rx(0.52), height * 0.42, this.roomWidth * 0.18, height * 0.12);

        // Gauges
        const gaugeColors = [0x668888, 0x886644, 0x668888];
        for (let i = 0; i < 3; i++) {
            const gx = this.rx(0.32) + i * 55;
            const gy = height * 0.46;
            gfx.fillStyle(0x222222, 1);
            gfx.fillCircle(gx, gy, 12);
            gfx.lineStyle(1, gaugeColors[i], 0.6);
            gfx.strokeCircle(gx, gy, 12);
            gfx.lineStyle(2, gaugeColors[i], 0.8);
            const angle = -0.5 + Math.random() * 1.0;
            gfx.lineBetween(gx, gy, gx + Math.cos(angle) * 8, gy + Math.sin(angle) * 8);
        }

        // Vent on right
        gfx.fillStyle(0x2a2a2a, 1);
        gfx.fillRect(this.rx(0.82), height * 0.4, 40, 60);
        for (let vy = 0; vy < 6; vy++) {
            gfx.fillStyle(0x1a1a1a, 1);
            gfx.fillRect(this.rx(0.82) + 5, height * 0.4 + 5 + vy * 10, 30, 4);
        }

        // Exit door
        this.addExitDoor(gfx, this.roomLeft + 25);

        // Room label
        this.add.text(width * 0.5, height * 0.15, 'Engine Room', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#666666',
        }).setOrigin(0.5);

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
