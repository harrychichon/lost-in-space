import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

const BAR_W       = 300;
const ZONE_START  = 105;  // green zone left edge (bar-relative px)
const ZONE_END    = 195;  // green zone right edge (bar-relative px)
const CURSOR_SPEED = 200; // px / sec
const PLANTS      = 3;

export class GreenhouseModal extends Scene {
    private barLeft  = 0;
    private barTop   = 0;
    private cursorX  = 0;
    private cursorDir = 1;
    private currentPlant = 0;
    private finished = false;
    private canPress = true;

    private cursorRect!: Phaser.GameObjects.Rectangle;
    private plantIcons: Phaser.GameObjects.Text[] = [];
    private statusText!: Phaser.GameObjects.Text;
    private interactKey!: Phaser.Input.Keyboard.Key;
    private escKey!: Phaser.Input.Keyboard.Key;
    private zoneRect!: Phaser.GameObjects.Rectangle;

    constructor() {
        super('GreenhouseModal');
    }

    create() {
        const { width, height } = this.scale;
        const cx = width  * 0.5;
        const cy = height * 0.5;

        const mw = 560;
        const mh = 320;
        const mt = cy - mh / 2;

        // ── Overlay ────────────────────────────────────────────────────────
        this.add.rectangle(cx, cy, width, height, 0x000000, 0.72);

        // ── Modal box ──────────────────────────────────────────────────────
        this.add.rectangle(cx, cy, mw, mh, 0x111611, 1);
        const border = this.add.graphics();
        border.lineStyle(1, 0x334433, 0.8);
        border.strokeRect(cx - mw / 2, mt, mw, mh);

        // ── Title ──────────────────────────────────────────────────────────
        this.add.text(cx, mt + 32, 'Greenhouse', {
            fontFamily: 'Georgia, serif',
            fontSize: '22px',
            color: '#778877',
        }).setOrigin(0.5);

        // ── Flavor text ────────────────────────────────────────────────────
        const state = GameState.get(this);
        const flavor = state.companions === 0
            ? 'Water each plant. They grow whether you care or not.'
            : 'Time to tend the plants.';
        this.add.text(cx, mt + 66, flavor, {
            fontFamily: 'Georgia, serif',
            fontSize: '13px',
            color: '#556655',
            align: 'center',
        }).setOrigin(0.5);

        // ── Plant progress indicators ──────────────────────────────────────
        const plantY = mt + 118;
        const plantSpacing = 80;
        this.plantIcons = [];
        for (let i = 0; i < PLANTS; i++) {
            const px = cx + (i - 1) * plantSpacing;
            // Leaf glyph background
            this.add.text(px, plantY, '🌿', {
                fontSize: '20px',
            }).setOrigin(0.5).setAlpha(0.25);

            const icon = this.add.text(px, plantY + 26, '○', {
                fontFamily: 'Georgia, serif',
                fontSize: '18px',
                color: '#445544',
            }).setOrigin(0.5);
            this.plantIcons.push(icon);
        }

        // ── Timing bar ────────────────────────────────────────────────────
        const barH  = 18;
        this.barLeft = cx - BAR_W / 2;
        this.barTop  = mt + 182;

        // Background
        this.add.rectangle(cx, this.barTop + barH / 2, BAR_W, barH, 0x1e2a1e);
        // Border
        const barBorder = this.add.graphics();
        barBorder.lineStyle(1, 0x334433, 0.6);
        barBorder.strokeRect(this.barLeft, this.barTop, BAR_W, barH);

        // Green zone
        const zoneX = this.barLeft + ZONE_START + (ZONE_END - ZONE_START) / 2;
        const zoneW = ZONE_END - ZONE_START;
        this.zoneRect = this.add.rectangle(zoneX, this.barTop + barH / 2, zoneW, barH, 0x334433, 1);

        // Zone edge markers
        const markers = this.add.graphics();
        markers.lineStyle(1, 0x447744, 0.9);
        markers.lineBetween(this.barLeft + ZONE_START, this.barTop, this.barLeft + ZONE_START, this.barTop + barH);
        markers.lineBetween(this.barLeft + ZONE_END,   this.barTop, this.barLeft + ZONE_END,   this.barTop + barH);

        // Cursor (starts at left edge, moves right)
        this.cursorX  = 0;
        this.cursorDir = 1;
        this.cursorRect = this.add.rectangle(
            this.barLeft,
            this.barTop + barH / 2,
            4, barH + 4,
            0xaabbaa, 1,
        );

        // ── Instructions ───────────────────────────────────────────────────
        this.add.text(cx, this.barTop + barH + 18, 'Press  [E]  when the cursor is in the green zone', {
            fontFamily: 'Georgia, serif',
            fontSize: '12px',
            color: '#556655',
            align: 'center',
        }).setOrigin(0.5);

        // ── Status / result text ───────────────────────────────────────────
        this.statusText = this.add.text(cx, mt + mh - 52, '', {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#778877',
            align: 'center',
        }).setOrigin(0.5);

        // ── ESC hint ───────────────────────────────────────────────────────
        this.add.text(cx + mw / 2 - 16, mt + mh - 18, '[ESC] Leave', {
            fontFamily: 'Georgia, serif',
            fontSize: '11px',
            color: '#445544',
        }).setOrigin(1, 0.5);

        // ── Input ──────────────────────────────────────────────────────────
        this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.escKey      = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    update(_time: number, delta: number) {
        if (this.finished) return;

        // Move cursor
        const dt = delta / 1000;
        this.cursorX += this.cursorDir * CURSOR_SPEED * dt;
        if (this.cursorX <= 0)     { this.cursorX = 0;     this.cursorDir =  1; }
        if (this.cursorX >= BAR_W) { this.cursorX = BAR_W; this.cursorDir = -1; }
        this.cursorRect.x = this.barLeft + this.cursorX;

        // Highlight zone when cursor is inside
        const inZone = this.cursorX >= ZONE_START && this.cursorX <= ZONE_END;
        this.zoneRect.setFillStyle(inZone ? 0x446644 : 0x334433);

        if (this.canPress && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.handlePress(inZone);
        }

        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.closeModal(false);
        }
    }

    private handlePress(inZone: boolean) {
        if (inZone) {
            this.onHit();
        } else {
            this.onMiss();
        }
    }

    private onHit() {
        this.canPress = false;

        // Mark plant as done
        const icon = this.plantIcons[this.currentPlant];
        icon.setText('✓').setColor('#667766');
        this.currentPlant++;

        // Flash zone green
        this.tweens.add({
            targets: this.zoneRect,
            alpha: 0.2,
            duration: 200,
            yoyo: true,
            onComplete: () => this.zoneRect.setAlpha(1),
        });

        if (this.currentPlant >= PLANTS) {
            this.onComplete();
        } else {
            this.statusText.setText(`Plant ${this.currentPlant} of ${PLANTS} done.`);
            // Reset cursor to left edge for next plant
            this.time.delayedCall(300, () => {
                this.cursorX   = 0;
                this.cursorDir = 1;
                this.canPress  = true;
            });
        }
    }

    private onMiss() {
        // Flash cursor red briefly — no other penalty
        this.tweens.add({
            targets: this.cursorRect,
            alpha: 0.3,
            duration: 120,
            yoyo: true,
        });
    }

    private onComplete() {
        this.finished = true;

        const state = GameState.get(this);
        GameState.completeChore(this, 'greenhouse');

        const msg = state.companions === 0
            ? 'You water the plants in silence.\nThey grow. You don\'t.'
            : 'You tend the plants together.';

        this.statusText.setText(msg).setColor('#889988');

        this.time.delayedCall(1400, () => this.closeModal(true));
    }

    private closeModal(choreCompleted: boolean) {
        if (choreCompleted) {
            // Restart Ship so the chore checklist reflects the new state
            this.scene.stop('GreenhouseModal');
            this.scene.get('Ship').scene.restart({ fromRoom: 'Greenhouse' });
        } else {
            this.scene.resume('Ship');
            this.scene.stop('GreenhouseModal');
        }
    }
}
