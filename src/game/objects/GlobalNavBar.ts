import Phaser from 'phaser'

// --- Bar styling — matches the cyan HudPanel aesthetic ---
const BAR_HEIGHT = 42
const BAR_BG = 0x000000
const BAR_BG_ALPHA = 0.55
const BAR_BORDER = 0x4ab0d4
const BAR_BORDER_ALPHA = 0.25

// --- Key icon ("[A]", "[M]" etc.) — scaled down to reduce HUD overlap ---
const KEY_W = 30
const KEY_H = 24
const KEY_GAP = 4 // between two keys in the same slot
const KEY_LABEL_GAP = 10 // between key icon(s) and the label
const KEY_RADIUS = 4
const KEY_BG = 0x0a1822
const KEY_BG_ALPHA = 0.85
const KEY_BORDER = 0x4ab0d4
const KEY_BORDER_ALPHA = 0.7
const KEY_TEXT_COLOR = '#6ee0ff'

// --- Label next to keys ---
const LABEL_COLOR = '#8a99a8'
const KEY_FONT_SIZE = '16px'
const LABEL_FONT_SIZE = '16px'
const SLOT_CONTENT_Y = 2

const FONT = "'Share Tech Mono', 'Consolas', monospace"
const NAV_BAR_DEPTH = 1000

type SlotAnchor = 'left' | 'center' | 'right'

/**
 * Global navigation hint bar at the bottom of the screen.
 * Three slots: movement (A/D), map (M), actions (E plus optional extras).
 * The actions slot defaults to just ['E']; pass ['E', 'L'] on Planet/Cave
 * where the L key is bound to "leave". Pinned to screen, above all gameplay:
 *   `this.add.existing(new GlobalNavBar(this));`
 *   `this.add.existing(new GlobalNavBar(this, ['E', 'L']));`
 */
export class GlobalNavBar extends Phaser.GameObjects.Container {
    constructor(scene: Phaser.Scene, actionKeys: string[] = ['E']) {
        const { width, height } = scene.scale
        super(scene, 0, 0)

        const barY = height - BAR_HEIGHT
        const centerY = barY + BAR_HEIGHT / 2

        // Bar background — full-width dark strip with thin top border line.
        const bg = scene.add.graphics()
        bg.fillStyle(BAR_BG, BAR_BG_ALPHA)
        bg.fillRect(0, barY, width, BAR_HEIGHT)
        bg.lineStyle(1, BAR_BORDER, BAR_BORDER_ALPHA)
        bg.lineBetween(0, barY, width, barY)
        this.add(bg)

        // Three slots laid out across the bar.
        this.add(this.buildSlot(scene, 30, centerY, 'left', ['A', 'D'], 'MOVEMENT'))
        this.add(this.buildSlot(scene, width / 2, centerY, 'center', ['M'], 'MAP'))
        this.add(this.buildSlot(scene, width - 30, centerY, 'right', actionKeys, 'ACTIONS'))

        this.setScrollFactor(0).setDepth(NAV_BAR_DEPTH)
    }

    /** Build one slot (key icon(s) + label) anchored at (x,y). */
    private buildSlot(
        scene: Phaser.Scene,
        x: number,
        y: number,
        anchor: SlotAnchor,
        keys: string[],
        label: string
    ): Phaser.GameObjects.Container {
        const slot = scene.add.container(0, y + SLOT_CONTENT_Y)
        let cursorX = 0

        // Key icons in a row — small rounded rect with letter inside.
        for (const k of keys) {
            const g = scene.add.graphics()
            g.fillStyle(KEY_BG, KEY_BG_ALPHA)
            g.fillRoundedRect(cursorX, -KEY_H / 2, KEY_W, KEY_H, KEY_RADIUS)
            g.lineStyle(1.5, KEY_BORDER, KEY_BORDER_ALPHA)
            g.strokeRoundedRect(cursorX, -KEY_H / 2, KEY_W, KEY_H, KEY_RADIUS)

            const t = scene.add
                .text(cursorX + KEY_W / 2, 0, k, {
                    fontFamily: FONT,
                    fontSize: KEY_FONT_SIZE,
                    color: KEY_TEXT_COLOR,
                })
                .setOrigin(0.5)

            slot.add([g, t])
            cursorX += KEY_W + KEY_GAP
        }

        // Trim the trailing key gap and add the label gap before the text.
        const labelX = cursorX - KEY_GAP + KEY_LABEL_GAP
        const labelTxt = scene.add
            .text(labelX, 0, label, {
                fontFamily: FONT,
                fontSize: LABEL_FONT_SIZE,
                color: LABEL_COLOR,
            })
            .setOrigin(0, 0.5)
        slot.add(labelTxt)

        // Anchor the entire slot. We measure total width via the label's right edge.
        const totalW = labelX + labelTxt.width
        const xOffset = anchor === 'center' ? -totalW / 2 : anchor === 'right' ? -totalW : 0
        slot.x = x + xOffset
        return slot
    }
}
