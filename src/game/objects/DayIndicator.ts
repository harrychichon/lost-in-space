import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

const FONT = '"Share Tech Mono", "Courier New", monospace';

export function drawDayIndicator(scene: Scene, state: ReturnType<typeof GameState.get>) {
    const x = 14;
    const y = 14;
    const panelW = 180;
    const panelH = 72;

    // Background panel with border
    const panel = scene.add.graphics();
    panel.fillStyle(0x000000, 0.75);
    panel.fillRoundedRect(x, y, panelW, panelH, 6);
    panel.lineStyle(1, 0x555566, 1);
    panel.strokeRoundedRect(x, y, panelW, panelH, 6);

    // Day text
    scene.add.text(x + 14, y + 12, `DAY ${state.currentDay}`, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#e1e0e0',
    });

    // Separator line
    const line = scene.add.graphics();
    line.lineStyle(1, 0x555566, 0.7);
    line.lineBetween(x + 10, y + 42, x + panelW - 10, y + 42);

    // Real time
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    scene.add.text(x + 14, y + 48, `TIME   ${hours}:${minutes}`, {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#888899',
    });
}

