import { GameState } from '../systems/GameState';
import { RoomScene, InteractPoint } from './RoomScene';
import { createDogSprite } from '../objects/Dog';
import { drawDayIndicator } from '../objects/DayIndicator';
import { drawResourceBars } from '../objects/ResourceBars';
import { drawChoreChecklist } from '../objects/ChoreChecklist';

export class Kitchen extends RoomScene {
    constructor() {
        super('Kitchen');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(0x000000);
        this.setupRoom();
        const state = GameState.get(this);

        // Background image — scaled to 95% of scene size
        const bgW = width * 0.95;
        const bgImg = this.add.image(width * 0.5, height * 0.5 + 70, 'bg_kitchen').setDepth(-100);
        bgImg.setDisplaySize(bgW, bgW * bgImg.height / bgImg.width);

        const gfx = this.add.graphics();

        const furnitureScale = 0.45;
        const furnitureBaseY = this.floorY + 2;

        // Table position (kept for chore interaction reference)
        const tableX = this.rx(0.82) + 40;
        const tableW = 190 * furnitureScale;
        const tableTopH = 14 * furnitureScale;
        const tableLegH = 50 * furnitureScale;
        const tableY = furnitureBaseY - (tableTopH + tableLegH);

        // Coffee maker (once found in a cave)
        if (state.collectedCaveItems.includes('coffee_maker')) {
            this.drawCoffeeMaker(gfx, tableX - tableW * 0.3, tableY);
        }

        // Exit door
        // Exit door — hidden visually but interaction still active
        const doorCountBefore = this.children.length;
        this.addExitDoor(gfx, this.roomLeft + 33);
        // Hide the door image that was just added
        const doorImg = this.children.getAt(doorCountBefore) as Phaser.GameObjects.Image;
        if (doorImg) doorImg.setVisible(false);

        // Room label
        this.add.text(width * 0.5, height * 0.15, 'Kitchen', {
            fontFamily: 'Georgia, serif',
            fontSize: '28px',
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
                },
            };
            this.interactPoints.push(chorePoint);
        }

        // Player and UI (on top of everything)
        this.setupPlayerAndUI();

        // --- HUD ---
        drawDayIndicator(this, state);
        drawResourceBars(this, state);
        drawChoreChecklist(this, state);
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
