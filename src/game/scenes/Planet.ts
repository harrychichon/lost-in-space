import { Scene } from 'phaser';
import { GameState, PlanetData, PlanetItem, ResourceType } from '../systems/GameState';
import { AudioManager } from '../systems/AudioManager';
import { createPlayerSprite, updatePlayerSprite } from '../objects/Player';

interface PickupSprite {
    sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Image;
    itemIndex: number;
    item: PlanetItem;
}

const EXOTIC_PLANT_SPRITES: Record<string, string> = {
    voidbloom: 'plant_voidbloom',
    sweetmoss: 'plant_sweetmoss',
    starspice: 'plant_starspice',
};

const RESOURCE_COLORS: Record<string, number> = {
    oxygen: 0x4488aa,
    food: 0x88aa44,
    fuel: 0xaa8844,
    parts: 0x888888,
    unique: 0xcc88cc,
    rubber_ball: 0xcc5544,
    squeaky_bone: 0xddcc88,
    chew_rope: 0xaa7755,
    cozy_blanket: 0x7788aa,
    voidbloom: 0x663366,
    sweetmoss: 0x55aa77,
    starspice: 0xbbaa44,
};

const ITEM_INFO: Record<string, { name: string; desc: string; resource?: ResourceType; gain?: number }> = {
    oxygen:  { name: 'Air Crystal',  desc: 'A crystallized oxygen compound. Restores O2 supply.',    resource: 'oxygen', gain: 10 },
    food:    { name: 'Space Fruit',  desc: 'Edible. Bland, but nutritious.',                         resource: 'food',   gain: 10 },
    fuel:    { name: 'Fuel Cell',    desc: 'Concentrated fuel deposit. Keeps the engines running.',   resource: 'fuel',   gain: 10 },
    parts:   { name: 'Scrap Metal',  desc: 'Salvageable parts. Useful for repairs.',                  resource: 'parts',  gain: 10 },
    // Dog toys — locked by default, unlocked when dog is found
    rubber_ball: {
        name: 'Old Rubber Ball',
        desc: 'A chewed-up rubber ball. Useless.',
    },
    squeaky_bone: {
        name: 'Squeaky Bone',
        desc: 'A plastic bone. It squeaks when you squeeze it.\nWho would want this?',
    },
    chew_rope: {
        name: 'Knotted Rope',
        desc: 'A thick rope tied in knots. Just taking up space.',
    },
    cozy_blanket: {
        name: 'Tattered Blanket',
        desc: 'A small, worn blanket. Too small for a person.',
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

const BIOME_BG: Record<PlanetData['biome'], string> = {
    rocky:  'bg_rock',
    lush:   'bg_grass',
    frozen: 'bg_snow',
    desert: 'bg_rock',
};

const BIOME_TILE_FAMILY: Record<PlanetData['biome'], string> = {
    rocky:  'stone',
    lush:   'grass',
    frozen: 'snow',
    desert: 'sand',
};

const BIOME_RIM: Record<PlanetData['biome'], number> = {
    rocky:  0x5a4a38,
    lush:   0x3a4a33,
    frozen: 0x556677,
    desert: 0x6a4a30,
};

export class Planet extends Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyA!: Phaser.Input.Keyboard.Key;
    private keyD!: Phaser.Input.Keyboard.Key;
    private interactKey!: Phaser.Input.Keyboard.Key;
    private leaveKey!: Phaser.Input.Keyboard.Key;
    private pickups: PickupSprite[] = [];
    private playerSprite!: Phaser.GameObjects.Sprite;
    private groundY = 0;
    private statusText!: Phaser.GameObjects.Text;
    private promptText!: Phaser.GameObjects.Text;
    private planetId!: string;
    private currentPickup: PickupSprite | null = null;
    private caveX = 0;
    private caveY = 0;
    private caveRadius = 55;
    private nearCave = false;

    constructor() {
        super('Planet');
    }

    create(data: { planetId: string }) {
        const { width, height } = this.scale;
        this.planetId = data.planetId;
        this.pickups = [];
        this.currentPickup = null;

        AudioManager.play(this, 'spooky_wind');

        const planet = GameState.getPlanet(this, this.planetId);
        if (!planet) {
            this.scene.start('Ship');
            return;
        }

        this.cameras.main.setBackgroundColor(0x000000);

        // Apply grayscale
        const saturation = GameState.getSaturation(this);
        if (saturation < 1) {
            this.cameras.main.postFX.addColorMatrix().grayscale(1 - saturation);
        }

        // Ground line — above this is sky/backdrop, below is walkable ground
        const groundLine = height * 0.75;

        // Biome backdrop — sits behind the ground, only fills the sky portion
        const bg = this.add.image(width / 2, 0, BIOME_BG[planet.biome]);
        bg.setOrigin(0.5, 0);
        bg.setDisplaySize(width, groundLine);
        bg.setDepth(-10);

        // Tiled ground strip — surface row + fill rows down to canvas bottom
        const tileSize = 64;
        const family = BIOME_TILE_FAMILY[planet.biome];
        const cols = Math.ceil(width / tileSize);
        const rows = Math.ceil((height - groundLine) / tileSize);
        for (let r = 0; r < rows; r++) {
            const suffix = r === 0 ? 'top' : 'center';
            const frame = `terrain_${family}_block_${suffix}`;
            for (let c = 0; c < cols; c++) {
                this.add.image(c * tileSize, groundLine + r * tileSize, 'tiles', frame)
                    .setOrigin(0, 0)
                    .setDepth(-5);
            }
        }

        const rimColor = BIOME_RIM[planet.biome];

        // --- Cave entrance ---
        // Position at the far side of the planet, nestled into a hill
        this.caveX = width * 0.9;
        this.caveY = height * 0.75 - 2;
        const caveGfx = this.add.graphics();
        // Dark hillside behind the mouth
        caveGfx.fillStyle(0x111111, 1);
        caveGfx.fillEllipse(this.caveX, this.caveY + 4, 70, 56);
        // Inner cave (arched opening)
        caveGfx.fillStyle(0x000000, 1);
        caveGfx.slice(
            this.caveX,
            this.caveY,
            28,
            Phaser.Math.DegToRad(180),
            Phaser.Math.DegToRad(360),
            false,
        );
        caveGfx.fillPath();
        caveGfx.fillRect(this.caveX - 28, this.caveY, 56, 24);
        // Rim stones
        caveGfx.fillStyle(rimColor, 1);
        caveGfx.fillCircle(this.caveX - 30, this.caveY + 6, 6);
        caveGfx.fillCircle(this.caveX + 30, this.caveY + 8, 5);
        caveGfx.fillCircle(this.caveX - 24, this.caveY - 14, 4);
        caveGfx.fillCircle(this.caveX + 22, this.caveY - 16, 5);

        // Warm light flickering from inside — only on the cavediver-event planet,
        // and only before she's joined
        if (planet.caveLit && !GameState.hasCompanion(this, 'cavediver')) {
            const glow = this.add.circle(this.caveX, this.caveY + 2, 18, 0xffcc66, 0.45);
            this.tweens.add({
                targets: glow,
                alpha: 0.2,
                scale: 1.25,
                duration: 1100,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        // --- Resource pickups from planet data ---
        const uncollectedItems = planet.items
            .map((item, index) => ({ ...item, index }))
            .filter(item => !item.collected);

        uncollectedItems.forEach((item, i) => {
            const px = item.x * width;
            const py = height * 0.75 - Phaser.Math.Between(5, 25);
            const colorKey = item.type === 'unique' ? (item.uniqueId ?? 'unique') : item.type;

            // Exotic plants render as flower sprites rooted in the ground; other items are circles.
            const plantSprite = item.uniqueId && EXOTIC_PLANT_SPRITES[item.uniqueId];
            let sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Image;
            if (plantSprite) {
                sprite = this.add.image(px, height * 0.75, plantSprite, 6).setOrigin(0.5, 1);
            } else {
                const color = RESOURCE_COLORS[colorKey] ?? 0xcc88cc;
                const circle = this.add.circle(px, py - 8, 8, color);
                circle.setStrokeStyle(1, 0xffffff, 0.3);
                sprite = circle;
            }

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
        this.groundY = height * 0.75;
        this.player = this.add.rectangle(60, this.groundY - 25, 20, 50, 0xaaaaaa, 0); // invisible hitbox
        this.physics.add.existing(this.player);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        this.playerSprite = createPlayerSprite(this, this.player.x, this.groundY);

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

    private getItemInfo(item: PlanetItem) {
        const key = item.type === 'unique' ? (item.uniqueId ?? 'unique') : item.type;
        return ITEM_INFO[key] ?? { name: 'Unknown Object', desc: 'You\'re not sure what this is.' };
    }

    private collectItem(pickup: PickupSprite) {
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
        const DOG_TOYS = ['rubber_ball', 'squeaky_bone', 'chew_rope', 'cozy_blanket'];
        if (DOG_TOYS.includes(pickup.item.uniqueId ?? '')) {
            GameState.collectDogToy(this, pickup.item.uniqueId!);
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
    }

    update() {
        const body = this.player.body as Phaser.Physics.Arcade.Body;

        // Movement
        if (this.cursors.left.isDown || this.keyA.isDown) {
            body.setVelocityX(-200);
        } else if (this.cursors.right.isDown || this.keyD.isDown) {
            body.setVelocityX(200);
        } else {
            body.setVelocityX(0);
        }

        updatePlayerSprite(this.playerSprite, this.player.x, this.groundY, body.velocity.x);

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

        // Cave proximity (only shown when not hovering an item)
        const caveDist = Phaser.Math.Distance.Between(
            this.player.x, this.player.y,
            this.caveX, this.caveY,
        );
        this.nearCave = !this.currentPickup && caveDist < this.caveRadius;

        if (this.nearCave) {
            const planet = GameState.getPlanet(this, this.planetId);
            const hasCavediver = GameState.hasCompanion(this, 'cavediver');
            if (hasCavediver) {
                this.promptText.setText('Cave\n[E] Enter');
                this.promptText.setColor('#aaaaaa');
            } else if (planet?.caveLit) {
                this.promptText.setText('A warm light flickers from deep within...\n[E] Enter');
                this.promptText.setColor('#ccaa77');
            } else {
                this.promptText.setText('A dark cave.\nWouldn\'t go in there.');
                this.promptText.setColor('#666666');
            }
            this.promptText.setAlpha(1);

            if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
                if (hasCavediver) {
                    this.scene.start('Cave', { planetId: this.planetId });
                    return;
                } else if (planet?.caveLit) {
                    this.scene.start('CavediverEvent', { planetId: this.planetId });
                    return;
                }
            }
            return;
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
