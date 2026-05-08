import { Scene } from 'phaser';
import { GameState, PlanetData, PlanetItem, ResourceType } from '../systems/GameState';
import { AudioManager } from '../systems/AudioManager';
import { createPlayerSprite, updatePlayerSprite } from '../objects/Player';
import { HudPanel } from '../objects/HudPanel';
import { GlobalNavBar } from '../objects/GlobalNavBar';
import { drawDayIndicator } from '../objects/DayIndicator';
import { drawResourceBars } from '../objects/ResourceBars';

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
    oxygen_plant: 0x44bb77,
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
    // Oxygen-producing plant — one per planet, collectable immediately
    oxygen_plant: {
        name: 'Breather Fern',
        desc: 'This plant produces oxygen.\nWould be useful on the ship.',
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
    lush:   'bg_grass',
    frozen: 'bg_snow',
    desert: 'bg_rock',
};

const BIOME_TILE_FAMILY: Record<PlanetData['biome'], string> = {
    lush:   'grass',
    frozen: 'snow',
    desert: 'sand',
};

const BIOME_RIM: Record<PlanetData['biome'], number> = {
    lush:   0x3a4a33,
    frozen: 0x556677,
    desert: 0x6a4a30,
};

const WORLD_WIDTH = 3072;

/**
 * Draws an arch / doorway shape (flat bottom, vertical sides, semicircle top)
 * onto the given Graphics object, anchored with its bottom on `baseY`.
 */
function drawArch(g: Phaser.GameObjects.Graphics, cx: number, baseY: number, halfW: number, height: number) {
    const archCenterY = baseY - height + halfW;
    g.beginPath();
    g.moveTo(cx - halfW, baseY);
    g.lineTo(cx - halfW, archCenterY);
    g.arc(cx, archCenterY, halfW, Math.PI, 0, false);
    g.lineTo(cx + halfW, baseY);
    g.closePath();
    g.fillPath();
}

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
    private prompt!: HudPanel;
    private planetId!: string;
    private currentPickup: PickupSprite | null = null;
    private caveX = 0;
    private caveY = 0;
    private caveRadius = 70;
    private nearCave = false;
    private bgTile!: Phaser.GameObjects.TileSprite;
    private shipX = 120;
    private nearShip = false;
    private caveIndicator!: HudPanel;
    private shipIndicator!: HudPanel;
    /** Tracks the last prompt target so we re-anchor to player only on transitions. */
    private lastPromptTarget: 'cave' | 'ship' | PickupSprite | null = null;

    constructor() {
        super('Planet');
    }

    create(data: { planetId: string; spawnAtCave?: boolean }) {
        const { width, height } = this.scale;
        this.planetId = data.planetId;
        this.pickups = [];
        this.currentPickup = null;
        this.lastPromptTarget = null;

        const planet = GameState.getPlanet(this, this.planetId);
        if (!planet) {
            this.scene.start('Ship');
            return;
        }

        AudioManager.update(this, {
            warmth: GameState.getSaturation(this),
            location: 'planet',
            biome: planet.biome,
        });

        this.cameras.main.setBackgroundColor(0x000000);

        GameState.applyGrayscale(this);

        // HUD overlays — pinned to camera by the draw helpers
        const hudState = GameState.get(this);
        drawDayIndicator(this, hudState);
        drawResourceBars(this, hudState);

        // Ground line — above this is sky/backdrop, below is walkable ground
        const groundLine = height * 0.75;

        this.physics.world.setBounds(0, 0, WORLD_WIDTH, height);

        // Biome backdrop — TileSprite pinned to screen; tilePositionX driven in update() for parallax
        this.bgTile = this.add
            .tileSprite(width / 2, groundLine / 2, width, groundLine, BIOME_BG[planet.biome])
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(-10);

        // Tiled ground strip — surface row + fill rows down to canvas bottom
        const tileSize = 64;
        const family = BIOME_TILE_FAMILY[planet.biome];
        const cols = Math.ceil(WORLD_WIDTH / tileSize);
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
        const caveGfx = this.add.graphics();

        // Position depends on entrance type: mountain tunnel sits at the far-right edge
        // with the trigger at the tunnel mouth; bare cave sits at 90% of world width.
        this.caveX = planet.mountainCave ? WORLD_WIDTH - 280 : WORLD_WIDTH * 0.9;
        this.caveY = planet.mountainCave ? groundLine - 50  : groundLine - 2;

        // Overhang color: darker than rimColor for the rock ceiling
        const rv = (rimColor >> 16) & 0xff;
        const gv = (rimColor >> 8) & 0xff;
        const bv = rimColor & 0xff;
        const overhangColor = (Math.floor(rv * 0.6) << 16) | (Math.floor(gv * 0.6) << 8) | Math.floor(bv * 0.6);

        if (planet.mountainCave) {
            // ===== MOUNTAIN + ARCH TUNNEL =====
            const mtnMain:   Record<string, number> = { lush: 0x3d4a2d, frozen: 0x4a5566, desert: 0x6a4a33 };
            const mtnShadow: Record<string, number> = { lush: 0x2a3320, frozen: 0x3a4455, desert: 0x523a27 };
            const mtnBg:     Record<string, number> = { lush: 0x4a5a38, frozen: 0x5a6677, desert: 0x7a5a44 };

            const peakX = WORLD_WIDTH - 60;
            const peakY = groundLine - 240;
            const leftBaseX  = WORLD_WIDTH - 380;
            const rightBaseX = WORLD_WIDTH + 50;

            // 1. Background range — a higher peak slightly behind, lighter color (depth)
            caveGfx.fillStyle(mtnBg[planet.biome] ?? 0x4a5a44, 1);
            caveGfx.fillTriangle(WORLD_WIDTH - 20, groundLine - 180,
                                 WORLD_WIDTH - 250, groundLine,
                                 WORLD_WIDTH + 80, groundLine);

            // 2. Main mountain body — long visible left slope, steeper hidden right slope
            caveGfx.fillStyle(mtnMain[planet.biome] ?? 0x3d4a2d, 1);
            caveGfx.fillTriangle(peakX, peakY,  leftBaseX, groundLine,  rightBaseX, groundLine);

            // 3. Shadow on right slope — sun coming from left, left face is lit
            caveGfx.fillStyle(mtnShadow[planet.biome] ?? 0x2a3320, 1);
            caveGfx.fillTriangle(peakX, peakY,  peakX, groundLine,  rightBaseX, groundLine);

            // 4. Rock ledges on the visible left face — texture
            caveGfx.fillStyle(mtnShadow[planet.biome] ?? 0x2a3320, 1);
            caveGfx.fillTriangle(peakX - 90,  groundLine - 110, peakX - 140, groundLine - 80,  peakX - 70,  groundLine - 80);
            caveGfx.fillTriangle(peakX - 30,  groundLine - 180, peakX - 70,  groundLine - 150, peakX - 15,  groundLine - 150);

            // 5. Snow cap — frozen biome only
            if (planet.biome === 'frozen') {
                caveGfx.fillStyle(0xddeeff, 1);
                caveGfx.fillTriangle(peakX, peakY,  peakX - 35, peakY + 45,  peakX + 35, peakY + 50);
            }

            // 6. Tunnel arch — drawn into the mountain face
            const archHalfW = 35;
            const archH     = 100;
            const cx        = this.caveX;

            // Outer rim (frame around opening — biome-rim color rock)
            caveGfx.fillStyle(rimColor, 1);
            drawArch(caveGfx, cx, groundLine, archHalfW + 8, archH + 6);

            // Inner depth gradient — 5 nested arches, lightest outer to pure black core
            const archShades = [0x2a2a2a, 0x1a1a1a, 0x0e0e0e, 0x040404, 0x000000];
            const archScale  = [1.00,     0.84,     0.68,     0.52,     0.36];
            archShades.forEach((shade, i) => {
                caveGfx.fillStyle(shade, 1);
                drawArch(caveGfx, cx, groundLine, archHalfW * archScale[i], archH * archScale[i]);
            });

            // 7. Tunnel pillars — rock columns flanking the arch
            caveGfx.fillStyle(rimColor, 1);
            // Left pillar — stack of boulders
            caveGfx.fillCircle(cx - 50, groundLine - 18, 16);
            caveGfx.fillCircle(cx - 48, groundLine - 50, 14);
            caveGfx.fillCircle(cx - 54, groundLine - 80, 11);
            // Right pillar
            caveGfx.fillCircle(cx + 50, groundLine - 16, 15);
            caveGfx.fillCircle(cx + 48, groundLine - 48, 13);
            caveGfx.fillCircle(cx + 54, groundLine - 78, 10);

            // 8. Overhang — keystone rock above the arch
            caveGfx.fillStyle(overhangColor, 1);
            caveGfx.fillEllipse(cx, groundLine - archH - 6, 100, 22);

            // 9. Ground scatter — loose rocks just outside the tunnel mouth
            caveGfx.fillStyle(rimColor, 1);
            caveGfx.fillCircle(cx - 30, groundLine + 6, 5);
            caveGfx.fillCircle(cx + 22, groundLine + 8, 4);
            caveGfx.fillCircle(cx - 14, groundLine + 10, 3);
        } else {
            // ===== EXISTING FLAT-GROUND CAVE (unchanged) =====
            const moundColors: Record<string, number> = {
                lush: 0x2a3522, frozen: 0x3a4a55, desert: 0x4a3520,
            };
            const moundColor = moundColors[planet.biome] ?? 0x2a2a2a;

            // 1. Ground mound — hillside the cave is carved into
            caveGfx.fillStyle(moundColor, 1);
            caveGfx.fillEllipse(this.caveX, this.caveY + 12, 170, 80);

            // 2. Depth gradient — concentric ellipses dark gray → black
            const depthShades = [0x242424, 0x161616, 0x090909, 0x000000];
            const depthW      = [88, 74, 60, 46];
            const depthH      = [56, 46, 36, 26];
            depthShades.forEach((shade, i) => {
                caveGfx.fillStyle(shade, 1);
                caveGfx.fillEllipse(this.caveX, this.caveY + 8, depthW[i], depthH[i]);
            });

            // 2b. Edge-breakers: mound-colored blobs biting into the opening rim
            caveGfx.fillStyle(moundColor, 1);
            caveGfx.fillCircle(this.caveX - 32, this.caveY - 18,  9);
            caveGfx.fillCircle(this.caveX - 10, this.caveY - 26,  7);
            caveGfx.fillCircle(this.caveX + 22, this.caveY - 22, 10);
            caveGfx.fillCircle(this.caveX - 44, this.caveY - 2,   8);
            caveGfx.fillCircle(this.caveX + 42, this.caveY - 6,   7);
            caveGfx.fillTriangle(
                this.caveX - 18, this.caveY - 28,
                this.caveX - 28, this.caveY - 22,
                this.caveX - 22, this.caveY - 16,
            );
            caveGfx.fillTriangle(
                this.caveX + 16, this.caveY - 28,
                this.caveX + 10, this.caveY - 20,
                this.caveX + 26, this.caveY - 22,
            );

            // 3. Left boulder cluster
            caveGfx.fillStyle(rimColor, 1);
            caveGfx.fillCircle(this.caveX - 46, this.caveY + 4,  20);
            caveGfx.fillCircle(this.caveX - 38, this.caveY - 14, 14);
            caveGfx.fillCircle(this.caveX - 56, this.caveY - 2,  10);

            // 4. Right boulder cluster
            caveGfx.fillCircle(this.caveX + 44, this.caveY + 6,  18);
            caveGfx.fillCircle(this.caveX + 36, this.caveY - 12, 13);
            caveGfx.fillCircle(this.caveX + 52, this.caveY,       9);

            // 5. Top overhang
            caveGfx.fillStyle(overhangColor, 1);
            caveGfx.fillEllipse(this.caveX, this.caveY - 20, 110, 28);

            // 6. Ground scatter
            caveGfx.fillStyle(rimColor, 1);
            caveGfx.fillCircle(this.caveX - 20, this.caveY + 22, 5);
            caveGfx.fillCircle(this.caveX + 14, this.caveY + 24, 4);
            caveGfx.fillCircle(this.caveX + 30, this.caveY + 20, 3);
        }

        // 7. Glow states — positioned inside the opening so light shines outward
        // Mountain: caveY is already at arch center, larger glow for the tunnel.
        // Cave: small offset to land inside the depth ellipse.
        const glowY = planet.mountainCave ? this.caveY : this.caveY + 6;
        const glowR = planet.mountainCave ? 28 : 22;

        if (planet.caveLit && !GameState.hasCompanion(this, 'cavediver')) {
            const glow = this.add.circle(this.caveX, glowY, glowR, 0xffcc66, 0.45);
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
        if (GameState.hasCompanion(this, 'cavediver')) {
            const glow = this.add.circle(this.caveX, glowY, glowR, 0x44bbaa, 0.22);
            this.tweens.add({
                targets: glow,
                alpha: 0.08,
                scale: 1.2,
                duration: 1800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        // --- Landed ship at world start ---
        this.shipX = -100;
        const shipImg = this.add.image(this.shipX, groundLine, 'ship_default')
            .setOrigin(0.5, 1)
            .setDepth(-1);
        shipImg.displayHeight = 256;
        shipImg.scaleX = shipImg.scaleY; // preserve aspect ratio
        shipImg.setFlipX(true);          // show rear of ship — player approaches from the right

        // --- Resource pickups from planet data ---
        const uncollectedItems = planet.items
            .map((item, index) => ({ ...item, index }))
            .filter(item => !item.collected);

        uncollectedItems.forEach((item, i) => {
            const px = item.x * WORLD_WIDTH;
            const py = height * 0.75 - Phaser.Math.Between(5, 25);
            const colorKey = item.type === 'unique' ? (item.uniqueId ?? 'unique') : item.type;

            // Exotic and oxygen plants render as flower sprites rooted in the ground; others are circles.
            const plantSprite = item.uniqueId && (
                EXOTIC_PLANT_SPRITES[item.uniqueId] ??
                (item.uniqueId.startsWith('oxygen_plant_') ? 'plant_basicblue' : undefined)
            );
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
        const playerStartX = data.spawnAtCave ? WORLD_WIDTH * 0.9 - 120 : 80;
        this.player = this.add.rectangle(playerStartX, this.groundY - 25, 20, 50, 0xaaaaaa, 0); // invisible hitbox
        this.physics.add.existing(this.player);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        this.playerSprite = createPlayerSprite(this, this.player.x, this.groundY);

        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, height);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        if (data.spawnAtCave) {
            // Snap camera to cave area immediately — avoids slow pan from world start
            this.cameras.main.scrollX = playerStartX - width / 2;
            // Fade in from black — "emerging from darkness" after leaving the cave
            this.cameras.main.fadeIn(500, 0, 0, 0);
        }

        // --- HUD (all pinned to screen) ---
        this.add.text(width * 0.5, 20, planet.name, {
            fontFamily: "'Share Tech Mono', 'Consolas', monospace",
            fontSize: '22px',
            color: '#888888',
        }).setOrigin(0.5).setScrollFactor(0);

        this.add.text(width * 0.5, 48, planet.biome.toUpperCase(), {
            fontFamily: "'Share Tech Mono', 'Consolas', monospace",
            fontSize: '14px',
            color: '#8a99a8',
        }).setOrigin(0.5).setScrollFactor(0);

        this.statusText = this.add.text(width * 0.5, 72, `Items remaining: ${uncollectedItems.length}`, {
            fontFamily: "'Share Tech Mono', 'Consolas', monospace",
            fontSize: '18px',
            color: '#8a99a8',
        }).setOrigin(0.5).setScrollFactor(0);

        // Center prompt — sci-fi panel, shown when near a pickup / cave / ship
        this.prompt = new HudPanel(this, width * 0.5, height * 0.88, { variant: 'prompt', anchor: 'center' });
        this.add.existing(this.prompt);
        this.prompt.setAlpha(0);

        // Cave indicator — bottom-right, visible when cavediver joined and not near cave
        this.caveIndicator = new HudPanel(this, width - 20, height * 0.88, { variant: 'indicator', anchor: 'right' });
        this.add.existing(this.caveIndicator);
        this.caveIndicator.setLabel('→ Cave');
        this.caveIndicator.setAlpha(0);

        // Ship indicator — bottom-left, quiet wayfinding cue toward the landing site
        this.shipIndicator = new HudPanel(this, 20, height * 0.88, { variant: 'indicator', anchor: 'left' });
        this.add.existing(this.shipIndicator);
        this.shipIndicator.setLabel('← Ship');
        this.shipIndicator.setAlpha(0.5);

        // Global navigation bar — shows A/D, M, E/L hints across the bottom
        this.add.existing(new GlobalNavBar(this, ['E', 'L']));

        // --- Input ---
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.leaveKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    }

    private getItemInfo(item: PlanetItem) {
        let key = item.type === 'unique' ? (item.uniqueId ?? 'unique') : item.type;
        if (key.startsWith('oxygen_plant_')) key = 'oxygen_plant';
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
        if (pickup.item.uniqueId?.startsWith('oxygen_plant_')) {
            GameState.collectOxygenPlant(this, pickup.item.uniqueId);
        }

        // Float-up feedback
        const feedbackText = info.resource
            ? `+${info.gain} ${info.name}`
            : `Collected: ${info.name}`;

        const label = this.add.text(pickup.sprite.x, pickup.sprite.y - 20, feedbackText, {
            fontFamily: "'Share Tech Mono', 'Consolas', monospace",
            fontSize: '18px',
            color: '#6ee0ff',
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
        this.prompt.setAlpha(0);
        this.currentPickup = null;
    }

    update() {
        this.bgTile.tilePositionX = this.cameras.main.scrollX * 0.3;

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

        // Cave indicator — show when cavediver joined, hide when near cave (prompt takes over)
        {
            const hasCavediver = GameState.hasCompanion(this, 'cavediver');
            const caveHasItems = GameState.getPlanet(this, this.planetId)
                ?.caveItems.some(i => !i.collected) ?? false;
            this.caveIndicator.setAlpha(
                hasCavediver && !this.nearCave ? (caveHasItems ? 0.7 : 0.25) : 0,
            );
            // Ship indicator — quiet wayfinding cue, hides only when at the ship
            this.shipIndicator.setAlpha(this.nearShip ? 0 : 0.5);
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
                const caveItemsLeft = planet?.caveItems.filter(i => !i.collected).length ?? 0;
                const caveLabel = caveItemsLeft > 0 ? `Cave — ${caveItemsLeft} items` : 'Cave — explored';
                this.prompt.setContent('[E] Enter', caveLabel);
            } else if (planet?.caveLit) {
                this.prompt.setContent('[E] Enter', 'A warm light flickers from deep within…');
            } else {
                this.prompt.setContent(undefined, "A dark cave. Wouldn't go in there.");
            }
            if (this.lastPromptTarget !== 'cave') this.anchorPanelAtPlayer(this.prompt);
            this.lastPromptTarget = 'cave';
            this.prompt.setAlpha(1);

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

        // Ship proximity — ship sits at the far-left edge (partly off-screen),
        // so "near the ship" = player is in the leftmost zone of the world
        this.nearShip = !this.currentPickup && !this.nearCave && this.player.x < 110;

        if (this.nearShip) {
            this.prompt.setContent('[E] Board', 'Your ship');
            if (this.lastPromptTarget !== 'ship') this.anchorPanelAtPlayer(this.prompt);
            this.lastPromptTarget = 'ship';
            this.prompt.setAlpha(1);

            if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
                this.scene.start('Ship');
                return;
            }
            return;
        }

        // Show/hide prompt — re-anchor only when the pickup target changes
        if (this.currentPickup) {
            const info = this.getItemInfo(this.currentPickup.item);
            const isLocked = this.currentPickup.item.locked;

            if (isLocked) {
                this.prompt.setContent(undefined, `${info.name}\n${info.desc}`);
            } else {
                const resourceHint = info.resource ? ` (+${info.gain} ${info.resource})` : '';
                this.prompt.setContent('[E] Pick up', `${info.name}${resourceHint}\n${info.desc}`);
            }
            if (this.lastPromptTarget !== this.currentPickup) this.anchorPanelAtPlayer(this.prompt);
            this.lastPromptTarget = this.currentPickup;
            this.prompt.setAlpha(1);
        } else {
            this.prompt.setAlpha(0);
            this.lastPromptTarget = null;
        }

        // Handle pickup
        if (this.currentPickup && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            if (!this.currentPickup.item.locked) {
                this.collectItem(this.currentPickup);
            }
            // Locked: prompt already shows the rejection (no [E] action)
        }

        // Leave planet
        if (Phaser.Input.Keyboard.JustDown(this.leaveKey)) {
            this.scene.start('Ship');
        }
    }

    /** Position a HudPanel at the player's screen position, clamped to viewport. */
    private anchorPanelAtPlayer(panel: HudPanel, yOffset: number = -90) {
        const cam = this.cameras.main;
        const screenX = this.player.x - cam.scrollX;
        const screenY = this.player.y - cam.scrollY;
        const { width } = this.scale;
        const halfW = 280;
        const clampedX = Math.max(halfW + 16, Math.min(width - halfW - 16, screenX));
        panel.setPosition(clampedX, screenY + yOffset);
    }
}
