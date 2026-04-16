import { Scene } from 'phaser';

interface Options {
    scale?: number;
    bgSpeed?: number;
    fl1Speed?: number;
    fl2Speed?: number;
    /** Constrain rendering area — used for ship portholes. */
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

/**
 * Parallax space background with three layers. Back layer drifts slowest,
 * front layers faster, giving depth as the ship drifts through space.
 */
export class SpaceBackground {
    private bg: Phaser.GameObjects.TileSprite;
    private fl1: Phaser.GameObjects.TileSprite;
    private fl2: Phaser.GameObjects.TileSprite;
    private bgSpeed: number;
    private fl1Speed: number;
    private fl2Speed: number;

    constructor(scene: Scene, options: Options = {}) {
        const scale = options.scale ?? 1.5;
        const x = options.x ?? 0;
        const y = options.y ?? 0;
        const w = options.width ?? scene.scale.width;
        const h = options.height ?? scene.scale.height;
        this.bg = scene.add
            .tileSprite(x, y, w, h, 'bg_space')
            .setOrigin(0, 0)
            .setTileScale(scale, scale);
        this.fl1 = scene.add
            .tileSprite(x, y, w, h, 'bg_space_fl1')
            .setOrigin(0, 0)
            .setTileScale(scale, scale);
        this.fl2 = scene.add
            .tileSprite(x, y, w, h, 'bg_space_fl2')
            .setOrigin(0, 0)
            .setTileScale(scale, scale);
        this.bgSpeed = options.bgSpeed ?? 3;
        this.fl1Speed = options.fl1Speed ?? 10;
        this.fl2Speed = options.fl2Speed ?? 22;
    }

    update(deltaMs: number) {
        const dt = deltaMs / 1000;
        this.bg.tilePositionX += this.bgSpeed * dt;
        this.fl1.tilePositionX += this.fl1Speed * dt;
        this.fl2.tilePositionX += this.fl2Speed * dt;
    }

    setMask(mask: Phaser.Display.Masks.GeometryMask | Phaser.Display.Masks.BitmapMask) {
        this.bg.setMask(mask);
        this.fl1.setMask(mask);
        this.fl2.setMask(mask);
    }

    setDepth(depth: number) {
        this.bg.setDepth(depth);
        this.fl1.setDepth(depth);
        this.fl2.setDepth(depth);
    }
}
