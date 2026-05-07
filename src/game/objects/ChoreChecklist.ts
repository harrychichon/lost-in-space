import { Scene } from 'phaser';
import { GameState, Chores } from '../systems/GameState';

const FONT = '"Share Tech Mono", "Courier New", monospace';
const SCALE = 0.75;

function s(v: number) { return v * SCALE; }
function px(v: number) { return `${Math.max(1, Math.round(v * SCALE))}px`; }

// ── Icon drawers ─────────────────────────────────────────────────────────────

function drawIconEat(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number) {
    g.fillStyle(color, 1);
    // Fork: two tines + handle
    g.fillRect(cx - 7, cy - 9, 2, 10);
    g.fillRect(cx - 3, cy - 9, 2, 10);
    g.fillRect(cx - 7, cy - 9, 6, 2); // tine crossbar top
    g.fillRect(cx - 4, cy + 1, 2, 8); // handle
    // Knife: blade + handle
    g.fillRect(cx + 3, cy - 9, 2, 12);
    g.fillRect(cx + 3, cy - 9, 5, 2);  // blade tip
    g.fillRect(cx + 3, cy + 3, 2, 6);  // handle
}

function drawIconPlant(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number) {
    g.fillStyle(color, 1);
    // Stem
    g.fillRect(cx - 1, cy - 2, 2, 11);
    // Left leaf
    g.fillRect(cx - 8, cy - 6, 8, 4);
    g.fillRect(cx - 6, cy - 9, 5, 4);
    // Right leaf
    g.fillRect(cx + 1, cy - 8, 8, 4);
    g.fillRect(cx + 2, cy - 11, 5, 4);
    // Roots hint
    g.fillRect(cx - 3, cy + 8, 2, 3);
    g.fillRect(cx + 1, cy + 8, 2, 3);
}

function drawIconGear(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number) {
    g.fillStyle(color, 1);
    // Outer ring via filled circle minus inner
    g.fillCircle(cx, cy, 9);
    g.fillStyle(0x05070a, 1);
    g.fillCircle(cx, cy, 5);
    g.fillStyle(color, 1);
    // Teeth (4 cardinal)
    g.fillRect(cx - 2, cy - 13, 4, 5);
    g.fillRect(cx - 2, cy + 8,  4, 5);
    g.fillRect(cx - 13, cy - 2, 5, 4);
    g.fillRect(cx + 8,  cy - 2, 5, 4);
    // Centre hole
    g.fillStyle(0x05070a, 1);
    g.fillCircle(cx, cy, 3);
}

function drawIconComms(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number) {
    g.fillStyle(color, 1);
    // Antenna vertical
    g.fillRect(cx - 1, cy - 10, 2, 12);
    // Horizontal bar
    g.fillRect(cx - 6, cy, 12, 2);
    // Arc waves (simplified as short horizontal bars)
    g.fillRect(cx - 10, cy - 5, 4, 2);
    g.fillRect(cx + 6,  cy - 5, 4, 2);
    g.fillRect(cx - 13, cy - 9, 4, 2);
    g.fillRect(cx + 9,  cy - 9, 4, 2);
    // Base legs
    g.fillRect(cx - 5, cy + 2, 3, 5);
    g.fillRect(cx + 2, cy + 2, 3, 5);
}

// ── Main component ────────────────────────────────────────────────────────────

const REGISTRY_KEY = 'choreListCollapsed';

export function drawChoreChecklist(scene: Scene, state: ReturnType<typeof GameState.get>) {
    const choreList: { key: keyof Chores; label: string; icon: (g: Phaser.GameObjects.Graphics, cx: number, cy: number, col: number) => void }[] = [
        { key: 'kitchen',    label: 'Eat',          icon: drawIconEat   },
        { key: 'greenhouse', label: 'Tend Plants',  icon: drawIconPlant },
        { key: 'engine',     label: 'Engine Check', icon: drawIconGear  },
        { key: 'comms',      label: 'Check Comms',  icon: drawIconComms },
    ];

    const allDone = choreList.every(c => state.chores[c.key]);

    // Default: collapse automatically when all done, stay open otherwise
    const storedCollapsed = scene.registry.get(REGISTRY_KEY);
    const collapsed = allDone && (storedCollapsed === true || storedCollapsed === undefined);

    const panelX  = 14;
    const panelY  = 96;
    const panelW  = s(240);
    const rowH    = s(52);
    const rowGap  = s(6);
    const padTop  = s(48);
    const padBot  = s(10);
    const fullH   = padTop + choreList.length * rowH + (choreList.length - 1) * rowGap + padBot;
    const miniH   = padTop;

    const COL_BG      = 0x05070a;
    const COL_BORDER  = 0x2a3545;
    const COL_AMBER   = 0xc8860a;
    const COL_ICON_D  = 0x3a5a3a;
    const COL_ICON    = 0x6a8899;
    const COL_ICON_A  = 0xc8a030;

    // Container groups everything so we can destroy + redraw on toggle
    const container = scene.add.container(0, 0);

    const panelH = collapsed ? miniH : fullH;

    const gfx = scene.add.graphics();
    container.add(gfx);

    // ── Outer panel ──
    gfx.fillStyle(COL_BG, 0.88);
    gfx.fillRoundedRect(panelX, panelY, panelW, panelH, s(8));
    const borderColor = (allDone && collapsed) ? 0x2a5a2a : COL_BORDER;
    gfx.lineStyle(1, borderColor, 1);
    gfx.strokeRoundedRect(panelX, panelY, panelW, panelH, s(8));

    // ── Header ──
    const hcy = panelY + s(24);
    const hiX = panelX + s(14);

    // Hamburger icon
    gfx.fillStyle(0x8899aa, 1);
    for (let r = 0; r < 3; r++) {
        gfx.fillRect(hiX, hcy - s(6) + r * s(6), s(14), s(2.5));
    }

    const titleText = scene.add.text(panelX + s(36), hcy, 'DAILY TASKS', {
        fontFamily: FONT,
        fontSize:   px(20),
        color:      allDone ? '#4a9a4a' : '#a0aabb',
    }).setOrigin(0, 0.5);
    container.add(titleText);

    // Green checkmark badge next to title when all done
    if (allDone) {
        const ckX = panelX + panelW - s(22);
        gfx.fillStyle(0x2a6a2a, 1);
        gfx.fillCircle(ckX, hcy, s(9));
        gfx.lineStyle(s(2), 0x88ee88, 1);
        gfx.beginPath();
        gfx.moveTo(ckX - s(4), hcy);
        gfx.lineTo(ckX - s(1), hcy + s(3.5));
        gfx.lineTo(ckX + s(5), hcy - s(4));
        gfx.strokePath();
    }

    // ── Rows (only when expanded) ──
    if (!collapsed) {
        const firstUndoneKey = choreList.find(c => !state.chores[c.key])?.key ?? null;

        choreList.forEach((chore, i) => {
            const done   = state.chores[chore.key];
            const active = !done && chore.key === firstUndoneKey;

            const rowX = panelX + s(8);
            const rowY = panelY + padTop + i * (rowH + rowGap);
            const rowW = panelW - s(16);

            gfx.fillStyle(done ? 0x060a08 : (active ? 0x0d1008 : 0x080c12), 0.95);
            gfx.fillRoundedRect(rowX, rowY, rowW, rowH, s(5));

            if (active) {
                gfx.lineStyle(1.5, COL_AMBER, 1);
            } else {
                gfx.lineStyle(1, done ? 0x1a2a1a : 0x1e2a38, 1);
            }
            gfx.strokeRoundedRect(rowX, rowY, rowW, rowH, s(5));

            const cy = rowY + rowH * 0.5;

            const iconColor = done ? COL_ICON_D : (active ? COL_ICON_A : COL_ICON);
            chore.icon(gfx, rowX + s(24), cy, iconColor);

            const labelColor = done ? '#3a5a3a' : (active ? '#c8a030' : '#99aabb');
            const lbl = scene.add.text(rowX + s(48), cy, chore.label, {
                fontFamily: FONT,
                fontSize:   px(20),
                color:      labelColor,
            }).setOrigin(0, 0.5);
            container.add(lbl);

            const circX = rowX + rowW - s(22);
            if (done) {
                gfx.fillStyle(0x2a6a2a, 1);
                gfx.fillCircle(circX, cy, s(9));
                gfx.lineStyle(s(2), 0x88ee88, 1);
                gfx.beginPath();
                gfx.moveTo(circX - s(4), cy);
                gfx.lineTo(circX - s(1), cy + s(3.5));
                gfx.lineTo(circX + s(5), cy - s(4));
                gfx.strokePath();
            } else if (active) {
                gfx.lineStyle(2, COL_AMBER, 1);
                gfx.strokeCircle(circX, cy, s(9));
            } else {
                gfx.lineStyle(1, 0x334455, 1);
                gfx.strokeCircle(circX, cy, s(9));
            }
        });
    }

    // ── Clickable header zone — always present ──
    const hitZone = scene.add.rectangle(
        panelX + panelW * 0.5,
        panelY + padTop * 0.5,
        panelW,
        padTop
    ).setInteractive({ useHandCursor: true });
    container.add(hitZone);

    hitZone.on('pointerdown', () => {
        if (!allDone) return;
        scene.registry.set(REGISTRY_KEY, !collapsed);
        container.destroy(true);
        drawChoreChecklist(scene, GameState.get(scene));
    });

    // ── "T" key toggles open/close (always works, even when not all done) ──
    const onTKey = () => {
        const current = scene.registry.get(REGISTRY_KEY);
        // When not all done, "T" can still expand if manually collapsed
        if (!allDone && current !== true) return;
        scene.registry.set(REGISTRY_KEY, !collapsed);
        container.destroy(true);
        drawChoreChecklist(scene, GameState.get(scene));
    };
    scene.input.keyboard!.on('keydown-T', onTKey);

    // Remove listener when this container is destroyed (prevents duplicates on redraw)
    container.once('destroy', () => {
        scene.input.keyboard!.off('keydown-T', onTKey);
    });
}


