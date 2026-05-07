import { Scene } from 'phaser';

const TEXTURE_KEY = 'player_sheet';
const FRAME_WIDTH = 340;
const FRAME_HEIGHT = 500;
const IDLE_KEY = 'player_idle';
const IDLE_BACK_KEY = 'player_idle_back';
const WALK_KEY = 'player_walk';

export type PlayerFacing = 'front' | 'back';

export interface PlayerSpriteOptions {
    /** Display height in px. Width is scaled to preserve aspect ratio. */
    height?: number;
    facing?: PlayerFacing;
}

export function loadPlayerAssets(scene: Scene) {
    scene.load.spritesheet(TEXTURE_KEY, 'space/space man.png', {
        frameWidth: FRAME_WIDTH,
        frameHeight: FRAME_HEIGHT,
    });
}

export function createPlayerAnimations(scene: Scene) {
    const anims = scene.anims;
    if (!anims.exists(IDLE_KEY)) {
        anims.create({
            key: IDLE_KEY,
            frames: anims.generateFrameNumbers(TEXTURE_KEY, { start: 0, end: 4 }),
            frameRate: 6,
            repeat: -1,
        });
    }
    if (!anims.exists(IDLE_BACK_KEY)) {
        anims.create({
            key: IDLE_BACK_KEY,
            frames: anims.generateFrameNumbers(TEXTURE_KEY, { start: 5, end: 9 }),
            frameRate: 6,
            repeat: -1,
        });
    }
    if (!anims.exists(WALK_KEY)) {
        anims.create({
            key: WALK_KEY,
            frames: anims.generateFrameNumbers(TEXTURE_KEY, { start: 10, end: 14 }),
            frameRate: 10,
            repeat: -1,
        });
    }
    // Crisp pixel art — no bilinear smoothing.
    scene.textures.get(TEXTURE_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/**
 * Create a player sprite. The sprite's origin is set so its feet align with
 * the y coordinate passed in — pass the hitbox's bottom y.
 */
export function createPlayerSprite(
    scene: Scene,
    x: number,
    y: number,
    options: PlayerSpriteOptions = {},
): Phaser.GameObjects.Sprite {
    const height = options.height ?? 110;
    const scale = height / FRAME_HEIGHT;
    const sprite = scene.add.sprite(x, y, TEXTURE_KEY, 0);
    sprite.setScale(scale);
    // Feet sit around 76% down the frame (rest is padding); origin puts feet at (x, y).
    sprite.setOrigin(0.5, 0.76);
    sprite.play(options.facing === 'back' ? IDLE_BACK_KEY : IDLE_KEY);
    return sprite;
}

/**
 * Update a player sprite's position, facing, and animation based on velocity.
 * Pass the velocity x so the sprite knows which way it's moving.
 * The base animation is "walking left", flipped when moving right.
 */
export function updatePlayerSprite(
    sprite: Phaser.GameObjects.Sprite,
    x: number,
    y: number,
    vx: number,
    facing: PlayerFacing = 'front',
) {
    sprite.setPosition(x, y);

    if (Math.abs(vx) > 1) {
        sprite.setFlipX(vx > 0); // base anim walks left, flip for right
        if (sprite.anims.currentAnim?.key !== WALK_KEY) {
            sprite.play(WALK_KEY);
        }
    } else {
        const idleKey = facing === 'back' ? IDLE_BACK_KEY : IDLE_KEY;
        if (sprite.anims.currentAnim?.key !== idleKey) {
            sprite.setFlipX(false);
            sprite.play(idleKey);
        }
    }
}
