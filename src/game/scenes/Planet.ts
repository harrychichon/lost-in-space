import { Scene } from 'phaser';
import { GameState, PlanetData, PlanetItem, ResourceType } from '../systems/GameState';

interface PickupSprite {
    sprite: Phaser.GameObjects.Arc;
    itemIndex: number;
    item: PlanetItem;
}

const RESOURCE_COLORS: Record<string, number> = {
    oxygen: 0x4488aa,
    food: 0x88aa44,
    fuel: 0xaa8844,
    parts: 0x888888,
    unique: 0xcc88cc,
    voidbloom: 0x663366,
    sweetmoss: 0x55aa77,
    starspice: 0xbbaa44,
};

const ITEM_INFO: Record<string, { name: string; desc: string; resource?: ResourceType; gain?: number }> = {
    oxygen:  { name: 'Air Crystal',  desc: 'A crystallized oxygen compound. Restores O2 supply.',    resource: 'oxygen', gain: 10 },
    food:    { name: 'Space Fruit',  desc: 'Edible. Bland, but nutritious.',                         resource: 'food',   gain: 10 },
    fuel:    { name: 'Fuel Cell',    desc: 'Concentrated fuel deposit. Keeps the engines running.',   resource: 'fuel',   gain: 10 },
    parts:   { name: 'Scrap Metal',  desc: 'Salvageable parts. Useful for repairs.',                  resource: 'parts',  gain: 10 },
    // Unique items — locked by default, unlockable via companion hints
    rubber_ball: {
        name: 'Old Rubber Ball',
        desc: 'A chewed-up rubber ball. Useless.',
    },
    // Exotic plants — locked until human companion
    voidbloom: {
        name: 'Voidbloom',
        desc: 'A beautiful plant with dark petals. Quite deadly.\nNot enough oxygen-to-maintenance ratio to keep around.',
    },
    sweetmoss: {
        name: 'Sweetmoss',
        desc: 'A soft moss that gives off a wonderful smell.\nNot enough oxygen-to-maintenance ratio to keep around.',
    },
    starspice: {
        name: 'Starspice',
        desc: 'A spiny herb. Could add flavor to food.\nNot enough oxygen-to-maintenance ratio to keep around.',
    },
    // Other unique items
    exotic_flower: {
        name: 'Exotic Flower',
        desc: 'Beautiful, but pointless. Nowhere near enough\noxygen-to-maintenance ratio.',
    },
    coffee_maker: {
        name: 'Old Coffee Maker',
        desc: 'A rusty coffee machine. Who needs coffee\nwhen you have nothing to stay awake for?',
    },
    music_box: {
        name: 'Music Box',
        desc: 'A small mechanical box. It plays a tune.\nNo one around to hear it though.',
    },
};

const BIOME_GROUND: Record<PlanetData['biome'], { ground: number; hills: number; mountains: number }> = {
    rocky:  { ground: 0x2a2a1a, hills: 0x333322, mountains: 0x1a1a12 },
    lush:   { ground: 0x1a2a1a, hills: 0x223322, mountains: 0x122a12 },
    frozen: { ground: 0x2a2a33, hills: 0x333344, mountains: 0x1a1a2a },
    desert: { ground: 0x332a1a, hills: 0x443322, mountains: 0x2a1a0a },
};

export class Planet extends Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyA!: Phaser.Input.Keyboard.Key;
    private keyD!: Phaser.Input.Keyboard.Key;
    private interactKey!: Phaser.Input.Keyboard.Key;
    private leaveKey!: Phaser.Input.Keyboard.Key;
    private pickups: PickupSprite[] = [];
    private playerGfx!: Phaser.GameObjects.Graphics;
    private statusText!: Phaser.GameObjects.Text;
    private promptText!: Phaser.GameObjects.Text;
    private planetId!: string;
    private currentPickup: PickupSprite | null = null;
    private collecting = false;

    constructor() {
        super('Planet');
    }

    create(data: { planetId: string }) {
        const { width, height } = this.scale;
        this.planetId = data.planetId;
        this.pickups = [];
        this.currentPickup = null;
        this.collecting = false;

        const planet = GameState.getPlanet(this, this.planetId);
        if (!planet) {
            this.scene.start('Ship');
            return;
        }

        const colors = BIOME_GROUND[planet.biome];

        // Sky
        this.cameras.main.setBackgroundColor(0x000000);

        // Apply grayscale
        const saturation = GameState.getSaturation(this);
        if (saturation < 1) {
            this.cameras.main.postFX.addColorMatrix().grayscale(1 - saturation);
        }

        // --- Starfield first (behind everything) ---
        const stars = this.add.graphics();
        for (let i = 0; i < 200; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const brightness = Phaser.Math.FloatBetween(0.3, 1);
            const size = Phaser.Math.FloatBetween(0.5, 2);
            stars.fillStyle(Phaser.Display.Color.GetColor(
                Math.floor(255 * brightness),
                Math.floor(255 * brightness),
                Math.floor(255 * brightness)
            ), 1);
            stars.fillCircle(x, y, size);
        }

        // --- Draw planet surface (on top of stars) ---
        const ground = this.add.graphics();

        // Mountains
        ground.fillStyle(colors.mountains, 1);
        ground.fillTriangle(0, height * 0.5, width * 0.15, height * 0.3, width * 0.3, height * 0.5);
        ground.fillTriangle(width * 0.25, height * 0.5, width * 0.45, height * 0.25, width * 0.65, height * 0.5);
        ground.fillTriangle(width * 0.55, height * 0.5, width * 0.75, height * 0.35, width * 0.95, height * 0.5);
        ground.fillRect(0, height * 0.5, width, height * 0.25);

        // Hills
        ground.fillStyle(colors.hills, 1);
        ground.fillCircle(width * 0.2, height * 0.75, 60);
        ground.fillCircle(width * 0.7, height * 0.75, 80);
        ground.fillCircle(width * 0.5, height * 0.75, 40);

        // Terrain floor
        ground.fillStyle(colors.ground, 1);
        ground.fillRect(0, height * 0.75, width, height * 0.25);

        // --- Resource pickups from planet data ---
        const uncollectedItems = planet.items
            .map((item, index) => ({ ...item, index }))
            .filter(item => !item.collected);

        uncollectedItems.forEach((item, i) => {
            const px = item.x * width;
            const py = height * 0.75 - Phaser.Math.Between(5, 25);
            const colorKey = item.type === 'unique' ? (item.uniqueId ?? 'unique') : item.type;
            const color = RESOURCE_COLORS[colorKey] ?? 0xcc88cc;

            const sprite = this.add.circle(px, py - 8, 8, color);
            sprite.setStrokeStyle(1, 0xffffff, 0.3);

            // Gentle bob
            this.tweens.add({
                targets: sprite,
                y: sprite.y - 4,
                duration: 1000 + i * 200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

            this.pickups.push({ sprite, itemIndex: item.index, item });
        });

        // --- Player ---
        this.player = this.add.rectangle(60, height * 0.75 - 25, 20, 50, 0xaaaaaa, 0); // invisible hitbox
        this.physics.add.existing(this.player);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        this.playerGfx = this.add.graphics();
        this.drawPlayer(this.playerGfx, this.player.x, this.player.y);

        // --- HUD ---
        this.add.text(width * 0.5, 20, planet.name, {
            fontFamily: 'Georgia, serif',
            fontSize: '22px',
            color: '#888888',
        }).setOrigin(0.5);

        this.add.text(width * 0.5, 44, planet.biome, {
            fontFamily: 'Georgia, serif',
            fontSize: '12px',
            color: '#666666',
        }).setOrigin(0.5);

        this.statusText = this.add.text(width * 0.5, 64, `Items remaining: ${uncollectedItems.length}`, {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#777777',
        }).setOrigin(0.5);

        // Item prompt (shown when near a pickup)
        this.promptText = this.add.text(width * 0.5, height * 0.88, '', {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#aaaaaa',
            align: 'center',
            wordWrap: { width: 500 },
        }).setOrigin(0.5).setAlpha(0);

        this.add.text(width * 0.5, height - 20, '[L] Leave Planet', {
            fontFamily: 'Georgia, serif',
            fontSize: '13px',
            color: '#555555',
        }).setOrigin(0.5);

        // --- Input ---
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.leaveKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L);
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
        // Belt
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
        gfx.lineStyle(2, 0x999999, 0.8);
        gfx.strokeCircle(x, y - 16, 9);
        // Face
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

    private getItemInfo(item: PlanetItem) {
        const key = item.type === 'unique' ? (item.uniqueId ?? 'unique') : item.type;
        return ITEM_INFO[key] ?? { name: 'Unknown Object', desc: 'You\'re not sure what this is.' };
    }

    private collectItem(pickup: PickupSprite) {
        this.collecting = true;

        // Mark collected in GameState
        GameState.collectPlanetItem(this, this.planetId, pickup.itemIndex);

        const info = this.getItemInfo(pickup.item);

        // Add to resources if it's a resource type
        if (info.resource && info.gain) {
            const state = GameState.get(this);
            const updated = { ...state.resources };
            updated[info.resource] = Math.min(100, updated[info.resource] + info.gain);
            GameState.update(this, { resources: updated });
        }

        // Special unique item handling
        if (pickup.item.uniqueId === 'rubber_ball') {
            GameState.update(this, { dogHasToy: true });
        }
        if (['voidbloom', 'sweetmoss', 'starspice'].includes(pickup.item.uniqueId ?? '')) {
            GameState.collectExoticPlant(this, pickup.item.uniqueId!);
        }

        // Float-up feedback
        const feedbackText = info.resource
            ? `+${info.gain} ${info.name}`
            : `Collected: ${info.name}`;

        const label = this.add.text(pickup.sprite.x, pickup.sprite.y - 20, feedbackText, {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#cccccc',
        }).setOrigin(0.5);

        this.tweens.add({
            targets: label,
            y: label.y - 30,
            alpha: 0,
            duration: 1000,
            onComplete: () => label.destroy(),
        });

        pickup.sprite.destroy();
        const idx = this.pickups.indexOf(pickup);
        if (idx !== -1) this.pickups.splice(idx, 1);

        const remaining = this.pickups.length;
        this.statusText.setText(`Items remaining: ${remaining}`);
        this.promptText.setAlpha(0);
        this.currentPickup = null;

        this.time.delayedCall(300, () => {
            this.collecting = false;
        });
    }

    update() {
        if (this.collecting) return;

        const body = this.player.body as Phaser.Physics.Arcade.Body;

        // Redraw player at current position
        this.drawPlayer(this.playerGfx, this.player.x, this.player.y);

        // Movement
        if (this.cursors.left.isDown || this.keyA.isDown) {
            body.setVelocityX(-200);
        } else if (this.cursors.right.isDown || this.keyD.isDown) {
            body.setVelocityX(200);
        } else {
            body.setVelocityX(0);
        }

        // Find nearest pickup in range
        this.currentPickup = null;
        let closestDist = Infinity;
        for (const pickup of this.pickups) {
            if (!pickup.sprite.active) continue;
            const dist = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                pickup.sprite.x, pickup.sprite.y
            );
            if (dist < 50 && dist < closestDist) {
                closestDist = dist;
                this.currentPickup = pickup;
            }
        }

        // Show/hide prompt
        if (this.currentPickup) {
            const info = this.getItemInfo(this.currentPickup.item);
            const isLocked = this.currentPickup.item.locked;

            if (isLocked) {
                this.promptText.setText(`${info.name}\n${info.desc}`);
                this.promptText.setColor('#666666');
            } else {
                const resourceHint = info.resource ? ` (+${info.gain} ${info.resource})` : '';
                this.promptText.setText(`${info.name}${resourceHint}\n${info.desc}\n[E] Pick up`);
                this.promptText.setColor('#aaaaaa');
            }
            this.promptText.setAlpha(1);
        } else {
            this.promptText.setAlpha(0);
        }

        // Handle pickup
        if (this.currentPickup && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            if (this.currentPickup.item.locked) {
                // Can't pick up — show rejection message
                const info = this.getItemInfo(this.currentPickup.item);
                this.promptText.setText(`${info.name}\n${info.desc}`);
                this.promptText.setColor('#554444');
            } else {
                this.collectItem(this.currentPickup);
            }
        }

        // Leave planet
        if (Phaser.Input.Keyboard.JustDown(this.leaveKey)) {
            this.scene.start('Ship');
        }
    }
}
