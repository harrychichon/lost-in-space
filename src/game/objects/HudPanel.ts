import Phaser from 'phaser';

export interface HudPanelOptions {
    /** 'prompt' = larger center panel with action + description; 'indicator' = small single-line corner panel. */
    variant?: 'prompt' | 'indicator';
    /** Horizontal anchor of the panel relative to its (x,y) — like Text origin x. */
    anchor?: 'left' | 'center' | 'right';
}

// --- Visual constants — sci-fi cyan panel matching reference screenshot ---
const PANEL_BG          = 0x0a1822;
const PANEL_BG_ALPHA    = 0.85;
const PANEL_GLOW        = 0x4ab0d4;
const PANEL_GLOW_ALPHA  = 0.15;
const PANEL_BORDER      = 0x4ab0d4;
const PANEL_BORDER_A    = 0.6;
const CORNER_COLOR      = 0x6ee0ff;
const ACTION_COLOR      = '#6ee0ff';
const DESC_COLOR        = '#8a99a8';
const FONT_FAMILY       = "'Share Tech Mono', 'Consolas', monospace";

/**
 * Reusable sci-fi panel: dark rounded rect, cyan stroke, four L-shaped corner brackets,
 * bright cyan action line + muted description below. Auto-sizes to its content.
 *
 * Variant 'prompt' is the large centered panel (item info, [E] action prompts).
 * Variant 'indicator' is the small corner panel ("← Ship", "→ Cave").
 */
export class HudPanel extends Phaser.GameObjects.Container {
    private readonly variant: 'prompt' | 'indicator';
    private readonly anchor: 'left' | 'center' | 'right';
    private readonly padX: number;
    private readonly padY: number;
    private readonly spacing: number;
    private readonly radius: number;
    private readonly armLen: number;

    private readonly glowGfx: Phaser.GameObjects.Graphics;
    private readonly bgGfx: Phaser.GameObjects.Graphics;
    private readonly cornersGfx: Phaser.GameObjects.Graphics;
    private readonly actionTxt: Phaser.GameObjects.Text;
    private readonly descTxt: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, options: HudPanelOptions = {}) {
        super(scene, x, y);

        this.variant = options.variant ?? 'prompt';
        this.anchor  = options.anchor  ?? 'center';

        const isPrompt = this.variant === 'prompt';
        this.padX    = isPrompt ? 26 : 14;
        this.padY    = isPrompt ? 16 : 8;
        this.spacing = isPrompt ? 6  : 0;
        this.radius  = 6;
        this.armLen  = isPrompt ? 12 : 8;

        const actionSize = isPrompt ? 22 : 18;
        const descSize   = 18;
        const fontStyle  = 'normal'; // Share Tech Mono carries its own weight; bold renders unevenly

        this.glowGfx    = scene.add.graphics();
        this.bgGfx      = scene.add.graphics();
        this.cornersGfx = scene.add.graphics();

        this.actionTxt = scene.add.text(0, 0, '', {
            fontFamily: FONT_FAMILY,
            fontSize:   `${actionSize}px`,
            color:      ACTION_COLOR,
            fontStyle,
            align:      'center',
        }).setOrigin(0.5, 0);

        this.descTxt = scene.add.text(0, 0, '', {
            fontFamily: FONT_FAMILY,
            fontSize:   `${descSize}px`,
            color:      DESC_COLOR,
            align:      'center',
            wordWrap:   isPrompt ? { width: 540, useAdvancedWrap: true } : undefined,
        }).setOrigin(0.5, 0);

        this.add([this.glowGfx, this.bgGfx, this.cornersGfx, this.actionTxt, this.descTxt]);
        this.setScrollFactor(0);
    }

    /**
     * Set the prompt content. Either side can be omitted:
     *   - `action=undefined` → no top line (e.g. locked items, narrative only)
     *   - `description=undefined`/empty → no bottom line (e.g. simple "[E] Enter" prompts)
     */
    setContent(action: string | undefined, description?: string): this {
        if (action) {
            this.actionTxt.setText(action.toUpperCase()).setVisible(true);
        } else {
            this.actionTxt.setText('').setVisible(false);
        }
        if (description) {
            this.descTxt.setText(description).setVisible(true);
        } else {
            this.descTxt.setText('').setVisible(false);
        }
        this.relayout();
        return this;
    }

    /** Single-line label — convenience for indicator variant ("← Ship", "→ Cave"). */
    setLabel(text: string): this {
        this.actionTxt.setText(text).setVisible(true);
        this.descTxt.setText('').setVisible(false);
        this.relayout();
        return this;
    }

    private relayout(): void {
        // Measure visible text bounds.
        const aW = this.actionTxt.visible ? this.actionTxt.width  : 0;
        const aH = this.actionTxt.visible ? this.actionTxt.height : 0;
        const dW = this.descTxt.visible   ? this.descTxt.width    : 0;
        const dH = this.descTxt.visible   ? this.descTxt.height   : 0;

        const innerW = Math.max(aW, dW);
        const bothVisible = this.actionTxt.visible && this.descTxt.visible;
        const innerH = aH + dH + (bothVisible ? this.spacing : 0);

        const w = Math.ceil(innerW + 2 * this.padX);
        const h = Math.ceil(innerH + 2 * this.padY);

        // Anchor offset along x (vertical anchor is always center).
        const xOff = this.anchor === 'left' ? 0 : this.anchor === 'right' ? -w : -w / 2;
        const left   = xOff;
        const right  = xOff + w;
        const top    = -h / 2;
        const bottom =  h / 2;
        const cx     = left + w / 2;

        // 1. Outer glow — a slightly larger soft fill behind the panel.
        const glowPad = 4;
        this.glowGfx.clear();
        this.glowGfx.fillStyle(PANEL_GLOW, PANEL_GLOW_ALPHA);
        this.glowGfx.fillRoundedRect(left - glowPad, top - glowPad,
                                     w + 2 * glowPad, h + 2 * glowPad,
                                     this.radius + 2);

        // 2. Background fill + border stroke.
        this.bgGfx.clear();
        this.bgGfx.fillStyle(PANEL_BG, PANEL_BG_ALPHA);
        this.bgGfx.fillRoundedRect(left, top, w, h, this.radius);
        this.bgGfx.lineStyle(1.5, PANEL_BORDER, PANEL_BORDER_A);
        this.bgGfx.strokeRoundedRect(left, top, w, h, this.radius);

        // 3. Four L-shaped corner brackets.
        const arm   = this.armLen;
        const inset = 4;
        const c = this.cornersGfx;
        c.clear();
        c.lineStyle(2, CORNER_COLOR, 1);
        // top-left
        c.beginPath();
        c.moveTo(left + inset,         top + inset + arm);
        c.lineTo(left + inset,         top + inset);
        c.lineTo(left + inset + arm,   top + inset);
        c.strokePath();
        // top-right
        c.beginPath();
        c.moveTo(right - inset - arm,  top + inset);
        c.lineTo(right - inset,        top + inset);
        c.lineTo(right - inset,        top + inset + arm);
        c.strokePath();
        // bottom-left
        c.beginPath();
        c.moveTo(left + inset,         bottom - inset - arm);
        c.lineTo(left + inset,         bottom - inset);
        c.lineTo(left + inset + arm,   bottom - inset);
        c.strokePath();
        // bottom-right
        c.beginPath();
        c.moveTo(right - inset,        bottom - inset - arm);
        c.lineTo(right - inset,        bottom - inset);
        c.lineTo(right - inset - arm,  bottom - inset);
        c.strokePath();

        // 4. Position text inside the panel.
        this.actionTxt.setPosition(cx, top + this.padY);
        const descY = this.actionTxt.visible
            ? top + this.padY + aH + this.spacing
            : top + this.padY;
        this.descTxt.setPosition(cx, descY);
    }
}
