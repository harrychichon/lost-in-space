import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

const SCALE = 0.5;

function s(value: number) {
    return value * SCALE;
}

function px(value: number) {
    return `${Math.max(1, Math.round(value * SCALE))}px`;
}

export function drawResourceBars(scene: Scene, state: ReturnType<typeof GameState.get>) {
    const startIdx = scene.children.length;

    const { width } = scene.scale;
    const panelW = s(338);
    const panelH = s(410);
    const panelX = width - panelW - s(16);
    const panelY = s(14);
    const titleFont = '"Share Tech Mono", "Courier New", monospace';

    const resources = [
        { key: 'OXYGEN', value: state.resources.oxygen, color: 0x74b8f6, accent: '#74b8f6', type: 'oxygen' },
        { key: 'FOOD', value: state.resources.food, color: 0x93c96b, accent: '#93c96b', type: 'food' },
        { key: 'FUEL', value: state.resources.fuel, color: 0xd79152, accent: '#d79152', type: 'fuel' },
        { key: 'PARTS', value: state.resources.parts, color: 0x6e5aa8, accent: '#6e5aa8', type: 'parts' },
    ] as const;

    const panel = scene.add.graphics();
    panel.fillStyle(0x05070a, 0.86);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, s(8));
    panel.lineStyle(1, 0x4b5360, 0.9);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, s(8));

    const headerIcon = scene.add.graphics();
    headerIcon.fillStyle(0x9ca4ae, 1);
    headerIcon.fillRect(panelX + s(28), panelY + s(50), s(6), s(12));
    headerIcon.fillRect(panelX + s(38), panelY + s(44), s(6), s(18));
    headerIcon.fillRect(panelX + s(48), panelY + s(36), s(6), s(26));

    scene.add.text(panelX + s(74), panelY + s(34), 'RESOURCES', {
        fontFamily: titleFont,
        fontSize: px(57),
        color: '#fafaff',
    }).setScale(0.5, 0.5);

    const headerLine = scene.add.graphics();
    headerLine.lineStyle(1, 0x424a56, 0.75);
    headerLine.lineBetween(panelX + s(18), panelY + s(84), panelX + panelW - s(18), panelY + s(84));

    resources.forEach((res, i) => {
        const rowTop = panelY + s(112 + i * 78);
        const gap = 7;
        const valueColumnWidth = s(44);
        const iconX = panelX + s(28);
        const labelX = iconX + s(18);
        const barY = rowTop + s(34);
        const percentX = panelX + panelW - s(12);
        const iconRight = iconX + s(8);
        const barLeft = iconRight + gap;
        const barRight = percentX - valueColumnWidth - gap;
        const barW = Math.max(s(90), barRight - barLeft);
        const barH = s(14);

        drawResourceIcon(scene, res.type, iconX, rowTop + s(20), res.color);

        scene.add.text(labelX, rowTop, res.key, {
            fontFamily: titleFont,
            fontSize: px(37),
            color: '#a7aeb8',
        }).setScale(0.5, 0.5);

        scene.add.rectangle(barLeft + barW / 2, barY, barW, barH, 0x2a2f38).setOrigin(0.5);

        const fillW = Math.max(0, Math.min(100, res.value)) / 100 * barW;
        scene.add.rectangle(barLeft + fillW / 2, barY, fillW, barH - s(2), res.color).setOrigin(0.5);

        scene.add.text(percentX, rowTop + s(19), `${Math.round(res.value)}%`, {
            fontFamily: titleFont,
            fontSize: px(46),
            color: res.accent,
        }).setScale(0.5, 0.5).setOrigin(1, 0);
    });

    // Pin to camera + soften alpha so the world shows through slightly
    for (let i = startIdx; i < scene.children.length; i++) {
        const obj = scene.children.list[i] as Phaser.GameObjects.GameObject & {
            setScrollFactor?: (x: number) => void;
            setAlpha?: (a: number) => void;
        };
        obj.setScrollFactor?.(0);
        obj.setAlpha?.(0.75);
    }
}

function drawResourceIcon(
    scene: Scene,
    type: 'oxygen' | 'food' | 'fuel' | 'parts',
    x: number,
    y: number,
    color: number,
) {
    const g = scene.add.graphics();
    g.fillStyle(color, 1);
    g.lineStyle(s(2), color, 1);

    if (type === 'oxygen') {
        g.strokeRoundedRect(x - s(8), y - s(13), s(16), s(26), s(2));
        g.fillRect(x + s(9), y + s(1), s(4), s(4));
        scene.add.text(x + s(10), y + s(8), '2', {
            fontFamily: '"Share Tech Mono", "Courier New", monospace',
            fontSize: px(20),
            color: '#74b8f6',
        }).setScale(0.5);
        return;
    }

    if (type === 'food') {
        g.fillRect(x - s(8), y - s(12), s(3), s(20));
        g.fillRect(x - s(10), y - s(14), s(2), s(8));
        g.fillRect(x - s(7), y - s(14), s(2), s(8));
        g.fillRect(x - s(4), y - s(14), s(2), s(8));
        g.fillRect(x + s(5), y - s(12), s(3), s(20));
        g.fillTriangle(x + s(5), y - s(12), x + s(10), y - s(15), x + s(8), y - s(6));
        return;
    }

    if (type === 'fuel') {
        g.strokeRoundedRect(x - s(9), y - s(13), s(18), s(24), s(2));
        g.fillRect(x + s(4), y - s(11), s(3), s(5));
        g.lineBetween(x - s(3), y - s(1), x + s(2), y - s(5));
        g.lineBetween(x + s(2), y - s(5), x + s(4), y - s(1));
        g.lineBetween(x + s(4), y - s(1), x - s(2), y + s(5));
        g.lineBetween(x - s(2), y + s(5), x, y + s(1));
        g.lineBetween(x, y + s(1), x - s(3), y - s(1));
        return;
    }

    // parts
    g.fillCircle(x - s(7), y + s(9), s(4));
    g.fillCircle(x + s(8), y - s(10), s(4));
    g.lineStyle(s(4), color, 1);
    g.lineBetween(x - s(5), y + s(7), x + s(6), y - s(8));
}
