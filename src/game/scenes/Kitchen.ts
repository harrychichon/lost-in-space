import { GameState } from '../systems/GameState';
import { RoomScene, InteractPoint } from './RoomScene';

export class Kitchen extends RoomScene {
    constructor() {
        super('Kitchen');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(0x111111);
        this.setupRoom();

        const gfx = this.add.graphics();

        // Floor
        gfx.fillStyle(0x333333, 1);
        gfx.fillRect(0, this.floorY, width, height * 0.3);

        // Walls
        gfx.fillStyle(0x222222, 1);
        gfx.fillRect(0, height * 0.25, width, height * 0.45);

        // Wall tiles
        gfx.lineStyle(1, 0x2a2a2a, 0.4);
        for (let tx = this.roomLeft; tx < this.roomRight; tx += 30) {
            gfx.lineBetween(tx, height * 0.25, tx, this.floorY);
        }
        for (let ty = height * 0.25; ty < this.floorY; ty += 30) {
            gfx.lineBetween(this.roomLeft, ty, this.roomRight, ty);
        }

        // Counter/shelf
        gfx.fillStyle(0x3a3a2a, 1);
        gfx.fillRect(this.rx(0.15), height * 0.5, 150, 15);
        gfx.fillStyle(0x555555, 1);
        gfx.fillCircle(this.rx(0.2), height * 0.5 - 3, 10);
        gfx.fillCircle(this.rx(0.28), height * 0.5 - 3, 10);

        // Table
        const tableX = this.rx(0.55);
        gfx.fillStyle(0x444433, 1);
        gfx.fillRect(tableX - 80, height * 0.55, 160, 12);
        gfx.fillRect(tableX - 70, height * 0.55 + 12, 8, 50);
        gfx.fillRect(tableX + 62, height * 0.55 + 12, 8, 50);

        // Chair
        gfx.fillStyle(0x3a3a3a, 1);
        gfx.fillRect(tableX - 30, height * 0.55 + 15, 20, 40);
        gfx.fillRect(tableX - 30, height * 0.45, 20, 15);

        // Food tray on table
        gfx.fillStyle(0x666655, 1);
        gfx.fillRect(tableX + 10, height * 0.53, 30, 6);
        gfx.fillStyle(0x777766, 1);
        gfx.fillCircle(tableX + 20, height * 0.52, 5);

        // Exit door
        this.addExitDoor(gfx, this.roomLeft + 25);

        // Room label
        this.add.text(width * 0.5, height * 0.15, 'Kitchen', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#666666',
        }).setOrigin(0.5);

        // --- Companions ---
        const state = GameState.get(this);

        if (GameState.hasCompanion(this, 'dog')) {
            const dogX = this.rx(0.3);
            const dogGfx = this.add.graphics();
            this.drawDog(dogGfx, dogX, this.floorY - 10);
            // Food bowl
            gfx.fillStyle(0x666666, 1);
            gfx.fillRect(dogX + 20, this.floorY - 4, 14, 4);
            gfx.fillStyle(0x777766, 0.6);
            gfx.fillCircle(dogX + 27, this.floorY - 5, 4);

            this.interactPoints.push({
                x: dogX,
                label: 'Talk to dog',
                action: () => this.showMessage(
                    'The dog wolfs down food from its bowl.\nIt looks up at you, tail wagging.'
                ),
            });
        }

        if (GameState.hasCompanion(this, 'human')) {
            const botX = this.rx(0.82);
            const botGfx = this.add.graphics();
            this.drawCompanionHuman(botGfx, botX, this.floorY - 25);

            const hasSpice = state.collectedExoticPlants.includes('starspice');
            const msg = hasSpice
                ? 'The botanist added Starspice to the meal.\nYou\'d forgotten food could taste like this.'
                : '"Not bad, right?" the botanist says.\nThey\'ve been experimenting with what little they have.';
            this.interactPoints.push({
                x: botX,
                label: 'Talk to botanist',
                action: () => this.showMessage(msg),
            });
        }

        // --- Chore station (table) ---
        const choreX = tableX + 20;
        if (!state.chores.kitchen) {
            const chorePoint: InteractPoint = {
                x: choreX,
                label: 'Eat',
                action: () => {
                    if (this.transitioning) return;
                    GameState.completeChore(this, 'kitchen');
                    const idx = this.interactPoints.indexOf(chorePoint);
                    if (idx !== -1) this.interactPoints.splice(idx, 1);
                    const msg = state.companions === 0
                        ? 'You eat alone. The food has no taste.'
                        : 'You sit down to eat.';
                    this.showMessage(msg);
                    this.add.text(choreX, this.floorY - 85, '✓', {
                        fontFamily: 'Arial', fontSize: '22px', color: '#556655',
                    }).setOrigin(0.5).setDepth(5);
                },
            };
            this.interactPoints.push(chorePoint);
        } else {
            this.add.text(choreX, this.floorY - 85, '✓', {
                fontFamily: 'Arial', fontSize: '22px', color: '#556655',
            }).setOrigin(0.5).setDepth(5);
        }

        // Player and UI (on top of everything)
        this.setupPlayerAndUI();
    }

    update() {
        this.updateRoom();
    }
}
