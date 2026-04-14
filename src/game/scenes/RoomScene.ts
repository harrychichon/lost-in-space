import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

export interface InteractPoint {
    x: number;
    label: string;
    action: () => void;
}

/**
 * Abstract base class for explorable room scenes (Kitchen, Greenhouse, Engine, Comms).
 * Provides player movement, proximity-based interaction, and shared drawing methods.
 */
export abstract class RoomScene extends Scene {
    protected player!: Phaser.GameObjects.Rectangle;
    protected playerGfx!: Phaser.GameObjects.Graphics;
    protected cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    protected keyA!: Phaser.Input.Keyboard.Key;
    protected keyD!: Phaser.Input.Keyboard.Key;
    protected interactKey!: Phaser.Input.Keyboard.Key;
    protected escKey!: Phaser.Input.Keyboard.Key;
    protected promptText!: Phaser.GameObjects.Text;
    protected messageText!: Phaser.GameObjects.Text;
    protected interactPoints: InteractPoint[] = [];
    protected currentPoint: InteractPoint | null = null;
    protected transitioning = false;
    protected floorY = 0;
    /** Left edge of the walkable room area. */
    protected roomLeft = 0;
    /** Right edge of the walkable room area. */
    protected roomRight = 0;
    /** Width of the walkable room area. */
    protected roomWidth = 0;

    /** Call at start of create() — initialises state, grayscale, and input keys. */
    protected setupRoom() {
        const { width, height } = this.scale;
        this.floorY = height * 0.7;
        this.interactPoints = [];
        this.currentPoint = null;
        this.transitioning = false;

        // Room bounds — centered, 50% of canvas width
        this.roomWidth = width * 0.5;
        this.roomLeft = (width - this.roomWidth) / 2;
        this.roomRight = this.roomLeft + this.roomWidth;

        // Apply grayscale based on companion count
        const saturation = GameState.getSaturation(this);
        if (saturation < 1) {
            this.cameras.main.postFX.addColorMatrix().grayscale(1 - saturation);
        }

        // Input
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    /** Convert a 0–1 fraction to an x position within the room bounds. */
    protected rx(fraction: number): number {
        return this.roomLeft + fraction * this.roomWidth;
    }

    /** Call after room graphics — creates player, side walls, and UI text on top. */
    protected setupPlayerAndUI() {
        const { width, height } = this.scale;

        // Constrain player to room bounds
        this.physics.world.setBounds(this.roomLeft, 0, this.roomWidth, height);

        // Player (invisible hitbox — visual drawn each frame by playerGfx)
        this.player = this.add.rectangle(this.roomLeft + 60, this.floorY - 25, 20, 50, 0xaaaaaa, 0);
        this.physics.add.existing(this.player);
        (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
        this.playerGfx = this.add.graphics().setDepth(10);

        // Side walls — hull panels that mask content outside the room
        const walls = this.add.graphics().setDepth(15);
        // Left hull
        walls.fillStyle(0x0a0a0a, 1);
        walls.fillRect(0, 0, this.roomLeft, height);
        // Right hull
        walls.fillStyle(0x0a0a0a, 1);
        walls.fillRect(this.roomRight, 0, width - this.roomRight, height);
        // Wall edge trim
        walls.fillStyle(0x222222, 1);
        walls.fillRect(this.roomLeft - 3, height * 0.15, 3, height * 0.85);
        walls.fillRect(this.roomRight, height * 0.15, 3, height * 0.85);

        // Prompt text (shown when near an interact point)
        this.promptText = this.add.text(width * 0.5, height * 0.9, '', {
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            color: '#aaaaaa',
        }).setOrigin(0.5).setAlpha(0).setDepth(20);

        // Message text (shown after interacting)
        this.messageText = this.add.text(width * 0.5, height * 0.82, '', {
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            color: '#999999',
            wordWrap: { width: 500 },
            align: 'center',
        }).setOrigin(0.5).setAlpha(0).setDepth(20);

        // ESC hint
        this.add.text(this.roomLeft + 8, height - 24, '[ESC] Leave', {
            fontFamily: 'Georgia, serif',
            fontSize: '12px',
            color: '#444444',
        }).setDepth(20);
    }

    /** Draw an exit door and register its interact point. */
    protected addExitDoor(gfx: Phaser.GameObjects.Graphics, x: number) {
        const doorH = 70;
        const doorW = 45;
        // Frame
        gfx.fillStyle(0x2a2a2a, 1);
        gfx.fillRect(x - doorW / 2 - 4, this.floorY - doorH - 4, doorW + 8, doorH + 4);
        // Door
        gfx.fillStyle(0x444444, 1);
        gfx.fillRect(x - doorW / 2, this.floorY - doorH, doorW, doorH);
        // Handle
        gfx.fillStyle(0x999999, 1);
        gfx.fillCircle(x + doorW / 2 - 8, this.floorY - doorH / 2, 3);

        this.interactPoints.push({
            x,
            label: 'Leave',
            action: () => {
                if (this.transitioning) return;
                this.transitioning = true;
                this.scene.start('Ship');
            },
        });
    }

    /** Show a message that fades in, holds, then fades out. */
    protected showMessage(text: string, color = '#999999') {
        this.messageText.setText(text);
        this.messageText.setColor(color);
        this.messageText.setAlpha(0);
        this.tweens.killTweensOf(this.messageText);
        this.tweens.add({
            targets: this.messageText,
            alpha: 1,
            duration: 500,
            hold: 2500,
            yoyo: true,
            ease: 'Power2',
        });
    }

    /** Call from update() — handles movement, proximity detection, and input. */
    protected updateRoom() {
        if (this.transitioning) return;

        const body = this.player.body as Phaser.Physics.Arcade.Body;
        this.drawPlayer(this.playerGfx, this.player.x, this.player.y);

        // Movement
        if (this.cursors.left.isDown || this.keyA.isDown) {
            body.setVelocityX(-200);
        } else if (this.cursors.right.isDown || this.keyD.isDown) {
            body.setVelocityX(200);
        } else {
            body.setVelocityX(0);
        }

        // Find nearest interact point in range
        this.currentPoint = null;
        for (const point of this.interactPoints) {
            if (Math.abs(this.player.x - point.x) < 40) {
                this.currentPoint = point;
                break;
            }
        }

        // Show/hide prompt
        if (this.currentPoint) {
            this.promptText.setText(`[E] ${this.currentPoint.label}`);
            this.promptText.setAlpha(1);
        } else {
            this.promptText.setAlpha(0);
        }

        // Handle E key
        if (this.currentPoint && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.currentPoint.action();
        }

        // ESC to leave
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            if (!this.transitioning) {
                this.transitioning = true;
                this.scene.start('Ship');
            }
        }
    }

    // --- Shared drawing methods (same visuals as Ship/Planet) ---

    protected drawPlayer(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
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

    protected drawDog(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
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
        // Ears
        gfx.fillStyle(0x886644, 1);
        gfx.fillTriangle(x + 7, y - 13, x + 11, y - 13, x + 9, y - 8);
        gfx.fillTriangle(x + 14, y - 13, x + 18, y - 13, x + 16, y - 8);
        // Space helmet
        gfx.lineStyle(2, 0x8899aa, 0.7);
        gfx.strokeCircle(x + 12, y - 5, 9);
        // Helmet reflection
        gfx.fillStyle(0xaabbcc, 0.15);
        gfx.fillCircle(x + 10, y - 7, 4);
        // Eye
        gfx.fillStyle(0x222222, 1);
        gfx.fillCircle(x + 14, y - 6, 1.5);
        // Snout
        gfx.fillStyle(0xbb9977, 1);
        gfx.fillCircle(x + 17, y - 4, 2);
    }

    protected drawCompanionHuman(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
        // Legs
        gfx.fillStyle(0x555566, 1);
        gfx.fillRect(x - 5, y + 10, 4, 14);
        gfx.fillRect(x + 1, y + 10, 4, 14);
        // Boots
        gfx.fillStyle(0x444455, 1);
        gfx.fillRect(x - 6, y + 22, 6, 3);
        gfx.fillRect(x, y + 22, 6, 3);
        // Body
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
        // Helmet
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
        // Smile
        gfx.lineStyle(1, 0x222222, 0.6);
        gfx.beginPath();
        gfx.arc(x, y - 14, 3, 0.2, Math.PI - 0.2);
        gfx.strokePath();
        // Visor reflection
        gfx.fillStyle(0xaabb99, 0.2);
        gfx.fillCircle(x - 3, y - 19, 3);
    }
}
