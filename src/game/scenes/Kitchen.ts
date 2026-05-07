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

        // Ship hull backdrop (dark steel with warm highlights)
        gfx.fillStyle(0x141821, 1);
        gfx.fillRect(0, height * 0.18, width, height * 0.58);

        // Back wall panel
        gfx.fillStyle(0x1f252f, 1);
        gfx.fillRect(this.roomLeft, height * 0.24, this.roomWidth, height * 0.42);

        // Ceiling beam and light strips
        gfx.fillStyle(0x3b3127, 1);
        gfx.fillRect(this.roomLeft - 20, height * 0.21, this.roomWidth + 40, 12);
        gfx.fillStyle(0xe7bb73, 0.32);
        gfx.fillRect(this.rx(0.08), height * 0.23, this.roomWidth * 0.26, 4);
        gfx.fillRect(this.rx(0.66), height * 0.23, this.roomWidth * 0.26, 4);

        // Vertical hull ribs
        gfx.fillStyle(0x252d3a, 0.9);
        for (let tx = this.roomLeft + 18; tx < this.roomRight; tx += 36) {
            gfx.fillRect(tx, height * 0.24, 3, height * 0.42);
        }

        // Portholes
        const portholeY = height * 0.33;
        for (const x of [this.rx(0.22), this.rx(0.5), this.rx(0.78)]) {
            gfx.fillStyle(0x0f141e, 1);
            gfx.fillCircle(x, portholeY, 28);
            gfx.lineStyle(4, 0x7a6550, 1);
            gfx.strokeCircle(x, portholeY, 28);
            gfx.fillStyle(0xffffff, 0.35);
            gfx.fillCircle(x - 8, portholeY - 10, 2);
            gfx.fillCircle(x + 7, portholeY + 4, 1.5);
        }

        // Floor with subtle warm metal grid
        gfx.fillStyle(0x2a2019, 1);
        gfx.fillRect(0, this.floorY, width, height * 0.3);
        gfx.lineStyle(1, 0x4a392d, 0.4);
        for (let x = 0; x < width; x += 32) {
            gfx.lineBetween(x, this.floorY, x, height);
        }
        gfx.lineStyle(1, 0x3d2e23, 0.35);
        for (let y = this.floorY; y < height; y += 30) {
            gfx.lineBetween(0, y, width, y);
        }

        const furnitureScale = 0.45;
        const furnitureBaseY = this.floorY + 2;

        // Green backsplash tile strip behind work surfaces
        const backsplashY = this.floorY - 112 * furnitureScale;
        const backsplashH = 60 * furnitureScale;
        gfx.fillStyle(0x1b3c33, 0.95);
        gfx.fillRect(this.roomLeft + 12, backsplashY, this.roomWidth - 24, backsplashH);
        gfx.lineStyle(1, 0x2c594d, 0.45);
        for (let tx = this.roomLeft + 12; tx < this.roomRight - 12; tx += 24 * furnitureScale) {
            gfx.lineBetween(tx, backsplashY, tx, backsplashY + backsplashH);
        }
        for (let ty = backsplashY; ty < backsplashY + backsplashH; ty += 18 * furnitureScale) {
            gfx.lineBetween(this.roomLeft + 12, ty, this.roomRight - 12, ty);
        }

        // Main galley counter with drawers (scaled down 20%)
        const counterX = this.rx(0.28); //position for stove
        const counterW = this.roomWidth * 0.36 * furnitureScale;
        const counterTopH = 18 * furnitureScale;
        const counterBodyH = 68 * furnitureScale;
        const counterTotalH = counterTopH + counterBodyH;
        const counterY = furnitureBaseY - counterTotalH;
        gfx.fillStyle(0x8b6238, 1);
        gfx.fillRect(counterX, counterY, counterW, counterTopH);
        gfx.fillStyle(0x6c4b2d, 1);
        gfx.fillRect(counterX, counterY + counterTopH, counterW, counterBodyH);
        gfx.lineStyle(2, 0xa57a4d, 0.7);
        gfx.strokeRect(counterX, counterY + counterTopH, counterW, counterBodyH);
        for (let i = 1; i <= 2; i++) {
            const y = counterY + counterTopH + i * (22 * furnitureScale);
            gfx.lineStyle(1, 0x9a7247, 0.5);
            gfx.lineBetween(counterX + 8, y, counterX + counterW - 8, y);
        }

        // Sink, stove and prep light on the counter
        gfx.fillStyle(0x4a5158, 1);
        gfx.fillRect(counterX + 14 * furnitureScale, counterY + 3 * furnitureScale, 34 * furnitureScale, 10 * furnitureScale);
        gfx.lineStyle(1, 0x8f9da8, 0.8);
        gfx.strokeRect(counterX + 14 * furnitureScale, counterY + 3 * furnitureScale, 34 * furnitureScale, 10 * furnitureScale);
        gfx.fillStyle(0x242228, 1);
        gfx.fillCircle(counterX + counterW - 34 * furnitureScale, counterY + 9 * furnitureScale, 6 * furnitureScale);
        gfx.fillCircle(counterX + counterW - 20 * furnitureScale, counterY + 9 * furnitureScale, 6 * furnitureScale);
        gfx.fillStyle(0xe7bb73, 0.35);
        gfx.fillRect(counterX + 8 * furnitureScale, counterY - 3 * furnitureScale, counterW - 16 * furnitureScale, 2 * furnitureScale);

        // Storage cabinet/fridge module (scaled down 20%)
        const cabinetX = this.rx(0.86);
        const cabinetW = 68 * furnitureScale;
        const cabinetH = 150 * furnitureScale;
        const cabinetY = furnitureBaseY - cabinetH;
        gfx.fillStyle(0x7a5634, 1);
        gfx.fillRect(cabinetX - cabinetW / 2, cabinetY, cabinetW, cabinetH);
        gfx.lineStyle(2, 0xa67a4b, 0.75);
        gfx.strokeRect(cabinetX - cabinetW / 2, cabinetY, cabinetW, cabinetH);
        gfx.lineStyle(1, 0x8e6840, 0.6);
        gfx.lineBetween(cabinetX - cabinetW / 2, cabinetY + 80 * furnitureScale, cabinetX + cabinetW / 2, cabinetY + 80 * furnitureScale);
        gfx.fillStyle(0x85d19a, 0.75);
        gfx.fillRect(cabinetX - 6 * furnitureScale, cabinetY + 20 * furnitureScale, 12 * furnitureScale, 4 * furnitureScale);

        // Central dining table and bench (scaled down 20%)
        const tableX = this.rx(0.56);
        const tableW = 190 * furnitureScale;
        const tableTopH = 14 * furnitureScale;
        const tableLegH = 50 * furnitureScale;
        const tableY = furnitureBaseY - (tableTopH + tableLegH);
        gfx.fillStyle(0x835d39, 1);
        gfx.fillRect(tableX - tableW / 2, tableY, tableW, tableTopH);
        gfx.fillStyle(0x67462b, 1);
        gfx.fillRect(tableX - 80 * furnitureScale, tableY + tableTopH, 10 * furnitureScale, tableLegH);
        gfx.fillRect(tableX + 70 * furnitureScale, tableY + tableTopH, 10 * furnitureScale, tableLegH);

        gfx.fillStyle(0x5a3f27, 1);
        gfx.fillRect(tableX - 42 * furnitureScale, tableY + 27 * furnitureScale, 84 * furnitureScale, 12 * furnitureScale);
        gfx.fillRect(tableX - 45 * furnitureScale, tableY + 39 * furnitureScale, 8 * furnitureScale, 25 * furnitureScale);
        gfx.fillRect(tableX + 37 * furnitureScale, tableY + 39 * furnitureScale, 8 * furnitureScale, 25 * furnitureScale);

        // Food tray + cup on table
        gfx.fillStyle(0x7f6a4f, 1);
        gfx.fillRect(tableX + 12 * furnitureScale, tableY - 2 * furnitureScale, 32 * furnitureScale, 7 * furnitureScale);
        gfx.fillStyle(0xc99456, 1);
        gfx.fillCircle(tableX + 24 * furnitureScale, tableY - 1 * furnitureScale, 5 * furnitureScale);
        gfx.fillStyle(0xbfb5a6, 1);
        gfx.fillRect(tableX - 16 * furnitureScale, tableY - 3 * furnitureScale, 7 * furnitureScale, 8 * furnitureScale);

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
