import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';
import { AudioManager } from '../systems/AudioManager';
import { createPlayerSprite, updatePlayerSprite } from '../objects/Player';
import { GlobalNavBar } from '../objects/GlobalNavBar';

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
    protected playerSprite!: Phaser.GameObjects.Sprite;
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

        GameState.applyGrayscale(this);

        AudioManager.update(this, {
            warmth: GameState.getSaturation(this),
            location: 'room',
        });

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

        // Player (invisible hitbox — visual is a sprite positioned on top)
        this.player = this.add.rectangle(this.roomLeft + 60, this.floorY - 25, 20, 50, 0xaaaaaa, 0);
        this.physics.add.existing(this.player);
        (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
        this.playerSprite = createPlayerSprite(this, this.player.x, this.floorY).setDepth(10);

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

        this.add.existing(new GlobalNavBar(this));
    }

    /** Draw an exit door and register its interact point. */
    protected addExitDoor(_gfx: Phaser.GameObjects.Graphics, x: number) {
        // Metal door sprite (frame 13: col 3, row 2) at 2× scale = 48×64
        const door = this.add.image(x, this.floorY, 'doors', 13);
        door.setOrigin(0.5, 1);
        door.setScale(2);

        this.interactPoints.push({
            x,
            label: 'Leave',
            action: () => {
                if (this.transitioning) return;
                this.transitioning = true;
                this.scene.start('Ship', { fromRoom: this.scene.key });
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

        // Movement
        if (this.cursors.left.isDown || this.keyA.isDown) {
            body.setVelocityX(-200);
        } else if (this.cursors.right.isDown || this.keyD.isDown) {
            body.setVelocityX(200);
        } else {
            body.setVelocityX(0);
        }

        updatePlayerSprite(this.playerSprite, this.player.x, this.floorY, body.velocity.x);

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
                this.scene.start('Ship', { fromRoom: this.scene.key });
            }
        }
    }

    // --- Shared drawing methods (same visuals as Ship/Planet) ---

    protected drawCavediver(gfx: Phaser.GameObjects.Graphics, x: number, y: number) {
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
        // Helmet — hardhat style
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
