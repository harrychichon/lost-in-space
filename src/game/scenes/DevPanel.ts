import { Scene } from "phaser";
import { GameState } from "../systems/GameState";

/**
 * Dev panel overlay — toggled with M from any scene.
 * Runs as a parallel scene on top of the active gameplay scene.
 */
const MOOD_PRESETS: (number | null)[] = [null, 0.0, 0.25, 0.5, 0.75, 1.0];

export class DevPanel extends Scene {
    private texts: Phaser.GameObjects.Text[] = [];
    private moodBtn!: Phaser.GameObjects.Text;

    constructor() {
        super("DevPanel");
    }

    create() {
        this.texts = [];
        const { height } = this.scale;

        // Semi-transparent background
        this.add.rectangle(0, 0, 320, height, 0x000000, 0.85).setOrigin(0, 0);

        // Title
        this.addLabel(16, 12, "--- DEV PANEL (M to close) ---", "#ffcc00");

        // State display (updated each frame)
        this.addLabel(16, 40, "", "#aaaaaa"); // index 1: state display

        // --- Buttons ---
        let y = 200;
        const gap = 32;

        this.addButton(16, y, "[1] Skip to next day", () => {
            GameState.advanceDay(this);
            this.restartActiveScene();
        });
        y += gap;

        this.addButton(16, y, "[2] Skip to day 3 (planet discovery)", () => {
            GameState.update(this, { currentDay: 2 });
            GameState.advanceDay(this);
            this.restartActiveScene();
        });
        y += gap;

        this.addButton(16, y, "[3] Complete all chores", () => {
            GameState.update(this, {
                chores: { kitchen: true, greenhouse: true, engine: true, comms: true },
            });
            this.restartActiveScene();
        });
        y += gap;

        this.addButton(16, y, "[4] Discover a planet now", () => {
            GameState.discoverPlanet(this);
            this.refreshState();
        });
        y += gap;

        this.addButton(16, y, "[5] Add companion (+1)", () => {
            const state = GameState.get(this);
            GameState.update(this, { companions: state.companions + 1 });
            this.restartActiveScene();
        });
        y += gap;

        this.addButton(16, y, "[6] Remove companion (-1)", () => {
            const state = GameState.get(this);
            GameState.update(this, {
                companions: Math.max(0, state.companions - 1),
            });
            this.restartActiveScene();
        });
        y += gap;

        this.addButton(16, y, "[7] Fill all resources to 100", () => {
            GameState.update(this, {
                resources: { oxygen: 100, food: 100, fuel: 100, parts: 100 },
            });
            this.restartActiveScene();
        });
        y += gap;

        this.addButton(16, y, "[8] Drain resources to 10", () => {
            GameState.update(this, {
                resources: { oxygen: 10, food: 10, fuel: 10, parts: 10 },
            });
            this.restartActiveScene();
        });
        y += gap;

        this.addButton(16, y, "[9] Go to DayIntro", () => {
            this.goToScene("DayIntro");
        });
        y += gap;

        this.addButton(16, y, "[0] Go to Ship", () => {
            this.goToScene("Ship");
        });
        y += gap;

        this.addButton(16, y, "[R] Reset game", () => {
            GameState.init(this);
            this.goToScene("MainMenu");
        });
        y += gap;

        this.addButton(16, y, "[C] Add cavediver companion", () => {
            if (!GameState.hasCompanion(this, "cavediver")) {
                GameState.addCavediverCompanion(this);
            }
            this.restartActiveScene();
        });
        y += gap;

        this.addButton(16, y, "[V] Setup cavediver planet (5 discovered)", () => {
            const state = GameState.get(this);
            const toDiscover = Math.max(0, 5 - state.planets.length);
            for (let i = 0; i < toDiscover; i++) {
                GameState.discoverPlanet(this);
            }
            this.refreshState();
        });
        y += gap;

        this.moodBtn = this.addButton(16, y, this.getMoodLabel(), () => {
            this.cycleMoodOverride();
        });

        // Keyboard shortcuts
        this.input.keyboard!.on("keydown-M", () => {
            this.scene.stop("DevPanel");
        });

        this.input.keyboard!.on("keydown-ONE", () => {
            GameState.advanceDay(this);
            this.restartActiveScene();
        });
        this.input.keyboard!.on("keydown-TWO", () => {
            GameState.update(this, { currentDay: 2 });
            GameState.advanceDay(this);
            this.restartActiveScene();
        });
        this.input.keyboard!.on("keydown-THREE", () => {
            GameState.update(this, {
                chores: { kitchen: true, greenhouse: true, engine: true, comms: true },
            });
            this.restartActiveScene();
        });
        this.input.keyboard!.on("keydown-FOUR", () => {
            GameState.discoverPlanet(this);
            this.refreshState();
        });
        this.input.keyboard!.on("keydown-FIVE", () => {
            const state = GameState.get(this);
            GameState.update(this, { companions: state.companions + 1 });
            this.restartActiveScene();
        });
        this.input.keyboard!.on("keydown-SIX", () => {
            const state = GameState.get(this);
            GameState.update(this, {
                companions: Math.max(0, state.companions - 1),
            });
            this.restartActiveScene();
        });
        this.input.keyboard!.on("keydown-SEVEN", () => {
            GameState.update(this, {
                resources: { oxygen: 100, food: 100, fuel: 100, parts: 100 },
            });
            this.restartActiveScene();
        });
        this.input.keyboard!.on("keydown-EIGHT", () => {
            GameState.update(this, {
                resources: { oxygen: 10, food: 10, fuel: 10, parts: 10 },
            });
            this.restartActiveScene();
        });
        this.input.keyboard!.on("keydown-NINE", () => {
            this.goToScene("DayIntro");
        });
        this.input.keyboard!.on("keydown-ZERO", () => {
            this.goToScene("Ship");
        });
        this.input.keyboard!.on("keydown-R", () => {
            GameState.init(this);
            this.goToScene("MainMenu");
        });
        this.input.keyboard!.on("keydown-C", () => {
            if (!GameState.hasCompanion(this, "cavediver")) {
                GameState.addCavediverCompanion(this);
            }
            this.restartActiveScene();
        });
        this.input.keyboard!.on("keydown-V", () => {
            const state = GameState.get(this);
            const toDiscover = Math.max(0, 6 - state.planets.length);
            for (let i = 0; i < toDiscover; i++) {
                GameState.discoverPlanet(this);
            }
            this.refreshState();
        });
        this.input.keyboard!.on("keydown-T", () => {
            this.cycleMoodOverride();
        });

        this.refreshState();
    }

    private addLabel(
        x: number,
        y: number,
        text: string,
        color: string,
    ): Phaser.GameObjects.Text {
        const t = this.add.text(x, y, text, {
            fontFamily: "Courier, monospace",
            fontSize: "13px",
            color,
            wordWrap: { width: 290 },
        });
        this.texts.push(t);
        return t;
    }

    private addButton(x: number, y: number, text: string, onClick: () => void) {
        const btn = this.add
            .text(x, y, text, {
                fontFamily: "Courier, monospace",
                fontSize: "13px",
                color: "#88ccff",
            })
            .setInteractive({ useHandCursor: true });

        btn.on("pointerover", () => btn.setColor("#ffffff"));
        btn.on("pointerout", () => btn.setColor("#88ccff"));
        btn.on("pointerdown", onClick);

        this.texts.push(btn);
        return btn;
    }

    private refreshState() {
        try {
            const state = GameState.get(this);
            if (!state) {
                this.texts[1].setText("No game state (start a game first)");
                return;
            }
            const r = state.resources;
            const c = state.chores;
            const moodVal = GameState.getMoodModifier(this);
            const moodTag = state.moodOverride !== null ? " (override)" : "";
            const lines = [
                `Day: ${state.currentDay}`,
                `Companions: ${state.companions}`,
                `Saturation: ${GameState.getSaturation(this).toFixed(2)}`,
                `Mood modifier: ${moodVal.toFixed(2)}${moodTag}`,
                ``,
                `O2: ${r.oxygen}  Food: ${r.food}`,
                `Fuel: ${r.fuel}  Parts: ${r.parts}`,
                ``,
                `Chores: K:${c.kitchen ? "Y" : "N"} G:${c.greenhouse ? "Y" : "N"} E:${c.engine ? "Y" : "N"} C:${c.comms ? "Y" : "N"}`,
                `Planets: ${state.planets.length} discovered`,
                ...state.planets.map((p) => {
                    const left = p.items.filter((i) => !i.collected).length;
                    return `  ${p.name} (${p.biome}) ${left}/${p.items.length} items`;
                }),
            ];
            this.texts[1].setText(lines.join("\n"));
            if (this.moodBtn) this.moodBtn.setText(this.getMoodLabel());
        } catch {
            this.texts[1].setText("No game state (start a game first)");
        }
    }

    private getMoodLabel(): string {
        try {
            const state = GameState.get(this);
            if (!state) return "[T] Mood: AUTO";
            return state.moodOverride !== null
                ? `[T] Mood: ${state.moodOverride.toFixed(2)} (override)`
                : "[T] Mood: AUTO";
        } catch {
            return "[T] Mood: AUTO";
        }
    }

    private cycleMoodOverride(): void {
        try {
            const state = GameState.get(this);
            const current = state?.moodOverride ?? null;
            const idx = MOOD_PRESETS.findIndex((v) => v === current);
            const next = MOOD_PRESETS[(idx + 1) % MOOD_PRESETS.length];
            GameState.update(this, { moodOverride: next });
        } catch {
            // no state yet
        }
        this.restartActiveScene();
    }

    private getActiveGameScene(): string | null {
        const gameScenes = [
            "MainMenu",
            "DayIntro",
            "Ship",
            "Kitchen",
            "Greenhouse",
            "Engine",
            "Comms",
            "Navigation",
            "Planet",
            "CompanionEvent",
            "RescueEvent",
            "CavediverEvent",
            "Cave",
            "Collection",
            "GameOver",
        ];
        for (const key of gameScenes) {
            const s = this.scene.get(key);
            if (s && this.scene.isActive(key)) {
                return key;
            }
        }
        return null;
    }

    private restartActiveScene() {
        const active = this.getActiveGameScene();
        if (active) {
            this.scene.stop(active);
            this.scene.launch(active);
            // Re-launch DevPanel on top
            this.scene.bringToTop("DevPanel");
        }
        this.refreshState();
    }

    private goToScene(sceneKey: string) {
        const active = this.getActiveGameScene();
        if (active) {
            this.scene.stop(active);
        }
        this.scene.launch(sceneKey);
        this.scene.bringToTop("DevPanel");
        this.refreshState();
    }
}
