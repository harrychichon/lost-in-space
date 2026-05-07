import { GameState } from '../systems/GameState';
import { RoomScene, InteractPoint } from './RoomScene';
import { createDogSprite } from '../objects/Dog';

export class Kitchen extends RoomScene {
    constructor() {
        super('Kitchen');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(0x111111);
        this.setupRoom();
        const state = GameState.get(this);

        const gfx = this.add.graphics();

        // Ship hull backdrop
        gfx.fillStyle(0x1b1f2b, 1);
        gfx.fillRect(0, height * 0.18, width, height * 0.58);

        // Back wall panel
        gfx.fillStyle(0x242b3a, 1);
        gfx.fillRect(this.roomLeft, height * 0.24, this.roomWidth, height * 0.42);

        // Ceiling beam and light strips
        gfx.fillStyle(0x2e3546, 1);
        gfx.fillRect(this.roomLeft - 20, height * 0.21, this.roomWidth + 40, 12);
        gfx.fillStyle(0x8ec7ff, 0.35);
        gfx.fillRect(this.rx(0.08), height * 0.23, this.roomWidth * 0.26, 4);
        gfx.fillRect(this.rx(0.66), height * 0.23, this.roomWidth * 0.26, 4);

        // Vertical hull ribs
        gfx.fillStyle(0x1d2432, 0.9);
        for (let tx = this.roomLeft + 18; tx < this.roomRight; tx += 36) {
            gfx.fillRect(tx, height * 0.24, 3, height * 0.42);
        }

        // Portholes
        const portholeY = height * 0.33;
        for (const x of [this.rx(0.22), this.rx(0.5), this.rx(0.78)]) {
            gfx.fillStyle(0x131926, 1);
            gfx.fillCircle(x, portholeY, 28);
            gfx.lineStyle(4, 0x4f5f77, 1);
            gfx.strokeCircle(x, portholeY, 28);
            gfx.fillStyle(0xffffff, 0.35);
            gfx.fillCircle(x - 8, portholeY - 10, 2);
            gfx.fillCircle(x + 7, portholeY + 4, 1.5);
        }

        // Floor with subtle grid
        gfx.fillStyle(0x2a303f, 1);
        gfx.fillRect(0, this.floorY, width, height * 0.3);
        gfx.lineStyle(1, 0x3a4356, 0.35);
        for (let x = 0; x < width; x += 32) {
            gfx.lineBetween(x, this.floorY, x, height);
        }

        const furnitureBaseY = this.floorY + 2;

        // Main galley counter with drawers
        const counterX = this.rx(0.1);
        const counterTotalH = 86;
        const counterY = furnitureBaseY - counterTotalH;
        const counterW = this.roomWidth * 0.36;
        gfx.fillStyle(0x3f4658, 1);
        gfx.fillRect(counterX, counterY, counterW, 18);
        gfx.fillStyle(0x2f3647, 1);
        gfx.fillRect(counterX, counterY + 18, counterW, 68);
        gfx.lineStyle(2, 0x59627a, 0.7);
        gfx.strokeRect(counterX, counterY + 18, counterW, 68);
        for (let i = 1; i <= 2; i++) {
            const y = counterY + 18 + i * 22;
            gfx.lineStyle(1, 0x5f687f, 0.5);
            gfx.lineBetween(counterX + 8, y, counterX + counterW - 8, y);
        }

        // Sink, stove and prep light on the counter
        gfx.fillStyle(0x222937, 1);
        gfx.fillRect(counterX + 14, counterY + 3, 34, 10);
        gfx.lineStyle(1, 0x7ea7ca, 0.8);
        gfx.strokeRect(counterX + 14, counterY + 3, 34, 10);
        gfx.fillStyle(0x1a1a24, 1);
        gfx.fillCircle(counterX + counterW - 34, counterY + 9, 6);
        gfx.fillCircle(counterX + counterW - 20, counterY + 9, 6);
        gfx.fillStyle(0x8ec7ff, 0.4);
        gfx.fillRect(counterX + 8, counterY - 3, counterW - 16, 2);

        // Storage cabinet/fridge module
        const cabinetX = this.rx(0.86);
        const cabinetH = 150;
        const cabinetY = furnitureBaseY - cabinetH;
        gfx.fillStyle(0x364055, 1);
        gfx.fillRect(cabinetX - 34, cabinetY, 68, cabinetH);
        gfx.lineStyle(2, 0x58637d, 0.75);
        gfx.strokeRect(cabinetX - 34, cabinetY, 68, cabinetH);
        gfx.lineStyle(1, 0x6f7b96, 0.6);
        gfx.lineBetween(cabinetX - 34, cabinetY + 80, cabinetX + 34, cabinetY + 80);
        gfx.fillStyle(0x7db6ff, 0.7);
        gfx.fillRect(cabinetX - 6, cabinetY + 20, 12, 4);

        // Central dining table and bench
        const tableX = this.rx(0.56);
        const tableY = furnitureBaseY - 64;
        gfx.fillStyle(0x4a5367, 1);
        gfx.fillRect(tableX - 95, tableY, 190, 14);
        gfx.fillStyle(0x364055, 1);
        gfx.fillRect(tableX - 80, tableY + 14, 10, 50);
        gfx.fillRect(tableX + 70, tableY + 14, 10, 50);

        gfx.fillStyle(0x2e3646, 1);
        gfx.fillRect(tableX - 42, tableY + 27, 84, 12);
        gfx.fillRect(tableX - 45, tableY + 39, 8, 25);
        gfx.fillRect(tableX + 37, tableY + 39, 8, 25);

        // Food tray + cup on table
        gfx.fillStyle(0x6f7788, 1);
        gfx.fillRect(tableX + 12, tableY - 2, 32, 7);
        gfx.fillStyle(0xd0b87e, 1);
        gfx.fillCircle(tableX + 24, tableY - 1, 5);
        gfx.fillStyle(0xc6d0de, 1);
        gfx.fillRect(tableX - 16, tableY - 3, 7, 8);

        // Coffee maker on counter (once found in a cave)
        if (state.collectedCaveItems.includes('coffee_maker')) {
            this.drawCoffeeMaker(gfx, counterX + counterW * 0.55, counterY);
        }

        // Exit door
        this.addExitDoor(gfx, this.roomLeft + 25);

        // Room label
        this.add.text(width * 0.5, height * 0.15, 'Kitchen', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#666666',
        }).setOrigin(0.5);

        // --- Companions ---

        if (GameState.hasCompanion(this, 'dog')) {
            const dogX = this.rx(0.3);
            createDogSprite(this, dogX, this.floorY);
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

        if (GameState.hasCompanion(this, 'cavediver')) {
            const cdX = this.rx(0.68);
            const cdGfx = this.add.graphics();
            this.drawCavediver(cdGfx, cdX, this.floorY - 25);

            const hasCoffee = state.collectedCaveItems.includes('coffee_maker');
            const msg = hasCoffee
                ? 'Mira is cleaning out the coffee maker.\n"Takes work, but you\'ll thank me in the morning."'
                : '"Kitchen\'s better stocked now. I know where to dig."';
            this.interactPoints.push({
                x: cdX,
                label: 'Talk to Mira',
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
                    const hasCoffee = state.collectedCaveItems.includes('coffee_maker');
                    const hasSpice = state.collectedExoticPlants.includes('starspice');
                    let msg: string;
                    if (state.companions === 0) {
                        msg = 'You eat alone. The food has no taste.';
                    } else if (hasCoffee && hasSpice) {
                        msg = 'Starspice in the pot, coffee in the cup.\nThe crew eats together. Laughter carries down the corridor.';
                    } else if (hasCoffee) {
                        msg = 'Mira hands you a steaming mug. Real coffee.\nYou sit. You eat. You stay a while.';
                    } else if (hasSpice) {
                        msg = 'The botanist added Starspice to the meal.\nYou\'d forgotten food could taste like this.';
                    } else {
                        msg = 'You sit down to eat.';
                    }
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

    private drawCoffeeMaker(gfx: Phaser.GameObjects.Graphics, x: number, topY: number) {
        // Main body sits on the counter (topY is the counter surface)
        gfx.fillStyle(0x2f2f2f, 1);
        gfx.fillRect(x - 9, topY - 20, 18, 20);
        // Reservoir / top cap
        gfx.fillStyle(0x444444, 1);
        gfx.fillRect(x - 10, topY - 24, 20, 4);
        // Carafe recess
        gfx.fillStyle(0x1a1a1a, 1);
        gfx.fillRect(x - 6, topY - 14, 12, 14);
        // Dark liquid
        gfx.fillStyle(0x241208, 1);
        gfx.fillRect(x - 5, topY - 9, 10, 6);
        // Carafe handle
        gfx.lineStyle(1, 0x555555, 0.9);
        gfx.strokeRect(x + 6, topY - 11, 3, 7);

        // Steam wisps rising from the top cap
        const spawnSteam = () => {
            const wisp = this.add.circle(
                x + Phaser.Math.Between(-3, 3),
                topY - 24,
                1.5 + Math.random() * 1.2,
                0xccccbb,
                0.5,
            );
            this.tweens.add({
                targets: wisp,
                y: wisp.y - 40 - Math.random() * 15,
                x: wisp.x + (Math.random() - 0.5) * 10,
                alpha: 0,
                scale: 2,
                duration: 1800 + Math.random() * 700,
                ease: 'Sine.easeOut',
                onComplete: () => wisp.destroy(),
            });
        };
        // Initial puff so it's visible on entry
        for (let i = 0; i < 2; i++) spawnSteam();
        this.time.addEvent({
            delay: 900,
            loop: true,
            callback: spawnSteam,
        });
    }
}
