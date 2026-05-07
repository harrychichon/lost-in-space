import { Scene } from "phaser";
import { GameState } from "../systems/GameState";
import { AudioManager, EventKey } from "../systems/AudioManager";

/**
 * Dev panel overlay — toggled with M from any scene.
 * Runs as a parallel scene on top of the active gameplay scene.
 *
 * Keyboard shortcuts:
 *   1-9, 0    game flow / world / resource shortcuts
 *   C, V, R   companion / cavediver / reset
 *   W         cycle warmth override
 *   T         cycle wellbeing override
 *   E         cycle event music
 */

const WARMTH_PRESETS: (number | null)[] = [null, 0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
const WELLBEING_PRESETS: (number | null)[] = [null, 0.0, 0.25, 0.5, 0.75, 1.0];
const EVENT_CYCLE: (EventKey | null)[] = [null, "companion_found", "rescue", "cavediver", "alarm"];

const COL_TITLE   = "#ffcc00";
const COL_SECTION = "#ffaa44";
const COL_INFO    = "#aaaaaa";
const COL_BTN     = "#88ccff";
const FONT        = "Courier, monospace";
const FS          = "12px";

export class DevPanel extends Scene {
    private texts: Phaser.GameObjects.Text[] = [];
    private stateText!: Phaser.GameObjects.Text;
    private audioText!: Phaser.GameObjects.Text;
    private warmthBtn!: Phaser.GameObjects.Text;
    private eventBtn!: Phaser.GameObjects.Text;
    private wellbeingBtn!: Phaser.GameObjects.Text;

    constructor() {
        super("DevPanel");
    }

    create() {
        this.texts = [];
        const { height } = this.scale;

        this.add.rectangle(0, 0, 330, height, 0x000000, 0.88).setOrigin(0, 0);

        // ── Title ──────────────────────────────────────────────────────────
        this.addLabel(12, 8, "─── DEV PANEL  (M to close) ───", COL_TITLE);

        // ── State display (updated each frame) ────────────────────────────
        this.addSeparator(26);
        this.addLabel(12, 30, "STATE", COL_SECTION);
        this.stateText = this.addLabel(12, 46, "", COL_INFO);

        // ── Warmth & Audio ─────────────────────────────────────────────────
        const audioTop = 162;
        this.addSeparator(audioTop - 6);
        this.addLabel(12, audioTop, "WARMTH  &  AUDIO", COL_SECTION);
        this.audioText = this.addLabel(12, audioTop + 16, "", COL_INFO);

        let y = audioTop + 56;
        this.warmthBtn = this.addButton(12, y, this.warmthLabel(), () => this.cycleWarmth());
        y += 22;
        this.eventBtn  = this.addButton(12, y, this.eventLabel(),  () => this.cycleEvent());
        y += 22;
        this.wellbeingBtn = this.addButton(12, y, this.wellbeingLabel(), () => this.cycleWellbeing());

        // ── Game Flow ──────────────────────────────────────────────────────
        y += 34;
        this.addSeparator(y - 8);
        this.addLabel(12, y, "GAME FLOW", COL_SECTION);
        y += 18;
        this.addButton(12, y, "[1] Next day", () => {
            GameState.advanceDay(this);
            this.restartActiveScene();
        });
        y += 22;
        this.addButton(12, y, "[2] Jump to day 3 (planet discovery)", () => {
            GameState.update(this, { currentDay: 2 });
            GameState.advanceDay(this);
            this.restartActiveScene();
        });
        y += 22;
        this.addButton(12, y, "[3] Complete all chores", () => {
            GameState.update(this, {
                chores: { kitchen: true, greenhouse: true, engine: true, comms: true },
            });
            this.restartActiveScene();
        });
        y += 22;
        this.addButton(12, y, "[9] Go to DayIntro", () => this.goToScene("DayIntro"));
        y += 22;
        this.addButton(12, y, "[0] Go to Ship",     () => this.goToScene("Ship"));
        y += 22;
        this.addButton(12, y, "[R] Reset game",     () => {
            GameState.init(this);
            this.goToScene("MainMenu");
        });

        // ── World ──────────────────────────────────────────────────────────
        y += 30;
        this.addSeparator(y - 8);
        this.addLabel(12, y, "WORLD", COL_SECTION);
        y += 18;
        this.addButton(12, y, "[4] Discover a planet now", () => {
            GameState.discoverPlanet(this);
            this.refreshState();
        });
        y += 22;
        this.addButton(12, y, "[V] Setup cavediver (5 planets)", () => {
            const state = GameState.get(this);
            const need = Math.max(0, 5 - state.planets.length);
            for (let i = 0; i < need; i++) GameState.discoverPlanet(this);
            this.refreshState();
        });

        // ── Companions ─────────────────────────────────────────────────────
        y += 30;
        this.addSeparator(y - 8);
        this.addLabel(12, y, "COMPANIONS", COL_SECTION);
        y += 18;
        this.addButton(12, y, "[5] Add companion (+1)", () => {
            GameState.update(this, { companions: GameState.get(this).companions + 1 });
            this.restartActiveScene();
        });
        y += 22;
        this.addButton(12, y, "[6] Remove companion (-1)", () => {
            GameState.update(this, { companions: Math.max(0, GameState.get(this).companions - 1) });
            this.restartActiveScene();
        });
        y += 22;
        this.addButton(12, y, "[C] Add cavediver companion", () => {
            if (!GameState.hasCompanion(this, "cavediver")) GameState.addCavediverCompanion(this);
            this.restartActiveScene();
        });

        // ── Resources ──────────────────────────────────────────────────────
        y += 30;
        this.addSeparator(y - 8);
        this.addLabel(12, y, "RESOURCES", COL_SECTION);
        y += 18;
        this.addButton(12, y, "[7] Fill all to 100", () => {
            GameState.update(this, { resources: { oxygen: 100, food: 100, fuel: 100, parts: 100 } });
            this.restartActiveScene();
        });
        y += 22;
        this.addButton(12, y, "[8] Drain to 10", () => {
            GameState.update(this, { resources: { oxygen: 10, food: 10, fuel: 10, parts: 10 } });
            this.restartActiveScene();
        });

        // ── Keyboard shortcuts ─────────────────────────────────────────────
        this.input.keyboard!.on("keydown-M",    () => this.scene.stop("DevPanel"));
        this.input.keyboard!.on("keydown-ONE",  () => { GameState.advanceDay(this); this.restartActiveScene(); });
        this.input.keyboard!.on("keydown-TWO",  () => { GameState.update(this, { currentDay: 2 }); GameState.advanceDay(this); this.restartActiveScene(); });
        this.input.keyboard!.on("keydown-THREE",() => { GameState.update(this, { chores: { kitchen: true, greenhouse: true, engine: true, comms: true } }); this.restartActiveScene(); });
        this.input.keyboard!.on("keydown-FOUR", () => { GameState.discoverPlanet(this); this.refreshState(); });
        this.input.keyboard!.on("keydown-FIVE", () => { GameState.update(this, { companions: GameState.get(this).companions + 1 }); this.restartActiveScene(); });
        this.input.keyboard!.on("keydown-SIX",  () => { GameState.update(this, { companions: Math.max(0, GameState.get(this).companions - 1) }); this.restartActiveScene(); });
        this.input.keyboard!.on("keydown-SEVEN",() => { GameState.update(this, { resources: { oxygen: 100, food: 100, fuel: 100, parts: 100 } }); this.restartActiveScene(); });
        this.input.keyboard!.on("keydown-EIGHT",() => { GameState.update(this, { resources: { oxygen: 10, food: 10, fuel: 10, parts: 10 } }); this.restartActiveScene(); });
        this.input.keyboard!.on("keydown-NINE", () => this.goToScene("DayIntro"));
        this.input.keyboard!.on("keydown-ZERO", () => this.goToScene("Ship"));
        this.input.keyboard!.on("keydown-R",    () => { GameState.init(this); this.goToScene("MainMenu"); });
        this.input.keyboard!.on("keydown-C",    () => { if (!GameState.hasCompanion(this, "cavediver")) GameState.addCavediverCompanion(this); this.restartActiveScene(); });
        this.input.keyboard!.on("keydown-V",    () => { const s = GameState.get(this); const n = Math.max(0, 5 - s.planets.length); for (let i = 0; i < n; i++) GameState.discoverPlanet(this); this.refreshState(); });
        this.input.keyboard!.on("keydown-W",    () => this.cycleWarmth());
        this.input.keyboard!.on("keydown-T",    () => this.cycleWellbeing());
        this.input.keyboard!.on("keydown-E",    () => this.cycleEvent());

        this.refreshState();
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private addLabel(x: number, y: number, text: string, color: string): Phaser.GameObjects.Text {
        const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: FS, color, wordWrap: { width: 306 } });
        this.texts.push(t);
        return t;
    }

    private addButton(x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.Text {
        const btn = this.add.text(x, y, text, { fontFamily: FONT, fontSize: FS, color: COL_BTN, wordWrap: { width: 306 } })
            .setInteractive({ useHandCursor: true });
        btn.on("pointerover",  () => btn.setColor("#ffffff"));
        btn.on("pointerout",   () => btn.setColor(COL_BTN));
        btn.on("pointerdown",  onClick);
        this.texts.push(btn);
        return btn;
    }

    private addSeparator(y: number): void {
        this.add.graphics().lineStyle(1, 0x444444, 0.6).lineBetween(8, y, 322, y);
    }

    // ── State refresh ────────────────────────────────────────────────────────

    private refreshState(): void {
        try {
            const state = GameState.get(this);
            if (!state) {
                this.stateText.setText("No game state — start a game first");
                this.audioText.setText("");
                return;
            }
            const r = state.resources;
            const c = state.chores;
            this.stateText.setText([
                `Day: ${state.currentDay}  |  Companions: ${state.companions}`,
                `O2: ${r.oxygen.toFixed(0)}  Food: ${r.food.toFixed(0)}  Fuel: ${r.fuel.toFixed(0)}  Parts: ${r.parts.toFixed(0)}`,
                `Chores: K:${c.kitchen ? "✓" : "·"} G:${c.greenhouse ? "✓" : "·"} E:${c.engine ? "✓" : "·"} C:${c.comms ? "✓" : "·"}`,
                `Planets: ${state.planets.length} discovered`,
                ...state.planets.slice(0, 4).map(p => {
                    const left = p.items.filter(i => !i.collected).length;
                    return `  ${p.name} (${p.biome}) ${left}/${p.items.length} items`;
                }),
                state.planets.length > 4 ? `  …and ${state.planets.length - 4} more` : "",
            ].filter(l => l !== "").join("\n"));

            const warmth = GameState.getSaturation(this);
            const mood   = AudioManager.getMoodName(warmth);
            const track  = AudioManager.getCurrentMusicKey() ?? "—";
            const evtKey = AudioManager.getCurrentEventKey();
            const warmthTag = state.warmthOverride !== null ? " (override)" : "";
            const wbTag     = state.wellbeingOverride !== null ? ` (override ${state.wellbeingOverride.toFixed(2)})` : "";
            this.audioText.setText([
                `Warmth: ${warmth.toFixed(2)}${warmthTag}  Mood: ${mood}`,
                `Wellbeing: ${GameState.getWellbeing(this).toFixed(2)}${wbTag}`,
                `Track: ${track}`,
                `Event: ${evtKey ?? "OFF"}`,
            ].join("\n"));

            this.warmthBtn?.setText(this.warmthLabel());
            this.eventBtn?.setText(this.eventLabel());
            this.wellbeingBtn?.setText(this.wellbeingLabel());
        } catch {
            this.stateText?.setText("No game state — start a game first");
        }
    }

    // ── Warmth override ──────────────────────────────────────────────────────

    private warmthLabel(): string {
        try {
            const v = GameState.get(this)?.warmthOverride;
            return v !== null && v !== undefined
                ? `[W] Warmth override: ${v.toFixed(2)}`
                : "[W] Warmth override: AUTO";
        } catch { return "[W] Warmth override: AUTO"; }
    }

    private cycleWarmth(): void {
        try {
            const current = GameState.get(this)?.warmthOverride ?? null;
            const idx  = WARMTH_PRESETS.findIndex(v => v === current);
            const next = WARMTH_PRESETS[(idx + 1) % WARMTH_PRESETS.length];
            GameState.update(this, { warmthOverride: next });
        } catch { /* no state */ }
        this.restartActiveScene();
    }

    // ── Event music ──────────────────────────────────────────────────────────

    private eventLabel(): string {
        const evt = AudioManager.getCurrentEventKey();
        return evt ? `[E] Event ON: ${evt}` : "[E] Event: OFF";
    }

    private cycleEvent(): void {
        const current = AudioManager.getCurrentEventKey();
        const idx  = EVENT_CYCLE.findIndex(v => v === current);
        const next = EVENT_CYCLE[(idx + 1) % EVENT_CYCLE.length];
        if (next === null) {
            AudioManager.clearEvent();
            this.restartActiveScene();
        } else {
            AudioManager.playEvent(this, next);
            this.refreshState();
        }
    }

    // ── Wellbeing override ───────────────────────────────────────────────────

    private wellbeingLabel(): string {
        try {
            const v = GameState.get(this)?.wellbeingOverride;
            return v !== null && v !== undefined
                ? `[T] Wellbeing override: ${v.toFixed(2)}`
                : "[T] Wellbeing override: AUTO";
        } catch { return "[T] Wellbeing override: AUTO"; }
    }

    private cycleWellbeing(): void {
        try {
            const current = GameState.get(this)?.wellbeingOverride ?? null;
            const idx  = WELLBEING_PRESETS.findIndex(v => v === current);
            const next = WELLBEING_PRESETS[(idx + 1) % WELLBEING_PRESETS.length];
            GameState.update(this, { wellbeingOverride: next });
        } catch { /* no state */ }
        this.restartActiveScene();
    }

    // ── Scene helpers ────────────────────────────────────────────────────────

    private getActiveGameScene(): string | null {
        const scenes = [
            "MainMenu", "DayIntro", "Ship", "Kitchen", "Greenhouse",
            "Engine", "Comms", "Navigation", "Planet", "CompanionEvent",
            "RescueEvent", "CavediverEvent", "Cave", "Collection", "GameOver",
        ];
        return scenes.find(k => this.scene.isActive(k)) ?? null;
    }

    private restartActiveScene(): void {
        const active = this.getActiveGameScene();
        if (active) {
            this.scene.stop(active);
            this.scene.launch(active);
            this.scene.bringToTop("DevPanel");
        }
        this.refreshState();
    }

    private goToScene(key: string): void {
        const active = this.getActiveGameScene();
        if (active) this.scene.stop(active);
        this.scene.launch(key);
        this.scene.bringToTop("DevPanel");
        this.refreshState();
    }
}
