import { Scene } from 'phaser';

const TEXTURE_KEY = 'dog_idle';
const FRAME_WIDTH = 48;
const FRAME_HEIGHT = 48;
const IDLE_KEY = 'dog_idle';

export interface DogSpriteOptions {
    /** Display height in px. Width scaled to preserve aspect ratio. */
    height?: number;
    /** Flip horizontally (sprite faces right by default). */
    flipX?: boolean;
}

export function loadDogAssets(scene: Scene) {
    scene.load.spritesheet(TEXTURE_KEY, 'dog/Idle.png', {
        frameWidth: FRAME_WIDTH,
        frameHeight: FRAME_HEIGHT,
    });
}

export function createDogAnimations(scene: Scene) {
    const anims = scene.anims;
    if (!anims.exists(IDLE_KEY)) {
        anims.create({
            key: IDLE_KEY,
            frames: anims.generateFrameNumbers(TEXTURE_KEY, { start: 0, end: 3 }),
            frameRate: 6,
            repeat: -1,
        });
    }
    scene.textures.get(TEXTURE_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/** Create an idle dog sprite anchored by its feet at (x, y). */
export function createDogSprite(
    scene: Scene,
    x: number,
    y: number,
    options: DogSpriteOptions = {},
): Phaser.GameObjects.Sprite {
    const height = options.height ?? 60;
    const scale = height / FRAME_HEIGHT;
    const sprite = scene.add.sprite(x, y, TEXTURE_KEY, 0);
    sprite.setScale(scale);
    sprite.setOrigin(0.5, 1);
    if (options.flipX) sprite.setFlipX(true);
    sprite.play(IDLE_KEY);
    return sprite;
}
