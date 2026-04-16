import { Scene } from 'phaser';
import { GameState, Chores } from '../systems/GameState';

interface Door {
    x: number;
    label: Phaser.GameObjects.Text;
    icon: Phaser.GameObjects.Graphics;
    name: string;
    choreKey: keyof Chores | null;
    sceneName: string | null;
    action: () => void;
}

export class Ship extends Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyA!: Phaser.Input.Keyboard.Key;
    private keyD!: Phaser.Input.Keyboard.Key;
    private interactKey!: Phaser.Input.Keyboard.Key;
    private doors: Door[] = [];
    private currentDoor: Door | null = null;
    private promptText!: Phaser.GameObjects.Text;
    private dogPromptText!: Phaser.GameObjects.Text;
    private playerGfx!: Phaser.GameObjects.Graphics;
    private dogGraphics: Phaser.GameObjects.Graphics | null = null;
    private dogX = 0;
    private playerSpeed = 200;
    private dayComplete = false;

    constructor() {
        super('Ship');
    }

    create() {
        const { width, height } = this.scale;
        this.dayComplete = false;
        this.doors = [];
        this.currentDoor = null;

        this.cameras.main.setBackgroundColor(0x111111);

        // Apply grayscale
        const saturation = GameState.getSaturation(this);
        if (saturation < 1) {
            this.cameras.main.postFX.addColorMatrix().grayscale(1 - saturation);
        }

        // --- Draw the ship corridor ---
        const interior = this.add.graphics();

        // Floor
        interior.fillStyle(0x333333, 1);
        interior.fillRect(0, height * 0.7, width, height * 0.3);

        // Floor detail — grating lines
        interior.lineStyle(1, 0x3a3a3a, 0.5);
        for (let lx = 0; lx < width; lx += 40) {
            interior.lineBetween(lx, height * 0.7, lx, height);
        }

        // Back wall
        interior.fillStyle(0x222222, 1);
        interior.fillRect(0, height * 0.25, width, height * 0.45);

        // Ceiling
        interior.fillStyle(0x1a1a1a, 1);
        interior.fillRect(0, height * 0.2, width, height * 0.05);

        // Ceiling lights
        interior.fillStyle(0x444444, 0.3);
        for (let i = 0; i < 5; i++) {
            const lx = width * 0.1 + i * (width * 0.2);
            interior.fillRect(lx - 15, height * 0.2, 30, 5);
        }

        // Windows
        for (let i = 0; i < 3; i++) {
            const wx = width * 0.3 + i * (width * 0.2);
            const wy = height * 0.32;
            interior.fillStyle(0x000022, 1);
            interior.fillCircle(wx, wy, 18);
            interior.lineStyle(2, 0x444444, 1);
            interior.strokeCircle(wx, wy, 18);
            interior.fillStyle(0xffffff, 0.5);
            interior.fillCircle(wx - 4, wy - 4, 1);
            interior.fillCircle(wx + 6, wy + 2, 1.2);
        }

        // --- Doors ---
        const floorY = height * 0.7;
        const doorH = 70;
        const doorW = 45;
        const doorY = floorY - doorH;
        const state = GameState.get(this);

        // Kitchen door
        this.createDoor(width * 0.12, doorY, doorW, doorH, 'Kitchen', 0x886644, 'kitchen', 'Kitchen');
        // Greenhouse door
        this.createDoor(width * 0.30, doorY, doorW, doorH, 'Greenhouse', 0x447744, 'greenhouse', 'Greenhouse');
        // Engine door
        this.createDoor(width * 0.48, doorY, doorW, doorH, 'Engine', 0x668888, 'engine', 'Engine');
        // Comms door
        this.createDoor(width * 0.62, doorY, doorW, doorH, 'Comms', 0x555566, 'comms', 'Comms');

        // Collection room — always visible, only usable after botanist joins
        this.createCollectionDoor(width * 0.74, floorY);

        // Navigation console (not a chore)
        this.createNavConsole(width * 0.84, floorY);

        // Bed (not a door — direct interaction)
        this.createBed(width * 0.94, floorY);

        // --- Player ---
        this.player = this.add.rectangle(width * 0.5, floorY - 25, 20, 50, 0xaaaaaa, 0); // invisible hitbox
        this.physics.add.existing(this.player);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        this.playerGfx = this.add.graphics();
        this.drawPlayer(this.playerGfx, this.player.x, this.player.y);

        // --- Dog companion ---
        this.dogGraphics = null;
        if (GameState.hasCompanion(this, 'dog')) {
            this.dogX = width * 0.35;
            const dogY = floorY - 10;
            this.dogGraphics = this.add.graphics();
            this.drawDog(this.dogGraphics, this.dogX, dogY);

            // Draw collected toys near the dog
            const collectedToys = GameState.get(this).collectedDogToys;
            this.drawDogToys(this.dogX, dogY, collectedToys);

            // Toy counter
            if (collectedToys.length > 0) {
                this.add.text(this.dogX, floorY - 55, `Toys: ${collectedToys.length}/4`, {
                    fontFamily: 'Georgia, serif',
                    fontSize: '10px',
                    color: '#666655',
                }).setOrigin(0.5);
            }

            // Dog prompt (separate from door prompt)
            let dogMsg: string;
            if (collectedToys.length === 0) {
                dogMsg = 'The dog wags its tail as you pass by, but looks understimulated.\nMaybe there was something on that first planet...';
            } else if (collectedToys.length === 1) {
                dogMsg = 'The dog has a toy to play with, but still looks around for more.';
            } else if (collectedToys.length === 2) {
                dogMsg = 'The dog is getting quite the collection. It seems happier.';
            } else if (collectedToys.length === 3) {
                dogMsg = 'The dog bounces between its toys, full of energy.';
            } else {
                dogMsg = 'The dog is surrounded by its treasures. Pure contentment.';
            }
            this.dogPromptText = this.add.text(width * 0.5, height * 0.55, dogMsg, {
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                color: '#888877',
                align: 'center',
                wordWrap: { width: 450 },
            }).setOrigin(0.5).setAlpha(0);
        }

        // --- Human companion ---
        if (GameState.hasCompanion(this, 'human')) {
            const humanGfx = this.add.graphics();
            const hx = width * 0.72;
            const hy = floorY - 25;
            this.drawCompanionHuman(humanGfx, hx, hy);
        }

        // --- Cavediver companion ---
        if (GameState.hasCompanion(this, 'cavediver')) {
            const cavediverGfx = this.add.graphics();
            const cx = width * 0.56;
            const cy = floorY - 25;
            this.drawCavediver(cavediverGfx, cx, cy);
        }

        // --- Cave trophies brought back to the corridor ---
        const collectedCave = state.collectedCaveItems;
        const trophyGfx = this.add.graphics();
        if (collectedCave.includes('old_photograph')) {
            this.drawOldPhotograph(trophyGfx, width * 0.20, height * 0.42);
        }
        if (collectedCave.includes('music_box')) {
            this.drawMusicBox(trophyGfx, width * 0.42, height * 0.47);
        }
        if (collectedCave.includes('lantern')) {
            this.drawHangingLantern(trophyGfx, width * 0.89, height * 0.25, height * 0.42);
        }

        // --- HUD ---
        this.add.text(16, 16, `Day ${state.currentDay}`, {
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: '#888888',
        });

        // Resource bars
        this.drawResourceBars(state);

        // Chore checklist
        this.drawChoreChecklist(state);

        // Interaction prompt
        this.promptText = this.add.text(width * 0.5, height * 0.88, '', {
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            color: '#aaaaaa',
        }).setOrigin(0.5).setAlpha(0);

        // --- Input ---
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }

    private createDoor(x: number, y: number, w: number, h: number, name: string, color: number, choreKey: keyof Chores, sceneName: string) {
        const state = GameState.get(this);
        const done = state.chores[choreKey];

        const icon = this.add.graphics();

        // Door frame
        icon.fillStyle(0x2a2a2a, 1);
        icon.fillRect(x - w / 2 - 4, y - 4, w + 8, h + 4);

        // Door itself
        icon.fillStyle(done ? 0x1a1a1a : color, 1);
        icon.fillRect(x - w / 2, y, w, h);

        // Door handle
        icon.fillStyle(0x999999, 1);
        icon.fillCircle(x + w / 2 - 8, y + h / 2, 3);

        // Subtle glow if not done
        if (!done) {
            icon.lineStyle(1, color, 0.4);
            icon.strokeRect(x - w / 2, y, w, h);
        }

        // Label above door
        const label = this.add.text(x, y - 12, name, {
            fontFamily: 'Georgia, serif',
            fontSize: '13px',
            color: done ? '#444444' : '#999999',
        }).setOrigin(0.5);

        // Checkmark if done
        if (done) {
            this.add.text(x, y + h / 2, '✓', {
                fontFamily: 'Arial',
                fontSize: '22px',
                color: '#555555',
            }).setOrigin(0.5);
        }

        this.doors.push({
            x,
            label,
            icon,
            name,
            choreKey,
            sceneName,
            action: () => {
                this.scene.start(sceneName);
            },
        });
    }

    private createCollectionDoor(x: number, floorY: number) {
        const doorH = 70;
        const doorW = 45;
        const doorY = floorY - doorH;
        const hasHuman = GameState.hasCompanion(this, 'human');
        const color = hasHuman ? 0x556644 : 0x2a2a2a;

        const icon = this.add.graphics();
        icon.fillStyle(0x2a2a2a, 1);
        icon.fillRect(x - doorW / 2 - 4, doorY - 4, doorW + 8, doorH + 4);
        icon.fillStyle(color, 1);
        icon.fillRect(x - doorW / 2, doorY, doorW, doorH);
        icon.fillStyle(0x999999, 1);
        icon.fillCircle(x + doorW / 2 - 8, doorY + doorH / 2, 3);

        if (hasHuman) {
            icon.lineStyle(1, 0x556644, 0.4);
            icon.strokeRect(x - doorW / 2, doorY, doorW, doorH);

            // Small plant icon on door
            icon.fillStyle(0x447744, 0.6);
            icon.fillCircle(x, doorY + 20, 6);
            icon.fillCircle(x - 5, doorY + 18, 5);
            icon.fillCircle(x + 5, doorY + 18, 5);

            const label = this.add.text(x, doorY - 12, 'Collection', {
                fontFamily: 'Georgia, serif',
                fontSize: '12px',
                color: '#999999',
            }).setOrigin(0.5);

            const collected = GameState.get(this).collectedExoticPlants;
            if (collected.length > 0) {
                this.add.text(x, doorY - 24, `${collected.length}/3`, {
                    fontFamily: 'Georgia, serif',
                    fontSize: '10px',
                    color: '#666655',
                }).setOrigin(0.5);
            }

            this.doors.push({
                x,
                label,
                icon,
                name: 'Collection',
                choreKey: null,
                sceneName: 'Collection',
                action: () => {
                    this.scene.start('Collection');
                },
            });
        } else {
            const label = this.add.text(x, doorY - 12, '???', {
                fontFamily: 'Georgia, serif',
                fontSize: '12px',
                color: '#444444',
            }).setOrigin(0.5);

            this.doors.push({
                x,
                label,
                icon,
                name: 'Empty space',
                choreKey: null,
                sceneName: null,
                action: () => {
                    this.showMessage('An empty room. No reason to go in.');
                },
            });
        }
    }

    private createNavConsole(x: number, floorY: number) {
        const state = GameState.get(this);
        const planetCount = state.planets.length;
        const icon = this.add.graphics();

        // Console desk
        icon.fillStyle(0x333344, 1);
        icon.fillRect(x - 22, floorY - 45, 44, 45);

        // Screen
        icon.fillStyle(0x111122, 1);
        icon.fillRect(x - 16, floorY - 40, 32, 20);
        icon.lineStyle(1, 0x445566, 0.5);
        icon.strokeRect(x - 16, floorY - 40, 32, 20);

        // Blinking dot if planets exist
        if (planetCount > 0) {
            const dot = this.add.circle(x, floorY - 30, 2, 0x66aacc, 0.8);
            this.tweens.add({
                targets: dot,
                alpha: 0.2,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        const label = this.add.text(x, floorY - 53, 'Nav', {
            fontFamily: 'Georgia, serif',
            fontSize: '13px',
            color: '#999999',
        }).setOrigin(0.5);

        // Planet count indicator
        if (planetCount > 0) {
            this.add.text(x, floorY - 62, `${planetCount} planet${planetCount > 1 ? 's' : ''}`, {
                fontFamily: 'Georgia, serif',
                fontSize: '10px',
                color: '#666666',
            }).setOrigin(0.5);
        }

        this.doors.push({
            x,
            label,
            icon,
            name: 'Navigation',
            choreKey: null,
            sceneName: 'Navigation',
            action: () => {
                this.scene.start('Navigation');
            },
        });
    }

    private createBed(x: number, floorY: number) {
        const icon = this.add.graphics();

        // Bed frame
        icon.fillStyle(0x443333, 1);
        icon.fillRect(x - 25, floorY - 30, 50, 30);
        // Pillow
        icon.fillStyle(0x555544, 1);
        icon.fillRect(x - 20, floorY - 28, 15, 10);
        // Blanket
        icon.fillStyle(0x554444, 1);
        icon.fillRect(x - 5, floorY - 26, 25, 22);

        const label = this.add.text(x, floorY - 42, 'Bed', {
            fontFamily: 'Georgia, serif',
            fontSize: '13px',
            color: '#999999',
        }).setOrigin(0.5);

        this.doors.push({
            x,
            label,
            icon,
            name: 'Bed',
            choreKey: null,
            sceneName: null,
            action: () => {
                if (this.dayComplete) return;

                if (!GameState.allChoresDone(this)) {
                    this.showMessage('You still have things to do...');
                    return;
                }

                this.dayComplete = true;
                this.showMessage('You close your eyes. Another day done.');
                this.time.delayedCall(2000, () => {
                    GameState.advanceDay(this);
                    this.scene.start('DayIntro');
                });
            },
        });
    }

    private drawResourceBars(state: ReturnType<typeof GameState.get>) {
        const { width } = this.scale;
        const resources = [
            { key: 'O2', value: state.resources.oxygen, color: 0x4488aa },
            { key: 'Food', value: state.resources.food, color: 0x88aa44 },
            { key: 'Fuel', value: state.resources.fuel, color: 0xaa8844 },
            { key: 'Parts', value: state.resources.parts, color: 0x888888 },
        ];

        resources.forEach((res, i) => {
            const bx = width - 130;
            const by = 16 + i * 22;
            this.add.text(bx, by, res.key, {
                fontFamily: 'Georgia, serif',
                fontSize: '12px',
                color: '#666666',
            });
            this.add.rectangle(bx + 45 + 40, by + 7, 80, 10, 0x222222).setOrigin(0.5);
            const barW = (res.value / 100) * 78;
            this.add.rectangle(bx + 45 + 1 + barW / 2, by + 7, barW, 8, res.color).setOrigin(0.5);
        });
    }

    private drawChoreChecklist(state: ReturnType<typeof GameState.get>) {
        const choreList: { key: keyof Chores; label: string }[] = [
            { key: 'kitchen', label: 'Eat' },
            { key: 'greenhouse', label: 'Tend plants' },
            { key: 'engine', label: 'Engine check' },
            { key: 'comms', label: 'Check comms' },
        ];

        this.add.text(16, 120, 'Chores:', {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#777777',
        });

        choreList.forEach((chore, i) => {
            const done = state.chores[chore.key];
            const mark = done ? '✓' : '○';
            const color = done ? '#556655' : '#888888';
            this.add.text(16, 140 + i * 20, `${mark} ${chore.label}`, {
                fontFamily: 'Georgia, serif',
                fontSize: '13px',
                color,
            });
        });
    }

    private showMessage(text: string) {
        const { width, height } = this.scale;
        const msg = this.add.text(width * 0.5, height * 0.55, text, {
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: '#999999',
            wordWrap: { width: 400 },
            align: 'center',
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: msg,
            alpha: 1,
            duration: 500,
            yoyo: true,
            hold: 1500,
            onComplete: () => msg.destroy(),
        });
    }

    private drawPlayer(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
        gfx.clear();
        // Legs
        gfx.fillStyle(0x666666, 1);
        gfx.fillRect(x - 5, y + 10, 4, 14);
        gfx.fillRect(x + 1, y + 10, 4, 14);
        // Boots
        gfx.fillStyle(0x555555, 1);
        gfx.fillRect(x - 6, y + 22, 6, 3);
        gfx.fillRect(x, y + 22, 6, 3);
        // Body / suit
        gfx.fillStyle(0x777777, 1);
        gfx.fillRect(x - 7, y - 6, 14, 18);
        // Suit details — belt
        gfx.fillStyle(0x555555, 1);
        gfx.fillRect(x - 7, y + 6, 14, 3);
        // Arms
        gfx.fillStyle(0x777777, 1);
        gfx.fillRect(x - 10, y - 4, 4, 12);
        gfx.fillRect(x + 6, y - 4, 4, 12);
        // Gloves
        gfx.fillStyle(0x888888, 1);
        gfx.fillRect(x - 10, y + 6, 4, 3);
        gfx.fillRect(x + 6, y + 6, 4, 3);
        // Neck
        gfx.fillStyle(0xbb9988, 1);
        gfx.fillRect(x - 3, y - 10, 6, 5);
        // Helmet
        gfx.fillStyle(0x8899aa, 0.5);
        gfx.fillCircle(x, y - 16, 9);
        // Helmet rim
        gfx.lineStyle(2, 0x999999, 0.8);
        gfx.strokeCircle(x, y - 16, 9);
        // Face behind visor
        gfx.fillStyle(0xbb9988, 1);
        gfx.fillCircle(x, y - 16, 6);
        // Eyes
        gfx.fillStyle(0x222222, 1);
        gfx.fillCircle(x - 2, y - 17, 1.2);
        gfx.fillCircle(x + 2, y - 17, 1.2);
        // Visor reflection
        gfx.fillStyle(0xaabbcc, 0.2);
        gfx.fillCircle(x - 3, y - 19, 3);
    }

    private drawCavediver(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
        // Legs
        gfx.fillStyle(0x554433, 1);
        gfx.fillRect(x - 5, y + 10, 4, 14);
        gfx.fillRect(x + 1, y + 10, 4, 14);
        // Heavy boots
        gfx.fillStyle(0x332a20, 1);
        gfx.fillRect(x - 7, y + 22, 7, 4);
        gfx.fillRect(x, y + 22, 7, 4);
        // Body — rugged mining suit
        gfx.fillStyle(0x775544, 1);
        gfx.fillRect(x - 8, y - 6, 16, 18);
        // Tool belt
        gfx.fillStyle(0x332a20, 1);
        gfx.fillRect(x - 8, y + 6, 16, 4);
        gfx.fillStyle(0x888877, 1);
        gfx.fillRect(x - 6, y + 7, 3, 3);
        gfx.fillRect(x + 3, y + 7, 3, 3);
        // Arms
        gfx.fillStyle(0x775544, 1);
        gfx.fillRect(x - 11, y - 4, 4, 12);
        gfx.fillRect(x + 7, y - 4, 4, 12);
        // Gloves
        gfx.fillStyle(0x553322, 1);
        gfx.fillRect(x - 11, y + 6, 4, 3);
        gfx.fillRect(x + 7, y + 6, 4, 3);
        // Neck
        gfx.fillStyle(0xbb9977, 1);
        gfx.fillRect(x - 3, y - 10, 6, 5);
        // Helmet — hardhat
        gfx.fillStyle(0x997744, 1);
        gfx.fillCircle(x, y - 16, 9);
        gfx.fillRect(x - 9, y - 16, 18, 3);
        // Helmet lamp
        gfx.fillStyle(0xffe8a8, 1);
        gfx.fillCircle(x, y - 20, 3);
        gfx.fillStyle(0xffcc66, 0.4);
        gfx.fillCircle(x, y - 20, 5);
        // Face
        gfx.fillStyle(0xbb9977, 1);
        gfx.fillCircle(x, y - 15, 5);
        // Eyes
        gfx.fillStyle(0x222222, 1);
        gfx.fillCircle(x - 2, y - 15, 1.2);
        gfx.fillCircle(x + 2, y - 15, 1.2);
        // Smirk
        gfx.lineStyle(1, 0x222222, 0.7);
        gfx.beginPath();
        gfx.arc(x + 1, y - 13, 3, 0.1, Math.PI - 0.5);
        gfx.strokePath();
    }

    private drawCompanionHuman(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
        // Legs
        gfx.fillStyle(0x555566, 1);
        gfx.fillRect(x - 5, y + 10, 4, 14);
        gfx.fillRect(x + 1, y + 10, 4, 14);
        // Boots
        gfx.fillStyle(0x444455, 1);
        gfx.fillRect(x - 6, y + 22, 6, 3);
        gfx.fillRect(x, y + 22, 6, 3);
        // Body — slightly different suit color
        gfx.fillStyle(0x667766, 1);
        gfx.fillRect(x - 7, y - 6, 14, 18);
        // Belt with tool pouch
        gfx.fillStyle(0x555544, 1);
        gfx.fillRect(x - 7, y + 6, 14, 3);
        gfx.fillRect(x + 3, y + 3, 6, 5);
        // Arms
        gfx.fillStyle(0x667766, 1);
        gfx.fillRect(x - 10, y - 4, 4, 12);
        gfx.fillRect(x + 6, y - 4, 4, 12);
        // Gloves
        gfx.fillStyle(0x778877, 1);
        gfx.fillRect(x - 10, y + 6, 4, 3);
        gfx.fillRect(x + 6, y + 6, 4, 3);
        // Neck
        gfx.fillStyle(0x997766, 1);
        gfx.fillRect(x - 3, y - 10, 6, 5);
        // Helmet — slightly different tint
        gfx.fillStyle(0x889977, 0.5);
        gfx.fillCircle(x, y - 16, 9);
        gfx.lineStyle(2, 0x889988, 0.8);
        gfx.strokeCircle(x, y - 16, 9);
        // Face
        gfx.fillStyle(0x997766, 1);
        gfx.fillCircle(x, y - 16, 6);
        // Eyes
        gfx.fillStyle(0x222222, 1);
        gfx.fillCircle(x - 2, y - 17, 1.2);
        gfx.fillCircle(x + 2, y - 17, 1.2);
        // Slight smile
        gfx.lineStyle(1, 0x222222, 0.6);
        gfx.beginPath();
        gfx.arc(x, y - 14, 3, 0.2, Math.PI - 0.2);
        gfx.strokePath();
        // Visor reflection
        gfx.fillStyle(0xaabb99, 0.2);
        gfx.fillCircle(x - 3, y - 19, 3);
    }

    private drawDog(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
        // Body
        gfx.fillStyle(0x997755, 1);
        gfx.fillEllipse(x, y, 24, 12);
        // Legs
        gfx.fillStyle(0x886644, 1);
        gfx.fillRect(x - 8, y + 4, 3, 8);
        gfx.fillRect(x - 3, y + 4, 3, 8);
        gfx.fillRect(x + 3, y + 4, 3, 8);
        gfx.fillRect(x + 8, y + 4, 3, 8);
        // Tail
        gfx.lineStyle(2, 0x886644, 1);
        gfx.lineBetween(x - 12, y - 2, x - 16, y - 8);
        // Head
        gfx.fillStyle(0xaa8866, 1);
        gfx.fillCircle(x + 12, y - 5, 6);
        // Ears poking out of helmet
        gfx.fillStyle(0x886644, 1);
        gfx.fillTriangle(x + 7, y - 13, x + 11, y - 13, x + 9, y - 8);
        gfx.fillTriangle(x + 14, y - 13, x + 18, y - 13, x + 16, y - 8);
        // Space helmet (glass dome)
        gfx.lineStyle(2, 0x8899aa, 0.7);
        gfx.strokeCircle(x + 12, y - 5, 9);
        // Helmet reflection
        gfx.fillStyle(0xaabbcc, 0.15);
        gfx.fillCircle(x + 10, y - 7, 4);
        // Eye through helmet
        gfx.fillStyle(0x222222, 1);
        gfx.fillCircle(x + 14, y - 6, 1.5);
        // Snout
        gfx.fillStyle(0xbb9977, 1);
        gfx.fillCircle(x + 17, y - 4, 2);
    }

    private drawOldPhotograph(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
        // Outer frame
        gfx.fillStyle(0x443322, 1);
        gfx.fillRect(x - 16, y - 12, 32, 24);
        // Inner photo — sepia
        gfx.fillStyle(0x998866, 1);
        gfx.fillRect(x - 13, y - 9, 26, 18);
        // Two small figures
        gfx.fillStyle(0x554433, 0.75);
        gfx.fillCircle(x - 5, y - 2, 2);
        gfx.fillCircle(x + 5, y - 2, 2);
        gfx.fillRect(x - 7, y, 4, 7);
        gfx.fillRect(x + 3, y, 4, 7);
        // Subtle highlight on frame
        gfx.lineStyle(1, 0x665544, 0.6);
        gfx.strokeRect(x - 16, y - 12, 32, 24);
    }

    private drawMusicBox(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
        // Shelf under box
        gfx.fillStyle(0x3a3428, 1);
        gfx.fillRect(x - 20, y + 8, 40, 3);
        // Box body
        gfx.fillStyle(0x664422, 1);
        gfx.fillRect(x - 12, y - 4, 24, 12);
        // Lid trim
        gfx.fillStyle(0xaa8844, 1);
        gfx.fillRect(x - 12, y - 6, 24, 2);
        // Decorative inlay on front
        gfx.fillStyle(0x886633, 1);
        gfx.fillRect(x - 8, y - 1, 16, 5);
        gfx.lineStyle(1, 0xccaa66, 0.7);
        gfx.strokeRect(x - 8, y - 1, 16, 5);
        // Crank
        gfx.fillStyle(0x998855, 1);
        gfx.fillCircle(x + 14, y + 2, 2);
        gfx.lineStyle(1, 0x998855, 0.9);
        gfx.lineBetween(x + 12, y + 2, x + 17, y + 2);
    }

    private drawHangingLantern(gfx: Phaser.GameObjects.Graphics, x: number, ceilingY: number, lanternY: number) {
        // Chain from ceiling to lantern top
        gfx.lineStyle(1, 0x555555, 0.9);
        gfx.lineBetween(x, ceilingY, x, lanternY - 8);
        // Top cap
        gfx.fillStyle(0x443322, 1);
        gfx.fillRect(x - 6, lanternY - 8, 12, 4);
        // Glass / warm glow
        gfx.fillStyle(0xffcc66, 0.35);
        gfx.fillRect(x - 5, lanternY - 4, 10, 12);
        // Soft halo
        gfx.fillStyle(0xffcc66, 0.12);
        gfx.fillCircle(x, lanternY + 2, 16);
        // Flame
        gfx.fillStyle(0xffe8a8, 0.9);
        gfx.fillCircle(x, lanternY + 3, 2);
        // Frame bars
        gfx.lineStyle(1, 0x443322, 1);
        gfx.strokeRect(x - 5, lanternY - 4, 10, 12);
        gfx.lineBetween(x, lanternY - 4, x, lanternY + 8);
        // Bottom
        gfx.fillStyle(0x443322, 1);
        gfx.fillRect(x - 6, lanternY + 8, 12, 2);
    }

    private drawDogToys(dogX: number, dogY: number, toys: string[]) {
        const gfx = this.add.graphics();
        // Toys arranged around the dog on the floor
        const toyPositions = [
            { id: 'rubber_ball', ox: -25, oy: 10 },
            { id: 'squeaky_bone', ox: 28, oy: 10 },
            { id: 'chew_rope', ox: -20, oy: 16 },
            { id: 'cozy_blanket', ox: 0, oy: 14 },
        ];

        for (const tp of toyPositions) {
            if (!toys.includes(tp.id)) continue;
            const tx = dogX + tp.ox;
            const ty = dogY + tp.oy;

            if (tp.id === 'rubber_ball') {
                // Small red ball
                gfx.fillStyle(0xcc5544, 1);
                gfx.fillCircle(tx, ty, 3);
                gfx.fillStyle(0xdd7766, 0.5);
                gfx.fillCircle(tx - 1, ty - 1, 1);
            } else if (tp.id === 'squeaky_bone') {
                // Small bone shape
                gfx.fillStyle(0xddcc88, 1);
                gfx.fillRect(tx - 4, ty - 1, 8, 2);
                gfx.fillCircle(tx - 4, ty, 2);
                gfx.fillCircle(tx + 4, ty, 2);
            } else if (tp.id === 'chew_rope') {
                // Coiled rope
                gfx.lineStyle(2, 0xaa7755, 1);
                gfx.strokeCircle(tx, ty, 3);
                gfx.lineBetween(tx + 3, ty, tx + 6, ty - 2);
            } else if (tp.id === 'cozy_blanket') {
                // Small folded blanket under/near the dog
                gfx.fillStyle(0x7788aa, 0.7);
                gfx.fillRect(tx - 6, ty, 12, 4);
                gfx.fillStyle(0x8899bb, 0.5);
                gfx.fillRect(tx - 5, ty, 4, 3);
            }
        }
    }

    update() {
        if (this.dayComplete) return;

        const body = this.player.body as Phaser.Physics.Arcade.Body;

        // Redraw player at current position
        this.drawPlayer(this.playerGfx, this.player.x, this.player.y);

        // Movement (arrows or WASD)
        if (this.cursors.left.isDown || this.keyA.isDown) {
            body.setVelocityX(-this.playerSpeed);
        } else if (this.cursors.right.isDown || this.keyD.isDown) {
            body.setVelocityX(this.playerSpeed);
        } else {
            body.setVelocityX(0);
        }

        // Check proximity to doors
        this.currentDoor = null;
        for (const door of this.doors) {
            if (Math.abs(this.player.x - door.x) < 40) {
                this.currentDoor = door;
                break;
            }
        }

        // Show/hide door prompt
        if (this.currentDoor) {
            this.promptText.setText(`[E] ${this.currentDoor.name}`);
            this.promptText.setAlpha(1);
        } else {
            this.promptText.setAlpha(0);
        }

        // Show/hide dog prompt when near the dog
        if (this.dogGraphics && this.dogPromptText) {
            const nearDog = Math.abs(this.player.x - this.dogX) < 60;
            this.dogPromptText.setAlpha(nearDog && !this.currentDoor ? 1 : 0);
        }

        // Handle interaction
        if (this.currentDoor && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.currentDoor.action();
        }
    }
}
