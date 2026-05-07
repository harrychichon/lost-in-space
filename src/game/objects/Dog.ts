import { Scene } from "phaser";

const TEXTURE_KEY = "dog_idle";
const IDLE_KEY = "dog_idle";

const SOURCE_FRAME_H = 381;

// Per-source-frame crop rect + anchor in absolute source pixel coords.
// Widths/x's are tuned so neighboring dogs don't bleed in: frame 0 ends at 461 to
// exclude the snout of frame 1 (starts at src x=462). Anchors come from cross-correlating
// frames 0↔2 so the dog body stays put across frame swaps.
const FRAMES: Record<number, { srcX: number; srcW: number; anchorX: number; anchorY: number }> = {
    0: { srcX: 0,   srcW: 461, anchorX: 183,  anchorY: 360 },
    2: { srcX: 946, srcW: 473, anchorX: 1140, anchorY: 360 },
};

// Animation uses source frames 0 and 2.
const ANIM_SOURCE_INDICES = [0, 2];

// Vertical pivot bias — smaller value pushes feet visually lower on screen.
// 360/381 ≈ 0.945 puts feet exactly on y arg; we go a touch lower so dog sits on floor.
const FEET_PIVOT_Y = 0.8;

export interface DogSpriteOptions {
    /** Display height in px. Width scaled to preserve aspect ratio. */
    height?: number;
    /** Flip horizontally (sprite faces right by default). */
    flipX?: boolean;
}

export function loadDogAssets(scene: Scene) {
    scene.load.image(TEXTURE_KEY, "dog/Idle.png");
}

function frameName(sourceIndex: number) {
    return `dog_${sourceIndex}`;
}

export function createDogAnimations(scene: Scene) {
    const tex = scene.textures.get(TEXTURE_KEY);
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

    for (const i of ANIM_SOURCE_INDICES) {
        const name = frameName(i);
        if (tex.has(name)) continue;
        const f = FRAMES[i];
        const frame = tex.add(name, 0, f.srcX, 0, f.srcW, SOURCE_FRAME_H);
        if (!frame) continue;
        // customPivot makes Phaser auto-set origin to (pivotX, pivotY) on every frame change,
        // so each frame anchors at its own dog centroid → no horizontal shake.
        frame.customPivot = true;
        frame.pivotX = (f.anchorX - f.srcX) / f.srcW;
        frame.pivotY = FEET_PIVOT_Y;
    }

    if (!scene.anims.exists(IDLE_KEY)) {
        scene.anims.create({
            key: IDLE_KEY,
            frames: ANIM_SOURCE_INDICES.map((i) => ({
                key: TEXTURE_KEY,
                frame: frameName(i),
            })),
            frameRate: 4,
            repeat: -1,
        });
    }
}

/** Create an idle dog sprite anchored by its feet at (x, y). */
export function createDogSprite(
    scene: Scene,
    x: number,
    y: number,
    options: DogSpriteOptions = {},
): Phaser.GameObjects.Sprite {
    const height = options.height ?? 40;
    const scale = height / SOURCE_FRAME_H;
    const sprite = scene.add.sprite(
        x,
        y,
        TEXTURE_KEY,
        frameName(ANIM_SOURCE_INDICES[0]),
    );
    sprite.setScale(scale);
    if (options.flipX) sprite.setFlipX(true);
    sprite.play(IDLE_KEY);
    return sprite;
}
