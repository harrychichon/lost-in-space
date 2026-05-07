import { Scene } from 'phaser';
import { GameState, PlanetItem, ResourceType } from '../systems/GameState';
import { AudioManager } from '../systems/AudioManager';
import { createPlayerSprite, updatePlayerSprite } from '../objects/Player';

interface PickupSprite {
    sprite: Phaser.GameObjects.Arc;
    itemIndex: number;
    item: PlanetItem;
}

const RESOURCE_COLORS: Record<string, number> = {
    oxygen: 0x66bbcc,
    food: 0xaacc55,
    fuel: 0xddaa55,
    parts: 0xaaaaaa,
    unique: 0xcc88cc,
    coffee_maker: 0x996644,
    music_box: 0xbb99cc,
    old_photograph: 0xd8c488,
    lantern: 0xffcc77,
};

const CAVE_RESOURCE_GAIN = 20;

const ITEM_INFO: Record<string, { name: string; desc: string; resource?: ResourceType; gain?: number }> = {
    oxygen: { name: 'Oxygen Geode', desc: 'A dense cluster of oxygen-rich crystals. (+20 O2)', resource: 'oxygen', gain: CAVE_RESOURCE_GAIN },
    food:   { name: 'Cave Fungus',  desc: 'Fleshy, pale, edible. Mira says it\'s good.  (+20 Food)', resource: 'food',   gain: CAVE_RESOURCE_GAIN },
    fuel:   { name: 'Ore Vein',     desc: 'A rich fuel deposit, tucked in the rock. (+20 Fuel)',    resource: 'fuel',   gain: CAVE_RESOURCE_GAIN },
    parts:  { name: 'Mineral Slab', desc: 'Dense alloy chunks worth salvaging. (+20 Parts)',        resource: 'parts',  gain: CAVE_RESOURCE_GAIN },
    coffee_maker: {
        name: 'Old Coffee Maker',
        desc: 'A rusty coffee machine. "This\'ll clean up," Mira says.\nSuddenly, a reason to stay awake.',
    },
    music_box: {
        name: 'Music Box',
        desc: 'A small mechanical box. It still plays its tune.',
    },
    old_photograph: {
        name: 'Old Photograph',
        desc: 'A faded picture of strangers smiling.\nSomeone, once, was happy here.',
    },
    lantern: {
        name: 'Brass Lantern',
        desc: 'An old hand lantern. Mira grins — "I know this design."',
    },
};

export class Cave extends Scene {
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

    constructor() {
        super('Cave');
    }

    create(data: { planetId: string }) {
        const { width, height } = this.scale;
        this.planetId = data.planetId;
        this.pickups = [];
        this.currentPickup = null;

        const planet = GameState.getPlanet(this, this.planetId);
        if (!planet) {
            this.scene.start('Ship');
            return;
        }

        AudioManager.update(this, {
            warmth: GameState.getSaturation(this),
            location: 'cave',
        });

        this.cameras.main.setBackgroundColor(0x07060a);

        GameState.applyGrayscale(this);

        // --- Cave walls ---
        const walls = this.add.graphics();
        walls.fillStyle(0x141018, 1);
        walls.fillRect(0, 0, width, height);
        // Ceiling silhouette
        walls.fillStyle(0x080610, 1);
        walls.fillRect(0, 0, width, height * 0.2);
        for (let i = 0; i < 12; i++) {
            const sx = (i + 0.5) * (width / 12);
            const sh = Phaser.Math.Between(20, 70);
            walls.fillTriangle(sx - 10, height * 0.2, sx + 10, height * 0.2, sx, height * 0.2 + sh);
        }
        // Floor
        walls.fillStyle(0x1a1520, 1);
        walls.fillRect(0, height * 0.75, width, height * 0.25);
        // Stalagmites
        walls.fillStyle(0x0e0a14, 1);
        for (let i = 0; i < 6; i++) {
            const sx = Phaser.Math.Between(40, width - 40);
            const sh = Phaser.Math.Between(18, 40);
            walls.fillTriangle(sx - 8, height * 0.75, sx + 8, height * 0.75, sx, height * 0.75 - sh);
        }

        // Ambient glowing crystals scattered around (background light)
        for (let i = 0; i < 5; i++) {
            const cx = Phaser.Math.Between(60, width - 60);
            const cy = Phaser.Math.Between(height * 0.35, height * 0.72);
            const glow = this.add.circle(cx, cy, 4, 0xaaccff, 0.6);
            this.tweens.add({
                targets: glow,
                alpha: 0.2,
                duration: 900 + i * 150,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        // --- Pickups from cave data ---
        const uncollectedItems = planet.caveItems
            .map((item, index) => ({ ...item, index }))
            .filter(item => !item.collected);

        uncollectedItems.forEach((item, i) => {
            const px = item.x * width;
            const py = height * 0.75 - Phaser.Math.Between(6, 22);
            const colorKey = item.type === 'unique' ? (item.uniqueId ?? 'unique') : item.type;
            const color = RESOURCE_COLORS[colorKey] ?? 0xcc88cc;

            const sprite = this.add.circle(px, py - 8, 8, color);
            sprite.setStrokeStyle(1, 0xffffff, 0.4);

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
        this.player = this.add.rectangle(60, this.groundY - 25, 20, 50, 0xaaaaaa, 0);
        this.physics.add.existing(this.player);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        this.playerSprite = createPlayerSprite(this, this.player.x, this.groundY);

        // --- HUD ---
        this.add.text(width * 0.5, 20, `${planet.name} — Cave`, {
            fontFamily: 'Georgia, serif',
            fontSize: '20px',
            color: '#aaaaaa',
        }).setOrigin(0.5);

        this.statusText = this.add.text(width * 0.5, 48, `Items remaining: ${uncollectedItems.length}`, {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#777777',
        }).setOrigin(0.5);

        this.promptText = this.add.text(width * 0.5, height * 0.88, '', {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#aaaaaa',
            align: 'center',
            wordWrap: { width: 520 },
        }).setOrigin(0.5).setAlpha(0);

        this.add.text(width * 0.5, height - 20, '[L] Leave Cave', {
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
        GameState.collectCaveItem(this, this.planetId, pickup.itemIndex);

        const info = this.getItemInfo(pickup.item);

        if (info.resource && info.gain) {
            const state = GameState.get(this);
            const updated = { ...state.resources };
            updated[info.resource] = Math.min(100, updated[info.resource] + info.gain);
            GameState.update(this, { resources: updated });
        }

        if (pickup.item.uniqueId && GameState.isCaveUniqueId(pickup.item.uniqueId)) {
            GameState.recordCaveUniqueCollected(this, pickup.item.uniqueId);
        }

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

        this.statusText.setText(`Items remaining: ${this.pickups.length}`);
        this.promptText.setAlpha(0);
        this.currentPickup = null;
    }

    update() {
        const body = this.player.body as Phaser.Physics.Arcade.Body;

        if (this.cursors.left.isDown || this.keyA.isDown) {
            body.setVelocityX(-200);
        } else if (this.cursors.right.isDown || this.keyD.isDown) {
            body.setVelocityX(200);
        } else {
            body.setVelocityX(0);
        }

        updatePlayerSprite(this.playerSprite, this.player.x, this.groundY, body.velocity.x);

        this.currentPickup = null;
        let closestDist = Infinity;
        for (const pickup of this.pickups) {
            if (!pickup.sprite.active) continue;
            const dist = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                pickup.sprite.x, pickup.sprite.y,
            );
            if (dist < 50 && dist < closestDist) {
                closestDist = dist;
                this.currentPickup = pickup;
            }
        }

        if (this.currentPickup) {
            const info = this.getItemInfo(this.currentPickup.item);
            const resourceHint = info.resource ? ` (+${info.gain} ${info.resource})` : '';
            this.promptText.setText(`${info.name}${resourceHint}\n${info.desc}\n[E] Pick up`);
            this.promptText.setColor('#aaaaaa');
            this.promptText.setAlpha(1);
        } else {
            this.promptText.setAlpha(0);
        }

        if (this.currentPickup && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.collectItem(this.currentPickup);
        }

        if (Phaser.Input.Keyboard.JustDown(this.leaveKey)) {
            this.scene.start('Planet', { planetId: this.planetId });
        }
    }
}
